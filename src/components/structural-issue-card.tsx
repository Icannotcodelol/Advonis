'use client'

import React from 'react';

interface StructuralIssueCardProps {
  title: string;
  description: string;
  severity?: 'info' | 'warning' | 'error';
  loading?: boolean;
  error?: string;
}

const severityColors = {
  info: 'border-accent',
  warning: 'border-urgency',
  error: 'border-urgency',
};

export default function StructuralIssueCard({
  title,
  description,
  severity = 'info',
  loading = false,
  error,
}: StructuralIssueCardProps) {
  if (loading) {
    return <div className="glass-card border-l-4 border-accent p-6 mb-4 skeleton h-32 w-full" aria-busy="true" />;
  }
  if (error) {
    return (
      <div className="glass-card border-l-4 border-urgency p-6 mb-4">
        <p className="text-urgency font-semibold">Error: {error}</p>
      </div>
    );
  }
  return (
    <section
      className={`glass-card border-l-4 ${severityColors[severity]} p-6 mb-4 flex flex-col gap-2 transition-shadow transition-transform duration-300 ease-glass hover:shadow-glassHover hover:-translate-y-1 hover:ring-2 hover:ring-accent/30 focus:outline-none focus:ring-2 focus:ring-accent/40`}
      tabIndex={0}
      aria-label={`Issue: ${title}`}
      role="region"
    >
      <h3 className="text-lg font-bold text-authority mb-1">{title}</h3>
      <p className="text-base text-authority/80">{description}</p>
    </section>
  );
} 