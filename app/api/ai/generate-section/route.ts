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
    const { brandBookId, sectionKey, contextSectionKeys } = body

    if (!brandBookId || !sectionKey) {
      return NextResponse.json(
        { error: 'brandBookId and sectionKey are required' },
        { status: 400 }
      )
    }

    // Fetch user profile for org_id
    const { data: profileData } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    const profile = profileData as { org_id: string } | null
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Load prompt from registry
    const promptKey = `brand_book.${sectionKey}`
    const prompt = await loadPrompt(supabase, promptKey)

    // Build context from related sections
    let contextData: Record<string, Record<string, unknown>> = {}
    if (contextSectionKeys && contextSectionKeys.length > 0) {
      contextData = await buildSectionContext(supabase, brandBookId, contextSectionKeys)
    }

    // Get current section's user_input
    const { data: sectionData } = await supabase
      .from('brand_book_sections')
      .select('user_input')
      .eq('brand_book_id', brandBookId)
      .eq('section_key', sectionKey)
      .single()

    const currentSection = sectionData as { user_input: Record<string, unknown> } | null

    const userPrompt = interpolateTemplate(prompt.userPromptTemplate, {
      user_input: JSON.stringify(currentSection?.user_input ?? {}),
      context: JSON.stringify(contextData),
      section_key: sectionKey,
    })

    // Call LLM
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
      relatedEntityType: 'brand_book',
      relatedEntityId: brandBookId,
    })

    // Log the call
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
      relatedEntityType: 'brand_book',
      relatedEntityId: brandBookId,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Parse AI response and save to brand_book_sections
    let aiGenerated: Record<string, unknown>
    try {
      aiGenerated = JSON.parse(result.content)
    } catch {
      aiGenerated = { content: result.content }
    }

    const { error: updateError } = await (supabase as any)
      .from('brand_book_sections')
      .update({
        ai_generated: aiGenerated,
        ai_status: 'generated',
        updated_at: new Date().toISOString(),
      })
      .eq('brand_book_id', brandBookId)
      .eq('section_key', sectionKey)

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to save generated content: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      content: aiGenerated,
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
