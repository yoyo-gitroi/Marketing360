'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoSave } from '@/lib/utils/auto-save';
import { Plus, Trash2 } from 'lucide-react';
import type { StageProps } from './CampaignBriefStage';

interface Competitor {
  name: string;
  positioning: string;
  key_campaigns: string;
  what_worked: string;
  what_didnt: string;
  meta_ads_observations: string;
}

const EMPTY_COMPETITOR: Competitor = {
  name: '',
  positioning: '',
  key_campaigns: '',
  what_worked: '',
  what_didnt: '',
  meta_ads_observations: '',
};

export default function MarketResearchStage({ stageData, onSave }: StageProps) {
  const ui = stageData.user_input as Record<string, unknown> | undefined;

  const [industryTrends, setIndustryTrends] = useState<string>((ui?.industry_trends as string) ?? '');
  const [marketSizeNotes, setMarketSizeNotes] = useState<string>((ui?.market_size_notes as string) ?? '');
  const [consumerBehaviorShifts, setConsumerBehaviorShifts] = useState<string>((ui?.consumer_behavior_shifts as string) ?? '');
  const [competitors, setCompetitors] = useState<Competitor[]>(
    (ui?.competitors as Competitor[]) ?? [{ ...EMPTY_COMPETITOR }]
  );
  const [indiaCompetitionNotes, setIndiaCompetitionNotes] = useState<string>((ui?.india_competition_notes as string) ?? '');
  const [usGlobalCompetitionNotes, setUsGlobalCompetitionNotes] = useState<string>((ui?.us_global_competition_notes as string) ?? '');
  const [categoryRegulations, setCategoryRegulations] = useState<string>((ui?.category_regulations as string) ?? '');
  const [seasonalCulturalOpportunities, setSeasonalCulturalOpportunities] = useState<string>((ui?.seasonal_cultural_opportunities as string) ?? '');

  // Re-populate local state when stageData.user_input changes (e.g. after AI generation)
  useEffect(() => {
    const updated = stageData.user_input as Record<string, unknown> | undefined;
    if (!updated || typeof updated !== 'object' || Object.keys(updated).length === 0) return;
    setIndustryTrends((updated.industry_trends as string) ?? '');
    setMarketSizeNotes((updated.market_size_notes as string) ?? '');
    setConsumerBehaviorShifts((updated.consumer_behavior_shifts as string) ?? '');
    setCompetitors((updated.competitors as Competitor[]) ?? [{ ...EMPTY_COMPETITOR }]);
    setIndiaCompetitionNotes((updated.india_competition_notes as string) ?? '');
    setUsGlobalCompetitionNotes((updated.us_global_competition_notes as string) ?? '');
    setCategoryRegulations((updated.category_regulations as string) ?? '');
    setSeasonalCulturalOpportunities((updated.seasonal_cultural_opportunities as string) ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stageData.user_input)]);

  const formData = useMemo(
    () => ({
      industry_trends: industryTrends,
      market_size_notes: marketSizeNotes,
      consumer_behavior_shifts: consumerBehaviorShifts,
      competitors,
      india_competition_notes: indiaCompetitionNotes,
      us_global_competition_notes: usGlobalCompetitionNotes,
      category_regulations: categoryRegulations,
      seasonal_cultural_opportunities: seasonalCulturalOpportunities,
    }),
    [industryTrends, marketSizeNotes, consumerBehaviorShifts, competitors, indiaCompetitionNotes, usGlobalCompetitionNotes, categoryRegulations, seasonalCulturalOpportunities]
  );

  const saveFn = useCallback(
    async (data: Record<string, unknown>) => { await onSave({ user_input: data }); },
    [onSave]
  );

  const { status } = useAutoSave({ saveFn, data: formData });

  const addCompetitor = () => setCompetitors([...competitors, { ...EMPTY_COMPETITOR }]);
  const removeCompetitor = (idx: number) => setCompetitors(competitors.filter((_, i) => i !== idx));
  const updateCompetitor = (idx: number, field: keyof Competitor, value: string) => {
    const updated = [...competitors];
    updated[idx] = { ...updated[idx], [field]: value };
    setCompetitors(updated);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Market Research</h2>
        <SaveIndicator status={status} />
      </div>

      <TextArea label="Industry Trends" value={industryTrends} onChange={setIndustryTrends} placeholder="Key trends shaping the industry..." />
      <TextArea label="Market Size Notes" value={marketSizeNotes} onChange={setMarketSizeNotes} placeholder="Market size, growth rate, relevant segments..." />
      <TextArea label="Consumer Behavior Shifts" value={consumerBehaviorShifts} onChange={setConsumerBehaviorShifts} placeholder="How consumer behavior is changing in this category..." />

      {/* Competitors */}
      <fieldset className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-700">Competitors</label>
          <button type="button" onClick={addCompetitor} className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800">
            <Plus className="w-3.5 h-3.5" /> Add Competitor
          </button>
        </div>

        {competitors.map((comp, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Competitor {idx + 1}</span>
              {competitors.length > 1 && (
                <button type="button" onClick={() => removeCompetitor(idx)} className="p-1 text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Competitor name"
              value={comp.name}
              onChange={(e) => updateCompetitor(idx, 'name', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <textarea
              rows={2}
              placeholder="Positioning"
              value={comp.positioning}
              onChange={(e) => updateCompetitor(idx, 'positioning', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <textarea
              rows={2}
              placeholder="Key campaigns"
              value={comp.key_campaigns}
              onChange={(e) => updateCompetitor(idx, 'key_campaigns', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <textarea
                rows={2}
                placeholder="What worked"
                value={comp.what_worked}
                onChange={(e) => updateCompetitor(idx, 'what_worked', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <textarea
                rows={2}
                placeholder="What didn't work"
                value={comp.what_didnt}
                onChange={(e) => updateCompetitor(idx, 'what_didnt', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <textarea
              rows={2}
              placeholder="Meta Ads observations"
              value={comp.meta_ads_observations}
              onChange={(e) => updateCompetitor(idx, 'meta_ads_observations', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
        ))}
      </fieldset>

      <TextArea label="India Competition Notes" value={indiaCompetitionNotes} onChange={setIndiaCompetitionNotes} placeholder="Specific observations about Indian market competition..." />
      <TextArea label="US / Global Competition Notes" value={usGlobalCompetitionNotes} onChange={setUsGlobalCompetitionNotes} placeholder="Observations from US/global competitors..." />
      <TextArea label="Category Regulations" value={categoryRegulations} onChange={setCategoryRegulations} placeholder="Relevant regulations, compliance requirements..." />
      <TextArea label="Seasonal & Cultural Opportunities" value={seasonalCulturalOpportunities} onChange={setSeasonalCulturalOpportunities} placeholder="Seasonal events, cultural moments, opportunities..." />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; rows?: number;
}) {
  return (
    <fieldset className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
      />
    </fieldset>
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
