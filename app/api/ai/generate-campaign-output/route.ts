/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { callLLM } from '@/lib/ai/orchestrator'

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
] as const

type StageKey = (typeof STAGE_KEYS)[number]

interface StageContext {
  campaignName: string
  clientName: string
  brandContext: string
  priorStages: string
}

// Each prompt generates JSON matching the EXACT form field structure of its stage component
const STAGE_PROMPTS: Record<StageKey, { system: string; user: (ctx: StageContext) => string }> = {
  campaign_brief: {
    system: 'You are a senior marketing strategist. Return ONLY valid JSON matching the exact structure specified.',
    user: (ctx) => `Generate a campaign brief for "${ctx.campaignName}"${ctx.clientName ? ` (client: ${ctx.clientName})` : ''}.

Brand context: ${ctx.brandContext}

Return JSON with EXACTLY these fields:
{
  "campaign_objective": "brand_awareness",
  "kpis": [{"metric": "Reach", "target": "1M"}, {"metric": "Engagement Rate", "target": "3%"}],
  "campaign_type": "product_launch",
  "target_markets": ["India", "US"],
  "campaign_duration": {"start_date": "2026-04-01", "end_date": "2026-06-30", "phases": 3},
  "budget_total": 500000,
  "budget_breakdown": {"production": 150000, "media": 250000, "influencer": 75000, "other": 25000},
  "problem_statement": "string describing the core problem",
  "sentiment_territory": "string describing desired emotional territory",
  "brand_face": "string describing the brand face/ambassador approach",
  "creative_direction_hints": "string with creative direction notes"
}

campaign_objective must be one of: brand_awareness, lead_generation, sales_conversion, product_launch, market_expansion, customer_retention, rebranding
campaign_type must be one of: product_launch, seasonal, always_on, event_based, crisis_response, rebranding`,
  },

  brand_reference: {
    system: 'You are a brand strategist. Extract brand reference for campaign use. Return ONLY valid JSON.',
    user: (ctx) => `Extract brand reference for campaign "${ctx.campaignName}".

Brand book data: ${ctx.brandContext}

Return JSON with EXACTLY these fields:
{
  "tg_override": "string - target group refinement for this specific campaign",
  "tone_override": "string - tone adjustments for this campaign",
  "visual_override": "string - visual direction adjustments"
}`,
  },

  market_research: {
    system: 'You are a market research analyst. Generate comprehensive market research. Return ONLY valid JSON.',
    user: (ctx) => `Generate market research for campaign "${ctx.campaignName}"${ctx.clientName ? ` for ${ctx.clientName}` : ''}.

Brand context: ${ctx.brandContext}
Existing campaign data: ${ctx.priorStages}

Return JSON with EXACTLY these fields:
{
  "industry_trends": "string - key industry trends",
  "market_size_notes": "string - market size and growth data",
  "consumer_behavior_shifts": "string - consumer behavior changes",
  "competitors": [
    {"name": "string", "positioning": "string", "key_campaigns": "string", "what_worked": "string", "what_didnt": "string", "meta_ads_observations": "string"}
  ],
  "india_competition_notes": "string - India-specific competitive landscape",
  "us_global_competition_notes": "string - US/global competitive landscape",
  "category_regulations": "string - relevant regulations",
  "seasonal_cultural_opportunities": "string - seasonal/cultural opportunities"
}

Include 3-5 competitors. Be specific and detailed.`,
  },

  customer_intel: {
    system: 'You are a consumer insights researcher. Return ONLY valid JSON.',
    user: (ctx) => `Generate customer intelligence for campaign "${ctx.campaignName}".

Brand context: ${ctx.brandContext}
Existing campaign data: ${ctx.priorStages}

Return JSON with EXACTLY these fields:
{
  "marketplace_keywords": [{"keyword": "string", "volume": "string", "intent": "string"}],
  "google_keywords": [{"keyword": "string", "volume": "string"}],
  "customer_sentiment": "string - overall customer sentiment analysis",
  "own_review_themes": "string - themes from own product reviews",
  "competitor_review_themes": "string - themes from competitor reviews",
  "hierarchy_of_use": [{"rank": 1, "use_case": "string", "frequency": "string"}],
  "purchase_triggers": ["string"],
  "purchase_barriers": ["string"],
  "customer_interview_notes": "string - key insights from customer research"
}

Include 5-8 keywords, 3-5 hierarchy items, 3-5 triggers and barriers.`,
  },

  platform_channel: {
    system: 'You are a media strategist. Return ONLY valid JSON.',
    user: (ctx) => `Recommend platform strategy for campaign "${ctx.campaignName}".

Brand context: ${ctx.brandContext}
Existing campaign data: ${ctx.priorStages}

Return JSON with EXACTLY these fields:
{
  "platforms": [
    {"platform_name": "Instagram", "best_practices": "string", "content_format_preferences": "string"},
    {"platform_name": "YouTube", "best_practices": "string", "content_format_preferences": "string"}
  ]
}

Include 4-6 relevant platforms. Use real platform names: Instagram, YouTube, Facebook, TikTok, Twitter/X, LinkedIn, Pinterest, Snapchat, Google Ads, Amazon.`,
  },

  historical_data: {
    system: 'You are a marketing analytics expert. Return ONLY valid JSON.',
    user: (ctx) => `Generate historical data analysis for campaign "${ctx.campaignName}".

Brand context: ${ctx.brandContext}
Existing campaign data: ${ctx.priorStages}

Return JSON with EXACTLY these fields:
{
  "past_campaigns": [
    {"campaign_name": "string", "what_worked": "string", "what_didnt": "string", "metrics": "string"}
  ],
  "influencer_landscape_notes": "string - influencer landscape analysis",
  "benchmark_data": "string - industry benchmark data and metrics to target"
}

Include 2-3 past campaign examples (real or hypothetical based on brand context).`,
  },

  resources: {
    system: 'You are a campaign resource planner. Return ONLY valid JSON.',
    user: (ctx) => `Plan resources for campaign "${ctx.campaignName}".

Brand context: ${ctx.brandContext}
Existing campaign data: ${ctx.priorStages}

Return JSON with EXACTLY these fields:
{
  "team_resources": "string - team roles and responsibilities needed",
  "timeline_constraints": "string - key timeline considerations",
  "production_capabilities": "string - production needs and capabilities",
  "available_assets": "string - existing assets that can be leveraged",
  "partner_vendors": [
    {"name": "string", "type": "string", "notes": "string"}
  ]
}

Include 3-5 partner/vendor suggestions.`,
  },

  hypothesis: {
    system: 'You are a strategic marketing thinker. Return ONLY valid JSON.',
    user: (ctx) => `Generate campaign hypotheses for "${ctx.campaignName}".

Brand context: ${ctx.brandContext}
All campaign research: ${ctx.priorStages}

Return JSON with EXACTLY this structure:
{
  "hypotheses": [
    {
      "title": "string - hypothesis name",
      "insight": "string - the key consumer/market insight",
      "emotional_territory": "string - the emotional space this hypothesis occupies",
      "tg_reframe": "string - how this reframes the target group",
      "the_flip": "string - the contrarian or unexpected angle",
      "execution_direction": "string - how this would be executed in a campaign"
    }
  ]
}

Generate 3-5 hypotheses.`,
  },

  ideation_room: {
    system: 'You are a creative director. Return ONLY valid JSON.',
    user: (ctx) => `Generate creative campaign ideas for "${ctx.campaignName}".

Brand context: ${ctx.brandContext}
All campaign research and hypotheses: ${ctx.priorStages}

Return JSON with EXACTLY this structure:
{
  "idea_sets": [
    {
      "persona": "Gen Z Creative",
      "persona_description": "Digital-native, meme-literate, values authenticity",
      "ideas": [
        {
          "title": "string - idea title",
          "format": "string - content format (video/carousel/story/etc)",
          "hook": "string - attention-grabbing hook",
          "hero_content": "string - main content description",
          "surround": "string - supporting content",
          "why_it_works": "string - strategic rationale"
        }
      ]
    }
  ]
}

Generate 3 persona-based idea sets with 2-3 ideas each. Use personas like: Gen Z Creative, Brand Strategist, Cultural Commentator.`,
  },
}

function parseJSON(text: string): Record<string, unknown> | null {
  try { return JSON.parse(text) } catch { /* continue */ }
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()) } catch { /* continue */ }
  }
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]) } catch { /* continue */ }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const { campaignId, stageKey } = body

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
    }

    const targetStageKey = (stageKey && STAGE_KEYS.includes(stageKey as StageKey))
      ? stageKey as StageKey
      : STAGE_KEYS[0]

    // Get campaign details
    const { data: campaign } = await db!
      .from('campaigns')
      .select('id, name, client_name, brand_book_id, uploaded_brand_book_url')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Build brand context from linked brand book
    let brandContext = 'No brand book linked to this campaign.'
    if (campaign.brand_book_id) {
      const { data: brandSections } = await db!
        .from('brand_book_sections')
        .select('section_key, user_input, ai_generated, final_content')
        .eq('brand_book_id', campaign.brand_book_id)

      if (brandSections && brandSections.length > 0) {
        const brandData: Record<string, unknown> = {}
        for (const section of brandSections) {
          const content = (section.final_content && Object.keys(section.final_content).length > 0)
            ? section.final_content
            : (section.user_input && Object.keys(section.user_input).length > 0)
              ? section.user_input
              : section.ai_generated
          if (content && Object.keys(content).length > 0) {
            brandData[section.section_key] = content
          }
        }
        if (Object.keys(brandData).length > 0) brandContext = JSON.stringify(brandData)
      }
    }

    // Build context from all prior campaign stages
    const { data: allStages } = await db!
      .from('campaign_stages')
      .select('stage_key, user_input, ai_generated')
      .eq('campaign_id', campaignId)
      .order('stage_number')

    const priorStagesData: Record<string, unknown> = {}
    if (allStages) {
      for (const stage of allStages) {
        if (stage.stage_key === targetStageKey) continue
        const content = (stage.user_input && Object.keys(stage.user_input).length > 0)
          ? stage.user_input
          : stage.ai_generated
        if (content && Object.keys(content).length > 0) {
          priorStagesData[stage.stage_key] = content
        }
      }
    }

    const stagePrompt = STAGE_PROMPTS[targetStageKey]
    const ctx: StageContext = {
      campaignName: campaign.name,
      clientName: campaign.client_name || '',
      brandContext,
      priorStages: Object.keys(priorStagesData).length > 0
        ? JSON.stringify(priorStagesData)
        : 'No prior campaign data available yet.',
    }

    const result = await callLLM({
      systemPrompt: stagePrompt.system,
      userPrompt: stagePrompt.user(ctx),
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4096,
      temperature: 0.7,
      orgId: user!.orgId,
      userId: user!.id,
      promptKey: `campaign.stage.${targetStageKey}`,
      promptVersion: 1,
      relatedEntityType: 'campaign',
      relatedEntityId: campaignId,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    const parsed = parseJSON(result.content)
    if (!parsed) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // For hypothesis and ideation stages, save to ai_generated only
    // For all other stages, save to BOTH user_input and ai_generated so forms populate
    if (targetStageKey === 'hypothesis' || targetStageKey === 'ideation_room') {
      await db!
        .from('campaign_stages')
        .update({
          ai_generated: parsed,
          ai_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('campaign_id', campaignId)
        .eq('stage_key', targetStageKey)
    } else {
      await db!
        .from('campaign_stages')
        .update({
          user_input: parsed,
          ai_generated: parsed,
          ai_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('campaign_id', campaignId)
        .eq('stage_key', targetStageKey)
    }

    return NextResponse.json({ stageKey: targetStageKey, content: parsed })
  } catch (error) {
    console.error('generate-campaign-output error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
