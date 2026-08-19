"use server";

import { fetchMarketplaceReviews } from "@/lib/scraper";
import { analyzeReviewSentiment, generateHeadToHeadComparison } from "@/lib/ai";
import { createClient } from "@/utils/supabase/server";

export interface AnalyzedProductSummary {
  id?: string;
  url: string;
  platform: string;
  title: string;
  averageScore: number;
  riskAssessment: 'safe' | 'warning' | 'critical';
  negativeThemes: string[];
  intelligence?: any;
}

export interface AnalyzeUrlsResponse {
  success: boolean;
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
export async function analyzeUrlsAction(urls: string[]): Promise<AnalyzeUrlsResponse> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Unauthorized. Please log in to run analyses.");
    }

    let { data: profile } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      console.log(`[Auto-Provision] User profile missing for ${user.id}. Auto-provisioning profile with 50 credits...`);
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
      
      const { data: newProfile } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          credits: 50,
          full_name: fullName
        })
        .select('credits')
        .maybeSingle();

      profile = newProfile || { credits: 50 };

      // Ensure seller record also exists
      try {
        await supabase.from('sellers').insert({
          id: user.id,
          full_name: fullName,
          whatsapp_number: '',
          subscription_status: 'free'
        });
      } catch {
        // ignore if already exists
      }
    }

    const availableCredits = profile?.credits ?? 50;

    if (availableCredits < urls.length) {
      throw new Error(`Insufficient credits. You need ${urls.length} credits but have ${availableCredits}.`);
    }

    console.log(`[Action] Starting batch analysis for ${urls.length} URLs...`);
    const summaries: AnalyzedProductSummary[] = [];

    let currentCredits = availableCredits;

    for (const url of urls) {
      const scrapeResult = await fetchMarketplaceReviews(url);

      if (!scrapeResult.success) {
        console.error(`[Action] Scraping failed for ${url}: ${scrapeResult.error}`);
        summaries.push({
          url,
          platform: scrapeResult.marketplace || 'unknown',
          title: `Analysis Failed: ${scrapeResult.error}`,
          averageScore: 0,
          riskAssessment: 'safe',
          negativeThemes: ['Pipeline Error'],
        });
        continue;
      }

      if (!scrapeResult.reviews || !scrapeResult.reviews.length) {
        console.warn(`[Action] No reviews collected for URL: ${url}`);
        summaries.push({
          url,
          platform: scrapeResult.marketplace || 'unknown',
          title: `Incomplete Data: No Reviews Found`,
          averageScore: 0,
          riskAssessment: 'safe',
          negativeThemes: ['Insufficient Data'],
        });
        continue;
      }

      const reviews = scrapeResult.reviews;
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
      const intelRiskScore = scrapeResult.intelligence?.executiveScorecard?.returnRiskScore ?? 35;
      
      let riskAssessment: 'safe' | 'warning' | 'critical' = 'safe';
      if (intelRiskScore >= 65) {
        riskAssessment = 'critical';
      } else if (intelRiskScore >= 35) {
        riskAssessment = 'warning';
      }
      
      const productName = `Product Snapshot (${scrapeResult.marketplace})`;
      let dbProductId = undefined;
      
      const safeIntelligenceData = {
        executiveScorecard: scrapeResult.intelligence?.executiveScorecard || {
          returnRiskScore: riskAssessment === 'critical' ? 85 : riskAssessment === 'warning' ? 55 : 10,
          listingHealthScore: riskAssessment === 'critical' ? 20 : riskAssessment === 'warning' ? 60 : 90,
          estimatedMarginLossRange: riskAssessment === 'critical' ? "20% - 30%" : "5% - 10%",
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
      };

      try {
        const { data: productData, error: productError } = await supabase
          .from('tracked_products')
          .insert({
            user_id: user.id, // Using the real authenticated user UUID
            platform: scrapeResult.marketplace,
            product_url: url,
            product_name: productName,
            average_rating: averageScore,
            risk_status: riskAssessment,
            intelligence_data: safeIntelligenceData
          })
          .select('id')
          .single();
          
        if (productError) {
          console.error("[Database] Failed to insert tracked_product metadata:", productError.message);
        } else if (productData?.id) {
          dbProductId = productData.id;
          const reviewsToInsert = reviewAnalysisData.map(r => ({
            product_id: productData.id,
            ...r
          }));
          
          const { error: reviewsError } = await supabase
            .from('review_analysis')
            .insert(reviewsToInsert);
            
          if (reviewsError) {
            console.error("[Database] Failed to batch insert review_analysis records:", reviewsError.message);
          } else {
            console.log(`[Database] Successfully committed product metadata and ${reviewsToInsert.length} analysis records.`);
            
            // Deduct 1 credit for successful analysis
            currentCredits -= 1;
            const { error: creditError } = await supabase
              .from('user_profiles')
              .update({ credits: currentCredits })
              .eq('id', user.id);
            if (creditError) {
               console.error("[Database] Failed to deduct credit:", creditError.message);
            } else {
               console.log(`[Database] Deducted 1 credit. Remaining: ${currentCredits}`);
            }
          }
        }
      } catch (dbError) {
        console.error("[Database] Unhandled transaction exception:", dbError);
      }

      summaries.push({
        id: dbProductId,
        url,
        platform: scrapeResult.marketplace,
        title: productName,
        averageScore,
        riskAssessment,
        negativeThemes: Array.from(negativeThemes),
        intelligence: safeIntelligenceData,
      });
    }

    console.log(`[Action] Batch analysis complete.`);

    return {
      success: true,
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Get Profile
    let { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      console.log(`[Auto-Provision] Dashboard state fetch: missing profile for ${user.id}. Creating default profile...`);
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
      const { data: newProf } = await supabase
        .from('user_profiles')
        .insert({ id: user.id, credits: 50, full_name: fullName })
        .select('*')
        .maybeSingle();
      profile = newProf || { id: user.id, credits: 50, full_name: fullName, plan_tier: 'Hobby' };
    }

    // Get Seller (for whatsapp)
    let { data: seller } = await supabase
      .from('sellers')
      .select('whatsapp_number')
      .eq('id', user.id)
      .maybeSingle();

    // Get historical data
    const { data: products } = await supabase
      .from('tracked_products')
      .select('*')
      .eq('user_id', user.id)
      .order('id', { ascending: false });

    // Format historical data
    const historicalData: AnalyzedProductSummary[] = (products || []).map((p: any) => ({
      id: p.id,
      url: p.product_url,
      platform: p.platform,
      title: p.product_name,
      averageScore: p.average_rating,
      riskAssessment: p.risk_status,
      negativeThemes: p.intelligence_data?.executiveScorecard?.primaryRiskDriver ? [p.intelligence_data.executiveScorecard.primaryRiskDriver] : [],
      intelligence: p.intelligence_data
    }));

    return {
      success: true,
      user: {
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '',
        whatsapp_number: seller?.whatsapp_number || '',
        company_name: user.user_metadata?.company_name || '',
        whatsapp_alerts_enabled: user.user_metadata?.whatsapp_alerts_enabled || false,
        providers: user.app_metadata?.providers || [],
        initials: user.email ? user.email.substring(0, 2).toUpperCase() : 'US',
        credits: profile?.credits ?? 50,
        plan: profile?.plan_tier ?? 'Hobby'
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

    const { error } = await supabase
      .from('tracked_products')
      .delete()
      .eq('id', productId)
      .eq('user_id', user.id);

    if (error) throw error;
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

    const { error } = await supabase
      .from('tracked_products')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
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

    const { error: profErr } = await supabase.from('user_profiles').update({ full_name: fullName }).eq('id', user.id);
    if (profErr) throw profErr;

    const { error: sellErr } = await supabase.from('sellers').update({ 
      full_name: fullName,
      whatsapp_number: whatsappNumber
    }).eq('id', user.id);
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

    await supabase.from('tracked_products').delete().eq('user_id', user.id);
    await supabase.from('sellers').delete().eq('id', user.id);
    await supabase.from('user_profiles').delete().eq('id', user.id);

    return { success: true };
  } catch (err: any) {
    console.error("[Action] Failed to wipe user account:", err);
    return { success: false, error: err.message };
  }
}
