'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronLeft,
  Download,
  Loader2,
  RefreshCw,
  Target,
  Lightbulb,
  Users,
  MessageSquareQuote,
  Layers,
  Calendar,
  Palette,
  BookOpen,
} from 'lucide-react';

interface CampaignOutput {
  id: string;
  campaign_id: string;
  output_content: Record<string, unknown>;
  status: string;
  created_at: string;
}

interface TargetGroup {
  name: string;
  description: string;
  key_traits: string[];
}

interface TaglineOption {
  tagline: string;
  tone: string;
  rationale: string;
}

interface CampaignPhase {
  phase_number: number;
  phase_name: string;
  objective: string;
  duration: string;
  hero_content: { concept: string; format: string; description: string };
  supporting_content: { type: string; concept: string; description: string }[];
}

interface ChannelIdea {
  channel: string;
  content_format: string;
  ideas: { title: string; hook: string; description: string; visual_direction: string }[];
}

export default function CampaignOutputPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const supabase = createClient();

  const [output, setOutput] = useState<CampaignOutput | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [exportingPptx, setExportingPptx] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOutput() {
      setLoading(true);
      try {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('name')
          .eq('id', campaignId)
          .single();
        if (campaign) setCampaignName(campaign.name);

        const { data: outputs } = await supabase
          .from('campaign_outputs')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (outputs && outputs.length > 0) {
          setOutput(outputs[0] as CampaignOutput);
        }
      } catch {
        setError('Failed to load campaign output');
      } finally {
        setLoading(false);
      }
    }
    fetchOutput();
  }, [campaignId, supabase]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/campaigns/generate-output', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Regeneration failed');
      }
      const data = await res.json();
      // Refetch
      const { data: outputs } = await supabase
        .from('campaign_outputs')
        .select('*')
        .eq('id', data.outputId)
        .single();
      if (outputs) setOutput(outputs as CampaignOutput);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  const handleExportPptx = async () => {
    if (!output) return;
    setExportingPptx(true);
    try {
      const res = await fetch('/api/campaigns/export-output-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputId: output.id }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${campaignName || 'campaign'}-output.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportingPptx(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  const content = output?.output_content;

  if (!output || !content) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500">No campaign output generated yet.</p>
        <button
          onClick={() => router.push(`/campaigns/${campaignId}`)}
          className="text-blue-600 hover:underline"
        >
          Back to Campaign Editor
        </button>
      </div>
    );
  }

  const targetGroups = (content.target_groups as TargetGroup[]) ?? [];
  const taglines = (content.tagline_options as TaglineOption[]) ?? [];
  const concept = content.campaign_concept as { title: string; description: string; key_elements: string[] } | undefined;
  const phases = (content.campaign_phases as CampaignPhase[]) ?? [];
  const channelIdeas = (content.channel_content_ideas as ChannelIdea[]) ?? [];
  const calendar = content.content_calendar as { cadence: string; monthly_themes: { month: string; theme: string; focus: string }[] } | undefined;
  const visualGuide = content.visual_guidelines as Record<string, unknown> | undefined;
  const narrativeGuide = content.narrative_guidelines as Record<string, unknown> | undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/campaigns/${campaignId}`)}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Campaign Output</h1>
              <p className="text-sm text-gray-500">{campaignName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
            >
              {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Regenerate
            </button>
            <button
              onClick={handleExportPptx}
              disabled={exportingPptx}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm"
            >
              {exportingPptx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export PPTX
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-5xl mx-auto px-6 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        {/* Campaign Title */}
        <section className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
          <h2 className="text-3xl font-bold mb-3">{content.campaign_title as string}</h2>
          <p className="text-purple-100 text-sm">
            Generated on {new Date(output.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </section>

        {/* Strategic Insight */}
        <Section icon={Lightbulb} title="Strategic Insight" color="purple">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {content.strategic_insight as string}
          </p>
        </Section>

        {/* Target Groups */}
        {targetGroups.length > 0 && (
          <Section icon={Users} title="Target Group Breakdown" color="blue">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {targetGroups.map((tg, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 p-5 bg-white">
                  <h4 className="font-bold text-gray-900 mb-2">{tg.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{tg.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tg.key_traits?.map((trait, i) => (
                      <span key={i} className="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Tagline Options */}
        {taglines.length > 0 && (
          <Section icon={MessageSquareQuote} title="Tagline Options" color="amber">
            <div className="space-y-4">
              {taglines.map((t, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 p-5 bg-white">
                  <p className="text-xl font-bold text-gray-900 italic mb-2">&ldquo;{t.tagline}&rdquo;</p>
                  <p className="text-sm text-amber-700 font-medium mb-1">Tone: {t.tone}</p>
                  <p className="text-sm text-gray-600">{t.rationale}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Campaign Concept */}
        {concept && (
          <Section icon={Target} title="Campaign Concept" color="green">
            <h3 className="text-xl font-bold text-gray-900 mb-3">{concept.title}</h3>
            <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-line">{concept.description}</p>
            {concept.key_elements?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Key Elements</h4>
                <ul className="list-disc list-inside space-y-1">
                  {concept.key_elements.map((el, i) => (
                    <li key={i} className="text-sm text-gray-700">{el}</li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}

        {/* Campaign Phases */}
        {phases.length > 0 && (
          <Section icon={Layers} title="Phase-wise Execution Plan" color="indigo">
            <div className="space-y-6">
              {phases.map((phase) => (
                <div key={phase.phase_number} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-100">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-indigo-900">
                        Phase {phase.phase_number}: {phase.phase_name}
                      </h4>
                      <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">
                        {phase.duration}
                      </span>
                    </div>
                    <p className="text-sm text-indigo-700 mt-1">{phase.objective}</p>
                  </div>
                  <div className="p-5 space-y-4">
                    {phase.hero_content && (
                      <div>
                        <h5 className="text-xs font-semibold uppercase text-gray-500 mb-1">Hero Content</h5>
                        <p className="text-sm font-medium text-gray-900">{phase.hero_content.concept} ({phase.hero_content.format})</p>
                        <p className="text-sm text-gray-600 mt-1">{phase.hero_content.description}</p>
                      </div>
                    )}
                    {phase.supporting_content?.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold uppercase text-gray-500 mb-2">Supporting Content</h5>
                        <div className="space-y-2">
                          {phase.supporting_content.map((sc, i) => (
                            <div key={i} className="pl-3 border-l-2 border-gray-200">
                              <p className="text-sm font-medium text-gray-800">{sc.concept} <span className="text-gray-400">({sc.type})</span></p>
                              <p className="text-sm text-gray-600">{sc.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Channel Content Ideas */}
        {channelIdeas.length > 0 && (
          <Section icon={Layers} title="Channel-Specific Content Ideas" color="pink">
            <div className="space-y-6">
              {channelIdeas.map((ch, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="bg-pink-50 px-5 py-3 border-b border-pink-100">
                    <h4 className="font-bold text-pink-900">{ch.channel}</h4>
                    <p className="text-xs text-pink-600 mt-0.5">Format: {ch.content_format}</p>
                  </div>
                  <div className="p-5 grid gap-3 md:grid-cols-2">
                    {ch.ideas?.map((idea, i) => (
                      <div key={i} className="rounded-lg border border-gray-100 p-4 bg-gray-50">
                        <h5 className="font-semibold text-gray-900 text-sm mb-1">{idea.title}</h5>
                        <p className="text-xs text-purple-600 mb-2">Hook: {idea.hook}</p>
                        <p className="text-sm text-gray-600 mb-2">{idea.description}</p>
                        <p className="text-xs text-gray-400 italic">Visual: {idea.visual_direction}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Content Calendar */}
        {calendar && (
          <Section icon={Calendar} title="Content Calendar Framework" color="teal">
            <p className="text-sm text-gray-700 mb-4">
              <span className="font-medium">Recommended cadence:</span> {calendar.cadence}
            </p>
            {calendar.monthly_themes?.length > 0 && (
              <div className="grid gap-3 md:grid-cols-3">
                {calendar.monthly_themes.map((mt, idx) => (
                  <div key={idx} className="rounded-xl border border-gray-200 p-4 bg-white">
                    <h4 className="font-bold text-gray-900 text-sm">{mt.month}</h4>
                    <p className="text-sm text-teal-700 font-medium mt-1">{mt.theme}</p>
                    <p className="text-xs text-gray-500 mt-1">{mt.focus}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Visual Guidelines */}
        {visualGuide && (
          <Section icon={Palette} title="Visual & Narrative Guidelines" color="rose">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="font-bold text-gray-900">Visual Guidelines</h4>
                <div className="space-y-2">
                  {visualGuide.tone ? <InfoRow label="Tone" value={visualGuide.tone as string} /> : null}
                  {visualGuide.style_direction ? <InfoRow label="Style Direction" value={visualGuide.style_direction as string} /> : null}
                  {visualGuide.color_mood ? <InfoRow label="Color Mood" value={visualGuide.color_mood as string} /> : null}
                  {visualGuide.reference_aesthetics ? <InfoRow label="Reference Aesthetics" value={visualGuide.reference_aesthetics as string} /> : null}
                </div>
                {(visualGuide.dos as string[])?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold uppercase text-green-600 mb-1">Do&apos;s</h5>
                    <ul className="list-disc list-inside space-y-1">
                      {(visualGuide.dos as string[]).map((d, i) => (
                        <li key={i} className="text-sm text-gray-700">{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(visualGuide.donts as string[])?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold uppercase text-red-600 mb-1">Don&apos;ts</h5>
                    <ul className="list-disc list-inside space-y-1">
                      {(visualGuide.donts as string[]).map((d, i) => (
                        <li key={i} className="text-sm text-gray-700">{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {narrativeGuide && (
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900">Narrative Guidelines</h4>
                  <div className="space-y-2">
                    {narrativeGuide.voice ? <InfoRow label="Voice" value={narrativeGuide.voice as string} /> : null}
                    {narrativeGuide.cta_style ? <InfoRow label="CTA Style" value={narrativeGuide.cta_style as string} /> : null}
                  </div>
                  {(narrativeGuide.key_messages as string[])?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold uppercase text-gray-500 mb-1">Key Messages</h5>
                      <ul className="list-disc list-inside space-y-1">
                        {(narrativeGuide.key_messages as string[]).map((m, i) => (
                          <li key={i} className="text-sm text-gray-700">{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(narrativeGuide.hashtags as string[])?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(narrativeGuide.hashtags as string[]).map((h, i) => (
                        <span key={i} className="inline-block px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Section>
        )}
      </main>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    purple: 'text-purple-600 bg-purple-50',
    blue: 'text-blue-600 bg-blue-50',
    amber: 'text-amber-600 bg-amber-50',
    green: 'text-green-600 bg-green-50',
    indigo: 'text-indigo-600 bg-indigo-50',
    pink: 'text-pink-600 bg-pink-50',
    teal: 'text-teal-600 bg-teal-50',
    rose: 'text-rose-600 bg-rose-50',
  };
  const iconClasses = colorMap[color] ?? 'text-gray-600 bg-gray-50';

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconClasses}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-semibold text-gray-500 block">{label}</span>
      <p className="text-sm text-gray-700">{value}</p>
    </div>
  );
}
