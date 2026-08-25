import { chromium } from 'playwright';
import fs from 'fs';

async function runTest() {
  let browser;
  let context;
  let page;
  
  let attempt = 1;
  const maxAttempts = 3;

  while (attempt <= maxAttempts) {
    console.log(`\n=== 🔄 SMOKE TEST ATTEMPT ${attempt}/${maxAttempts} ===`);
    try {
      console.log('🌐 Launching Headless Playwright Browser...');
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext();
      page = await context.newPage();

      page.on('console', (msg) => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (error) => console.error(`[Browser Error] ${error.message}`));

      console.log('➡️ Navigating to production dashboard: https://reviewlens-hazel.vercel.app/dashboard');
      await page.goto('https://reviewlens-hazel.vercel.app/dashboard', { waitUntil: 'networkidle' });

      // Check if Unauthorized is present on the screen
      const errorVisible = await page.locator('text=Unauthorized').isVisible({ timeout: 5000 }).catch(() => false);
      if (errorVisible) {
         throw new Error("Vercel deployment has not finished yet (Unauthorized error is still present on the page)");
      }

      console.log('➡️ Opening "Run AI Product Audit" modal...');
      const auditBtn = page.locator('button', { hasText: /(Run AI Product Audit|Audit Your First Product)/i }).first();
      await auditBtn.waitFor({ state: 'visible', timeout: 30000 });
      await auditBtn.click();

      console.log('➡️ Pasting Campus Shoe URL...');
      const testUrl = 'https://www.flipkart.com/campus-refresh-pro-men-s-sports-shoes-mesh-upper-support-tech-stability-lace-up-running-men/p/itmc7ac92f06b0e6?pid=SHOFY7UM3HYYU5BY';
      await page.locator('textarea').first().fill(testUrl);
      await page.waitForTimeout(500);

      console.log('➡️ Clicking "Execute Smart AI Audit"...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const executeBtn = buttons.find(b => b.textContent && (b.textContent.includes('Execute') || b.textContent.includes('Start AI') || b.textContent.includes('Launch Audit')));
        if (executeBtn) {
          executeBtn.click();
        } else {
          const buttonTexts = buttons.map(b => b.textContent?.trim()).join(' | ');
          throw new Error("Execute button not found. Available buttons: " + buttonTexts);
        }
      });

      console.log('➡️ Handling Free Tier Gating (if any)...');
      const freeTierBtn = page.locator('button', { hasText: /Analyze Latest/i }).first();
      await freeTierBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      if (await freeTierBtn.isVisible()) {
        await freeTierBtn.click();
        console.log('➡️ Clicked Free Tier Bypass');
      }

      console.log('⏳ Waiting for analysis to render in Executive Console... (timeout: 180s)');
      await page.waitForSelector('text=EXECUTIVE CONSOLE', { timeout: 180000 });
      console.log('✅ Executive Console rendered!');

      console.log('➡️ Extracting ASP input value...');
      const inputs = await page.$$eval('input[type="number"], input[type="text"]', elements => elements.map(e => (e as HTMLInputElement).value));
      const pageText = await page.evaluate(() => document.body.innerText);
      
      let aspMatch = false;
      for (const val of inputs) {
        if (val === '917' || val.includes('917')) {
          aspMatch = true;
        }
        if (val === '7' || val === '07') {
          throw new Error('❌ FAILED: ASP parsed as 7 (Shoe Size Leak Detected!)');
        }
      }
      
      if (!aspMatch) {
         if (pageText.includes('₹917') || pageText.includes('917')) {
             aspMatch = true;
         } else if (pageText.includes('₹7') || pageText.includes('7.00') || pageText.match(/₹\s*7\b/)) {
             throw new Error('❌ FAILED: ASP parsed as 7 (Shoe Size Leak Detected!)');
         }
      }

      if (!aspMatch) {
        console.warn('⚠️ ASP of 917 not explicitly found in standard inputs or text. It might be calculated dynamically. Checking deeper...');
        throw new Error('❌ FAILED: ASP value 917 not found on the page.');
      }

      console.log('✅ PASS: ASP correctly identified as 917');

      console.log('➡️ Extracting Review Count...');
      const reviewCountTextMatch = pageText.match(/([0-9,]+)\s*(?:Verified\s*)?Reviews/i);
      if (reviewCountTextMatch) {
         console.log(`✅ PASS: Extracted Review Count = ${reviewCountTextMatch[1]}`);
      } else {
         console.log(`⚠️ Review Count badge not found via simple text match. Proceeding anyway.`);
      }

      console.log('📸 Capturing visual proof...');
      if (!fs.existsSync('public')) {
        fs.mkdirSync('public');
      }
      await page.screenshot({ path: 'public/test-proof.png', fullPage: true });
      console.log('✅ Visual proof saved to public/test-proof.png');

      console.log('🚀 100% AUTONOMOUS LIVE SMOKE TEST COMPLETED SUCCESSFULLY');
      
      if (browser) {
        await browser.close();
      }
      return; // exit the loop on success
      
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      try {
        if (page) {
          if (!fs.existsSync('public')) {
            fs.mkdirSync('public');
          }
          await page.screenshot({ path: `public/test-proof-failure-attempt-${attempt}.png`, fullPage: true });
          console.log(`📸 Failure screenshot saved to public/test-proof-failure-attempt-${attempt}.png`);
        }
      } catch(e) {}
      
      if (browser) {
        await browser.close();
      }
      
      attempt++;
      if (attempt <= maxAttempts) {
        console.log(`⏳ Waiting 30 seconds before next attempt to allow Vercel deployment...`);
        await new Promise(r => setTimeout(r, 30000));
      } else {
        console.error('❌ ALL ATTEMPTS FAILED.');
        process.exit(1);
      }
    }
  }
}

runTest();
