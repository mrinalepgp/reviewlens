"use server";

import { fetchMarketplaceReviews } from "@/lib/scraper";
import { analyzeReviewSentiment } from "@/lib/ai";
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

    console.log(`[Action] Starting batch analysis for ${urls.length} URLs...`);
    const summaries: AnalyzedProductSummary[] = [];

    for (const url of urls) {
      const scrapeResult = await fetchMarketplaceReviews(url);

      if (!scrapeResult.success) {
        throw new Error(`Scraping failed for ${url}: ${scrapeResult.error}`);
      }

      if (!scrapeResult.reviews || !scrapeResult.reviews.length) {
        console.warn(`[Action] No reviews collected for URL: ${url}`);
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

      try {
        const { data: productData, error: productError } = await supabase
          .from('tracked_products')
          .insert({
            seller_id: user.id, // Using the real authenticated user UUID
            platform: scrapeResult.marketplace,
            product_url: url,
            product_name: productName,
            average_rating: averageScore,
            risk_status: riskAssessment
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
        intelligence: scrapeResult.intelligence,
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
