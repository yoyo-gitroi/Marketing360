import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function DELETE(request: Request) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Client id is required' }, { status: 400 })
    }

    // Verify the client belongs to the user's org
    const { data: client } = await db!
      .from('clients')
      .select('id, org_id')
      .eq('id', id)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (client.org_id !== user!.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error: deleteError } = await db!
      .from('clients')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete client: ' + deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('/api/clients/delete error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
