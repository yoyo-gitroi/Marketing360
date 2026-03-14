import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { getAdminClient } from './db'
import { isSuperAdmin } from './super-admin'
import { cookies } from 'next/headers'

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
        // First-time user — auto-provision org + user + membership
        const fullName = user.name || user.email.split('@')[0] || 'User'

        // Read org name from cookie (set during signup)
        let orgName = `${fullName}'s Organization`
        try {
          const cookieStore = await cookies()
          const pendingOrgCookie = cookieStore.get('pending_org_name')
          if (pendingOrgCookie?.value) {
            orgName = decodeURIComponent(pendingOrgCookie.value)
          }
        } catch {
          // cookies() may not be available in all contexts
        }

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

        const { data: org } = await db
          .from('organizations')
          .insert({ name: orgName, slug })
          .select('id')
          .single()

        if (org) {
          const userId = crypto.randomUUID()
          await db.from('users').insert({
            id: userId,
            email: user.email,
            full_name: fullName,
            org_id: org.id,
            role: 'owner',
          })
          await db.from('org_members').insert({
            user_id: userId,
            org_id: org.id,
            role: 'owner',
          })
        }

        // Clear pending org name cookie
        try {
          const cookieStore = await cookies()
          cookieStore.set('pending_org_name', '', { path: '/', maxAge: 0 })
        } catch {
          // ignore
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
