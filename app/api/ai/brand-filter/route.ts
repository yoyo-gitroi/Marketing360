import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { loadPrompt, interpolateTemplate } from '@/lib/ai/prompt-loader'
import { callLLM, logLLMCall } from '@/lib/ai/orchestrator'
import { buildSectionContext } from '@/lib/ai/section-context'

export async function POST(request: NextRequest) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const { campaignId, ideas, brandBookId } = body

    if (!campaignId || !ideas || !brandBookId) {
      return NextResponse.json(
        { error: 'campaignId, ideas, and brandBookId are required' },
        { status: 400 }
      )
    }

    // Load prompt
    const promptKey = 'campaign.brand_filter'
    const prompt = await loadPrompt(db!, promptKey)

    // Build brand book context for evaluation
    const brandContext = await buildSectionContext(db!, brandBookId, [
      'brand_essence',
      'brand_values',
      'brand_personality',
      'brand_positioning',
      'target_audience',
      'tone_of_voice',
      'visual_identity',
      'dos_and_donts',
    ])

    const userPrompt = interpolateTemplate(prompt.userPromptTemplate, {
      ideas: JSON.stringify(ideas),
      brand_book: JSON.stringify(brandContext),
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

    let evaluation: unknown
    try {
      evaluation = JSON.parse(result.content)
    } catch {
      evaluation = { raw: result.content }
    }

    // Save to campaign stage
    await db!
      .from('campaign_stages')
      .upsert(
        {
          campaign_id: campaignId,
          stage_key: 'brand_filter',
          stage_number: 6,
          ai_generated: evaluation as Record<string, unknown>,
          ai_status: 'generated',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'campaign_id,stage_key' }
      )

    return NextResponse.json({
      evaluation,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    })
  } catch (error) {
    console.error('brand-filter error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
