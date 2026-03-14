import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { loadPrompt, interpolateTemplate } from '@/lib/ai/prompt-loader'
import { callLLM, logLLMCall } from '@/lib/ai/orchestrator'
import { buildCampaignContext, buildSectionContext } from '@/lib/ai/section-context'

interface CampaignRow {
  id: string
  name: string
  client_name: string | null
  brand_book_id: string | null
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const { campaignId } = body

    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaignId is required' },
        { status: 400 }
      )
    }

    // Get campaign details
    const { data: campaignData } = await db!
      .from('campaigns')
      .select('id, name, client_name, brand_book_id')
      .eq('id', campaignId)
      .single()

    const campaign = campaignData as CampaignRow | null
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Load prompt
    const promptKey = 'campaign.hypothesis'
    const prompt = await loadPrompt(db!, promptKey)

    // Build context from campaign brief and all research stages
    const campaignContext = await buildCampaignContext(db!, campaignId, [
      'brief',
      'audience_research',
      'market_research',
      'competitor_research',
      'cultural_trends',
    ])

    // Optionally load brand book context if linked
    let brandContext: Record<string, Record<string, unknown>> = {}
    if (campaign.brand_book_id) {
      brandContext = await buildSectionContext(db!, campaign.brand_book_id, [
        'brand_essence',
        'target_audience',
        'brand_positioning',
        'brand_values',
      ])
    }

    const userPrompt = interpolateTemplate(prompt.userPromptTemplate, {
      campaign_brief: JSON.stringify(campaignContext),
      brand_context: JSON.stringify(brandContext),
      campaign_name: campaign.name,
      client_name: campaign.client_name ?? '',
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

    // Parse structured hypotheses
    let hypotheses: unknown
    try {
      hypotheses = JSON.parse(result.content)
    } catch {
      hypotheses = { raw: result.content }
    }

    // Save to campaign stage
    await db!
      .from('campaign_stages')
      .upsert(
        {
          campaign_id: campaignId,
          stage_key: 'hypothesis',
          stage_number: 4,
          ai_generated: hypotheses as Record<string, unknown>,
          ai_status: 'generated',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'campaign_id,stage_key' }
      )

    return NextResponse.json({
      hypotheses,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    })
  } catch (error) {
    console.error('generate-hypothesis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
