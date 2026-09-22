/**
 * SuperAdmin provisioning & verification.
 *
 *   npx tsx scripts/seed-admin.ts          # create/verify, then report
 *   npx tsx scripts/seed-admin.ts --verify # read-only check, non-zero on drift
 *
 * Creates (or repairs) the seeded SuperAdmin and demo Viewer accounts, pins
 * their RBAC role in `public.user_profiles`, and gives each an active
 * subscription. Idempotent: safe to re-run on every deploy.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY — the Auth Admin API and the `role` column
 * are both closed to the anon key by RLS, by design.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadEnvLocal } from './_env';

loadEnvLocal();

const VERIFY_ONLY = process.argv.includes('--verify');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface SeedAccount {
  email: string;
  password: string;
  fullName: string;
  role: 'superadmin' | 'viewer';
  planCode: 'starter' | 'growth' | 'enterprise';
  planTier: string;
  credits: number;
}

const ACCOUNTS: SeedAccount[] = [
  {
    email: process.env.SUPERADMIN_EMAIL || 'reviewlens_admin@reviewlens.com',
    password: process.env.SUPERADMIN_PASSWORD || 'Admin@ReviewLens2026#',
    fullName: 'ReviewLens Administrator',
    role: 'superadmin',
    planCode: 'enterprise',
    planTier: 'Enterprise',
    credits: 99999,
  },
  {
    email: process.env.DEMO_VIEWER_EMAIL || 'reviewlens_free@reviewlens.com',
    password: process.env.DEMO_VIEWER_PASSWORD || 'FreeUser@2026#',
    fullName: 'ReviewLens Demo Viewer',
    role: 'viewer',
    planCode: 'starter',
    planTier: 'Starter',
    credits: 3,
  },
];

let failures = 0;

function fail(message: string): void {
  failures += 1;
  console.error(`  ✖ ${message}`);
}

function ok(message: string): void {
  console.log(`  ✔ ${message}`);
}

/** Find a user by email without paging the entire directory into memory. */
async function findUserByEmail(admin: SupabaseClient, email: string) {
  const target = email.toLowerCase();
  const perPage = 200;
  for (let page = 1; page <= 25; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < perPage) return null;
  }
  return null;
}

async function provision(admin: SupabaseClient, account: SeedAccount): Promise<void> {
  console.log(`\n▸ ${account.email}  [${account.role}]`);

  const existing = await findUserByEmail(admin, account.email);
  let userId: string;

  if (existing) {
    userId = existing.id;
    if (VERIFY_ONLY) {
      ok(`auth user exists (${userId})`);
    } else {
      const { error } = await admin.auth.admin.updateUserById(userId, {
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.fullName, role: account.role, plan: account.planCode },
        app_metadata: { role: account.role, provider: 'email', providers: ['email'] },
      });
      if (error) fail(`could not update auth user: ${error.message}`);
      else ok(`auth user updated (${userId})`);
    }
  } else if (VERIFY_ONLY) {
    fail('auth user is missing — run without --verify to provision');
    return;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { full_name: account.fullName, role: account.role, plan: account.planCode },
      app_metadata: { role: account.role, provider: 'email', providers: ['email'] },
    });
    if (error || !data.user) {
      fail(`could not create auth user: ${error?.message ?? 'unknown error'}`);
      return;
    }
    userId = data.user.id;
    ok(`auth user created (${userId})`);
  }

  if (!VERIFY_ONLY) {
    const { error: profileError } = await admin.from('user_profiles').upsert({
      id: userId,
      full_name: account.fullName,
      email: account.email,
      role: account.role,
      plan_tier: account.planTier,
      credits: account.credits,
      updated_at: new Date().toISOString(),
    });
    if (profileError) fail(`user_profiles upsert failed: ${profileError.message}`);
    else ok(`profile set to role=${account.role}, ${account.credits} credits`);

    // One active subscription per user is enforced by a partial unique index,
    // so only insert when the user has no live row.
    const { data: liveSub } = await admin
      .from('subscriptions')
      .select('id, plan_code')
      .eq('user_id', userId)
      .in('status', ['trialing', 'active', 'past_due'])
      .maybeSingle();

    if (liveSub) {
      if (liveSub.plan_code !== account.planCode) {
        const { error } = await admin
          .from('subscriptions')
          .update({ plan_code: account.planCode, updated_at: new Date().toISOString() })
          .eq('id', liveSub.id);
        if (error) fail(`subscription update failed: ${error.message}`);
        else ok(`subscription moved to ${account.planCode}`);
      } else {
        ok(`subscription already active on ${account.planCode}`);
      }
    } else {
      const { error } = await admin
        .from('subscriptions')
        .insert({ user_id: userId, plan_code: account.planCode, status: 'active' });
      if (error) fail(`subscription insert failed: ${error.message}`);
      else ok(`subscription created on ${account.planCode}`);
    }
  }

  // ── Verification: read back what the app will actually see ────────────────
  const { data: profile, error: readError } = await admin
    .from('user_profiles')
    .select('role, plan_tier, credits')
    .eq('id', userId)
    .maybeSingle();

  if (readError) {
    fail(`could not read back profile: ${readError.message}`);
    return;
  }
  if (!profile) {
    fail('profile row is missing after provisioning');
    return;
  }
  if (profile.role !== account.role) {
    fail(`role drift: expected ${account.role}, found ${profile.role}`);
    return;
  }

  ok(`verified: role=${profile.role}, plan=${profile.plan_tier}, credits=${profile.credits}`);
  if (account.role === 'superadmin') {
    ok('grants access to /admin (org_admin or higher)');
  }
}

async function main(): Promise<void> {
  console.log(`ReviewLens SuperAdmin provisioning${VERIFY_ONLY ? ' (verify only)' : ''}`);

  if (!SUPABASE_URL) {
    console.error('\n✖ NEXT_PUBLIC_SUPABASE_URL is not set.');
    process.exit(1);
  }
  if (!SERVICE_KEY) {
    console.error(
      [
        '',
        '✖ SUPABASE_SERVICE_ROLE_KEY is not set.',
        '',
        '  Creating auth users and writing the RBAC `role` column both bypass RLS,',
        '  which the anon key cannot and should not do.',
        '',
        '  Get it from: Supabase dashboard > Project Settings > API > service_role',
        '  Then add to .env.local:  SUPABASE_SERVICE_ROLE_KEY=<key>',
        '',
        '  Apply the schema first if you have not already:',
        '    supabase db push',
        '    # or paste supabase/migrations/*.sql into the SQL editor',
        '',
      ].join('\n')
    );
    process.exit(1);
  }

  console.log(`Project: ${SUPABASE_URL}`);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fail fast with an actionable message if the migration has not been applied.
  const { error: schemaError } = await admin.from('user_profiles').select('id').limit(1);
  if (schemaError) {
    console.error(
      `\n✖ Cannot read public.user_profiles: ${schemaError.message}\n` +
        '  Apply supabase/migrations/20260922090000_enterprise_schema.sql first.'
    );
    process.exit(1);
  }

  for (const account of ACCOUNTS) {
    try {
      await provision(admin, account);
    } catch (err) {
      fail(`unhandled error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (failures > 0) {
    console.error(`\n✖ Completed with ${failures} problem(s).`);
    process.exit(1);
  }
  console.log('\n✔ All accounts provisioned and verified.');
}

main().catch((err) => {
  console.error('\n✖ Fatal:', err);
  process.exit(1);
});
