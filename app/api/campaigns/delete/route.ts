import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function DELETE(request: Request) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 })
    }

    // Verify the campaign belongs to the user's org
    const { data: campaign, error: fetchError } = await db!
      .from('campaigns')
      .select('id, org_id')
      .eq('id', id)
      .single()

    if (fetchError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.org_id !== user!.orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete campaign (stages cascade automatically)
    const { error: deleteError } = await db!
      .from('campaigns')
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
    console.error('/api/campaigns/delete error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
