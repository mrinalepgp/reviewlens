import { requireRole } from '@/lib/auth/guard';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { ROLE_LABELS, normalizeRole } from '@/lib/auth/rbac';
import { PLAN_LIST, formatInr, getPlan } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  plan_tier: string | null;
  credits: number | null;
  created_at: string | null;
}

interface AuditRow {
  id: number;
  actor_email: string | null;
  action: string;
  resource: string | null;
  created_at: string;
}

interface SubscriptionRow {
  plan_code: string;
  status: string;
}

/**
 * Prefer the service-role client so the console can see across all tenants.
 * Without it we fall back to the caller's RLS-scoped client, which for an admin
 * still returns every profile via the `profiles: admin read all` policy — the
 * audit log and cross-tenant subscription totals are the parts that need the
 * elevated key.
 */
async function getReadClient() {
  return createAdminClient() ?? (await createClient());
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function AdminPage() {
  // Re-assert authorization at the data layer; the layout guard is not enough
  // on its own if this page is ever rendered through another route.
  await requireRole('org_admin');

  const db = await getReadClient();
  const usingServiceRole = createAdminClient() !== null;

  const [profilesRes, subsRes, auditRes, analysesRes, taxonomyRes] = await Promise.all([
    db.from('user_profiles').select('id, full_name, email, role, plan_tier, credits, created_at')
      .order('created_at', { ascending: false }).limit(50),
    db.from('subscriptions').select('plan_code, status'),
    db.from('audit_logs').select('id, actor_email, action, resource, created_at')
      .order('created_at', { ascending: false }).limit(25),
    db.from('analyses').select('id', { count: 'exact', head: true }),
    db.from('defect_taxonomies').select('id', { count: 'exact', head: true }),
  ]);

  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const subscriptions = (subsRes.data ?? []) as SubscriptionRow[];
  const auditEvents = (auditRes.data ?? []) as AuditRow[];

  const activeSubs = subscriptions.filter((s) => ['active', 'trialing', 'past_due'].includes(s.status));
  const mrr = activeSubs.reduce((acc, s) => acc + getPlan(s.plan_code).priceInr, 0);
  const subsByPlan = PLAN_LIST.map((plan) => ({
    plan,
    count: activeSubs.filter((s) => s.plan_code === plan.code).length,
  }));

  // Surface the specific query that failed rather than rendering silent zeroes.
  const errors = [
    profilesRes.error && `user_profiles: ${profilesRes.error.message}`,
    subsRes.error && `subscriptions: ${subsRes.error.message}`,
    auditRes.error && `audit_logs: ${auditRes.error.message}`,
    analysesRes.error && `analyses: ${analysesRes.error.message}`,
    taxonomyRes.error && `defect_taxonomies: ${taxonomyRes.error.message}`,
  ].filter(Boolean) as string[];

  const stats = [
    { label: 'Registered Users', value: profiles.length === 50 ? '50+' : String(profiles.length) },
    { label: 'Active Subscriptions', value: String(activeSubs.length) },
    { label: 'Monthly Recurring Revenue', value: formatInr(mrr) },
    { label: 'Audits Run', value: analysesRes.count == null ? '—' : String(analysesRes.count) },
    { label: 'Defect Taxonomy Rules', value: taxonomyRes.count == null ? '—' : String(taxonomyRes.count) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Platform Console</h1>
        <p className="text-xs text-neutral-400 mt-1">
          Tenant-wide identity, monetization and audit oversight.
        </p>
      </div>

      {!usingServiceRole && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-200">
          <strong className="font-semibold">Running without a service-role key.</strong> Figures are
          scoped by RLS to what your account can read. Set{' '}
          <code className="font-mono text-[11px]">SUPABASE_SERVICE_ROLE_KEY</code> for full
          cross-tenant visibility.
        </div>
      )}

      {errors.length > 0 && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-xs text-rose-200">
          <strong className="font-semibold">Some queries failed.</strong>
          <ul className="mt-2 space-y-1 list-disc list-inside font-mono text-[11px]">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
          <p className="mt-2 text-rose-300/80">
            If these are &ldquo;relation does not exist&rdquo; errors, apply{' '}
            <code className="font-mono">supabase/migrations/</code> to the project.
          </p>
        </div>
      )}

      {/* ── Stat row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              {stat.label}
            </div>
            <div className="mt-1 text-lg font-black text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── Plan mix ─────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-sm font-semibold mb-3">Subscription mix</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {subsByPlan.map(({ plan, count }) => (
            <div key={plan.code} className="rounded-lg border border-white/10 bg-neutral-900/50 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-white">{plan.name}</span>
                <span className="text-[10px] text-neutral-400">{formatInr(plan.priceInr)}/mo</span>
              </div>
              <div className="mt-1 text-xl font-black text-indigo-400">{count}</div>
              <div className="text-[10px] text-neutral-500">
                {plan.skuQuota == null ? 'Unlimited SKUs' : `${plan.skuQuota} SKUs`} &middot;{' '}
                {plan.seats} seat{plan.seats === 1 ? '' : 's'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Users ────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <h2 className="text-sm font-semibold px-4 pt-4 pb-3">Users &amp; roles</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-white/[0.03] text-neutral-400">
              <tr>
                <th className="text-left font-semibold px-4 py-2">Name</th>
                <th className="text-left font-semibold px-4 py-2">Email</th>
                <th className="text-left font-semibold px-4 py-2">Role</th>
                <th className="text-left font-semibold px-4 py-2">Plan</th>
                <th className="text-right font-semibold px-4 py-2">Credits</th>
                <th className="text-left font-semibold px-4 py-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                    No user profiles found. Run <code className="font-mono">npx tsx scripts/seed-admin.ts</code>.
                  </td>
                </tr>
              )}
              {profiles.map((profile) => {
                const role = normalizeRole(profile.role);
                return (
                  <tr key={profile.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-white">{profile.full_name || '—'}</td>
                    <td className="px-4 py-2 text-neutral-400 font-mono text-[11px]">
                      {profile.email || '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          role === 'superadmin'
                            ? 'bg-rose-500/15 text-rose-300'
                            : role === 'org_admin'
                              ? 'bg-amber-500/15 text-amber-300'
                              : role === 'analyst'
                                ? 'bg-indigo-500/15 text-indigo-300'
                                : 'bg-white/5 text-neutral-400'
                        }`}
                      >
                        {ROLE_LABELS[role]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-neutral-300">{profile.plan_tier || '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-neutral-300">
                      {profile.credits ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-neutral-500">{formatDate(profile.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Audit trail ──────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <h2 className="text-sm font-semibold px-4 pt-4 pb-3">Recent audit events</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-white/[0.03] text-neutral-400">
              <tr>
                <th className="text-left font-semibold px-4 py-2">When</th>
                <th className="text-left font-semibold px-4 py-2">Actor</th>
                <th className="text-left font-semibold px-4 py-2">Action</th>
                <th className="text-left font-semibold px-4 py-2">Resource</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {auditEvents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                    No audit events recorded yet.
                  </td>
                </tr>
              )}
              {auditEvents.map((event) => (
                <tr key={event.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2 text-neutral-500 whitespace-nowrap">
                    {formatDate(event.created_at)}
                  </td>
                  <td className="px-4 py-2 text-neutral-400 font-mono text-[11px]">
                    {event.actor_email || '—'}
                  </td>
                  <td className="px-4 py-2 text-white font-medium">{event.action}</td>
                  <td className="px-4 py-2 text-neutral-400 font-mono text-[11px] max-w-xs truncate">
                    {event.resource || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
