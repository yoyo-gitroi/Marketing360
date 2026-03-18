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
    let { data: profile } = await db
      .from('users')
      .select('id, email, full_name, role, org_id, onboarding_completed')
      .eq('email', email)
      .single()

    // If no profile exists, create one (fallback for when signIn callback failed)
    if (!profile) {
      const domain = email.split('@')[1]?.toLowerCase()
      const fullName = session.user.name || email.split('@')[0] || 'User'

      // Find or create org by domain
      let orgId: string | null = null
      if (domain) {
        const { data: existingOrg } = await db
          .from('organizations')
          .select('id')
          .eq('domain', domain)
          .single()

        if (existingOrg) {
          orgId = existingOrg.id
        } else {
          const orgName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)
          const slug = orgName.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/\s+/g, '-')
          const { data: newOrg } = await db
            .from('organizations')
            .insert({ name: orgName, slug, domain })
            .select('id')
            .single()
          orgId = newOrg?.id ?? null
        }
      }

      if (orgId) {
        const userId = crypto.randomUUID()
        const role = 'owner'
        const { data: newUser, error: insertError } = await db.from('users').insert({
          id: userId,
          email,
          full_name: fullName,
          org_id: orgId,
          role,
          onboarding_completed: false,
        }).select('id, email, full_name, role, org_id, onboarding_completed').single()

        if (insertError) {
          console.error('Fallback user creation failed:', insertError)
        } else {
          profile = newUser

          // Also create org_members entry
          await db.from('org_members').insert({
            user_id: userId,
            org_id: orgId,
            role,
          })
        }
      }
    }

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
