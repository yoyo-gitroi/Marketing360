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

// Inline prompts for each campaign stage
const STAGE_PROMPTS: Record<StageKey, { system: string; user: (ctx: StageContext) => string }> = {
  campaign_brief: {
    system: 'You are a senior marketing strategist. Generate a comprehensive campaign brief based on the available brand and campaign context. Return ONLY valid JSON.',
    user: (ctx) => `Generate a campaign brief for "${ctx.campaignName}"${ctx.clientName ? ` (client: ${ctx.clientName})` : ''}.

Brand context: ${ctx.brandContext}

Return JSON with these fields:
{
  "campaign_objective": "string - clear campaign objective",
  "target_outcome": "string - desired measurable outcome",
  "budget_range": "string - suggested budget range",
  "timeline": "string - suggested timeline",
  "key_deliverables": "string - main deliverables",
  "success_metrics": "string - how success will be measured",
  "constraints": "string - any constraints or considerations"
}`,
  },

  brand_reference: {
    system: 'You are a brand strategist. Extract and organize brand reference data from the provided brand book for campaign use. Return ONLY valid JSON.',
    user: (ctx) => `Extract brand reference data for campaign "${ctx.campaignName}".

Brand book data: ${ctx.brandContext}

Return JSON with these fields:
{
  "brand_summary": "string - concise brand overview for this campaign",
  "target_group_override": "string - target group recommendations for this campaign",
  "tone_override": "string - tone recommendations specific to this campaign",
  "key_brand_elements": "string - essential brand elements to maintain",
  "brand_dos": "string - brand guidelines to follow",
  "brand_donts": "string - brand restrictions to respect"
}`,
  },

  market_research: {
    system: 'You are a market research analyst. Generate comprehensive market research insights. Use the brand context and any existing campaign data to provide relevant, specific insights. Return ONLY valid JSON.',
    user: (ctx) => `Generate market research for campaign "${ctx.campaignName}"${ctx.clientName ? ` for ${ctx.clientName}` : ''}.

Brand context: ${ctx.brandContext}
Existing campaign data: ${ctx.priorStages}

Return JSON with these fields:
{
  "industry_trends": "string - key trends shaping the industry right now",
  "market_size_notes": "string - market size, growth rate, relevant segments",
  "consumer_behavior_shifts": "string - how consumer behavior is changing in this category",
  "competitors": [{"name": "string", "positioning": "string", "strengths": "string", "weaknesses": "string"}],
  "opportunities": "string - key market opportunities identified",
  "threats": "string - potential threats or challenges"
}`,
  },

  customer_intel: {
    system: 'You are a consumer insights researcher. Generate detailed customer intelligence based on the brand and campaign context. Return ONLY valid JSON.',
    user: (ctx) => `Generate customer intelligence for campaign "${ctx.campaignName}".

Brand context: ${ctx.brandContext}
Existing campaign data: ${ctx.priorStages}

Return JSON with these fields:
{
  "primary_audience": "string - detailed primary audience profile",
  "secondary_audience": "string - secondary audience if applicable",
  "pain_points": "string - key customer pain points this campaign should address",
  "motivations": "string - what motivates the target audience",
  "media_consumption": "string - how the audience consumes media",
  "purchase_journey": "string - typical purchase journey and decision factors",
  "insights": "string - key customer insights for the campaign"
}`,
  },

  platform_channel: {
    system: 'You are a media strategist. Recommend the optimal platform and channel strategy based on the campaign context and target audience. Return ONLY valid JSON.',
    user: (ctx) => `Recommend platform and channel strategy for campaign "${ctx.campaignName}".

Brand context: ${ctx.brandContext}
Existing campaign data: ${ctx.priorStages}

Return JSON with these fields:
{
  "primary_channels": [{"channel": "string", "rationale": "string", "budget_allocation": "string"}],
  "content_formats": "string - recommended content formats per channel",
  "posting_frequency": "string - recommended posting cadence",
  "paid_strategy": "string - paid media recommendations",
  "organic_strategy": "string - organic/earned media approach",
  "integration_notes": "string - how channels work together"
}`,
  },

  historical_data: {
    system: 'You are a marketing analytics expert. Based on the brand context and campaign information, generate insights about likely historical performance patterns and recommendations. Return ONLY valid JSON.',
    user: (ctx) => `Generate historical data analysis for campaign "${ctx.campaignName}".

Brand context: ${ctx.brandContext}
Existing campaign data: ${ctx.priorStages}

Return JSON with these fields:
{
  "past_campaign_learnings": "string - key learnings from brand history and past campaigns",
  "benchmark_metrics": "string - industry benchmark metrics to target",
  "seasonal_considerations": "string - any seasonal factors to consider",
  "what_worked_before": "string - strategies that have worked for similar brands",
  "what_to_avoid": "string - common pitfalls to avoid",
  "optimization_suggestions": "string - data-driven optimization recommendations"
}`,
  },

  resources: {
    system: 'You are a campaign resource planner. Identify and plan the resources needed for this campaign. Return ONLY valid JSON.',
    user: (ctx) => `Plan resources for campaign "${ctx.campaignName}".

Brand context: ${ctx.brandContext}
Existing campaign data: ${ctx.priorStages}

Return JSON with these fields:
{
  "creative_assets_needed": "string - list of creative assets to produce",
  "team_requirements": "string - team roles and responsibilities",
  "technology_tools": "string - tools and platforms needed",
  "content_calendar_outline": "string - high-level content calendar",
  "production_timeline": "string - production schedule",
  "budget_breakdown": "string - suggested budget allocation"
}`,
  },

  hypothesis: {
    system: 'You are a strategic marketing thinker. Generate creative campaign hypotheses based on all available research and brand data. Return ONLY valid JSON.',
    user: (ctx) => `Generate campaign hypotheses for "${ctx.campaignName}".

Brand context: ${ctx.brandContext}
All campaign research: ${ctx.priorStages}

Return JSON with these fields:
{
  "hypotheses": [
    {
      "title": "string - hypothesis name",
      "hypothesis": "string - the hypothesis statement (If we... then... because...)",
      "rationale": "string - why this hypothesis makes sense",
      "risk_level": "string - low/medium/high",
      "expected_impact": "string - expected outcome if hypothesis is correct"
    }
  ]
}`,
  },

  ideation_room: {
    system: 'You are a creative director at a top advertising agency. Generate bold, creative campaign ideas. Return ONLY valid JSON.',
    user: (ctx) => `Generate creative campaign ideas for "${ctx.campaignName}".

Brand context: ${ctx.brandContext}
All campaign research and hypotheses: ${ctx.priorStages}

Return JSON with these fields:
{
  "campaign_theme": "string - overarching campaign theme/big idea",
  "tagline_options": ["string - tagline option 1", "string - tagline option 2", "string - tagline option 3"],
  "creative_concepts": [
    {
      "name": "string - concept name",
      "description": "string - concept description",
      "key_visual": "string - key visual description",
      "hero_message": "string - hero message"
    }
  ],
  "activation_ideas": "string - campaign activation ideas",
  "content_pillars": ["string - content pillar 1", "string - content pillar 2"],
  "viral_hook": "string - what makes this campaign shareable"
}`,
  },
}

interface StageContext {
  campaignName: string
  clientName: string
  brandContext: string
  priorStages: string
}

function parseJSON(text: string): Record<string, unknown> | null {
  // Try direct parse
  try {
    return JSON.parse(text)
  } catch { /* continue */ }

  // Try extracting from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim())
    } catch { /* continue */ }
  }

  // Try extracting raw JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch { /* continue */ }
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

    // Determine which stage to generate for
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
        if (Object.keys(brandData).length > 0) {
          brandContext = JSON.stringify(brandData)
        }
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
        if (stage.stage_key === targetStageKey) continue // Skip the target stage
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

    // Save to the campaign stage (upsert pattern)
    const existingStage = allStages?.find((s: any) => s.stage_key === targetStageKey)
    if (existingStage) {
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

    return NextResponse.json({
      stageKey: targetStageKey,
      content: parsed,
    })
  } catch (error) {
    console.error('generate-campaign-output error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
