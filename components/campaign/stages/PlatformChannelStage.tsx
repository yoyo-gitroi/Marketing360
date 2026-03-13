'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useAutoSave } from '@/lib/utils/auto-save';
import { Plus, Trash2 } from 'lucide-react';
import type { StageProps } from './CampaignBriefStage';

interface PlatformEntry {
  platform_name: string;
  best_practices: string;
  content_format_preferences: string;
}

const PLATFORM_SUGGESTIONS = [
  'Instagram', 'YouTube', 'Facebook', 'TikTok', 'Twitter/X',
  'LinkedIn', 'Pinterest', 'Snapchat', 'Google Ads', 'Amazon',
];

const EMPTY_PLATFORM: PlatformEntry = {
  platform_name: '',
  best_practices: '',
  content_format_preferences: '',
};

export default function PlatformChannelStage({ stageData, onSave }: StageProps) {
  const ui = stageData.user_input as Record<string, unknown> | undefined;

  const [platforms, setPlatforms] = useState<PlatformEntry[]>(
    (ui?.platforms as PlatformEntry[]) ?? [{ ...EMPTY_PLATFORM }]
  );

  const formData = useMemo(() => ({ platforms }), [platforms]);

  const saveFn = useCallback(
    async (data: Record<string, unknown>) => { await onSave({ user_input: data }); },
    [onSave]
  );

  const { status } = useAutoSave({ saveFn, data: formData });

  const addPlatform = () => setPlatforms([...platforms, { ...EMPTY_PLATFORM }]);
  const removePlatform = (idx: number) => setPlatforms(platforms.filter((_, i) => i !== idx));
  const updatePlatform = (idx: number, field: keyof PlatformEntry, value: string) => {
    const updated = [...platforms];
    updated[idx] = { ...updated[idx], [field]: value };
    setPlatforms(updated);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Platform & Channel Strategy</h2>
        <SaveIndicator status={status} />
      </div>

      <p className="text-sm text-gray-500">
        Document best practices and content format preferences for each platform relevant to this campaign.
      </p>

      {/* Quick-add platform buttons */}
      <div>
        <span className="text-xs font-medium text-gray-500 block mb-2">Quick add:</span>
        <div className="flex flex-wrap gap-2">
          {PLATFORM_SUGGESTIONS.map((name) => {
            const alreadyAdded = platforms.some((p) => p.platform_name.toLowerCase() === name.toLowerCase());
            return (
              <button
                key={name}
                type="button"
                disabled={alreadyAdded}
                onClick={() =>
                  setPlatforms([...platforms, { ...EMPTY_PLATFORM, platform_name: name }])
                }
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  alreadyAdded
                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                    : 'border-purple-200 text-purple-600 hover:bg-purple-50 cursor-pointer'
                }`}
              >
                + {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Platform entries */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-700">Platforms</label>
          <button type="button" onClick={addPlatform} className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800">
            <Plus className="w-3.5 h-3.5" /> Add Platform
          </button>
        </div>

        {platforms.map((platform, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <input
                type="text"
                placeholder="Platform name"
                value={platform.platform_name}
                onChange={(e) => updatePlatform(idx, 'platform_name', e.target.value)}
                className="text-sm font-medium rounded-lg border border-gray-300 px-3 py-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 flex-1 mr-2"
              />
              {platforms.length > 1 && (
                <button type="button" onClick={() => removePlatform(idx)} className="p-1 text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Best Practices</label>
              <textarea
                rows={3}
                placeholder="Platform-specific best practices, posting times, engagement tactics..."
                value={platform.best_practices}
                onChange={(e) => updatePlatform(idx, 'best_practices', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Content Format Preferences</label>
              <textarea
                rows={2}
                placeholder="Reels, carousels, stories, long-form, etc."
                value={platform.content_format_preferences}
                onChange={(e) => updatePlatform(idx, 'content_format_preferences', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>
        ))}
      </div>
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
