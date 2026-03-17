'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoSave } from '@/lib/utils/auto-save';
import { Plus, Trash2 } from 'lucide-react';
import type { StageProps } from './CampaignBriefStage';

interface MarketplaceKeyword {
  keyword: string;
  volume: string;
  intent: string;
}

interface GoogleKeyword {
  keyword: string;
  volume: string;
}

interface HierarchyItem {
  rank: number;
  use_case: string;
  frequency: string;
}

export default function CustomerIntelStage({ stageData, onSave }: StageProps) {
  const ui = stageData.user_input as Record<string, unknown> | undefined;

  const [marketplaceKeywords, setMarketplaceKeywords] = useState<MarketplaceKeyword[]>(
    (ui?.marketplace_keywords as MarketplaceKeyword[]) ?? [{ keyword: '', volume: '', intent: '' }]
  );
  const [googleKeywords, setGoogleKeywords] = useState<GoogleKeyword[]>(
    (ui?.google_keywords as GoogleKeyword[]) ?? [{ keyword: '', volume: '' }]
  );
  const [customerSentiment, setCustomerSentiment] = useState<string>((ui?.customer_sentiment as string) ?? '');
  const [ownReviewThemes, setOwnReviewThemes] = useState<string>((ui?.own_review_themes as string) ?? '');
  const [competitorReviewThemes, setCompetitorReviewThemes] = useState<string>((ui?.competitor_review_themes as string) ?? '');
  const [hierarchyOfUse, setHierarchyOfUse] = useState<HierarchyItem[]>(
    (ui?.hierarchy_of_use as HierarchyItem[]) ?? [{ rank: 1, use_case: '', frequency: '' }]
  );
  const [purchaseTriggers, setPurchaseTriggers] = useState<string[]>(
    (ui?.purchase_triggers as string[]) ?? ['']
  );
  const [purchaseBarriers, setPurchaseBarriers] = useState<string[]>(
    (ui?.purchase_barriers as string[]) ?? ['']
  );
  const [customerInterviewNotes, setCustomerInterviewNotes] = useState<string>((ui?.customer_interview_notes as string) ?? '');

  // Re-populate local state when stageData.user_input changes (e.g. after AI generation)
  useEffect(() => {
    const updated = stageData.user_input as Record<string, unknown> | undefined;
    if (!updated || typeof updated !== 'object' || Object.keys(updated).length === 0) return;
    setMarketplaceKeywords((updated.marketplace_keywords as MarketplaceKeyword[]) ?? [{ keyword: '', volume: '', intent: '' }]);
    setGoogleKeywords((updated.google_keywords as GoogleKeyword[]) ?? [{ keyword: '', volume: '' }]);
    setCustomerSentiment((updated.customer_sentiment as string) ?? '');
    setOwnReviewThemes((updated.own_review_themes as string) ?? '');
    setCompetitorReviewThemes((updated.competitor_review_themes as string) ?? '');
    setHierarchyOfUse((updated.hierarchy_of_use as HierarchyItem[]) ?? [{ rank: 1, use_case: '', frequency: '' }]);
    setPurchaseTriggers((updated.purchase_triggers as string[]) ?? ['']);
    setPurchaseBarriers((updated.purchase_barriers as string[]) ?? ['']);
    setCustomerInterviewNotes((updated.customer_interview_notes as string) ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stageData.user_input)]);

  const formData = useMemo(
    () => ({
      marketplace_keywords: marketplaceKeywords,
      google_keywords: googleKeywords,
      customer_sentiment: customerSentiment,
      own_review_themes: ownReviewThemes,
      competitor_review_themes: competitorReviewThemes,
      hierarchy_of_use: hierarchyOfUse,
      purchase_triggers: purchaseTriggers,
      purchase_barriers: purchaseBarriers,
      customer_interview_notes: customerInterviewNotes,
    }),
    [marketplaceKeywords, googleKeywords, customerSentiment, ownReviewThemes, competitorReviewThemes, hierarchyOfUse, purchaseTriggers, purchaseBarriers, customerInterviewNotes]
  );

  const saveFn = useCallback(
    async (data: Record<string, unknown>) => { await onSave({ user_input: data }); },
    [onSave]
  );

  const { status } = useAutoSave({ saveFn, data: formData });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Customer Intelligence</h2>
        <SaveIndicator status={status} />
      </div>

      {/* Marketplace Keywords */}
      <DynamicList
        label="Marketplace Keywords"
        items={marketplaceKeywords}
        onAdd={() => setMarketplaceKeywords([...marketplaceKeywords, { keyword: '', volume: '', intent: '' }])}
        onRemove={(idx) => setMarketplaceKeywords(marketplaceKeywords.filter((_, i) => i !== idx))}
        renderItem={(item, idx) => (
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Keyword"
              value={item.keyword}
              onChange={(e) => {
                const u = [...marketplaceKeywords];
                u[idx] = { ...u[idx], keyword: e.target.value };
                setMarketplaceKeywords(u);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <input
              type="text"
              placeholder="Volume"
              value={item.volume}
              onChange={(e) => {
                const u = [...marketplaceKeywords];
                u[idx] = { ...u[idx], volume: e.target.value };
                setMarketplaceKeywords(u);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <input
              type="text"
              placeholder="Intent"
              value={item.intent}
              onChange={(e) => {
                const u = [...marketplaceKeywords];
                u[idx] = { ...u[idx], intent: e.target.value };
                setMarketplaceKeywords(u);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
        )}
      />

      {/* Google Keywords */}
      <DynamicList
        label="Google Keywords"
        items={googleKeywords}
        onAdd={() => setGoogleKeywords([...googleKeywords, { keyword: '', volume: '' }])}
        onRemove={(idx) => setGoogleKeywords(googleKeywords.filter((_, i) => i !== idx))}
        renderItem={(item, idx) => (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Keyword"
              value={item.keyword}
              onChange={(e) => {
                const u = [...googleKeywords];
                u[idx] = { ...u[idx], keyword: e.target.value };
                setGoogleKeywords(u);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <input
              type="text"
              placeholder="Volume"
              value={item.volume}
              onChange={(e) => {
                const u = [...googleKeywords];
                u[idx] = { ...u[idx], volume: e.target.value };
                setGoogleKeywords(u);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
        )}
      />

      <TextArea label="Customer Sentiment" value={customerSentiment} onChange={setCustomerSentiment} placeholder="Overall customer sentiment about the brand/category..." />
      <TextArea label="Own Review Themes" value={ownReviewThemes} onChange={setOwnReviewThemes} placeholder="Common themes from your product reviews..." />
      <TextArea label="Competitor Review Themes" value={competitorReviewThemes} onChange={setCompetitorReviewThemes} placeholder="Themes from competitor product reviews..." />

      {/* Hierarchy of Use */}
      <DynamicList
        label="Hierarchy of Use"
        items={hierarchyOfUse}
        onAdd={() => setHierarchyOfUse([...hierarchyOfUse, { rank: hierarchyOfUse.length + 1, use_case: '', frequency: '' }])}
        onRemove={(idx) => setHierarchyOfUse(hierarchyOfUse.filter((_, i) => i !== idx))}
        renderItem={(item, idx) => (
          <div className="grid grid-cols-[60px_1fr_1fr] gap-2">
            <input
              type="number"
              min={1}
              placeholder="#"
              value={item.rank}
              onChange={(e) => {
                const u = [...hierarchyOfUse];
                u[idx] = { ...u[idx], rank: parseInt(e.target.value) || 1 };
                setHierarchyOfUse(u);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <input
              type="text"
              placeholder="Use case"
              value={item.use_case}
              onChange={(e) => {
                const u = [...hierarchyOfUse];
                u[idx] = { ...u[idx], use_case: e.target.value };
                setHierarchyOfUse(u);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <input
              type="text"
              placeholder="Frequency"
              value={item.frequency}
              onChange={(e) => {
                const u = [...hierarchyOfUse];
                u[idx] = { ...u[idx], frequency: e.target.value };
                setHierarchyOfUse(u);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
        )}
      />

      {/* Purchase Triggers */}
      <StringList
        label="Purchase Triggers"
        items={purchaseTriggers}
        onChange={setPurchaseTriggers}
        placeholder="What triggers a purchase?"
      />

      {/* Purchase Barriers */}
      <StringList
        label="Purchase Barriers"
        items={purchaseBarriers}
        onChange={setPurchaseBarriers}
        placeholder="What prevents a purchase?"
      />

      <TextArea label="Customer Interview Notes" value={customerInterviewNotes} onChange={setCustomerInterviewNotes} rows={5} placeholder="Notes from customer interviews, focus groups, etc..." />
    </div>
  );
}

/* ---- Reusable sub-components ---- */

function DynamicList<T>({ label, items, onAdd, onRemove, renderItem }: {
  label: string; items: T[]; onAdd: () => void; onRemove: (idx: number) => void;
  renderItem: (item: T, idx: number) => React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">{label}</label>
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-2 items-start">
          <div className="flex-1">{renderItem(item, idx)}</div>
          {items.length > 1 && (
            <button type="button" onClick={() => onRemove(idx)} className="p-2 text-red-400 hover:text-red-600 mt-0.5">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </fieldset>
  );
}

function StringList({ label, items, onChange, placeholder }: {
  label: string; items: string[]; onChange: (items: string[]) => void; placeholder: string;
}) {
  return (
    <DynamicList
      label={label}
      items={items}
      onAdd={() => onChange([...items, ''])}
      onRemove={(idx) => onChange(items.filter((_, i) => i !== idx))}
      renderItem={(item, idx) => (
        <input
          type="text"
          placeholder={placeholder}
          value={item}
          onChange={(e) => {
            const u = [...items];
            u[idx] = e.target.value;
            onChange(u);
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        />
      )}
    />
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; rows?: number;
}) {
  return (
    <fieldset className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
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
