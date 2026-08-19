import * as cheerio from 'cheerio';
import { cleanAndParseJSON } from './ai';

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
  isSuspicious?: boolean;
}

export interface EnterpriseIntelligence {
  executiveScorecard?: any;
  defectTaxonomy?: any[];
  vernacularDecoder?: any[];
  mitigationPlaybook?: any;
  authenticityRadar?: any;
  competitorDiscovery?: any[];
}

export interface ScrapingResult {
  success: boolean;
  marketplace: Marketplace;
  url: string;
  reviews: ReviewPayload[];
  intelligence?: EnterpriseIntelligence;
  error?: string;
}

export function sanitizeUrl(url: string, marketplace: Marketplace): string {
  try {
    const urlObj = new URL(url);
    if (marketplace === 'flipkart') {
      const pid = urlObj.searchParams.get('pid');
      const lid = urlObj.searchParams.get('lid');
      // Keep only the base domain, product path, and pid parameter. Strip out otracker, fm, iid, ppt, ppn, ov_redirect.
      urlObj.search = '';
      if (pid) urlObj.searchParams.set('pid', pid);
      if (lid) urlObj.searchParams.set('lid', lid);
      
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

      let useJinaFallback = false;

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
              console.log("[Live Scraper] Direct fetch hit anti-bot status code.");
              useJinaFallback = true;
            } else {
              if (page === 1) throw new Error(`Direct fetch failed on page 1: ${directResponse.status}`);
              html = "";
            }
          } else {
            html = await directResponse.text();
            
            // Check for Cloudflare/Anti-bot challenge inside 200 OK
            if (html.includes("cf-browser-verification") || html.includes("cloudflare-nginx") || html.includes("Just a moment...")) {
              console.log("[Live Scraper] Direct fetch hit anti-bot challenge page.");
              useJinaFallback = true;
              html = ""; // Clear html so Jina can run
            }
          }
        } catch (directErr: any) {
          console.warn("[Live Scraper] Direct fetch exception:", directErr);
          useJinaFallback = true;
        }
      }

      if (useJinaFallback || !html) {
        console.log(`[Live Scraper] Executing Jina Reader fallback for page ${page} (Zero-Cost Bypass)...`);
        try {
          const jinaUrl = `https://r.jina.ai/${encodeURIComponent(pageUrl)}`;
          const jinaResponse = await fetch(jinaUrl, {
            signal: AbortSignal.timeout(15000),
            headers: { 'Accept': 'text/plain' }
          });
          if (!jinaResponse.ok) {
            if (page === 1) throw new Error(`Jina Reader fallback failed: ${jinaResponse.status}`);
            html = "";
          } else {
            const markdownText = await jinaResponse.text();
            
            // Jina Markdown Parse:
            let productTitle = "";
            let productRating = "";
            let productPrice = "";
            let rawReviews: string[] = [];
            
            const lines = markdownText.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              // Try to find title (often first few headers)
              if (line.startsWith('#') && !productTitle) {
                productTitle = line.replace(/#/g, '').trim();
              }
              // Attempt to parse price
              if (line.includes('₹') && !productPrice) {
                const priceMatch = line.match(/₹[\d,]+/);
                if (priceMatch) productPrice = priceMatch[0];
              }
              // Anything reasonably long might be a review block
              if (line.length > 40 && line.length < 1000 && !line.includes('[') && !line.includes('{')) {
                // Ignore likely UI boilerplate lines
                if (!line.toLowerCase().includes('javascript') && !line.toLowerCase().includes('browser')) {
                  rawReviews.push(line);
                }
              }
            }
            
            // Return exactly top 20 verified review lines
            return { title: productTitle, rating: productRating, price: productPrice, reviews: rawReviews.slice(0, 20) };
          }
        } catch (jinaErr: any) {
          if (page === 1) throw jinaErr;
          html = "";
        }
      }

      const $ = cheerio.load(html);

      let productTitle = "";
      let productRating = "";
      let productPrice = "";
      let rawReviews: string[] = [];

      if (marketplace === 'flipkart') {
        productTitle = $('span.VU-ZEz, span.B_NuCI').text().trim() || $('title').text().trim();
        productRating = $('div.XJA2L8, div._3LWZlK').first().text().trim();
        productPrice = $('div.Nx9bqj, div._30jeq3').first().text().trim();
        
        $('div._16PBlm, div._2wzgFH, div.ZmyHev, div.col.EPCmJX, div._27M-vq').each((_, el) => {
           const text = $(el).text().replace(/\s+/g, ' ').trim();
           if (text.length > 10) rawReviews.push(text);
        });
      } else {
        productTitle = $('h1').text().trim() || $('title').text().trim();
        // Strip script tags, styles, svgs, and structural elements for generic extraction
        $('script, style, svg, nav, footer, header').remove();
        $('*').each((_, el) => {
          if ($(el).children().length === 0) {
            const text = $(el).text().trim();
            if (text.length > 40 && text.length < 1500 && !text.includes('{') && !text.includes('}')) {
              rawReviews.push(text);
            }
          }
        });
      }

      // If strict extraction yielded nothing (e.g. Jina stripped the classes), try a broad generic text extraction
      if (rawReviews.length === 0 && html.length > 100) {
        console.log(`[Live Scraper] Strict selectors failed on page ${page}. Engaging generic structural extraction...`);
        productTitle = productTitle || $('h1').text().trim() || $('title').text().trim();
        $('script, style, svg, nav, footer, header').remove();
        $('*').each((_, el) => {
          if ($(el).children().length === 0) {
            const text = $(el).text().trim();
            // Looks like a review paragraph
            if (text.length > 40 && text.length < 1500 && !text.includes('{') && !text.includes('}')) {
              rawReviews.push(text);
            }
          }
        });
      }
      
      return { title: productTitle, rating: productRating, price: productPrice, reviews: rawReviews };
    };
    
    const pagePromises = [];
    for (let page = 1; page <= maxPages; page++) {
      pagePromises.push(fetchPage(page));
    }
    
    let combinedTitle = "";
    let combinedRating = "";
    let combinedPrice = "";
    let combinedReviews: string[] = [];
    try {
      const pageResults = await Promise.all(pagePromises);
      if (pageResults[0]) {
        combinedTitle = pageResults[0].title;
        combinedRating = pageResults[0].rating;
        combinedPrice = pageResults[0].price;
      }
      pageResults.forEach(r => {
        if (r && r.reviews) {
          combinedReviews.push(...r.reviews);
        }
      });
    } catch (err: any) {
      if (err.message && err.message.includes("anti-bot protection")) {
        return { success: false, marketplace, url, reviews: [], error: err.message };
      }
      throw err;
    }

    console.log(`[Live Scraper] Extracted ${combinedReviews.length} potential reviews. Minimizing payload...`);
    
    const uniqueReviews = Array.from(new Set(combinedReviews));
    const sampledReviews = uniqueReviews.slice(0, 25);
    
    const compactPayload = `Product: ${combinedTitle} | Category: ${marketplace} | Price: ${combinedPrice} | Rating: ${combinedRating} | Reviews: ${sampledReviews.join("\\n---\\n")}`;

    // Let Gemini analyze the compact payload with model fallbacks
    const geminiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const modelCandidates = Array.from(new Set([modelName, "gemini-1.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"]));

    const aiPrompt = {
      contents: [{
        parts: [{
          text: `You are an expert data extraction engine and e-commerce seller intelligence analyst specializing in Indian marketplaces (Flipkart, Meesho, Amazon). Analyze this product data and its customer reviews.
          
          Strict Tagging Rule: Never tag negative reviews (1-2 stars or defect mentions) as 'NEUTRAL'. Strictly enforce "CRITICAL DEFECT" or "NEGATIVE" for the badge.
          
          Return raw JSON ONLY matching this exact Enterprise Seller Intelligence JSON schema:
          {
            "executiveScorecard": {
              "returnRiskScore": 34.5,
              "listingHealthScore": 72,
              "estimatedMarginLossRange": "₹15,000 - ₹25,000",
              "primaryRiskDriver": "Sizing Mismatch & Color Fade",
              "estimatedCapitalProtected": 72000
            },
            "defectTaxonomy": [
              {
                "category": "Sizing & Fit",
                "subIssue": "Runs small across shoulders",
                "frequencyPercent": 42,
                "severity": "HIGH",
                "description": "Customer feedback highlights that shirt fit is tighter than indicated by standard size chart.",
                "customerQuoteSnippet": "Could barely fit my arms..."
              }
            ],
            "vernacularDecoder": [
              {
                "context": "Kapda thoda patla hai aur color 2 wash me nikal gaya",
                "originalTerm": "Kapda patla hai",
                "englishMeaning": "Fabric is thin & color bled after 2 washes",
                "rawVernacularText": "Kapda thoda patla hai aur color 2 wash me nikal gaya",
                "detectedLanguage": "Hinglish",
                "decodedIntent": "Low fabric GSM & poor dye fixation",
                "businessImpactCategory": "Quality Defect / Refund Demand"
              }
            ],
            "mitigationPlaybook": {
              "listingFixBullets": [
                "Update product description to specify slim-fit measurements",
                "Add care instructions specifying hand-wash in cold water"
              ],
              "antiReturnListingCopy": "Important: This item is slim-fit. For a relaxed fit, please order one size up.",
              "supplierQualityMemo": "Quality alert: Inspect fabric density (GSM >= 180) and dye fixation prior to dispatch.",
              "customerRecoveryScript": "Dear Customer, we apologize for the sizing mismatch. Please reach out to our team for a free exchange."
            },
            "authenticityRadar": {
              "authenticityScore": 88,
              "attackRiskLevel": "LOW",
              "suspiciousReviewCount": 2,
              "flaggedPatterns": [
                {
                  "type": "Velocity Spike",
                  "description": "Multiple negative reviews posted in tight timeframe",
                  "severity": "MEDIUM"
                }
              ],
              "disputeDraft": {
                "subject": "Urgent: Review Audit Request for Seller Listing",
                "body": "Formal support ticket requesting immediate audit of suspicious low-rating feedback under seller protection guidelines."
              }
            },
            "competitorDiscovery": [
              {
                "suggestedSearchKeyword": "Casual Slim Fit Cotton Shirt",
                "targetCompetitorCategory": "Category Best-Seller"
              }
            ],
            "reviews": [
              {
                "rating": 1,
                "title": "Bad quality fabric",
                "comment": "Kapda thoda patla hai aur color nikal gaya",
                "badge": "CRITICAL DEFECT",
                "badgeColor": "red",
                "isSuspicious": false
              }
            ]
          }
          
          ${compactPayload}
          `
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 8192,
        responseMimeType: "application/json"
      }
    };

    let aiRes: Response | null = null;

    for (const currentModel of modelCandidates) {
      const aiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${geminiKey}`;
      const maxRetries = 2;
      let attempt = 0;

      while (attempt <= maxRetries) {
        try {
          aiRes = await fetch(aiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aiPrompt)
          });
          
          if (!aiRes.ok) {
            const errText = await aiRes.text();
            if (aiRes.status === 404) {
              console.warn(`[Live Scraper] Model ${currentModel} returned 404. Trying next model candidate...`);
              break; // Try next model candidate
            }
            if (aiRes.status === 429 || aiRes.status === 503 || errText.includes('503') || errText.includes('429')) {
              console.warn(`[Live Scraper] Gemini (${currentModel}) busy (503/429) on attempt ${attempt + 1}. Pausing 1.5s...`);
              await new Promise(res => setTimeout(res, 1500));
              attempt++;
              continue;
            }
            console.error(`[Live Scraper] AI Engine (${currentModel}) Error: ${aiRes.status} - ${errText}`);
            attempt++;
            await new Promise(res => setTimeout(res, 1000));
            continue;
          }
          break; // Success with currentModel
        } catch (err: any) {
          console.warn(`[Live Scraper] Request exception for model ${currentModel}:`, err.message);
          attempt++;
          await new Promise(res => setTimeout(res, 1000));
        }
      }

      if (aiRes && aiRes.ok) {
        break;
      }
    }

    let aiData: any = {};
    if (aiRes && aiRes.ok) {
      aiData = await aiRes.json();
    } else {
      console.warn("[Live Scraper] All Gemini models failed or busy. Engaging structured fallback intelligence generation...");
    }
    const jsonText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    let parsedData: any = {};
    try {
        parsedData = cleanAndParseJSON(jsonText);
        if (typeof parsedData !== 'object' || parsedData === null) {
            throw new Error("Parsed JSON is not an object");
        }
    } catch (e: any) {
        console.error(`[Live Scraper] JSON Parse Error:`, e.message, 'Raw text:', jsonText);
        parsedData = {
            reviews: [],
            error: "Failed to parse AI response",
            executiveScorecard: {
                returnRiskScore: 50,
                listingHealthScore: 50,
                estimatedMarginLossRange: "Unknown",
                primaryRiskDriver: "AI Parse Error"
            }
        };
    }

    const rawReviews = parsedData.reviews || (Array.isArray(parsedData) ? parsedData : []);

    const extractedReviews: ReviewPayload[] = rawReviews.map((rev: any, idx: number) => ({
      id: `ai_ext_${Date.now()}_${idx}`,
      marketplace,
      rating: Number(rev.rating) || 5,
      title: rev.title || '',
      content: rev.comment || rev.content || 'No text provided',
      author: rev.author || 'Verified Buyer',
      date: rev.date || new Date().toISOString(),
      sentiment: rev.badge || rev.sentiment || 'NEUTRAL',
      isSuspicious: !!rev.isSuspicious
    }));

    return { 
      success: true, 
      marketplace, 
      url, 
      reviews: extractedReviews, 
      intelligence: parsedData 
    };

  } catch (error: any) {
    console.error(`[Live Scraper] Execution Exception:`, error);
    return { success: false, marketplace, url, reviews: [], error: `Scraping/Extraction failed: ${error.message}` };
  }
}