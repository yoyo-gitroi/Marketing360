import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const { name, description, website, industry } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 })
    }

    if (!website?.trim()) {
      return NextResponse.json({ error: 'Client website/domain is required' }, { status: 400 })
    }

    const { data: client, error: createError } = await db!
      .from('clients')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        website: website?.trim() || null,
        industry: industry || null,
        org_id: user!.orgId,
        created_by: user!.id,
      })
      .select()
      .single()

    if (createError || !client) {
      return NextResponse.json(
        { error: 'Failed to create client: ' + (createError?.message ?? 'Unknown error') },
        { status: 500 }
      )
    }

    return NextResponse.json(client)
  } catch (err) {
    console.error('/api/clients/create error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
