import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

const BRAND_BOOK_SECTIONS = [
  { step_number: 1, section_key: 'brand_identity', title: 'Brand Identity' },
  { step_number: 2, section_key: 'values_pillars', title: 'Values & Pillars' },
  { step_number: 3, section_key: 'visual_identity', title: 'Visual Identity' },
  { step_number: 4, section_key: 'voice_tone', title: 'Voice & Tone' },
  { step_number: 5, section_key: 'target_audience', title: 'Target Audience' },
  { step_number: 6, section_key: 'product_info', title: 'Product Info' },
  { step_number: 7, section_key: 'brand_history', title: 'Brand History' },
  { step_number: 8, section_key: 'research_synthesis', title: 'Research Synthesis' },
]

export async function POST(request: Request) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const { name, clientName, clientId, orgId } = body

    if (!name?.trim() || !orgId) {
      return NextResponse.json({ error: 'Missing name or orgId' }, { status: 400 })
    }

    // Create brand book
    const { data: brandBook, error: createError } = await db!
      .from('brand_books')
      .insert({
        name: name.trim(),
        client_name: clientName?.trim() || null,
        client_id: clientId || null,
        org_id: orgId,
        created_by: user!.id,
        status: 'draft',
        current_step: 1,
      })
      .select('id')
      .single()

    if (createError || !brandBook) {
      return NextResponse.json(
        { error: 'Failed to create: ' + (createError?.message ?? 'Unknown error') },
        { status: 500 }
      )
    }

    // Create sections
    const sections = BRAND_BOOK_SECTIONS.map((s) => ({
      brand_book_id: brandBook.id,
      step_number: s.step_number,
      section_key: s.section_key,
      title: s.title,
      status: 'pending',
      content: null,
    }))

    const { error: sectionsError } = await db!
      .from('brand_book_sections')
      .insert(sections)

    if (sectionsError) {
      return NextResponse.json(
        { error: 'Brand book created but sections failed: ' + sectionsError.message, id: brandBook.id },
        { status: 207 }
      )
    }

    return NextResponse.json({ id: brandBook.id })
  } catch (err) {
    console.error('/api/brand-books/create error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
