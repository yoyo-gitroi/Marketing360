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
    let { data: profile } = await adminClient
      .from('users')
      .select('id, email, full_name, role, org_id')
      .eq('id', user.id)
      .single()

    // Get org membership
    let { data: membership } = await adminClient
      .from('org_members')
      .select('role, org_id')
      .eq('user_id', user.id)
      .single()

    // Auto-provision: if user has no profile or org, create them
    if (!profile || !profile.org_id) {
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0] || 'User'

      // Check if there's an org via org_members
      let orgId = membership?.org_id ?? profile?.org_id ?? null

      if (!orgId) {
        // Create a new organization
        const orgName = `${fullName}'s Organization`
        const baseSlug = orgName
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')

        let slug = baseSlug
        for (let attempt = 0; attempt < 10; attempt++) {
          const candidateSlug = attempt === 0 ? slug : `${slug}-${attempt}`
          const { data } = await adminClient
            .from('organizations')
            .select('id')
            .eq('slug', candidateSlug)
            .single()
          if (!data) {
            slug = candidateSlug
            break
          }
        }

        const { data: newOrg } = await adminClient
          .from('organizations')
          .insert({ name: orgName, slug })
          .select('id')
          .single()

        if (newOrg) {
          orgId = newOrg.id
        }
      }

      if (orgId) {
        // Create user profile if missing
        if (!profile) {
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0] || 'User'
          await adminClient.from('users').insert({
            id: user.id,
            email,
            full_name: fullName,
            org_id: orgId,
            role: 'owner',
          })

          // Re-fetch
          const { data: newProfile } = await adminClient
            .from('users')
            .select('id, email, full_name, role, org_id')
            .eq('id', user.id)
            .single()
          profile = newProfile
        } else if (!profile.org_id) {
          // Update existing profile with org_id
          await adminClient.from('users').update({ org_id: orgId }).eq('id', user.id)
          profile = { ...profile, org_id: orgId }
        }

        // Create org_members if missing
        if (!membership) {
          await adminClient.from('org_members').insert({
            user_id: user.id,
            org_id: orgId,
            role: 'owner',
          })

          const { data: newMembership } = await adminClient
            .from('org_members')
            .select('role, org_id')
            .eq('user_id', user.id)
            .single()
          membership = newMembership
        }
      }
    }

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
        full_name: profile?.full_name ?? user.user_metadata?.full_name ?? email.split('@')[0] ?? 'User',
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
