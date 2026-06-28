import { chromium } from 'playwright';

/**
 * Launch headless Chromium, hand a `page` (+ collected console/pageerror `logs`)
 * to `fn`, and always tear down. Run probes through the root-free wrapper:
 *   apps/web/scripts/pw.sh node apps/web/e2e/<probe>.mjs
 */
export async function withPage(fn, { url } = {}) {
  const browser = await chromium.launch();
  const logs = [];
  try {
    const page = await browser.newPage();
    page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
    page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
    if (url) {
      await page.goto(url, { waitUntil: 'load' });
    }
    return await fn(page, logs);
  } finally {
    await browser.close();
  }
}
