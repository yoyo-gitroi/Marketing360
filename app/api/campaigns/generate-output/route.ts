import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { callLLM } from '@/lib/ai/orchestrator'

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
    const { campaignId } = body

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
    }

    // Get campaign details
    const { data: campaign } = await db!
      .from('campaigns')
      .select('id, name, client_name, brand_book_id, org_id')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Create output record with 'generating' status
    const { data: outputRecord, error: insertError } = await db!
      .from('campaign_outputs')
      .insert({
        campaign_id: campaignId,
        org_id: campaign.org_id,
        generated_by: user!.id,
        status: 'generating',
        ai_model: 'claude-sonnet-4-20250514',
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Failed to create output record:', insertError)
      return NextResponse.json({ error: 'Failed to create output record' }, { status: 500 })
    }

    // Fetch all 9 campaign stages
    const { data: allStages } = await db!
      .from('campaign_stages')
      .select('stage_key, user_input, ai_generated, final_content')
      .eq('campaign_id', campaignId)
      .order('stage_number')

    const stagesData: Record<string, unknown> = {}
    if (allStages) {
      for (const stage of allStages) {
        const content =
          (stage.final_content && Object.keys(stage.final_content).length > 0)
            ? stage.final_content
            : (stage.user_input && Object.keys(stage.user_input).length > 0)
              ? stage.user_input
              : stage.ai_generated
        if (content && Object.keys(content).length > 0) {
          stagesData[stage.stage_key] = content
        }
      }
    }

    // Build brand context
    let brandContext = 'No brand book linked.'
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

    const systemPrompt = `You are a senior creative strategist and campaign planner. Generate a comprehensive campaign output document as a JSON object. Return ONLY valid JSON matching the exact structure specified. Be specific, creative, and actionable.`

    const userPrompt = `Generate a complete campaign output for "${campaign.name}"${campaign.client_name ? ` (client: ${campaign.client_name})` : ''}.

Brand context: ${brandContext}

All campaign stage data (9 stages of research, hypothesis, and ideation):
${JSON.stringify(stagesData, null, 2)}

Return JSON with EXACTLY this structure:
{
  "campaign_title": "string",
  "strategic_insight": "string - 2-3 paragraphs",
  "target_groups": [
    { "name": "string", "description": "string", "key_traits": ["string"] }
  ],
  "tagline_options": [
    { "tagline": "string", "tone": "string", "rationale": "string" }
  ],
  "campaign_concept": {
    "title": "string",
    "description": "string - 2-3 paragraphs explaining the campaign mechanic",
    "key_elements": ["string"]
  },
  "campaign_phases": [
    {
      "phase_number": 1,
      "phase_name": "string",
      "objective": "string",
      "duration": "string",
      "hero_content": { "concept": "string", "format": "string", "description": "string" },
      "supporting_content": [
        { "type": "string", "concept": "string", "description": "string" }
      ]
    }
  ],
  "channel_content_ideas": [
    {
      "channel": "string",
      "content_format": "string",
      "ideas": [
        { "title": "string", "hook": "string", "description": "string", "visual_direction": "string" }
      ]
    }
  ],
  "content_calendar": {
    "cadence": "string",
    "monthly_themes": [{ "month": "string", "theme": "string", "focus": "string" }]
  },
  "visual_guidelines": {
    "tone": "string",
    "style_direction": "string",
    "dos": ["string"],
    "donts": ["string"],
    "color_mood": "string",
    "reference_aesthetics": "string"
  },
  "narrative_guidelines": {
    "voice": "string",
    "key_messages": ["string"],
    "hashtags": ["string"],
    "cta_style": "string"
  }
}

Guidelines:
- Generate 2-3 target group segments
- Generate 2-3 tagline options
- Create 3 campaign phases
- Generate 3-5 content ideas per channel (use channels from platform_channel stage data)
- Create a 3-month content calendar
- Use the selected hypothesis as the creative foundation
- Incorporate the best ideas from the ideation room
- Be specific and actionable`

    const result = await callLLM({
      systemPrompt,
      userPrompt,
      model: 'claude-sonnet-4-20250514',
      maxTokens: 8192,
      temperature: 0.7,
      orgId: user!.orgId,
      userId: user!.id,
      promptKey: 'campaign.output_generation',
      promptVersion: 1,
      relatedEntityType: 'campaign',
      relatedEntityId: campaignId,
    })

    if ('error' in result) {
      await db!.from('campaign_outputs').update({
        status: 'error',
        updated_at: new Date().toISOString(),
      }).eq('id', outputRecord.id)

      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    const parsed = parseJSON(result.content)
    if (!parsed) {
      await db!.from('campaign_outputs').update({
        status: 'error',
        updated_at: new Date().toISOString(),
      }).eq('id', outputRecord.id)

      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // Update output record with generated content
    await db!.from('campaign_outputs').update({
      output_content: parsed,
      status: 'completed',
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      updated_at: new Date().toISOString(),
    }).eq('id', outputRecord.id)

    // Update campaign status
    await db!.from('campaigns').update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    }).eq('id', campaignId)

    return NextResponse.json({
      outputId: outputRecord.id,
      content: parsed,
    })
  } catch (error) {
    console.error('generate-output error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
