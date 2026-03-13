import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/super-admin'

export async function POST(request: Request) {
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

    const body = await request.json()
    const { orgId, name } = body

    if (!orgId || !name?.trim()) {
      return NextResponse.json({ error: 'Missing orgId or name' }, { status: 400 })
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check authorization: must be super admin, or owner/admin of the org
    const superAdmin = isSuperAdmin(user.email)

    if (!superAdmin) {
      const { data: membership } = await adminClient
        .from('org_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('org_id', orgId)
        .single()

      if (!membership || membership.role === 'member') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    const { error } = await adminClient
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
