import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { getAdminClient } from './db'
import { isSuperAdmin } from './super-admin'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false

      const db = getAdminClient()

      // Check if user already exists
      const { data: existing } = await db
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!existing) {
        // First-time user — auto-provision based on email domain
        const fullName = user.name || user.email.split('@')[0] || 'User'
        const domain = user.email.split('@')[1]?.toLowerCase()

        if (!domain) return false

        // Check if an organization already exists for this domain
        const { data: existingOrg } = await db
          .from('organizations')
          .select('id')
          .eq('domain', domain)
          .single()

        let orgId: string | null = null

        if (existingOrg) {
          orgId = existingOrg.id
        } else {
          // Create new org with the domain name
          const orgName = domain.split('.')[0]
            .charAt(0).toUpperCase() + domain.split('.')[0].slice(1)

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
            const { data } = await db
              .from('organizations')
              .select('id')
              .eq('slug', candidateSlug)
              .single()
            if (!data) {
              slug = candidateSlug
              break
            }
          }

          const { data: org, error: orgError } = await db
            .from('organizations')
            .insert({ name: orgName, slug, domain })
            .select('id')
            .single()

          if (orgError) {
            console.error('Failed to create organization:', orgError)
            return false
          }

          orgId = org?.id ?? null
        }

        if (!orgId) {
          console.error('No org_id available for new user')
          return false
        }

        // Create user record
        const userId = crypto.randomUUID()
        const role = existingOrg ? 'member' : 'owner'

        const { error: userError } = await db.from('users').insert({
          id: userId,
          email: user.email,
          full_name: fullName,
          org_id: orgId,
          role,
          onboarding_completed: false,
        })

        if (userError) {
          console.error('Failed to create user:', userError)
          // Don't return false — allow sign-in; the user will be created
          // via the onboarding flow as a fallback
        } else {
          // Create org membership
          const { error: memberError } = await db.from('org_members').insert({
            user_id: userId,
            org_id: orgId,
            role,
          })

          if (memberError) {
            console.error('Failed to create org membership:', memberError)
          }
        }
      }

      return true
    },

    async jwt({ token, trigger }) {
      // Fetch DB user info on sign-in or if not yet loaded
      if (trigger === 'signIn' || !token.dbUserId) {
        if (token.email) {
          const db = getAdminClient()
          const { data: dbUser } = await db
            .from('users')
            .select('id, org_id, role, full_name')
            .eq('email', token.email)
            .single()

          if (dbUser) {
            token.dbUserId = dbUser.id
            token.orgId = dbUser.org_id
            token.dbRole = dbUser.role
            token.fullName = dbUser.full_name
          }
        }
      }
      return token
    },

    async session({ session, token }) {
      if (token.dbUserId) {
        session.user.id = token.dbUserId
        session.user.orgId = token.orgId ?? ''
        session.user.role = token.dbRole ?? 'member'
        session.user.fullName = token.fullName ?? session.user.name ?? ''
      }
      return session
    },
  },
}
