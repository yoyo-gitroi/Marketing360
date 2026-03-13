import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadPrompt, interpolateTemplate } from '@/lib/ai/prompt-loader'
import { callLLM, logLLMCall } from '@/lib/ai/orchestrator'
import { buildSectionContext } from '@/lib/ai/section-context'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campaignId, ideas, brandBookId } = body

    if (!campaignId || !ideas || !brandBookId) {
      return NextResponse.json(
        { error: 'campaignId, ideas, and brandBookId are required' },
        { status: 400 }
      )
    }

    const { data: profileData } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    const profile = profileData as { org_id: string } | null
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Load prompt
    const promptKey = 'campaign.brand_filter'
    const prompt = await loadPrompt(supabase, promptKey)

    // Build brand book context for evaluation
    const brandContext = await buildSectionContext(supabase, brandBookId, [
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
      orgId: profile.org_id,
      userId: user.id,
      promptKey,
      promptVersion: prompt.version,
      relatedEntityType: 'campaign',
      relatedEntityId: campaignId,
    })

    await logLLMCall(supabase, {
      orgId: profile.org_id,
      userId: user.id,
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
    await (supabase as any)
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
