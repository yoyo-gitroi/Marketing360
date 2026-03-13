'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Save } from 'lucide-react';

interface SectionData {
  id: string;
  section_key: string;
  user_input: Record<string, unknown>;
  ai_generated: Record<string, unknown>;
  final_content: Record<string, unknown>;
  ai_status: string;
}

interface BrandIdentityStepProps {
  sectionData: SectionData | null;
  onSave: (userInput: Record<string, unknown>) => Promise<void>;
  brandBookId: string;
}

const INITIAL_STATE = {
  brand_name: '',
  tagline: '',
  brand_story_origin: '',
  mission_statement: '',
  vision_statement: '',
  brand_promise: '',
};

export default function BrandIdentityStep({
  sectionData,
  onSave,
  brandBookId,
}: BrandIdentityStepProps) {
  const [formData, setFormData] = useState<Record<string, string>>(INITIAL_STATE);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sectionData?.user_input) {
      setFormData({
        ...INITIAL_STATE,
        ...(sectionData.user_input as Record<string, string>),
      });
    }
  }, [sectionData]);

  const scheduleAutoSave = useCallback(
    (data: Record<string, string>) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        onSave(data);
      }, 1500);
    },
    [onSave]
  );

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  const handleChange = (field: string, value: string) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    scheduleAutoSave(updated);
  };

  const handleManualSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    onSave(formData);
  };

  const aiStatus = sectionData?.ai_status || 'pending';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Brand Identity</h2>
          <p className="text-sm text-gray-500 mt-1">
            Define the core identity elements of the brand.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AIStatusBadge status={aiStatus} />
          <button
            onClick={handleManualSave}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Brand Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand Name
          </label>
          <input
            type="text"
            value={formData.brand_name}
            onChange={(e) => handleChange('brand_name', e.target.value)}
            placeholder="Enter brand name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Tagline */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tagline
          </label>
          <input
            type="text"
            value={formData.tagline}
            onChange={(e) => handleChange('tagline', e.target.value)}
            placeholder="A memorable tagline or slogan"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Brand Story / Origin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand Story / Origin
          </label>
          <textarea
            value={formData.brand_story_origin}
            onChange={(e) => handleChange('brand_story_origin', e.target.value)}
            placeholder="Tell the founding story, what inspired the brand..."
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-y"
          />
        </div>

        {/* Mission Statement */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mission Statement
          </label>
          <textarea
            value={formData.mission_statement}
            onChange={(e) => handleChange('mission_statement', e.target.value)}
            placeholder="What is the brand's mission? Why does it exist?"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-y"
          />
        </div>

        {/* Vision Statement */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vision Statement
          </label>
          <textarea
            value={formData.vision_statement}
            onChange={(e) => handleChange('vision_statement', e.target.value)}
            placeholder="What future does the brand aspire to create?"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-y"
          />
        </div>

        {/* Brand Promise */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand Promise
          </label>
          <input
            type="text"
            value={formData.brand_promise}
            onChange={(e) => handleChange('brand_promise', e.target.value)}
            placeholder="The core commitment to customers"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}

/* ─── AI Status Badge ─── */
function AIStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    pending: { label: 'AI Pending', color: 'bg-gray-100 text-gray-600' },
    generating: { label: 'AI Generating...', color: 'bg-yellow-100 text-yellow-700' },
    completed: { label: 'AI Generated', color: 'bg-purple-100 text-purple-700' },
    error: { label: 'AI Error', color: 'bg-red-100 text-red-700' },
  };

  const { label, color } = config[status] || config.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}
    >
      <Sparkles className="h-3 w-3" />
      {label}
    </span>
  );
}
