import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
export async function getAuthenticatedUser() {
  const cookieStore = await cookies()
  const devSession = cookieStore.get('reviewlens_dev_session')?.value
  if (devSession) {
    try {
      const parsed = JSON.parse(devSession)
      if (parsed && parsed.email) {
        return {
          id: parsed.id,
          email: parsed.email,
          user_metadata: parsed.user_metadata || {},
          app_metadata: parsed.app_metadata || {},
          devRole: parsed.role,
          devPlan: parsed.plan,
          devCredits: parsed.credits,
        }
      }
    } catch {
      // ignore parse error
    }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}
