import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { callLLM } from '@/lib/ai/orchestrator'

export async function POST(request: NextRequest) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const { campaignId } = body

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
    }

    // Get campaign details
    const { data: campaign } = await db!
      .from('campaigns')
      .select('id, name, client_name, brand_book_id')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Build brand context
    let brandContext = 'No brand book linked.'
    if (campaign.brand_book_id) {
      const { data: brandSections } = await db!
        .from('brand_book_sections')
        .select('section_key, user_input, ai_generated, final_content')
        .eq('brand_book_id', campaign.brand_book_id)

      if (brandSections?.length) {
        const brandData: Record<string, unknown> = {}
        for (const s of brandSections) {
          const content = (s.final_content && Object.keys(s.final_content).length > 0) ? s.final_content
            : (s.user_input && Object.keys(s.user_input).length > 0) ? s.user_input : s.ai_generated
          if (content && Object.keys(content).length > 0) brandData[s.section_key] = content
        }
        if (Object.keys(brandData).length > 0) brandContext = JSON.stringify(brandData)
      }
    }

    // Build context from all prior stages
    const { data: allStages } = await db!
      .from('campaign_stages')
      .select('stage_key, user_input, ai_generated')
      .eq('campaign_id', campaignId)
      .order('stage_number')

    const priorData: Record<string, unknown> = {}
    if (allStages) {
      for (const stage of allStages) {
        if (stage.stage_key === 'ideation_room') continue
        const content = (stage.user_input && Object.keys(stage.user_input).length > 0) ? stage.user_input : stage.ai_generated
        if (content && Object.keys(content).length > 0) priorData[stage.stage_key] = content
      }
    }

    const result = await callLLM({
      systemPrompt: 'You are a creative director at a top advertising agency. Generate bold, creative campaign ideas. Return ONLY valid JSON.',
      userPrompt: `Generate creative campaign ideas for "${campaign.name}"${campaign.client_name ? ` (${campaign.client_name})` : ''}.

Brand context: ${brandContext}
All campaign research and hypotheses: ${Object.keys(priorData).length > 0 ? JSON.stringify(priorData) : 'No prior data yet.'}

Return JSON:
{
  "idea_sets": [
    {
      "theme": "string - overarching idea theme",
      "tagline": "string - campaign tagline",
      "concept": "string - creative concept description",
      "key_visual": "string - key visual description",
      "hero_message": "string - hero messaging",
      "channels": "string - recommended channels",
      "viral_hook": "string - what makes it shareable"
    }
  ]
}`,
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4096,
      temperature: 0.8,
      orgId: user!.orgId,
      userId: user!.id,
      promptKey: 'campaign.ideation',
      promptVersion: 1,
      relatedEntityType: 'campaign',
      relatedEntityId: campaignId,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    let ideaSets: unknown
    try {
      const parsed = JSON.parse(result.content)
      ideaSets = parsed.idea_sets || parsed
    } catch {
      const match = result.content.match(/\{[\s\S]*\}/)
      if (match) {
        try {
          const parsed = JSON.parse(match[0])
          ideaSets = parsed.idea_sets || parsed
        } catch {
          ideaSets = [{ theme: 'Generated', concept: result.content }]
        }
      }
    }

    // Save to stage
    await db!
      .from('campaign_stages')
      .update({
        ai_generated: { idea_sets: ideaSets },
        user_input: { idea_sets: ideaSets },
        ai_status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('campaign_id', campaignId)
      .eq('stage_key', 'ideation_room')

    return NextResponse.json({ idea_sets: ideaSets })
  } catch (error) {
    console.error('generate-ideation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
