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
 * Section-specific prompts that produce JSON matching the exact form field structure
 * each step component expects in user_input.
 */
function getSectionPrompt(sectionKey: string, scrapedData: ScrapedData, domain: string) {
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

  const baseContext = `
Website: ${domain}
Website Text Content:
${allText.substring(0, 12000)}

Images Found:
${imagesInfo || 'None'}

Fonts Found: ${fontsInfo}

Colors Found:
${colorsInfo}
`

  const prompts: Record<string, { system: string; user: string }> = {
    brand_identity: {
      system: `You are an expert brand strategist. Analyze the scraped website data and extract/infer the brand identity. Return ONLY valid JSON with these exact keys:
- brand_name (string): the brand name
- tagline (string): existing or inferred tagline
- brand_story_origin (string): the brand's founding story or origin, inferred from website content
- mission_statement (string): the brand's mission
- vision_statement (string): the brand's vision for the future
- brand_promise (string): the core promise to customers`,
      user: `Analyze this website and create a brand identity profile:\n${baseContext}`,
    },

    values_pillars: {
      system: `You are a brand values architect. Analyze the scraped website data and extract/infer brand values and pillars. Return ONLY valid JSON with these exact keys:
- core_values (array of strings): 3-5 core brand values
- brand_pillars (array of objects with "name" and "description" keys): 3-4 strategic brand pillars
- differentiation_statement (string): what makes this brand uniquely different`,
      user: `Analyze this website and extract the brand values and pillars:\n${baseContext}`,
    },

    visual_identity: {
      system: `You are a visual identity specialist. Analyze the scraped website data (colors, fonts, images) and document the visual identity. Return ONLY valid JSON with these exact keys:
- logo_url (string): URL of the logo if found in images, otherwise empty string
- color_palette (array of objects with keys: "hex" (string, hex color code), "role" (string: primary/secondary/tertiary/accent), "usage_percentage" (string), "emotional_meaning" (string)): extract actual colors from the website
- primary_font (string): primary font family used
- secondary_font (string): secondary font family used
- typography_hierarchy_notes (string): notes about typography usage
- photography_style (string): describe the photography/image style used
- iconography_notes (string): notes about icon usage if any

IMPORTANT: Convert RGB colors to hex format (e.g., rgb(255,0,0) -> #FF0000).`,
      user: `Analyze this website's visual identity:\n${baseContext}`,
    },

    voice_tone: {
      system: `You are a brand voice and tone specialist. Analyze the website copy to determine the brand's voice and tone. Return ONLY valid JSON with these exact keys:
- voice_attributes (array of strings): 3-5 adjectives describing the brand voice
- dos (string): what the brand voice should do (bullet points as text)
- donts (string): what the brand voice should avoid (bullet points as text)
- formality_scale (number 1-10): 1=very casual, 10=very formal
- tone_by_channel (array of objects with "channel" and "tone_description" keys): suggest tone for at least 3 channels
- key_messages (string): the most important messages the brand conveys
- elevator_pitch (string): a 30-second pitch for the brand
- boilerplate (string): standard company description`,
      user: `Analyze the voice and tone from this website's content:\n${baseContext}`,
    },

    target_audience: {
      system: `You are a consumer insights specialist. Analyze the website to infer the target audience. Return ONLY valid JSON with these exact keys:
- primary_tg (object with keys: "age_range", "gender", "location", "income_level", "education" - all strings)
- secondary_tg (object with same keys as primary_tg)
- psychographics_lifestyle (string): lifestyle description
- psychographics_pain_points (string): pain points the brand addresses
- psychographics_aspirations (string): what the audience aspires to
- personas (array of objects with keys: "name", "age", "occupation", "description" - all strings): 1-3 buyer personas
- search_keywords (array of strings): relevant search keywords
- sentiment_notes (string): how the audience likely feels about this brand/category
- hierarchy_of_use (string): priority of product/service usage`,
      user: `Analyze this website and infer the target audience:\n${baseContext}`,
    },

    product_info: {
      system: `You are a product analyst. Analyze the website to extract product/service information. Return ONLY valid JSON with these exact keys:
- product_description (string): detailed description of the product/service
- key_features (array of strings): key features or ingredients
- certifications (array of strings): any certifications or awards
- core_usp (string): the single most compelling USP
- competitors (array of objects with keys: "name", "positioning", "strengths", "weaknesses" - all strings): inferred competitors
- pricing_notes (string): pricing info if available, otherwise "Not available from website"
- packaging_notes (string): packaging/presentation notes if applicable`,
      user: `Analyze this website and extract product information:\n${baseContext}`,
    },

    brand_history: {
      system: `You are a brand historian. Analyze the website to extract any historical information about the brand. Return ONLY valid JSON with these exact keys:
- existing_campaigns (array of objects with keys: "name", "what_worked", "what_didnt" - all strings): any campaigns or marketing initiatives found
- social_media (array of objects with keys: "platform", "followers", "engagement_rate", "notes" - all strings): social media presence if found
- platform_strategy_notes (string): overall digital strategy observations
- asset_library_links (string): any links to brand assets found
- legal_compliance_notes (string): any legal/compliance info found

If information is not available, provide reasonable inferences based on the brand type.`,
      user: `Analyze this website for brand history and marketing presence:\n${baseContext}`,
    },

    research_synthesis: {
      system: `You are a brand research analyst. Synthesize all the information from the website into research insights. Return ONLY valid JSON with these exact keys:
- founder_interview_notes (string): inferred founder's vision and story based on website content
- india_competition_notes (string): competitive landscape observations (infer if the brand is Indian or global)
- us_global_competition_notes (string): global competitive context
- own_usp_reframing_thoughts (string): how the USP could be reframed for different audiences
- brand_story_draft_ideas (string): ideas for the brand narrative based on all gathered information`,
      user: `Synthesize research insights from this website:\n${baseContext}`,
    },
  }

  return prompts[sectionKey] || { system: 'Analyze the website.', user: baseContext }
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

    // 1. Scrape the website
    const scrapedData = await scrapeWebsite(url)

    if (!scrapedData.text && scrapedData.images.length === 0) {
      return NextResponse.json(
        { error: 'Could not scrape website. Please check the URL and try again.' },
        { status: 400 }
      )
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
          promptVersion: 1,
          relatedEntityType: 'brand_book',
          relatedEntityId: brandBookId,
        })

        // Log the LLM call
        await logLLMCall(db!, {
          orgId: user!.orgId,
          userId: user!.id,
          promptKey: `brand_book.${sectionKey}`,
          promptVersion: 1,
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

        // Parse JSON from LLM response
        let generated: Record<string, unknown>
        try {
          // Try to extract JSON from the response (handle markdown code blocks)
          let content = llmResult.content
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
          if (jsonMatch) {
            content = jsonMatch[1]
          }
          generated = JSON.parse(content)
        } catch {
          // If JSON parsing fails, try to extract JSON object from text
          const jsonStart = llmResult.content.indexOf('{')
          const jsonEnd = llmResult.content.lastIndexOf('}')
          if (jsonStart !== -1 && jsonEnd !== -1) {
            try {
              generated = JSON.parse(llmResult.content.substring(jsonStart, jsonEnd + 1))
            } catch {
              generated = { content: llmResult.content }
            }
          } else {
            generated = { content: llmResult.content }
          }
        }

        // Save to BOTH user_input AND ai_generated so forms show the data
        const { error: updateError } = await db!
          .from('brand_book_sections')
          .update({
            user_input: generated,
            ai_generated: generated,
            ai_status: 'generated',
            updated_at: new Date().toISOString(),
          })
          .eq('brand_book_id', brandBookId)
          .eq('section_key', sectionKey)

        if (updateError) {
          // Section might not exist yet, try insert
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
            results[sectionKey] = { success: false, error: insertError.message }
            continue
          }
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
    })
  } catch (error) {
    console.error('scrape-and-generate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
