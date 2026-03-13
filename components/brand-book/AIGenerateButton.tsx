'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface AIGenerateButtonProps {
  brandBookId: string;
  sectionKey: string;
  onGenerated: (result?: unknown) => void;
  disabled?: boolean;
}

export default function AIGenerateButton({
  brandBookId,
  sectionKey,
  onGenerated,
  disabled = false,
}: AIGenerateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/generate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandBookId, sectionKey }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'AI generation failed');
      }

      const result = await res.json();
      onGenerated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleGenerate}
        disabled={disabled || loading}
        className="inline-flex items-center gap-2 px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {loading ? 'Generating...' : 'Generate with AI'}
      </button>

      {error && (
        <div className="absolute top-full mt-2 right-0 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 whitespace-nowrap z-10">
          {error}
        </div>
      )}
    </div>
  );
}
