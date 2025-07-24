import Groq from 'groq-sdk';
import type { ContractDocument, ContractClassificationResult, ContractType } from '@/types/contract';
import { CLASSIFICATION_SYSTEM_PROMPT } from '@/lib/specialized-prompts';

// Initialize Groq client for classification (server-side only)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export class ContractClassifier {
  private static instance: ContractClassifier;

  public static getInstance(): ContractClassifier {
    if (!ContractClassifier.instance) {
      ContractClassifier.instance = new ContractClassifier();
    }
    return ContractClassifier.instance;
  }

  async intelligentContractClassification(content: string): Promise<ContractClassificationResult> {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
          { role: 'user', content: `VERTRAGSINHALT:\n${content}` }
        ],
        model: 'moonshotai/kimi-k2-instruct',
        temperature: 0.1,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No AI classification response');
      }

      // Clean and parse JSON response
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
      }

      const aiResult = JSON.parse(cleanResponse);

      return {
        primaryType: aiResult.primaryType,
        confidence: aiResult.confidence,
        secondaryTypes: [],
        reasoning: aiResult.reasoning,
        structuralIndicators: {
          hasDeliverables: false,
          hasTimeBasedPayment: false,
          hasSuccessMetrics: false,
          hasEmploymentTerms: false,
          hasConfidentialityTerms: false,
          clauseCount: 0,
          contractLength: 'medium' as const
        },
        isCompoundContract: false,
        riskFactors: []
      };

    } catch (error) {
      console.error('AI classification failed:', error);
      return this.fallbackClassification();
    }
  }

  private fallbackClassification(): ContractClassificationResult {
    return {
      primaryType: 'general',
      confidence: 0.5,
      secondaryTypes: [],
      reasoning: 'Fallback-Klassifikation aufgrund fehlgeschlagener KI-Analyse',
      structuralIndicators: {
        hasDeliverables: false,
        hasTimeBasedPayment: false,
        hasSuccessMetrics: false,
        hasEmploymentTerms: false,
        hasConfidentialityTerms: false,
        clauseCount: 0,
        contractLength: 'medium' as const
      },
      isCompoundContract: false,
      riskFactors: ['KI-Klassifikation fehlgeschlagen - manuelle Überprüfung empfohlen']
    };
  }
} 