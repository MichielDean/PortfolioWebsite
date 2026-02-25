// src/tests/e2e/mobile-viewport.test.ts
import puppeteer, { Browser, Page } from 'puppeteer';
import { execSync, spawn, ChildProcess } from 'child_process';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
let browser: Browser;
let server: ChildProcess;

beforeAll(async () => {
  // Build the site first
  execSync('npm run build', { stdio: 'inherit' });
  // Start preview server
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT)], {
    detached: false,
    stdio: 'ignore',
  });
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 3000));
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
}, 60000);

afterAll(async () => {
  await browser?.close();
  server?.kill();
});

describe('Mobile viewport — no horizontal scroll', () => {
  let page: Page;

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 412, height: 915 }); // Pixel 6 Pro
  });

  afterEach(async () => {
    await page?.close();
  });

  it('has no horizontal overflow on Pixel 6 Pro (412px)', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = 412;
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
  }, 30000);

  it('has no horizontal overflow on small mobile (375px)', async () => {
    await page.setViewport({ width: 375, height: 812 }); // iPhone SE
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375);
  }, 30000);
});
