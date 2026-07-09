export type Marketplace = 'meesho' | 'flipkart' | 'amazon' | 'facebook' | 'zomato' | 'swiggy' | 'unknown';

export interface ReviewPayload {
  id: string;
  marketplace: Marketplace;
  rating: number; // 1 to 5
  content: string;
  author: string;
  date: string;
}

export interface ScrapingResult {
  success: boolean;
  marketplace: Marketplace;
  url: string;
  reviews: ReviewPayload[];
  error?: string;
}

/**
 * Parses the provided URL to identify the marketplace and simulates scraping reviews.
 * Supports Meesho, Flipkart, Amazon, Facebook, Zomato, and Swiggy.
 * * @param url The product or store URL to scrape.
 * @returns A promise resolving to a type-safe ScrapingResult containing mock reviews.
 */
export async function fetchMarketplaceReviews(url: string): Promise<ScrapingResult> {
  console.log(`[Scraper] Initializing diagnostic scan for URL: ${url}`);

  // 1. Inspect URL using regex patterns
  let identifiedMarketplace: Marketplace = 'unknown';

  const meeshoRegex = /meesho\.com/i;
  const flipkartRegex = /flipkart\.com/i;
  const amazonRegex = /amazon\.(in|com)/i;
  const facebookRegex = /facebook\.com/i;
  const zomatoRegex = /zomato\.com/i;
  const swiggyRegex = /swiggy\.com/i;

  if (meeshoRegex.test(url)) {
    identifiedMarketplace = 'meesho';
    console.log(`[Scraper] Match found: Meesho. Regex Pattern: ${meeshoRegex}`);
  } else if (flipkartRegex.test(url)) {
    identifiedMarketplace = 'flipkart';
    console.log(`[Scraper] Match found: Flipkart. Regex Pattern: ${flipkartRegex}`);
  } else if (amazonRegex.test(url)) {
    identifiedMarketplace = 'amazon';
    console.log(`[Scraper] Match found: Amazon. Regex Pattern: ${amazonRegex}`);
  } else if (facebookRegex.test(url)) {
    identifiedMarketplace = 'facebook';
    console.log(`[Scraper] Match found: Facebook. Regex Pattern: ${facebookRegex}`);
  } else if (zomatoRegex.test(url)) {
    identifiedMarketplace = 'zomato';
    console.log(`[Scraper] Match found: Zomato. Regex Pattern: ${zomatoRegex}`);
  } else if (swiggyRegex.test(url)) {
    identifiedMarketplace = 'swiggy';
    console.log(`[Scraper] Match found: Swiggy. Regex Pattern: ${swiggyRegex}`);
  } else {
    console.log(`[Scraper] No supported marketplace matched. URL: ${url}`);
    return {
      success: false,
      marketplace: 'unknown',
      url,
      reviews: [],
      error: 'Unsupported URL. We support Meesho, Flipkart, Amazon, Facebook, Zomato, and Swiggy.'
    };
  }

  console.log(`[Scraper] Simulating extraction pipeline for ${identifiedMarketplace}...`);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 2. Mock review data with vernacular variations matching food/e-commerce platforms
  const mockReviews: ReviewPayload[] = [
    {
      id: 'rev_001',
      marketplace: identifiedMarketplace,
      rating: 5,
      content: identifiedMarketplace === 'zomato' || identifiedMarketplace === 'swiggy'
        ? 'Bohot swadisht khana tha bhai! Packaging was top class and packaging completely intact.'
        : 'Bohot accha product hai bhai, ekdum top class. Quality is super nice!',
      author: 'Rahul Sharma',
      date: new Date().toISOString(),
    },
    {
      id: 'rev_002',
      marketplace: identifiedMarketplace,
      rating: 1,
      content: identifiedMarketplace === 'zomato' || identifiedMarketplace === 'swiggy'
        ? 'Ekdum bekar experience. Taste khub khrp chilo. Food was completely cold. Return korbo.'
        : 'Ekdum bekar experience. Fabric khub khrp chilo. Return korbo ami. Very disappointed.',
      author: 'Priya Das',
      date: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'rev_003',
      marketplace: identifiedMarketplace,
      rating: 3,
      content: identifiedMarketplace === 'zomato' || identifiedMarketplace === 'swiggy'
        ? 'Thik thak hai, par portion size ke hisaab se price thik nahi laga. Delivery was fast though.'
        : 'Thik thak hai, par price ke hisaab se theek nahi laga. Delivery was fast though.',
      author: 'Amit Verma',
      date: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: 'rev_004',
      marketplace: identifiedMarketplace,
      rating: 4,
      content: identifiedMarketplace === 'zomato' || identifiedMarketplace === 'swiggy'
        ? 'Bhalo khabar. My family liked it very much. Masala was perfectly balanced.'
        : 'Bhalo jinish. My mother liked it very much. Dekhne mein bhi sundar hai.',
      author: 'Sneha Bose',
      date: new Date(Date.now() - 259200000).toISOString(),
    },
    {
      id: 'rev_005',
      marketplace: identifiedMarketplace,
      rating: 2,
      content: identifiedMarketplace === 'zomato' || identifiedMarketplace === 'swiggy'
        ? 'Spicy bolkar order kiya aur bilkul feeka bhej diya. Delivery partner was also very late.'
        : 'Size issue tha, lamba order kiya aur chota bhej diya. Support is not helping yaar.',
      author: 'Vikas Kumar',
      date: new Date(Date.now() - 345600000).toISOString(),
    },
  ];

  console.log(`[Scraper] Extraction complete. Successfully collected ${mockReviews.length} records for ${identifiedMarketplace}.`);

  return {
    success: true,
    marketplace: identifiedMarketplace,
    url,
    reviews: mockReviews
  };
}