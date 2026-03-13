'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Check, X } from 'lucide-react';

interface ReframingCard {
  title: string;
  rationale: string;
  what_changes: string;
}

interface USPReframerProps {
  brandBookId: string;
  onSelect: (reframing: ReframingCard) => void;
}

export default function USPReframer({ brandBookId, onSelect }: USPReframerProps) {
  const [loading, setLoading] = useState(false);
  const [reframings, setReframings] = useState<ReframingCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleReframe = async () => {
    setLoading(true);
    setError(null);
    setReframings([]);
    setSelectedIndex(null);

    try {
      const res = await fetch('/api/ai/reframe-usp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandBookId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Reframing failed');
      }

      const data = await res.json();
      setReframings(data.reframings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reframing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    onSelect(reframings[index]);
  };

  const handleDismiss = () => {
    setReframings([]);
    setSelectedIndex(null);
  };

  if (reframings.length === 0) {
    return (
      <div className="space-y-3">
        <button
          onClick={handleReframe}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? 'Reframing USP...' : 'Reframe USP with AI'}
        </button>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          USP Reframing Options
        </h3>
        <button
          onClick={handleDismiss}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
          Dismiss
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reframings.map((card, idx) => (
          <div
            key={idx}
            className={`
              relative p-5 rounded-xl border-2 cursor-pointer transition-all
              ${
                selectedIndex === idx
                  ? 'border-amber-500 bg-amber-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-amber-300 hover:shadow-sm'
              }
            `}
            onClick={() => handleSelect(idx)}
          >
            {selectedIndex === idx && (
              <div className="absolute top-3 right-3">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-500 text-white">
                  <Check className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-900 pr-8">{card.title}</h4>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Rationale
                </label>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {card.rationale}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  What Changes
                </label>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {card.what_changes}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleReframe}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate New Options
        </button>
      </div>
    </div>
  );
}
