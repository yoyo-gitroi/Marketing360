'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Save } from 'lucide-react';

interface SectionData {
  id: string;
  section_key: string;
  user_input: Record<string, unknown>;
  ai_generated: Record<string, unknown>;
  final_content: Record<string, unknown>;
  ai_status: string;
}

interface CampaignEntry {
  name: string;
  what_worked: string;
  what_didnt: string;
}

interface SocialPlatform {
  platform: string;
  followers: string;
  engagement_rate: string;
  notes: string;
}

interface FormState {
  existing_campaigns: CampaignEntry[];
  social_media: SocialPlatform[];
  platform_strategy_notes: string;
  asset_library_links: string;
  legal_compliance_notes: string;
}

interface BrandHistoryStepProps {
  sectionData: SectionData | null;
  onSave: (userInput: Record<string, unknown>) => Promise<void>;
  brandBookId: string;
}

const EMPTY_CAMPAIGN: CampaignEntry = {
  name: '',
  what_worked: '',
  what_didnt: '',
};

const EMPTY_PLATFORM: SocialPlatform = {
  platform: '',
  followers: '',
  engagement_rate: '',
  notes: '',
};

const INITIAL_STATE: FormState = {
  existing_campaigns: [{ ...EMPTY_CAMPAIGN }],
  social_media: [{ ...EMPTY_PLATFORM }],
  platform_strategy_notes: '',
  asset_library_links: '',
  legal_compliance_notes: '',
};

export default function BrandHistoryStep({
  sectionData,
  onSave,
}: BrandHistoryStepProps) {
  const [formData, setFormData] = useState<FormState>(INITIAL_STATE);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sectionData?.user_input) {
      const input = sectionData.user_input as unknown as Partial<FormState>;
      setFormData({
        existing_campaigns:
          input.existing_campaigns &&
          (input.existing_campaigns as CampaignEntry[]).length > 0
            ? (input.existing_campaigns as CampaignEntry[])
            : [{ ...EMPTY_CAMPAIGN }],
        social_media:
          input.social_media && (input.social_media as SocialPlatform[]).length > 0
            ? (input.social_media as SocialPlatform[])
            : [{ ...EMPTY_PLATFORM }],
        platform_strategy_notes: input.platform_strategy_notes || '',
        asset_library_links: input.asset_library_links || '',
        legal_compliance_notes: input.legal_compliance_notes || '',
      });
    }
  }, [sectionData]);

  const scheduleAutoSave = useCallback(
    (data: FormState) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        onSave(data as unknown as Record<string, unknown>);
      }, 1500);
    },
    [onSave]
  );

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  const update = (partial: Partial<FormState>) => {
    const updated = { ...formData, ...partial };
    setFormData(updated);
    scheduleAutoSave(updated);
  };

  // Campaigns
  const addCampaign = () => {
    update({
      existing_campaigns: [...formData.existing_campaigns, { ...EMPTY_CAMPAIGN }],
    });
  };

  const updateCampaign = (
    index: number,
    field: keyof CampaignEntry,
    value: string
  ) => {
    const list = [...formData.existing_campaigns];
    list[index] = { ...list[index], [field]: value };
    update({ existing_campaigns: list });
  };

  const removeCampaign = (index: number) => {
    if (formData.existing_campaigns.length <= 1) return;
    update({
      existing_campaigns: formData.existing_campaigns.filter((_, i) => i !== index),
    });
  };

  // Social Media
  const addPlatform = () => {
    update({ social_media: [...formData.social_media, { ...EMPTY_PLATFORM }] });
  };

  const updatePlatform = (
    index: number,
    field: keyof SocialPlatform,
    value: string
  ) => {
    const list = [...formData.social_media];
    list[index] = { ...list[index], [field]: value };
    update({ social_media: list });
  };

  const removePlatform = (index: number) => {
    if (formData.social_media.length <= 1) return;
    update({ social_media: formData.social_media.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Brand History</h2>
          <p className="text-sm text-gray-500 mt-1">
            Document past campaigns, social media presence, and compliance notes.
          </p>
        </div>
        <button
          onClick={() => onSave(formData as unknown as Record<string, unknown>)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </button>
      </div>

      {/* Existing Campaigns */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Existing Campaigns
        </label>
        <div className="space-y-4">
          {formData.existing_campaigns.map((campaign, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded-lg relative">
              {formData.existing_campaigns.length > 1 && (
                <button
                  onClick={() => removeCampaign(idx)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={campaign.name}
                    onChange={(e) => updateCampaign(idx, 'name', e.target.value)}
                    placeholder="Campaign name or description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-green-600 mb-1">
                      What Worked
                    </label>
                    <textarea
                      value={campaign.what_worked}
                      onChange={(e) =>
                        updateCampaign(idx, 'what_worked', e.target.value)
                      }
                      placeholder="Key successes and learnings..."
                      rows={3}
                      className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-y text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-red-600 mb-1">
                      What Didn&apos;t Work
                    </label>
                    <textarea
                      value={campaign.what_didnt}
                      onChange={(e) =>
                        updateCampaign(idx, 'what_didnt', e.target.value)
                      }
                      placeholder="What fell short and why..."
                      rows={3}
                      className="w-full px-3 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-y text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addCampaign}
          className="mt-2 inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
        >
          <Plus className="h-4 w-4" />
          Add Campaign
        </button>
      </div>

      {/* Social Media Presence */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Social Media Presence
        </label>
        <div className="space-y-3">
          {formData.social_media.map((platform, idx) => (
            <div
              key={idx}
              className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1 grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Platform</label>
                  <input
                    type="text"
                    value={platform.platform}
                    onChange={(e) =>
                      updatePlatform(idx, 'platform', e.target.value)
                    }
                    placeholder="e.g., Instagram"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Followers</label>
                  <input
                    type="text"
                    value={platform.followers}
                    onChange={(e) =>
                      updatePlatform(idx, 'followers', e.target.value)
                    }
                    placeholder="e.g., 50K"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Engagement Rate
                  </label>
                  <input
                    type="text"
                    value={platform.engagement_rate}
                    onChange={(e) =>
                      updatePlatform(idx, 'engagement_rate', e.target.value)
                    }
                    placeholder="e.g., 3.5%"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-gray-500 mb-1">Notes</label>
                  <input
                    type="text"
                    value={platform.notes}
                    onChange={(e) => updatePlatform(idx, 'notes', e.target.value)}
                    placeholder="Content types, posting frequency, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>
              {formData.social_media.length > 1 && (
                <button
                  onClick={() => removePlatform(idx)}
                  className="text-gray-400 hover:text-red-500 mt-6"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addPlatform}
          className="mt-2 inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
        >
          <Plus className="h-4 w-4" />
          Add Platform
        </button>
      </div>

      {/* Strategy, Assets, Legal */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Platform Strategy Notes
          </label>
          <textarea
            value={formData.platform_strategy_notes}
            onChange={(e) => update({ platform_strategy_notes: e.target.value })}
            placeholder="Overall social media and digital strategy..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Asset Library Links
          </label>
          <textarea
            value={formData.asset_library_links}
            onChange={(e) => update({ asset_library_links: e.target.value })}
            placeholder="Links to Google Drive, Figma, Dropbox folders with brand assets..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Legal / Compliance Notes
          </label>
          <textarea
            value={formData.legal_compliance_notes}
            onChange={(e) => update({ legal_compliance_notes: e.target.value })}
            placeholder="Trademark info, regulatory requirements, disclaimers needed..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>
      </div>
    </div>
  );
}
