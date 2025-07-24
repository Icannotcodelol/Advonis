'use client'

import { useState } from 'react'
import type { ContractDocument, AnalysisResult, ContractClassificationResult } from '@/types/contract'
import StructuralIssueCard from './structural-issue-card'

interface ContractAnalysisProps {
  contract: ContractDocument | null
  analysis: AnalysisResult | null
  classification: ContractClassificationResult | null
  isAnalyzing: boolean
}

function ContractAnalysis({ contract, analysis, classification, isAnalyzing }: ContractAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'annotations' | 'recommendations' | 'compliance' | 'classification'>('overview')

  // Robustly extract risk and annotations
  const risk = analysis?.overallRisk || 'Unknown';
  const annotations = Array.isArray(analysis?.annotations) ? analysis.annotations : [];

  // Robust severity counting
  const criticalCount = annotations.filter((a: any) => (a.severity || '').toLowerCase().includes('high') || (a.severity || '').toLowerCase().includes('kritisch')).length;
  const mediumCount = annotations.filter((a: any) => (a.severity || '').toLowerCase().includes('medium') || (a.severity || '').toLowerCase().includes('mittel')).length;
  const lowCount = annotations.filter((a: any) => (a.severity || '').toLowerCase().includes('low') || (a.severity || '').toLowerCase().includes('info') || (a.severity || '').toLowerCase().includes('gering')).length;
  const totalCount = annotations.length;

  const getRiskBadgeColor = (risk: string) => {
    const r = (risk || '').toLowerCase();
    if (r.includes('low') || r.includes('niedrig')) return 'bg-green-100 text-green-800 border-green-200';
    if (r.includes('medium') || r.includes('mittel')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (r.includes('high') || r.includes('hoch')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (r.includes('critical') || r.includes('kritisch')) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (isAnalyzing) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Analyzing contract with AI-powered legal expertise...
        </p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
        Upload a contract to start analysis
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Contract Classification */}
      {classification && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Contract Classification</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Primary Type:</span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {classification.primaryType}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceBadgeColor(classification.confidence)}`}>
                  {Math.round(classification.confidence * 100)}%
                </span>
              </div>
            </div>
            
            {classification.secondaryTypes.length > 0 && (
              <div>
                <span className="text-sm text-gray-600">Secondary Types:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {classification.secondaryTypes.map((secondary, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {secondary.type} ({Math.round(secondary.confidence * 100)}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {classification.isCompoundContract && (
              <div className="text-sm text-amber-700 bg-amber-50 rounded p-2">
                ⚠️ Compound Contract: Contains elements of multiple contract types
              </div>
            )}
            
            {classification.riskFactors.length > 0 && (
              <div>
                <span className="text-sm font-medium text-red-600">Risk Factors:</span>
                <ul className="text-xs text-red-700 mt-1 space-y-1">
                  {classification.riskFactors.map((factor, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-red-400">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Risk Assessment */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Risk Assessment</h4>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600">Overall Risk Level</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskBadgeColor(risk)}`}>
            {risk}
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-red-600">{criticalCount}</div>
            <div className="text-xs text-gray-500">Critical</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-600">{mediumCount}</div>
            <div className="text-xs text-gray-500">Medium</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">{lowCount}</div>
            <div className="text-xs text-gray-500">Low</div>
          </div>
        </div>
      </div>

      {/* Summary */}
      {analysis?.summary && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Analysis Summary</h4>
          <p className="text-sm text-gray-700">{analysis.summary}</p>
        </div>
      )}

      {/* Structural Indicators */}
      {classification?.structuralIndicators && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Contract Structure</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between">
              <span>Deliverables:</span>
              <span className={classification.structuralIndicators.hasDeliverables ? 'text-green-600' : 'text-gray-400'}>
                {classification.structuralIndicators.hasDeliverables ? '✓' : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Time-based:</span>
              <span className={classification.structuralIndicators.hasTimeBasedPayment ? 'text-green-600' : 'text-gray-400'}>
                {classification.structuralIndicators.hasTimeBasedPayment ? '✓' : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Success Metrics:</span>
              <span className={classification.structuralIndicators.hasSuccessMetrics ? 'text-green-600' : 'text-gray-400'}>
                {classification.structuralIndicators.hasSuccessMetrics ? '✓' : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Employment Terms:</span>
              <span className={classification.structuralIndicators.hasEmploymentTerms ? 'text-green-600' : 'text-gray-400'}>
                {classification.structuralIndicators.hasEmploymentTerms ? '✓' : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Confidentiality:</span>
              <span className={classification.structuralIndicators.hasConfidentialityTerms ? 'text-green-600' : 'text-gray-400'}>
                {classification.structuralIndicators.hasConfidentialityTerms ? '✓' : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Clauses:</span>
              <span className="text-gray-600">{classification.structuralIndicators.clauseCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderAnnotations = () => {
    // Categorize annotations by sourceType for better display
    const specificTextIssues = annotations.filter((a: any) => 
      (a.sourceType || 'specific_text') === 'specific_text'
    );
    
    const structuralInferences = annotations.filter((a: any) => 
      a.sourceType === 'structural_inference'
    );
    
    const missingClauses = annotations.filter((a: any) => 
      a.sourceType === 'missing_clause' || a.type === 'missing_clause'
    );
    
    // Legacy fallback for annotations without sourceType
    const legacyIssues = annotations.filter((a: any) => {
      if (a.sourceType) return false; // Skip if already categorized
      
      const isMissingContent = a.comment?.toLowerCase().includes('fehlend') || 
                               a.comment?.toLowerCase().includes('fehlt') ||
                               a.comment?.toLowerCase().includes('missing') ||
                               a.explanation?.toLowerCase().includes('fehlend') ||
                               a.explanation?.toLowerCase().includes('fehlt');
      return !isMissingContent;
    });
    
    const legacyMissing = annotations.filter((a: any) => {
      if (a.sourceType) return false; // Skip if already categorized
      
      const isMissingContent = a.comment?.toLowerCase().includes('fehlend') || 
                               a.comment?.toLowerCase().includes('fehlt') ||
                               a.comment?.toLowerCase().includes('missing') ||
                               a.explanation?.toLowerCase().includes('fehlend') ||
                               a.explanation?.toLowerCase().includes('fehlt');
      return isMissingContent;
    });

    return (
      <div className="space-y-6">
        {totalCount === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No legal issues found in this contract!</p>
          </div>
        ) : (
          <>
            {/* Structural Legal Inferences */}
            {structuralInferences.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <div className="w-4 h-4 mr-2 bg-blue-500 rounded-full" />
                  Legal Risk Assessment ({structuralInferences.length})
                </h4>
                <div className="space-y-4">
                  {structuralInferences.map((annotation: any) => (
                    <StructuralIssueCard
                      key={annotation.id}
                      title={annotation.comment || annotation.text || 'Legal Risk'}
                      description={annotation.explanation || 'No detailed explanation provided.'}
                      severity={
                        (annotation.severity || '').toLowerCase().includes('high') || (annotation.severity || '').toLowerCase().includes('kritisch')
                          ? 'error'
                          : (annotation.severity || '').toLowerCase().includes('medium') || (annotation.severity || '').toLowerCase().includes('mittel')
                          ? 'warning'
                          : 'info'
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Specific Text Issues */}
            {(specificTextIssues.length > 0 || legacyIssues.length > 0) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <div className="w-4 h-4 mr-2 bg-red-500 rounded-full" />
                  Issues Found in Contract ({specificTextIssues.length + legacyIssues.length})
                </h4>
                <div className="space-y-3">
                  {[...specificTextIssues, ...legacyIssues].map((annotation: any) => (
                    <div key={annotation.id} className="bg-white border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getRiskBadgeColor(annotation.severity)}`}>
                          {annotation.severity ? annotation.severity.charAt(0).toUpperCase() + annotation.severity.slice(1) : 'Issue'}
                        </div>
                        <span className="text-xs text-gray-500">
                          Page {annotation.pageNumber || 1}
                        </span>
                      </div>
                      <h5 className="font-medium text-gray-900 mb-1">
                        {annotation.comment || annotation.text}
                      </h5>
                      <p className="text-sm text-gray-700 mb-2">
                        {annotation.explanation || 'No detailed explanation provided.'}
                      </p>
                      {annotation.legalReference && (
                        <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          {annotation.legalReference}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Clauses */}
            {(missingClauses.length > 0 || legacyMissing.length > 0) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <div className="w-4 h-4 mr-2 bg-yellow-500 rounded-full" />
                  Missing Required Clauses ({missingClauses.length + legacyMissing.length})
                </h4>
                <div className="space-y-3">
                  {[...missingClauses, ...legacyMissing].map((annotation: any) => (
                    <div key={annotation.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getRiskBadgeColor(annotation.severity)}`}>
                          {annotation.severity ? annotation.severity.charAt(0).toUpperCase() + annotation.severity.slice(1) : 'Missing'}
                        </div>
                      </div>
                      <h5 className="font-medium text-gray-900 mb-1">
                        {annotation.comment || annotation.text}
                      </h5>
                      <p className="text-sm text-gray-700">
                        {annotation.explanation || 'This clause should be added to ensure legal compliance.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderRecommendations = () => {
    const recommendations = analysis?.recommendations || [];
    
    if (recommendations.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No specific recommendations available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {recommendations.map((rec: any, index: number) => (
          <div key={index} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 mt-0.5 rounded-full ${
                rec.priority === 'high' ? 'bg-red-500' : 
                rec.priority === 'medium' ? 'bg-yellow-500' : 
                'bg-blue-500'
              }`} />
              <div className="flex-1">
                <h5 className="font-medium text-gray-900">
                  {rec.title || `Recommendation ${index + 1}`}
                </h5>
                <p className="text-sm text-gray-600 mt-1">
                  {rec.description || 'No description provided'}
                </p>
                {rec.category && (
                  <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {rec.category}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCompliance = () => {
    const compliance = analysis?.legalCompliance || [];
    
    if (compliance.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No compliance information available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {compliance.map((comp: any, index: number) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-gray-900">
                {comp.law} {comp.section}
              </h5>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                comp.status === 'compliant' ? 'bg-green-100 text-green-800' :
                comp.status === 'non_compliant' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {comp.status === 'compliant' ? 'Compliant' :
                 comp.status === 'non_compliant' ? 'Non-Compliant' :
                 'Unclear'}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {comp.description}
            </p>
            {comp.recommendation && (
              <p className="text-sm text-blue-600 mt-2">
                <strong>Recommendation:</strong> {comp.recommendation}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderClassificationDetails = () => {
    if (!classification) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No classification information available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Classification Summary</h4>
          <p className="text-sm text-gray-700 mb-4">{classification.reasoning}</p>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Primary Type:</span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {classification.primaryType}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceBadgeColor(classification.confidence)}`}>
                  {Math.round(classification.confidence * 100)}%
                </span>
              </div>
            </div>
            
            {classification.secondaryTypes.length > 0 && (
              <div>
                <span className="text-sm text-gray-600">Secondary Types:</span>
                <div className="space-y-2 mt-2">
                  {classification.secondaryTypes.map((secondary, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 rounded p-2">
                      <span className="text-sm text-gray-800">{secondary.type}</span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getConfidenceBadgeColor(secondary.confidence)}`}>
                          {Math.round(secondary.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {classification.isCompoundContract && (
              <div className="text-sm text-amber-700 bg-amber-50 rounded p-3">
                ⚠️ <strong>Compound Contract:</strong> This contract contains elements of multiple contract types, requiring careful legal review.
              </div>
            )}
            
            {classification.riskFactors.length > 0 && (
              <div>
                <span className="text-sm font-medium text-red-600">Risk Factors:</span>
                <ul className="text-sm text-red-700 mt-2 space-y-1">
                  {classification.riskFactors.map((factor, index) => (
                    <li key={index} className="flex items-start gap-2 bg-red-50 rounded p-2">
                      <span className="text-red-400 mt-1">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Structural Analysis */}
        {classification.structuralIndicators && (
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Structural Analysis</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Deliverables:</span>
                <span className={`font-medium ${classification.structuralIndicators.hasDeliverables ? 'text-green-600' : 'text-gray-400'}`}>
                  {classification.structuralIndicators.hasDeliverables ? '✓ Yes' : '— No'}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Time-based Payment:</span>
                <span className={`font-medium ${classification.structuralIndicators.hasTimeBasedPayment ? 'text-green-600' : 'text-gray-400'}`}>
                  {classification.structuralIndicators.hasTimeBasedPayment ? '✓ Yes' : '— No'}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Success Metrics:</span>
                <span className={`font-medium ${classification.structuralIndicators.hasSuccessMetrics ? 'text-green-600' : 'text-gray-400'}`}>
                  {classification.structuralIndicators.hasSuccessMetrics ? '✓ Yes' : '— No'}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Employment Terms:</span>
                <span className={`font-medium ${classification.structuralIndicators.hasEmploymentTerms ? 'text-green-600' : 'text-gray-400'}`}>
                  {classification.structuralIndicators.hasEmploymentTerms ? '✓ Yes' : '— No'}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Confidentiality:</span>
                <span className={`font-medium ${classification.structuralIndicators.hasConfidentialityTerms ? 'text-green-600' : 'text-gray-400'}`}>
                  {classification.structuralIndicators.hasConfidentialityTerms ? '✓ Yes' : '— No'}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Total Clauses:</span>
                <span className="font-medium text-gray-600">{classification.structuralIndicators.clauseCount}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Contract Length:</span>
                <span className="font-medium text-gray-600 capitalize">{classification.structuralIndicators.contractLength}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6 pt-6">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'annotations', label: `Issues (${totalCount})` },
            { key: 'recommendations', label: 'Recommendations' },
            { key: 'compliance', label: 'Compliance' },
            ...(classification ? [{ key: 'classification', label: 'Classification' }] : [])
          ].map(tab => (
            <button
              key={tab.key}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
              }`}
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'annotations' && renderAnnotations()}
        {activeTab === 'recommendations' && renderRecommendations()}
        {activeTab === 'compliance' && renderCompliance()}
        {activeTab === 'classification' && renderClassificationDetails()}
      </div>
    </div>
  )
}

export default ContractAnalysis
 