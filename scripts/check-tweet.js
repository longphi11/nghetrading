const { chromium } = require('playwright');
const path = require('path');

const sessionDir = path.join(__dirname, '..', '.x-browser-session');

(async () => {
  const context = await chromium.launchPersistentContext(sessionDir, {
    headless: true,
    viewport: { width: 1280, height: 800 }
  });
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://x.com/ankhanhcu53937/status/1916433571641688267', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(__dirname, '..', 'Pic trading view', 'check_posted_tweet.png') });
  console.log('Saved check_posted_tweet.png');
  await context.close();
})();
