'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useAutoSave } from '@/lib/utils/auto-save';
import { ChevronDown, ChevronRight, Upload } from 'lucide-react';
import type { StageProps } from './CampaignBriefStage';

interface BrandSection {
  section_key: string;
  final_content: Record<string, unknown>;
}

const SECTION_LABELS: Record<string, string> = {
  brand_identity: 'Brand Identity',
  values_pillars: 'Values & Pillars',
  visual_identity: 'Visual Identity',
  voice_tone: 'Voice & Tone',
  target_audience: 'Target Audience',
  product_info: 'Product Info',
  brand_history: 'Brand History',
  research_synthesis: 'Research Synthesis',
};

export default function BrandReferenceStage({ stageData, onSave }: StageProps) {
  const ui = stageData.user_input as Record<string, unknown> | undefined;
  const brandSections = (stageData as Record<string, unknown>).brand_sections as BrandSection[] | undefined;
  const hasBrandBook = brandSections && brandSections.length > 0;

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [tgOverride, setTgOverride] = useState<string>((ui?.tg_override as string) ?? '');
  const [toneOverride, setToneOverride] = useState<string>((ui?.tone_override as string) ?? '');
  const [visualOverride, setVisualOverride] = useState<string>((ui?.visual_override as string) ?? '');

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const formData = useMemo(
    () => ({
      tg_override: tgOverride,
      tone_override: toneOverride,
      visual_override: visualOverride,
    }),
    [tgOverride, toneOverride, visualOverride]
  );

  const saveFn = useCallback(
    async (data: Record<string, unknown>) => {
      await onSave({ user_input: data });
    },
    [onSave]
  );

  const { status } = useAutoSave({ saveFn, data: formData });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Brand Reference</h2>
        <SaveIndicator status={status} />
      </div>

      {!hasBrandBook ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-2">
            No brand book linked to this campaign.
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Link a brand book from the campaign settings, or upload a PDF to extract brand data.
          </p>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            Upload Brand Book PDF
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Brand book data is shown as read-only reference. Use override fields below for campaign-specific adjustments.
          </p>
          {brandSections.map((section) => {
            const label = SECTION_LABELS[section.section_key] ?? section.section_key;
            const isOpen = expandedSections.has(section.section_key);
            const content = section.final_content;
            const isEmpty = !content || Object.keys(content).length === 0;

            return (
              <div
                key={section.section_key}
                className="rounded-lg border border-gray-200 bg-white overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.section_key)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-800">{label}</span>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    {isEmpty ? (
                      <p className="text-sm text-gray-400 italic py-3">No content available for this section.</p>
                    ) : (
                      <div className="space-y-2 pt-3">
                        {Object.entries(content).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-xs font-medium text-gray-500 capitalize">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">
                              {typeof value === 'string'
                                ? value
                                : JSON.stringify(value, null, 2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Override fields */}
      <div className="space-y-6 pt-4 border-t border-gray-200">
        <h3 className="text-base font-bold text-gray-900">Campaign-Specific Overrides</h3>
        <p className="text-sm text-gray-500 -mt-4">
          Adjust brand parameters for this specific campaign without changing the brand book.
        </p>

        <fieldset className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Target Group Override</label>
          <textarea
            rows={3}
            value={tgOverride}
            onChange={(e) => setTgOverride(e.target.value)}
            placeholder="e.g., For this campaign our TG is narrower: 18-23 instead of 18-40..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </fieldset>

        <fieldset className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Tone Override</label>
          <textarea
            rows={2}
            value={toneOverride}
            onChange={(e) => setToneOverride(e.target.value)}
            placeholder="Any tone adjustments for this campaign..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </fieldset>

        <fieldset className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Visual Adjustments</label>
          <textarea
            rows={2}
            value={visualOverride}
            onChange={(e) => setVisualOverride(e.target.value)}
            placeholder="Any visual direction changes for this campaign..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </fieldset>
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
