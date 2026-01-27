import { chromium } from 'playwright';
import fs from 'fs';

const DESKTOP_VIEWPORT = { width: 1280, height: 720 };
const MOBILE_VIEWPORT = { width: 375, height: 667 };
const BASE_URL = 'http://localhost:3000';

const PAGES_TO_TEST = [
  { name: 'Main Dashboard', path: '/', needsAuth: true },
  { name: 'Login Page', path: '/login', needsAuth: false },
  { name: 'Tickets Page', path: '/tickets', needsAuth: true },
  { name: 'Analytics Page', path: '/analytics', needsAuth: true },
  { name: 'Knowledge Base', path: '/knowledge', needsAuth: true },
  { name: 'Settings Page', path: '/settings', needsAuth: true },
  { name: 'Portal Page', path: '/portal', needsAuth: false },
  { name: 'Widget Page', path: '/widget', needsAuth: false },
];

async function testPage(page, pageInfo, viewport, viewportName) {
  const consoleErrors = [];
  const consoleWarnings = [];
  const networkErrors = [];
  const allNetworkRequests = [];
  const result = {
    page: pageInfo.name,
    url: BASE_URL + pageInfo.path,
    viewport: viewportName,
    loadStatus: 'unknown',
    finalUrl: '',
    consoleErrors: [],
    consoleWarnings: [],
    networkErrors: [],
    networkRequests: 0,
    visualIssues: [],
    functionalIssues: [],
    accessibilityIssues: [],
    screenshotPath: null,
    pageTitle: '',
    loadTime: 0,
  };

  // Set up console listener
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(msg.text());
    }
  });

  // Set up network error listener
  page.on('response', response => {
    allNetworkRequests.push(response.url());
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

    const startTime = Date.now();

    // Navigate to page
    const response = await page.goto(BASE_URL + pageInfo.path, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    result.loadTime = Date.now() - startTime;

    const status = response ? response.status() : 0;
    const ok = response ? response.ok() : false;
    result.loadStatus = ok ? 'success' : 'failed (' + status + ')';
    result.finalUrl = page.url();

    // Wait a bit for any dynamic content
    await page.waitForTimeout(1500);

    // Get page title
    result.pageTitle = await page.title();

    // Take screenshot
    const safePath = pageInfo.path.replace(/\//g, '-') || 'home';
    const screenshotName = 'auth-screenshot' + safePath + '-' + viewportName + '.png';
    await page.screenshot({ path: './test-screenshots/' + screenshotName, fullPage: true });
    result.screenshotPath = screenshotName;

    // Check for visual issues
    const bodyContent = await page.locator('body').textContent().catch(() => '');

    // Check for common error messages in page content
    const errorPatterns = [
      'Something went wrong',
      'Error loading',
      'Failed to load',
      'Network error',
      '500 Internal Server Error',
      '404 Not Found',
      'Oops!',
      'undefined',
      'NaN',
    ];

    for (const pattern of errorPatterns) {
      if (bodyContent && bodyContent.includes(pattern)) {
        result.visualIssues.push('Page contains error text: "' + pattern + '"');
      }
    }

    // Check for loading states stuck
    const loadingElements = await page.locator('[class*="loading"], [class*="spinner"], [class*="skeleton"]').count();
    if (loadingElements > 0) {
      // Wait a bit more and check again
      await page.waitForTimeout(2000);
      const stillLoading = await page.locator('[class*="loading"], [class*="spinner"], [class*="skeleton"]').count();
      if (stillLoading > 0) {
        result.visualIssues.push('Found ' + stillLoading + ' loading/spinner elements still visible after wait');
      }
    }

    // Check for horizontal overflow (mobile issue)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    if (hasHorizontalScroll && viewportName === 'mobile') {
      result.visualIssues.push('Horizontal scroll detected (potential mobile layout issue)');
    }

    // Check for elements overflowing viewport
    const overflowingElements = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      const issues = [];
      const elements = document.querySelectorAll('*');
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.right > viewportWidth + 5 && rect.width > 0) {
          const tag = el.tagName;
          const className = el.className ? el.className.toString().slice(0, 30) : '';
          issues.push(tag + (className ? '.' + className : '') + ' overflows by ' + Math.round(rect.right - viewportWidth) + 'px');
        }
      });
      return issues.slice(0, 3);
    });
    result.visualIssues.push(...overflowingElements);

    // Check for small touch targets (accessibility)
    const smallTouchTargets = await page.evaluate(() => {
      const elements = document.querySelectorAll('button, a, input, select, [role="button"]');
      const issues = [];
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
          // Check if it's actually visible
          const style = window.getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            const tag = el.tagName;
            const text = el.textContent ? el.textContent.trim().slice(0, 15) : '';
            issues.push(tag + ' (' + Math.round(rect.width) + 'x' + Math.round(rect.height) + ') "' + text + '"');
          }
        }
      });
      return issues.slice(0, 5);
    });
    if (smallTouchTargets.length > 0) {
      result.accessibilityIssues.push('Small touch targets (< 44px): ' + smallTouchTargets.join(', '));
    }

    // Check for missing alt text on images
    const missingAltImages = await page.locator('img:not([alt])').count();
    if (missingAltImages > 0) {
      result.accessibilityIssues.push(missingAltImages + ' images missing alt text');
    }

    // Check for form inputs without labels
    const unlabeledInputs = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
      let count = 0;
      inputs.forEach(input => {
        const id = input.id;
        const hasLabel = id && document.querySelector('label[for="' + id + '"]');
        const hasAriaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
        const hasPlaceholder = input.placeholder;
        if (!hasLabel && !hasAriaLabel && !hasPlaceholder) {
          count++;
        }
      });
      return count;
    });
    if (unlabeledInputs > 0) {
      result.accessibilityIssues.push(unlabeledInputs + ' form inputs without proper labels');
    }

    // Check for broken links (links with empty href)
    const brokenLinks = await page.locator('a[href=""], a[href="#"], a:not([href])').count();
    if (brokenLinks > 0) {
      result.functionalIssues.push(brokenLinks + ' potentially broken links (empty/missing href)');
    }

    // Check for disabled buttons that might be stuck
    const disabledButtons = await page.locator('button[disabled]').count();
    if (disabledButtons > 2) {
      result.functionalIssues.push(disabledButtons + ' disabled buttons on page');
    }

    // Check color contrast (basic check for very light text)
    const lowContrastElements = await page.evaluate(() => {
      const issues = [];
      const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button, label');
      textElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        // Very basic check - look for extremely light colors
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          const r = parseInt(match[1]);
          const g = parseInt(match[2]);
          const b = parseInt(match[3]);
          // Check for very light gray text
          if (r > 200 && g > 200 && b > 200 && style.backgroundColor === 'rgba(0, 0, 0, 0)') {
            issues.push(el.tagName + ' has very light text color');
          }
        }
      });
      return issues.slice(0, 3);
    });
    result.accessibilityIssues.push(...lowContrastElements);

    result.networkRequests = allNetworkRequests.length;

  } catch (error) {
    result.loadStatus = 'error: ' + error.message;
  }

  result.consoleErrors = consoleErrors;
  result.consoleWarnings = consoleWarnings;
  result.networkErrors = networkErrors;

  return result;
}

async function runTests() {
  console.log('Starting Comprehensive Playwright Tests...\n');
  console.log('Creating screenshots directory...');

  if (!fs.existsSync('./test-screenshots')) {
    fs.mkdirSync('./test-screenshots', { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const allResults = [];

  // Test with dev_bypass cookie (for authenticated pages)
  console.log('\n=== TESTING WITH DEV BYPASS COOKIE ===\n');

  // Desktop tests
  console.log('\n=== DESKTOP TESTING (1280x720) ===\n');
  for (const pageInfo of PAGES_TO_TEST) {
    const context = await browser.newContext();

    // Set dev_bypass cookie
    await context.addCookies([{
      name: 'dev_bypass',
      value: 'true',
      domain: 'localhost',
      path: '/',
    }]);

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

    // Set dev_bypass cookie
    await context.addCookies([{
      name: 'dev_bypass',
      value: 'true',
      domain: 'localhost',
      path: '/',
    }]);

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

  // Save results to JSON
  fs.writeFileSync('./test-screenshots/test-results.json', JSON.stringify(allResults, null, 2));
  console.log('\nDetailed results saved to: ./test-screenshots/test-results.json\n');
}

function printResult(result) {
  console.log('\n----------------------------------------');
  console.log('PAGE: ' + result.url);
  console.log('VIEWPORT: ' + result.viewport);
  console.log('LOAD STATUS: ' + result.loadStatus);
  console.log('FINAL URL: ' + result.finalUrl);
  console.log('PAGE TITLE: ' + result.pageTitle);
  console.log('LOAD TIME: ' + result.loadTime + 'ms');
  console.log('NETWORK REQUESTS: ' + result.networkRequests);
  console.log('CONSOLE ERRORS: ' + (result.consoleErrors.length > 0 ? '\n  - ' + result.consoleErrors.join('\n  - ') : 'none'));
  console.log('CONSOLE WARNINGS: ' + (result.consoleWarnings.length > 0 ? result.consoleWarnings.length + ' warning(s)' : 'none'));
  console.log('NETWORK ERRORS: ' + (result.networkErrors.length > 0 ? '\n  - ' + result.networkErrors.join('\n  - ') : 'none'));
  console.log('VISUAL ISSUES: ' + (result.visualIssues.length > 0 ? '\n  - ' + result.visualIssues.join('\n  - ') : 'none'));
  console.log('FUNCTIONAL ISSUES: ' + (result.functionalIssues.length > 0 ? '\n  - ' + result.functionalIssues.join('\n  - ') : 'none'));
  console.log('ACCESSIBILITY ISSUES: ' + (result.accessibilityIssues.length > 0 ? '\n  - ' + result.accessibilityIssues.join('\n  - ') : 'none'));
  console.log('SCREENSHOT: ' + (result.screenshotPath || 'not taken'));
}

function printSummary(results) {
  console.log('\n');
  console.log('================================================================================');
  console.log('                              OVERALL SUMMARY');
  console.log('================================================================================\n');

  const totalConsoleErrors = results.reduce((acc, r) => acc + r.consoleErrors.length, 0);
  const totalNetworkErrors = results.reduce((acc, r) => acc + r.networkErrors.length, 0);
  const totalVisualIssues = results.reduce((acc, r) => acc + r.visualIssues.length, 0);
  const totalFunctionalIssues = results.reduce((acc, r) => acc + r.functionalIssues.length, 0);
  const totalAccessibilityIssues = results.reduce((acc, r) => acc + r.accessibilityIssues.length, 0);

  console.log('METRICS OVERVIEW:');
  console.log('  Total Pages Tested: ' + results.length);
  console.log('  Total Console Errors: ' + totalConsoleErrors);
  console.log('  Total Network Errors: ' + totalNetworkErrors);
  console.log('  Total Visual Issues: ' + totalVisualIssues);
  console.log('  Total Functional Issues: ' + totalFunctionalIssues);
  console.log('  Total Accessibility Issues: ' + totalAccessibilityIssues);

  // Detailed breakdown by category
  console.log('\n--------------------------------------------------------------------------------');
  console.log('CONSOLE ERRORS:');
  console.log('--------------------------------------------------------------------------------');
  if (totalConsoleErrors === 0) {
    console.log('  No console errors found.');
  } else {
    results.forEach(r => {
      if (r.consoleErrors.length > 0) {
        console.log('  ' + r.url + ' (' + r.viewport + '):');
        r.consoleErrors.forEach(err => console.log('    - ' + err));
      }
    });
  }

  console.log('\n--------------------------------------------------------------------------------');
  console.log('NETWORK ERRORS:');
  console.log('--------------------------------------------------------------------------------');
  if (totalNetworkErrors === 0) {
    console.log('  No network errors found.');
  } else {
    results.forEach(r => {
      if (r.networkErrors.length > 0) {
        console.log('  ' + r.url + ' (' + r.viewport + '):');
        r.networkErrors.forEach(err => console.log('    - ' + err));
      }
    });
  }

  console.log('\n--------------------------------------------------------------------------------');
  console.log('VISUAL ISSUES:');
  console.log('--------------------------------------------------------------------------------');
  if (totalVisualIssues === 0) {
    console.log('  No visual issues found.');
  } else {
    results.forEach(r => {
      if (r.visualIssues.length > 0) {
        console.log('  ' + r.url + ' (' + r.viewport + '):');
        r.visualIssues.forEach(issue => console.log('    - ' + issue));
      }
    });
  }

  console.log('\n--------------------------------------------------------------------------------');
  console.log('FUNCTIONAL ISSUES:');
  console.log('--------------------------------------------------------------------------------');
  if (totalFunctionalIssues === 0) {
    console.log('  No functional issues found.');
  } else {
    results.forEach(r => {
      if (r.functionalIssues.length > 0) {
        console.log('  ' + r.url + ' (' + r.viewport + '):');
        r.functionalIssues.forEach(issue => console.log('    - ' + issue));
      }
    });
  }

  console.log('\n--------------------------------------------------------------------------------');
  console.log('ACCESSIBILITY ISSUES:');
  console.log('--------------------------------------------------------------------------------');
  if (totalAccessibilityIssues === 0) {
    console.log('  No accessibility issues found.');
  } else {
    results.forEach(r => {
      if (r.accessibilityIssues.length > 0) {
        console.log('  ' + r.url + ' (' + r.viewport + '):');
        r.accessibilityIssues.forEach(issue => console.log('    - ' + issue));
      }
    });
  }

  // Pages that failed to load
  const failedPages = results.filter(r => r.loadStatus !== 'success');
  console.log('\n--------------------------------------------------------------------------------');
  console.log('PAGES WITH LOAD ISSUES:');
  console.log('--------------------------------------------------------------------------------');
  if (failedPages.length === 0) {
    console.log('  All pages loaded successfully.');
  } else {
    failedPages.forEach(r => {
      console.log('  ' + r.url + ' (' + r.viewport + '): ' + r.loadStatus);
    });
  }

  // Mobile-specific summary
  const mobileResults = results.filter(r => r.viewport === 'mobile');
  const mobileIssues = mobileResults.filter(r =>
    r.visualIssues.some(i => i.includes('Horizontal scroll') || i.includes('overflows'))
  );

  console.log('\n--------------------------------------------------------------------------------');
  console.log('MOBILE-SPECIFIC ISSUES:');
  console.log('--------------------------------------------------------------------------------');
  if (mobileIssues.length === 0) {
    console.log('  No mobile-specific layout issues found.');
  } else {
    mobileIssues.forEach(r => {
      const issues = r.visualIssues.filter(i => i.includes('Horizontal scroll') || i.includes('overflows'));
      console.log('  ' + r.url + ':');
      issues.forEach(issue => console.log('    - ' + issue));
    });
  }

  // Performance summary
  console.log('\n--------------------------------------------------------------------------------');
  console.log('PERFORMANCE (Load Times):');
  console.log('--------------------------------------------------------------------------------');
  const desktopResults = results.filter(r => r.viewport === 'desktop');
  desktopResults.forEach(r => {
    const time = r.loadTime;
    const status = time < 2000 ? 'GOOD' : time < 4000 ? 'SLOW' : 'VERY SLOW';
    console.log('  ' + r.page + ': ' + time + 'ms [' + status + ']');
  });

  console.log('\n================================================================================');
  console.log('Screenshots saved to: ./test-screenshots/');
  console.log('================================================================================\n');
}

runTests().catch(console.error);
