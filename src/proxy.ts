import type { NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

/**
 * Next.js 16 renamed the `middleware` file convention to `proxy`. Runs on the
 * Node.js runtime by default, so `node:crypto` session verification is safe here.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
