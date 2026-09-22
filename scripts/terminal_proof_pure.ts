import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let value = trimmed.slice(eqIdx + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
}

import { extractModalPriceAndReviews } from '../src/components/ExecutiveConsole';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTerminalProof() {
  console.log('--- FETCHING LATEST ANALYSIS RECORD FROM SUPABASE ---');
  const { data: latestRecord, error } = await supabase
    .from('analyses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !latestRecord) {
    console.error('Supabase fetch error:', error);
    process.exit(1);
  }

  console.log(`Latest Record ID: ${latestRecord.id}`);
  console.log(`Product Title: ${latestRecord.product_title || latestRecord.product_name}`);

  // Pass directly to the modal parser/transformer function
  const modalData = extractModalPriceAndReviews(latestRecord);

  console.log('\n===============================================================');
  console.log(`Extracted Price: ${modalData.extractedPrice}`);
  console.log(`Reviews passed to modal: ${modalData.reviews.length}`);
  
  if (modalData.reviews.length > 0) {
    const r1 = modalData.reviews[0];
    console.log(`1st Review Title: ${r1.title || 'Verified Purchase'}`);
    console.log(`1st Review Body: "${r1.content || r1.text || r1.reviewText}"`);
    console.log(`1st Review Author: ${r1.author}`);
    console.log(`1st Review Rating: ${r1.rating} ★`);
  }
  console.log('===============================================================\n');

  // Hard Assertion Checks specified in prompt:
  if (modalData.extractedPrice === 999) {
    console.error('PROMPT FAILURE: Extracted Price is 999 fallback!');
    process.exit(1);
  }
  if (modalData.extractedPrice !== 399) {
    console.error(`PROMPT FAILURE: Expected Extracted Price 399, got ${modalData.extractedPrice}`);
    process.exit(1);
  }
  if (modalData.reviews.length === 0) {
    console.error('PROMPT FAILURE: Reviews passed to modal is 0!');
    process.exit(1);
  }

  console.log('PROOF VERIFIED: Terminal test passed 100% cleanly.');
}

runTerminalProof();
