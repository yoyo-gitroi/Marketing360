'use client';

import React, { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';

export interface Idea {
  title: string;
  format: string;
  hook: string;
  hero_content: string;
  surround: string;
  why_it_works: string;
}

export type FeedbackValue = 'thumbs_up' | 'thumbs_down' | null;

interface IdeaCardProps {
  idea: Idea;
  persona: string;
  isStarred: boolean;
  onToggleStar: () => void;
  feedback?: FeedbackValue;
  onFeedback?: (feedback: 'thumbs_up' | 'thumbs_down') => void;
}

const PERSONA_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  'Gen Z Creative': { bg: 'bg-pink-50', text: 'text-pink-700', badge: 'bg-pink-100' },
  'Brand Strategist': { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100' },
  'Cultural Commentator': { bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100' },
};

export default function IdeaCard({
  idea,
  persona,
  isStarred,
  onToggleStar,
  feedback,
  onFeedback,
}: IdeaCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const colors = PERSONA_COLORS[persona] ?? {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    badge: 'bg-gray-100',
  };

  return (
    <div className={`rounded-xl border border-gray-200 bg-white overflow-hidden transition-shadow hover:shadow-md`}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div className="flex-1 min-w-0">
          <span
            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge} ${colors.text} mb-2`}
          >
            {persona}
          </span>
          <h4 className="text-base font-bold text-gray-900 truncate">{idea.title}</h4>
          <p className="text-sm text-gray-500 mt-0.5">{idea.format}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Feedback buttons */}
          {onFeedback && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onFeedback('thumbs_up'); }}
                className={`p-1.5 rounded-lg transition-colors ${
                  feedback === 'thumbs_up'
                    ? 'bg-green-100 text-green-600'
                    : 'text-gray-300 hover:bg-green-50 hover:text-green-500'
                }`}
                aria-label="Thumbs up"
              >
                <ThumbsUp className={`w-4 h-4 ${feedback === 'thumbs_up' ? 'fill-green-500' : ''}`} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onFeedback('thumbs_down'); }}
                className={`p-1.5 rounded-lg transition-colors ${
                  feedback === 'thumbs_down'
                    ? 'bg-red-100 text-red-600'
                    : 'text-gray-300 hover:bg-red-50 hover:text-red-500'
                }`}
                aria-label="Thumbs down"
              >
                <ThumbsDown className={`w-4 h-4 ${feedback === 'thumbs_down' ? 'fill-red-500' : ''}`} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar();
            }}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={isStarred ? 'Unstar idea' : 'Star idea'}
          >
            <Star
              className={`w-5 h-5 transition-colors ${
                isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Hook - always visible */}
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-700">
          <span className="font-medium text-gray-900">Hook: </span>
          {idea.hook}
        </p>
      </div>

      {/* Expandable details */}
      {isExpanded && (
        <div className={`px-4 pb-4 space-y-3 border-t border-gray-100 pt-3 ${colors.bg}`}>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-1">
              Hero Content
            </span>
            <p className="text-sm text-gray-700">{idea.hero_content}</p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-1">
              Surround Campaign
            </span>
            <p className="text-sm text-gray-700">{idea.surround}</p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-1">
              Why It Works
            </span>
            <p className="text-sm text-gray-700 italic">{idea.why_it_works}</p>
          </div>
        </div>
      )}

      {/* Toggle expand */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-2 text-xs font-medium text-purple-600 hover:bg-purple-50 border-t border-gray-100 transition-colors"
      >
        {isExpanded ? 'Show Less' : 'Show More'}
      </button>
    </div>
  );
}
