const { chromium } = require('playwright');
const path = require('path');

const sessionDir = path.join(__dirname, '..', '.x-browser-session');

(async () => {
  const context = await chromium.launchPersistentContext(sessionDir, {
    headless: true,
    viewport: { width: 1280, height: 800 }
  });
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://x.com/ankhanhcu53937', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(__dirname, '..', 'Pic trading view', 'check_profile.png') });
  console.log('Saved check_profile.png');
  await context.close();
})();
