export interface ContractDocument {
  id: string;
  name: string;
  type: ContractType;
  content: string;
  formattedContent?: string; // HTML content for Word documents
  pages: PDFPage[];
  uploadedAt: Date;
  analysisStatus: AnalysisStatus;
  annotations: Annotation[];
}

export interface PDFPage {
  pageNumber: number;
  content: string;
  textItems: TextItem[];
  viewport: {
    width: number;
    height: number;
  };
}

export interface TextItem {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[];
  fontName: string;
  hasEOL: boolean;
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  severity: AnnotationSeverity;
  startOffset: number;
  endOffset: number;
  pageNumber: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  text: string;
  comment: string;
  explanation: string;
  suggestedReplacement?: string;
  legalReference?: string;
  confidence: number;
  
  // Enhanced fields for hybrid annotation system
  sourceType: AnnotationSourceType;
  textEvidence?: string[]; // For structural inferences: contributing clause references
  recommendedHighlight?: string; // Approximate text to highlight for structural issues
  contributingFactors?: ContributingFactor[]; // For complex structural issues
}

export interface ContributingFactor {
  clauseReference: string; // e.g., "§2 Arbeitszeit"
  factorText: string; // The actual problematic text
  severity: AnnotationSeverity;
  startOffset?: number;
  endOffset?: number;
  explanation: string;
}

export type ContractType = 
  | 'arbeitsvertrag' 
  | 'werkvertrag'
  | 'dienstvertrag'
  | 'nda' 
  | 'service_agreement' 
  | 'purchase_agreement'
  | 'rental_agreement'
  | 'general';

export type AnalysisStatus = 
  | 'pending' 
  | 'analyzing' 
  | 'completed' 
  | 'error';

export type AnnotationType = 
  | 'legal_risk'
  | 'compliance_issue'
  | 'improvement_suggestion'
  | 'language_clarity'
  | 'missing_clause'
  | 'gdpr_concern';

export type AnnotationSeverity = 
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info';

export type AnnotationSourceType = 
  | 'specific_text'        // Direct problematic clause
  | 'structural_inference' // Legal conclusion from overall contract structure
  | 'missing_clause';      // Required clause that's absent

export type HighlightStyle = 
  | 'direct_violation'     // Red solid underline - exact problematic text
  | 'contributing_factor'  // Yellow dotted border - contributes to structural issue
  | 'related_section'      // Blue dashed outline - relevant but not directly problematic
  | 'missing_reference';   // Gray background - where missing clause should be

export interface AnalysisResult {
  contractId: string;
  analysisDate: Date;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  annotations: Annotation[];
  recommendations: Recommendation[];
  legalCompliance: ComplianceCheck[];
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  actionRequired: boolean;
}

export interface ComplianceCheck {
  law: string;
  section: string;
  status: 'compliant' | 'non_compliant' | 'unclear';
  description: string;
  recommendation?: string;
} 

export interface ContractClassificationResult {
  primaryType: ContractType;
  confidence: number;
  secondaryTypes: Array<{
    type: ContractType;
    confidence: number;
    reasoning: string;
  }>;
  reasoning: string;
  structuralIndicators: {
    hasDeliverables: boolean;
    hasTimeBasedPayment: boolean;
    hasSuccessMetrics: boolean;
    hasEmploymentTerms: boolean;
    hasConfidentialityTerms: boolean;
    clauseCount: number;
    contractLength: 'short' | 'medium' | 'long';
  };
  isCompoundContract: boolean;
  riskFactors: string[];
} 