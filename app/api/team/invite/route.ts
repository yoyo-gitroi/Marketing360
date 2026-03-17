import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const { email, org_id, role } = body

    if (!email?.trim() || !org_id) {
      return NextResponse.json({ error: 'Missing email or org_id' }, { status: 400 })
    }

    const inviteRole = role === 'admin' ? 'admin' : 'member'

    // Verify the inviting user belongs to this org and is owner or admin
    const { data: inviter } = await db!
      .from('org_members')
      .select('role')
      .eq('user_id', user!.id)
      .eq('org_id', org_id)
      .single()

    if (!inviter || (inviter.role !== 'owner' && inviter.role !== 'admin')) {
      return NextResponse.json({ error: 'Only owners and admins can invite members' }, { status: 403 })
    }

    // Check if user is already a member
    const { data: existingUser } = await db!
      .from('users')
      .select('id')
      .eq('email', email.trim())
      .single()

    if (existingUser) {
      const { data: existingMember } = await db!
        .from('org_members')
        .select('id')
        .eq('user_id', existingUser.id)
        .eq('org_id', org_id)
        .single()

      if (existingMember) {
        return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 409 })
      }
    }

    // Check for duplicate pending invite
    const { data: existingInvite } = await db!
      .from('pending_invites')
      .select('id')
      .eq('email', email.trim())
      .eq('org_id', org_id)
      .single()

    if (existingInvite) {
      return NextResponse.json({ error: 'An invite has already been sent to this email' }, { status: 409 })
    }

    // Create pending invite
    const { error: insertError } = await db!
      .from('pending_invites')
      .insert({
        email: email.trim(),
        org_id,
        role: inviteRole,
        invited_by: user!.id,
      })

    if (insertError) {
      console.error('Failed to create invite:', insertError)
      return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('/api/team/invite error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
