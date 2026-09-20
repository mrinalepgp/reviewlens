import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { analyzeUrlsAction } from '@/app/actions';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const scrapDoKey = process.env.SCRAPDO_API_KEY || process.env.SCRAPEDO_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!scrapDoKey) {
      return NextResponse.json(
        { success: false, error: 'Environment configuration error: SCRAPDO_API_KEY is missing.' },
        { status: 500 }
      );
    }

    if (!geminiKey) {
      return NextResponse.json(
        { success: false, error: 'Environment configuration error: GEMINI_API_KEY is missing.' },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in to run analyses.' },
        { status: 401 }
      );
    }

    // Robust userId fallback: prefer UUID, fall back to email, then sentinel
    const userId: string = user.id || user.email || 'demo-user-id';
    console.log(`[API /api/analyze] Authenticated request. userId=${userId} email=${user.email}`);

    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload: urls array is required.' },
        { status: 400 }
      );
    }

    const result = await analyzeUrlsAction(urls);
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    // --- Belt-and-suspenders persistence guard ---
    // If any summary came back without a DB id, the action's internal insert
    // may have silently failed (e.g. RLS issue, schema mismatch). Attempt a
    // direct Supabase insert here so data is never lost.
    const orphans = result.summaries.filter(
      (s) => !s.id || s.id.startsWith('analysis_')
    );
    if (orphans.length > 0) {
      console.warn(
        `[API /api/analyze] ${orphans.length} summaries have no persistent DB id. Attempting safety-net insert...`
      );
      for (const s of orphans) {
        const { data: saved, error: saveErr } = await supabase
          .from('analyses')
          .insert({
            user_id: userId,          // uses the robust fallback chain
            product_url: s.url,
            platform: s.platform,
            product_name: s.title,
            product_title: s.title,
            category: s.intelligence?.category || 'General',
            average_rating: s.averageScore,
            risk_status: s.riskAssessment,
            return_risk_score: s.intelligence?.executiveScorecard?.returnRiskScore ?? 25,
            top_defect: s.intelligence?.executiveScorecard?.primaryRiskDriver ?? null,
            capital_protected: s.intelligence?.executiveScorecard?.estimatedCapitalProtected ?? null,
            defect_clusters: s.intelligence?.defectTaxonomy ?? [],
            raw_reviews: s.intelligence?.raw_reviews ?? [],
            intelligence_data: s.intelligence ?? {},
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (saveErr) {
          console.error(
            `[API /api/analyze] Safety-net insert FAILED for "${s.title}":`,
            JSON.stringify({ code: saveErr.code, message: saveErr.message, details: saveErr.details, hint: saveErr.hint })
          );
        } else {
          console.log(
            `[API /api/analyze] Safety-net insert committed for "${s.title}" → id=${saved?.id}`
          );
          // Backfill the id on the summary so the client can reference it
          s.id = saved?.id;
        }
      }
    }

    return NextResponse.json({ ...result, scrapedLive: true });
  } catch (err: any) {
    console.error('[API /api/analyze] Exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
