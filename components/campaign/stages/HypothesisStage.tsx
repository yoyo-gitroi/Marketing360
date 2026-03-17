'use client';

import React, { useCallback, useState } from 'react';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import HypothesisCard from '@/components/campaign/HypothesisCard';
import type { Hypothesis } from '@/components/campaign/HypothesisCard';
import type { StageProps } from './CampaignBriefStage';

// Research stages are 3-7 (market_research, customer_intelligence, platform_channel, historical_data, resources_execution)
const RESEARCH_STAGE_KEYS = [
  'market_research',
  'customer_intelligence',
  'platform_channel',
  'historical_data',
  'resources_execution',
];

export default function HypothesisStage({ stageData, onSave, campaignId }: StageProps) {
  const aiGenerated = stageData.ai_generated as Record<string, unknown> | undefined;
  const finalContent = stageData.final_content as Record<string, unknown> | undefined;
  const allStages = (stageData as Record<string, unknown>).all_stages as Record<string, unknown>[] | undefined;

  const [hypotheses, setHypotheses] = useState<Hypothesis[]>(
    (aiGenerated?.hypotheses as Hypothesis[]) ?? []
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    (finalContent?.selected_index as number) ?? null
  );
  const [customHypothesis, setCustomHypothesis] = useState<string>(
    (finalContent?.custom_hypothesis as string) ?? ''
  );
  const [useCustom, setUseCustom] = useState<boolean>(
    (finalContent?.use_custom as boolean) ?? false
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Count how many research stages have data
  const filledResearchStages = allStages
    ? allStages.filter((s) => {
        const stageKey = (s as Record<string, unknown>).stage_key as string;
        const userInput = (s as Record<string, unknown>).user_input as Record<string, unknown> | undefined;
        return (
          RESEARCH_STAGE_KEYS.includes(stageKey) &&
          userInput &&
          Object.values(userInput).some((v) => v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))
        );
      }).length
    : 0;

  const showWarning = filledResearchStages < 3;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/generate-hypothesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as Record<string, string>).error ?? 'Failed to generate hypotheses');
      }
      const data = await res.json();
      const generated = (data as Record<string, unknown>).hypotheses as Hypothesis[];
      setHypotheses(generated);
      setSelectedIndex(null);
      setUseCustom(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate hypotheses');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelect = useCallback(
    async (idx: number) => {
      setSelectedIndex(idx);
      setUseCustom(false);
      await onSave({
        final_content: {
          selected_index: idx,
          selected_hypothesis: hypotheses[idx],
          use_custom: false,
        },
      });
    },
    [hypotheses, onSave]
  );

  const handleSaveCustom = useCallback(async () => {
    setSelectedIndex(null);
    setUseCustom(true);
    await onSave({
      final_content: {
        custom_hypothesis: customHypothesis,
        use_custom: true,
        selected_index: null,
      },
    });
  }, [customHypothesis, onSave]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Campaign Hypothesis</h2>
        <p className="text-sm text-gray-500 mt-1">
          The creative core. AI synthesizes all your research into non-obvious campaign hypotheses.
        </p>
      </div>

      {/* Warning */}
      {showWarning && (
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Limited Research Data</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Only {filledResearchStages} of 5 research stages are filled. Hypothesis quality depends on research depth.
              Consider completing more research stages first.
            </p>
          </div>
        </div>
      )}

      {/* Generate button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {isGenerating ? 'Generating Hypotheses...' : 'Generate Hypotheses'}
      </button>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Hypothesis cards */}
      {hypotheses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-800">
            Select a Working Hypothesis
          </h3>
          <div className="grid gap-4">
            {hypotheses.map((h, idx) => (
              <HypothesisCard
                key={idx}
                hypothesis={h}
                isSelected={!useCustom && selectedIndex === idx}
                onSelect={() => handleSelect(idx)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom hypothesis */}
      <div className="border-t border-gray-200 pt-6 space-y-3">
        <h3 className="text-base font-semibold text-gray-800">Or Write Your Own</h3>
        <textarea
          rows={5}
          value={customHypothesis}
          onChange={(e) => setCustomHypothesis(e.target.value)}
          placeholder="Write your own campaign hypothesis..."
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 ${
            useCustom
              ? 'border-purple-500 focus:border-purple-500 focus:ring-purple-500 bg-purple-50'
              : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500'
          }`}
        />
        <button
          type="button"
          onClick={handleSaveCustom}
          disabled={!customHypothesis.trim()}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Use Custom Hypothesis
        </button>
      </div>
    </div>
  );
}
