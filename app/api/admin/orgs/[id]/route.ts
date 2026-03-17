import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { getAdminClient } from '@/lib/db'
import { isSuperAdmin } from '@/lib/super-admin'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const orgId = params.id
    const db = getAdminClient()

    // Get org
    const { data: org, error: orgError } = await db
      .from('organizations')
      .select('id, name, slug, created_at')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Fetch all related data in parallel
    const [usersRes, brandBooksRes, campaignsRes] = await Promise.all([
      db
        .from('users')
        .select('id, full_name, email, role, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false }),
      db
        .from('brand_books')
        .select('id, name, client_name, status, current_step, created_at, updated_at')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false }),
      db
        .from('campaigns')
        .select('id, name, client_name, status, current_stage, created_at, updated_at')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false }),
    ])

    // Derive unique clients from brand books + campaigns
    const clientMap = new Map<string, { name: string; industry: string }>()
    ;(brandBooksRes.data ?? []).forEach((b) => {
      if (b.client_name) {
        const key = b.client_name.toLowerCase()
        if (!clientMap.has(key)) {
          clientMap.set(key, { name: b.client_name, industry: '-' })
        }
      }
    })
    ;(campaignsRes.data ?? []).forEach((c) => {
      if (c.client_name) {
        const key = c.client_name.toLowerCase()
        if (!clientMap.has(key)) {
          clientMap.set(key, { name: c.client_name, industry: '-' })
        }
      }
    })

    return NextResponse.json({
      org,
      users: usersRes.data ?? [],
      brandBooks: brandBooksRes.data ?? [],
      campaigns: campaignsRes.data ?? [],
      clients: Array.from(clientMap.values()),
    })
  } catch (err) {
    console.error('/api/admin/orgs/[id] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
