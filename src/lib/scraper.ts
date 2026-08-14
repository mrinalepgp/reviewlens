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
    const proxyKey = process.env.PROXY_API_KEY;
    const dogKey = process.env.SCRAPINGDOG_API_KEY;
    if (!proxyKey && !dogKey) {
      throw new Error("PROXY_API_KEY or SCRAPINGDOG_API_KEY is missing from environment variables");
    }
    const provider = process.env.PROXY_PROVIDER || (proxyKey ? 'zenrows' : 'scrapingdog');

    // Fetch up to 2 pages for multi-page extraction (Flipkart primarily)
    const maxPages = marketplace === 'flipkart' ? 2 : 1;
    
    const fetchPage = async (page: number) => {
      let pageUrl = url;
      if (marketplace === 'flipkart') {
        const pUrlObj = new URL(url);
        pUrlObj.searchParams.set('page', page.toString());
        pageUrl = pUrlObj.toString();
      }

      console.log(`[Live Scraper] Fetching page ${page} for ${pageUrl}`);
      let html = "";
      let useDirectFetch = false;

      // Universal Proxy Handler
      let proxyUrl = "";
      if (provider === 'scraperapi') {
        proxyUrl = `http://api.scraperapi.com?api_key=${proxyKey}&url=${encodeURIComponent(pageUrl)}&premium=true`;
      } else if (provider === 'zenrows') {
        proxyUrl = `https://api.zenrows.com/v1/?apikey=${proxyKey}&url=${encodeURIComponent(pageUrl)}&premium_proxy=true&wait=0`;
      } else {
        proxyUrl = `https://api.scrapingdog.com/scrape?api_key=${dogKey || proxyKey}&url=${encodeURIComponent(pageUrl)}&dynamic=false`;
      }
      
      try {
        const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
        if (!response.ok) {
          const errorBody = await response.text();
          console.warn(`[Live Scraper] Enterprise proxy error for page ${page}: ${response.status} - ${errorBody}`);
          console.log(`[Live Scraper] Primary proxy returned error/quota limit for page ${page}. Falling back to native direct fetch...`);
          useDirectFetch = true;
        } else {
          html = await response.text();
        }
      } catch (err) {
        console.warn(`[Live Scraper] Proxy request failed for page ${page}:`, err);
        useDirectFetch = true;
      }

      if (useDirectFetch) {
        console.log(`[Live Scraper] Executing direct fetch for page ${page}...`);
        try {
          const directResponse = await fetch(pageUrl, {
            signal: AbortSignal.timeout(12000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            }
          });
          if (!directResponse.ok) {
            if (directResponse.status === 403 || directResponse.status === 503) {
              throw new Error("Marketplace anti-bot protection triggered. Please retry or update scraping proxies.");
            }
            if (page === 1) throw new Error(`Direct fetch failed on page 1: ${directResponse.status}`);
            return "";
          }
          html = await directResponse.text();
          
          // Also check if Cloudflare challenge page is returned with a 200 OK
          if (html.includes("cf-browser-verification") || html.includes("cloudflare-nginx") || html.includes("Just a moment...")) {
            throw new Error("Marketplace anti-bot protection triggered. Please retry or update scraping proxies.");
          }
        } catch (directErr: any) {
          if (page === 1) throw directErr;
          return ""; // Skip on subsequent pages if direct fetch fails
        }
      }

      const $ = cheerio.load(html);

      // Strip script tags and styles to extract pure visible text layout strings
      $('script, style, nav, footer, header').remove();
      const pageText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000);
      
      return `\n--- PAGE ${page} ---\n` + pageText;
    };
    
    const pagePromises = [];
    for (let page = 1; page <= maxPages; page++) {
      pagePromises.push(fetchPage(page));
    }
    
    let combinedRawText = "";
    try {
      const pageResults = await Promise.all(pagePromises);
      combinedRawText = pageResults.join('');
    } catch (err: any) {
      if (err.message && err.message.includes("anti-bot protection")) {
        return { success: false, marketplace, url, reviews: [], error: err.message };
      }
      throw err;
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

    const maxRetries = 3;
    let attempt = 0;
    let aiRes;
    let lastErrorText = "";

    while (attempt <= maxRetries) {
      aiRes = await fetch(aiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiPrompt)
      });
      
      if (!aiRes.ok) {
        lastErrorText = await aiRes.text();
        if (aiRes.status === 429 || aiRes.status === 503) {
          console.warn(`[Live Scraper] Gemini API returned ${aiRes.status} on attempt ${attempt + 1}: ${lastErrorText}`);
          if (attempt === maxRetries) {
            return { success: false, marketplace, url, reviews: [], error: 'AI model service is under high demand. Automatically retrying...' };
          }
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[Live Scraper] Retrying in ${delay}ms...`);
          await new Promise(res => setTimeout(res, delay));
          attempt++;
          continue;
        } else {
          throw new Error(`AI Extraction failed: ${aiRes.status} ${lastErrorText}`);
        }
      }
      break; // Success
    }

    if (!aiRes || !aiRes.ok) {
       return { success: false, marketplace, url, reviews: [], error: 'AI model service is under high demand. Automatically retrying...' };
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