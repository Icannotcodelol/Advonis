'use client'

import React from 'react';

interface AnnotationOverlayProps {
  children: React.ReactNode;
  color?: string; // fallback for custom highlight color
  loading?: boolean;
  error?: string;
}

export default function AnnotationOverlay({
  children,
  color = 'rgba(125, 211, 252, 0.35)', // soft blue accent
  loading = false,
  error,
}: AnnotationOverlayProps) {
  if (loading) {
    return <span className="skeleton rounded-md px-2 py-1" aria-busy="true" />;
  }
  if (error) {
    return <span className="bg-urgency/20 text-urgency rounded-md px-2 py-1">{error}</span>;
  }
  return (
    <mark
      style={{
        background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.18))`,
        boxShadow: '0 2px 8px rgba(125, 211, 252, 0.18)',
        borderRadius: '8px',
        padding: '0.1em 0.3em',
        transition: 'box-shadow 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
      }}
      className="relative"
    >
      {children}
    </mark>
  );
} 