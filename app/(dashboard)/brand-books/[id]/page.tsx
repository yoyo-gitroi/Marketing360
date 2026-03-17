'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import StepWizard from '@/components/brand-book/StepWizard';
import AIGenerateButton from '@/components/brand-book/AIGenerateButton';
import { ChevronLeft, ChevronRight, Check, Download, FileText, Sparkles } from 'lucide-react';

const SECTION_KEYS = [
  'brand_identity',
  'values_pillars',
  'visual_identity',
  'voice_tone',
  'target_audience',
  'product_info',
  'brand_history',
  'research_synthesis',
] as const;

const STEP_LABELS = [
  'Brand Identity',
  'Values & Pillars',
  'Visual Identity',
  'Voice & Tone',
  'Target Audience',
  'Product Info',
  'Brand History',
  'Research Synthesis',
];

type SectionKey = (typeof SECTION_KEYS)[number];

interface BrandBook {
  id: string;
  name: string;
  client_name: string | null;
  status: string;
  current_step: number;
}

interface BrandBookSection {
  id: string;
  brand_book_id: string;
  section_key: SectionKey;
  user_input: Record<string, unknown>;
  ai_generated: Record<string, unknown>;
  final_content: Record<string, unknown>;
  ai_status: string;
}

export default function BrandBookEditorPage() {
  const params = useParams();
  const router = useRouter();
  const brandBookId = params.id as string;

  const [brandBook, setBrandBook] = useState<BrandBook | null>(null);
  const [sections, setSections] = useState<BrandBookSection[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [bookRes, sectionsRes] = await Promise.all([
        supabase.from('brand_books').select('*').eq('id', brandBookId).single(),
        supabase
          .from('brand_book_sections')
          .select('*')
          .eq('brand_book_id', brandBookId)
          .order('section_key'),
      ]);

      if (bookRes.error) throw bookRes.error;
      if (sectionsRes.error) throw sectionsRes.error;

      setBrandBook(bookRes.data as BrandBook);
      setSections(sectionsRes.data as BrandBookSection[]);
      setCurrentStep(bookRes.data.current_step || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brand book');
    } finally {
      setLoading(false);
    }
  }, [brandBookId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = useCallback(
    async (sectionKey: SectionKey, userInput: Record<string, unknown>) => {
      setSaving(true);
      try {
        const existing = sections.find((s) => s.section_key === sectionKey);

        if (existing) {
          const { error } = await supabase
            .from('brand_book_sections')
            .update({ user_input: userInput, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('brand_book_sections').insert({
            brand_book_id: brandBookId,
            section_key: sectionKey,
            user_input: userInput,
          });
          if (error) throw error;
        }

        await supabase
          .from('brand_books')
          .update({ current_step: currentStep, updated_at: new Date().toISOString() })
          .eq('id', brandBookId);

        const { data } = await supabase
          .from('brand_book_sections')
          .select('*')
          .eq('brand_book_id', brandBookId)
          .order('section_key');
        if (data) setSections(data as BrandBookSection[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        setSaving(false);
      }
    },
    [brandBookId, currentStep, sections]
  );

  const handleStepChange = useCallback(
    async (step: number) => {
      if (step >= 1 && step <= 8) {
        setCurrentStep(step);
        await supabase
          .from('brand_books')
          .update({ current_step: step, updated_at: new Date().toISOString() })
          .eq('id', brandBookId);
      }
    },
    [brandBookId]
  );

  const handleAIGenerated = useCallback(async () => {
    // Silently refresh sections without showing full page loading spinner
    try {
      const { data } = await supabase
        .from('brand_book_sections')
        .select('*')
        .eq('brand_book_id', brandBookId)
        .order('section_key');
      if (data) setSections(data as BrandBookSection[]);
    } catch {
      // Fallback to full refresh
      fetchData();
    }
  }, [brandBookId, fetchData]);

  const handleExportPPTX = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch('/api/brand-books/export-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandBookId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Export failed');
      }

      // Download the file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${brandBook?.name || 'brand-book'}_Brand_Book.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }, [brandBookId, brandBook?.name]);

  const currentSectionKey = SECTION_KEYS[currentStep - 1];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error && !brandBook) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => router.push('/brand-books')}
          className="text-indigo-600 hover:underline"
        >
          Back to Brand Books
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/brand-books')}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {brandBook?.name || 'Brand Book'}
              </h1>
              {brandBook?.client_name && (
                <p className="text-sm text-gray-500">{brandBook.client_name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saving && (
              <span className="text-sm text-gray-400 animate-pulse">Saving...</span>
            )}

            <button
              onClick={() => window.open(`/brand-books/${brandBookId}/pdf`, '_blank')}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </button>

            <button
              onClick={handleExportPPTX}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export PPTX'}
            </button>

            <AIGenerateButton
              brandBookId={brandBookId}
              sectionKey={currentSectionKey}
              onGenerated={handleAIGenerated}
            />
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto">
          <ProgressIndicator
            steps={STEP_LABELS}
            currentStep={currentStep}
            completedSteps={SECTION_KEYS.map((key, idx) => {
              const section = sections.find((s) => s.section_key === key);
              return section && Object.keys(section.user_input).length > 0
                ? idx + 1
                : -1;
            }).filter((s) => s > 0)}
            onStepClick={handleStepChange}
            sections={sections}
          />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Step Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <StepWizard
          brandBookId={brandBookId}
          currentStep={currentStep}
          sections={sections}
          onStepChange={handleStepChange}
          onSave={handleSave}
        />
      </main>

      {/* Navigation Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => handleStepChange(currentStep - 1)}
            disabled={currentStep === 1}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <span className="text-sm text-gray-500">
            Step {currentStep} of 8: {STEP_LABELS[currentStep - 1]}
          </span>

          {currentStep === 8 ? (
            <button
              onClick={async () => {
                await supabase
                  .from('brand_books')
                  .update({ status: 'completed', updated_at: new Date().toISOString() })
                  .eq('id', brandBookId);
                router.push('/brand-books');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Check className="h-4 w-4" />
              Complete
            </button>
          ) : (
            <button
              onClick={() => handleStepChange(currentStep + 1)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

/* ─── Progress Indicator ─── */
function ProgressIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  sections,
}: {
  steps: string[];
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  sections: BrandBookSection[];
}) {
  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {steps.map((label, idx) => {
        const step = idx + 1;
        const isCompleted = completedSteps.includes(step);
        const isCurrent = step === currentStep;
        const sectionKey = SECTION_KEYS[idx];
        const section = sections.find((s) => s.section_key === sectionKey);
        const aiStatus = section?.ai_status || 'pending';

        return (
          <button
            key={label}
            onClick={() => onStepClick(step)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
              ${isCurrent ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' : ''}
              ${isCompleted && !isCurrent ? 'text-green-700 hover:bg-green-50' : ''}
              ${!isCompleted && !isCurrent ? 'text-gray-500 hover:bg-gray-100' : ''}
            `}
          >
            <span
              className={`
                flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold
                ${isCurrent ? 'bg-indigo-600 text-white' : ''}
                ${isCompleted && !isCurrent ? 'bg-green-500 text-white' : ''}
                ${!isCompleted && !isCurrent ? 'bg-gray-300 text-white' : ''}
              `}
            >
              {isCompleted && !isCurrent ? '✓' : step}
            </span>
            <span className="hidden sm:inline">{label}</span>
            {aiStatus === 'completed' && (
              <Sparkles className="h-3 w-3 text-purple-500" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
