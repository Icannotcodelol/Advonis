'use client'

import { useState } from 'react'
import UploadArea from '@/components/upload-area'
import DocumentViewer from '@/components/document-viewer'
import ContractAnalysis from '@/components/contract-analysis'

export default function HomePage() {
  const [contract, setContract] = useState<any | null>(null)
  const [analysis, setAnalysis] = useState<any | null>(null)
  const [classification, setClassification] = useState<any | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleContractUpload = async (contractObj: any) => {
    setIsAnalyzing(true);
    setAnalysis(null);
    setClassification(null);
    try {
      setContract(contractObj);
      // Send to analysis API which now includes sophisticated classification
      const response = await fetch('/api/analyze-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contractObj.content,
          pages: contractObj.pages.map((page: any) => page.content),
          name: contractObj.name
        }),
      });
      if (!response.ok) throw new Error('Contract analysis failed');
      const { analysis: analysisResult, classification: classificationResult } = await response.json();
      
      setAnalysis(analysisResult);
      setClassification(classificationResult);
      
      // Update contract with annotations and classification
      setContract({ 
        ...contractObj, 
        annotations: analysisResult.annotations,
        classification: classificationResult
      });
    } catch (error) {
      console.error('Contract processing failed:', error);
      setContract(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setContract(null)
    setAnalysis(null)
    setClassification(null)
    setIsAnalyzing(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          German Contract Analysis
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Upload your German contract (PDF) for AI-powered legal analysis with sophisticated contract classification. 
          Get insights on BGB compliance, legal risks, and improvement suggestions.
        </p>
      </div>

      {/* Main Content */}
      {!contract ? (
        /* Upload State */
        <div className="max-w-4xl mx-auto">
          <UploadArea onUpload={handleContractUpload} />
          {/* Features Overview */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Intelligent Classification</h3>
              <p className="text-gray-600">AI-powered contract type recognition with structural analysis and German law compliance</p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-red-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Legal Risk Detection</h3>
              <p className="text-gray-600">Identify problematic clauses and BGB compliance issues with confidence scoring</p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Expert Recommendations</h3>
              <p className="text-gray-600">Get actionable legal advice and contract improvements from specialized prompts</p>
            </div>
          </div>
        </div>
      ) : (
        /* Analysis State */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Viewer */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {contract.name}
                  </h3>
                  {classification && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {classification.primaryType}
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(classification.confidence * 100)}% confidence
                      </span>
                      {classification.isCompoundContract && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Compound
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Upload New Contract
                </button>
              </div>
              <DocumentViewer 
                contract={contract}
                loading={isAnalyzing}
              />
            </div>
          </div>
          {/* Analysis Panel */}
          <div className="lg:col-span-1">
            <ContractAnalysis 
              contract={contract as any}
              analysis={analysis}
              classification={classification}
              isAnalyzing={isAnalyzing}
            />
          </div>
        </div>
      )}
    </div>
  )
} 