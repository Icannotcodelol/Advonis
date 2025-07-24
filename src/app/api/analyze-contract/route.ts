import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { SPECIALIZED_SYSTEM_PROMPTS } from '@/lib/specialized-prompts';
import type { ContractClassificationResult } from '@/types/contract';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Use a structured system prompt that enforces consistent JSON output
const SYSTEM_PROMPT = `Sie sind ein erfahrener deutscher Rechtsanwalt mit Spezialisierung auf Arbeits- und Vertragsrecht.

AUFGABE: Analysieren Sie deutsche Verträge und identifizieren Sie alle rechtlichen Probleme, Compliance-Verstöße und Verbesserungsmöglichkeiten.

WICHTIG: Antworten Sie AUSSCHLIESSLICH im folgenden JSON-Format:

{
  "overallRisk": "low|medium|high|critical",
  "summary": "Kurze Zusammenfassung der wichtigsten rechtlichen Probleme",
  "annotations": [
    {
      "id": "unique_id",
      "type": "legal_risk|compliance_issue|improvement_suggestion|missing_clause|gdpr_concern",
      "severity": "critical|high|medium|low|info",
      "sourceType": "specific_text|structural_inference|missing_clause",
      "comment": "Präzise Beschreibung des Problems (max. 100 Zeichen)",
      "explanation": "Detaillierte rechtliche Erklärung mit Begründung (min. 50 Zeichen)",
      "legalReference": "Relevante Gesetze/Paragraphen (z.B. § 622 BGB, § 2 NachwG)",
      "text": "Relevanter Vertragstext oder Problembereich",
      "textEvidence": ["§2 Arbeitszeit", "§5 Weisungsbefugnis"], // Nur bei structural_inference
      "recommendedHighlight": "Ungefährer Text zum Hervorheben", // Nur bei structural_inference
      "contributingFactors": [ // Nur bei komplexen structural_inference Problemen
        {
          "clauseReference": "§2 Arbeitszeit",
          "factorText": "Feste Arbeitszeiten 9-17 Uhr",
          "severity": "high",
          "explanation": "Deutet auf abhängige Beschäftigung hin"
        }
      ],
      "suggestedReplacement": "Vorgeschlagene Verbesserung (optional)",
      "pageNumber": 1,
      "confidence": 0.9
    }
  ],
  "recommendations": [
    {
      "title": "Empfehlungstitel",
      "description": "Detaillierte Handlungsempfehlung",
      "priority": "high|medium|low",
      "category": "Compliance|BGB|Arbeitsrecht|Datenschutz",
      "actionRequired": true
    }
  ]
}

ANNOTATION SOURCE TYPES:
- "specific_text": Problem liegt in konkretem Vertragstext (z.B. unwirksame AGB-Klausel)
- "structural_inference": Rechtliche Schlussfolgerung aus Gesamtvertrag (z.B. Scheinselbständigkeit)
- "missing_clause": Fehlende erforderliche Bestimmung

FÜR STRUCTURAL_INFERENCE:
- textEvidence: Liste der beitragenden Vertragsabsätze/Klauseln
- recommendedHighlight: Konkreter Text der hervorgehoben werden sollte
- contributingFactors: Bei komplexen Problemen wie Scheinselbständigkeit alle Faktoren auflisten

BEISPIEL für Scheinselbständigkeit:
{
  "sourceType": "structural_inference",
  "textEvidence": ["§2 Arbeitszeit", "§4 Weisungen", "§6 Vergütung"],
  "contributingFactors": [
    {"clauseReference": "§2", "factorText": "Arbeitszeit: täglich 8 Stunden", "severity": "high"},
    {"clauseReference": "§4", "factorText": "Weisungsrecht des Auftraggebers", "severity": "critical"}
  ]
}

BEISPIELE für mathematische Validierung:

RICHTIG - Mindestlohn COMPLIANCE (KEINE Flaggung):
- Vertrag: €4.500/Monat bei 168h → €26,79/h > €12,41 → KEIN Verstoß
- Vertrag: €2.500/Monat bei 160h → €15,63/h > €12,41 → KEIN Verstoß

RICHTIG - Mindestlohn VERSTOS (Flaggung erforderlich):
- Vertrag: €1.800/Monat bei 168h → €10,71/h < €12,41 → Verstoß flaggen

FALSCH - Diese Flaggung ist VERBOTEN:
- "Trotz €26,79/h könnte Mindestlohn-Risiko bestehen" → NIEMALS so flaggen!

ALLGEMEINE VALIDIERUNGSREGEL:
Für JEDEN Compliance-Check gilt:
1. MESSEN Sie den tatsächlichen Wert im Vertrag
2. VERGLEICHEN Sie mit dem gesetzlichen Schwellenwert  
3. NUR bei tatsächlicher Unterschreitung → Verstoß flaggen
4. Bei Einhaltung oder Überschreitung → KEINE Flaggung
5. DOKUMENTIEREN Sie die Berechnung transparent

Diese Regel gilt für: Mindestlohn, Kündigungsfristen, Urlaubstage, Arbeitszeiten, etc.

ANALYSESCHWERPUNKTE:
- BGB-Compliance (§§ 305-310 AGB-Recht, § 307 Unwirksamkeit)
- Arbeitsrecht (§ 622 BGB Kündigungsfristen, § 2 NachwG Pflichtangaben)
- Mindestlohn (MiLoG § 1: aktuell 12,41 €/Stunde)
- Urlaubsrecht (BUrlG § 3: mind. 24 Werktage)
- DSGVO-Compliance bei Datenverarbeitung
- Scheinselbständigkeit nach § 611a BGB

KRITISCH - MATHEMATISCHE VALIDIERUNG:
Bei Mindestlohn-Prüfung:
1. Berechnen Sie den Stundenlohn: (Monatslohn ÷ Arbeitsstunden pro Monat)
2. Vergleichen Sie mit €12,41
3. NUR bei Stundenlohn < €12,41 → Verstoß flaggen
4. Bei Stundenlohn ≥ €12,41 → KEINEN Verstoß flaggen
5. Dokumentieren Sie die Berechnung in der explanation

Bei Urlaubstagen-Prüfung:
1. Zählen Sie die gewährten Urlaubstage
2. Vergleichen Sie mit 24 Werktagen (bei 6-Tage-Woche) oder 20 Werktagen (bei 5-Tage-Woche)
3. NUR bei weniger Tagen → Verstoß flaggen

NIEMALS einen Compliance-Verstoß flaggen, wenn die tatsächlichen Werte die gesetzlichen Mindestanforderungen erfüllen oder überschreiten.

Jede Annotation MUSS eine detaillierte "explanation" und "legalReference" enthalten. Seien Sie spezifisch und actionable.`;

// Helper function to get specialized system prompt based on contract type
function getSpecializedSystemPrompt(contractType: string): string {
  const specializedPrompt = SPECIALIZED_SYSTEM_PROMPTS[contractType as keyof typeof SPECIALIZED_SYSTEM_PROMPTS];
  
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

  return specializedPrompt ? specializedPrompt + jsonFormat : SYSTEM_PROMPT;
}

// Helper function to find text in content with better matching
function findTextOffset(content: string, searchText: string): { startOffset: number; endOffset: number } {
  if (!searchText || !content) {
    return { startOffset: 0, endOffset: 0 };
  }
  
  // Try exact match first
  let index = content.indexOf(searchText);
  if (index >= 0) {
    return { startOffset: index, endOffset: index + searchText.length };
  }
  
  // Try case-insensitive match
  const lowerContent = content.toLowerCase();
  const lowerSearch = searchText.toLowerCase();
  index = lowerContent.indexOf(lowerSearch);
  if (index >= 0) {
    return { startOffset: index, endOffset: index + searchText.length };
  }
  
  // Try partial match (first 20 characters)
  const partial = searchText.substring(0, Math.min(20, searchText.length));
  index = lowerContent.indexOf(partial.toLowerCase());
  if (index >= 0) {
    return { startOffset: index, endOffset: index + partial.length };
  }
  
  // Try word-based matching (split by spaces and find first word)
  const words = searchText.split(/\s+/).filter(w => w.length > 3);
  for (const word of words) {
    index = lowerContent.indexOf(word.toLowerCase());
    if (index >= 0) {
      return { startOffset: index, endOffset: index + word.length };
    }
  }
  
  return { startOffset: 0, endOffset: 0 };
}

// Post-process annotations to ensure they have valid offsets
function computeAnnotationOffsets(annotations: any[], content: string): any[] {
  return annotations.map(annotation => {
    // Skip if already has valid offsets
    if (annotation.startOffset > 0 && annotation.endOffset > annotation.startOffset) {
      return annotation;
    }
    
    // Try to find text in different fields
    const searchTexts = [
      annotation.text,
      annotation.recommendedHighlight,
      annotation.factorText,
      ...(annotation.textEvidence || []),
      ...(annotation.contributingFactors?.map((f: any) => f.factorText) || [])
    ].filter(Boolean);
    
    for (const searchText of searchTexts) {
      const { startOffset, endOffset } = findTextOffset(content, searchText);
      if (startOffset > 0 || endOffset > 0) {
        return {
          ...annotation,
          startOffset,
          endOffset,
          text: searchText // Use the text that was actually found
        };
      }
    }
    
    // For missing clauses or structural inferences, don't highlight
    if (annotation.sourceType === 'missing_clause' || annotation.type === 'missing_clause') {
      return { ...annotation, startOffset: 0, endOffset: 0 };
    }
    
    return annotation;
  });
}

function normalizeAnnotations(analysis: any, content: string): any[] {
  const annotations: any[] = [];
  
  // If already present, return as is
  if (Array.isArray(analysis.annotations) && analysis.annotations.length > 0) {
    return analysis.annotations;
  }

  // Map vertragsanalyse.kritische_hinweise (newest structure)
  if (analysis.vertragsanalyse?.kritische_hinweise && Array.isArray(analysis.vertragsanalyse.kritische_hinweise)) {
    analysis.vertragsanalyse.kritische_hinweise.forEach((hint: string, i: number) => {
      const text = hint.substring(0, 30) + '...';
      const { startOffset, endOffset } = findTextOffset(content, text);
      annotations.push({
        id: `kritisch_hinweis_${i}`,
        type: 'legal_risk',
        severity: 'high',
        comment: 'Kritischer Hinweis',
        explanation: hint,
        text,
        startOffset,
        endOffset,
        pageNumber: 1,
        confidence: 0.9,
      });
    });
  }

  // Map rechtliche_einordnung issues
  if (analysis.rechtliche_einordnung?.abgrenzung_arbeitsvertrag) {
    const ab = analysis.rechtliche_einordnung.abgrenzung_arbeitsvertrag;
    const abText = 'Freier Werkvertrag';
    const { startOffset: abStart, endOffset: abEnd } = findTextOffset(content, abText);
    annotations.push({
      id: 'abgrenzung_arbeitsvertrag',
      type: 'legal_risk',
      severity: 'high',
      comment: 'Abgrenzung Arbeitsvertrag',
      explanation: `${ab.problem}. ${ab.gefahr}`,
      legalReference: '§ 611a BGB, §§ 631-651 BGB',
      text: abText,
      startOffset: abStart,
      endOffset: abEnd,
      pageNumber: 1,
      confidence: 0.9,
    });
  }

  // Map fehlende_mindestangaben
  if (analysis.fehlende_mindestangaben?.['pflichtangaben_nach_§2_nachweisg']) {
    const pflichtangaben = analysis.fehlende_mindestangaben['pflichtangaben_nach_§2_nachweisg'];
    pflichtangaben.forEach((angabe: string, i: number) => {
      annotations.push({
        id: `fehlende_angabe_${i}`,
        type: 'missing_clause',
        severity: 'medium',
        comment: `Fehlende Pflichtangabe: ${angabe}`,
        explanation: `Nach § 2 NachwG erforderlich: ${angabe}. Status: ${analysis.fehlende_mindestangaben.status}`,
        legalReference: '§ 2 NachwG',
        text: angabe,
        startOffset: 0, // Missing clauses can't be highlighted
        endOffset: 0,
        pageNumber: 1,
        confidence: 0.8,
      });
    });
  }

  // Map compliance_verstoesse
  if (analysis.compliance_verstoesse) {
    Object.entries(analysis.compliance_verstoesse).forEach(([key, value]: [string, any], i: number) => {
      if (value && typeof value === 'object') {
        const keyIdx = content.indexOf(key);
        annotations.push({
          id: `compliance_${key}_${i}`,
          type: 'compliance_issue',
          severity: value.status?.includes('Nicht') ? 'medium' : 'low',
          comment: `Compliance-Verstoß: ${key}`,
          explanation: `${value.status || ''}. ${value.problem || value.hinweis || ''}`,
          text: key,
          startOffset: keyIdx >= 0 ? keyIdx : 0,
          endOffset: keyIdx >= 0 ? keyIdx + key.length : 0,
          pageNumber: 1,
          confidence: 0.7,
        });
      }
    });
  }

  // Map rechtliche_mängel (previous structure)
  if (analysis.rechtliche_mängel && Array.isArray(analysis.rechtliche_mängel)) {
    analysis.rechtliche_mängel.forEach((rm: any, i: number) => {
      const rmText = rm.kategorie || rm.titel || 'Legal issue';
      const { startOffset: rmStart, endOffset: rmEnd } = findTextOffset(content, rmText);
      annotations.push({
        id: `rechtlich_${i}`,
        type: 'legal_risk',
        severity: rm.schweregrad?.toLowerCase() || 'high',
        comment: rm.kategorie || rm.beschreibung || rm.titel || 'Legal issue',
        explanation: rm.beschreibung || rm.erläuterung || rm.details || '',
        legalReference: rm.rechtsgrundlage || rm.gesetz || undefined,
        text: rmText,
        startOffset: rmStart,
        endOffset: rmEnd,
        pageNumber: 1,
        confidence: 0.9,
      });
    });
  }

  // Map fehlende_klauseln (previous structure)
  if (analysis.fehlende_klauseln && Array.isArray(analysis.fehlende_klauseln)) {
    analysis.fehlende_klauseln.forEach((fk: any, i: number) => {
      annotations.push({
        id: `fehlende_${i}`,
        type: 'missing_clause',
        severity: 'medium',
        comment: `Fehlende Klausel: ${fk.klausel || fk.bereich || fk.titel}`,
        explanation: fk.beschreibung || fk.erläuterung || fk.grund || '',
        legalReference: fk.rechtsgrundlage || fk.gesetz || undefined,
        text: fk.klausel || fk.bereich || fk.titel || 'Missing clause',
        startOffset: 0,
        endOffset: 0,
        pageNumber: 1,
        confidence: 0.8,
      });
    });
  }

  // Map kritische_punkte (original structure)
  if (analysis.kritische_punkte && Array.isArray(analysis.kritische_punkte)) {
    analysis.kritische_punkte.forEach((kp: any, i: number) => {
      annotations.push({
        id: `kritisch_${i}`,
        type: 'legal_risk',
        severity: 'high',
        comment: kp.kategorie || kp.beschreibung || 'Critical legal issue',
        explanation: kp.beschreibung || (kp.details ? kp.details.join('. ') : '') || (kp.indizien ? kp.indizien.join('. ') : '') || (kp.folgen ? kp.folgen.join('. ') : ''),
        legalReference: kp.rechtsgrundlagen ? kp.rechtsgrundlagen.join(', ') : undefined,
        text: kp.kategorie || kp.beschreibung || 'Critical issue',
        startOffset: i * 100,
        endOffset: (i * 100) + 50,
        pageNumber: 1,
        confidence: 0.9,
      });
    });
  }

  // Map fehlende_pflichtangaben (original structure)
  if (analysis.fehlende_pflichtangaben && Array.isArray(analysis.fehlende_pflichtangaben)) {
    analysis.fehlende_pflichtangaben.forEach((fp: any, i: number) => {
      annotations.push({
        id: `fehlend_${i}`,
        type: 'missing_clause',
        severity: 'medium',
        comment: `Fehlende Regelung: ${fp.bereich}`,
        explanation: `${fp.gesetzliche_anforderung}. Status: ${fp.status}`,
        legalReference: fp.gesetzliche_anforderung,
        text: fp.bereich,
        startOffset: 0,
        endOffset: 0,
        pageNumber: 1,
        confidence: 0.8,
      });
    });
  }

  // Map weitere_mängel (if present)
  if (analysis.weitere_mängel && Array.isArray(analysis.weitere_mängel)) {
    analysis.weitere_mängel.forEach((wm: any, i: number) => {
      const wmText = wm.problem;
      const { startOffset: wmStart, endOffset: wmEnd } = findTextOffset(content, wmText);
      annotations.push({
        id: `mangel_${i}`,
        type: 'improvement_suggestion',
        severity: wm.bewertung?.toLowerCase().includes('hoch') ? 'high' : 
                 wm.bewertung?.toLowerCase().includes('mittel') ? 'medium' : 'low',
        comment: wm.problem,
        explanation: wm.beschreibung,
        legalReference: wm.rechtsgrundlage,
        text: wmText,
        startOffset: wmStart,
        endOffset: wmEnd,
        pageNumber: 1,
        confidence: 0.8,
      });
    });
  }

  // Map analyse_ergebnis.kritische_punkte (alternative structure)
  if (analysis.analyse_ergebnis?.kritische_punkte) {
    analysis.analyse_ergebnis.kritische_punkte.forEach((kp: any, i: number) => {
      const kpText = kp.problem;
      const { startOffset: kpStart, endOffset: kpEnd } = findTextOffset(content, kpText);
      annotations.push({
        id: `werk_kritisch_${i}`,
        type: 'legal_risk',
        severity: kp.bewertung?.toLowerCase().includes('hoch') ? 'high' : 
                 kp.bewertung?.toLowerCase().includes('mittel') ? 'medium' : 'low',
        comment: kp.problem,
        explanation: kp.beschreibung,
        suggestedReplacement: kp.empfehlung,
        legalReference: kp.rechtsgrundlage,
        text: kpText,
        startOffset: kpStart,
        endOffset: kpEnd,
        pageNumber: 1,
        confidence: 0.9,
      });
    });
  }

  return annotations;
}

// Helper function to classify contract using the classification API
async function classifyContract(content: string): Promise<ContractClassificationResult> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/classify-contract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`Classification API returned ${response.status}`);
    }

    const { classification } = await response.json();
    return classification;
    
  } catch (error) {
    console.error('Failed to classify contract via API:', error);
    // Fallback to 'general' if classification fails
    return {
      primaryType: 'general',
      confidence: 0.5,
      secondaryTypes: [],
      reasoning: 'Classification API failed - using fallback',
      structuralIndicators: {
        hasDeliverables: false,
        hasTimeBasedPayment: false,
        hasSuccessMetrics: false,
        hasEmploymentTerms: false,
        hasConfidentialityTerms: false,
        clauseCount: 0,
        contractLength: 'medium'
      },
      isCompoundContract: false,
      riskFactors: ['Classification failed - manual review recommended']
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, pages, name } = await request.json();
    if (!content || !pages || !name) {
      return NextResponse.json({ error: 'Missing contract data' }, { status: 400 });
    }
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'AI analysis service not configured' }, { status: 500 });
    }

    // Step 1: Classify the contract using the sophisticated classification API
    const classification = await classifyContract(content);
    
    // Step 2: Use specialized system prompt based on classification
    const systemPrompt = getSpecializedSystemPrompt(classification.primaryType);
    
    // Build focused user prompt with classification context
    const userPrompt = `Analysieren Sie den folgenden deutschen Vertrag:

VERTRAGSNAME: ${name}
KLASSIFIZIERT ALS: ${classification.primaryType} (Konfidenz: ${classification.confidence})
KLASSIFIKATIONS-BEGRÜNDUNG: ${classification.reasoning}

STRUKTURELLE INDIKATOREN:
- Liefergegenstände: ${classification.structuralIndicators.hasDeliverables}
- Zeitbasierte Zahlung: ${classification.structuralIndicators.hasTimeBasedPayment}
- Erfolgsmetriken: ${classification.structuralIndicators.hasSuccessMetrics}
- Arbeitsrechtliche Begriffe: ${classification.structuralIndicators.hasEmploymentTerms}
- Geheimhaltung: ${classification.structuralIndicators.hasConfidentialityTerms}
- Klauseln: ${classification.structuralIndicators.clauseCount}
- Länge: ${classification.structuralIndicators.contractLength}

${classification.riskFactors.length > 0 ? `RISIKOFAKTOREN: ${classification.riskFactors.join(', ')}` : ''}

VERTRAGSINHALT:
${content}

Führen Sie eine vollständige rechtliche Analyse durch. Berücksichtigen Sie die Klassifikation und strukturellen Indikatoren. Identifizieren Sie ALLE problematischen Klauseln, fehlenden Bestimmungen und Compliance-Verstöße. Antworten Sie im geforderten JSON-Format.`;

    // Call GroqCloud with specialized prompt
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
      return NextResponse.json({ error: 'No response from AI analysis' }, { status: 502 });
    }

    // Parse the structured JSON response
    let analysis;
    try {
      let clean = response.trim();
      if (clean.startsWith('```json')) clean = clean.replace(/```json\n?/, '').replace(/\n?```$/, '');
      analysis = JSON.parse(clean);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid AI response format', raw: response }, { status: 502 });
    }

    // The structured prompt should provide annotations directly
    // But keep normalization as fallback for edge cases
    if (!analysis.annotations || analysis.annotations.length === 0) {
      analysis.annotations = normalizeAnnotations(analysis, content);
    }

    // Post-process annotations to ensure they have valid offsets
    analysis.annotations = computeAnnotationOffsets(analysis.annotations, content);

    // Ensure basic fields are present
    if (!analysis.overallRisk) {
      analysis.overallRisk = analysis.annotations.length > 5 ? 'high' : 
                            analysis.annotations.length > 2 ? 'medium' : 'low';
    }
    if (!analysis.summary) {
      analysis.summary = `${analysis.annotations.length} rechtliche Probleme identifiziert.`;
    }

    // Include classification result in the response
    return NextResponse.json({ 
      analysis,
      classification
    });
  } catch (error) {
    console.error('Contract analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze contract' }, { status: 500 });
  }
}

// Optional: Health check endpoint
export async function GET() {
  try {
    const hasApiKey = !!process.env.GROQ_API_KEY;
    return NextResponse.json({
      status: 'operational',
      configured: hasApiKey,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Service health check failed' }, { status: 500 });
  }
} 