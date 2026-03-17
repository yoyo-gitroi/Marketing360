import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { callLLM, logLLMCall } from '@/lib/ai/orchestrator'
import type { ScrapedData } from '@/lib/scraper'

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
 * Section-specific prompts that produce JSON matching the exact form field structure
 * each step component expects in user_input.
 */
function getSectionPrompt(sectionKey: string, scrapedData: ScrapedData | null, domain: string) {
  let baseContext: string

  if (scrapedData && scrapedData.text) {
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

    baseContext = `
Website: ${domain}
Website Text Content:
${allText.substring(0, 12000)}

Images Found:
${imagesInfo || 'None'}

Fonts Found: ${fontsInfo}

Colors Found:
${colorsInfo}
`
  } else {
    // No scraped data - rely on LLM knowledge
    baseContext = `
Website/Brand: ${domain}
NOTE: Website scraping was not possible. Use your knowledge about this brand/domain to generate the best possible content. If you don't have specific knowledge about this brand, infer from the domain name and create professional, plausible content.
`
  }

  const prompts: Record<string, { system: string; user: string }> = {
    brand_identity: {
      system: `You are an expert brand strategist. Analyze the brand and create a brand identity framework. Return ONLY valid JSON (no markdown, no code blocks, no explanation) with these exact keys:
- brand_name (string): the brand name
- tagline (string): existing or inferred tagline
- brand_story_origin (string): the brand's founding story or origin, 2-3 paragraphs
- mission_statement (string): the brand's mission
- vision_statement (string): the brand's vision for the future
- brand_promise (string): the core promise to customers`,
      user: `Create a comprehensive brand identity profile for this brand:\n${baseContext}`,
    },

    values_pillars: {
      system: `You are a brand values architect. Analyze the brand and define its values and pillars. Return ONLY valid JSON (no markdown, no code blocks, no explanation) with these exact keys:
- core_values (array of strings): 3-5 core brand values
- brand_pillars (array of objects with "name" and "description" keys): 3-4 strategic brand pillars
- differentiation_statement (string): what makes this brand uniquely different`,
      user: `Define the brand values and strategic pillars:\n${baseContext}`,
    },

    visual_identity: {
      system: `You are a visual identity specialist. Analyze the brand and document its visual identity. Return ONLY valid JSON (no markdown, no code blocks, no explanation) with these exact keys:
- logo_url (string): empty string
- color_palette (array of objects with keys: "hex" (string, hex color code like #FF5733), "role" (string: primary/secondary/tertiary/accent), "usage_percentage" (string), "emotional_meaning" (string)): 3-5 brand colors
- primary_font (string): primary font family name
- secondary_font (string): secondary font family name
- typography_hierarchy_notes (string): notes about typography usage
- photography_style (string): describe the photography/image style
- iconography_notes (string): notes about icon usage

IMPORTANT: Use hex format for colors (e.g., #FF5733).`,
      user: `Define the visual identity:\n${baseContext}`,
    },

    voice_tone: {
      system: `You are a brand voice and tone specialist. Analyze the brand and create voice/tone guidelines. Return ONLY valid JSON (no markdown, no code blocks, no explanation) with these exact keys:
- voice_attributes (array of strings): 3-5 adjectives describing the brand voice
- dos (string): what the brand voice should do (bullet points as text)
- donts (string): what the brand voice should avoid (bullet points as text)
- formality_scale (number 1-10): 1=very casual, 10=very formal
- tone_by_channel (array of objects with "channel" and "tone_description" keys): at least 3 channels
- key_messages (string): the most important messages the brand conveys
- elevator_pitch (string): a 30-second pitch for the brand
- boilerplate (string): standard company description`,
      user: `Create voice and tone guidelines:\n${baseContext}`,
    },

    target_audience: {
      system: `You are a consumer insights specialist. Analyze the brand and define its target audience. Return ONLY valid JSON (no markdown, no code blocks, no explanation) with these exact keys:
- primary_tg (object with keys: "age_range", "gender", "location", "income_level", "education" - all strings)
- secondary_tg (object with same keys as primary_tg)
- psychographics_lifestyle (string)
- psychographics_pain_points (string)
- psychographics_aspirations (string)
- personas (array of 1-3 objects with keys: "name", "age", "occupation", "description" - all strings)
- search_keywords (array of strings): relevant search keywords
- sentiment_notes (string)
- hierarchy_of_use (string)`,
      user: `Develop target audience profiles:\n${baseContext}`,
    },

    product_info: {
      system: `You are a product analyst. Analyze the brand and extract/infer product information. Return ONLY valid JSON (no markdown, no code blocks, no explanation) with these exact keys:
- product_description (string): detailed description
- key_features (array of strings): key features
- certifications (array of strings): certifications or awards
- core_usp (string): unique selling proposition
- competitors (array of objects with keys: "name", "positioning", "strengths", "weaknesses" - all strings)
- pricing_notes (string)
- packaging_notes (string)`,
      user: `Analyze the products/services:\n${baseContext}`,
    },

    brand_history: {
      system: `You are a brand historian. Analyze the brand and document its history and marketing presence. Return ONLY valid JSON (no markdown, no code blocks, no explanation) with these exact keys:
- existing_campaigns (array of objects with keys: "name", "what_worked", "what_didnt" - all strings)
- social_media (array of objects with keys: "platform", "followers", "engagement_rate", "notes" - all strings)
- platform_strategy_notes (string)
- asset_library_links (string)
- legal_compliance_notes (string)

If specific data is not known, provide reasonable inferences.`,
      user: `Document brand history and marketing presence:\n${baseContext}`,
    },

    research_synthesis: {
      system: `You are a brand research analyst. Synthesize research insights. Return ONLY valid JSON (no markdown, no code blocks, no explanation) with these exact keys:
- founder_interview_notes (string): inferred founder's vision
- india_competition_notes (string): competitive landscape
- us_global_competition_notes (string): global context
- own_usp_reframing_thoughts (string): USP reframing ideas
- brand_story_draft_ideas (string): narrative ideas`,
      user: `Synthesize research insights:\n${baseContext}`,
    },
  }

  return prompts[sectionKey] || { system: 'Analyze the brand.', user: baseContext }
}

/**
 * Parse JSON from LLM response, handling markdown code blocks and extra text
 */
function parseGeneratedJSON(content: string): Record<string, unknown> | null {
  // Try direct parse
  try {
    return JSON.parse(content)
  } catch { /* continue */ }

  // Try extracting from markdown code block
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1])
    } catch { /* continue */ }
  }

  // Try extracting JSON object from text
  const jsonStart = content.indexOf('{')
  const jsonEnd = content.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    try {
      return JSON.parse(content.substring(jsonStart, jsonEnd + 1))
    } catch { /* continue */ }
  }

  return null
}

/**
 * Upsert a brand book section - INSERT if it doesn't exist, UPDATE if it does
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertSection(
  db: any,
  brandBookId: string,
  sectionKey: string,
  generated: Record<string, unknown>
): Promise<string | null> {
  // Check if section exists
  const { data: existing } = await db
    .from('brand_book_sections')
    .select('id')
    .eq('brand_book_id', brandBookId)
    .eq('section_key', sectionKey)
    .maybeSingle()

  if (existing) {
    // UPDATE existing
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
    // INSERT new
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

    // Validate domain / URL
    let url = domain.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    // 1. Try to scrape the website (but don't fail if scraping doesn't work)
    let scrapedData: ScrapedData | null = null
    try {
      // Dynamic import to avoid build issues if puppeteer isn't available
      const { scrapeWebsiteLightweight } = await import('@/lib/scraper')
      scrapedData = await scrapeWebsiteLightweight(url)

      // Check if we got meaningful data
      if (!scrapedData.text || scrapedData.text.length < 50) {
        console.warn(`Scraping returned minimal data for ${url}, proceeding with LLM knowledge only`)
        scrapedData = null
      }
    } catch (scrapeError) {
      console.warn(`Scraping failed for ${url}, proceeding with LLM knowledge:`, scrapeError)
      scrapedData = null
    }

    // 2. For each section, generate content via LLM and save
    const results: Record<string, { success: boolean; error?: string }> = {}

    for (const sectionKey of SECTION_KEYS) {
      try {
        const prompt = getSectionPrompt(sectionKey, scrapedData, url)

        const llmResult = await callLLM({
          systemPrompt: prompt.system,
          userPrompt: prompt.user,
          model: 'claude-sonnet-4-20250514',
          maxTokens: 4096,
          temperature: 0.7,
          orgId: user!.orgId,
          userId: user!.id,
          promptKey: `brand_book.${sectionKey}`,
          promptVersion: 2,
          relatedEntityType: 'brand_book',
          relatedEntityId: brandBookId,
        })

        // Log the LLM call
        await logLLMCall(db!, {
          orgId: user!.orgId,
          userId: user!.id,
          promptKey: `brand_book.${sectionKey}`,
          promptVersion: 2,
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

        // Parse JSON
        const generated = parseGeneratedJSON(llmResult.content)
        if (!generated) {
          results[sectionKey] = { success: false, error: 'AI returned invalid JSON' }
          continue
        }

        // Upsert section (handles both INSERT and UPDATE)
        const upsertError = await upsertSection(db!, brandBookId, sectionKey, generated)
        if (upsertError) {
          results[sectionKey] = { success: false, error: upsertError }
          continue
        }

        results[sectionKey] = { success: true }
      } catch (err) {
        results[sectionKey] = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }
    }

    // Update brand book status
    await db!
      .from('brand_books')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', brandBookId)

    const successCount = Object.values(results).filter((r) => r.success).length

    return NextResponse.json({
      success: true,
      message: `Generated ${successCount}/${SECTION_KEYS.length} sections`,
      results,
      scrapedUrl: url,
      scraped: !!scrapedData,
    })
  } catch (error) {
    console.error('scrape-and-generate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
