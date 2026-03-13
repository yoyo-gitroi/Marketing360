'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useAutoSave } from '@/lib/utils/auto-save';
import { Plus, Trash2 } from 'lucide-react';

export interface StageProps {
  stageData: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  campaignId: string;
}

interface KPI {
  metric: string;
  target: string;
}

interface BudgetBreakdown {
  production: number;
  media: number;
  influencer: number;
  other: number;
}

interface CampaignDuration {
  start_date: string;
  end_date: string;
  phases: number;
}

const OBJECTIVE_OPTIONS = [
  { value: 'awareness', label: 'Awareness' },
  { value: 'conversion', label: 'Conversion' },
  { value: 'retention', label: 'Retention' },
  { value: 'launch', label: 'Launch' },
  { value: 'branding', label: 'Branding' },
];

const CAMPAIGN_TYPE_OPTIONS = [
  { value: 'product_launch', label: 'Product Launch' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'brand_awareness', label: 'Brand Awareness' },
  { value: 'performance', label: 'Performance' },
  { value: 'event', label: 'Event' },
];

export default function CampaignBriefStage({ stageData, onSave }: StageProps) {
  const ui = stageData.user_input as Record<string, unknown> | undefined;

  const [campaignObjective, setCampaignObjective] = useState<string>(
    (ui?.campaign_objective as string) ?? ''
  );
  const [kpis, setKpis] = useState<KPI[]>(
    (ui?.kpis as KPI[]) ?? [{ metric: '', target: '' }]
  );
  const [campaignType, setCampaignType] = useState<string>(
    (ui?.campaign_type as string) ?? ''
  );
  const [targetMarkets, setTargetMarkets] = useState<string[]>(
    (ui?.target_markets as string[]) ?? []
  );
  const [marketInput, setMarketInput] = useState('');
  const [campaignDuration, setCampaignDuration] = useState<CampaignDuration>(
    (ui?.campaign_duration as CampaignDuration) ?? { start_date: '', end_date: '', phases: 1 }
  );
  const [budgetTotal, setBudgetTotal] = useState<number>(
    (ui?.budget_total as number) ?? 0
  );
  const [budgetBreakdown, setBudgetBreakdown] = useState<BudgetBreakdown>(
    (ui?.budget_breakdown as BudgetBreakdown) ?? { production: 0, media: 0, influencer: 0, other: 0 }
  );
  const [problemStatement, setProblemStatement] = useState<string>(
    (ui?.problem_statement as string) ?? ''
  );
  const [sentimentTerritory, setSentimentTerritory] = useState<string>(
    (ui?.sentiment_territory as string) ?? ''
  );
  const [brandFace, setBrandFace] = useState<string>(
    (ui?.brand_face as string) ?? ''
  );
  const [creativeDirectionHints, setCreativeDirectionHints] = useState<string>(
    (ui?.creative_direction_hints as string) ?? ''
  );

  const budgetSum = useMemo(
    () => budgetBreakdown.production + budgetBreakdown.media + budgetBreakdown.influencer + budgetBreakdown.other,
    [budgetBreakdown]
  );

  const budgetError = budgetTotal > 0 && budgetSum > budgetTotal;

  const formData = useMemo(
    () => ({
      campaign_objective: campaignObjective,
      kpis,
      campaign_type: campaignType,
      target_markets: targetMarkets,
      campaign_duration: campaignDuration,
      budget_total: budgetTotal,
      budget_breakdown: budgetBreakdown,
      problem_statement: problemStatement,
      sentiment_territory: sentimentTerritory,
      brand_face: brandFace,
      creative_direction_hints: creativeDirectionHints,
    }),
    [
      campaignObjective, kpis, campaignType, targetMarkets, campaignDuration,
      budgetTotal, budgetBreakdown, problemStatement, sentimentTerritory,
      brandFace, creativeDirectionHints,
    ]
  );

  const saveFn = useCallback(
    async (data: Record<string, unknown>) => {
      await onSave({ user_input: data });
    },
    [onSave]
  );

  const { status } = useAutoSave({ saveFn, data: formData });

  // KPI helpers
  const addKpi = () => setKpis([...kpis, { metric: '', target: '' }]);
  const removeKpi = (idx: number) => setKpis(kpis.filter((_, i) => i !== idx));
  const updateKpi = (idx: number, field: keyof KPI, value: string) => {
    const updated = [...kpis];
    updated[idx] = { ...updated[idx], [field]: value };
    setKpis(updated);
  };

  // Market tag helpers
  const addMarket = () => {
    const trimmed = marketInput.trim();
    if (trimmed && !targetMarkets.includes(trimmed)) {
      setTargetMarkets([...targetMarkets, trimmed]);
      setMarketInput('');
    }
  };
  const removeMarket = (market: string) =>
    setTargetMarkets(targetMarkets.filter((m) => m !== market));

  const updateBudget = (field: keyof BudgetBreakdown, value: string) => {
    setBudgetBreakdown({ ...budgetBreakdown, [field]: parseFloat(value) || 0 });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Campaign Brief</h2>
        <SaveIndicator status={status} />
      </div>

      {/* Campaign Objective */}
      <fieldset className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Campaign Objective</label>
        <select
          value={campaignObjective}
          onChange={(e) => setCampaignObjective(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        >
          <option value="">Select objective...</option>
          {OBJECTIVE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </fieldset>

      {/* KPIs */}
      <fieldset className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-700">KPIs</label>
          <button
            type="button"
            onClick={addKpi}
            className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800"
          >
            <Plus className="w-3.5 h-3.5" /> Add KPI
          </button>
        </div>
        {kpis.map((kpi, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <input
              type="text"
              placeholder="Metric (e.g., Reach)"
              value={kpi.metric}
              onChange={(e) => updateKpi(idx, 'metric', e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <input
              type="text"
              placeholder="Target (e.g., 1M)"
              value={kpi.target}
              onChange={(e) => updateKpi(idx, 'target', e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            {kpis.length > 1 && (
              <button type="button" onClick={() => removeKpi(idx)} className="p-2 text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </fieldset>

      {/* Campaign Type */}
      <fieldset className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Campaign Type</label>
        <select
          value={campaignType}
          onChange={(e) => setCampaignType(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        >
          <option value="">Select type...</option>
          {CAMPAIGN_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </fieldset>

      {/* Target Markets */}
      <fieldset className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Target Markets</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a market and press Enter"
            value={marketInput}
            onChange={(e) => setMarketInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMarket(); } }}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
          <button
            type="button"
            onClick={addMarket}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200"
          >
            Add
          </button>
        </div>
        {targetMarkets.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {targetMarkets.map((m) => (
              <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                {m}
                <button type="button" onClick={() => removeMarket(m)} className="hover:text-purple-900">&times;</button>
              </span>
            ))}
          </div>
        )}
      </fieldset>

      {/* Campaign Duration */}
      <fieldset className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Campaign Duration</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={campaignDuration.start_date}
              onChange={(e) => setCampaignDuration({ ...campaignDuration, start_date: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              value={campaignDuration.end_date}
              onChange={(e) => setCampaignDuration({ ...campaignDuration, end_date: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Phases</label>
            <input
              type="number"
              min={1}
              value={campaignDuration.phases}
              onChange={(e) => setCampaignDuration({ ...campaignDuration, phases: parseInt(e.target.value) || 1 })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>
      </fieldset>

      {/* Budget */}
      <fieldset className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">Budget</label>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Total Budget</label>
          <input
            type="number"
            min={0}
            value={budgetTotal || ''}
            onChange={(e) => setBudgetTotal(parseFloat(e.target.value) || 0)}
            placeholder="Total campaign budget"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['production', 'media', 'influencer', 'other'] as const).map((key) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1 capitalize">{key}</label>
              <input
                type="number"
                min={0}
                value={budgetBreakdown[key] || ''}
                onChange={(e) => updateBudget(key, e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 ${
                  budgetError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Sum display */}
        <div className="flex items-center justify-between text-sm px-1">
          <span className={budgetError ? 'text-red-600 font-medium' : 'text-gray-500'}>
            Breakdown sum: {budgetSum.toLocaleString()}
          </span>
          {budgetError && (
            <span className="text-red-600 text-xs font-medium">
              Exceeds total budget by {(budgetSum - budgetTotal).toLocaleString()}
            </span>
          )}
        </div>
      </fieldset>

      {/* Text fields */}
      <fieldset className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Problem Statement</label>
        <textarea
          rows={3}
          value={problemStatement}
          onChange={(e) => setProblemStatement(e.target.value)}
          placeholder="What problem does this campaign solve?"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        />
      </fieldset>

      <fieldset className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Sentiment Territory</label>
        <textarea
          rows={2}
          value={sentimentTerritory}
          onChange={(e) => setSentimentTerritory(e.target.value)}
          placeholder="What emotional territory should this campaign own?"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        />
      </fieldset>

      <fieldset className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Brand Face</label>
        <input
          type="text"
          value={brandFace}
          onChange={(e) => setBrandFace(e.target.value)}
          placeholder="Who is the face of this campaign?"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        />
      </fieldset>

      <fieldset className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Creative Direction Hints</label>
        <textarea
          rows={3}
          value={creativeDirectionHints}
          onChange={(e) => setCreativeDirectionHints(e.target.value)}
          placeholder="Any initial creative direction, references, or tone ideas..."
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
