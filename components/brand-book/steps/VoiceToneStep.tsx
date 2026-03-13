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

interface ChannelTone {
  channel: string;
  tone_description: string;
}

interface FormState {
  voice_attributes: string[];
  dos: string;
  donts: string;
  formality_scale: number;
  tone_by_channel: ChannelTone[];
  key_messages: string;
  elevator_pitch: string;
  boilerplate: string;
}

interface VoiceToneStepProps {
  sectionData: SectionData | null;
  onSave: (userInput: Record<string, unknown>) => Promise<void>;
  brandBookId: string;
}

const INITIAL_STATE: FormState = {
  voice_attributes: [],
  dos: '',
  donts: '',
  formality_scale: 5,
  tone_by_channel: [{ channel: '', tone_description: '' }],
  key_messages: '',
  elevator_pitch: '',
  boilerplate: '',
};

export default function VoiceToneStep({
  sectionData,
  onSave,
}: VoiceToneStepProps) {
  const [formData, setFormData] = useState<FormState>(INITIAL_STATE);
  const [newAttribute, setNewAttribute] = useState('');
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sectionData?.user_input) {
      const input = sectionData.user_input as unknown as Partial<FormState>;
      setFormData({
        voice_attributes: input.voice_attributes || [],
        dos: input.dos || '',
        donts: input.donts || '',
        formality_scale: input.formality_scale ?? 5,
        tone_by_channel:
          input.tone_by_channel && (input.tone_by_channel as ChannelTone[]).length > 0
            ? (input.tone_by_channel as ChannelTone[])
            : [{ channel: '', tone_description: '' }],
        key_messages: input.key_messages || '',
        elevator_pitch: input.elevator_pitch || '',
        boilerplate: input.boilerplate || '',
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

  const addAttribute = () => {
    const trimmed = newAttribute.trim();
    if (trimmed && !formData.voice_attributes.includes(trimmed)) {
      update({ voice_attributes: [...formData.voice_attributes, trimmed] });
      setNewAttribute('');
    }
  };

  const removeAttribute = (val: string) => {
    update({ voice_attributes: formData.voice_attributes.filter((v) => v !== val) });
  };

  const addChannelTone = () => {
    update({
      tone_by_channel: [...formData.tone_by_channel, { channel: '', tone_description: '' }],
    });
  };

  const updateChannelTone = (index: number, field: keyof ChannelTone, value: string) => {
    const list = [...formData.tone_by_channel];
    list[index] = { ...list[index], [field]: value };
    update({ tone_by_channel: list });
  };

  const removeChannelTone = (index: number) => {
    if (formData.tone_by_channel.length <= 1) return;
    update({ tone_by_channel: formData.tone_by_channel.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Voice & Tone</h2>
          <p className="text-sm text-gray-500 mt-1">
            Define how the brand speaks and communicates across channels.
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

      {/* Voice Attributes (tags) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Brand Voice Attributes (3-5 adjectives)
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.voice_attributes.map((attr) => (
            <span
              key={attr}
              className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
            >
              {attr}
              <button onClick={() => removeAttribute(attr)} className="hover:text-indigo-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newAttribute}
            onChange={(e) => setNewAttribute(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAttribute())}
            placeholder="e.g., Warm, Professional, Playful..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={addAttribute}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Do's and Don'ts */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-green-700 mb-1">
              Do&apos;s
            </label>
            <textarea
              value={formData.dos}
              onChange={(e) => update({ dos: e.target.value })}
              placeholder="What the brand voice should do..."
              rows={5}
              className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-red-700 mb-1">
              Don&apos;ts
            </label>
            <textarea
              value={formData.donts}
              onChange={(e) => update({ donts: e.target.value })}
              placeholder="What the brand voice should avoid..."
              rows={5}
              className="w-full px-3 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-y"
            />
          </div>
        </div>
      </div>

      {/* Formality Scale */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Formality Scale
        </label>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 w-20">Casual</span>
          <input
            type="range"
            min={1}
            max={10}
            value={formData.formality_scale}
            onChange={(e) => update({ formality_scale: parseInt(e.target.value) })}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-sm text-gray-500 w-20 text-right">Formal</span>
          <span className="ml-2 text-sm font-semibold text-indigo-600 w-8 text-center">
            {formData.formality_scale}
          </span>
        </div>
      </div>

      {/* Tone by Channel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tone by Channel
        </label>
        <div className="space-y-3">
          {formData.tone_by_channel.map((item, idx) => (
            <div key={idx} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={item.channel}
                onChange={(e) => updateChannelTone(idx, 'channel', e.target.value)}
                placeholder="Channel (e.g., Instagram, Email)"
                className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <textarea
                value={item.tone_description}
                onChange={(e) => updateChannelTone(idx, 'tone_description', e.target.value)}
                placeholder="Describe the tone for this channel..."
                rows={2}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
              />
              {formData.tone_by_channel.length > 1 && (
                <button
                  onClick={() => removeChannelTone(idx)}
                  className="text-gray-400 hover:text-red-500 mt-2"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addChannelTone}
          className="mt-2 inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
        >
          <Plus className="h-4 w-4" />
          Add Channel
        </button>
      </div>

      {/* Key Messages, Elevator Pitch, Boilerplate */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Key Messages
          </label>
          <textarea
            value={formData.key_messages}
            onChange={(e) => update({ key_messages: e.target.value })}
            placeholder="The most important messages the brand needs to convey..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Elevator Pitch
          </label>
          <textarea
            value={formData.elevator_pitch}
            onChange={(e) => update({ elevator_pitch: e.target.value })}
            placeholder="A 30-second pitch that explains the brand..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Boilerplate
          </label>
          <textarea
            value={formData.boilerplate}
            onChange={(e) => update({ boilerplate: e.target.value })}
            placeholder="Standard company description used in press releases, bios, etc."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>
      </div>
    </div>
  );
}
