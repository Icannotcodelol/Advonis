'use client'

import React, { useState } from 'react';
import AnnotationOverlay from './annotation-overlay';

interface DocumentViewerProps {
  contract: {
    content: string;
    annotations?: Array<{
      id: string;
      startOffset: number;
      endOffset: number;
      severity?: string;
      comment?: string;
      explanation?: string;
      [key: string]: any;
    }>;
  };
  loading?: boolean;
  error?: string;
}

export default function DocumentViewer({ contract, loading = false, error }: DocumentViewerProps) {
  const [activeAnnotation, setActiveAnnotation] = useState<any | null>(null);
  if (loading) {
    return <div className="flex w-full h-[60vh] gap-8"><div className="glass-card flex-1 h-full skeleton" /></div>;
  }
  if (error) {
    return <div className="glass-card p-8 text-urgency font-semibold">{error}</div>;
  }
  const { content, annotations = [] } = contract || {};
  if (!content) return null;

  // Sort and deduplicate annotations
  const sorted = [...annotations]
    .filter(a => typeof a.startOffset === 'number' && typeof a.endOffset === 'number' && a.startOffset < a.endOffset)
    .sort((a, b) => a.startOffset - b.startOffset);

  // Render text with highlights
  const segments = [];
  let last = 0;
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    if (a.startOffset > last) {
      segments.push(<span key={`text-${last}`}>{content.slice(last, a.startOffset)}</span>);
    }
    segments.push(
      <span key={a.id} className="inline" onClick={() => setActiveAnnotation(a)} style={{ cursor: 'pointer' }}>
        <AnnotationOverlay color={a.severity === 'critical' || a.severity === 'high' ? 'rgba(239,68,68,0.25)' : a.severity === 'medium' ? 'rgba(251,191,36,0.25)' : 'rgba(125,211,252,0.35)'}>
          {content.slice(a.startOffset, a.endOffset)}
        </AnnotationOverlay>
      </span>
    );
    last = a.endOffset;
  }
  if (last < content.length) {
    segments.push(<span key={`text-end`}>{content.slice(last)}</span>);
  }

  return (
    <section className="glass-card flex-1 h-full rounded-glass p-8 overflow-auto transition-shadow transition-transform duration-300 ease-glass hover:shadow-glassHover hover:-translate-y-1 hover:ring-2 hover:ring-accent/30 focus:outline-none focus:ring-2 focus:ring-accent/40" role="main" aria-label="Document Content">
      <div className="prose max-w-none text-sm text-gray-800 whitespace-pre-wrap font-mono">
        {segments}
      </div>
      {activeAnnotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setActiveAnnotation(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={() => setActiveAnnotation(null)}>&times;</button>
            <h3 className="font-bold text-lg mb-2">{activeAnnotation.comment || 'Annotation'}</h3>
            <p className="mb-2 text-gray-700">{activeAnnotation.explanation}</p>
            {activeAnnotation.legalReference && <div className="text-xs text-gray-500 mb-2">{activeAnnotation.legalReference}</div>}
            <div className="text-xs text-gray-400">Severity: {activeAnnotation.severity}</div>
          </div>
        </div>
      )}
    </section>
  );
} 