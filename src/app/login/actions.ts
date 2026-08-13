'use server';

import { createClient } from '@supabase/supabase-js';
import { fetchMarketplaceReviews } from '@/lib/scraper';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient as createServerClient } from '@/utils/supabase/server';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const supabaseServer = await createServerClient();

  const { error } = await supabaseServer.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}


// Initialize the Supabase production client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function analyzeProductPipeline(url: string) {
  if (!url) return { success: false, error: "URL is required" };

  try {
    console.log(`[Pipeline Control] Processing request for URL: ${url}`);

    // 1. Check if the product already exists in Supabase
    const { data: existingProduct, error: prodFindError } = await supabase
      .from('products')
      .select('id, marketplace')
      .eq('url', url)
      .single();

    if (existingProduct) {
      console.log(`[Pipeline Cache Hit] Product found in database. Fetching cached reviews...`);

      const { data: cachedReviews, error: revFetchError } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', existingProduct.id);

      if (!revFetchError && cachedReviews && cachedReviews.length > 0) {
        return {
          success: true,
          marketplace: existingProduct.marketplace,
          url,
          reviews: cachedReviews.map(r => ({
            id: r.id,
            marketplace: existingProduct.marketplace,
            rating: r.rating,
            content: r.content,
            author: r.author,
            date: r.scraped_at
          }))
        };
      }
    }

    // 2. Cache Miss: Execute live web scraping & semantic AI engine
    const scrapingResult = await fetchMarketplaceReviews(url);
    if (!scrapingResult.success || scrapingResult.reviews.length === 0) {
      return { success: false, error: scrapingResult.error || "Failed to extract product data." };
    }

    // 3. Save the newly scraped Product core record to Supabase
    const { data: newProduct, error: prodInsertError } = await supabase
      .from('products')
      .insert([{ url, marketplace: scrapingResult.marketplace }])
      .select('id')
      .single();

    if (prodInsertError || !newProduct) {
      throw new Error(`Database error saving product header: ${prodInsertError?.message}`);
    }

    // 4. Map and batch insert the analyzed reviews into Supabase
    const reviewsToInsert = scrapingResult.reviews.map(rev => {
      // Use Gemini extracted sentiment if available, otherwise fallback to rating logic
      let sentiment = rev.sentiment && rev.sentiment !== 'NEUTRAL' ? rev.sentiment : 'NEUTRAL';
      if (!rev.sentiment || rev.sentiment === 'NEUTRAL') {
        if (rev.rating >= 4) sentiment = 'POSITIVE';
        else if (rev.rating <= 2) sentiment = 'NEGATIVE';
      }

      // Automatically isolate simple contextual issue tags
      let issueTag = null;
      if (rev.content.toLowerCase().includes('battery')) issueTag = 'Battery Life';
      else if (rev.content.toLowerCase().includes('crease') || rev.content.toLowerCase().includes('screen')) issueTag = 'Screen Crease';
      else if (rev.content.toLowerCase().includes('heating') || rev.content.toLowerCase().includes('warm')) issueTag = 'Thermal Management';

      return {
        product_id: newProduct.id,
        author: rev.author || 'Verified Buyer',
        rating: rev.rating,
        content: rev.content,
        sentiment: sentiment,
        issue_tag: issueTag
      };
    });

    const { error: revInsertError } = await supabase
      .from('reviews')
      .insert(reviewsToInsert);

    if (revInsertError) {
      console.error(`[Pipeline Warning] Failed to cache reviews in DB:`, revInsertError.message);
    }

    console.log(`[Pipeline Control] Process complete. Saved product header and ${reviewsToInsert.length} data rows.`);
    return {
      success: true,
      marketplace: scrapingResult.marketplace,
      url,
      reviews: scrapingResult.reviews
    };

  } catch (error: any) {
    console.error(`[Pipeline Fatal Exception]:`, error);
    return { success: false, error: error.message || "Internal server pipeline failure." };
  }
}