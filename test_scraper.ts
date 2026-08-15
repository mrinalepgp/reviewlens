import * as fs from 'fs';
const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n');
for (const line of envConfig) {
  const [key, ...value] = line.split('=');
  if (key && value) process.env[key.trim()] = value.join('=').trim();
}
import { fetchMarketplaceReviews } from './src/lib/scraper';

async function test() {
  const url = 'https://www.flipkart.com/dkeraod-retro-square-sunglasses/p/itmf1fef37b845f2?pid=SGLHF8J38BUGJT8G';
  console.log('Testing extraction for:', url);
  const result = await fetchMarketplaceReviews(url);
  console.log('--- TEST RESULTS ---');
  console.log('Success:', result.success);
  console.log('Marketplace:', result.marketplace);
  if (!result.success) {
    console.error('Error:', result.error);
    return;
  }
  console.log('Extracted Reviews Count:', result.reviews?.length);
  if (result.reviews && result.reviews.length > 0) {
    console.log('Sample Review 1:', result.reviews[0]);
  }
  console.log('Intelligence Data:', JSON.stringify(result.intelligence, null, 2));
}

test();
