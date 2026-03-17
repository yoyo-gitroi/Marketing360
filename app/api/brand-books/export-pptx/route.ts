import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { generateBrandBookPPTX } from '@/lib/pptx/brand-book-generator'

interface SectionRow {
  section_key: string
  user_input: Record<string, unknown>
  ai_generated: Record<string, unknown>
  final_content: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const { brandBookId } = body

    if (!brandBookId) {
      return NextResponse.json({ error: 'brandBookId is required' }, { status: 400 })
    }

    // Verify brand book exists and belongs to user's org
    const { data: brandBook } = await db!
      .from('brand_books')
      .select('id, name, org_id')
      .eq('id', brandBookId)
      .eq('org_id', user!.orgId)
      .single()

    if (!brandBook) {
      return NextResponse.json({ error: 'Brand book not found' }, { status: 404 })
    }

    // Fetch all sections
    const { data: sectionsData, error: sectionsError } = await db!
      .from('brand_book_sections')
      .select('section_key, user_input, ai_generated, final_content')
      .eq('brand_book_id', brandBookId)

    if (sectionsError) {
      return NextResponse.json(
        { error: `Failed to fetch sections: ${sectionsError.message}` },
        { status: 500 }
      )
    }

    const sections = (sectionsData ?? []) as SectionRow[]

    // Build brand data from sections, preferring final_content > user_input > ai_generated
    const getContent = (key: string): Record<string, unknown> | undefined => {
      const section = sections.find((s) => s.section_key === key)
      if (!section) return undefined
      if (section.final_content && Object.keys(section.final_content).length > 0) return section.final_content
      if (section.user_input && Object.keys(section.user_input).length > 0) return section.user_input
      if (section.ai_generated && Object.keys(section.ai_generated).length > 0) return section.ai_generated
      return undefined
    }

    const brandData = {
      brand_name: brandBook.name,
      brand_identity: getContent('brand_identity') as any,
      values_pillars: getContent('values_pillars') as any,
      visual_identity: getContent('visual_identity') as any,
      voice_tone: getContent('voice_tone') as any,
      target_audience: getContent('target_audience') as any,
      product_info: getContent('product_info') as any,
      brand_history: getContent('brand_history') as any,
      research_synthesis: getContent('research_synthesis') as any,
    }

    // Generate PPTX
    const pptxBuffer = await generateBrandBookPPTX(brandData)

    // Return as downloadable file
    const filename = `${brandBook.name.replace(/[^a-zA-Z0-9]/g, '_')}_Brand_Book.pptx`

    return new NextResponse(new Uint8Array(pptxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pptxBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('export-pptx error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
