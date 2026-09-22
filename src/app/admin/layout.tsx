import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser } from '@/utils/supabase/server';
import { hasRole, ROLE_LABELS } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

/**
 * Server-side authorization for the whole /admin subtree.
 *
 * The proxy already redirects unauthorized callers, but that is an optimistic
 * check only — this layout is what actually guarantees a viewer cannot render
 * an admin page, including on a direct RSC request.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();

  if (!user) redirect('/login?redirectTo=/admin');
  if (!hasRole(user.role, 'org_admin')) redirect('/dashboard?error=forbidden');

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-white/10 bg-neutral-950/80 backdrop-blur sticky top-0 z-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-white font-bold text-[11px]">
              R
            </div>
            <span className="text-sm font-semibold">ReviewLens</span>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-bold uppercase tracking-wider">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-[11px] text-neutral-400">
              {user.email} &middot; {ROLE_LABELS[user.role]}
            </span>
            <Link
              href="/dashboard"
              className="text-[11px] font-semibold text-neutral-300 hover:text-white transition-colors"
            >
              &larr; Dashboard
            </Link>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 max-w-7xl py-6">{children}</main>
    </div>
  );
}
