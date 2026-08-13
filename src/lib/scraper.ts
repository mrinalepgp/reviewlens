import * as cheerio from 'cheerio';

export type Marketplace = 'meesho' | 'flipkart' | 'amazon' | 'facebook' | 'zomato' | 'swiggy' | 'unknown';

export interface ReviewPayload {
  id: string;
  marketplace: Marketplace;
  rating: number;
  title?: string;
  content: string;
  author: string;
  date: string;
  sentiment?: string;
}

export interface ScrapingResult {
  success: boolean;
  marketplace: Marketplace;
  url: string;
  reviews: ReviewPayload[];
  error?: string;
}

export function sanitizeUrl(url: string, marketplace: Marketplace): string {
  try {
    const urlObj = new URL(url);
    if (marketplace === 'flipkart') {
      const pid = urlObj.searchParams.get('pid');
      urlObj.search = '';
      if (pid) urlObj.searchParams.set('pid', pid);
      
      // Transform /p/itm to /product-reviews/itm
      if (urlObj.pathname.includes('/p/itm')) {
        urlObj.pathname = urlObj.pathname.replace('/p/itm', '/product-reviews/itm');
      }
      return urlObj.toString();
    } else if (marketplace === 'meesho') {
      urlObj.search = '';
      return urlObj.toString();
    }
  } catch (e) {
    // ignore valid URL parsing errors
  }
  return url;
}

export async function fetchMarketplaceReviews(url: string): Promise<ScrapingResult> {
  console.log(`[Live Scraper] Requesting live page source data for URL: ${url}`);

  let marketplace: Marketplace = 'unknown';
  if (/meesho\.com/i.test(url)) marketplace = 'meesho';
  else if (/flipkart\.com/i.test(url)) marketplace = 'flipkart';
  else if (/amazon\.(in|com)/i.test(url)) marketplace = 'amazon';
  else if (/facebook\.com/i.test(url)) marketplace = 'facebook';
  else if (/zomato\.com/i.test(url)) marketplace = 'zomato';
  else if (/swiggy\.com/i.test(url)) marketplace = 'swiggy';

  url = sanitizeUrl(url, marketplace);


  if (marketplace === 'unknown') {
    return { success: false, marketplace: 'unknown', url, reviews: [], error: 'Unsupported platform link.' };
  }

  try {
    const apiKey = process.env.SCRAPINGDOG_API_KEY;
    if (!apiKey) {
      throw new Error("SCRAPINGDOG_API_KEY is missing from environment variables");
    }

    let combinedRawText = "";
    
    // Fetch up to 3 pages for multi-page extraction (Flipkart primarily)
    const maxPages = marketplace === 'flipkart' ? 3 : 1;
    let useDirectFetch = false;
    
    for (let page = 1; page <= maxPages; page++) {
      let pageUrl = url;
      if (marketplace === 'flipkart') {
        const pUrlObj = new URL(url);
        pUrlObj.searchParams.set('page', page.toString());
        pageUrl = pUrlObj.toString();
      }

      console.log(`[Live Scraper] Fetching page ${page} for ${pageUrl}`);
      let html = "";

      if (!useDirectFetch) {
        const scrapingdogUrl = `https://api.scrapingdog.com/scrape?api_key=${apiKey}&url=${encodeURIComponent(pageUrl)}&dynamic=true`;
        const response = await fetch(scrapingdogUrl);
        
        if (!response.ok) {
          const errorBody = await response.text();
          console.warn(`[Live Scraper] Gateway response error for page ${page}: ${response.status} - ${errorBody}`);
          if (response.status === 403) {
            console.log("[Live Scraper] Quota hit (403). Falling back to direct node fetch...");
            useDirectFetch = true;
          } else {
            if (page === 1) throw new Error(`Gateway response error on page 1: ${response.status} - ${errorBody}`);
            break; // Stop fetching further pages if we hit an error but page 1 worked
          }
        } else {
          html = await response.text();
        }
      }

      if (useDirectFetch) {
        console.log(`[Live Scraper] Executing direct fetch for page ${page}...`);
        const directResponse = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          }
        });
        if (!directResponse.ok) {
          if (page === 1) throw new Error(`Direct fetch failed on page 1: ${directResponse.status}`);
          break;
        }
        html = await directResponse.text();
      }

      const $ = cheerio.load(html);

      // Strip script tags and styles to extract pure visible text layout strings
      $('script, style, nav, footer, header').remove();
      const pageText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000);
      
      combinedRawText += `\n--- PAGE ${page} ---\n` + pageText;
    }

    console.log(`[Live Scraper] Page content text optimized. Sending structural mapping request to AI engine...`);
    const cleanPageText = combinedRawText.slice(0, 12000);

    // Let Gemini locate and cleanly separate the reviews from the raw text layout
    const geminiKey = process.env.GEMINI_API_KEY;
    const aiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

    const aiPrompt = {
      contents: [{
        parts: [{
          text: `You are an expert data extraction engine. Analyze this raw text from a ${marketplace} product page (or multiple pages) and extract as many real user product reviews as you can find (aim for 30-50). Ignore UI buttons, category lists, ads, and system links.
          
          Return raw JSON array ONLY matching this exact interface format:
          [{ "rating": number, "title": "string", "content": "string", "author": "string", "date": "string", "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL" }]
          
          Raw Page Text:
          ${cleanPageText}`
        }]
      }],
      generationConfig: { responseMimeType: "application/json" }
    };

    const aiRes = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aiPrompt)
    });
    
    if (!aiRes.ok) {
        const errorText = await aiRes.text();
        throw new Error(`AI Extraction failed: ${aiRes.status} ${errorText}`);
    }

    const aiData = await aiRes.json();
    const jsonText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    let parsedReviews: any[] = [];
    try {
        parsedReviews = JSON.parse(jsonText);
    } catch (e) {
        throw new Error(`Failed to parse JSON from AI: ${jsonText}`);
    }

    const extractedReviews: ReviewPayload[] = parsedReviews.map((rev: any, idx: number) => ({
      id: `ai_ext_${Date.now()}_${idx}`,
      marketplace,
      rating: Number(rev.rating) || 5,
      title: rev.title || '',
      content: rev.content || 'No text provided',
      author: rev.author || 'Verified Buyer',
      date: rev.date || new Date().toISOString(),
      sentiment: rev.sentiment || 'NEUTRAL'
    }));

    return { success: true, marketplace, url, reviews: extractedReviews };

  } catch (error: any) {
    console.error(`[Live Scraper] Execution Exception:`, error);
    return { success: false, marketplace, url, reviews: [], error: `Scraping/Extraction failed: ${error.message}` };
  }
}