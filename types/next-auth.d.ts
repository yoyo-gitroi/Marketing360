import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string
      orgId: string
      role: string
      fullName: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    dbUserId?: string
    orgId?: string
    dbRole?: string
    fullName?: string
  }
}
