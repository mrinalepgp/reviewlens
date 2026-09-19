-- ==============================================================================
-- ReviewLens Supabase Auth & Role Seed Script
-- Run this script in your Supabase SQL Editor (Dashboard > SQL Editor)
-- 
-- Accounts created:
-- 1) reviewlens_admin@reviewlens.com (Admin / Unlimited Developer)
--    Password: Admin@ReviewLens2026#
--    Role: admin, Plan: Enterprise, Credits: 99999, Limits: Unlimited
--
-- 2) reviewlens_free@reviewlens.com (Restricted Free User)
--    Password: FreeUser@2026#
--    Role: free, Plan: Free, Credits: 3, Limits: 3 product links, 100 reviews cap
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_admin_id UUID;
  v_free_id UUID;
  v_admin_email TEXT := 'reviewlens_admin@reviewlens.com';
  v_admin_password TEXT := 'Admin@ReviewLens2026#';
  v_free_email TEXT := 'reviewlens_free@reviewlens.com';
  v_free_password TEXT := 'FreeUser@2026#';
BEGIN

  -- ----------------------------------------------------------------------------
  -- 1. SEED ADMIN USER: reviewlens_admin@reviewlens.com
  -- ----------------------------------------------------------------------------
  SELECT id INTO v_admin_id FROM auth.users WHERE email = v_admin_email;

  IF v_admin_id IS NULL THEN
    v_admin_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    ) VALUES (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      v_admin_email,
      crypt(v_admin_password, gen_salt('bf')),
      NOW(),
      jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'admin'),
      jsonb_build_object('full_name', 'ReviewLens Admin', 'role', 'admin', 'plan', 'enterprise'),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated',
      encode(gen_random_bytes(32), 'hex')
    );

    -- Insert identity for email signin
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_admin_id,
      jsonb_build_object('sub', v_admin_id::text, 'email', v_admin_email),
      'email',
      v_admin_id::text,
      NOW(),
      NOW(),
      NOW()
    );
  ELSE
    -- User already exists: update password, metadata, and confirm email
    UPDATE auth.users
    SET 
      encrypted_password = crypt(v_admin_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'admin'),
      raw_user_meta_data = jsonb_build_object('full_name', 'ReviewLens Admin', 'role', 'admin', 'plan', 'enterprise'),
      updated_at = NOW()
    WHERE id = v_admin_id;
  END IF;

  -- Ensure Admin Profile in public.user_profiles
  INSERT INTO public.user_profiles (
    id,
    full_name,
    credits,
    plan_tier
  ) VALUES (
    v_admin_id,
    'ReviewLens Admin',
    99999,
    'Enterprise'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = 'ReviewLens Admin',
    credits = 99999,
    plan_tier = 'Enterprise';

  -- Ensure Admin Seller record
  INSERT INTO public.sellers (
    id,
    full_name,
    whatsapp_number,
    subscription_status
  ) VALUES (
    v_admin_id,
    'ReviewLens Admin',
    '+910000000000',
    'enterprise'
  )
  ON CONFLICT (id) DO UPDATE SET
    subscription_status = 'enterprise';


  -- ----------------------------------------------------------------------------
  -- 2. SEED FREE USER: reviewlens_free@reviewlens.com
  -- ----------------------------------------------------------------------------
  SELECT id INTO v_free_id FROM auth.users WHERE email = v_free_email;

  IF v_free_id IS NULL THEN
    v_free_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    ) VALUES (
      v_free_id,
      '00000000-0000-0000-0000-000000000000',
      v_free_email,
      crypt(v_free_password, gen_salt('bf')),
      NOW(),
      jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'free'),
      jsonb_build_object('full_name', 'ReviewLens Free User', 'role', 'free', 'plan', 'free'),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated',
      encode(gen_random_bytes(32), 'hex')
    );

    -- Insert identity for email signin
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_free_id,
      jsonb_build_object('sub', v_free_id::text, 'email', v_free_email),
      'email',
      v_free_id::text,
      NOW(),
      NOW(),
      NOW()
    );
  ELSE
    -- User already exists: update password, metadata, and confirm email
    UPDATE auth.users
    SET 
      encrypted_password = crypt(v_free_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'free'),
      raw_user_meta_data = jsonb_build_object('full_name', 'ReviewLens Free User', 'role', 'free', 'plan', 'free'),
      updated_at = NOW()
    WHERE id = v_free_id;
  END IF;

  -- Ensure Free User Profile in public.user_profiles
  INSERT INTO public.user_profiles (
    id,
    full_name,
    credits,
    plan_tier
  ) VALUES (
    v_free_id,
    'ReviewLens Free User',
    3,
    'Free'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = 'ReviewLens Free User',
    credits = 3,
    plan_tier = 'Free';

  -- Ensure Free Seller record
  INSERT INTO public.sellers (
    id,
    full_name,
    whatsapp_number,
    subscription_status
  ) VALUES (
    v_free_id,
    'ReviewLens Free User',
    '',
    'free'
  )
  ON CONFLICT (id) DO UPDATE SET
    subscription_status = 'free';

  RAISE NOTICE 'ReviewLens seed complete:';
  RAISE NOTICE '  - Admin: reviewlens_admin@reviewlens.com (ID: %)', v_admin_id;
  RAISE NOTICE '  - Free User: reviewlens_free@reviewlens.com (ID: %)', v_free_id;
END $$;
