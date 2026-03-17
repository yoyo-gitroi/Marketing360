'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoSave } from '@/lib/utils/auto-save';
import { Plus, Trash2 } from 'lucide-react';
import type { StageProps } from './CampaignBriefStage';

interface PartnerVendor {
  name: string;
  type: string;
  notes: string;
}

export default function ResourcesStage({ stageData, onSave }: StageProps) {
  const ui = stageData.user_input as Record<string, unknown> | undefined;

  const [teamResources, setTeamResources] = useState<string>((ui?.team_resources as string) ?? '');
  const [timelineConstraints, setTimelineConstraints] = useState<string>((ui?.timeline_constraints as string) ?? '');
  const [productionCapabilities, setProductionCapabilities] = useState<string>((ui?.production_capabilities as string) ?? '');
  const [availableAssets, setAvailableAssets] = useState<string>((ui?.available_assets as string) ?? '');
  const [partnerVendors, setPartnerVendors] = useState<PartnerVendor[]>(
    (ui?.partner_vendors as PartnerVendor[]) ?? [{ name: '', type: '', notes: '' }]
  );

  // Re-populate local state when stageData.user_input changes (e.g. after AI generation)
  useEffect(() => {
    const updated = stageData.user_input as Record<string, unknown> | undefined;
    if (!updated || typeof updated !== 'object' || Object.keys(updated).length === 0) return;
    setTeamResources((updated.team_resources as string) ?? '');
    setTimelineConstraints((updated.timeline_constraints as string) ?? '');
    setProductionCapabilities((updated.production_capabilities as string) ?? '');
    setAvailableAssets((updated.available_assets as string) ?? '');
    setPartnerVendors((updated.partner_vendors as PartnerVendor[]) ?? [{ name: '', type: '', notes: '' }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stageData.user_input)]);

  const formData = useMemo(
    () => ({
      team_resources: teamResources,
      timeline_constraints: timelineConstraints,
      production_capabilities: productionCapabilities,
      available_assets: availableAssets,
      partner_vendors: partnerVendors,
    }),
    [teamResources, timelineConstraints, productionCapabilities, availableAssets, partnerVendors]
  );

  const saveFn = useCallback(
    async (data: Record<string, unknown>) => { await onSave({ user_input: data }); },
    [onSave]
  );

  const { status } = useAutoSave({ saveFn, data: formData });

  const addVendor = () => setPartnerVendors([...partnerVendors, { name: '', type: '', notes: '' }]);
  const removeVendor = (idx: number) => setPartnerVendors(partnerVendors.filter((_, i) => i !== idx));
  const updateVendor = (idx: number, field: keyof PartnerVendor, value: string) => {
    const updated = [...partnerVendors];
    updated[idx] = { ...updated[idx], [field]: value };
    setPartnerVendors(updated);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Resources & Execution</h2>
        <SaveIndicator status={status} />
      </div>

      <fieldset className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Team Resources</label>
        <textarea
          rows={4}
          value={teamResources}
          onChange={(e) => setTeamResources(e.target.value)}
          placeholder="Available team members, roles, bandwidth, external agencies..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        />
      </fieldset>

      <fieldset className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Timeline Constraints</label>
        <textarea
          rows={3}
          value={timelineConstraints}
          onChange={(e) => setTimelineConstraints(e.target.value)}
          placeholder="Hard deadlines, event dates, launch windows, approval cycles..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        />
      </fieldset>

      <fieldset className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Production Capabilities</label>
        <textarea
          rows={3}
          value={productionCapabilities}
          onChange={(e) => setProductionCapabilities(e.target.value)}
          placeholder="In-house production, studio access, equipment, tech stack..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        />
      </fieldset>

      <fieldset className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Available Assets</label>
        <textarea
          rows={3}
          value={availableAssets}
          onChange={(e) => setAvailableAssets(e.target.value)}
          placeholder="Existing creative assets, footage, photography, brand materials..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        />
      </fieldset>

      {/* Partner / Vendor List */}
      <fieldset className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-700">Partner / Vendor List</label>
          <button type="button" onClick={addVendor} className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800">
            <Plus className="w-3.5 h-3.5" /> Add Vendor
          </button>
        </div>

        {partnerVendors.map((vendor, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Vendor {idx + 1}</span>
              {partnerVendors.length > 1 && (
                <button type="button" onClick={() => removeVendor(idx)} className="p-1 text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Vendor name"
                value={vendor.name}
                onChange={(e) => updateVendor(idx, 'name', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <input
                type="text"
                placeholder="Type (e.g., Production house, Influencer agency)"
                value={vendor.type}
                onChange={(e) => updateVendor(idx, 'type', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <textarea
              rows={2}
              placeholder="Notes, specialties, contact info..."
              value={vendor.notes}
              onChange={(e) => updateVendor(idx, 'notes', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
        ))}
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
