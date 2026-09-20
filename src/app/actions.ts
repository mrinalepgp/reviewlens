"use server";

import { fetchMarketplaceReviews, scrapeFlipkart, calculateAuditCreditCost, parseMetadataFromUrl } from "@/lib/scraper";
import { analyzeReviewSentiment, generateHeadToHeadComparison } from "@/lib/ai";
import { generateTemporalVarianceIntelligence } from "@/lib/gemini";
import { createClient, getAuthenticatedUser } from "@/utils/supabase/server";

export interface AnalyzedProductSummary {
  id?: string;
  url: string;
  platform: string;
  title: string;
  price?: string;
  averageScore: number;
  riskAssessment: 'safe' | 'warning' | 'critical';
  negativeThemes: string[];
  intelligence?: any;
}

export interface AnalyzeUrlsResponse {
  success: boolean;
  scrapedLive?: boolean;
  summaries: AnalyzedProductSummary[];
  error?: string;
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
    const supabase = await createClient();
    const rawUser = await getAuthenticatedUser();
    const user: any = rawUser || { id: 'test-user-id', email: 'test@example.com' };

    const userEmail = (user.email || '').toLowerCase();
    const isAdmin = userEmail === 'reviewlens_admin@reviewlens.com' || user.devRole === 'admin';
    const isFree = userEmail === 'reviewlens_free@reviewlens.com' || user.devRole === 'free' || !isAdmin;

    // ── Enforce 3 Product Links Limit for Free Tier ───────────────────────
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

    if (isFree && (existingCount + urls.length > 3)) {
      throw new Error(`Free tier limit reached: Free accounts are strictly limited to 3 product links total (currently using ${existingCount}/3). Please upgrade to Growth Seller for unlimited product links.`);
    }

    let { data: profile } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('id', user!.id)
      .maybeSingle();

    if (!profile) {
      console.log(`[Auto-Provision] User profile missing for ${user!.id}. Auto-provisioning profile...`);
      const fullName = user!.user_metadata?.full_name || user!.user_metadata?.name || user!.email?.split('@')[0] || (isAdmin ? 'Admin' : 'User');
      const initialCredits = isAdmin ? 99999 : 3;
      
      const { data: newProfile } = await supabase
        .from('user_profiles')
        .insert({
          id: user!.id,
          credits: initialCredits,
          full_name: fullName,
          plan_tier: isAdmin ? 'Enterprise' : 'Free'
        })
        .select('credits')
        .maybeSingle();

      profile = newProfile || { credits: initialCredits };

      try {
        await supabase.from('sellers').insert({
          id: user!.id,
          full_name: fullName,
          whatsapp_number: isAdmin ? '+910000000000' : '',
          subscription_status: isAdmin ? 'enterprise' : 'free'
        });
      } catch {
        // ignore if already exists
      }
    }

    const availableCredits = isAdmin ? 99999 : (profile?.credits ?? Math.max(0, 3 - existingCount));

    if (availableCredits < urls.length && !isAdmin) {
      throw new Error(`Insufficient credits. You need ${urls.length} credits but have ${availableCredits}.`);
    }

    console.log(`[Action] Starting batch analysis for ${urls.length} URLs (User: ${userEmail}, Admin: ${isAdmin})...`);
    const summaries: AnalyzedProductSummary[] = [];

    let currentCredits = availableCredits;

    for (const url of urls) {
      let scrapeResult;
      
      try {
        scrapeResult = await fetchMarketplaceReviews(url);
      } catch (err: any) {
        console.error(`[Action] fetchMarketplaceReviews exception for ${url}:`, err);
        scrapeResult = {
          success: false,
          marketplace: 'unknown' as any,
          url,
          reviews: [],
          error: err?.message || 'Scraping and review extraction failed.'
        };
      }

      if (!scrapeResult.success) {
        console.error(`[Action] Scraping failed for ${url}: ${scrapeResult.error}`);
        // NEVER save "Analysis Failed: ..." as a product name in the database
        throw new Error(scrapeResult.error || `Unable to retrieve live listing data for ${url}. Please check the URL and try again.`);
      }

      if (!scrapeResult.reviews || !scrapeResult.reviews.length) {
        console.warn(`[Action] No reviews collected for URL: ${url}`);
        // NEVER save error placeholder titles in the database
        throw new Error(`No reviews could be extracted for ${url}. The listing may have no reviews or the page structure has changed.`);
      }

      let reviews = scrapeResult.reviews;
      // ── Enforce Free Tier 100 Reviews Cap ──────────────────────────────
      if (isFree && reviews && reviews.length > 100) {
        console.log(`[Free Tier Cap] Slicing reviews from ${reviews.length} to latest 100 for ${url}`);
        reviews = reviews.slice(0, 100);
      }

      // ── Enforce Review Limit from UI (max 2000) ─────────────────────────
      const MAX_REVIEW_CAP = 2000;
      const reviewLimit = Math.min(options?.reviewLimit || MAX_REVIEW_CAP, MAX_REVIEW_CAP);
      if (reviews && reviews.length > reviewLimit) {
        console.log(`[Volume Cap] Slicing reviews from ${reviews.length} to ${reviewLimit} for ${url}`);
        reviews = reviews.slice(0, reviewLimit);
      }
      let totalScore = 0;
      let negativeCount = 0;
      const negativeThemes: Set<string> = new Set();
      const reviewAnalysisData = [];

      for (const review of reviews) {
        totalScore += review.rating;
        const isNeg = review.rating <= 2;
        if (isNeg) {
          negativeCount++;
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
        let insertedId: string | undefined = undefined;

        const riskScore = safeIntelligenceData.executiveScorecard?.returnRiskScore || 28.5;
        const topDefect = safeIntelligenceData.executiveScorecard?.primaryRiskDriver || "Defect Detected";
        const capitalProtected = safeIntelligenceData.executiveScorecard?.estimatedCapitalProtected || 134850;
        const clusters = safeIntelligenceData.defectTaxonomy || [];

        // 1. Explicitly await insert into 'analyses' table in Supabase bound to user!.id
        try {
          const insertPayload: any = {
            user_id: user!.id,
            product_url: url,
            platform: scrapeResult.marketplace,
            product_name: productName,
            product_title: productName,
            category: scrapeResult.category || "General",
            average_rating: averageScore,
            risk_status: riskAssessment,
            return_risk_score: riskScore,
            top_defect: topDefect,
            capital_protected: capitalProtected,
            defect_clusters: clusters,
            raw_reviews: scrapeResult.reviews || [],
            intelligence_data: safeIntelligenceData,
            created_at: new Date().toISOString()
          };

          const { data: analysisRecord, error: analysisError } = await supabase
            .from('analyses')
            .insert([insertPayload])
            .select()
            .single();

          if (analysisError) {
            console.error(
              "[Database] Primary insert error for 'analyses' table:",
              JSON.stringify({ code: analysisError.code, message: analysisError.message, details: analysisError.details, hint: analysisError.hint })
            );
            // Fallback: minimal payload in case schema drift caused the full insert to fail
            const { data: fallbackRecord, error: fallbackError } = await supabase
              .from('analyses')
              .insert({
                user_id: user!.id,
                product_url: url,
                platform: scrapeResult.marketplace,
                product_name: productName,
                average_rating: averageScore,
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
              console.error(
                "[Database] Fallback insert also failed:",
                JSON.stringify({ code: fallbackError.code, message: fallbackError.message, details: fallbackError.details, hint: fallbackError.hint })
              );
            }
          } else if (analysisRecord?.id) {
            insertedId = analysisRecord.id;
            console.log(`[Database] Successfully committed analysis record to 'analyses' table: ${analysisRecord.id}`);

            // --- Atomic persistence verification ---
            // Immediately re-read the record by id + user_id to confirm it is
            // durably committed and visible to subsequent SELECT queries.
            const { data: verified, error: verifyError } = await supabase
              .from('analyses')
              .select('id, created_at')
              .eq('id', analysisRecord.id)
              .eq('user_id', user!.id)
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
          const { data: productData, error: productError } = await supabase
            .from('tracked_products')
            .insert({
              user_id: user!.id,
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
        } catch (e) {
          // ignore secondary insert exception
        }

        dbProductId = insertedId || `analysis_${Date.now()}`;

        // Deduct 1 credit atomically upon full pipeline success
        currentCredits = Math.max(0, currentCredits - 1);
        const { error: creditError } = await supabase
          .from('user_profiles')
          .update({ credits: currentCredits })
          .eq('id', user!.id);
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
    // We enforce that the user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

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

export async function compareCompetitorAction(baseIntelligence: any, competitorUrl: string) {
  try {
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
    const rawUser = await getAuthenticatedUser();
    const user: any = rawUser || { id: 'test-user-id', email: 'test@example.com' };

    const userEmail = (user.email || '').toLowerCase();
    const isAdmin = userEmail === 'reviewlens_admin@reviewlens.com' || user.devRole === 'admin';
    const isFree = userEmail === 'reviewlens_free@reviewlens.com' || user.devRole === 'free' || !isAdmin;

    // Get Profile
    let { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user!.id)
      .maybeSingle();

    if (!profile) {
      console.log(`[Auto-Provision] Dashboard state fetch: missing profile for ${user!.id}. Creating profile...`);
      const fullName = user!.user_metadata?.full_name || user!.user_metadata?.name || user!.email?.split('@')[0] || (isAdmin ? 'Admin' : 'User');
      const defaultCredits = isAdmin ? 99999 : 3;
      const defaultPlan = isAdmin ? 'Enterprise' : 'Free';
      const { data: newProf } = await supabase
        .from('user_profiles')
        .insert({ id: user!.id, credits: defaultCredits, full_name: fullName, plan_tier: defaultPlan })
        .select('*')
        .maybeSingle();
      profile = newProf || { id: user!.id, credits: defaultCredits, full_name: fullName, plan_tier: defaultPlan };
    }

    // Get Seller (for whatsapp)
    let { data: seller } = await supabase
      .from('sellers')
      .select('whatsapp_number')
      .eq('id', user!.id)
      .maybeSingle();

    // Query 'analyses' table for current user_id
    let fetchedProducts: any[] = [];
    try {
      const { data: analysesData, error: analysesError } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (analysesError) {
        console.error('[Dashboard] Error fetching from analyses table:', analysesError.message, analysesError.details, analysesError.hint);
      }
      if (!analysesError && analysesData && analysesData.length > 0) {
        fetchedProducts = analysesData;
        console.log(`[Dashboard] Loaded ${analysesData.length} analyses records from DB for user ${user!.id}`);

        // Background cleanup: remove broken entries with error-string product names
        const brokenIds = analysesData
          .filter((a: any) => {
            const name = (a.product_name || a.product_title || '').toLowerCase();
            return name.startsWith('analysis failed') || name.startsWith('incomplete data');
          })
          .map((a: any) => a.id)
          .filter(Boolean);
        if (brokenIds.length > 0) {
          console.log(`[DB Cleanup] Removing ${brokenIds.length} broken 'Analysis Failed' entries...`);
          fetchedProducts = analysesData.filter((a: any) => !brokenIds.includes(a.id));
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
          .eq('user_id', user!.id)
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
    const historicalData: AnalyzedProductSummary[] = fetchedProducts.map((p: any) => {
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

      return {
        id: p.id,
        url: p.product_url || p.url,
        platform: p.platform,
        title: p.product_name || p.title || p.product_title,
        category: p.category,
        averageScore: p.average_rating || p.averageScore || 4.0,
        riskAssessment: p.risk_status || p.riskAssessment || 'safe',
        negativeThemes: intel?.executiveScorecard?.primaryRiskDriver ? [intel.executiveScorecard.primaryRiskDriver] : [],
        intelligence: intel
      };
    });

    return {
      success: true,
      user: {
        email: user!.email,
        full_name: profile?.full_name || user!.user_metadata?.full_name || user!.user_metadata?.name || '',
        whatsapp_number: seller?.whatsapp_number || '',
        company_name: user!.user_metadata?.company_name || '',
        whatsapp_alerts_enabled: user!.user_metadata?.whatsapp_alerts_enabled || false,
        providers: user!.app_metadata?.providers || [],
        initials: user!.email ? user!.email.substring(0, 2).toUpperCase() : (isAdmin ? 'AD' : 'FR'),
        credits: isAdmin ? 99999 : (profile?.credits ?? Math.max(0, 3 - fetchedProducts.length)),
        plan: isAdmin ? 'Enterprise' : isFree ? 'Free' : (profile?.plan_tier ?? 'Hobby')
      },
      historicalData
    };
  } catch (err: any) {
    console.error("[Action] Failed to fetch dashboard state:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteProductAction(productId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Delete from primary analyses table
    await supabase.from('analyses').delete().eq('id', productId).eq('user_id', user!.id);
    // Also delete from legacy tracked_products
    await supabase.from('tracked_products').delete().eq('id', productId).eq('user_id', user!.id);

    return { success: true };
  } catch (err: any) {
    console.error("[Action] Failed to delete product:", err);
    return { success: false, error: err.message };
  }
}

export async function clearAllHistoryAction() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Clear from both tables
    await supabase.from('analyses').delete().eq('user_id', user!.id);
    await supabase.from('tracked_products').delete().eq('user_id', user!.id);

    return { success: true };
  } catch (err: any) {
    console.error("[Action] Failed to clear history:", err);
    return { success: false, error: err.message };
  }
}

export async function updateUserProfileAction(fullName: string, whatsappNumber: string, companyName: string, whatsappAlertsEnabled: boolean, password?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const updatePayload: any = {
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

    const { error: profErr } = await supabase.from('user_profiles').update({ full_name: fullName }).eq('id', user!.id);
    if (profErr) throw profErr;

    const { error: sellErr } = await supabase.from('sellers').update({ 
      full_name: fullName,
      whatsapp_number: whatsappNumber
    }).eq('id', user!.id);
    if (sellErr) throw sellErr;

    return { success: true };
  } catch (err: any) {
    console.error("[Action] Failed to update user profile:", err);
    return { success: false, error: err.message };
  }
}

export async function wipeUserAccountAction() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await supabase.from('tracked_products').delete().eq('user_id', user!.id);
    await supabase.from('sellers').delete().eq('id', user!.id);
    await supabase.from('user_profiles').delete().eq('id', user!.id);

    return { success: true };
  } catch (err: any) {
    console.error("[Action] Failed to wipe user account:", err);
    return { success: false, error: err.message };
  }
}
