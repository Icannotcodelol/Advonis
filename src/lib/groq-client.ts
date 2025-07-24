import Groq from 'groq-sdk';
import { SPECIALIZED_SYSTEM_PROMPTS, CLASSIFICATION_PROMPT } from '@/lib/specialized-prompts';
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
      // Step 1: Classify the contract type using AI
      const classifiedType = await this.classifyContract(contract.content);
      
      // Step 2: Analyze the contract based on the classification
      return await this.analyzeContractWithClassification(contract, classifiedType);
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

  async classifyContract(content: string): Promise<ContractDocument['type']> {
    try {
      // Use the specialized classification prompt
      const fullPrompt = `${CLASSIFICATION_PROMPT}\n\n${content.substring(0, 2000)}...`;

      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'user', content: fullPrompt }
        ],
        model: 'moonshotai/kimi-k2-instruct',
        temperature: 0.0,
        max_tokens: 50,
      });

      const response = completion.choices[0]?.message?.content?.trim().toLowerCase();
      
      // Validate the response
      const validTypes: ContractDocument['type'][] = [
        'arbeitsvertrag', 'werkvertrag', 'dienstvertrag', 'nda', 
        'service_agreement', 'purchase_agreement', 'rental_agreement', 'general'
      ];
      
      if (response && validTypes.includes(response as ContractDocument['type'])) {
        console.log(`Contract classified as: ${response}`);
        return response as ContractDocument['type'];
      }
      
      // Fallback to general if classification fails
      console.log('Classification failed, defaulting to general');
      return 'general';
    } catch (error) {
      console.error('Contract classification error:', error);
      return 'general';
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

  private parseAnalysisResponse(response: string, contract: ContractDocument, classifiedType: ContractDocument['type']): AnalysisResult {
    try {
      // Clean up the response to ensure valid JSON
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
      }
      
      const parsed = JSON.parse(cleanResponse);
      
      // Validate and filter annotations to ensure they have valid text
      const validAnnotations = (parsed.annotations || []).filter((ann: any) => {
        return ann && 
               typeof ann.text === 'string' && 
               ann.text.trim().length > 0 &&
               ann.type && 
               ann.severity && 
               ann.comment;
      });
      
      // Transform annotations to include position data
      const annotations: Annotation[] = validAnnotations.map((ann: any, index: number) => {
        const annotationText = ann.text.trim();
        const startOffset = this.findTextOffset(contract.content, annotationText);
        
        return {
          id: `ann_${index}_${Date.now()}`,
          type: ann.type as AnnotationType,
          severity: ann.severity as AnnotationSeverity,
          startOffset,
          endOffset: startOffset + annotationText.length,
          pageNumber: this.findPageNumber(contract, annotationText),
          position: this.calculatePosition(contract, annotationText),
          text: annotationText,
          comment: ann.comment || 'No comment provided',
          explanation: ann.explanation || ann.comment || 'No explanation provided',
          suggestedReplacement: ann.suggestedReplacement || undefined,
          legalReference: ann.legalReference || undefined,
          confidence: Math.min(Math.max(ann.confidence || 0.8, 0), 1)
        };
      });

      return {
        contractId: contract.id,
        analysisDate: new Date(),
        overallRisk: parsed.overallRisk || 'medium',
        summary: parsed.summary || 'Analysis completed',
        annotations,
        recommendations: parsed.recommendations || [],
        legalCompliance: parsed.compliance || []
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw AI response:', response);
      throw new Error('Invalid AI response format');
    }
  }

  private findTextOffset(content: string, searchText: string): number {
    // Add validation to prevent undefined/null errors
    if (!content || !searchText || typeof content !== 'string' || typeof searchText !== 'string') {
      return 0;
    }
    
    const index = content.toLowerCase().indexOf(searchText.toLowerCase());
    return index >= 0 ? index : 0;
  }

  private findPageNumber(contract: ContractDocument, searchText: string): number {
    // Add validation to prevent undefined/null errors
    if (!contract?.pages || !searchText || typeof searchText !== 'string') {
      return 1;
    }
    
    for (let i = 0; i < contract.pages.length; i++) {
      const pageContent = contract.pages[i]?.content;
      if (pageContent && typeof pageContent === 'string' && 
          pageContent.toLowerCase().includes(searchText.toLowerCase())) {
        return i + 1;
      }
    }
    return 1;
  }

  private calculatePosition(contract: ContractDocument, searchText: string): {
    x: number; y: number; width: number; height: number;
  } {
    // Add validation to prevent undefined/null errors
    if (!contract?.pages || !searchText || typeof searchText !== 'string') {
      return { x: 0, y: 0, width: 100, height: 20 };
    }
    
    // Find the page containing the text
    for (const page of contract.pages) {
      if (!page?.textItems || !Array.isArray(page.textItems)) {
        continue;
      }
      
      const textItems = page.textItems.filter(item => 
        item?.str && typeof item.str === 'string' && 
        item.str.toLowerCase().includes(searchText.toLowerCase())
      );
      
      if (textItems.length > 0) {
        const firstItem = textItems[0];
        return {
          x: firstItem.transform?.[4] || 0,
          y: firstItem.transform?.[5] || 0,
          width: firstItem.width || 100,
          height: firstItem.height || 20
        };
      }
    }
    
    // Default position if not found
    return { x: 0, y: 0, width: 100, height: 20 };
  }

  // Quick analysis for immediate feedback
  async getQuickInsights(content: string): Promise<string[]> {
    try {
      const completion = await groq.chat.completions.create({
        messages: [{
          role: 'user',
          content: `Geben Sie 3-5 schnelle Einschätzungen zu diesem deutschen Vertragstext:
          
${content.substring(0, 1000)}...

Antworten Sie mit kurzen Stichpunkten über potentielle Rechtsprobleme.`
        }],
        model: 'moonshotai/kimi-k2-instruct',
        temperature: 0.2,
        max_tokens: 300,
      });

      const response = completion.choices[0]?.message?.content;
      return response ? response.split('\n').filter(line => line.trim()) : [];
    } catch (error) {
      console.error('Quick insights error:', error);
      return ['Schnellanalyse nicht verfügbar'];
    }
  }
} 