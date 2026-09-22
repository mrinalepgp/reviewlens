import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role client. Bypasses RLS, so it must never be imported into a
 * client component and must only be used for operations the caller has already
 * been authorized for by `src/lib/auth/guard.ts`.
 *
 * Returns `null` when SUPABASE_SERVICE_ROLE_KEY is absent so callers can fall
 * back to the anon client instead of crashing.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function hasServiceRole(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY
}
