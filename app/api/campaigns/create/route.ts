import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/super-admin'

const CAMPAIGN_STAGES = [
  { stage_number: 1, stage_key: 'campaign_brief', title: 'Campaign Brief' },
  { stage_number: 2, stage_key: 'brand_reference', title: 'Brand Reference' },
  { stage_number: 3, stage_key: 'market_research', title: 'Market Research' },
  { stage_number: 4, stage_key: 'customer_intel', title: 'Customer Intel' },
  { stage_number: 5, stage_key: 'platform_channel', title: 'Platform & Channel' },
  { stage_number: 6, stage_key: 'historical_data', title: 'Historical Data' },
  { stage_number: 7, stage_key: 'resources', title: 'Resources' },
  { stage_number: 8, stage_key: 'hypothesis', title: 'Hypothesis' },
  { stage_number: 9, stage_key: 'ideation_room', title: 'Ideation Room' },
]

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
    const { name, clientName, orgId, brandBookId, uploadedBrandBookUrl } = body

    if (!name?.trim() || !orgId) {
      return NextResponse.json({ error: 'Missing name or orgId' }, { status: 400 })
    }

    const superAdmin = isSuperAdmin(user.email)
    const dbClient = superAdmin
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      : supabase

    // Create campaign
    const { data: campaign, error: createError } = await dbClient
      .from('campaigns')
      .insert({
        name: name.trim(),
        client_name: clientName?.trim() || null,
        org_id: orgId,
        created_by: user.id,
        status: 'draft',
        brand_book_id: brandBookId || null,
        uploaded_brand_book_url: uploadedBrandBookUrl || null,
      })
      .select('id')
      .single()

    if (createError || !campaign) {
      return NextResponse.json(
        { error: 'Failed to create: ' + (createError?.message ?? 'Unknown error') },
        { status: 500 }
      )
    }

    // Create stages
    const stages = CAMPAIGN_STAGES.map((s) => ({
      campaign_id: campaign.id,
      stage_number: s.stage_number,
      stage_key: s.stage_key,
      title: s.title,
      status: 'pending',
      content: null,
    }))

    const { error: stagesError } = await dbClient
      .from('campaign_stages')
      .insert(stages)

    if (stagesError) {
      return NextResponse.json(
        { error: 'Campaign created but stages failed: ' + stagesError.message, id: campaign.id },
        { status: 207 }
      )
    }

    return NextResponse.json({ id: campaign.id })
  } catch (err) {
    console.error('/api/campaigns/create error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
