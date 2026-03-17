import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function POST(request: Request) {
  const { error, user, db } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()
    const { fullName, jobTitle, department, platformUsage } = body

    if (!fullName || !jobTitle || !department || !platformUsage) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    const { error: updateError } = await db!
      .from('users')
      .update({
        full_name: fullName,
        job_title: jobTitle,
        department,
        platform_usage: platformUsage,
        onboarding_completed: true,
      })
      .eq('id', user!.id)

    if (updateError) {
      console.error('Onboarding update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Onboarding error:', err)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }
}
