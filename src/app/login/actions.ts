'use server';

import { createClient } from '@supabase/supabase-js';
import { fetchMarketplaceReviews } from '@/lib/scraper';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient as createServerClient } from '@/utils/supabase/server';

interface DevAccountConfig {
  passwords: string[];
  id: string;
  role: 'admin' | 'free';
  plan: string;
  credits: number;
  fullName: string;
}

const HARDCODED_DEV_ACCOUNTS: Record<string, DevAccountConfig> = {
  'reviewlens_admin@reviewlens.com': {
    passwords: ['admin123', 'Admin@12345', 'Admin@ReviewLens2026#'],
    id: '05eb3af6-709c-4304-8223-57fd63dc385f',
    role: 'admin',
    plan: 'Enterprise',
    credits: 99999,
    fullName: 'ReviewLens Administrator'
  },
  'reviewlens_free@reviewlens.com': {
    passwords: ['free123', 'Free@12345', 'FreeUser@2026#'],
    id: '3d09da9c-b1fd-4c46-9e25-300b5b010379',
    role: 'free',
    plan: 'Free',
    credits: 3,
    fullName: 'ReviewLens Free User'
  }
};

export async function login(formData: FormData) {
  const email = (formData.get('email') as string || '').trim().toLowerCase();
  const password = (formData.get('password') as string || '').trim();

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  // ── Developer Bypass for Hardcoded Accounts ──────────────────────────────
  const devAccount = HARDCODED_DEV_ACCOUNTS[email];
  if (devAccount) {
    if (!devAccount.passwords.includes(password)) {
      return { error: 'Invalid password for developer account' };
    }

    console.log(`[Auth Bypass] Developer login for ${email} (role: ${devAccount.role}). Bypassing Supabase confirmation.`);

    // Set secure HTTP-only session cookie
    const cookieStore = await cookies();
    cookieStore.set('reviewlens_dev_session', JSON.stringify({
      id: devAccount.id,
      email,
      role: devAccount.role,
      plan: devAccount.plan,
      credits: devAccount.credits,
      user_metadata: {
        full_name: devAccount.fullName,
        role: devAccount.role,
        plan: devAccount.plan.toLowerCase()
      },
      app_metadata: {
        role: devAccount.role,
        provider: 'email',
        providers: ['email']
      }
    }), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    // Best-effort attempt to provision user_profiles and sellers on Supabase without hitting Auth
    try {
      const supabaseServer = await createServerClient();
      await supabaseServer.from('user_profiles').upsert({
        id: devAccount.id,
        full_name: devAccount.fullName,
        credits: devAccount.credits,
        plan_tier: devAccount.plan
      });
      await supabaseServer.from('sellers').upsert({
        id: devAccount.id,
        full_name: devAccount.fullName,
        whatsapp_number: devAccount.role === 'admin' ? '+910000000000' : '',
        subscription_status: devAccount.role === 'admin' ? 'enterprise' : 'free'
      });
    } catch {
      // Non-blocking for developer bypass
    }

    revalidatePath('/dashboard');
    redirect('/dashboard');
  }

  // ── Standard Supabase Auth Flow ──────────────────────────────────────────
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

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('reviewlens_dev_session');
  try {
    const supabaseServer = await createServerClient();
    await supabaseServer.auth.signOut();
  } catch {
    // ignore
  }
  revalidatePath('/');
  redirect('/login');
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