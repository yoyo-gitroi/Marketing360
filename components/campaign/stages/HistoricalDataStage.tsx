'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoSave } from '@/lib/utils/auto-save';
import { Plus, Trash2 } from 'lucide-react';
import type { StageProps } from './CampaignBriefStage';

interface PastCampaign {
  campaign_name: string;
  what_worked: string;
  what_didnt: string;
  metrics: string;
}

const EMPTY_CAMPAIGN: PastCampaign = {
  campaign_name: '',
  what_worked: '',
  what_didnt: '',
  metrics: '',
};

export default function HistoricalDataStage({ stageData, onSave }: StageProps) {
  const ui = stageData.user_input as Record<string, unknown> | undefined;

  const [pastCampaigns, setPastCampaigns] = useState<PastCampaign[]>(
    (ui?.past_campaigns as PastCampaign[]) ?? [{ ...EMPTY_CAMPAIGN }]
  );
  const [influencerLandscapeNotes, setInfluencerLandscapeNotes] = useState<string>(
    (ui?.influencer_landscape_notes as string) ?? ''
  );
  const [benchmarkData, setBenchmarkData] = useState<string>(
    (ui?.benchmark_data as string) ?? ''
  );

  // Re-populate local state when stageData.user_input changes (e.g. after AI generation)
  useEffect(() => {
    const updated = stageData.user_input as Record<string, unknown> | undefined;
    if (!updated || typeof updated !== 'object' || Object.keys(updated).length === 0) return;
    setPastCampaigns((updated.past_campaigns as PastCampaign[]) ?? [{ ...EMPTY_CAMPAIGN }]);
    setInfluencerLandscapeNotes((updated.influencer_landscape_notes as string) ?? '');
    setBenchmarkData((updated.benchmark_data as string) ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stageData.user_input)]);

  const formData = useMemo(
    () => ({
      past_campaigns: pastCampaigns,
      influencer_landscape_notes: influencerLandscapeNotes,
      benchmark_data: benchmarkData,
    }),
    [pastCampaigns, influencerLandscapeNotes, benchmarkData]
  );

  const saveFn = useCallback(
    async (data: Record<string, unknown>) => { await onSave({ user_input: data }); },
    [onSave]
  );

  const { status } = useAutoSave({ saveFn, data: formData });

  const addCampaign = () => setPastCampaigns([...pastCampaigns, { ...EMPTY_CAMPAIGN }]);
  const removeCampaign = (idx: number) => setPastCampaigns(pastCampaigns.filter((_, i) => i !== idx));
  const updateCampaign = (idx: number, field: keyof PastCampaign, value: string) => {
    const updated = [...pastCampaigns];
    updated[idx] = { ...updated[idx], [field]: value };
    setPastCampaigns(updated);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Historical Data</h2>
        <SaveIndicator status={status} />
      </div>

      {/* Past Campaigns */}
      <fieldset className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-700">Past Campaign Results</label>
          <button type="button" onClick={addCampaign} className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800">
            <Plus className="w-3.5 h-3.5" /> Add Campaign
          </button>
        </div>

        {pastCampaigns.map((campaign, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Campaign {idx + 1}</span>
              {pastCampaigns.length > 1 && (
                <button type="button" onClick={() => removeCampaign(idx)} className="p-1 text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Campaign name"
              value={campaign.campaign_name}
              onChange={(e) => updateCampaign(idx, 'campaign_name', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <textarea
                rows={2}
                placeholder="What worked"
                value={campaign.what_worked}
                onChange={(e) => updateCampaign(idx, 'what_worked', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <textarea
                rows={2}
                placeholder="What didn't work"
                value={campaign.what_didnt}
                onChange={(e) => updateCampaign(idx, 'what_didnt', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <textarea
              rows={2}
              placeholder="Key metrics and results"
              value={campaign.metrics}
              onChange={(e) => updateCampaign(idx, 'metrics', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
        ))}
      </fieldset>

      <fieldset className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Influencer Landscape Notes</label>
        <textarea
          rows={4}
          value={influencerLandscapeNotes}
          onChange={(e) => setInfluencerLandscapeNotes(e.target.value)}
          placeholder="Key influencers in the space, past collaborations, rates, engagement patterns..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        />
      </fieldset>

      <fieldset className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Benchmark Data</label>
        <textarea
          rows={4}
          value={benchmarkData}
          onChange={(e) => setBenchmarkData(e.target.value)}
          placeholder="Industry benchmarks, CPM rates, engagement rates, conversion benchmarks..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        />
      </fieldset>
    </div>
  );
}

function SaveIndicator({ status }: { status: string }) {
  if (status === 'idle') return null;
  const config: Record<string, { dot: string; text: string; label: string }> = {
    saving: { dot: 'bg-yellow-500 animate-pulse', text: 'text-yellow-600', label: 'Saving...' },
    saved: { dot: 'bg-green-500', text: 'text-green-600', label: 'Saved' },
    error: { dot: 'bg-red-500', text: 'text-red-600', label: 'Save failed' },
  };
  const c = config[status] ?? config.saving;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.text}`}>
      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
