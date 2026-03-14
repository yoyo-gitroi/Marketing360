import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { loadPrompt, interpolateTemplate } from '@/lib/ai/prompt-loader'
import { callLLM, logLLMCall } from '@/lib/ai/orchestrator'
import { buildCampaignContext } from '@/lib/ai/section-context'

interface CampaignRow {
  id: string
  name: string
  client_name: string | null
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const { campaignId, selectedHypothesis } = body

    if (!campaignId || !selectedHypothesis) {
      return NextResponse.json(
        { error: 'campaignId and selectedHypothesis are required' },
        { status: 400 }
      )
    }

    // Get campaign details
    const { data: campaignData } = await db!
      .from('campaigns')
      .select('id, name, client_name')
      .eq('id', campaignId)
      .single()

    const campaign = campaignData as CampaignRow | null
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Load prompt
    const promptKey = 'campaign.ideation'
    const prompt = await loadPrompt(db!, promptKey)

    // Build context from previous stages
    const campaignContext = await buildCampaignContext(db!, campaignId, [
      'brief',
      'hypothesis',
    ])

    const userPrompt = interpolateTemplate(prompt.userPromptTemplate, {
      selected_hypothesis: JSON.stringify(selectedHypothesis),
      campaign_context: JSON.stringify(campaignContext),
      campaign_name: campaign.name,
      client_name: campaign.client_name ?? '',
      persona_lenses: JSON.stringify([
        {
          name: 'Gen Z Creative',
          perspective:
            'Digital-native, meme-literate, values authenticity and social impact',
        },
        {
          name: 'Brand Strategist',
          perspective:
            'ROI-focused, brand consistency, long-term equity building',
        },
        {
          name: 'Cultural Commentator',
          perspective:
            'Trend-aware, social listening expert, cultural relevance and timing',
        },
      ]),
    })

    const result = await callLLM({
      systemPrompt: prompt.systemPrompt,
      userPrompt,
      model: prompt.model,
      maxTokens: prompt.maxTokens,
      temperature: prompt.temperature,
      orgId: user!.orgId,
      userId: user!.id,
      promptKey,
      promptVersion: prompt.version,
      relatedEntityType: 'campaign',
      relatedEntityId: campaignId,
    })

    await logLLMCall(db!, {
      orgId: user!.orgId,
      userId: user!.id,
      promptKey,
      promptVersion: prompt.version,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
      status: 'error' in result ? 'error' : 'success',
      errorMessage: 'error' in result ? result.error : null,
      relatedEntityType: 'campaign',
      relatedEntityId: campaignId,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    let ideas: unknown
    try {
      ideas = JSON.parse(result.content)
    } catch {
      ideas = { raw: result.content }
    }

    // Save to campaign stage
    await db!
      .from('campaign_stages')
      .upsert(
        {
          campaign_id: campaignId,
          stage_key: 'ideation',
          stage_number: 5,
          ai_generated: ideas as Record<string, unknown>,
          ai_status: 'generated',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'campaign_id,stage_key' }
      )

    return NextResponse.json({
      ideas,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    })
  } catch (error) {
    console.error('generate-ideation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
