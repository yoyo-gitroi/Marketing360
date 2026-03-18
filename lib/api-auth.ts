import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from './auth'
import { getAdminClient } from './db'

/**
 * Require authentication in an API route.
 * Returns the session user info and an admin (service role) Supabase client.
 * If not authenticated, returns an error response.
 * If the user profile is missing, creates one as a fallback.
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      db: null,
    }
  }

  const db = getAdminClient()
  const email = session.user.email

  // Get user profile from DB
  let { data: profile } = await db
    .from('users')
    .select('id, org_id, role')
    .eq('email', email)
    .single()

  // Fallback: create user profile if missing (e.g. when signIn callback failed)
  if (!profile) {
    const domain = email.split('@')[1]?.toLowerCase()
    const fullName = session.user.name || email.split('@')[0] || 'User'

    let orgId: string | null = null
    if (domain) {
      // Find existing org by domain
      const { data: existingOrg } = await db
        .from('organizations')
        .select('id')
        .eq('domain', domain)
        .single()

      if (existingOrg) {
        orgId = existingOrg.id
      } else {
        // Create new org
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
      }).select('id, org_id, role').single()

      if (insertError) {
        console.error('requireAuth: fallback user creation failed:', insertError)
        return {
          error: NextResponse.json({ error: 'User profile not found and could not be created' }, { status: 500 }),
          user: null,
          db: null,
        }
      }

      profile = newUser

      // Create org_members entry
      await db.from('org_members').insert({ user_id: userId, org_id: orgId, role })
    } else {
      return {
        error: NextResponse.json({ error: 'User profile not found' }, { status: 404 }),
        user: null,
        db: null,
      }
    }
  }

  return {
    error: null,
    user: {
      id: profile.id,
      email,
      orgId: profile.org_id,
      role: profile.role,
    },
    db,
  }
}
