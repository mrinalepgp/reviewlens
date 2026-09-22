// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SaaS plan catalogue — single source of truth
//
// Mirrors `public.subscription_plans` (see
// supabase/migrations/20260922090000_enterprise_schema.sql). The marketing page,
// the quota enforcement in server actions, and the admin console all read from
// here so a price or quota is never restated in two places.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type PlanCode = 'starter' | 'growth' | 'enterprise';

export interface Plan {
  code: PlanCode;
  name: string;
  /** Monthly price in whole rupees. */
  priceInr: number;
  tagline: string;
  /** Tracked SKUs included; `null` means unlimited. */
  skuQuota: number | null;
  /** API calls per billing period; `null` means unlimited. */
  apiCallsQuota: number | null;
  seats: number;
  /** Maximum reviews ingested per SKU audit. */
  reviewDepthCap: number;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: Record<PlanCode, Plan> = {
  starter: {
    code: 'starter',
    name: 'Starter',
    priceInr: 1999,
    tagline: 'For single-brand sellers validating their first catalogue.',
    skuQuota: 25,
    apiCallsQuota: 1000,
    seats: 1,
    reviewDepthCap: 50,
    features: [
      '25 tracked SKUs',
      '50 reviews ingested per audit',
      'Amazon, Flipkart & Meesho connectors',
      'Aspect-based sentiment breakdown',
      'CSV export',
    ],
  },
  growth: {
    code: 'growth',
    name: 'Growth',
    priceInr: 4999,
    tagline: 'For scaling D2C brands defending margin across a live catalogue.',
    skuQuota: 200,
    apiCallsQuota: 25000,
    seats: 5,
    reviewDepthCap: 150,
    features: [
      '200 tracked SKUs, 5 seats',
      '150 reviews ingested per audit',
      'Fake Review & Bot Radar',
      'Return-bleed ROI modelling',
      'Competitor benchmark & PDF executive brief',
      'Return-spike webhook alerts',
    ],
    highlighted: true,
  },
  enterprise: {
    code: 'enterprise',
    name: 'Enterprise',
    priceInr: 14999,
    tagline: 'For multi-brand groups and marketplaces with custom quotas.',
    skuQuota: null,
    apiCallsQuota: null,
    seats: 25,
    reviewDepthCap: 500,
    features: [
      'Unlimited SKUs & API calls, 25 seats',
      '500 reviews ingested per audit',
      'Custom defect taxonomy per category',
      'SuperAdmin console, RBAC & audit trail',
      'Dedicated dispute specialist',
    ],
  },
};

export const PLAN_LIST: Plan[] = [PLANS.starter, PLANS.growth, PLANS.enterprise];

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** `1999` → `₹1,999`. Used everywhere a rupee figure is rendered. */
export function formatInr(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return INR.format(Math.round(value));
}

export function normalizePlanCode(raw: unknown): PlanCode {
  const value = String(raw ?? '').trim().toLowerCase();
  if (value === 'enterprise') return 'enterprise';
  if (value === 'growth' || value === 'growth pro' || value === 'pro') return 'growth';
  return 'starter';
}

export function getPlan(raw: unknown): Plan {
  return PLANS[normalizePlanCode(raw)];
}
