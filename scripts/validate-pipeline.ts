import { fetchMarketplaceReviews } from '../src/lib/scraper';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function runTest(name: string, url: string, expectedTitle: string, expectedPrice: number, minReviews: number) {
  console.log(`\n===========================================`);
  console.log(`[TEST] ${name}`);
  console.log(`URL: ${url}`);
  console.log(`===========================================`);

  const result = await fetchMarketplaceReviews(url);
  
  if (!result.success) {
    console.error(`❌ FAILED: Pipeline failed with error: ${result.error}`);
    return false;
  }

  const title = result.productTitle || '';
  const priceStr = result.price || '';
  const reviewsCount = result.reviews?.length || 0;
  
  const extractedPriceMatch = priceStr.match(/(\d+)/);
  const extractedPrice = extractedPriceMatch ? parseInt(extractedPriceMatch[1], 10) : 0;

  console.log(`Title: ${title}`);
  console.log(`Price: ${priceStr} (Parsed: ${extractedPrice})`);
  console.log(`Reviews Extracted: ${reviewsCount}`);

  let passed = true;

  if (!title.toLowerCase().includes(expectedTitle.toLowerCase())) {
    console.error(`❌ FAILED: Title does not contain "${expectedTitle}". Actual title: "${title}"`);
    passed = false;
  } else {
    console.log(`✅ Title matches "${expectedTitle}"`);
  }

  if (extractedPrice < 100) {
    console.error(`❌ FAILED: Price too low or invalid. Got ${extractedPrice}`);
    passed = false;
  } else {
    console.log(`✅ Valid Price extracted: ${extractedPrice} (Expected at least > 100, formerly ~${expectedPrice})`);
  }

  if (reviewsCount < minReviews) {
    console.error(`❌ FAILED: Review count too low. Expected >= ${minReviews}, got ${reviewsCount}`);
    passed = false;
  } else {
    console.log(`✅ Review count met: ${reviewsCount} >= ${minReviews}`);
  }

  return passed;
}

async function validatePipeline() {
  let allPassed = true;

  // TEST 1 (Flipkart Shoe)
  const test1 = await runTest(
    "Flipkart Shoe",
    "https://www.flipkart.com/campus-refresh-pro-men-s-sports-shoes-mesh-upper-support-tech-stability-lace-up-running-men/p/itmc7ac92f06b0e6?pid=SHOFY7UM3HYYU5BY",
    "Campus",
    917,
    15
  );
  if (!test1) allPassed = false;

  // TEST 2 (Flipkart Clock)
  const test2 = await runTest(
    "Flipkart Clock",
    "https://www.flipkart.com/product/p/item?pid=WCKHJFZZQBTUNGVN",
    "Wall Clock",
    628,
    15
  );
  if (!test2) allPassed = false;

  // TEST 3 (Meesho Saree)
  const test3 = await runTest(
    "Meesho Saree",
    "https://www.meesho.com/bandhani-printed-saree-with-banarasi-lace-border-and-with-unstitched-blouse-piece-new-arrival-latest-georgette-printed-saree-fancy-womens-designer-saree-trending-saree-bollywood-saree-daily-use-saree-fancy-saree-naye-design-of-saree-nai-design-of-saree/p/8wfdf2",
    "Saree",
    398,
    15
  );
  if (!test3) allPassed = false;

  if (allPassed) {
    console.log(`\n✅ ALL TESTS PASSED SUCCESSFULLY!`);
    process.exit(0);
  } else {
    console.error(`\n❌ SOME TESTS FAILED. Please review the logs above.`);
    process.exit(1);
  }
}

validatePipeline().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
