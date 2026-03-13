// Super admin emails — these users bypass all org/role restrictions
const SUPER_ADMIN_EMAILS: string[] = [
  'yash.vats@agentic.it',
]

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase())
}
