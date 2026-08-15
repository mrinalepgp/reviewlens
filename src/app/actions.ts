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

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Unable to fetch user profile or credits.");
    }

    if (profile.credits < urls.length) {
      throw new Error(`Insufficient credits. You need ${urls.length} credits but have ${profile.credits}.`);
    }

    console.log(`[Action] Starting batch analysis for ${urls.length} URLs...`);
    const summaries: AnalyzedProductSummary[] = [];

    let currentCredits = profile.credits;

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
        const aiAnalysis = await analyzeReviewSentiment(review.content);
        
        if (aiAnalysis.sentiment === 'negative') {
          negativeCount++;
          if (aiAnalysis.detected_issue !== 'none' && aiAnalysis.detected_issue !== 'analysis_error') {
            negativeThemes.add(aiAnalysis.detected_issue);
          }
        }

        reviewAnalysisData.push({
          review_text: review.content,
          star_rating: review.rating,
          ai_sentiment: aiAnalysis.sentiment,
          ai_extracted_issue: aiAnalysis.detected_issue
        });
      }

      const averageScore = Number((totalScore / reviews.length).toFixed(1));
      const negativeRatio = negativeCount / reviews.length;
      let riskAssessment: 'safe' | 'warning' | 'critical' = 'safe';
      
      if (negativeRatio >= 0.5 || averageScore <= 2.5) {
        riskAssessment = 'critical';
      } else if (negativeRatio >= 0.2 || averageScore <= 3.8) {
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
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Get Seller (for whatsapp)
    const { data: seller } = await supabase
      .from('sellers')
      .select('whatsapp_number')
      .eq('id', user.id)
      .single();

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
        full_name: profile?.full_name || '',
        whatsapp_number: seller?.whatsapp_number || '',
        initials: user.email ? user.email.substring(0, 2).toUpperCase() : 'US',
        credits: profile?.credits ?? 0,
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

export async function updateUserProfileAction(fullName: string, whatsappNumber: string, password?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    if (password) {
      const { error: passErr } = await supabase.auth.updateUser({ password });
      if (passErr) throw passErr;
    }

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
