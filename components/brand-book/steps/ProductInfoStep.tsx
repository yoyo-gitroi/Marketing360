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

interface Competitor {
  name: string;
  positioning: string;
  strengths: string;
  weaknesses: string;
}

interface FormState {
  product_description: string;
  key_features: string[];
  certifications: string[];
  core_usp: string;
  competitors: Competitor[];
  pricing_notes: string;
  packaging_notes: string;
}

interface ProductInfoStepProps {
  sectionData: SectionData | null;
  onSave: (userInput: Record<string, unknown>) => Promise<void>;
  brandBookId: string;
}

const EMPTY_COMPETITOR: Competitor = {
  name: '',
  positioning: '',
  strengths: '',
  weaknesses: '',
};

const INITIAL_STATE: FormState = {
  product_description: '',
  key_features: [],
  certifications: [],
  core_usp: '',
  competitors: [{ ...EMPTY_COMPETITOR }],
  pricing_notes: '',
  packaging_notes: '',
};

export default function ProductInfoStep({
  sectionData,
  onSave,
}: ProductInfoStepProps) {
  const [formData, setFormData] = useState<FormState>(INITIAL_STATE);
  const [newFeature, setNewFeature] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sectionData?.user_input) {
      const input = sectionData.user_input as unknown as Partial<FormState>;
      setFormData({
        product_description: input.product_description || '',
        key_features: input.key_features || [],
        certifications: input.certifications || [],
        core_usp: input.core_usp || '',
        competitors:
          input.competitors && (input.competitors as Competitor[]).length > 0
            ? (input.competitors as Competitor[])
            : [{ ...EMPTY_COMPETITOR }],
        pricing_notes: input.pricing_notes || '',
        packaging_notes: input.packaging_notes || '',
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

  // Features (dynamic list)
  const addFeature = () => {
    const trimmed = newFeature.trim();
    if (trimmed && !formData.key_features.includes(trimmed)) {
      update({ key_features: [...formData.key_features, trimmed] });
      setNewFeature('');
    }
  };

  const removeFeature = (val: string) => {
    update({ key_features: formData.key_features.filter((v) => v !== val) });
  };

  // Certifications (tag input)
  const addCertification = () => {
    const trimmed = newCertification.trim();
    if (trimmed && !formData.certifications.includes(trimmed)) {
      update({ certifications: [...formData.certifications, trimmed] });
      setNewCertification('');
    }
  };

  const removeCertification = (val: string) => {
    update({ certifications: formData.certifications.filter((v) => v !== val) });
  };

  // Competitors
  const addCompetitor = () => {
    update({ competitors: [...formData.competitors, { ...EMPTY_COMPETITOR }] });
  };

  const updateCompetitor = (index: number, field: keyof Competitor, value: string) => {
    const list = [...formData.competitors];
    list[index] = { ...list[index], [field]: value };
    update({ competitors: list });
  };

  const removeCompetitor = (index: number) => {
    if (formData.competitors.length <= 1) return;
    update({ competitors: formData.competitors.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Information</h2>
          <p className="text-sm text-gray-500 mt-1">
            Describe the product, features, USP, and competitive landscape.
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

      {/* Product Description */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Description
          </label>
          <textarea
            value={formData.product_description}
            onChange={(e) => update({ product_description: e.target.value })}
            placeholder="Describe the product or service in detail..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>

        {/* Key Features / Ingredients */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Key Features / Ingredients
          </label>
          <div className="space-y-2 mb-2">
            {formData.key_features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
              >
                <span className="text-sm">{feature}</span>
                <button
                  onClick={() => removeFeature(feature)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              placeholder="Add a feature and press Enter"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={addFeature}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Certifications
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.certifications.map((cert) => (
            <span
              key={cert}
              className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
            >
              {cert}
              <button
                onClick={() => removeCertification(cert)}
                className="hover:text-green-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCertification}
            onChange={(e) => setNewCertification(e.target.value)}
            onKeyDown={(e) =>
              e.key === 'Enter' && (e.preventDefault(), addCertification())
            }
            placeholder="e.g., ISO 9001, USDA Organic"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={addCertification}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Core USP */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Core USP
        </label>
        <textarea
          value={formData.core_usp}
          onChange={(e) => update({ core_usp: e.target.value })}
          placeholder="What is the single most compelling reason a customer should choose this product?"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
        />
      </div>

      {/* Competitors */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Competitors
        </label>
        <div className="space-y-4">
          {formData.competitors.map((comp, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded-lg relative">
              {formData.competitors.length > 1 && (
                <button
                  onClick={() => removeCompetitor(idx)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name</label>
                  <input
                    type="text"
                    value={comp.name}
                    onChange={(e) => updateCompetitor(idx, 'name', e.target.value)}
                    placeholder="Competitor name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Positioning</label>
                  <input
                    type="text"
                    value={comp.positioning}
                    onChange={(e) => updateCompetitor(idx, 'positioning', e.target.value)}
                    placeholder="How they position themselves"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Strengths</label>
                  <textarea
                    value={comp.strengths}
                    onChange={(e) => updateCompetitor(idx, 'strengths', e.target.value)}
                    placeholder="Their key strengths"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Weaknesses</label>
                  <textarea
                    value={comp.weaknesses}
                    onChange={(e) => updateCompetitor(idx, 'weaknesses', e.target.value)}
                    placeholder="Their weaknesses / gaps"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addCompetitor}
          className="mt-2 inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
        >
          <Plus className="h-4 w-4" />
          Add Competitor
        </button>
      </div>

      {/* Pricing & Packaging */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pricing Notes
          </label>
          <textarea
            value={formData.pricing_notes}
            onChange={(e) => update({ pricing_notes: e.target.value })}
            placeholder="Pricing strategy, tiers, comparison with competitors..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Packaging Notes
          </label>
          <textarea
            value={formData.packaging_notes}
            onChange={(e) => update({ packaging_notes: e.target.value })}
            placeholder="Packaging design, materials, unboxing experience..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>
      </div>
    </div>
  );
}
