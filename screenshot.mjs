import puppeteer from 'puppeteer';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';
const screenshotDir = join(__dirname, 'temporary screenshots');

if (!existsSync(screenshotDir)) {
  mkdirSync(screenshotDir, { recursive: true });
}

// Auto-increment filename
const existing = readdirSync(screenshotDir).filter(f => f.startsWith('screenshot-'));
const maxNum = existing.reduce((max, f) => {
  const match = f.match(/screenshot-(\d+)/);
  return match ? Math.max(max, parseInt(match[1])) : max;
}, 0);
const num = maxNum + 1;
const filename = label ? `screenshot-${num}-${label}.png` : `screenshot-${num}.png`;
const outputPath = join(screenshotDir, filename);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

// Wait a bit for animations
await new Promise(r => setTimeout(r, 1500));

await page.screenshot({ path: outputPath, fullPage: true });
console.log(`Screenshot saved: ${outputPath}`);

await browser.close();
