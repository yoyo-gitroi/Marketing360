import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const {
      campaignId,
      stageKey,
      itemIndex,
      itemTitle,
      itemType,
      feedback,
      feedbackNote,
      persona,
      hypothesisTitle,
    } = body

    if (!campaignId || !stageKey || itemIndex === undefined || !itemTitle || !itemType || !feedback) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['thumbs_up', 'thumbs_down'].includes(feedback)) {
      return NextResponse.json({ error: 'Invalid feedback value' }, { status: 400 })
    }

    if (!['hypothesis', 'idea'].includes(itemType)) {
      return NextResponse.json({ error: 'Invalid item type' }, { status: 400 })
    }

    const { data, error } = await db!
      .from('ai_feedback')
      .upsert(
        {
          org_id: user!.orgId,
          user_id: user!.id,
          campaign_id: campaignId,
          stage_key: stageKey,
          item_index: itemIndex,
          item_title: itemTitle,
          item_type: itemType,
          feedback,
          feedback_note: feedbackNote ?? null,
          persona: persona ?? null,
          hypothesis_title: hypothesisTitle ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'campaign_id,stage_key,item_type,item_index,user_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('ai_feedback upsert error:', error)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    return NextResponse.json({ feedback: data })
  } catch (err) {
    console.error('ai/feedback POST error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')
    const stageKey = searchParams.get('stageKey')

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
    }

    let query = db!
      .from('ai_feedback')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('user_id', user!.id)

    if (stageKey) {
      query = query.eq('stage_key', stageKey)
    }

    const { data, error } = await query.order('item_index')

    if (error) {
      console.error('ai_feedback GET error:', error)
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
    }

    return NextResponse.json({ feedback: data ?? [] })
  } catch (err) {
    console.error('ai/feedback GET error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
