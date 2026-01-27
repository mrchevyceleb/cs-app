import { chromium } from 'playwright';
import fs from 'fs';

const DESKTOP_VIEWPORT = { width: 1280, height: 720 };
const MOBILE_VIEWPORT = { width: 375, height: 667 };
const BASE_URL = 'http://localhost:3000';

const PAGES_TO_TEST = [
  { name: 'Main Dashboard', path: '/' },
  { name: 'Login Page', path: '/login' },
  { name: 'Tickets Page', path: '/tickets' },
  { name: 'Analytics Page', path: '/analytics' },
  { name: 'Knowledge Base', path: '/knowledge' },
  { name: 'Settings Page', path: '/settings' },
  { name: 'Portal Page', path: '/portal' },
  { name: 'Widget Page', path: '/widget' },
];

async function testPage(page, pageInfo, viewport, viewportName) {
  const consoleErrors = [];
  const networkErrors = [];
  const result = {
    page: pageInfo.name,
    url: BASE_URL + pageInfo.path,
    viewport: viewportName,
    loadStatus: 'unknown',
    consoleErrors: [],
    networkErrors: [],
    visualIssues: [],
    functionalIssues: [],
    screenshotPath: null,
  };

  // Set up console error listener
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Set up network error listener
  page.on('response', response => {
    const status = response.status();
    if (status >= 400) {
      networkErrors.push(status + ' ' + response.url());
    }
  });

  page.on('requestfailed', request => {
    const failure = request.failure();
    networkErrors.push('FAILED: ' + request.url() + ' - ' + (failure ? failure.errorText : 'unknown'));
  });

  try {
    // Set viewport
    await page.setViewportSize(viewport);

    // Navigate to page
    const response = await page.goto(BASE_URL + pageInfo.path, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const status = response ? response.status() : 0;
    const ok = response ? response.ok() : false;
    result.loadStatus = ok ? 'success' : 'failed (' + status + ')';

    // Wait a bit for any dynamic content
    await page.waitForTimeout(1000);

    // Take screenshot
    const safePath = pageInfo.path.replace(/\//g, '-') || 'home';
    const screenshotName = 'screenshot' + safePath + '-' + viewportName + '.png';
    await page.screenshot({ path: './test-screenshots/' + screenshotName, fullPage: true });
    result.screenshotPath = screenshotName;

    // Check for visual issues
    const bodyContent = await page.locator('body').textContent().catch(() => '');

    // Check for common error indicators
    if (bodyContent && (bodyContent.includes('Error') || bodyContent.includes('error'))) {
      const errorElements = await page.locator('text=/error/i').count();
      if (errorElements > 0) {
        result.visualIssues.push('Found ' + errorElements + ' elements containing "error" text');
      }
    }

    // Check for loading states stuck
    const loadingElements = await page.locator('[class*="loading"], [class*="spinner"]').count();
    if (loadingElements > 0) {
      result.visualIssues.push('Found ' + loadingElements + ' loading/spinner elements still visible');
    }

    // Check for horizontal overflow (mobile issue)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    if (hasHorizontalScroll && viewportName === 'mobile') {
      result.visualIssues.push('Horizontal scroll detected (potential mobile layout issue)');
    }

    // Check if main content is visible
    const mainContent = await page.locator('main, [role="main"], .main-content, #__next > div').first();
    const isVisible = await mainContent.isVisible().catch(() => false);
    if (!isVisible) {
      result.visualIssues.push('Main content area not visible');
    }

    // Check for small touch targets
    const overlapCheck = await page.evaluate(() => {
      const elements = document.querySelectorAll('button, a, input, select');
      const issues = [];
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && (rect.width < 24 || rect.height < 24)) {
          const tag = el.tagName;
          const text = el.textContent ? el.textContent.slice(0, 20) : '';
          issues.push('Small touch target: ' + tag + ' (' + Math.round(rect.width) + 'x' + Math.round(rect.height) + ') "' + text + '"');
        }
      });
      return issues.slice(0, 5); // Limit to 5
    });
    result.functionalIssues.push(...overlapCheck);

  } catch (error) {
    result.loadStatus = 'error: ' + error.message;
  }

  result.consoleErrors = consoleErrors;
  result.networkErrors = networkErrors;

  return result;
}

async function runTests() {
  console.log('Starting Playwright tests...\n');
  console.log('Creating screenshots directory...');

  if (!fs.existsSync('./test-screenshots')) {
    fs.mkdirSync('./test-screenshots', { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const allResults = [];

  // Desktop tests
  console.log('\n=== DESKTOP TESTING (1280x720) ===\n');
  for (const pageInfo of PAGES_TO_TEST) {
    const context = await browser.newContext();
    const page = await context.newPage();
    console.log('Testing: ' + pageInfo.name + ' (Desktop)...');
    const result = await testPage(page, pageInfo, DESKTOP_VIEWPORT, 'desktop');
    allResults.push(result);
    printResult(result);
    await context.close();
  }

  // Mobile tests
  console.log('\n=== MOBILE TESTING (375x667) ===\n');
  for (const pageInfo of PAGES_TO_TEST) {
    const context = await browser.newContext();
    const page = await context.newPage();
    console.log('Testing: ' + pageInfo.name + ' (Mobile)...');
    const result = await testPage(page, pageInfo, MOBILE_VIEWPORT, 'mobile');
    allResults.push(result);
    printResult(result);
    await context.close();
  }

  await browser.close();

  // Print summary
  printSummary(allResults);
}

function printResult(result) {
  console.log('\nPAGE: ' + result.url);
  console.log('VIEWPORT: ' + result.viewport);
  console.log('LOAD STATUS: ' + result.loadStatus);
  console.log('CONSOLE ERRORS: ' + (result.consoleErrors.length > 0 ? result.consoleErrors.join('; ') : 'none'));
  console.log('NETWORK ERRORS: ' + (result.networkErrors.length > 0 ? result.networkErrors.join('; ') : 'none'));
  console.log('VISUAL ISSUES: ' + (result.visualIssues.length > 0 ? result.visualIssues.join('; ') : 'none'));
  console.log('FUNCTIONAL ISSUES: ' + (result.functionalIssues.length > 0 ? result.functionalIssues.join('; ') : 'none'));
  console.log('SCREENSHOT: ' + (result.screenshotPath || 'not taken'));
  console.log('---');
}

function printSummary(results) {
  console.log('\n========================================');
  console.log('           OVERALL SUMMARY');
  console.log('========================================\n');

  const totalConsoleErrors = results.reduce((acc, r) => acc + r.consoleErrors.length, 0);
  const totalNetworkErrors = results.reduce((acc, r) => acc + r.networkErrors.length, 0);

  const allVisualIssues = results.filter(r => r.visualIssues.length > 0);
  const allFunctionalIssues = results.filter(r => r.functionalIssues.length > 0);
  const mobileIssues = results.filter(r => r.viewport === 'mobile' && (r.visualIssues.length > 0 || r.loadStatus !== 'success'));

  console.log('Total Console Errors: ' + totalConsoleErrors);
  results.forEach(r => {
    if (r.consoleErrors.length > 0) {
      console.log('  - ' + r.url + ' (' + r.viewport + '): ' + r.consoleErrors.join(', '));
    }
  });

  console.log('\nTotal Network Errors: ' + totalNetworkErrors);
  results.forEach(r => {
    if (r.networkErrors.length > 0) {
      console.log('  - ' + r.url + ' (' + r.viewport + '): ' + r.networkErrors.join(', '));
    }
  });

  console.log('\nPages with Visual Issues: ' + allVisualIssues.length);
  allVisualIssues.forEach(r => {
    console.log('  - ' + r.url + ' (' + r.viewport + '): ' + r.visualIssues.join(', '));
  });

  console.log('\nPages with Functional Issues: ' + allFunctionalIssues.length);
  allFunctionalIssues.forEach(r => {
    console.log('  - ' + r.url + ' (' + r.viewport + '): ' + r.functionalIssues.join(', '));
  });

  console.log('\nMobile-Specific Issues: ' + mobileIssues.length);
  mobileIssues.forEach(r => {
    console.log('  - ' + r.url + ': ' + (r.visualIssues.join(', ') || r.loadStatus));
  });

  // Pages that failed to load
  const failedPages = results.filter(r => r.loadStatus !== 'success');
  if (failedPages.length > 0) {
    console.log('\nPages that failed to load: ' + failedPages.length);
    failedPages.forEach(r => {
      console.log('  - ' + r.url + ' (' + r.viewport + '): ' + r.loadStatus);
    });
  }

  console.log('\n========================================');
  console.log('Screenshots saved to: ./test-screenshots/');
  console.log('========================================\n');
}

runTests().catch(console.error);
