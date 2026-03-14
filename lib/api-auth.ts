import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from './auth'
import { getAdminClient } from './db'

/**
 * Require authentication in an API route.
 * Returns the session user info and an admin (service role) Supabase client.
 * If not authenticated, returns an error response.
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

  // Get user profile from DB
  const { data: profile } = await db
    .from('users')
    .select('id, org_id, role')
    .eq('email', session.user.email)
    .single()

  if (!profile) {
    return {
      error: NextResponse.json({ error: 'User profile not found' }, { status: 404 }),
      user: null,
      db: null,
    }
  }

  return {
    error: null,
    user: {
      id: profile.id,
      email: session.user.email,
      orgId: profile.org_id,
      role: profile.role,
    },
    db,
  }
}
