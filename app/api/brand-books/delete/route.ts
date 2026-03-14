import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function DELETE(request: Request) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing brand book id' }, { status: 400 })
    }

    // Verify the brand book belongs to the user's org
    const { data: brandBook, error: fetchError } = await db!
      .from('brand_books')
      .select('id, org_id')
      .eq('id', id)
      .single()

    if (fetchError || !brandBook) {
      return NextResponse.json({ error: 'Brand book not found' }, { status: 404 })
    }

    if (brandBook.org_id !== user!.orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete brand book (sections cascade automatically)
    const { error: deleteError } = await db!
      .from('brand_books')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete: ' + deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('/api/brand-books/delete error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
