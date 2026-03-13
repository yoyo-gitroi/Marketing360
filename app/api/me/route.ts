import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/super-admin'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const email = user.email ?? ''
    const superAdmin = isSuperAdmin(email)

    // Use service role client to bypass RLS for data fetching
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user profile
    const { data: profile } = await adminClient
      .from('users')
      .select('id, email, full_name, role, org_id')
      .eq('id', user.id)
      .single()

    // Get org membership
    const { data: membership } = await adminClient
      .from('org_members')
      .select('role, org_id')
      .eq('user_id', user.id)
      .single()

    const orgId = membership?.org_id ?? profile?.org_id ?? null

    // Get org data
    let org = null
    if (orgId) {
      const { data: orgData } = await adminClient
        .from('organizations')
        .select('id, name, slug, created_at')
        .eq('id', orgId)
        .single()
      org = orgData
    }

    // Determine effective role: super admin gets 'owner' privileges
    const dbRole = membership?.role ?? profile?.role ?? 'member'
    const effectiveRole = superAdmin ? 'owner' : dbRole

    return NextResponse.json({
      user: {
        id: user.id,
        email,
        full_name: profile?.full_name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
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
