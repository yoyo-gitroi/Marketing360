import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { loadPrompt, interpolateTemplate } from '@/lib/ai/prompt-loader'
import { callLLM, logLLMCall } from '@/lib/ai/orchestrator'
import { buildCampaignContext, buildSectionContext } from '@/lib/ai/section-context'

const OUTPUT_STAGES = [
  'tagline',
  'hero_script',
  'surround_plan',
  'distribution',
  'timeline',
] as const

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

    // Build full campaign context from all prior stages
    const campaignContext = await buildCampaignContext(db!, campaignId, [
      'brief',
      'audience_research',
      'market_research',
      'competitor_research',
      'cultural_trends',
      'hypothesis',
      'ideation',
      'brand_filter',
    ])

    // Optionally load brand book context
    let brandContext: Record<string, Record<string, unknown>> = {}
    if (campaign.brand_book_id) {
      brandContext = await buildSectionContext(db!, campaign.brand_book_id, [
        'brand_essence',
        'brand_values',
        'brand_personality',
        'brand_positioning',
        'target_audience',
        'tone_of_voice',
      ])
    }

    const outputs: Record<string, unknown> = {}
    const allTokens = { inputTokens: 0, outputTokens: 0, latencyMs: 0 }

    // Run each output prompt in sequence, feeding prior outputs as context
    for (const stage of OUTPUT_STAGES) {
      const promptKey = `campaign.output.${stage}`

      let prompt
      try {
        prompt = await loadPrompt(db!, promptKey)
      } catch {
        // Skip if prompt not registered yet
        console.warn(`Prompt not found for ${promptKey}, skipping`)
        continue
      }

      const userPrompt = interpolateTemplate(prompt.userPromptTemplate, {
        campaign_context: JSON.stringify(campaignContext),
        brand_context: JSON.stringify(brandContext),
        previous_outputs: JSON.stringify(outputs),
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
        outputs[stage] = { error: result.error }
        continue
      }

      try {
        outputs[stage] = JSON.parse(result.content)
      } catch {
        outputs[stage] = { content: result.content }
      }

      allTokens.inputTokens += result.inputTokens
      allTokens.outputTokens += result.outputTokens
      allTokens.latencyMs += result.latencyMs
    }

    // Save complete output to campaign stage
    await db!
      .from('campaign_stages')
      .upsert(
        {
          campaign_id: campaignId,
          stage_key: 'campaign_output',
          stage_number: 8,
          ai_generated: outputs,
          ai_status: 'generated',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'campaign_id,stage_key' }
      )

    return NextResponse.json({
      outputs,
      ...allTokens,
    })
  } catch (error) {
    console.error('generate-campaign-output error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
