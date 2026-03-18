'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Filter, Loader2, Plus, Sparkles, ChevronRight, Lightbulb } from 'lucide-react';
import IdeaCard from '@/components/campaign/IdeaCard';
import BrandFilterResults from '@/components/campaign/BrandFilterResults';
import type { Idea } from '@/components/campaign/IdeaCard';
import type { FeedbackValue } from '@/components/campaign/IdeaCard';
import type { BrandFilterResult } from '@/components/campaign/BrandFilterResults';
import type { StageProps } from './CampaignBriefStage';

interface IdeaSet {
  persona: string;
  persona_description: string;
  ideas: Idea[];
}

interface SelectedHypothesis {
  title?: string;
  insight?: string;
  emotional_territory?: string;
  tg_reframe?: string;
  the_flip?: string;
  execution_direction?: string;
}

export default function IdeationRoomStage({ stageData, onSave, campaignId }: StageProps) {
  const aiGenerated = stageData.ai_generated as Record<string, unknown> | undefined;
  const finalContent = stageData.final_content as Record<string, unknown> | undefined;

  // Selected hypothesis passed from the campaign editor
  const selectedHypothesis = (stageData as Record<string, unknown>).selected_hypothesis as SelectedHypothesis | null;

  const [ideaSets, setIdeaSets] = useState<IdeaSet[]>(
    (aiGenerated?.idea_sets as IdeaSet[]) ?? []
  );
  const [starredIds, setStarredIds] = useState<Set<string>>(
    new Set((finalContent?.starred_ids as string[]) ?? [])
  );
  const [brandFilterResults, setBrandFilterResults] = useState<BrandFilterResult[]>(
    (finalContent?.brand_filter_results as BrandFilterResult[]) ?? []
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, FeedbackValue>>({});
  const [hypothesisExpanded, setHypothesisExpanded] = useState(false);

  const [showManualForm, setShowManualForm] = useState(false);
  const [manualIdea, setManualIdea] = useState<Idea>({
    title: '', format: '', hook: '', hero_content: '', surround: '', why_it_works: '',
  });

  const makeIdeaId = (persona: string, title: string) => `${persona}::${title}`;

  useEffect(() => {
    async function loadFeedback() {
      try {
        const res = await fetch(`/api/ai/feedback?campaignId=${campaignId}&stageKey=ideation_room`);
        if (res.ok) {
          const data = await res.json();
          const map: Record<string, FeedbackValue> = {};
          for (const fb of data.feedback) {
            if (fb.item_type === 'idea') {
              const key = fb.persona ? `${fb.persona}::${fb.item_title}` : `idx::${fb.item_index}`;
              map[key] = fb.feedback as FeedbackValue;
            }
          }
          setFeedbackMap(map);
        }
      } catch { /* silently fail */ }
    }
    loadFeedback();
  }, [campaignId]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/generate-ideation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as Record<string, string>).error ?? 'Failed to generate ideas');
      }
      const data = await res.json();
      setIdeaSets((data as Record<string, unknown>).idea_sets as IdeaSet[]);
      setStarredIds(new Set());
      setBrandFilterResults([]);
      setFeedbackMap({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate ideas');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleStar = useCallback(
    async (persona: string, title: string) => {
      const id = makeIdeaId(persona, title);
      const next = new Set(starredIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      setStarredIds(next);
      await onSave({
        final_content: { starred_ids: Array.from(next), brand_filter_results: brandFilterResults },
      });
    },
    [starredIds, brandFilterResults, onSave]
  );

  const handleBrandFilter = async () => {
    if (starredIds.size === 0) return;
    setIsFiltering(true);
    setError(null);
    try {
      const starredIdeas: { title: string; persona: string }[] = [];
      for (const set of ideaSets) {
        for (const idea of set.ideas) {
          if (starredIds.has(makeIdeaId(set.persona, idea.title))) {
            starredIdeas.push({ title: idea.title, persona: set.persona });
          }
        }
      }
      const res = await fetch('/api/ai/brand-filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, ideas: starredIdeas }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as Record<string, string>).error ?? 'Brand filter failed');
      }
      const data = await res.json();
      const results = (data as Record<string, unknown>).results as BrandFilterResult[];
      setBrandFilterResults(results);
      await onSave({ final_content: { starred_ids: Array.from(starredIds), brand_filter_results: results } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Brand filter failed');
    } finally {
      setIsFiltering(false);
    }
  };

  const handleFeedback = useCallback(
    async (persona: string, title: string, itemIndex: number, feedback: 'thumbs_up' | 'thumbs_down') => {
      const key = makeIdeaId(persona, title);
      const currentFeedback = feedbackMap[key];
      const newFeedback = currentFeedback === feedback ? null : feedback;
      setFeedbackMap((prev) => ({ ...prev, [key]: newFeedback }));
      if (newFeedback) {
        try {
          await fetch('/api/ai/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaignId, stageKey: 'ideation_room', itemIndex, itemTitle: title,
              itemType: 'idea', feedback: newFeedback, persona,
            }),
          });
        } catch {
          setFeedbackMap((prev) => ({ ...prev, [key]: currentFeedback ?? null }));
        }
      }
    },
    [campaignId, feedbackMap]
  );

  const addManualIdea = async () => {
    if (!manualIdea.title.trim()) return;
    const manualSet = ideaSets.find((s) => s.persona === 'Your Ideas');
    if (manualSet) {
      manualSet.ideas.push({ ...manualIdea });
      setIdeaSets([...ideaSets]);
    } else {
      setIdeaSets([...ideaSets, {
        persona: 'Your Ideas', persona_description: 'Manually added ideas', ideas: [{ ...manualIdea }],
      }]);
    }
    setManualIdea({ title: '', format: '', hook: '', hero_content: '', surround: '', why_it_works: '' });
    setShowManualForm(false);
  };

  let globalIdeaIndex = 0;

  const hasHypothesis = selectedHypothesis && (selectedHypothesis.title || selectedHypothesis.insight);

  return (
    <div className="space-y-6">

      {/* ── Working Hypothesis Banner ── */}
      {hasHypothesis ? (
        <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 overflow-hidden">
          {/* Header row */}
          <button
            type="button"
            onClick={() => setHypothesisExpanded((p) => !p)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-purple-100/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                  Working Hypothesis
                </p>
                <p className="text-sm font-bold text-gray-900 leading-tight">
                  {selectedHypothesis.title || 'Custom Hypothesis'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-purple-500 font-medium">
                {hypothesisExpanded ? 'Collapse' : 'View details'}
              </span>
              <ChevronRight
                className={`w-4 h-4 text-purple-400 transition-transform duration-200 ${hypothesisExpanded ? 'rotate-90' : ''}`}
              />
            </div>
          </button>

          {/* Insight — always visible */}
          {selectedHypothesis.insight && (
            <div className="px-5 pb-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-semibold text-purple-700">Insight: </span>
                {selectedHypothesis.insight}
              </p>
            </div>
          )}

          {/* Expanded details */}
          {hypothesisExpanded && (
            <div className="px-5 pb-4 border-t border-purple-100 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {selectedHypothesis.emotional_territory && (
                <div className="rounded-lg bg-purple-100/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 mb-1">
                    Emotional Territory
                  </p>
                  <p className="text-sm text-gray-800">{selectedHypothesis.emotional_territory}</p>
                </div>
              )}
              {selectedHypothesis.tg_reframe && (
                <div className="rounded-lg bg-indigo-100/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
                    TG Reframe
                  </p>
                  <p className="text-sm text-gray-800">{selectedHypothesis.tg_reframe}</p>
                </div>
              )}
              {selectedHypothesis.the_flip && (
                <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">
                    The Flip
                  </p>
                  <p className="text-sm text-gray-800 italic">{selectedHypothesis.the_flip}</p>
                </div>
              )}
              {selectedHypothesis.execution_direction && (
                <div className="sm:col-span-3 rounded-lg bg-white/70 border border-purple-100 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Execution Direction
                  </p>
                  <p className="text-sm text-gray-700">{selectedHypothesis.execution_direction}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* No hypothesis selected warning */
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 flex items-start gap-3">
          <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">No hypothesis selected</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Go back to Stage 8 (Hypothesis) and select a working hypothesis to guide your ideation.
            </p>
          </div>
        </div>
      )}

      {/* ── Title + description ── */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Ideation Room</h2>
        <p className="text-sm text-gray-500 mt-1">
          AI generates ideas from three creative perspectives based on your hypothesis. Star your favorites, then run the brand filter.
        </p>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {isGenerating ? 'Generating Ideas...' : 'Generate Ideas'}
        </button>

        {ideaSets.length > 0 && (
          <button
            type="button"
            onClick={handleBrandFilter}
            disabled={isFiltering || starredIds.size === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-purple-300 text-purple-700 font-medium text-sm hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isFiltering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
            Run Brand Filter ({starredIds.size} selected)
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowManualForm(!showManualForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Your Own Idea
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* ── Manual idea form ── */}
      {showManualForm && (
        <div className="rounded-xl border border-gray-200 p-5 space-y-4 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-800">Add Your Own Idea</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Idea title" value={manualIdea.title}
              onChange={(e) => setManualIdea({ ...manualIdea, title: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
            <input type="text" placeholder="Format (e.g., Social-first campaign)" value={manualIdea.format}
              onChange={(e) => setManualIdea({ ...manualIdea, format: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
          </div>
          <input type="text" placeholder="Hook" value={manualIdea.hook}
            onChange={(e) => setManualIdea({ ...manualIdea, hook: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
          <textarea rows={2} placeholder="Hero content" value={manualIdea.hero_content}
            onChange={(e) => setManualIdea({ ...manualIdea, hero_content: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
          <textarea rows={2} placeholder="Surround campaign" value={manualIdea.surround}
            onChange={(e) => setManualIdea({ ...manualIdea, surround: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
          <textarea rows={2} placeholder="Why it works" value={manualIdea.why_it_works}
            onChange={(e) => setManualIdea({ ...manualIdea, why_it_works: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
          <div className="flex gap-2">
            <button type="button" onClick={addManualIdea} disabled={!manualIdea.title.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors">
              Add Idea
            </button>
            <button type="button" onClick={() => setShowManualForm(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Idea sets by persona ── */}
      {ideaSets.map((set) => (
        <div key={set.persona} className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{set.persona}</h3>
            {set.persona_description && (
              <p className="text-xs text-gray-500 mt-0.5">{set.persona_description}</p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {set.ideas.map((idea) => {
              const currentIndex = globalIdeaIndex++;
              const feedbackKey = makeIdeaId(set.persona, idea.title);
              return (
                <IdeaCard
                  key={idea.title}
                  idea={idea}
                  persona={set.persona}
                  isStarred={starredIds.has(makeIdeaId(set.persona, idea.title))}
                  onToggleStar={() => toggleStar(set.persona, idea.title)}
                  feedback={feedbackMap[feedbackKey] ?? null}
                  onFeedback={(fb) => handleFeedback(set.persona, idea.title, currentIndex, fb)}
                />
              );
            })}
          </div>
        </div>
      ))}

      {/* ── Brand filter results ── */}
      {brandFilterResults.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <BrandFilterResults results={brandFilterResults} />
        </div>
      )}
    </div>
  );
}
