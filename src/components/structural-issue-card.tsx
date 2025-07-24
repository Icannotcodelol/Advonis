'use client'

import { AlertTriangle, Lightbulb, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { Annotation, ContributingFactor } from '@/types/contract'

interface StructuralIssueCardProps {
  annotation: Annotation
  onHighlightFactor?: (factor: ContributingFactor) => void
}

export function StructuralIssueCard({ annotation, onHighlightFactor }: StructuralIssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'low':
      case 'info':
        return <Lightbulb className="w-4 h-4 text-blue-500" />
      default:
        return <Shield className="w-4 h-4 text-gray-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'border-red-300 bg-red-50'
      case 'medium':
        return 'border-yellow-300 bg-yellow-50'
      case 'low':
      case 'info':
        return 'border-blue-300 bg-blue-50'
      default:
        return 'border-gray-300 bg-gray-50'
    }
  }

  const getFactorSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const contributingFactors = annotation.contributingFactors || []
  const hasFactors = contributingFactors.length > 0

  return (
    <div className={`border rounded-lg p-4 ${getSeverityColor(annotation.severity)}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1">
          {getSeverityIcon(annotation.severity)}
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-1">
              {annotation.comment}
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {annotation.explanation}
            </p>
            {annotation.legalReference && (
              <div className="mt-2 text-xs text-gray-600 bg-white bg-opacity-50 px-2 py-1 rounded">
                <Shield className="w-3 h-3 inline mr-1" />
                {annotation.legalReference}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(annotation.severity).replace('bg-', 'text-').replace('-50', '-800').replace('border-', 'border-').replace('-300', '-200')}`}>
            {annotation.severity.charAt(0).toUpperCase() + annotation.severity.slice(1)}
          </div>
          {hasFactors && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Contributing Factors */}
      {hasFactors && isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Contributing Factors ({contributingFactors.length})
          </h5>
          
          <div className="space-y-3">
            {contributingFactors.map((factor, index) => (
              <div
                key={index}
                className="bg-white bg-opacity-70 border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-opacity-90 transition-all"
                onClick={() => onHighlightFactor?.(factor)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-800">
                      {factor.clauseReference}
                    </span>
                    <div className={`px-2 py-1 rounded text-xs font-medium border ${getFactorSeverityBadge(factor.severity)}`}>
                      {factor.severity}
                    </div>
                  </div>
                </div>
                
                <div className="mb-2">
                  <p className="text-sm text-gray-800 font-mono bg-gray-100 px-2 py-1 rounded">
                    "{factor.factorText}"
                  </p>
                </div>
                
                <p className="text-xs text-gray-600">
                  {factor.explanation}
                </p>
              </div>
            ))}
          </div>
          
          {/* Risk Assessment Summary */}
          <div className="mt-4 p-3 bg-white bg-opacity-50 rounded-lg">
            <h6 className="text-sm font-semibold text-gray-700 mb-2">Risk Assessment</h6>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-red-600">
                  {contributingFactors.filter(f => f.severity === 'critical' || f.severity === 'high').length}
                </div>
                <div className="text-xs text-red-700">High Risk</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-600">
                  {contributingFactors.filter(f => f.severity === 'medium').length}
                </div>
                <div className="text-xs text-yellow-700">Medium Risk</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {contributingFactors.filter(f => f.severity === 'low').length}
                </div>
                <div className="text-xs text-blue-700">Low Risk</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Suggestions */}
      {annotation.suggestedReplacement && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
            <Lightbulb className="w-4 h-4 mr-2" />
            Recommended Action
          </h5>
          <div className="bg-white bg-opacity-70 border border-gray-200 rounded-lg p-3">
            <p className="text-sm text-gray-800">
              {annotation.suggestedReplacement}
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 