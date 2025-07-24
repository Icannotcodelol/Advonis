'use client'

import { useState } from 'react'
import { CheckCircle, AlertTriangle, TrendingUp, Shield, Download } from 'lucide-react'
import { StructuralIssueCard } from './structural-issue-card'

interface MinimalContract {
  name: string;
  pages: string[];
  annotations?: any[];
}

interface ContractAnalysisProps {
  contract: MinimalContract
  analysis: any | null
  isAnalyzing: boolean
}

export function ContractAnalysis({ contract, analysis, isAnalyzing }: ContractAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'annotations' | 'recommendations' | 'compliance'>('overview')

  // Robustly extract risk and annotations
  const risk = analysis?.overallRisk || analysis?.gesamtbeurteilung?.risiko || 'Unknown';
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

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Risk Assessment */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="text-lg font-semibold mb-3 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-gray-600" />
          Risk Assessment
        </h4>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRiskBadgeColor(risk)}`}>
          <TrendingUp className="w-4 h-4 mr-1" />
          {typeof risk === 'string' ? risk.charAt(0).toUpperCase() + risk.slice(1) : 'Unknown'} Risk
        </div>
        {analysis?.summary && (
          <p className="mt-3 text-gray-700 leading-relaxed">{analysis.summary}</p>
        )}
        {analysis?.gesamtbeurteilung?.hinweis && (
          <p className="mt-3 text-gray-700 leading-relaxed">{analysis.gesamtbeurteilung.hinweis}</p>
        )}
      </div>
      {/* Issue Summary */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="text-lg font-semibold mb-3">Issue Summary</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
            <div className="text-sm text-red-700">Critical & High</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{mediumCount}</div>
            <div className="text-sm text-yellow-700">Medium Risk</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{lowCount}</div>
            <div className="text-sm text-blue-700">Low & Info</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{totalCount}</div>
            <div className="text-sm text-green-700">Total Issues</div>
          </div>
        </div>
      </div>
      {/* Contract Info */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="text-lg font-semibold mb-3">Contract Information</h4>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Pages:</dt>
            <dd className="text-sm font-medium">{contract.pages.length}</dd>
          </div>
        </dl>
      </div>
      {/* Document Completeness */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="text-lg font-semibold mb-3 flex items-center">
          <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Document Completeness
        </h4>
        <p className="text-sm text-gray-700">
          The contract analysis indicates that {totalCount} legal issues were identified across {contract.pages.length} pages.
          This coverage is {totalCount === 0 ? 'excellent' : 'satisfactory'}.
        </p>
        {analysis?.gesamtbeurteilung?.dokumentkomplettität && (
          <div className="mt-3 text-sm text-gray-700">
            <strong>Document Completeness Rating:</strong> {analysis.gesamtbeurteilung.dokumentkomplettität}
          </div>
        )}
      </div>
    </div>
  );

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
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p>No legal issues found in this contract!</p>
          </div>
        ) : (
          <>
            {/* Structural Legal Inferences */}
            {structuralInferences.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Legal Risk Assessment ({structuralInferences.length})
                </h4>
                <div className="space-y-4">
                  {structuralInferences.map((annotation: any) => (
                    <StructuralIssueCard 
                      key={annotation.id} 
                      annotation={annotation}
                      onHighlightFactor={(factor) => {
                        // Could emit event to highlight specific factor in document
                        console.log('Highlight factor:', factor);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Specific Text Issues */}
            {(specificTextIssues.length > 0 || legacyIssues.length > 0) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
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
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Missing Required Clauses ({missingClauses.length + legacyMissing.length})
                </h4>
                <div className="space-y-3">
                  {[...missingClauses, ...legacyMissing].map((annotation: any) => (
                    <div key={annotation.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getRiskBadgeColor(annotation.severity)}`}>
                          {annotation.severity ? annotation.severity.charAt(0).toUpperCase() + annotation.severity.slice(1) : 'Missing'}
                        </div>
                        <span className="text-xs text-gray-500">
                          Required by Law
                        </span>
                      </div>
                      <h5 className="font-medium text-gray-900 mb-1">
                        {annotation.comment || annotation.text}
                      </h5>
                      <p className="text-sm text-gray-700 mb-2">
                        {annotation.explanation || 'This clause is required but missing from the contract.'}
                      </p>
                      {annotation.legalReference && (
                        <div className="text-xs text-gray-600 bg-yellow-100 px-2 py-1 rounded">
                          Legal Basis: {annotation.legalReference}
                        </div>
                      )}
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

  const renderRecommendations = () => (
    <div className="space-y-3">
      {(!analysis?.recommendations || analysis.recommendations.length === 0) && !analysis?.empfehlungen ? (
        <div className="text-center py-8 text-gray-500">
          <p>No specific recommendations at this time.</p>
        </div>
      ) : (
        (analysis.recommendations || []).map((rec: any, index: number) => (
          <div key={index} className="bg-white border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {rec.priority ? rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1) : 'Recommendation'} Priority
              </div>
              {rec.actionRequired && (
                <span className="text-xs text-orange-600 font-medium">
                  Action Required
                </span>
              )}
            </div>
            <h5 className="font-medium text-gray-900 mb-1">
              {rec.title}
            </h5>
            <p className="text-sm text-gray-700">
              {rec.description}
            </p>
            {rec.category && (
              <div className="mt-2 text-xs text-gray-600">
                Category: {rec.category}
              </div>
            )}
          </div>
        ))
      )}
      {/* Show additional recommendations from 'empfehlungen' if present */}
      {analysis?.empfehlungen?.sofortige_anpassungen && analysis.empfehlungen.sofortige_anpassungen.map((rec: any, idx: number) => (
        <div key={`sofort_${idx}`} className="bg-white border rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">Sofortige Anpassung</div>
          </div>
          <h5 className="font-medium text-gray-900 mb-1">{rec.punkt}</h5>
          <p className="text-sm text-gray-700 mb-2">{rec.empfehlung}</p>
          {rec.beispiel && <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">Beispiel: {rec.beispiel}</div>}
        </div>
      ))}
      {analysis?.empfehlungen?.ergänzende_klauseln && analysis.empfehlungen.ergänzende_klauseln.map((rec: any, idx: number) => (
        <div key={`klausel_${idx}`} className="bg-white border rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">Ergänzende Klausel</div>
          </div>
          <h5 className="font-medium text-gray-900 mb-1">{rec.bereich}</h5>
          <p className="text-sm text-gray-700 mb-2">{rec.empfehlung}</p>
        </div>
      ))}
    </div>
  );

  const renderCompliance = () => (
    <div className="space-y-3">
      {(!analysis?.legalCompliance || analysis.legalCompliance.length === 0) && !analysis?.gesamtbeurteilung ? (
        <div className="text-center py-8 text-gray-500">
          <p>No compliance information available.</p>
        </div>
      ) : (
        (analysis.legalCompliance || []).map((compliance: any, index: number) => (
          <div key={index} className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-gray-900">
                {compliance.law} {compliance.section}
              </h5>
              <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                compliance.status === 'compliant' ? 'bg-green-100 text-green-800' :
                compliance.status === 'non_compliant' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {compliance.status === 'compliant' ? 'Compliant' :
                 compliance.status === 'non_compliant' ? 'Non-Compliant' :
                 'Unclear'}
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              {compliance.description}
            </p>
            {compliance.recommendation && (
              <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded">
                <strong>Recommendation:</strong> {compliance.recommendation}
              </div>
            )}
          </div>
        ))
      )}
      {/* Show additional compliance info from 'gesamtbeurteilung' if present */}
      {analysis?.gesamtbeurteilung && (
        <div className="bg-white border rounded-lg p-4 mt-2">
          <h5 className="font-medium text-gray-900 mb-1">Gesamtbeurteilung</h5>
          <p className="text-sm text-gray-700 mb-2">{analysis.gesamtbeurteilung.rechtskonformität}</p>
          <p className="text-sm text-gray-700 mb-2">Risikobewertung: {analysis.gesamtbeurteilung.risikobewertung}</p>
          <p className="text-sm text-gray-700 mb-2">Dringlichkeit: {analysis.gesamtbeurteilung.dringlichkeit}</p>
          {analysis.gesamtbeurteilung.hinweis && <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">{analysis.gesamtbeurteilung.hinweis}</div>}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Analysis Results
          </h3>
          {analysis && (
            <button className="text-sm text-gray-600 hover:text-gray-800 flex items-center">
              <Download className="w-4 h-4 mr-1" />
              Export
            </button>
          )}
        </div>
      </div>
      {/* Loading State */}
      {isAnalyzing && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Analyzing contract...</p>
            <p className="text-sm text-gray-500 mt-1">This may take a moment</p>
          </div>
        </div>
      )}
      {/* Content */}
      {!isAnalyzing && (
        <>
          {/* Tabs */}
          <div className="border-b">
            <nav className="flex px-4">
              {[
                { id: 'overview', label: 'Overview', icon: null },
                { id: 'annotations', label: 'Issues', icon: null },
                { id: 'recommendations', label: 'Recommendations', icon: null },
                { id: 'compliance', label: 'Compliance', icon: null }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`py-3 px-4 border-b-2 font-medium text-sm flex items-center flex-1 justify-center min-w-0 ${
                    activeTab === id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </nav>
          </div>
          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'annotations' && renderAnnotations()}
            {activeTab === 'recommendations' && renderRecommendations()}
            {activeTab === 'compliance' && renderCompliance()}
          </div>
        </>
      )}
    </div>
  );
} 