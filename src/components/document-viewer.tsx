'use client'

import { useState, useRef } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
import DOMPurify from 'dompurify'
import { AnnotationOverlay } from './annotation-overlay'

interface MinimalContract {
  name: string;
  content: string;
  pages: string[];
  annotations?: any[];
}

interface DocumentViewerProps {
  contract: MinimalContract
  isAnalyzing: boolean
}

export function DocumentViewer({ contract, isAnalyzing }: DocumentViewerProps) {
  const [scale, setScale] = useState(1.0)
  const [selectedAnnotation, setSelectedAnnotation] = useState<any | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0))
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5))
  const handleAnnotationClick = (annotation: any) => setSelectedAnnotation(annotation)

  const getHighlightClass = (annotation: any): string => {
    switch (annotation.severity) {
      case 'critical':
      case 'high':
        return 'highlight-risk'
      case 'medium':
        return 'highlight-warning'
      case 'low':
      case 'info':
        return 'highlight-suggestion'
      default:
        return 'highlight-suggestion'
    }
  }

  const renderTextContent = () => {
    const text = contract.content
    const annotations = contract.annotations || []
    
    // Update annotation positions based on actual text content
    const updatedAnnotations = annotations.map((annotation: any) => {
      if (annotation.type === 'missing_clause') {
        // Missing clauses can't be highlighted
        return { ...annotation, startOffset: -1, endOffset: -1 };
      }
      
      // Find specific keywords in the actual text (avoid generic terms)
      const keywords = [
        annotation.text,
        annotation.comment?.split(':')[0]?.trim(), // Get first part before colon
      ].filter(Boolean).filter(k => k.length > 3); // Only use meaningful keywords
      
      for (const keyword of keywords) {
        const index = text.toLowerCase().indexOf(keyword.toLowerCase());
        if (index >= 0) {
          return {
            ...annotation,
            startOffset: index,
            endOffset: index + keyword.length
          };
        }
      }
      
      // If no specific match found, don't highlight (better than generic highlighting)
      return { ...annotation, startOffset: -1, endOffset: -1 };
    });
    
    // Filter out annotations that couldn't be positioned and deduplicate overlapping positions
    const validAnnotations = updatedAnnotations
      .filter(a => a.startOffset >= 0)
      .sort((a, b) => a.startOffset - b.startOffset);
    
    // Remove overlapping annotations (keep first occurrence)
    const deduplicatedAnnotations = [];
    const usedRanges = new Set();
    
    for (const annotation of validAnnotations) {
      const rangeKey = `${annotation.startOffset}-${annotation.endOffset}`;
      if (!usedRanges.has(rangeKey)) {
        deduplicatedAnnotations.push(annotation);
        usedRanges.add(rangeKey);
      }
    }
    
    if (deduplicatedAnnotations.length === 0) {
      return <span>{text}</span>
    }
    
    const segments = []
    let lastOffset = 0
    
    deduplicatedAnnotations.forEach((annotation, index) => {
      // Add text before annotation
      if (annotation.startOffset > lastOffset) {
        segments.push(
          <span key={`text-${index}`}>
            {text.slice(lastOffset, annotation.startOffset)}
          </span>
        )
      }
      
      // Add highlighted annotation
      segments.push(
        <span
          key={`annotation-${annotation.id}`}
          className={`cursor-pointer ${getHighlightClass(annotation)}`}
          onClick={() => handleAnnotationClick(annotation)}
          title={annotation.comment}
        >
          {text.slice(annotation.startOffset, annotation.endOffset)}
        </span>
      )
      
      lastOffset = annotation.endOffset
    })
    
    // Add remaining text
    if (lastOffset < text.length) {
      segments.push(
        <span key="text-end">
          {text.slice(lastOffset)}
        </span>
      )
    }
    
    return <>{segments}</>
  }

  return (
    <div className="document-viewer h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-200 rounded"
            disabled={scale <= 0.5}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">{Math.round(scale * 100)}%</span>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-200 rounded"
            disabled={scale >= 3.0}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Document Content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-6 bg-white"
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {renderTextContent()}
        {/* Annotation Overlay */}
        {selectedAnnotation && (
          <AnnotationOverlay
            annotation={selectedAnnotation}
            onClose={() => setSelectedAnnotation(null)}
          />
        )}
      </div>
      {/* Analysis Status */}
      {isAnalyzing && (
        <div className="p-4 border-t bg-blue-50">
          <div className="flex items-center">
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
            <span className="text-blue-700">Analyzing contract...</span>
          </div>
        </div>
      )}
    </div>
  )
} 