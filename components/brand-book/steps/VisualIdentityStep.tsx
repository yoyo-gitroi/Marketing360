'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Upload, Save } from 'lucide-react';

interface SectionData {
  id: string;
  section_key: string;
  user_input: Record<string, unknown>;
  ai_generated: Record<string, unknown>;
  final_content: Record<string, unknown>;
  ai_status: string;
}

interface ColorEntry {
  hex: string;
  usage_percentage: string;
  emotional_meaning: string;
  role: string; // primary | secondary | tertiary | accent
}

interface FormState {
  logo_url: string;
  color_palette: ColorEntry[];
  primary_font: string;
  secondary_font: string;
  typography_hierarchy_notes: string;
  photography_style: string;
  iconography_notes: string;
}

interface VisualIdentityStepProps {
  sectionData: SectionData | null;
  onSave: (userInput: Record<string, unknown>) => Promise<void>;
  brandBookId: string;
}

const DEFAULT_COLORS: ColorEntry[] = [
  { hex: '#000000', usage_percentage: '', emotional_meaning: '', role: 'primary' },
  { hex: '#666666', usage_percentage: '', emotional_meaning: '', role: 'secondary' },
  { hex: '#CCCCCC', usage_percentage: '', emotional_meaning: '', role: 'tertiary' },
];

const INITIAL_STATE: FormState = {
  logo_url: '',
  color_palette: DEFAULT_COLORS,
  primary_font: '',
  secondary_font: '',
  typography_hierarchy_notes: '',
  photography_style: '',
  iconography_notes: '',
};

export default function VisualIdentityStep({
  sectionData,
  onSave,
  brandBookId,
}: VisualIdentityStepProps) {
  const [formData, setFormData] = useState<FormState>(INITIAL_STATE);
  const [uploading, setUploading] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sectionData?.user_input) {
      const input = sectionData.user_input as unknown as Partial<FormState>;
      setFormData({
        logo_url: input.logo_url || '',
        color_palette:
          input.color_palette && (input.color_palette as ColorEntry[]).length > 0
            ? (input.color_palette as ColorEntry[])
            : DEFAULT_COLORS,
        primary_font: input.primary_font || '',
        secondary_font: input.secondary_font || '',
        typography_hierarchy_notes: input.typography_hierarchy_notes || '',
        photography_style: input.photography_style || '',
        iconography_notes: input.iconography_notes || '',
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

  const updateColor = (index: number, field: keyof ColorEntry, value: string) => {
    const palette = [...formData.color_palette];
    palette[index] = { ...palette[index], [field]: value };
    update({ color_palette: palette });
  };

  const addColor = () => {
    update({
      color_palette: [
        ...formData.color_palette,
        { hex: '#999999', usage_percentage: '', emotional_meaning: '', role: 'accent' },
      ],
    });
  };

  const removeColor = (index: number) => {
    if (formData.color_palette.length <= 1) return;
    update({ color_palette: formData.color_palette.filter((_, i) => i !== index) });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('brandBookId', brandBookId);
      fd.append('type', 'logo');

      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');

      const { url } = await res.json();
      update({ logo_url: url });
    } catch {
      // Upload error handled silently; user can retry
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Visual Identity</h2>
          <p className="text-sm text-gray-500 mt-1">
            Define the visual elements: logo, colors, typography, and imagery style.
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

      {/* Logo Upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Logo</label>
        <div className="flex items-center gap-4">
          {formData.logo_url ? (
            <div className="relative">
              <img
                src={formData.logo_url}
                alt="Brand logo"
                className="h-24 w-24 object-contain border border-gray-200 rounded-lg p-2"
              />
              <button
                onClick={() => update({ logo_url: '' })}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-24 w-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 transition-colors">
              {uploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
              ) : (
                <>
                  <Upload className="h-6 w-6 text-gray-400" />
                  <span className="text-xs text-gray-400 mt-1">Upload</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          )}
          <p className="text-sm text-gray-500">
            Upload your brand logo. Supported formats: PNG, SVG, JPG.
          </p>
        </div>
      </div>

      {/* Color Palette */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Color Palette
        </label>
        <div className="space-y-3">
          {formData.color_palette.map((color, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) => updateColor(idx, 'hex', e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer border border-gray-300"
                />
                <input
                  type="text"
                  value={color.hex}
                  onChange={(e) => updateColor(idx, 'hex', e.target.value)}
                  className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded-lg font-mono"
                  placeholder="#000000"
                />
              </div>
              <select
                value={color.role}
                onChange={(e) => updateColor(idx, 'role', e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="tertiary">Tertiary</option>
                <option value="accent">Accent</option>
              </select>
              <input
                type="text"
                value={color.usage_percentage}
                onChange={(e) => updateColor(idx, 'usage_percentage', e.target.value)}
                placeholder="Usage %"
                className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                value={color.emotional_meaning}
                onChange={(e) => updateColor(idx, 'emotional_meaning', e.target.value)}
                placeholder="Emotional meaning"
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
              />
              {formData.color_palette.length > 1 && (
                <button
                  onClick={() => removeColor(idx)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addColor}
          className="mt-2 inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
        >
          <Plus className="h-4 w-4" />
          Add Color
        </button>
      </div>

      {/* Typography */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <label className="block text-sm font-medium text-gray-700">Typography</label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Primary Font</label>
            <input
              type="text"
              value={formData.primary_font}
              onChange={(e) => update({ primary_font: e.target.value })}
              placeholder="e.g., Inter, Playfair Display"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Secondary Font</label>
            <input
              type="text"
              value={formData.secondary_font}
              onChange={(e) => update({ secondary_font: e.target.value })}
              placeholder="e.g., Roboto, Georgia"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Typography Hierarchy Notes
          </label>
          <textarea
            value={formData.typography_hierarchy_notes}
            onChange={(e) => update({ typography_hierarchy_notes: e.target.value })}
            placeholder="Describe heading sizes, weights, line heights, usage rules..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>
      </div>

      {/* Photography & Iconography */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Photography Style
          </label>
          <textarea
            value={formData.photography_style}
            onChange={(e) => update({ photography_style: e.target.value })}
            placeholder="Describe the photography style: mood, composition, lighting, subject matter..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Iconography Notes
          </label>
          <textarea
            value={formData.iconography_notes}
            onChange={(e) => update({ iconography_notes: e.target.value })}
            placeholder="Icon style preferences: line vs filled, rounded vs sharp, size guidelines..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>
      </div>
    </div>
  );
}
