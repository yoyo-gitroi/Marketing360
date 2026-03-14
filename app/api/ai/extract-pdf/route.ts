import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { logLLMCall } from '@/lib/ai/orchestrator'
import Anthropic from '@anthropic-ai/sdk'

const EXTRACTION_SYSTEM_PROMPT = `You are a brand book content extraction specialist.
Extract structured data from the provided PDF content and organize it into brand book sections.
Return a JSON object with keys matching brand book section keys and values containing the extracted content.
Include a "confidence" score (0-1) for each section indicating extraction reliability.

Expected section keys: brand_essence, brand_story, mission_vision, brand_values,
brand_personality, target_audience, brand_positioning, tone_of_voice,
visual_identity, dos_and_donts, taglines, key_messages.

Return format:
{
  "sections": [
    {
      "section_key": "brand_essence",
      "content": { ... extracted content ... },
      "confidence": 0.95
    }
  ]
}`

export async function POST(request: NextRequest) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      )
    }

    // Read file content as base64 for Claude
    const arrayBuffer = await file.arrayBuffer()
    const base64Content = Buffer.from(arrayBuffer).toString('base64')

    // Use Claude's document understanding via the Anthropic SDK directly
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const startTime = Date.now()

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Content,
              },
            },
            {
              type: 'text',
              text: 'Extract all brand book content from this PDF into structured sections. Return the result as JSON.',
            },
          ],
        },
      ],
    })

    const latencyMs = Date.now() - startTime
    const textBlock = response.content.find((block) => block.type === 'text')
    const content = textBlock && textBlock.type === 'text' ? textBlock.text : ''

    await logLLMCall(db!, {
      orgId: user!.orgId,
      userId: user!.id,
      promptKey: 'extract_pdf',
      promptVersion: 1,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latencyMs,
      status: 'success',
      relatedEntityType: 'brand_book',
    })

    let extracted: unknown
    try {
      extracted = JSON.parse(content)
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[1])
      } else {
        extracted = { raw: content }
      }
    }

    return NextResponse.json({
      extracted,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latencyMs,
    })
  } catch (error) {
    console.error('extract-pdf error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
