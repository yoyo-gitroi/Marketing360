'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import StepWizard from '@/components/brand-book/StepWizard';
import AIGenerateButton from '@/components/brand-book/AIGenerateButton';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Download,
  FileText,
  CheckCircle2,
  Circle,
} from 'lucide-react';

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
  client_id: string | null;
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
  const [clientWebsite, setClientWebsite] = useState('');
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

      const bookData = bookRes.data as BrandBook;
      setBrandBook(bookData);
      setSections(sectionsRes.data as BrandBookSection[]);
      setCurrentStep(bookData.current_step || 1);

      if (bookData.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('website')
          .eq('id', bookData.client_id)
          .single();
        if (client?.website) setClientWebsite(client.website);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brand book');
    } finally {
      setLoading(false);
    }
  }, [brandBookId]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
    try {
      const { data } = await supabase
        .from('brand_book_sections')
        .select('*')
        .eq('brand_book_id', brandBookId)
        .order('section_key');
      if (data) setSections(data as BrandBookSection[]);
    } catch {
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

  const isStepCompleted = (stepIdx: number) => {
    const key = SECTION_KEYS[stepIdx];
    const section = sections.find((s) => s.section_key === key);
    return section && Object.keys(section.user_input || {}).length > 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error && !brandBook) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600">{error}</p>
        <button onClick={() => router.push('/brand-books')} className="text-indigo-600 hover:underline">
          Back to Brand Books
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Left Sidebar Navigation ── */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Back + Brand Book name */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <button
            onClick={() => router.push('/brand-books')}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-2 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Brand Books
          </button>
          <h1 className="text-sm font-semibold text-gray-900 leading-tight truncate">
            {brandBook?.name || 'Brand Book'}
          </h1>
          {brandBook?.client_name && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{brandBook.client_name}</p>
          )}
        </div>

        {/* Steps list */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {STEP_LABELS.map((label, idx) => {
            const step = idx + 1;
            const completed = isStepCompleted(idx);
            const isCurrent = step === currentStep;
            const sectionKey = SECTION_KEYS[idx];
            const section = sections.find((s) => s.section_key === sectionKey);
            const aiDone = section?.ai_status === 'generated' || section?.ai_status === 'completed';

            return (
              <button
                key={label}
                onClick={() => handleStepChange(step)}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-left transition-all
                  ${isCurrent
                    ? 'bg-indigo-50 text-indigo-700'
                    : completed
                      ? 'text-gray-700 hover:bg-gray-50'
                      : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                  }
                `}
              >
                {/* Step indicator */}
                <span className="flex-shrink-0">
                  {completed && !isCurrent ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-green-500" style={{ width: 18, height: 18 }} />
                  ) : isCurrent ? (
                    <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                      {step}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full border-2 border-gray-200 text-[10px] font-medium text-gray-400">
                      {step}
                    </span>
                  )}
                </span>

                <span className={`text-xs font-medium leading-tight flex-1 ${isCurrent ? 'text-indigo-700' : ''}`}>
                  {label}
                </span>

                {/* AI sparkle dot */}
                {aiDone && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" title="AI generated" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Export buttons at bottom */}
        <div className="p-3 border-t border-gray-100 space-y-1.5">
          {saving && (
            <p className="text-xs text-center text-gray-400 animate-pulse mb-1">Saving...</p>
          )}
          <button
            onClick={() => window.open(`/brand-books/${brandBookId}/pdf`, '_blank')}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            Export PDF
          </button>
          <button
            onClick={handleExportPPTX}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'Exporting...' : 'Export PPTX'}
          </button>
          <AIGenerateButton
            brandBookId={brandBookId}
            sectionKey={currentSectionKey}
            onGenerated={handleAIGenerated}
            defaultDomain={clientWebsite}
          />
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar — step label + status */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
              Step {currentStep} of 8
            </p>
            <h2 className="text-base font-semibold text-gray-900 mt-0.5">
              {STEP_LABELS[currentStep - 1]}
            </h2>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="w-32 bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 8) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{Math.round((currentStep / 8) * 100)}%</span>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline text-xs">Dismiss</button>
          </div>
        )}

        {/* Step Content */}
        <main className="flex-1 overflow-y-auto px-6 py-5 pb-20">
          <StepWizard
            brandBookId={brandBookId}
            currentStep={currentStep}
            sections={sections}
            onStepChange={handleStepChange}
            onSave={handleSave}
          />
        </main>

        {/* Bottom Navigation Footer */}
        <footer className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => handleStepChange(currentStep - 1)}
            disabled={currentStep === 1}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <span className="text-xs text-gray-400">
            {STEP_LABELS[currentStep - 1]}
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              <Check className="h-4 w-4" />
              Complete
            </button>
          ) : (
            <button
              onClick={() => handleStepChange(currentStep + 1)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
