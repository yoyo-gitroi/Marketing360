import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { getAdminClient } from '@/lib/db'
import { isSuperAdmin } from '@/lib/super-admin'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getAdminClient()

    // Get all organizations
    const { data: organizations, error: orgError } = await db
      .from('organizations')
      .select('id, name, slug, created_at')
      .order('created_at', { ascending: false })

    if (orgError) throw orgError

    // Build counts for each org
    const orgs = await Promise.all(
      (organizations ?? []).map(async (org) => {
        const [members, brandBooks, campaigns] = await Promise.all([
          db.from('users').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
          db.from('brand_books').select('id, client_name', { count: 'exact' }).eq('org_id', org.id),
          db.from('campaigns').select('id, client_name', { count: 'exact' }).eq('org_id', org.id),
        ])

        // Count unique non-null client names across brand books and campaigns
        const clientNames = new Set<string>()
        ;(brandBooks.data ?? []).forEach((b) => {
          if (b.client_name) clientNames.add(b.client_name.toLowerCase())
        })
        ;(campaigns.data ?? []).forEach((c) => {
          if (c.client_name) clientNames.add(c.client_name.toLowerCase())
        })

        return {
          ...org,
          memberCount: members.count ?? 0,
          brandBookCount: brandBooks.count ?? 0,
          campaignCount: campaigns.count ?? 0,
          clientCount: clientNames.size,
        }
      })
    )

    return NextResponse.json({ orgs })
  } catch (err) {
    console.error('/api/admin/orgs error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
