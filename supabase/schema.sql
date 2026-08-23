-- ReviewLens Supabase Schema DDL
-- Run this script directly in the Supabase SQL Editor to initialize the `analyses` table.

CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  product_url TEXT,
  platform TEXT,
  product_name TEXT,
  product_title TEXT,
  marketplace TEXT,
  category TEXT,
  average_rating NUMERIC,
  risk_status TEXT,
  return_risk_score NUMERIC,
  listing_health_score NUMERIC,
  margin_bleed_range TEXT,
  top_defect TEXT,
  capital_protected NUMERIC,
  defect_clusters JSONB,
  raw_reviews JSONB,
  vernacular_decoders JSONB,
  competitor_benchmarks JSONB,
  shield_radar JSONB,
  intelligence_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view & manage their own analyses
CREATE POLICY "Users can manage their own analyses"
ON public.analyses
FOR ALL
USING (auth.uid()::text = user_id OR user_id = 'demo-user-id')
WITH CHECK (auth.uid()::text = user_id OR user_id = 'demo-user-id');
