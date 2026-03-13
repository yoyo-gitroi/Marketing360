'use client';

import React from 'react';

export interface BrandFilterFlag {
  dimension: string;
  score: number;
  note: string;
}

export interface BrandFilterResult {
  idea_title: string;
  overall_fit: number;
  flags: BrandFilterFlag[];
  recommendation: string;
}

interface BrandFilterResultsProps {
  results: BrandFilterResult[];
}

function getScoreColor(score: number): { bar: string; text: string; bg: string } {
  if (score >= 0.8) return { bar: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' };
  if (score >= 0.6) return { bar: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50' };
  return { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' };
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const colors = getScoreColor(score);
  const pct = Math.round(score * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-600 capitalize">{label}</span>
        <span className={`font-semibold ${colors.text}`}>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BrandFilterResults({ results }: BrandFilterResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No brand filter results yet. Select ideas and run the brand filter.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-900">Brand Filter Results</h3>

      {results.map((result) => {
        const overallColor = getScoreColor(result.overall_fit);
        const overallPct = Math.round(result.overall_fit * 100);

        return (
          <div
            key={result.idea_title}
            className="rounded-xl border border-gray-200 bg-white overflow-hidden"
          >
            {/* Header with overall score */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h4 className="font-semibold text-gray-900">{result.idea_title}</h4>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Overall Fit</span>
                <span
                  className={`
                    inline-flex items-center justify-center w-12 h-8 rounded-lg font-bold text-sm
                    ${overallColor.bg} ${overallColor.text}
                  `}
                >
                  {overallPct}%
                </span>
              </div>
            </div>

            {/* Dimension scores */}
            <div className="p-4 space-y-3">
              {result.flags.map((flag) => (
                <div key={flag.dimension}>
                  <ScoreBar score={flag.score} label={flag.dimension} />
                  {flag.note && (
                    <p className={`text-xs mt-1 pl-1 ${getScoreColor(flag.score).text}`}>
                      {flag.note}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Recommendation */}
            <div className="px-4 pb-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-1">
                  Recommendation
                </span>
                <p className="text-sm text-gray-700">{result.recommendation}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
