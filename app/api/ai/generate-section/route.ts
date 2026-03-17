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
    const { brandBookId, sectionKey, contextSectionKeys } = body

    if (!brandBookId || !sectionKey) {
      return NextResponse.json(
        { error: 'brandBookId and sectionKey are required' },
        { status: 400 }
      )
    }

    // Load prompt from registry
    const promptKey = `brand_book.${sectionKey}`
    const prompt = await loadPrompt(db!, promptKey)

    // Build context from related sections
    let contextData: Record<string, Record<string, unknown>> = {}
    if (contextSectionKeys && contextSectionKeys.length > 0) {
      contextData = await buildSectionContext(db!, brandBookId, contextSectionKeys)
    }

    // Get current section's user_input
    const { data: sectionData } = await db!
      .from('brand_book_sections')
      .select('user_input')
      .eq('brand_book_id', brandBookId)
      .eq('section_key', sectionKey)
      .single()

    const currentSection = sectionData as { user_input: Record<string, unknown> } | null

    // Build variables from user_input fields + context for template interpolation
    const templateVars: Record<string, string> = {
      user_input: JSON.stringify(currentSection?.user_input ?? {}),
      context: JSON.stringify(contextData),
      section_key: sectionKey,
    }
    // Spread individual user_input fields so {{brand_name}}, {{industry}}, etc. work
    if (currentSection?.user_input) {
      for (const [key, value] of Object.entries(currentSection.user_input)) {
        templateVars[key] = typeof value === 'string' ? value : JSON.stringify(value)
      }
    }
    // Spread context fields for cross-section references
    for (const [ctxKey, ctxValue] of Object.entries(contextData)) {
      templateVars[ctxKey] = typeof ctxValue === 'string' ? ctxValue : JSON.stringify(ctxValue)
    }

    const userPrompt = interpolateTemplate(prompt.userPromptTemplate, templateVars)

    // Call LLM
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
      relatedEntityType: 'brand_book',
      relatedEntityId: brandBookId,
    })

    // Log the call
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

    // Save to BOTH user_input AND ai_generated so forms display the content
    const { error: updateError } = await db!
      .from('brand_book_sections')
      .update({
        user_input: aiGenerated,
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
