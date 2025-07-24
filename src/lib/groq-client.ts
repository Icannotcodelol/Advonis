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
        annotations,
        recommendations,
        legalCompliance
      };

    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('Invalid response format from AI analysis');
    }
  }

  private findTextOffset(content: string, text: string): number {
    if (!text) return 0;
    const index = content.indexOf(text);
    return index >= 0 ? index : 0;
  }
} 