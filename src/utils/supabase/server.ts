import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { normalizeRole, type Role } from '@/lib/auth/rbac'
import { OPERATOR_SESSION_COOKIE, verifyOperatorSession } from '@/lib/auth/session'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Normalized identity used by every server action, route handler and guard.
 * `role` is the only field authorization should read — it is derived from
 * verified claims, never from a client-supplied string.
 */
export interface AppUser {
  id: string
  email: string
  fullName: string
  role: Role
  plan: string
  credits: number | null
  source: 'supabase' | 'operator'
  user_metadata: Record<string, unknown>
  app_metadata: Record<string, unknown>
  /** @deprecated Retained for call sites still reading the legacy field. Mirrors `role`. */
  devRole: Role
  devPlan?: string
  devCredits?: number
}

/**
 * Resolve the caller's identity, preferring a verified Supabase session and
 * falling back to a *signed* operator session. Returns `null` when neither is
 * present or valid — callers must not substitute a placeholder identity.
 */
export async function getAuthenticatedUser(): Promise<AppUser | null> {
  const cookieStore = await cookies()

  const operator = verifyOperatorSession(cookieStore.get(OPERATOR_SESSION_COOKIE)?.value)
  if (operator) {
    return {
      id: operator.id,
      email: operator.email,
      fullName: operator.fullName,
      role: operator.role,
      plan: operator.plan,
      credits: operator.credits,
      source: 'operator',
      user_metadata: { full_name: operator.fullName, role: operator.role, plan: operator.plan.toLowerCase() },
      app_metadata: { role: operator.role, provider: 'email', providers: ['email'] },
      devRole: operator.role,
      devPlan: operator.plan,
      devCredits: operator.credits,
    }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Trust `app_metadata` over `user_metadata`: the latter is self-editable by
    // the account holder via the Supabase client, the former is service-only.
    const role = normalizeRole(user.app_metadata?.role ?? user.user_metadata?.role)
    const plan = String(user.user_metadata?.plan ?? 'free')

    return {
      id: user.id,
      email: user.email ?? '',
      fullName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      role,
      plan,
      credits: null,
      source: 'supabase',
      user_metadata: user.user_metadata ?? {},
      app_metadata: user.app_metadata ?? {},
      devRole: role,
    }
  } catch {
    return null
  }
}
