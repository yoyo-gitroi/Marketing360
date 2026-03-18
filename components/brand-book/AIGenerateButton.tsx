'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, X, Globe } from 'lucide-react';

interface AIGenerateButtonProps {
  brandBookId: string;
  sectionKey: string;
  onGenerated: (result?: unknown) => void;
  disabled?: boolean;
  defaultDomain?: string;
}

export default function AIGenerateButton({
  brandBookId,
  sectionKey,
  onGenerated,
  disabled = false,
  defaultDomain = '',
}: AIGenerateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [domain, setDomain] = useState(defaultDomain);
  const [progress, setProgress] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showModal && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showModal]);

  const handleGenerateAll = async () => {
    if (!domain.trim()) return;

    setLoading(true);
    setError(null);
    setProgress('Scraping website and generating content...');

    try {
      const res = await fetch('/api/ai/scrape-and-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandBookId, domain: domain.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'AI generation failed');
      }

      const result = await res.json();
      setShowModal(false);
      setDomain('');
      onGenerated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const handleGenerateSection = async () => {
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
        onClick={() => setShowModal(true)}
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

      {error && !showModal && (
        <div className="absolute top-full mt-2 right-0 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 whitespace-nowrap z-10">
          {error}
        </div>
      )}

      {/* Domain Input Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Generate with AI
                </h3>
              </div>
              <button
                onClick={() => { setShowModal(false); setError(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                Enter the brand&apos;s website URL. We&apos;ll scrape the website and use AI to populate all
                brand book sections automatically.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && domain.trim() && !loading) {
                        handleGenerateAll();
                      }
                    }}
                    placeholder="e.g., example.com or https://example.com"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    disabled={loading}
                  />
                </div>
              </div>

              {loading && progress && (
                <div className="flex items-center gap-2 text-sm text-purple-700 bg-purple-50 rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                  {progress}
                </div>
              )}

              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={handleGenerateSection}
                disabled={loading}
                className="text-sm text-gray-600 hover:text-gray-800 underline disabled:opacity-50"
              >
                Generate current section only
              </button>
              <button
                onClick={handleGenerateAll}
                disabled={!domain.trim() || loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate All Sections
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
