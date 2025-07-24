import Groq from 'groq-sdk';
import type { ContractDocument, ContractClassificationResult, ContractType } from '@/types/contract';

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
      // Perform structural analysis first
      const structuralIndicators = this.analyzeContractStructure(content);
      
      // Use AI for semantic classification
      const aiClassification = await this.performAIClassification(content, structuralIndicators);
      
      // Combine results with fallback logic
      return this.combineClassificationResults(aiClassification, structuralIndicators, content);
      
    } catch (error) {
      console.error('AI classification failed, falling back to heuristics:', error);
      return this.fallbackClassification(content);
    }
  }

  private analyzeContractStructure(content: string): ContractClassificationResult['structuralIndicators'] {
    const lowerContent = content.toLowerCase();
    
    // Analyze structural patterns
    const hasDeliverables = this.detectDeliverables(lowerContent);
    const hasTimeBasedPayment = this.detectTimeBasedPayment(lowerContent);
    const hasSuccessMetrics = this.detectSuccessMetrics(lowerContent);
    const hasEmploymentTerms = this.detectEmploymentTerms(lowerContent);
    const hasConfidentialityTerms = this.detectConfidentialityTerms(lowerContent);
    
    // Count clauses (sections starting with §, numbers, or bullet points)
    const clauseCount = this.countClauses(content);
    
    // Determine contract length
    const wordCount = content.split(/\s+/).length;
    const contractLength = wordCount < 500 ? 'short' : wordCount < 2000 ? 'medium' : 'long';
    
    return {
      hasDeliverables,
      hasTimeBasedPayment,
      hasSuccessMetrics,
      hasEmploymentTerms,
      hasConfidentialityTerms,
      clauseCount,
      contractLength
    };
  }

  private detectDeliverables(content: string): boolean {
    const deliverablePatterns = [
      'lieferung', 'erstellung', 'entwicklung', 'fertigstellung',
      'abnahme', 'werk', 'leistungsgegenstand', 'endergebnis',
      'deliverable', 'milestone', 'abgabe', 'übergabe'
    ];
    return deliverablePatterns.some(pattern => content.includes(pattern));
  }

  private detectTimeBasedPayment(content: string): boolean {
    const timeBasedPatterns = [
      'stundenlohn', 'tagessatz', 'monatlich', 'wöchentlich',
      'pro stunde', 'zeitaufwand', 'arbeitszeit', 'vergütung pro',
      'hourly', 'monthly', 'weekly', 'per hour'
    ];
    return timeBasedPatterns.some(pattern => content.includes(pattern));
  }

  private detectSuccessMetrics(content: string): boolean {
    const successPatterns = [
      'erfolg', 'ziel', 'kennzahl', 'messwert', 'qualität',
      'performance', 'ergebnis', 'zielerreichung', 'erfolgsmessung'
    ];
    return successPatterns.some(pattern => content.includes(pattern));
  }

  private detectEmploymentTerms(content: string): boolean {
    const employmentPatterns = [
      'kündigung', 'probezeit', 'urlaub', 'arbeitszeit',
      'überstunden', 'sozialversicherung', 'lohnsteuer',
      'betriebsrat', 'tarifvertrag', 'arbeitsplatz'
    ];
    return employmentPatterns.some(pattern => content.includes(pattern));
  }

  private detectConfidentialityTerms(content: string): boolean {
    const confidentialityPatterns = [
      'geheimhaltung', 'vertraulich', 'nda', 'stillschweigen',
      'confidential', 'non-disclosure', 'betriebsgeheimnis'
    ];
    return confidentialityPatterns.some(pattern => content.includes(pattern));
  }

  private countClauses(content: string): number {
    // Count sections starting with §, numbers, or bullet points
    const clausePatterns = [
      /§\s*\d+/g,                    // § 1, § 2, etc.
      /^\s*\d+\.\s/gm,               // 1. 2. 3. etc.
      /^\s*\(\d+\)/gm,               // (1) (2) (3) etc.
      /^\s*[a-z]\)\s/gm              // a) b) c) etc.
    ];
    
    let totalClauses = 0;
    clausePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      totalClauses += matches ? matches.length : 0;
    });
    
    return totalClauses;
  }

  private async performAIClassification(content: string, structural: any): Promise<any> {
    const classificationPrompt = `Sie sind ein deutscher Rechtsexperte für Vertragsklassifikation. Analysieren Sie den folgenden Vertragstext und klassifizieren Sie ihn.

WICHTIGE UNTERSCHEIDUNGEN:
- WERKVERTRAG (§ 631 BGB): Erfolgsgeschuldet, spezifisches Werk/Ergebnis, Auftragnehmer trägt Erfolgsrisiko
- DIENSTVERTRAG (§ 611 BGB): Tätigkeitsgeschuldet, zeitbasierte Arbeit, Auftraggeber zahlt für Bemühung
- ARBEITSVERTRAG: Weisungsabhängig, persönliche Arbeitsleistung, Sozialversicherungspflicht

STRUKTURELLE INDIKATOREN:
- Liefergegenstände erkannt: ${structural.hasDeliverables}
- Zeitbasierte Zahlung: ${structural.hasTimeBasedPayment} 
- Erfolgsmetriken: ${structural.hasSuccessMetrics}
- Arbeitsrechtliche Begriffe: ${structural.hasEmploymentTerms}
- Geheimhaltung: ${structural.hasConfidentialityTerms}
- Anzahl Klauseln: ${structural.clauseCount}

Antworten Sie NUR im folgenden JSON-Format:
{
  "primaryType": "arbeitsvertrag|werkvertrag|dienstvertrag|nda|service_agreement|purchase_agreement|rental_agreement|general",
  "confidence": 0.95,
  "secondaryTypes": [
    {
      "type": "nda",
      "confidence": 0.3,
      "reasoning": "Enthält Geheimhaltungsklauseln"
    }
  ],
  "reasoning": "Detaillierte Begründung der Klassifikation",
  "isCompoundContract": false,
  "riskFactors": ["Unklare Abgrenzung Werk/Dienst", "Fehlende Sozialversicherungsklärung"]
}

VERTRAGSINHALT:
${content.substring(0, 3000)}...`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: classificationPrompt }],
      model: 'moonshotai/kimi-k2-instruct',
      temperature: 0.1,
      max_tokens: 1000,
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

    return JSON.parse(cleanResponse);
  }

  private combineClassificationResults(
    aiResult: any, 
    structural: ContractClassificationResult['structuralIndicators'],
    content: string
  ): ContractClassificationResult {
    
    // Apply business logic corrections
    let finalType = aiResult.primaryType;
    let confidence = aiResult.confidence;
    const riskFactors = [...(aiResult.riskFactors || [])];

    // Werkvertrag vs Dienstvertrag distinction logic
    if (finalType === 'service_agreement' || finalType === 'dienstvertrag' || finalType === 'werkvertrag') {
      const werkvertragScore = this.calculateWerkvertragScore(structural, content);
      const dienstvertragScore = this.calculateDienstvertragScore(structural, content);
      
      if (werkvertragScore > dienstvertragScore && werkvertragScore > 0.6) {
        finalType = 'werkvertrag';
        if (structural.hasTimeBasedPayment) {
          riskFactors.push('Zeitbasierte Vergütung bei Werkvertrag - Scheinselbstständigkeit prüfen');
        }
      } else if (dienstvertragScore > 0.6) {
        finalType = 'dienstvertrag';
        if (structural.hasSuccessMetrics && !structural.hasEmploymentTerms) {
          riskFactors.push('Erfolgsabhängige Elemente bei Dienstvertrag - Vertragstyp prüfen');
        }
      }
    }

    // Compound contract detection
    const isCompoundContract = this.detectCompoundContract(aiResult.secondaryTypes, structural);

    return {
      primaryType: finalType,
      confidence,
      secondaryTypes: aiResult.secondaryTypes || [],
      reasoning: aiResult.reasoning,
      structuralIndicators: structural,
      isCompoundContract,
      riskFactors
    };
  }

  private calculateWerkvertragScore(structural: any, content: string): number {
    let score = 0;
    
    if (structural.hasDeliverables) score += 0.4;
    if (structural.hasSuccessMetrics) score += 0.3;
    if (!structural.hasTimeBasedPayment) score += 0.2;
    if (!structural.hasEmploymentTerms) score += 0.2;
    
    // Additional semantic indicators
    const werkPatterns = ['abnahme', 'fertigstellung', 'werk', 'erfolg', 'leistungsgegenstand'];
    const foundPatterns = werkPatterns.filter(pattern => 
      content.toLowerCase().includes(pattern)
    ).length;
    score += (foundPatterns / werkPatterns.length) * 0.3;
    
    return Math.min(score, 1.0);
  }

  private calculateDienstvertragScore(structural: any, content: string): number {
    let score = 0;
    
    if (structural.hasTimeBasedPayment) score += 0.4;
    if (!structural.hasSuccessMetrics) score += 0.2;
    if (!structural.hasDeliverables) score += 0.2;
    if (!structural.hasEmploymentTerms) score += 0.1;
    
    // Additional semantic indicators
    const dienstPatterns = ['dienstleistung', 'beratung', 'unterstützung', 'service'];
    const foundPatterns = dienstPatterns.filter(pattern => 
      content.toLowerCase().includes(pattern)
    ).length;
    score += (foundPatterns / dienstPatterns.length) * 0.3;
    
    return Math.min(score, 1.0);
  }

  private detectCompoundContract(secondaryTypes: any[], structural: any): boolean {
    // Contract is compound if it has multiple high-confidence secondary types
    const highConfidenceSecondary = secondaryTypes.filter(type => type.confidence > 0.4);
    
    // Or if it has mixed structural indicators
    const mixedIndicators = (
      structural.hasDeliverables && structural.hasTimeBasedPayment
    ) || (
      structural.hasEmploymentTerms && structural.hasSuccessMetrics
    ) || (
      structural.hasConfidentialityTerms && structural.clauseCount > 15
    );
    
    return highConfidenceSecondary.length > 1 || mixedIndicators;
  }

  private fallbackClassification(content: string): ContractClassificationResult {
    // Fallback to simple keyword matching if AI fails
    const lowerContent = content.toLowerCase();
    let primaryType: ContractType = 'general';
    
    if (lowerContent.includes('arbeitsvertrag') || lowerContent.includes('anstellungsvertrag')) {
      primaryType = 'arbeitsvertrag';
    } else if (lowerContent.includes('werkvertrag') || lowerContent.includes('werk')) {
      primaryType = 'werkvertrag';
    } else if (lowerContent.includes('dienstleistung') || lowerContent.includes('service')) {
      primaryType = 'dienstvertrag';
    } else if (lowerContent.includes('geheimhaltung') || lowerContent.includes('nda')) {
      primaryType = 'nda';
    }
    
    return {
      primaryType,
      confidence: 0.6,
      secondaryTypes: [],
      reasoning: 'Fallback-Klassifikation aufgrund fehlgeschlagener KI-Analyse',
      structuralIndicators: this.analyzeContractStructure(content),
      isCompoundContract: false,
      riskFactors: ['KI-Klassifikation fehlgeschlagen - manuelle Überprüfung empfohlen']
    };
  }
} 