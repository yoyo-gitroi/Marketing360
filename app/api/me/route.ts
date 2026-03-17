import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { getAdminClient } from '@/lib/db'
import { isSuperAdmin } from '@/lib/super-admin'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const email = session.user.email
    const superAdmin = isSuperAdmin(email)
    const db = getAdminClient()

    // Get user profile
    const { data: profile } = await db
      .from('users')
      .select('id, email, full_name, role, org_id, onboarding_completed')
      .eq('email', email)
      .single()

    const orgId = profile?.org_id ?? null

    // Get org data
    let org = null
    if (orgId) {
      const { data: orgData } = await db
        .from('organizations')
        .select('id, name, slug, created_at')
        .eq('id', orgId)
        .single()
      org = orgData
    }

    const effectiveRole = superAdmin ? 'owner' : (profile?.role ?? 'member')

    return NextResponse.json({
      user: {
        id: profile?.id ?? session.user.id,
        email,
        full_name: profile?.full_name ?? session.user.name ?? email.split('@')[0] ?? 'User',
        onboarding_completed: profile?.onboarding_completed ?? false,
      },
      org,
      role: effectiveRole,
      isSuperAdmin: superAdmin,
    })
  } catch (err) {
    console.error('/api/me error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
