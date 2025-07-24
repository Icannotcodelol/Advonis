import Groq from 'groq-sdk';
import { SPECIALIZED_SYSTEM_PROMPTS } from '@/lib/specialized-prompts';
import type { 
  ContractDocument, 
  AnalysisResult, 
  Annotation, 
  AnnotationType,
  AnnotationSeverity,
  Recommendation,
  ComplianceCheck 
} from '@/types/contract';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export class GroqAnalysisClient {
  private static instance: GroqAnalysisClient;

  public static getInstance(): GroqAnalysisClient {
    if (!GroqAnalysisClient.instance) {
      GroqAnalysisClient.instance = new GroqAnalysisClient();
    }
    return GroqAnalysisClient.instance;
  }

  async analyzeContract(contract: ContractDocument): Promise<AnalysisResult> {
    try {
      // Contract classification is now handled by the analysis API
      // This method is kept for backward compatibility but should use the API endpoint
      console.warn('GroqAnalysisClient.analyzeContract is deprecated. Use the /api/analyze-contract endpoint instead.');
      
      // Fallback to general analysis if called directly
      return await this.analyzeContractWithClassification(contract, 'general');
    } catch (error) {
      console.error('AI analysis error:', error);
      throw new Error('Failed to analyze contract with AI');
    }
  }

  async analyzeContractWithClassification(contract: ContractDocument, classificationType: ContractDocument['type']): Promise<AnalysisResult> {
    try {
      // Use the provided classification to get specialized system prompt
      const systemPrompt = this.getSystemPrompt(classificationType);
      const userPrompt = this.buildUserPrompt(contract, classificationType);

      console.log(`Analyzing contract as: ${classificationType}`);

      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: 'moonshotai/kimi-k2-instruct',
        temperature: 0.1,
        max_tokens: 4000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from AI analysis');
      }

      return this.parseAnalysisResponse(response, contract, classificationType);
    } catch (error) {
      console.error('AI contract analysis error:', error);
      throw new Error('Failed to analyze contract with AI');
    }
  }

  private getSystemPrompt(contractType: ContractDocument['type']): string {
    const specializedPrompt = SPECIALIZED_SYSTEM_PROMPTS[contractType];
    
    const jsonFormat = `

WICHTIG: Antworten Sie NUR im folgenden JSON-Format:
{
  "overallRisk": "low|medium|high|critical",
  "summary": "Kurze Zusammenfassung der wichtigsten Erkenntnisse",
  "annotations": [
    {
      "type": "legal_risk|compliance_issue|improvement_suggestion|language_clarity|missing_clause|gdpr_concern",
      "severity": "critical|high|medium|low|info",
      "text": "Der zu analysierende Textabschnitt",
      "comment": "Kurze Erklärung des Problems",
      "explanation": "Detaillierte rechtliche Begründung",
      "suggestedReplacement": "Vorgeschlagener Ersatztext (optional)",
      "legalReference": "Rechtsbezug (z.B. § 307 BGB)",
      "confidence": 0.95
    }
  ],
  "recommendations": [
    {
      "title": "Empfehlungstitel",
      "description": "Beschreibung der Empfehlung",
      "priority": "high|medium|low",
      "category": "Kategorie",
      "actionRequired": true|false
    }
  ],
  "compliance": [
    {
      "law": "BGB",
      "section": "§ 307",
      "status": "compliant|non_compliant|unclear",
      "description": "Beschreibung der Compliance",
      "recommendation": "Empfehlung bei Nicht-Compliance"
    }
  ]
}`;

    return specializedPrompt + jsonFormat;
  }

  private buildUserPrompt(contract: ContractDocument, classifiedType: ContractDocument['type']): string {
    return `Bitte analysieren Sie den folgenden deutschen ${classifiedType}-Vertrag:

VERTRAGSNAME: ${contract.name}
KLASSIFIZIERT ALS: ${classifiedType}

VERTRAGSINHALT:
${contract.content}

Führen Sie eine vollständige rechtliche Analyse durch und identifizieren Sie alle problematischen Klauseln, Compliance-Verstöße und Verbesserungsmöglichkeiten.`;
  }

  private async parseAnalysisResponse(response: string, contract: ContractDocument, contractType: ContractDocument['type']): Promise<AnalysisResult> {
    try {
      // Clean the response
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(cleanResponse);

      // Normalize the response structure
      const annotations: Annotation[] = (parsed.annotations || []).map((ann: any, index: number) => ({
        id: ann.id || `annotation_${index}`,
        type: ann.type as AnnotationType,
        severity: ann.severity as AnnotationSeverity,
        text: ann.text || '',
        comment: ann.comment || '',
        explanation: ann.explanation || '',
        legalReference: ann.legalReference || '',
        suggestedReplacement: ann.suggestedReplacement,
        confidence: ann.confidence || 0.8,
        startOffset: this.findTextOffset(contract.content, ann.text),
        endOffset: this.findTextOffset(contract.content, ann.text) + (ann.text?.length || 0),
        pageNumber: ann.pageNumber || 1
      }));

      const recommendations: Recommendation[] = (parsed.recommendations || []).map((rec: any, index: number) => ({
        id: `rec_${index}`,
        title: rec.title || '',
        description: rec.description || '',
        priority: rec.priority || 'medium',
        category: rec.category || 'General',
        actionRequired: rec.actionRequired !== false
      }));

      const legalCompliance: ComplianceCheck[] = (parsed.compliance || []).map((comp: any) => ({
        law: comp.law || '',
        section: comp.section || '',
        status: comp.status || 'unclear',
        description: comp.description || '',
        recommendation: comp.recommendation
      }));

      return {
        contractId: contract.id,
        analysisDate: new Date(),
        overallRisk: parsed.overallRisk || 'medium',
        summary: parsed.summary || 'Analysis completed',
        annotations: this.deduplicateAnnotations(annotations),
        recommendations: this.deduplicateRecommendations(recommendations),
        legalCompliance
      };

    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('Invalid response format from AI analysis');
    }
  }

  // Advanced similarity detection using multiple algorithms
  private calculateSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    
    // Normalize texts
    const norm1 = text1.toLowerCase().trim().replace(/\s+/g, ' ');
    const norm2 = text2.toLowerCase().trim().replace(/\s+/g, ' ');
    
    if (norm1 === norm2) return 1;
    
    // Levenshtein distance similarity
    const levenshteinSim = 1 - (this.levenshteinDistance(norm1, norm2) / Math.max(norm1.length, norm2.length));
    
    // Keyword overlap similarity
    const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 3));
    const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
    const union = new Set([...Array.from(words1), ...Array.from(words2)]);
    const keywordSim = union.size > 0 ? intersection.size / union.size : 0;
    
    // Combined similarity (weighted average)
    return (levenshteinSim * 0.6) + (keywordSim * 0.4);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private advancedDeduplication(annotations: Annotation[]): Annotation[] {
    const result: Annotation[] = [];
    const processed = new Set<string>();
    
    for (let i = 0; i < annotations.length; i++) {
      if (processed.has(annotations[i].id)) continue;
      
      const current = annotations[i];
      const similar: Annotation[] = [current];
      processed.add(current.id);
      
      // Find similar annotations
      for (let j = i + 1; j < annotations.length; j++) {
        if (processed.has(annotations[j].id)) continue;
        
        const candidate = annotations[j];
        
        // Check if they're similar
        const textSim = this.calculateSimilarity(current.text || '', candidate.text || '');
        const explanationSim = this.calculateSimilarity(current.explanation || '', candidate.explanation || '');
        const sameLegalRef = current.legalReference === candidate.legalReference && current.legalReference;
        
        if ((textSim > 0.7 || explanationSim > 0.7) && sameLegalRef) {
          similar.push(candidate);
          processed.add(candidate.id);
        }
      }
      
      // Merge similar annotations
      if (similar.length > 1) {
        const merged = this.mergeAnnotations(similar);
        result.push(merged);
      } else {
        result.push(current);
      }
    }
    
    return result;
  }

  private mergeAnnotations(annotations: Annotation[]): Annotation {
    const primary = annotations[0];
    const allTexts = annotations.map(a => a.text || '').filter(t => t.length > 0);
    const allExplanations = annotations.map(a => a.explanation || '').filter(e => e.length > 0);
    
    // Use the longest/most detailed text and explanation
    const bestText = allTexts.reduce((a, b) => a.length > b.length ? a : b, '');
    const bestExplanation = allExplanations.reduce((a, b) => a.length > b.length ? a : b, '');
    
    return {
      ...primary,
      text: bestText,
      explanation: bestExplanation,
      comment: primary.comment + (annotations.length > 1 ? ` (${annotations.length} related issues merged)` : ''),
    };
  }

  // Update the main deduplication to use both methods
  private deduplicateAnnotations(annotations: Annotation[]): Annotation[] {
    // First pass: basic deduplication
    const basicDeduped = this.basicDeduplication(annotations);
    
    // Second pass: advanced similarity detection
    const finalDeduped = this.advancedDeduplication(basicDeduped);
    
    return finalDeduped;
  }

  private basicDeduplication(annotations: Annotation[]): Annotation[] {
    const deduplicated: Annotation[] = [];
    const seen = new Set<string>();

    for (const annotation of annotations) {
      // Create a deduplication key based on text content, legal reference, and explanation similarity
      const normalizedText = annotation.text?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
      const normalizedExplanation = annotation.explanation?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
      const legalRef = annotation.legalReference || '';
      
      // Create a hash of the key components
      const dedupKey = `${normalizedText.substring(0, 100)}-${legalRef}-${normalizedExplanation.substring(0, 100)}`;
      
      // Check for similar existing annotations
      let isDuplicate = false;
      for (const existingKey of Array.from(seen)) {
        // Check if this is a duplicate based on text similarity and same legal reference
        if (existingKey.includes(legalRef) && legalRef && 
            (existingKey.includes(normalizedText.substring(0, 50)) || 
             normalizedText.includes(existingKey.split('-')[0].substring(0, 50)))) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        seen.add(dedupKey);
        deduplicated.push(annotation);
      }
    }

    return deduplicated;
  }

  private deduplicateRecommendations(recommendations: Recommendation[]): Recommendation[] {
    const deduplicated: Recommendation[] = [];
    const seen = new Set<string>();

    for (const rec of recommendations) {
      const normalizedTitle = rec.title?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
      const normalizedDesc = rec.description?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
      
      const dedupKey = `${normalizedTitle.substring(0, 50)}-${normalizedDesc.substring(0, 100)}`;
      
      if (!seen.has(dedupKey)) {
        seen.add(dedupKey);
        deduplicated.push(rec);
      }
    }

    return deduplicated;
  }

  private findTextOffset(content: string, text: string): number {
    if (!text) return 0;
    const index = content.indexOf(text);
    return index >= 0 ? index : 0;
  }
} 