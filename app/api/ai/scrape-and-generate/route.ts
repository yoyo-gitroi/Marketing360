import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { callLLM, logLLMCall } from '@/lib/ai/orchestrator'
import { scrapeWebsite, type ScrapedData } from '@/lib/scraper'

const SECTION_KEYS = [
  'brand_identity',
  'values_pillars',
  'visual_identity',
  'voice_tone',
  'target_audience',
  'product_info',
  'brand_history',
  'research_synthesis',
] as const

/**
 * Build the context string from scraped data (or domain-only fallback)
 */
function buildContext(scrapedData: ScrapedData | null, domain: string): string {
  if (!scrapedData || !scrapedData.text) {
    return `
Website/Brand: ${domain}
NOTE: Website content was not available for scraping. Use your knowledge about this brand/domain to generate the best possible content. If you don't have specific knowledge, infer from the domain name and create professional content.
`
  }

  const allText = [
    scrapedData.text,
    ...scrapedData.additionalData.map((d) => d.text),
  ].join('\n\n')

  const colorsInfo = scrapedData.colors
    ? JSON.stringify(scrapedData.colors, null, 2)
    : 'Not available'

  const fontsInfo = scrapedData.fonts.length > 0
    ? scrapedData.fonts.join(', ')
    : 'Not available'

  const imagesInfo = scrapedData.images.slice(0, 10)
    .map((img) => `${img.title}: ${img.link}`)
    .join('\n')

  return `
Website: ${domain}

Website Text Content:
${allText.substring(0, 12000)}

Images Found:
${imagesInfo || 'None'}

Fonts Found: ${fontsInfo}

Colors Found:
${colorsInfo}
`
}

/**
 * Section-specific prompts that produce JSON matching exact form field structures
 */
function getSectionPrompt(sectionKey: string, context: string) {
  const prompts: Record<string, { system: string; user: string }> = {
    brand_identity: {
      system: `You are an expert brand strategist. Analyze the brand and create a brand identity framework. Return ONLY valid JSON (no markdown, no code blocks, no explanation) with these exact keys:
- brand_name (string): the brand name
- tagline (string): existing or inferred tagline
- brand_story_origin (string): the brand's founding story or origin, 2-3 paragraphs
- mission_statement (string): the brand's mission
- vision_statement (string): the brand's vision for the future
- brand_promise (string): the core promise to customers`,
      user: `Create a comprehensive brand identity profile:\n${context}`,
    },

    values_pillars: {
      system: `You are a brand values architect. Return ONLY valid JSON (no markdown, no code blocks, no explanation) with these exact keys:
- core_values (array of strings): 3-5 core brand values
- brand_pillars (array of objects with "name" and "description" keys): 3-4 strategic pillars
- differentiation_statement (string): what makes this brand unique`,
      user: `Define brand values and strategic pillars:\n${context}`,
    },

    visual_identity: {
      system: `You are a visual identity specialist. Return ONLY valid JSON (no markdown, no code blocks, no explanation) with these exact keys:
- logo_url (string): empty string
- color_palette (array of objects with "hex" (string like #FF5733), "role" (primary/secondary/tertiary/accent), "usage_percentage" (string), "emotional_meaning" (string)): 3-5 colors
- primary_font (string): font family name
- secondary_font (string): font family name
- typography_hierarchy_notes (string)
- photography_style (string)
- iconography_notes (string)

IMPORTANT: Use hex color format. Convert any RGB values to hex.`,
      user: `Define the visual identity:\n${context}`,
    },

    voice_tone: {
      system: `You are a brand voice and tone specialist. Return ONLY valid JSON (no markdown, no code blocks, no explanation) with these exact keys:
- voice_attributes (array of strings): 3-5 voice adjectives
- dos (string): what the brand voice should do
- donts (string): what the brand voice should avoid
- formality_scale (number 1-10): 1=casual, 10=formal
- tone_by_channel (array of objects with "channel" and "tone_description" keys): 3+ channels
- key_messages (string)
- elevator_pitch (string)
- boilerplate (string)`,
      user: `Create voice and tone guidelines:\n${context}`,
    },

    target_audience: {
      system: `You are a consumer insights specialist. Return ONLY valid JSON (no markdown, no code blocks, no explanation) with these exact keys:
- primary_tg (object: "age_range", "gender", "location", "income_level", "education" - all strings)
- secondary_tg (same structure as primary_tg)
- psychographics_lifestyle (string)
- psychographics_pain_points (string)
- psychographics_aspirations (string)
- personas (array of 1-3 objects: "name", "age", "occupation", "description" - all strings)
- search_keywords (array of strings)
- sentiment_notes (string)
- hierarchy_of_use (string)`,
      user: `Develop target audience profiles:\n${context}`,
    },

    product_info: {
      system: `You are a product analyst. Return ONLY valid JSON (no markdown, no code blocks, no explanation) with these exact keys:
- product_description (string)
- key_features (array of strings)
- certifications (array of strings)
- core_usp (string)
- competitors (array of objects: "name", "positioning", "strengths", "weaknesses" - all strings)
- pricing_notes (string)
- packaging_notes (string)`,
      user: `Analyze products/services:\n${context}`,
    },

    brand_history: {
      system: `You are a brand historian. Return ONLY valid JSON (no markdown, no code blocks, no explanation) with these exact keys:
- existing_campaigns (array of objects: "name", "what_worked", "what_didnt" - all strings)
- social_media (array of objects: "platform", "followers", "engagement_rate", "notes" - all strings)
- platform_strategy_notes (string)
- asset_library_links (string)
- legal_compliance_notes (string)

If specific data is not known, provide reasonable inferences.`,
      user: `Document brand history and marketing presence:\n${context}`,
    },

    research_synthesis: {
      system: `You are a brand research analyst. Return ONLY valid JSON (no markdown, no code blocks, no explanation) with these exact keys:
- founder_interview_notes (string)
- india_competition_notes (string)
- us_global_competition_notes (string)
- own_usp_reframing_thoughts (string)
- brand_story_draft_ideas (string)`,
      user: `Synthesize research insights:\n${context}`,
    },
  }

  return prompts[sectionKey] || { system: 'Analyze the brand.', user: context }
}

/**
 * Parse JSON from LLM response, handling code blocks and extra text
 */
function parseJSON(content: string): Record<string, unknown> | null {
  // Direct parse
  try { return JSON.parse(content) } catch { /* continue */ }

  // Extract from markdown code block
  const m = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (m) { try { return JSON.parse(m[1]) } catch { /* continue */ } }

  // Extract JSON object from surrounding text
  const s = content.indexOf('{')
  const e = content.lastIndexOf('}')
  if (s !== -1 && e > s) {
    try { return JSON.parse(content.substring(s, e + 1)) } catch { /* continue */ }
  }

  return null
}

/**
 * Upsert a brand book section
 */
async function upsertSection(
  db: any,
  brandBookId: string,
  sectionKey: string,
  generated: Record<string, unknown>
): Promise<string | null> {
  const { data: existing } = await db
    .from('brand_book_sections')
    .select('id')
    .eq('brand_book_id', brandBookId)
    .eq('section_key', sectionKey)
    .maybeSingle()

  if (existing) {
    const { error } = await db
      .from('brand_book_sections')
      .update({
        user_input: generated,
        ai_generated: generated,
        ai_status: 'generated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    return error ? error.message : null
  } else {
    const { error } = await db
      .from('brand_book_sections')
      .insert({
        brand_book_id: brandBookId,
        section_key: sectionKey,
        user_input: generated,
        ai_generated: generated,
        ai_status: 'generated',
      })
    return error ? error.message : null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const { brandBookId, domain } = body

    if (!brandBookId || !domain) {
      return NextResponse.json(
        { error: 'brandBookId and domain are required' },
        { status: 400 }
      )
    }

    let url = domain.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    // ── Step 1: Scrape the website ──
    let scrapedData: ScrapedData | null = null
    let scrapeError: string | null = null

    try {
      scrapedData = await scrapeWebsite(url)
      if (!scrapedData.text || scrapedData.text.length < 50) {
        scrapeError = 'Minimal content scraped'
        scrapedData = null
      }
    } catch (err: any) {
      scrapeError = err.message || 'Unknown scraping error'
      console.error(`Scraping failed for ${url}:`, scrapeError)
    }

    // ── Step 2: Store scraped data in database ──
    const scrapeRecord = {
      brand_book_id: brandBookId,
      domain: url,
      scraped_text: scrapedData?.text?.substring(0, 50000) || null,
      images: scrapedData?.images || [],
      fonts: scrapedData?.fonts || [],
      colors: scrapedData?.colors || {},
      additional_pages: scrapedData?.additionalData || [],
      status: scrapedData ? 'completed' : 'failed',
      error_message: scrapeError,
    }

    await db!.from('scraped_data').insert(scrapeRecord)

    // ── Step 3: Build context and generate all sections via LLM ──
    const context = buildContext(scrapedData, url)
    const results: Record<string, { success: boolean; error?: string }> = {}

    for (const sectionKey of SECTION_KEYS) {
      try {
        const prompt = getSectionPrompt(sectionKey, context)

        const llmResult = await callLLM({
          systemPrompt: prompt.system,
          userPrompt: prompt.user,
          model: 'claude-sonnet-4-20250514',
          maxTokens: 4096,
          temperature: 0.7,
          orgId: user!.orgId,
          userId: user!.id,
          promptKey: `brand_book.${sectionKey}`,
          promptVersion: 3,
          relatedEntityType: 'brand_book',
          relatedEntityId: brandBookId,
        })

        await logLLMCall(db!, {
          orgId: user!.orgId,
          userId: user!.id,
          promptKey: `brand_book.${sectionKey}`,
          promptVersion: 3,
          inputTokens: llmResult.inputTokens,
          outputTokens: llmResult.outputTokens,
          latencyMs: llmResult.latencyMs,
          status: 'error' in llmResult ? 'error' : 'success',
          errorMessage: 'error' in llmResult ? llmResult.error : null,
          relatedEntityType: 'brand_book',
          relatedEntityId: brandBookId,
        })

        if ('error' in llmResult) {
          results[sectionKey] = { success: false, error: llmResult.error }
          continue
        }

        const generated = parseJSON(llmResult.content)
        if (!generated) {
          results[sectionKey] = { success: false, error: 'AI returned invalid JSON' }
          continue
        }

        const upsertError = await upsertSection(db!, brandBookId, sectionKey, generated)
        if (upsertError) {
          results[sectionKey] = { success: false, error: upsertError }
          continue
        }

        results[sectionKey] = { success: true }
      } catch (err: any) {
        results[sectionKey] = { success: false, error: err.message || 'Unknown error' }
      }
    }

    // Update brand book status
    await db!
      .from('brand_books')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', brandBookId)

    const successCount = Object.values(results).filter((r) => r.success).length

    return NextResponse.json({
      success: true,
      message: `Generated ${successCount}/${SECTION_KEYS.length} sections`,
      results,
      scraped: !!scrapedData,
      scrapeError,
    })
  } catch (error: any) {
    console.error('scrape-and-generate error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
