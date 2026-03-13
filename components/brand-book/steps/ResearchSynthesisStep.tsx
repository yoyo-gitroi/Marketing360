'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, ChevronRight } from 'lucide-react';
import FounderQuestionBank from '../FounderQuestionBank';

interface SectionData {
  id: string;
  section_key: string;
  user_input: Record<string, unknown>;
  ai_generated: Record<string, unknown>;
  final_content: Record<string, unknown>;
  ai_status: string;
}

interface FormState {
  founder_interview_notes: string;
  india_competition_notes: string;
  us_global_competition_notes: string;
  own_usp_reframing_thoughts: string;
  brand_story_draft_ideas: string;
}

interface ResearchSynthesisStepProps {
  sectionData: SectionData | null;
  onSave: (userInput: Record<string, unknown>) => Promise<void>;
  brandBookId: string;
}

const INITIAL_STATE: FormState = {
  founder_interview_notes: '',
  india_competition_notes: '',
  us_global_competition_notes: '',
  own_usp_reframing_thoughts: '',
  brand_story_draft_ideas: '',
};

export default function ResearchSynthesisStep({
  sectionData,
  onSave,
}: ResearchSynthesisStepProps) {
  const [formData, setFormData] = useState<FormState>(INITIAL_STATE);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sectionData?.user_input) {
      const input = sectionData.user_input as unknown as Partial<FormState>;
      setFormData({
        founder_interview_notes: input.founder_interview_notes || '',
        india_competition_notes: input.india_competition_notes || '',
        us_global_competition_notes: input.us_global_competition_notes || '',
        own_usp_reframing_thoughts: input.own_usp_reframing_thoughts || '',
        brand_story_draft_ideas: input.brand_story_draft_ideas || '',
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

  return (
    <div className="flex gap-6">
      {/* Main form */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Research Synthesis</h2>
            <p className="text-sm text-gray-500 mt-1">
              Capture founder insights, competitive analysis, and brand story ideas.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowQuestionBank(!showQuestionBank)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors"
            >
              <ChevronRight
                className={`h-3.5 w-3.5 transition-transform ${
                  showQuestionBank ? 'rotate-180' : ''
                }`}
              />
              Question Bank
            </button>
            <button
              onClick={() => onSave(formData as unknown as Record<string, unknown>)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
          </div>
        </div>

        {/* Founder Interview Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Founder Interview Notes
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Use the Question Bank sidebar for interview prompts. Paste notes here.
          </p>
          <textarea
            value={formData.founder_interview_notes}
            onChange={(e) => update({ founder_interview_notes: e.target.value })}
            placeholder="Paste or type your founder interview notes here..."
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>

        {/* India Competition Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            India Competition Notes
          </label>
          <textarea
            value={formData.india_competition_notes}
            onChange={(e) => update({ india_competition_notes: e.target.value })}
            placeholder="What does the competitive landscape look like in India? Key players, trends, gaps..."
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>

        {/* US/Global Competition Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            US / Global Competition Notes
          </label>
          <textarea
            value={formData.us_global_competition_notes}
            onChange={(e) => update({ us_global_competition_notes: e.target.value })}
            placeholder="Global competitors, international trends, what can be adapted..."
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>

        {/* Own USP Reframing Thoughts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Own USP Reframing Thoughts
          </label>
          <textarea
            value={formData.own_usp_reframing_thoughts}
            onChange={(e) => update({ own_usp_reframing_thoughts: e.target.value })}
            placeholder="How might the USP be reframed for different audiences or contexts?"
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>

        {/* Brand Story Draft Ideas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand Story Draft Ideas
          </label>
          <textarea
            value={formData.brand_story_draft_ideas}
            onChange={(e) => update({ brand_story_draft_ideas: e.target.value })}
            placeholder="Initial ideas for the brand narrative, origin story arcs, key emotional hooks..."
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>
      </div>

      {/* Collapsible Sidebar */}
      {showQuestionBank && (
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-6">
            <FounderQuestionBank />
          </div>
        </div>
      )}
    </div>
  );
}
