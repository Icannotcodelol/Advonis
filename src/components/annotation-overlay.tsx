'use client'

import { X, AlertTriangle, Lightbulb, Shield, BookOpen } from 'lucide-react'
import type { Annotation } from '@/types/contract'

interface AnnotationOverlayProps {
  annotation: Annotation
  onClose: () => void
}

export function AnnotationOverlay({ annotation, onClose }: AnnotationOverlayProps) {
  const getSeverityIcon = () => {
    switch (annotation.severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'low':
      case 'info':
        return <Lightbulb className="w-5 h-5 text-blue-500" />
      default:
        return <BookOpen className="w-5 h-5 text-gray-500" />
    }
  }

  const getSeverityColor = () => {
    switch (annotation.severity) {
      case 'critical':
      case 'high':
        return 'border-red-200 bg-red-50'
      case 'medium':
        return 'border-yellow-200 bg-yellow-50'
      case 'low':
      case 'info':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const getTypeLabel = () => {
    switch (annotation.type) {
      case 'legal_risk':
        return 'Legal Risk'
      case 'compliance_issue':
        return 'Compliance Issue'
      case 'improvement_suggestion':
        return 'Improvement Suggestion'
      case 'language_clarity':
        return 'Language Clarity'
      case 'missing_clause':
        return 'Missing Clause'
      case 'gdpr_concern':
        return 'GDPR Concern'
      default:
        return 'Legal Note'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-2xl w-full bg-white rounded-lg shadow-xl border-2 ${getSeverityColor()}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            {getSeverityIcon()}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {getTypeLabel()}
              </h3>
              <p className="text-sm text-gray-600">
                Severity: {annotation.severity.charAt(0).toUpperCase() + annotation.severity.slice(1)}
                {annotation.confidence && (
                  <span className="ml-2">
                    • Confidence: {Math.round(annotation.confidence * 100)}%
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Highlighted Text */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Highlighted Text:
            </h4>
            <div className="p-3 bg-gray-100 rounded border-l-4 border-gray-400">
              <p className="text-gray-800 italic">"{annotation.text}"</p>
            </div>
          </div>

          {/* Analysis */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Analysis:
            </h4>
            <p className="text-gray-800 leading-relaxed">
              {annotation.comment}
            </p>
          </div>

          {/* Detailed Explanation */}
          {annotation.explanation && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Legal Explanation:
              </h4>
              <p className="text-gray-800 leading-relaxed">
                {annotation.explanation}
              </p>
            </div>
          )}

          {/* Legal Reference */}
          {annotation.legalReference && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <Shield className="w-4 h-4 mr-1" />
                Legal Reference:
              </h4>
              <p className="text-gray-800 font-mono text-sm bg-gray-100 p-2 rounded">
                {annotation.legalReference}
              </p>
            </div>
          )}

          {/* Suggested Replacement */}
          {annotation.suggestedReplacement && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <Lightbulb className="w-4 h-4 mr-1" />
                Suggested Replacement:
              </h4>
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-green-800">
                  {annotation.suggestedReplacement}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
          
          {annotation.suggestedReplacement && (
            <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
              Apply Suggestion
            </button>
          )}
        </div>
      </div>
    </div>
  )
} 