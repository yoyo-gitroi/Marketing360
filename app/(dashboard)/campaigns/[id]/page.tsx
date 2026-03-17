'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ChevronLeft, ChevronRight, Sparkles, Loader2 } from 'lucide-react';

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

  const totalSteps = STAGE_KEYS.length;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [campaignRes, stagesRes] = await Promise.all([
        supabase.from('campaigns').select('*').eq('id', campaignId).single(),
        supabase
          .from('campaign_stages')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('stage_number'),
      ]);

      if (campaignRes.error) throw campaignRes.error;
      if (stagesRes.error) throw stagesRes.error;

      const campaignData = campaignRes.data as Campaign;
      setCampaign(campaignData);
      setStages(stagesRes.data as CampaignStage[]);
      setCurrentStep(campaignData.current_stage || 1);

      // Fetch brand book sections if a brand book is linked
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          .from('campaign_stages')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('stage_number');
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

  const currentStageKey = STAGE_KEYS[currentStep - 1];
  const currentStageData = stages.find((s) => s.stage_key === currentStageKey);
  const StageComponent = STAGE_COMPONENTS[currentStageKey];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => router.push('/campaigns')}
          className="text-blue-600 hover:underline"
        >
          Back to Campaigns
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
              onClick={() => router.push('/campaigns')}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {campaign?.name || 'Campaign'}
              </h1>
              {campaign?.client_name && (
                <p className="text-sm text-gray-500">{campaign.client_name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saving && (
              <span className="text-sm text-gray-400 animate-pulse">Saving...</span>
            )}

            <button
              onClick={handleAIGenerate}
              disabled={aiLoading}
              className="inline-flex items-center gap-2 px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {aiLoading ? 'Generating...' : 'Generate with AI'}
            </button>
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-1 overflow-x-auto">
            {STAGE_LABELS.map((label, idx) => {
              const step = idx + 1;
              const stageKey = STAGE_KEYS[idx];
              const stage = stages.find((s) => s.stage_key === stageKey);
              const isCompleted = stage && Object.keys(stage.user_input || {}).length > 0;
              const isCurrent = step === currentStep;

              return (
                <button
                  key={label}
                  onClick={() => handleStepChange(step)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                    ${isCurrent ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : ''}
                    ${isCompleted && !isCurrent ? 'text-green-700 hover:bg-green-50' : ''}
                    ${!isCompleted && !isCurrent ? 'text-gray-500 hover:bg-gray-100' : ''}
                  `}
                >
                  <span
                    className={`
                      flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold
                      ${isCurrent ? 'bg-blue-600 text-white' : ''}
                      ${isCompleted && !isCurrent ? 'bg-green-500 text-white' : ''}
                      ${!isCompleted && !isCurrent ? 'bg-gray-300 text-white' : ''}
                    `}
                  >
                    {isCompleted && !isCurrent ? '\u2713' : step}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                  {stage?.ai_status === 'completed' && (
                    <Sparkles className="h-3 w-3 text-purple-500" />
                  )}
                </button>
              );
            })}
          </nav>
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

      {/* Stage Content */}
      <main className="max-w-7xl mx-auto px-6 py-6 pb-24">
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
            <p className="text-gray-500">
              Stage component for &quot;{STAGE_LABELS[currentStep - 1]}&quot; is coming soon.
            </p>
          </div>
        )}
      </main>

      {/* Navigation Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 z-10">
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
            Stage {currentStep} of {totalSteps}: {STAGE_LABELS[currentStep - 1]}
          </span>

          <button
            onClick={() => handleStepChange(currentStep + 1)}
            disabled={currentStep === totalSteps}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
