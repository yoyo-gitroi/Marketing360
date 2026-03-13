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

interface Persona {
  name: string;
  age: string;
  occupation: string;
  description: string;
}

interface Demographics {
  age_range: string;
  gender: string;
  location: string;
  income_level: string;
  education: string;
}

interface FormState {
  primary_tg: Demographics;
  secondary_tg: Demographics;
  psychographics_lifestyle: string;
  psychographics_pain_points: string;
  psychographics_aspirations: string;
  personas: Persona[];
  search_keywords: string[];
  sentiment_notes: string;
  hierarchy_of_use: string;
}

interface TargetAudienceStepProps {
  sectionData: SectionData | null;
  onSave: (userInput: Record<string, unknown>) => Promise<void>;
  brandBookId: string;
}

const EMPTY_DEMOGRAPHICS: Demographics = {
  age_range: '',
  gender: '',
  location: '',
  income_level: '',
  education: '',
};

const EMPTY_PERSONA: Persona = {
  name: '',
  age: '',
  occupation: '',
  description: '',
};

const INITIAL_STATE: FormState = {
  primary_tg: { ...EMPTY_DEMOGRAPHICS },
  secondary_tg: { ...EMPTY_DEMOGRAPHICS },
  psychographics_lifestyle: '',
  psychographics_pain_points: '',
  psychographics_aspirations: '',
  personas: [{ ...EMPTY_PERSONA }],
  search_keywords: [],
  sentiment_notes: '',
  hierarchy_of_use: '',
};

export default function TargetAudienceStep({
  sectionData,
  onSave,
}: TargetAudienceStepProps) {
  const [formData, setFormData] = useState<FormState>(INITIAL_STATE);
  const [newKeyword, setNewKeyword] = useState('');
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sectionData?.user_input) {
      const input = sectionData.user_input as unknown as Partial<FormState>;
      setFormData({
        primary_tg: { ...EMPTY_DEMOGRAPHICS, ...(input.primary_tg as Demographics) },
        secondary_tg: { ...EMPTY_DEMOGRAPHICS, ...(input.secondary_tg as Demographics) },
        psychographics_lifestyle: input.psychographics_lifestyle || '',
        psychographics_pain_points: input.psychographics_pain_points || '',
        psychographics_aspirations: input.psychographics_aspirations || '',
        personas:
          input.personas && (input.personas as Persona[]).length > 0
            ? (input.personas as Persona[])
            : [{ ...EMPTY_PERSONA }],
        search_keywords: input.search_keywords || [],
        sentiment_notes: input.sentiment_notes || '',
        hierarchy_of_use: input.hierarchy_of_use || '',
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

  const updateDemographics = (
    target: 'primary_tg' | 'secondary_tg',
    field: keyof Demographics,
    value: string
  ) => {
    update({ [target]: { ...formData[target], [field]: value } });
  };

  const addPersona = () => {
    if (formData.personas.length >= 3) return;
    update({ personas: [...formData.personas, { ...EMPTY_PERSONA }] });
  };

  const updatePersona = (index: number, field: keyof Persona, value: string) => {
    const personas = [...formData.personas];
    personas[index] = { ...personas[index], [field]: value };
    update({ personas });
  };

  const removePersona = (index: number) => {
    if (formData.personas.length <= 1) return;
    update({ personas: formData.personas.filter((_, i) => i !== index) });
  };

  const addKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !formData.search_keywords.includes(trimmed)) {
      update({ search_keywords: [...formData.search_keywords, trimmed] });
      setNewKeyword('');
    }
  };

  const removeKeyword = (val: string) => {
    update({ search_keywords: formData.search_keywords.filter((v) => v !== val) });
  };

  const DemographicsFields = ({
    label,
    target,
  }: {
    label: string;
    target: 'primary_tg' | 'secondary_tg';
  }) => (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 mb-3">{label}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Age Range</label>
          <input
            type="text"
            value={formData[target].age_range}
            onChange={(e) => updateDemographics(target, 'age_range', e.target.value)}
            placeholder="e.g., 25-40"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Gender</label>
          <input
            type="text"
            value={formData[target].gender}
            onChange={(e) => updateDemographics(target, 'gender', e.target.value)}
            placeholder="e.g., All, Female, Male"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Location</label>
          <input
            type="text"
            value={formData[target].location}
            onChange={(e) => updateDemographics(target, 'location', e.target.value)}
            placeholder="e.g., Urban India, Tier 1 cities"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Income Level</label>
          <input
            type="text"
            value={formData[target].income_level}
            onChange={(e) => updateDemographics(target, 'income_level', e.target.value)}
            placeholder="e.g., Upper-middle class"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Education</label>
          <input
            type="text"
            value={formData[target].education}
            onChange={(e) => updateDemographics(target, 'education', e.target.value)}
            placeholder="e.g., College-educated"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Target Audience</h2>
          <p className="text-sm text-gray-500 mt-1">
            Define demographics, psychographics, and buyer personas.
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

      {/* Demographics */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <DemographicsFields label="Primary Target Group" target="primary_tg" />
        <hr className="border-gray-200" />
        <DemographicsFields label="Secondary Target Group" target="secondary_tg" />
      </div>

      {/* Psychographics */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">Psychographics</h3>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Lifestyle</label>
          <textarea
            value={formData.psychographics_lifestyle}
            onChange={(e) => update({ psychographics_lifestyle: e.target.value })}
            placeholder="Describe the lifestyle of your target audience..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Pain Points</label>
          <textarea
            value={formData.psychographics_pain_points}
            onChange={(e) => update({ psychographics_pain_points: e.target.value })}
            placeholder="What problems does your audience face?"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Aspirations</label>
          <textarea
            value={formData.psychographics_aspirations}
            onChange={(e) => update({ psychographics_aspirations: e.target.value })}
            placeholder="What does your audience aspire to?"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y text-sm"
          />
        </div>
      </div>

      {/* Personas */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">
            Personas (up to 3)
          </h3>
          {formData.personas.length < 3 && (
            <button
              onClick={addPersona}
              className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
            >
              <Plus className="h-4 w-4" />
              Add Persona
            </button>
          )}
        </div>
        <div className="space-y-4">
          {formData.personas.map((persona, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded-lg relative">
              {formData.personas.length > 1 && (
                <button
                  onClick={() => removePersona(idx)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name</label>
                  <input
                    type="text"
                    value={persona.name}
                    onChange={(e) => updatePersona(idx, 'name', e.target.value)}
                    placeholder="e.g., Priya"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Age</label>
                  <input
                    type="text"
                    value={persona.age}
                    onChange={(e) => updatePersona(idx, 'age', e.target.value)}
                    placeholder="e.g., 32"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Occupation</label>
                  <input
                    type="text"
                    value={persona.occupation}
                    onChange={(e) => updatePersona(idx, 'occupation', e.target.value)}
                    placeholder="e.g., Marketing Manager"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <textarea
                  value={persona.description}
                  onChange={(e) => updatePersona(idx, 'description', e.target.value)}
                  placeholder="Describe this persona's background, motivations, behaviors..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Keywords */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Keywords
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.search_keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
            >
              {kw}
              <button onClick={() => removeKeyword(kw)} className="hover:text-indigo-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            placeholder="Add a keyword and press Enter"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={addKeyword}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Sentiment & Hierarchy */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sentiment Notes
          </label>
          <textarea
            value={formData.sentiment_notes}
            onChange={(e) => update({ sentiment_notes: e.target.value })}
            placeholder="How does the audience currently feel about the brand/category?"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hierarchy of Use
          </label>
          <textarea
            value={formData.hierarchy_of_use}
            onChange={(e) => update({ hierarchy_of_use: e.target.value })}
            placeholder="Describe the order of priority in product/service usage..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>
      </div>
    </div>
  );
}
