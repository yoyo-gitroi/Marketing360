import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { callLLM, logLLMCall } from '@/lib/ai/orchestrator'

/**
 * Section-specific prompts that produce JSON matching the exact form field structures.
 * These work even when user_input is empty by using the brand book name as context.
 */
function getSectionPrompt(sectionKey: string, brandName: string, existingInput: Record<string, unknown>) {
  const inputContext = Object.keys(existingInput).length > 0
    ? `\n\nExisting user input to build upon:\n${JSON.stringify(existingInput, null, 2)}`
    : ''

  const prompts: Record<string, { system: string; user: string }> = {
    brand_identity: {
      system: `You are an expert brand strategist. Generate a brand identity framework.
Return ONLY valid JSON (no markdown, no code blocks) with these exact keys:
- brand_name (string)
- tagline (string)
- brand_story_origin (string): 2-3 paragraph founding story
- mission_statement (string)
- vision_statement (string)
- brand_promise (string)`,
      user: `Create a comprehensive brand identity for "${brandName}". Research what you know about this brand and generate compelling content for each field.${inputContext}`,
    },

    values_pillars: {
      system: `You are a brand values architect. Generate brand values and pillars.
Return ONLY valid JSON (no markdown, no code blocks) with these exact keys:
- core_values (array of strings): 3-5 core brand values
- brand_pillars (array of objects with "name" and "description" string keys): 3-4 strategic pillars
- differentiation_statement (string): what makes this brand unique`,
      user: `Define the brand values and strategic pillars for "${brandName}".${inputContext}`,
    },

    visual_identity: {
      system: `You are a visual identity specialist. Generate visual identity guidelines.
Return ONLY valid JSON (no markdown, no code blocks) with these exact keys:
- logo_url (string): empty string
- color_palette (array of objects with keys: "hex" (string, valid hex like #FF5733), "role" (string: primary/secondary/tertiary/accent), "usage_percentage" (string), "emotional_meaning" (string)): suggest 3-5 colors
- primary_font (string): font family name
- secondary_font (string): font family name
- typography_hierarchy_notes (string): hierarchy guidelines
- photography_style (string): style description
- iconography_notes (string): icon style guidelines`,
      user: `Define the visual identity for "${brandName}". Suggest appropriate colors, fonts, and visual style.${inputContext}`,
    },

    voice_tone: {
      system: `You are a brand voice and tone specialist. Generate voice and tone guidelines.
Return ONLY valid JSON (no markdown, no code blocks) with these exact keys:
- voice_attributes (array of strings): 3-5 voice adjectives
- dos (string): things the brand voice should do (bullet points as text)
- donts (string): things the brand voice should avoid (bullet points as text)
- formality_scale (number 1-10): 1=very casual, 10=very formal
- tone_by_channel (array of objects with "channel" and "tone_description" string keys): at least 3 channels
- key_messages (string): most important brand messages
- elevator_pitch (string): 30-second pitch
- boilerplate (string): standard company description`,
      user: `Create voice and tone guidelines for "${brandName}".${inputContext}`,
    },

    target_audience: {
      system: `You are a consumer insights specialist. Generate target audience profiles.
Return ONLY valid JSON (no markdown, no code blocks) with these exact keys:
- primary_tg (object with keys: "age_range", "gender", "location", "income_level", "education" - all strings)
- secondary_tg (object with same keys as primary_tg)
- psychographics_lifestyle (string)
- psychographics_pain_points (string)
- psychographics_aspirations (string)
- personas (array of 1-3 objects with keys: "name", "age", "occupation", "description" - all strings)
- search_keywords (array of strings): relevant search keywords
- sentiment_notes (string)
- hierarchy_of_use (string)`,
      user: `Develop target audience profiles for "${brandName}".${inputContext}`,
    },

    product_info: {
      system: `You are a product analyst. Generate product/service information.
Return ONLY valid JSON (no markdown, no code blocks) with these exact keys:
- product_description (string): detailed description
- key_features (array of strings): key features/ingredients
- certifications (array of strings): certifications or awards
- core_usp (string): unique selling proposition
- competitors (array of objects with keys: "name", "positioning", "strengths", "weaknesses" - all strings)
- pricing_notes (string)
- packaging_notes (string)`,
      user: `Analyze and describe the products/services for "${brandName}".${inputContext}`,
    },

    brand_history: {
      system: `You are a brand historian. Generate brand history and marketing presence information.
Return ONLY valid JSON (no markdown, no code blocks) with these exact keys:
- existing_campaigns (array of objects with keys: "name", "what_worked", "what_didnt" - all strings)
- social_media (array of objects with keys: "platform", "followers", "engagement_rate", "notes" - all strings)
- platform_strategy_notes (string)
- asset_library_links (string)
- legal_compliance_notes (string)

If specific data is not known, provide reasonable inferences based on the brand type.`,
      user: `Document the brand history and marketing presence for "${brandName}".${inputContext}`,
    },

    research_synthesis: {
      system: `You are a brand research analyst. Synthesize research insights.
Return ONLY valid JSON (no markdown, no code blocks) with these exact keys:
- founder_interview_notes (string): inferred founder's vision
- india_competition_notes (string): competitive landscape
- us_global_competition_notes (string): global context
- own_usp_reframing_thoughts (string): USP reframing ideas
- brand_story_draft_ideas (string): narrative ideas`,
      user: `Synthesize research insights for "${brandName}".${inputContext}`,
    },
  }

  return prompts[sectionKey]
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const { brandBookId, sectionKey } = body

    if (!brandBookId || !sectionKey) {
      return NextResponse.json(
        { error: 'brandBookId and sectionKey are required' },
        { status: 400 }
      )
    }

    // Get brand book name for context
    const { data: brandBook } = await db!
      .from('brand_books')
      .select('name, client_name')
      .eq('id', brandBookId)
      .single()

    const brandName = brandBook?.name || brandBook?.client_name || 'Unknown Brand'

    // Get current section's user_input (if any)
    const { data: sectionData } = await db!
      .from('brand_book_sections')
      .select('id, user_input')
      .eq('brand_book_id', brandBookId)
      .eq('section_key', sectionKey)
      .maybeSingle()

    const existingInput = (sectionData?.user_input as Record<string, unknown>) ?? {}

    // Get the inline prompt for this section
    const prompt = getSectionPrompt(sectionKey, brandName, existingInput)

    if (!prompt) {
      return NextResponse.json(
        { error: `No prompt defined for section: ${sectionKey}` },
        { status: 400 }
      )
    }

    // Update status to generating
    await db!
      .from('brand_book_sections')
      .update({ ai_status: 'generating', updated_at: new Date().toISOString() })
      .eq('brand_book_id', brandBookId)
      .eq('section_key', sectionKey)

    // Call LLM
    const promptKey = `brand_book.${sectionKey}`
    const result = await callLLM({
      systemPrompt: prompt.system,
      userPrompt: prompt.user,
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4096,
      temperature: 0.7,
      orgId: user!.orgId,
      userId: user!.id,
      promptKey,
      promptVersion: 2,
      relatedEntityType: 'brand_book',
      relatedEntityId: brandBookId,
    })

    // Log the call
    await logLLMCall(db!, {
      orgId: user!.orgId,
      userId: user!.id,
      promptKey,
      promptVersion: 2,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
      status: 'error' in result ? 'error' : 'success',
      errorMessage: 'error' in result ? result.error : null,
      relatedEntityType: 'brand_book',
      relatedEntityId: brandBookId,
    })

    if ('error' in result) {
      await db!
        .from('brand_book_sections')
        .update({ ai_status: 'error', updated_at: new Date().toISOString() })
        .eq('brand_book_id', brandBookId)
        .eq('section_key', sectionKey)

      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Parse JSON from LLM response - handle markdown code blocks
    let generated: Record<string, unknown>
    try {
      let content = result.content
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        content = jsonMatch[1]
      }
      generated = JSON.parse(content)
    } catch {
      // Try extracting JSON object from text
      const jsonStart = result.content.indexOf('{')
      const jsonEnd = result.content.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1) {
        try {
          generated = JSON.parse(result.content.substring(jsonStart, jsonEnd + 1))
        } catch {
          await db!
            .from('brand_book_sections')
            .update({ ai_status: 'error', updated_at: new Date().toISOString() })
            .eq('brand_book_id', brandBookId)
            .eq('section_key', sectionKey)

          return NextResponse.json(
            { error: 'AI returned invalid JSON. Please try again.' },
            { status: 500 }
          )
        }
      } else {
        await db!
          .from('brand_book_sections')
          .update({ ai_status: 'error', updated_at: new Date().toISOString() })
            .eq('brand_book_id', brandBookId)
            .eq('section_key', sectionKey)

        return NextResponse.json(
          { error: 'AI returned invalid JSON. Please try again.' },
          { status: 500 }
        )
      }
    }

    // Upsert: INSERT if section doesn't exist, UPDATE if it does
    if (sectionData?.id) {
      const { error: updateError } = await db!
        .from('brand_book_sections')
        .update({
          user_input: generated,
          ai_generated: generated,
          ai_status: 'generated',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sectionData.id)

      if (updateError) {
        return NextResponse.json(
          { error: `Failed to save: ${updateError.message}` },
          { status: 500 }
        )
      }
    } else {
      const { error: insertError } = await db!
        .from('brand_book_sections')
        .insert({
          brand_book_id: brandBookId,
          section_key: sectionKey,
          user_input: generated,
          ai_generated: generated,
          ai_status: 'generated',
        })

      if (insertError) {
        return NextResponse.json(
          { error: `Failed to save: ${insertError.message}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      content: generated,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    })
  } catch (error) {
    console.error('generate-section error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
