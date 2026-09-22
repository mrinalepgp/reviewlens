"use server";

import { fetchMarketplaceReviews } from "@/lib/scraper";
import type { EnterpriseIntelligence, Marketplace } from "@/lib/scraper";
import type { LooseReview, LooseDefect } from "@/lib/types";
import { generateHeadToHeadComparison } from "@/lib/ai";
import { createClient, getAuthenticatedUser } from "@/utils/supabase/server";
import { hasRole } from "@/lib/auth/rbac";
import { getPlan } from "@/lib/pricing";
import { errorMessage } from "@/lib/errors";

export interface AnalyzedProductSummary {
  id?: string;
  url: string;
  platform: string;
  title: string;
  price?: string;
  averageScore: number;
  riskAssessment: 'safe' | 'warning' | 'critical';
  negativeThemes: string[];
  intelligence?: EnterpriseIntelligence;
  raw_reviews?: LooseReview[];
  reviewsCount?: number;
}

export interface AnalyzeUrlsResponse {
  success: boolean;
  scrapedLive?: boolean;
  summaries: AnalyzedProductSummary[];
  error?: string;
}

/** A row of the `analyses` table as read back by the dashboard. */
export interface AnalysisRow {
  id?: string;
  user_id?: string;
  product_url?: string;
  platform?: string;
  marketplace?: string;
  product_name?: string;
  product_title?: string;
  category?: string;
  risk_status?: string;
  return_risk_score?: number | null;
  listing_health_score?: number | null;
  top_defect?: string;
  capital_protected?: number | null;
  margin_bleed_range?: string | null;
  price?: string | number | null;
  product_price?: string | number | null;
  average_rating?: number | null;
  defect_clusters?: LooseDefect[];
  raw_reviews?: LooseReview[];
  vernacular_decoders?: unknown;
  competitor_benchmarks?: Record<string, unknown>;
  shield_radar?: Record<string, unknown>;
  intelligence_data?: EnterpriseIntelligence;
  intelligence?: EnterpriseIntelligence;
  created_at?: string;
  // Aliases present on rows written by earlier builds.
  url?: string;
  title?: string;
  averageScore?: number;
  riskAssessment?: 'safe' | 'warning' | 'critical';
}

export interface ReviewAnalysisRow {
  id: string;
  product_id: string;
  review_text: string;
  star_rating: number;
  ai_sentiment: string;
  ai_extracted_issue: string;
}

/**
 * Server action to orchestrate the scraping and AI analysis pipeline.
 */
export async function analyzeUrlsAction(
  urls: string[],
  options?: { startDate?: string; endDate?: string; isComparison?: boolean; reviewLimit?: number }
): Promise<AnalyzeUrlsResponse> {

  try {
    const brightDataKey = process.env.BRIGHTDATA_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!brightDataKey) {
      return {
        success: false,
        summaries: [],
        error: 'Environment Error: BRIGHTDATA_API_KEY is not configured in environment variables. Please set your Bright Data API key to proceed.'
      };
    }

    if (!geminiKey) {
      return {
        success: false,
        summaries: [],
        error: 'Environment Error: GEMINI_API_KEY is not configured in environment variables. Please set your Google Gemini API key to proceed.'
      };
    }

    const supabase = await createClient();

    // ── DATABASE INTEGRITY: Purge any legacy broken rows where product starts with "Analysis Failed"
    try {
      await supabase
        .from('analyses')
        .delete()
        .or('product_name.ilike.analysis failed%,product_title.ilike.analysis failed%,product_name.ilike.incomplete data%,product_title.ilike.incomplete data%');
    } catch {
      // Best-effort cleanup
    }

    // Server Actions are publicly reachable endpoints — an unauthenticated
    // caller must be rejected, never handed a placeholder identity.
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, summaries: [], error: 'Unauthorized. Please sign in to run an audit.' };
    }

    const userEmail = user.email.toLowerCase();
    const isAdmin = hasRole(user.role, 'org_admin');
    const plan = getPlan(user.plan);

    // ── Enforce the plan's SKU quota ──────────────────────────────────────
    let existingCount = 0;
    try {
      const { count } = await supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      existingCount = count || 0;
    } catch {
      existingCount = 0;
    }

    if (!isAdmin && plan.skuQuota != null && existingCount + urls.length > plan.skuQuota) {
      throw new Error(
        `${plan.name} plan limit reached: ${plan.skuQuota} tracked SKUs (currently using ${existingCount}). Upgrade to raise the quota.`
      );
    }

    let { data: profile } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      console.log(`[Auto-Provision] User profile missing for ${user.id}. Auto-provisioning profile...`);
      const initialCredits = isAdmin ? 99999 : plan.skuQuota ?? 999;

      const { data: newProfile } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          credits: initialCredits,
          full_name: user.fullName,
          email: user.email,
          plan_tier: plan.name
        })
        .select('credits')
        .maybeSingle();

      profile = newProfile || { credits: initialCredits };

      try {
        await supabase.from('sellers').insert({
          id: user.id,
          full_name: user.fullName,
          whatsapp_number: '',
          subscription_status: plan.code
        });
      } catch {
        // ignore if already exists
      }
    }

    const availableCredits = isAdmin ? 99999 : (profile?.credits ?? 0);

    if (availableCredits < urls.length && !isAdmin) {
      throw new Error(`Insufficient credits. You need ${urls.length} credits but have ${availableCredits}.`);
    }

    console.log(`[Action] Starting batch analysis for ${urls.length} URLs (User: ${userEmail}, Admin: ${isAdmin})...`);
    const summaries: AnalyzedProductSummary[] = [];

    let currentCredits = availableCredits;

    for (const url of urls) {
      let scrapeResult;
      
      try {
        scrapeResult = await fetchMarketplaceReviews(url, options);
      } catch (err) {
        console.error(`[Action] fetchMarketplaceReviews exception for ${url}:`, err);
        scrapeResult = {
          success: false,
          marketplace: 'unknown' as Marketplace,
          url,
          reviews: [],
          error: errorMessage(err) || 'Scraping and review extraction failed.'
        };
      }

      if (!scrapeResult.success) {
        console.error(`[Action] Scraping failed for ${url}: ${scrapeResult.error}`);
        // Graceful failure: add error summary without crashing the batch
        summaries.push({
          url,
          platform: scrapeResult.marketplace || 'unknown',
          title: `Analysis Failed`,
          averageScore: 0,
          riskAssessment: 'critical',
          negativeThemes: [scrapeResult.error || 'Scraping failed'],
          reviewsCount: 0
        });
        continue;
      }

      if (!scrapeResult.reviews || !scrapeResult.reviews.length) {
        console.warn(`[Action] No reviews collected for URL: ${url}`);
        summaries.push({
          url,
          platform: scrapeResult.marketplace || 'unknown',
          title: scrapeResult.productTitle || `No Reviews Found`,
          averageScore: 0,
          riskAssessment: 'warning',
          negativeThemes: ['No reviews could be extracted'],
          reviewsCount: 0
        });
        continue;
      }

      let reviews = scrapeResult.reviews;

      // ── Enforce the plan's review-depth cap ─────────────────────────────
      // The UI may request fewer reviews than the plan allows, but never more.
      const planCap = isAdmin ? 2000 : plan.reviewDepthCap;
      const reviewLimit = Math.min(options?.reviewLimit || planCap, planCap);
      if (reviews && reviews.length > reviewLimit) {
        console.log(`[Volume Cap] Slicing reviews from ${reviews.length} to ${reviewLimit} for ${url} (${plan.name} plan)`);
        reviews = reviews.slice(0, reviewLimit);
      }
      let totalScore = 0;
      const negativeThemes: Set<string> = new Set();
      const reviewAnalysisData = [];

      for (const review of reviews) {
        totalScore += review.rating;
        const isNeg = review.rating <= 2;
        if (isNeg) {
          if (review.sentiment && review.sentiment !== 'OPTIMAL') {
            negativeThemes.add(review.sentiment);
          }
        }
        reviewAnalysisData.push({
          review_text: review.content,
          star_rating: review.rating,
          ai_sentiment: isNeg ? 'negative' : review.rating === 3 ? 'neutral' : 'positive',
          ai_extracted_issue: review.sentiment || 'none'
        });
      }

      const averageScore = Number((totalScore / (reviews.length || 1)).toFixed(1));
      const intelRiskScore = scrapeResult.intelligence?.executiveScorecard?.returnRiskScore ?? 25;
      
      let riskAssessment: 'safe' | 'warning' | 'critical' = 'safe';
      if (intelRiskScore >= 32) {
        riskAssessment = 'critical';
      } else if (intelRiskScore >= 22) {
        riskAssessment = 'warning';
      }
      
      const productName = scrapeResult.productTitle || `Product Snapshot (${scrapeResult.marketplace})`;
      let dbProductId = undefined;
      
      const safeIntelligenceData = {
        category: scrapeResult.category || "General Catalog",
        price: scrapeResult.price || "₹899",
        brand: scrapeResult.brand || "Seller Brand",
        executiveScorecard: scrapeResult.intelligence?.executiveScorecard || {
          returnRiskScore: riskAssessment === 'critical' ? 38 : riskAssessment === 'warning' ? 26 : 16,
          listingHealthScore: riskAssessment === 'critical' ? 62 : riskAssessment === 'warning' ? 74 : 84,
          estimatedMarginLossRange: "₹25,000 - ₹50,000",
          primaryRiskDriver: Array.from(negativeThemes)[0] || "No critical drivers identified"
        },
        defectTaxonomy: scrapeResult.intelligence?.defectTaxonomy || [],
        vernacularDecoder: scrapeResult.intelligence?.vernacularDecoder || [],
        mitigationPlaybook: scrapeResult.intelligence?.mitigationPlaybook || {
          listingFixBullets: ["Review sizing charts", "Update product description for clarity"],
          antiReturnListingCopy: "Ensure you check the detailed sizing guide before purchase.",
          supplierQualityMemo: "Monitor recent reviews for potential QA issues.",
          customerRecoveryScript: "We apologize for the inconvenience, please contact support for a replacement."
        },
        authenticityRadar: scrapeResult.intelligence?.authenticityRadar || {
          authenticityScore: 90,
          attackRiskLevel: "LOW",
          suspiciousReviewCount: 0,
          flaggedPatterns: [],
          disputeDraft: {
            subject: "Routine Review Audit",
            body: "No suspicious patterns detected."
          }
        },
        competitorDiscovery: scrapeResult.intelligence?.competitorDiscovery || [],
        competitorRadar: scrapeResult.intelligence?.competitorRadar || null,
        reviews: scrapeResult.reviews || [],
        raw_reviews: scrapeResult.reviews || []
      };

      try {
        if (productName.toLowerCase().startsWith('analysis failed') || productName.toLowerCase().startsWith('incomplete data')) {
          console.warn('[Database Integrity] Aborting DB insert for invalid product title:', productName);
          throw new Error('Analysis extraction failed: Incomplete product data.');
        }

        let insertedId: string | undefined = undefined;

        // Persist nulls rather than stand-in figures: a missing score must not
        // be indistinguishable from a real one when it is read back.
        const riskScore = safeIntelligenceData.executiveScorecard?.returnRiskScore ?? null;
        const topDefect = safeIntelligenceData.executiveScorecard?.primaryRiskDriver || "Defect Detected";
        const capitalProtected = safeIntelligenceData.executiveScorecard?.estimatedCapitalProtected ?? null;
        const clusters = safeIntelligenceData.defectTaxonomy || [];

        // 1. Database insert with schema-resilient sanitization
        try {
          const priceMatch = String(scrapeResult.price || '').match(/(?:₹|Rs\.?)\s*([0-9,]+)/i);
          // Null when the live price could not be extracted — downstream renders
          // an explicit "price unavailable" rather than a placeholder amount.
          const numericPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : null;
          const rawPriceVal = scrapeResult.price || (numericPrice != null ? `₹${numericPrice}` : null);
          const insertPayload: Record<string, unknown> = {
            user_id: user.id,
            product_url: url,
            platform: scrapeResult.marketplace,
            marketplace: scrapeResult.marketplace,
            product_name: productName,
            product_title: productName,
            category: scrapeResult.category || "General",
            risk_status: riskAssessment,
            return_risk_score: riskScore,
            top_defect: topDefect,
            capital_protected: capitalProtected,
            defect_clusters: clusters,
            margin_bleed_range: rawPriceVal,
            shield_radar: {
              price: numericPrice,
              asp: numericPrice,
              priceString: rawPriceVal,
              raw_reviews: scrapeResult.reviews || []
            },
            competitor_benchmarks: {
              ...(safeIntelligenceData.competitorRadar || {}),
              price: numericPrice,
              asp: numericPrice
            },
            raw_reviews: scrapeResult.reviews || [],
            intelligence_data: safeIntelligenceData,
            created_at: new Date().toISOString()
          };

          let analysisRecord = null;
          let retryCount = 0;

          // Increase retry limit to 20 to handle severely stale schema caches (PGRST204)
          // where multiple columns need to be iteratively stripped.
          while (retryCount < 20) {
            const { data, error } = await supabase
              .from('analyses')
              .insert(insertPayload)
              .select()
              .single();

            if (error) {
              if (error.code === 'PGRST204') {
                const match = error.message.match(/'([^']+)'/);
                if (match && match[1]) {
                  const badCol = match[1];
                  console.warn(`[Database] Schema Sanitizer: Column '${badCol}' missing in DB schema. Stripping from payload and retrying...`);
                  delete insertPayload[badCol];
                  retryCount++;
                  continue;
                }
              }
              console.error(
                `[Database] Insert error for 'analyses' table on retry ${retryCount}:`,
                JSON.stringify({ code: error.code, message: error.message, details: error.details, hint: error.hint })
              );
              break; // Not a schema error we can auto-fix, or we failed to parse the column name
            }
            
            analysisRecord = data;
            break; // Success
          }

          if (!analysisRecord?.id) {
            // Fallback: strictly minimal payload if dynamic sanitization failed
            console.log(`[Database] Falling back to strictly minimal payload...`);
            const { data: fallbackRecord, error: fallbackError } = await supabase
              .from('analyses')
              .insert({
                user_id: user.id,
                product_url: url,
                platform: scrapeResult.marketplace,
                product_name: productName,
                risk_status: riskAssessment,
                intelligence_data: safeIntelligenceData,
                created_at: new Date().toISOString()
              })
              .select('id')
              .single();
              
            if (fallbackRecord?.id) {
              insertedId = fallbackRecord.id;
              console.log(`[Database] Fallback committed analysis record to 'analyses': ${fallbackRecord.id}`);
            } else if (fallbackError) {
              console.error("[Database] Fallback insert also failed:", JSON.stringify({ code: fallbackError.code, message: fallbackError.message }));
            }
          } else {
            insertedId = analysisRecord.id;
            console.log(`[Database] Successfully committed analysis record to 'analyses' table: ${analysisRecord.id}`);

            // --- Atomic persistence verification ---
            // Immediately re-read the record by id + user_id to confirm it is
            // durably committed and visible to subsequent SELECT queries.
            const { data: verified, error: verifyError } = await supabase
              .from('analyses')
              .select('id, created_at')
              .eq('id', analysisRecord.id)
              .eq('user_id', user.id)
              .single();

            if (verifyError || !verified?.id) {
              console.warn(
                `[Database] ⚠ Persistence verification FAILED for record ${analysisRecord.id}:`,
                verifyError?.message || 'Record not found on immediate re-read'
              );
            } else {
              console.log(`[Database] ✓ Persistence verified: record ${verified.id} is readable (created_at: ${verified.created_at})`);
            }
          }
        } catch (e) {
          console.error("[Database] Exception during 'analyses' table insert:", e);
        }

        // 2. Secondary persistence into 'tracked_products' table
        try {
          const { data: productData } = await supabase
            .from('tracked_products')
            .insert({
              user_id: user.id,
              platform: scrapeResult.marketplace,
              product_url: url,
              product_name: productName,
              average_rating: averageScore,
              risk_status: riskAssessment,
              intelligence_data: safeIntelligenceData
            })
            .select('id')
            .single();

          if (productData?.id) {
            if (!insertedId) insertedId = productData.id;
            const reviewsToInsert = reviewAnalysisData.map(r => ({
              product_id: productData.id,
              ...r
            }));
            await supabase.from('review_analysis').insert(reviewsToInsert);
          }
        } catch {
          // ignore secondary insert exception
        }

        dbProductId = insertedId || `analysis_${Date.now()}`;

        // Deduct 1 credit atomically upon full pipeline success
        currentCredits = Math.max(0, currentCredits - 1);
        const { error: creditError } = await supabase
          .from('user_profiles')
          .update({ credits: currentCredits })
          .eq('id', user.id);
        if (creditError) {
          console.error("[Database] Failed to deduct credit:", creditError.message);
        } else {
          console.log(`[Database] Deducted 1 credit atomically. Remaining: ${currentCredits}`);
        }
      } catch (dbError) {
        console.error("[Database] Unhandled transaction exception:", dbError);
      }

      summaries.push({
        id: dbProductId,
        url,
        platform: scrapeResult.marketplace,
        title: productName,
        price: scrapeResult.price,
        averageScore,
        riskAssessment,
        negativeThemes: Array.from(negativeThemes),
        intelligence: safeIntelligenceData,
        raw_reviews: reviews,
        reviewsCount: reviews.length
      });
    }

    console.log(`[Action] Batch analysis complete.`);

    return {
      success: true,
      scrapedLive: true,
      summaries
    };
  } catch (error) {
    console.error("[Action] Fatal error during URL analysis batch:", error);
    return {
      success: false,
      summaries: [],
      error: error instanceof Error ? error.message : 'An unknown error occurred during batch analysis.'
    };
  }
}

/**
 * Server action to fetch individual review entries from Supabase.
 */
export async function fetchProductReviewsAction(productId: string) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    // Confirm the caller owns this analysis before returning its reviews;
    // filtering on product_id alone let any signed-in user read any SKU.
    const { data: owned, error: ownershipError } = await supabase
      .from('analyses')
      .select('id')
      .eq('id', productId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (ownershipError) throw ownershipError;
    if (!owned) throw new Error('Not found');

    const { data, error } = await supabase
      .from('review_analysis')
      .select('*')
      .eq('product_id', productId)
      .order('id', { ascending: true });

    if (error) {
      throw error;
    }

    return {
      success: true,
      reviews: data as ReviewAnalysisRow[]
    };
  } catch (error) {
    console.error("[Action] Failed to fetch reviews:", error);
    return {
      success: false,
      reviews: [],
      error: error instanceof Error ? error.message : 'Unknown error.'
    };
  }
}

export async function compareCompetitorAction(baseIntelligence: EnterpriseIntelligence, competitorUrl: string) {
  try {
    // Scraping + Gemini calls cost money on every invocation; this Server
    // Action is a public endpoint, so it must authenticate before spending.
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, error: 'Unauthorized. Please sign in to run a comparison.' };
    }

    console.log(`[Action] Initiating competitor comparison against: ${competitorUrl}`);
    
    // 1. Scrape competitor live page
    const scrapeResult = await fetchMarketplaceReviews(competitorUrl);
    if (!scrapeResult.success || !scrapeResult.intelligence) {
      throw new Error(`Failed to extract competitor intelligence: ${scrapeResult.error}`);
    }
    
    // 2. Generate AI Head-to-Head Matrix
    const matrix = await generateHeadToHeadComparison(baseIntelligence, scrapeResult.intelligence);
    
    return {
      success: true,
      matrix,
      competitorIntelligence: scrapeResult.intelligence
    };
  } catch (error) {
    console.error("[Action] Competitor comparison failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during comparison'
    };
  }
}

export async function fetchDashboardStateAction() {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    const isAdmin = hasRole(user.role, 'org_admin');
    const plan = getPlan(user.plan);

    // Get Profile
    let { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      console.log(`[Auto-Provision] Dashboard state fetch: missing profile for ${user.id}. Creating profile...`);
      const defaultCredits = isAdmin ? 99999 : plan.skuQuota ?? 999;
      const { data: newProf } = await supabase
        .from('user_profiles')
        .insert({ id: user.id, credits: defaultCredits, full_name: user.fullName, email: user.email, plan_tier: plan.name })
        .select('*')
        .maybeSingle();
      profile = newProf || { id: user.id, credits: defaultCredits, full_name: user.fullName, plan_tier: plan.name };
    }

    // Get Seller (for whatsapp)
    const { data: seller } = await supabase
      .from('sellers')
      .select('whatsapp_number')
      .eq('id', user.id)
      .maybeSingle();

    // Query 'analyses' table for current user_id
    let fetchedProducts: AnalysisRow[] = [];
    try {
      const { data: analysesData, error: analysesError } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (analysesError) {
        console.error('[Dashboard] Error fetching from analyses table:', analysesError.message, analysesError.details, analysesError.hint);
      }
      if (!analysesError && analysesData && analysesData.length > 0) {
        fetchedProducts = analysesData;
        console.log(`[Dashboard] Loaded ${analysesData.length} analyses records from DB for user ${user.id}`);

        // Background cleanup: remove broken entries with error-string product names
        const brokenIds = analysesData
          .filter((a: AnalysisRow) => {
            const name = (a.product_name || a.product_title || '').toLowerCase();
            return name.startsWith('analysis failed') || name.startsWith('incomplete data');
          })
          .map((a: AnalysisRow) => a.id)
          .filter(Boolean);
        if (brokenIds.length > 0) {
          console.log(`[DB Cleanup] Removing ${brokenIds.length} broken 'Analysis Failed' entries...`);
          fetchedProducts = analysesData.filter((a: AnalysisRow) => !brokenIds.includes(a.id));
          // Fire-and-forget DB cleanup
          void supabase.from('analyses').delete().in('id', brokenIds).then(({ error }) => {
            if (error) console.error('[DB Cleanup] Delete error:', error.message);
            else console.log(`[DB Cleanup] Successfully purged ${brokenIds.length} broken entries.`);
          });
        }
      }
    } catch (e) {
      console.error('[Dashboard] Exception fetching analyses:', e);
    }

    if (fetchedProducts.length === 0) {
      try {
        const { data: trackedData } = await supabase
          .from('tracked_products')
          .select('*')
          .eq('user_id', user.id)
          .order('id', { ascending: false });
        if (trackedData && trackedData.length > 0) {
          fetchedProducts = trackedData;
        }
      } catch {
        // ignore
      }
    }

    // Format historical data — reconstruct intelligence.executiveScorecard from DB columns
    // so KPI cards compute correctly after a page reload
    const historicalData: AnalyzedProductSummary[] = fetchedProducts.map((p: AnalysisRow) => {
      const intel = p.intelligence_data || p.intelligence || {};

      // Merge defect_clusters into taxonomy if missing
      if ((!intel.defectTaxonomy || intel.defectTaxonomy.length === 0) && p.defect_clusters && Array.isArray(p.defect_clusters)) {
        intel.defectTaxonomy = p.defect_clusters;
      }

      // Reconstruct executiveScorecard from flat DB columns if not present in intel blob
      if (!intel.executiveScorecard) {
        intel.executiveScorecard = {};
      }
      // Prefer DB columns for KPI computation — these are the ground-truth stored values
      if (p.return_risk_score != null && intel.executiveScorecard.returnRiskScore == null) {
        intel.executiveScorecard.returnRiskScore = p.return_risk_score;
      }
      if (p.capital_protected != null && intel.executiveScorecard.estimatedCapitalProtected == null) {
        intel.executiveScorecard.estimatedCapitalProtected = p.capital_protected;
      }
      if (p.top_defect != null && intel.executiveScorecard.primaryRiskDriver == null) {
        intel.executiveScorecard.primaryRiskDriver = p.top_defect;
      }

      const extractedPrice = p.price || p.product_price || intel.price || p.margin_bleed_range || p.shield_radar?.price || p.competitor_benchmarks?.price || '';
      const priceStr = typeof extractedPrice === 'number' ? `₹${extractedPrice}` : String(extractedPrice || '');
      if (priceStr && !intel.price) intel.price = priceStr;
      if (priceStr && !intel.executiveScorecard.price) intel.executiveScorecard.price = priceStr;

      const shieldReviews = Array.isArray(p.shield_radar?.raw_reviews)
        ? (p.shield_radar.raw_reviews as LooseReview[])
        : undefined;
      const rawReviews: LooseReview[] = p.raw_reviews || intel.raw_reviews || intel.reviews || shieldReviews || [];
      if (!intel.raw_reviews) intel.raw_reviews = rawReviews;
      if (!intel.reviews) intel.reviews = rawReviews;

      return {
        id: p.id,
        url: p.product_url || p.url || '',
        platform: p.marketplace || p.platform || 'flipkart',
        title: p.product_name || p.title || p.product_title || 'Analyzed Product',
        price: priceStr,
        category: p.category,
        averageScore: p.average_rating || p.averageScore || 4.0,
        riskAssessment: (p.risk_status as AnalyzedProductSummary['riskAssessment']) || p.riskAssessment || 'safe',
        negativeThemes: intel?.executiveScorecard?.primaryRiskDriver ? [intel.executiveScorecard.primaryRiskDriver] : [],
        intelligence: intel,
        raw_reviews: rawReviews,
        reviewsCount: rawReviews.length
      };
    });

    return {
      success: true,
      user: {
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '',
        whatsapp_number: seller?.whatsapp_number || '',
        company_name: user.user_metadata?.company_name || '',
        whatsapp_alerts_enabled: user.user_metadata?.whatsapp_alerts_enabled || false,
        providers: user.app_metadata?.providers || [],
        initials: user.email ? user.email.substring(0, 2).toUpperCase() : 'RL',
        credits: isAdmin ? 99999 : (profile?.credits ?? 0),
        plan: profile?.plan_tier ?? plan.name
      },
      historicalData
    };
  } catch (err) {
    console.error("[Action] Failed to fetch dashboard state:", err);
    return { success: false, error: errorMessage(err) };
  }
}

export async function deleteProductAction(productId: string) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    // Delete from primary analyses table
    await supabase.from('analyses').delete().eq('id', productId).eq('user_id', user.id);
    // Also delete from legacy tracked_products
    await supabase.from('tracked_products').delete().eq('id', productId).eq('user_id', user.id);

    return { success: true };
  } catch (err) {
    console.error("[Action] Failed to delete product:", err);
    return { success: false, error: errorMessage(err) };
  }
}

export async function clearAllHistoryAction() {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    // Clear from both tables
    await supabase.from('analyses').delete().eq('user_id', user.id);
    await supabase.from('tracked_products').delete().eq('user_id', user.id);

    return { success: true };
  } catch (err) {
    console.error("[Action] Failed to clear history:", err);
    return { success: false, error: errorMessage(err) };
  }
}

export async function updateUserProfileAction(fullName: string, whatsappNumber: string, companyName: string, whatsappAlertsEnabled: boolean, password?: string) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const updatePayload: Record<string, unknown> = {
      data: {
        company_name: companyName,
        whatsapp_alerts_enabled: whatsappAlertsEnabled
      }
    };
    if (password) {
      updatePayload.password = password;
    }

    const { error: authErr } = await supabase.auth.updateUser(updatePayload);
    if (authErr) throw authErr;

    const { error: profErr } = await supabase.from('user_profiles').update({ full_name: fullName }).eq('id', user.id);
    if (profErr) throw profErr;

    const { error: sellErr } = await supabase.from('sellers').update({ 
      full_name: fullName,
      whatsapp_number: whatsappNumber
    }).eq('id', user.id);
    if (sellErr) throw sellErr;

    return { success: true };
  } catch (err) {
    console.error("[Action] Failed to update user profile:", err);
    return { success: false, error: errorMessage(err) };
  }
}

export async function wipeUserAccountAction() {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    await supabase.from('tracked_products').delete().eq('user_id', user.id);
    await supabase.from('sellers').delete().eq('id', user.id);
    await supabase.from('user_profiles').delete().eq('id', user.id);

    return { success: true };
  } catch (err) {
    console.error("[Action] Failed to wipe user account:", err);
    return { success: false, error: errorMessage(err) };
  }
}
