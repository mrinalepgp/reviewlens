-- ==============================================================================
-- ReviewLens — Enterprise relational schema
--
-- Non-destructive: every statement is IF NOT EXISTS / ADD COLUMN IF NOT EXISTS /
-- CREATE OR REPLACE, so it is safe to re-run against the live project and will
-- not drop or rewrite existing `analyses`, `products`, `reviews` or `sellers`
-- data. Apply with `supabase db push`, `psql`, or the Supabase SQL editor.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Role type — the RBAC ladder, mirrored by src/lib/auth/rbac.ts
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('viewer', 'analyst', 'org_admin', 'superadmin');
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. user_profiles — identity, RBAC role, credit balance
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          UUID PRIMARY KEY,
  full_name   TEXT,
  email       TEXT,
  role        public.app_role NOT NULL DEFAULT 'viewer',
  plan_tier   TEXT NOT NULL DEFAULT 'Starter',
  credits     INTEGER NOT NULL DEFAULT 3 CHECK (credits >= 0),
  org_id      UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Additive guards in case an earlier build already created a thinner table.
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email      TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role       public.app_role NOT NULL DEFAULT 'viewer';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS org_id     UUID;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_user_profiles_org  ON public.user_profiles (org_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles (role);

-- SECURITY DEFINER so policies can read the caller's role without recursing
-- through user_profiles' own RLS. Pinned to an empty search_path.
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT p.role FROM public.user_profiles p WHERE p.id = auth.uid()),
    'viewer'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_app_role() IN ('org_admin'::public.app_role, 'superadmin'::public.app_role);
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. products / reviews — additive columns for live pricing + fake-review radar
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS user_id      UUID;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS title        TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category     TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price        NUMERIC(12,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS currency     TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating       NUMERIC(3,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS review_count INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS external_sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_url      ON public.products (url);
CREATE INDEX        IF NOT EXISTS idx_products_user     ON public.products (user_id);
CREATE INDEX        IF NOT EXISTS idx_products_category ON public.products (category);

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS verified          BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS review_date       DATE;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS aspects           JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS fake_score        NUMERIC(4,3) NOT NULL DEFAULT 0;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_suspected_fake BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_date    ON public.reviews (review_date);
CREATE INDEX IF NOT EXISTS idx_reviews_fake    ON public.reviews (is_suspected_fake) WHERE is_suspected_fake;

CREATE INDEX IF NOT EXISTS idx_analyses_user_created ON public.analyses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_url          ON public.analyses (product_url);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. defect_taxonomies — category-aware defect dictionary driving ABSA + bleed
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.defect_taxonomies (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category           TEXT NOT NULL,
  aspect             TEXT NOT NULL,
  defect_label       TEXT NOT NULL,
  keywords           TEXT[] NOT NULL DEFAULT '{}',
  severity_weight    NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (severity_weight BETWEEN 0 AND 1),
  return_risk_factor NUMERIC(3,2) NOT NULL DEFAULT 0.25 CHECK (return_risk_factor BETWEEN 0 AND 1),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category, defect_label)
);

CREATE INDEX IF NOT EXISTS idx_defect_taxonomies_category ON public.defect_taxonomies (category);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. subscription_plans / subscriptions — SaaS monetization
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  code             TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  price_inr        INTEGER NOT NULL CHECK (price_inr >= 0),
  sku_quota        INTEGER,   -- NULL = unlimited
  api_calls_quota  INTEGER,   -- NULL = unlimited
  seats            INTEGER NOT NULL DEFAULT 1,
  review_depth_cap INTEGER NOT NULL DEFAULT 50,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.subscription_plans (code, name, price_inr, sku_quota, api_calls_quota, seats, review_depth_cap)
VALUES
  ('starter',    'Starter',     1999,   25,   1000,  1,  50),
  ('growth',     'Growth',      4999,  200,  25000,  5, 150),
  ('enterprise', 'Enterprise', 14999, NULL,   NULL, 25, 500)
ON CONFLICT (code) DO UPDATE SET
  name             = EXCLUDED.name,
  price_inr        = EXCLUDED.price_inr,
  sku_quota        = EXCLUDED.sku_quota,
  api_calls_quota  = EXCLUDED.api_calls_quota,
  seats            = EXCLUDED.seats,
  review_depth_cap = EXCLUDED.review_depth_cap;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL,
  plan_code            TEXT NOT NULL REFERENCES public.subscription_plans(code),
  status               TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  skus_used            INTEGER NOT NULL DEFAULT 0 CHECK (skus_used >= 0),
  api_calls_used       INTEGER NOT NULL DEFAULT 0 CHECK (api_calls_used >= 0),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One live subscription per user; historical canceled rows are still allowed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_active_user
  ON public.subscriptions (user_id)
  WHERE status IN ('trialing', 'active', 'past_due');
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions (user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. audit_logs — append-only trail
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID,
  actor_email TEXT,
  action      TEXT NOT NULL,
  resource    TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor   ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action  ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (created_at DESC);

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. Row Level Security
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_taxonomies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: self read"      ON public.user_profiles;
DROP POLICY IF EXISTS "profiles: admin read all" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles: self insert"    ON public.user_profiles;
DROP POLICY IF EXISTS "profiles: self update"    ON public.user_profiles;

CREATE POLICY "profiles: self read"      ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles: admin read all" ON public.user_profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "profiles: self insert"    ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
-- The WITH CHECK pins `role` to the value already stored, so a row owner cannot
-- promote themselves. Role changes go through the service-role key, which
-- bypasses RLS, via scripts/seed-admin.ts or the /admin console.
CREATE POLICY "profiles: self update"    ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = public.current_app_role());

DROP POLICY IF EXISTS "subscriptions: self read"    ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions: admin manage" ON public.subscriptions;
CREATE POLICY "subscriptions: self read"    ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subscriptions: admin manage" ON public.subscriptions FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "plans: public read" ON public.subscription_plans;
CREATE POLICY "plans: public read" ON public.subscription_plans FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "taxonomy: authenticated read" ON public.defect_taxonomies;
DROP POLICY IF EXISTS "taxonomy: admin write"        ON public.defect_taxonomies;
CREATE POLICY "taxonomy: authenticated read" ON public.defect_taxonomies FOR SELECT USING (TRUE);
CREATE POLICY "taxonomy: admin write"        ON public.defect_taxonomies FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Append-only: a caller may only write events attributed to themselves, only
-- admins may read, and no UPDATE/DELETE policy exists — so the trail cannot be
-- rewritten or erased through the API.
DROP POLICY IF EXISTS "audit: admin read"  ON public.audit_logs;
DROP POLICY IF EXISTS "audit: self append" ON public.audit_logs;
CREATE POLICY "audit: admin read"  ON public.audit_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "audit: self append" ON public.audit_logs FOR INSERT WITH CHECK (actor_id = auth.uid());
