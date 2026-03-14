import { createClient } from '@supabase/supabase-js'

/**
 * Returns a Supabase client using the service role key.
 * Bypasses RLS — use for all server-side DB operations.
 */
export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
