import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hasRole, normalizeRole } from '@/lib/auth/rbac'
import { OPERATOR_SESSION_COOKIE, verifyOperatorSession } from '@/lib/auth/session'

/** Route prefixes that require an authenticated caller. */
const PROTECTED_PREFIXES = ['/dashboard', '/admin']
/** Route prefixes that additionally require org_admin or above. */
const ADMIN_PREFIXES = ['/admin']
/** Auth screens a signed-in caller should be bounced away from. */
const AUTH_PREFIXES = ['/login', '/signup']

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * Refresh the Supabase session cookie and apply optimistic route guards.
 *
 * This is a first line of defence only — per the Next.js proxy guidance it is
 * not a substitute for authorization. Every protected action re-checks via the
 * Data Access Layer in `src/lib/auth/guard.ts`.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Only a signature-verified operator cookie counts as a session. A forged or
  // legacy unsigned cookie resolves to null and is cleared below.
  const rawOperatorCookie = request.cookies.get(OPERATOR_SESSION_COOKIE)?.value
  const operator = verifyOperatorSession(rawOperatorCookie)

  const hasUser = !!user || !!operator
  const role = operator
    ? operator.role
    : normalizeRole(user?.app_metadata?.role ?? user?.user_metadata?.role)

  const { pathname } = request.nextUrl

  if (!hasUser && matches(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    const redirect = NextResponse.redirect(url)
    if (rawOperatorCookie) redirect.cookies.delete(OPERATOR_SESSION_COOKIE)
    return redirect
  }

  if (hasUser && matches(pathname, ADMIN_PREFIXES) && !hasRole(role, 'org_admin')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.searchParams.set('error', 'forbidden')
    return NextResponse.redirect(url)
  }

  if (hasUser && matches(pathname, AUTH_PREFIXES)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Sweep away a cookie that failed verification so it stops being re-sent.
  if (!operator && rawOperatorCookie) {
    supabaseResponse.cookies.delete(OPERATOR_SESSION_COOKIE)
  }

  return supabaseResponse
}
