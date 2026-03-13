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

interface BrandPillar {
  name: string;
  description: string;
}

interface ValuesPillarsStepProps {
  sectionData: SectionData | null;
  onSave: (userInput: Record<string, unknown>) => Promise<void>;
  brandBookId: string;
}

interface FormState {
  core_values: string[];
  brand_pillars: BrandPillar[];
  differentiation_statement: string;
}

const INITIAL_STATE: FormState = {
  core_values: [],
  brand_pillars: [{ name: '', description: '' }],
  differentiation_statement: '',
};

export default function ValuesPillarsStep({
  sectionData,
  onSave,
}: ValuesPillarsStepProps) {
  const [formData, setFormData] = useState<FormState>(INITIAL_STATE);
  const [newValue, setNewValue] = useState('');
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sectionData?.user_input) {
      const input = sectionData.user_input as unknown as Partial<FormState>;
      setFormData({
        core_values: input.core_values || [],
        brand_pillars:
          input.brand_pillars && (input.brand_pillars as BrandPillar[]).length > 0
            ? (input.brand_pillars as BrandPillar[])
            : [{ name: '', description: '' }],
        differentiation_statement: input.differentiation_statement || '',
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

  const addCoreValue = () => {
    const trimmed = newValue.trim();
    if (trimmed && !formData.core_values.includes(trimmed)) {
      update({ core_values: [...formData.core_values, trimmed] });
      setNewValue('');
    }
  };

  const removeCoreValue = (val: string) => {
    update({ core_values: formData.core_values.filter((v) => v !== val) });
  };

  const addPillar = () => {
    update({ brand_pillars: [...formData.brand_pillars, { name: '', description: '' }] });
  };

  const updatePillar = (index: number, field: keyof BrandPillar, value: string) => {
    const pillars = [...formData.brand_pillars];
    pillars[index] = { ...pillars[index], [field]: value };
    update({ brand_pillars: pillars });
  };

  const removePillar = (index: number) => {
    if (formData.brand_pillars.length <= 1) return;
    update({ brand_pillars: formData.brand_pillars.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Values & Pillars</h2>
          <p className="text-sm text-gray-500 mt-1">
            Define the core values and strategic pillars that guide the brand.
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

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Core Values (Tag Input) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Core Values
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.core_values.map((val) => (
              <span
                key={val}
                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
              >
                {val}
                <button
                  onClick={() => removeCoreValue(val)}
                  className="hover:text-indigo-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCoreValue())}
              placeholder="Type a value and press Enter"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={addCoreValue}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Brand Pillars */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brand Pillars
          </label>
          <div className="space-y-3">
            {formData.brand_pillars.map((pillar, idx) => (
              <div
                key={idx}
                className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={pillar.name}
                    onChange={(e) => updatePillar(idx, 'name', e.target.value)}
                    placeholder="Pillar name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <textarea
                    value={pillar.description}
                    onChange={(e) => updatePillar(idx, 'description', e.target.value)}
                    placeholder="Describe this pillar..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                  />
                </div>
                {formData.brand_pillars.length > 1 && (
                  <button
                    onClick={() => removePillar(idx)}
                    className="text-gray-400 hover:text-red-500 mt-2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addPillar}
            className="mt-2 inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
          >
            <Plus className="h-4 w-4" />
            Add Pillar
          </button>
        </div>

        {/* Differentiation Statement */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Differentiation Statement
          </label>
          <textarea
            value={formData.differentiation_statement}
            onChange={(e) => update({ differentiation_statement: e.target.value })}
            placeholder="What makes this brand uniquely different from competitors?"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>
      </div>
    </div>
  );
}
