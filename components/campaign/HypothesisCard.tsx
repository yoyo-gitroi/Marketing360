'use client';

import React from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

export interface Hypothesis {
  title: string;
  insight: string;
  emotional_territory: string;
  tg_reframe: string;
  the_flip: string;
  execution_direction: string;
}

export type FeedbackValue = 'thumbs_up' | 'thumbs_down' | null;

interface HypothesisCardProps {
  hypothesis: Hypothesis;
  isSelected: boolean;
  onSelect: () => void;
  feedback?: FeedbackValue;
  onFeedback?: (feedback: 'thumbs_up' | 'thumbs_down') => void;
}

export default function HypothesisCard({
  hypothesis,
  isSelected,
  onSelect,
  feedback,
  onFeedback,
}: HypothesisCardProps) {
  return (
    <div
      className={`
        w-full text-left rounded-xl border-2 p-5 transition-all duration-200
        ${
          isSelected
            ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-100'
            : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
        }
      `}
    >
      {/* Clickable selection area */}
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left"
      >
        {/* Selection badge */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900 pr-4">{hypothesis.title}</h3>
          <span
            className={`
              flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
              ${isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'}
            `}
          >
            {isSelected && (
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-purple-600 mb-1">
              Insight
            </span>
            <p className="text-sm text-gray-700 leading-relaxed">{hypothesis.insight}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-purple-50 rounded-lg p-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 block mb-1">
                Emotional Territory
              </span>
              <p className="text-sm text-gray-800">{hypothesis.emotional_territory}</p>
            </div>

            <div className="bg-indigo-50 rounded-lg p-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block mb-1">
                TG Reframe
              </span>
              <p className="text-sm text-gray-800">{hypothesis.tg_reframe}</p>
            </div>
          </div>

          <div className="bg-amber-50 rounded-lg p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 block mb-1">
              The Flip
            </span>
            <p className="text-sm text-gray-800 italic">{hypothesis.the_flip}</p>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-1">
              Execution Direction
            </span>
            <p className="text-sm text-gray-600">{hypothesis.execution_direction}</p>
          </div>
        </div>
      </button>

      {/* Feedback buttons */}
      {onFeedback && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400 mr-1">Rate this hypothesis:</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFeedback('thumbs_up');
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              feedback === 'thumbs_up'
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-green-50 hover:text-green-600'
            }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${feedback === 'thumbs_up' ? 'fill-green-600' : ''}`} />
            Useful
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFeedback('thumbs_down');
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              feedback === 'thumbs_down'
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-red-50 hover:text-red-600'
            }`}
          >
            <ThumbsDown className={`w-3.5 h-3.5 ${feedback === 'thumbs_down' ? 'fill-red-600' : ''}`} />
            Not useful
          </button>
        </div>
      )}
    </div>
  );
}
