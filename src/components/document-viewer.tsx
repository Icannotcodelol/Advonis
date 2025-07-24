'use client'

import { useState, useRef } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
import DOMPurify from 'dompurify'
import { AnnotationOverlay } from './annotation-overlay'
import type { PDFSection } from '../lib/pdf-parser';

interface MinimalContract {
  name: string;
  content: string;
  pages: string[];
  annotations?: any[];
  sections?: import('../lib/pdf-parser').PDFSection[];
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

  const mapAnnotationToText = (annotation: any, text: string) => {
    const sourceType = annotation.sourceType || 'specific_text'; // Default for backward compatibility
    
    switch (sourceType) {
      case 'specific_text':
        // Current exact matching logic for direct text violations
        return mapSpecificTextAnnotation(annotation, text);
        
      case 'structural_inference':
        // Map to contributing clauses for structural legal conclusions
        return mapStructuralInferenceAnnotation(annotation, text);
        
      case 'missing_clause':
        // Don't highlight, show in sidebar only
        return [];
        
      default:
        return mapSpecificTextAnnotation(annotation, text);
    }
  };

  const mapSpecificTextAnnotation = (annotation: any, text: string) => {
    // Find specific keywords in the actual text (avoid generic terms)
    const keywords = [
      annotation.text,
      annotation.comment?.split(':')[0]?.trim(),
    ].filter(Boolean).filter(k => k.length > 3);
    
    for (const keyword of keywords) {
      const index = text.toLowerCase().indexOf(keyword.toLowerCase());
      if (index >= 0) {
        return [{
          ...annotation,
          startOffset: index,
          endOffset: index + keyword.length,
          highlightStyle: 'direct_violation'
        }];
      }
    }
    
    return []; // No match found
  };

  const mapStructuralInferenceAnnotation = (annotation: any, text: string) => {
    const highlights: any[] = [];
    
    // Try to map contributingFactors to specific text locations
    if (annotation.contributingFactors && Array.isArray(annotation.contributingFactors)) {
      annotation.contributingFactors.forEach((factor: any) => {
        const factorText = factor.factorText;
        if (factorText && factorText.length > 3) {
          const index = text.toLowerCase().indexOf(factorText.toLowerCase());
          if (index >= 0) {
            highlights.push({
              id: `${annotation.id}_factor_${factor.clauseReference}`,
              ...annotation,
              startOffset: index,
              endOffset: index + factorText.length,
              highlightStyle: 'contributing_factor',
              comment: `${factor.clauseReference}: ${factor.explanation}`,
              severity: factor.severity
            });
          }
        }
      });
    }
    
    // Fallback: try to find textEvidence or recommendedHighlight
    if (highlights.length === 0) {
      const searchTexts = [
        annotation.recommendedHighlight,
        ...(annotation.textEvidence || [])
      ].filter(Boolean);
      
      for (const searchText of searchTexts) {
        // Remove section references (§1, §2, etc.) and find the actual content
        const cleanText = searchText.replace(/§\d+\s*/, '').trim();
        if (cleanText.length > 3) {
          const index = text.toLowerCase().indexOf(cleanText.toLowerCase());
          if (index >= 0) {
            highlights.push({
              ...annotation,
              startOffset: index,
              endOffset: index + cleanText.length,
              highlightStyle: 'related_section'
            });
            break; // Only highlight one instance for structural inferences
          }
        }
      }
    }
    
    return highlights;
  };

  const renderTextContent = () => {
    const text = contract.content
    const annotations = contract.annotations || []
    
    // Map all annotations to text highlights using the new smart mapping
    const allHighlights: any[] = [];
    annotations.forEach(annotation => {
      const highlights = mapAnnotationToText(annotation, text);
      allHighlights.push(...highlights);
    });
    
    // Sort by position and remove overlaps
    const sortedHighlights = allHighlights
      .filter(h => h.startOffset >= 0)
      .sort((a, b) => a.startOffset - b.startOffset);
    
    // Remove overlapping highlights (keep higher severity)
    const deduplicatedHighlights = [];
    const usedRanges = new Map();
    
    for (const highlight of sortedHighlights) {
      const rangeKey = `${highlight.startOffset}-${highlight.endOffset}`;
      const existing = usedRanges.get(rangeKey);
      
      if (!existing || getSeverityRank(highlight.severity) > getSeverityRank(existing.severity)) {
        if (existing) {
          // Remove the existing lower-severity highlight
          const index = deduplicatedHighlights.findIndex(h => h.id === existing.id);
          if (index >= 0) deduplicatedHighlights.splice(index, 1);
        }
        deduplicatedHighlights.push(highlight);
        usedRanges.set(rangeKey, highlight);
      }
    }
    
    if (deduplicatedHighlights.length === 0) {
      return <span>{text}</span>
    }
    
    const segments = []
    let lastOffset = 0
    
    deduplicatedHighlights.forEach((highlight, index) => {
      // Add text before highlight
      if (highlight.startOffset > lastOffset) {
        segments.push(
          <span key={`text-${index}`}>
            {text.slice(lastOffset, highlight.startOffset)}
          </span>
        )
      }
      
      // Add highlighted text with appropriate styling
      segments.push(
        <span
          key={`highlight-${highlight.id}`}
          className={`cursor-pointer ${getHighlightClassByStyle(highlight.highlightStyle)} ${getHighlightClass(highlight)}`}
          onClick={() => handleAnnotationClick(highlight)}
          title={highlight.comment}
        >
          {text.slice(highlight.startOffset, highlight.endOffset)}
        </span>
      )
      
      lastOffset = highlight.endOffset
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

  // Helper to render text with highlights for a section
  const renderSectionWithHighlights = (section: PDFSection, sectionIdx: number) => {
    const annotations = contract.annotations || [];
    
    // First try direct offset-based matching for annotations that overlap with this section
    let highlights = annotations
      .filter((ann: any) =>
        ann.startOffset !== undefined && ann.endOffset !== undefined &&
        ann.startOffset < section.endOffset && ann.endOffset > section.startOffset
      )
      .map((ann: any) => ({
        ...ann,
        // Clamp highlight to section
        start: Math.max(0, ann.startOffset - section.startOffset),
        end: Math.min(section.text.length, ann.endOffset - section.startOffset)
      }))
      .filter(h => h.start < h.end);

    // If no direct matches, try the existing text-based mapping logic
    if (highlights.length === 0) {
      const textBasedHighlights: any[] = [];
      annotations.forEach(annotation => {
        const mappedHighlights = mapAnnotationToText(annotation, section.text);
        mappedHighlights.forEach(mapped => {
          textBasedHighlights.push({
            ...mapped,
            start: mapped.startOffset,
            end: mapped.endOffset
          });
        });
      });
      highlights = textBasedHighlights;
    }

    if (highlights.length === 0) return section.text;

    // Sort highlights by start
    highlights.sort((a, b) => a.start - b.start);
    
    // Remove overlaps: keep highest severity
    const deduped: typeof highlights = [];
    let lastEnd = 0;
    for (const h of highlights) {
      if (deduped.length === 0 || h.start >= lastEnd) {
        deduped.push(h);
        lastEnd = h.end;
      }
    }

    const segments = [];
    let cursor = 0;
    for (let i = 0; i < deduped.length; i++) {
      const h = deduped[i];
      if (h.start > cursor) {
        segments.push(<span key={`plain-${i}`}>{section.text.slice(cursor, h.start)}</span>);
      }
      segments.push(
        <span
          key={`highlight-${h.id}`}
          className={`cursor-pointer ${getHighlightClassByStyle(h.highlightStyle)} ${getHighlightClass(h)}`}
          onClick={() => handleAnnotationClick(h)}
          title={h.comment}
        >
          {section.text.slice(h.start, h.end)}
        </span>
      );
      cursor = h.end;
    }
    if (cursor < section.text.length) {
      segments.push(<span key="plain-end">{section.text.slice(cursor)}</span>);
    }
    return segments;
  };

  const renderStructuredContent = () => {
    const { sections } = contract;
    if (!sections || sections.length === 0) return renderTextContent();
    const elements = [];
    let i = 0;
    while (i < sections.length) {
      const section = sections[i];
      if (section.type === 'heading') {
        const content = renderSectionWithHighlights(section, i);
        if (section.level === 1) elements.push(<h1 key={i} className="mt-6 mb-2 text-2xl font-bold">{content}</h1>);
        else if (section.level === 2) elements.push(<h2 key={i} className="mt-4 mb-2 text-xl font-semibold">{content}</h2>);
        else elements.push(<h3 key={i} className="mt-3 mb-1 text-lg font-semibold">{content}</h3>);
        i++;
      } else if (section.type === 'list-item') {
        // Group consecutive list-items into a <ul>
        const items = [];
        while (i < sections.length && sections[i].type === 'list-item') {
          const content = renderSectionWithHighlights(sections[i], i);
          items.push(<li key={i}>{content}</li>);
          i++;
        }
        elements.push(<ul key={`ul-${i}`} className="list-disc ml-6 mb-2">{items}</ul>);
      } else if (section.type === 'paragraph') {
        const content = renderSectionWithHighlights(section, i);
        elements.push(<p key={i} className="mb-2">{content}</p>);
        i++;
      } else {
        i++;
      }
    }
    return <article className="prose max-w-none">{elements}</article>;
  };

  const getSeverityRank = (severity: string): number => {
    const ranks = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
    return ranks[severity as keyof typeof ranks] || 0;
  };

  const getHighlightClassByStyle = (style: string): string => {
    switch (style) {
      case 'direct_violation':
        return 'border-b-2 border-red-500'; // Red solid underline
      case 'contributing_factor':
        return 'border border-dashed border-yellow-500 bg-yellow-50'; // Yellow dotted border
      case 'related_section':
        return 'border border-dashed border-blue-500 bg-blue-50'; // Blue dashed outline
      case 'missing_reference':
        return 'bg-gray-200'; // Gray background
      default:
        return '';
    }
  };

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
        {renderStructuredContent()}
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