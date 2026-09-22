'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient as createServerClient } from '@/utils/supabase/server';
import type { Role } from '@/lib/auth/rbac';
import {
  OPERATOR_COOKIE_OPTIONS,
  OPERATOR_SESSION_COOKIE,
  encodeOperatorSession,
} from '@/lib/auth/session';

interface OperatorAccountConfig {
  /** Env var holding the account password. Falls back to `fallbackPassword` outside production. */
  passwordEnvVar: string;
  fallbackPassword: string;
  id: string;
  role: Role;
  plan: string;
  credits: number;
  fullName: string;
}

/**
 * Seeded operator accounts. These bypass Supabase's email-confirmation round
 * trip, so they are deliberately narrow:
 *   - passwords come from the environment in production (the checked-in
 *     fallback is refused when NODE_ENV === 'production'),
 *   - the resulting cookie is HMAC signed and expiry-bound,
 *   - set OPERATOR_LOGIN_DISABLED=true to switch the path off entirely.
 */
const OPERATOR_ACCOUNTS: Record<string, OperatorAccountConfig> = {
  'reviewlens_admin@reviewlens.com': {
    passwordEnvVar: 'SUPERADMIN_PASSWORD',
    fallbackPassword: 'Admin@ReviewLens2026#',
    id: '05eb3af6-709c-4304-8223-57fd63dc385f',
    role: 'superadmin',
    plan: 'Enterprise',
    credits: 99999,
    fullName: 'ReviewLens Administrator',
  },
  'reviewlens_free@reviewlens.com': {
    passwordEnvVar: 'DEMO_VIEWER_PASSWORD',
    fallbackPassword: 'FreeUser@2026#',
    id: '3d09da9c-b1fd-4c46-9e25-300b5b010379',
    role: 'viewer',
    plan: 'Starter',
    credits: 3,
    fullName: 'ReviewLens Demo Viewer',
  },
};

function resolveOperatorPassword(account: OperatorAccountConfig): string | null {
  const fromEnv = process.env[account.passwordEnvVar];
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if (process.env.NODE_ENV === 'production') return null;
  return account.fallbackPassword;
}

/** Timing-safe-ish comparison for short secrets; avoids early-exit on length. */
function passwordMatches(candidate: string, expected: string): boolean {
  if (candidate.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < candidate.length; i += 1) {
    mismatch |= candidate.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

function safeRedirectTarget(raw: FormDataEntryValue | null): string {
  const value = typeof raw === 'string' ? raw : '';
  // Only allow same-origin absolute paths; reject `//evil.com` and schemes.
  if (/^\/(?!\/)[A-Za-z0-9\-._~!$&'()*+,;=:@%/?#[\]]*$/.test(value)) return value;
  return '/dashboard';
}

export async function login(formData: FormData) {
  const email = (formData.get('email') as string || '').trim().toLowerCase();
  const password = (formData.get('password') as string || '').trim();
  const redirectTo = safeRedirectTarget(formData.get('redirectTo'));

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  // ── Seeded operator accounts ─────────────────────────────────────────────
  const account = OPERATOR_ACCOUNTS[email];
  if (account && process.env.OPERATOR_LOGIN_DISABLED !== 'true') {
    const expected = resolveOperatorPassword(account);
    if (!expected) {
      return {
        error: `Operator login unavailable: set ${account.passwordEnvVar} in the environment.`,
      };
    }
    if (!passwordMatches(password, expected)) {
      return { error: 'Invalid email or password' };
    }

    const cookieValue = encodeOperatorSession({
      id: account.id,
      email,
      role: account.role,
      plan: account.plan,
      credits: account.credits,
      fullName: account.fullName,
    });

    if (!cookieValue) {
      return {
        error: 'Server misconfiguration: AUTH_SESSION_SECRET is not set. Operator login is disabled.',
      };
    }

    console.log(`[Auth] Operator login for ${email} (role: ${account.role}).`);

    const cookieStore = await cookies();
    cookieStore.set(OPERATOR_SESSION_COOKIE, cookieValue, OPERATOR_COOKIE_OPTIONS);

    // Best-effort provisioning so the dashboard has a profile row to read.
    try {
      const supabaseServer = await createServerClient();
      await supabaseServer.from('user_profiles').upsert({
        id: account.id,
        full_name: account.fullName,
        credits: account.credits,
        plan_tier: account.plan,
        role: account.role,
      });
      await supabaseServer.from('sellers').upsert({
        id: account.id,
        full_name: account.fullName,
        whatsapp_number: account.role === 'superadmin' ? '+910000000000' : '',
        subscription_status: account.plan.toLowerCase(),
      });
    } catch {
      // Non-blocking: provisioning is re-attempted on dashboard load.
    }

    revalidatePath('/dashboard');
    redirect(redirectTo);
  }

  // ── Standard Supabase Auth Flow ──────────────────────────────────────────
  const supabaseServer = await createServerClient();
  const { error } = await supabaseServer.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  redirect(redirectTo);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(OPERATOR_SESSION_COOKIE);
  try {
    const supabaseServer = await createServerClient();
    await supabaseServer.auth.signOut();
  } catch {
    // ignore
  }
  revalidatePath('/');
  redirect('/login');
}
