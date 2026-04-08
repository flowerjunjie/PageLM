import { chromium, Browser, Page, ConsoleMessage } from 'playwright';

const BASE_URL = 'http://38.14.254.51:5173';
const PAGES_TO_TEST = [
  { name: 'Landing', path: '/' },
  { name: 'Chat', path: '/chat' },
  { name: 'Quiz', path: '/quiz' },
  { name: 'FlashCards', path: '/flashcards' },
  { name: 'Review', path: '/review' },
  { name: 'LearningProfile', path: '/learning-profile' },
  { name: 'Tools', path: '/tools' },
];

interface TestResult {
  page: string;
  status: 'pass' | 'fail' | 'warning';
  screenshot?: string;
  consoleErrors: string[];
  consoleWarnings: string[];
  issues: string[];
  recommendations: string[];
}

async function takeScreenshot(page: Page, name: string): Promise<string> {
  const screenshotPath = `/var/www/workspace/PageLM/frontend/tests/e2e/screenshots/${name}-${Date.now()}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

async function testPage(browser: Browser, pageInfo: { name: string; path: string }): Promise<TestResult> {
  const result: TestResult = {
    page: pageInfo.name,
    status: 'pass',
    consoleErrors: [],
    consoleWarnings: [],
    issues: [],
    recommendations: [],
  };

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Capture console messages
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      result.consoleErrors.push(msg.text());
    } else if (msg.type() === 'warning') {
      result.consoleWarnings.push(msg.text());
    }
  });

  // Capture page errors
  page.on('pageerror', (error: Error) => {
    result.consoleErrors.push(`PageError: ${error.message}`);
  });

  try {
    console.log(`\n--- Testing ${pageInfo.name} (${pageInfo.path}) ---`);

    // Navigate to the page
    const response = await page.goto(`${BASE_URL}${pageInfo.path}`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    if (!response || response.status() >= 400) {
      result.status = 'fail';
      result.issues.push(`Page failed to load: HTTP ${response?.status() || 'no response'}`);
      return result;
    }

    // Wait a bit for any async content
    await page.waitForTimeout(2000);

    // Take screenshot
    result.screenshot = await takeScreenshot(page, pageInfo.name.toLowerCase());
    console.log(`Screenshot: ${result.screenshot}`);

    // Test 1: Check page title/heading
    const heading = await page.locator('h1').first().textContent().catch(() => 'No h1 found');
    console.log(`Heading: ${heading}`);

    // Test 2: Check for interactive elements (buttons, inputs)
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const links = await page.locator('a').count();
    console.log(`Interactive elements: ${buttons} buttons, ${inputs} inputs, ${links} links`);

    if (buttons === 0 && inputs === 0) {
      result.issues.push('No interactive elements found');
    }

    // Test 3: Check navigation elements
    const navElements = await page.locator('nav').count();
    console.log(`Navigation elements: ${navElements}`);

    // Test 4: Test responsive layout (mobile view)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    const mobileScreenshot = await takeScreenshot(page, `${pageInfo.name.toLowerCase()}-mobile`);
    console.log(`Mobile screenshot: ${mobileScreenshot}`);

    // Test 5: Check for common UI issues
    const body = await page.locator('body').first();
    const isVisible = await body.isVisible();
    if (!isVisible) {
      result.issues.push('Body element not visible');
    }

    // Test 6: Check for loading states
    const loadingElements = await page.locator('[class*="loading"], [class*="spinner"]').count();
    if (loadingElements > 0) {
      result.issues.push('Page appears to be in a loading state');
    }

    // Test 7: Check for visible text content
    const bodyText = await page.locator('body').textContent();
    if (!bodyText || bodyText.trim().length < 50) {
      result.issues.push('Page appears to have minimal or no text content');
    }

    // Test 8: Check for i18n (internationalization) issues
    const htmlLang = await page.locator('html').getAttribute('lang');
    console.log(`HTML lang attribute: ${htmlLang}`);

    // Test 9: Check for accessibility basics
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    if (imagesWithoutAlt > 0) {
      result.issues.push(`Found ${imagesWithoutAlt} images without alt attributes`);
    }

    // Test 10: Try clicking primary buttons if any exist
    const primaryButton = page.locator('button').first();
    if (await primaryButton.count() > 0) {
      const buttonText = await primaryButton.textContent();
      console.log(`Primary button text: ${buttonText}`);
    }

    // Check for console errors
    if (result.consoleErrors.length > 0) {
      result.status = 'warning';
      result.issues.push(`Found ${result.consoleErrors.length} console errors`);
    }

  } catch (error) {
    result.status = 'fail';
    result.issues.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await context.close();
  }

  return result;
}

async function testResponsiveLayout(browser: Browser): Promise<void> {
  console.log('\n=== Testing Responsive Layout ===');
  const context = await browser.newContext();
  const page = await context.newPage();

  const viewports = [
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: 'Laptop', width: 1366, height: 768 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 667 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    const screenshot = await takeScreenshot(page, `landing-${viewport.name.toLowerCase()}`);
    console.log(`${viewport.name} (${viewport.width}x${viewport.height}): ${screenshot}`);
  }

  await context.close();
}

async function testMarkdownRendering(browser: Browser): Promise<void> {
  console.log('\n=== Testing Markdown Rendering ===');
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to Chat page which likely has Markdown rendering
    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const screenshot = await takeScreenshot(page, 'markdown-test');
    console.log(`Markdown test screenshot: ${screenshot}`);

    // Check for code blocks
    const codeBlocks = await page.locator('pre, code').count();
    console.log(`Code blocks found: ${codeBlocks}`);

    // Check for math formulas (KaTeX/MathJax)
    const mathElements = await page.locator('.katex, .MathJax, [class*="math"]').count();
    console.log(`Math elements found: ${mathElements}`);

  } catch (error) {
    console.error(`Markdown test error: ${error}`);
  } finally {
    await context.close();
  }
}

async function runTests() {
  console.log('=== PageLM Frontend Testing ===');
  console.log(`Base URL: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const results: TestResult[] = [];

  // Test each page
  for (const pageInfo of PAGES_TO_TEST) {
    const result = await testPage(browser, pageInfo);
    results.push(result);
  }

  // Test responsive layout
  await testResponsiveLayout(browser);

  // Test markdown rendering
  await testMarkdownRendering(browser);

  await browser.close();

  // Print results
  console.log('\n\n=== TEST RESULTS SUMMARY ===\n');

  for (const result of results) {
    const statusIcon = result.status === 'pass' ? '✓' : result.status === 'warning' ? '⚠' : '✗';
    console.log(`${statusIcon} ${result.page}: ${result.status.toUpperCase()}`);
    if (result.issues.length > 0) {
      console.log(`  Issues:`);
      result.issues.forEach(issue => console.log(`    - ${issue}`));
    }
    if (result.consoleErrors.length > 0) {
      console.log(`  Console Errors:`);
      result.consoleErrors.forEach(err => console.log(`    - ${err}`));
    }
    if (result.recommendations.length > 0) {
      console.log(`  Recommendations:`);
      result.recommendations.forEach(rec => console.log(`    - ${rec}`));
    }
    console.log('');
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      warnings: results.filter(r => r.status === 'warning').length,
      failed: results.filter(r => r.status === 'fail').length,
    }
  };

  console.log('Summary:', report.summary);

  return report;
}

runTests().catch(console.error);
