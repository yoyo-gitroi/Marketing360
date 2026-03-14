import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

interface SectionRow {
  section_key: string
  final_content: Record<string, unknown>
  user_input: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError, db } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const { brandBookId } = body

    if (!brandBookId) {
      return NextResponse.json(
        { error: 'brandBookId is required' },
        { status: 400 }
      )
    }

    // Verify brand book exists
    const { data: brandBookData } = await db!
      .from('brand_books')
      .select('id, name, org_id')
      .eq('id', brandBookId)
      .single()

    if (!brandBookData) {
      return NextResponse.json({ error: 'Brand book not found' }, { status: 404 })
    }

    // Fetch all sections with final_content
    const { data: sectionsData, error: sectionsError } = await db!
      .from('brand_book_sections')
      .select('section_key, final_content, user_input')
      .eq('brand_book_id', brandBookId)
      .order('created_at', { ascending: true })

    if (sectionsError) {
      return NextResponse.json(
        { error: `Failed to fetch sections: ${sectionsError.message}` },
        { status: 500 }
      )
    }

    const sections = (sectionsData ?? []) as SectionRow[]

    // Collect all content for PDF generation
    const pdfContent = sections.map((section) => ({
      sectionKey: section.section_key,
      content:
        section.final_content && Object.keys(section.final_content).length > 0
          ? section.final_content
          : section.user_input,
    }))

    // Placeholder: In production, Puppeteer or a PDF library would render here
    const pdfUrl = `placeholder://brand-book-${brandBookId}.pdf`

    // Update the brand book record with the PDF URL placeholder
    await db!
      .from('brand_books')
      .update({
        pdf_url: pdfUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', brandBookId)

    return NextResponse.json({
      pdfUrl,
      message:
        'PDF generation placeholder. In production, Puppeteer would render the brand book here.',
      sections: pdfContent,
    })
  } catch (error) {
    console.error('pdf-generate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
