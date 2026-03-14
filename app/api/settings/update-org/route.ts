import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { isSuperAdmin } from '@/lib/super-admin'

export async function POST(request: Request) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const { orgId, name } = body

    if (!orgId || !name?.trim()) {
      return NextResponse.json({ error: 'Missing orgId or name' }, { status: 400 })
    }

    // Check authorization: must be super admin, or owner/admin of the org
    const superAdmin = isSuperAdmin(user!.email)

    if (!superAdmin) {
      const { data: membership } = await db!
        .from('org_members')
        .select('role')
        .eq('user_id', user!.id)
        .eq('org_id', orgId)
        .single()

      if (!membership || membership.role === 'member') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    const { error } = await db!
      .from('organizations')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', orgId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('/api/settings/update-org error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
