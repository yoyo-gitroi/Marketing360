'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ChevronLeft, ChevronRight, Sparkles, Loader2, Check, CheckCircle2 } from 'lucide-react';

import CampaignBriefStage from '@/components/campaign/stages/CampaignBriefStage';
import BrandReferenceStage from '@/components/campaign/stages/BrandReferenceStage';
import MarketResearchStage from '@/components/campaign/stages/MarketResearchStage';
import CustomerIntelStage from '@/components/campaign/stages/CustomerIntelStage';
import PlatformChannelStage from '@/components/campaign/stages/PlatformChannelStage';
import HistoricalDataStage from '@/components/campaign/stages/HistoricalDataStage';
import ResourcesStage from '@/components/campaign/stages/ResourcesStage';
import HypothesisStage from '@/components/campaign/stages/HypothesisStage';
import IdeationRoomStage from '@/components/campaign/stages/IdeationRoomStage';

const STAGE_KEYS = [
  'campaign_brief',
  'brand_reference',
  'market_research',
  'customer_intel',
  'platform_channel',
  'historical_data',
  'resources',
  'hypothesis',
  'ideation_room',
] as const;

const STAGE_LABELS = [
  'Campaign Brief',
  'Brand Reference',
  'Market Research',
  'Customer Intel',
  'Platform & Channel',
  'Historical Data',
  'Resources',
  'Hypothesis',
  'Ideation Room',
];

type StageKey = (typeof STAGE_KEYS)[number];

const STAGE_COMPONENTS: Record<StageKey, React.ComponentType<any>> = {
  campaign_brief: CampaignBriefStage,
  brand_reference: BrandReferenceStage,
  market_research: MarketResearchStage,
  customer_intel: CustomerIntelStage,
  platform_channel: PlatformChannelStage,
  historical_data: HistoricalDataStage,
  resources: ResourcesStage,
  hypothesis: HypothesisStage,
  ideation_room: IdeationRoomStage,
};

interface Campaign {
  id: string;
  name: string;
  client_name: string | null;
  status: string;
  current_stage: number | null;
  brand_book_id: string | null;
}

interface CampaignStage {
  id: string;
  campaign_id: string;
  stage_key: string;
  stage_number: number;
  user_input: Record<string, unknown>;
  ai_generated: Record<string, unknown>;
  final_content: Record<string, unknown>;
  ai_status: string;
}

export default function CampaignEditorPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const supabase = createClient();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stages, setStages] = useState<CampaignStage[]>([]);
  const [brandSections, setBrandSections] = useState<Record<string, unknown>[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [hasOutput, setHasOutput] = useState(false);

  const totalSteps = STAGE_KEYS.length;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [campaignRes, stagesRes] = await Promise.all([
        supabase.from('campaigns').select('*').eq('id', campaignId).single(),
        supabase.from('campaign_stages').select('*').eq('campaign_id', campaignId).order('stage_number'),
      ]);

      if (campaignRes.error) throw campaignRes.error;
      if (stagesRes.error) throw stagesRes.error;

      const campaignData = campaignRes.data as Campaign;
      setCampaign(campaignData);
      setStages(stagesRes.data as CampaignStage[]);
      setCurrentStep(campaignData.current_stage || 1);

      if (campaignData.status === 'completed') {
        const { data: outputs } = await supabase
          .from('campaign_outputs').select('id').eq('campaign_id', campaignId).limit(1);
        if (outputs && outputs.length > 0) setHasOutput(true);
      }

      if (campaignData.brand_book_id) {
        const { data: bbSections } = await supabase
          .from('brand_book_sections')
          .select('section_key, user_input, ai_generated, final_content')
          .eq('brand_book_id', campaignData.brand_book_id);

        if (bbSections) {
          setBrandSections(bbSections.map((s: Record<string, unknown>) => ({
            section_key: s.section_key,
            final_content: (s.final_content && typeof s.final_content === 'object' && Object.keys(s.final_content as object).length > 0)
              ? s.final_content
              : (s.user_input && typeof s.user_input === 'object' && Object.keys(s.user_input as object).length > 0)
                ? s.user_input
                : s.ai_generated || {},
          })));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = useCallback(
    async (stageKey: string, data: Record<string, unknown>) => {
      setSaving(true);
      try {
        const existing = stages.find((s) => s.stage_key === stageKey);
        if (existing) {
          const { error } = await supabase
            .from('campaign_stages')
            .update({ user_input: data, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('campaign_stages').insert({
            campaign_id: campaignId,
            stage_key: stageKey,
            stage_number: currentStep,
            user_input: data,
          });
          if (error) throw error;
        }
        await supabase
          .from('campaigns')
          .update({ current_stage: currentStep, updated_at: new Date().toISOString() })
          .eq('id', campaignId);
        const { data: updatedStages } = await supabase
          .from('campaign_stages').select('*').eq('campaign_id', campaignId).order('stage_number');
        if (updatedStages) setStages(updatedStages as CampaignStage[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        setSaving(false);
      }
    },
    [campaignId, currentStep, stages]
  );

  const handleStepChange = useCallback(
    async (step: number) => {
      if (step >= 1 && step <= totalSteps) {
        setCurrentStep(step);
        await supabase
          .from('campaigns')
          .update({ current_stage: step, updated_at: new Date().toISOString() })
          .eq('id', campaignId);
      }
    },
    [campaignId, totalSteps]
  );

  const handleAIGenerate = useCallback(async () => {
    const stageKey = STAGE_KEYS[currentStep - 1];
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/generate-campaign-output', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, stageKey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'AI generation failed');
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setAiLoading(false);
    }
  }, [campaignId, currentStep, fetchData]);

  const handleCompleteCampaign = useCallback(async () => {
    setCompletionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/campaigns/generate-output', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate campaign output');
      }
      router.push(`/campaigns/${campaignId}/output`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Output generation failed');
    } finally {
      setCompletionLoading(false);
    }
  }, [campaignId, router]);

  const isStageCompleted = (idx: number) => {
    const key = STAGE_KEYS[idx];
    const stage = stages.find((s) => s.stage_key === key);
    return stage && Object.keys(stage.user_input || {}).length > 0;
  };

  const currentStageKey = STAGE_KEYS[currentStep - 1];
  const currentStageData = stages.find((s) => s.stage_key === currentStageKey);
  const StageComponent = STAGE_COMPONENTS[currentStageKey];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600">{error}</p>
        <button onClick={() => router.push('/campaigns')} className="text-blue-600 hover:underline">
          Back to Campaigns
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Left Sidebar Navigation ── */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Back + Campaign name */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <button
            onClick={() => router.push('/campaigns')}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-2 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Campaigns
          </button>
          <h1 className="text-sm font-semibold text-gray-900 leading-tight truncate">
            {campaign?.name || 'Campaign'}
          </h1>
          {campaign?.client_name && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{campaign.client_name}</p>
          )}
        </div>

        {/* Stage list */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {STAGE_LABELS.map((label, idx) => {
            const step = idx + 1;
            const completed = isStageCompleted(idx);
            const isCurrent = step === currentStep;
            const stageKey = STAGE_KEYS[idx];
            const stage = stages.find((s) => s.stage_key === stageKey);
            const aiDone = stage?.ai_status === 'completed';

            return (
              <button
                key={label}
                onClick={() => handleStepChange(step)}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-left transition-all
                  ${isCurrent
                    ? 'bg-blue-50 text-blue-700'
                    : completed
                      ? 'text-gray-700 hover:bg-gray-50'
                      : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                  }
                `}
              >
                <span className="flex-shrink-0">
                  {completed && !isCurrent ? (
                    <CheckCircle2 style={{ width: 18, height: 18 }} className="text-green-500" />
                  ) : isCurrent ? (
                    <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[10px] font-bold">
                      {step}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full border-2 border-gray-200 text-[10px] font-medium text-gray-400">
                      {step}
                    </span>
                  )}
                </span>

                <span className={`text-xs font-medium leading-tight flex-1 ${isCurrent ? 'text-blue-700' : ''}`}>
                  {label}
                </span>

                {aiDone && (
                  <Sparkles className="h-3 w-3 text-purple-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* AI Generate + status at bottom */}
        <div className="p-3 border-t border-gray-100">
          {saving && (
            <p className="text-xs text-center text-gray-400 animate-pulse mb-2">Saving...</p>
          )}
          <button
            onClick={handleAIGenerate}
            disabled={aiLoading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-purple-200 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {aiLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {aiLoading ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
              Stage {currentStep} of {totalSteps}
            </p>
            <h2 className="text-base font-semibold text-gray-900 mt-0.5">
              {STAGE_LABELS[currentStep - 1]}
            </h2>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="w-32 bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline text-xs">Dismiss</button>
          </div>
        )}

        {/* Stage Content */}
        <main className="flex-1 overflow-y-auto px-6 py-5 pb-20">
          {StageComponent ? (
            <StageComponent
              stageData={{
                ...(currentStageData || { user_input: {}, ai_generated: {}, final_content: {} }),
                ...(currentStageKey === 'brand_reference' ? { brand_sections: brandSections } : {}),
                ...(currentStageKey === 'hypothesis' ? { all_stages: stages } : {}),
              }}
              onSave={(data: Record<string, unknown>) => handleSave(currentStageKey, data)}
              campaignId={campaignId}
            />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-500">Stage &quot;{STAGE_LABELS[currentStep - 1]}&quot; is coming soon.</p>
            </div>
          )}
        </main>

        {/* Completion loading modal */}
        {completionLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-xl">
              <Loader2 className="h-10 w-10 animate-spin text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Generating Campaign Output</h3>
              <p className="text-sm text-gray-500">
                AI is synthesizing all your research into a comprehensive campaign document. This may take a minute...
              </p>
            </div>
          </div>
        )}

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
            {STAGE_LABELS[currentStep - 1]}
          </span>

          {currentStep === totalSteps ? (
            hasOutput ? (
              <button
                onClick={() => router.push(`/campaigns/${campaignId}/output`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Check className="h-4 w-4" />
                View Campaign Output
              </button>
            ) : (
              <button
                onClick={handleCompleteCampaign}
                disabled={completionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {completionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {completionLoading ? 'Generating...' : 'Generate Campaign Output'}
              </button>
            )
          ) : (
            <button
              onClick={() => handleStepChange(currentStep + 1)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
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
