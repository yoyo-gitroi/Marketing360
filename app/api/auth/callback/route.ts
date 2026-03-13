import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('OAuth code exchange failed:', error.message)
      return NextResponse.redirect(`${origin}/login`)
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Check if user already has a profile
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingUser) {
        // First-time OAuth user — create org and user profile using service role
        try {
          const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )

          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
          const orgName = `${fullName}'s Organization`
          const baseSlug = orgName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')

          // Find unique slug
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

          const { data: org, error: orgError } = await adminClient
            .from('organizations')
            .insert({ name: orgName, slug })
            .select('id')
            .single()

          if (orgError) {
            console.error('Failed to create org for OAuth user:', orgError.message)
          } else if (org) {
            const { error: userError } = await adminClient.from('users').insert({
              id: user.id,
              email: user.email!,
              full_name: fullName,
              org_id: org.id,
              role: 'owner',
            })
            if (userError) {
              console.error('Failed to create user profile for OAuth user:', userError.message)
            }
          }
        } catch (provisionError) {
          console.error('OAuth user provisioning error:', provisionError)
        }
      }
    }

    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'
    if (isLocalEnv) {
      return NextResponse.redirect(`${origin}${next}`)
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${next}`)
    } else {
      return NextResponse.redirect(`${origin}${next}`)
    }
  } catch (err) {
    console.error('Auth callback error:', err)
    return NextResponse.redirect(`${origin}/login`)
  }
}
