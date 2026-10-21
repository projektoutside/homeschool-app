import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186';
const output = 'output/fullscreen-opt-in';
await mkdir(output, { recursive: true });
const results = [];
const chrome = await chromium.launch({ headless: true });
const safari = await webkit.launch({ headless: true });

function observeRequests() {
  window.__fullscreenRequests = [];
  for (const name of ['requestFullscreen', 'webkitRequestFullscreen', 'mozRequestFullScreen', 'msRequestFullscreen']) {
    const original = Element.prototype[name];
    if (!original) continue;
    Element.prototype[name] = function (...args) {
      window.__fullscreenRequests.push(name);
      return original.apply(this, args);
    };
  }
}
async function interactions(page) {
  await page.mouse.click(4, 4);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('pageshow'));
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('orientationchange'));
    document.dispatchEvent(new Event('touchstart', { bubbles: true }));
  });
  await page.waitForTimeout(1200);
  for (const frame of page.frames()) {
    assert.deepEqual(await frame.evaluate(() => window.__fullscreenRequests), []);
    assert.equal(await frame.evaluate(() => Boolean(document.fullscreenElement || document.webkitFullscreenElement)), false);
  }
}

try {
  for (const [name, browser, viewport, touch] of [
    ['desktop', chrome, { width: 1440, height: 900 }, false],
    ['android-viewport', chrome, { width: 393, height: 852 }, true],
    ['iphone-webkit', safari, { width: 390, height: 844 }, true],
    ['tablet', chrome, { width: 1024, height: 1366 }, true],
  ]) {
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
    await context.addInitScript(observeRequests);
    const page = await context.newPage();
    try {
      await page.goto(`${base}/auth`);
      await page.getByRole('button', { name: 'Play as Guest' }).click();
      await page.waitForURL(`${base}/`);
      await page.goto(`${base}/apps`);
      await page.locator('.home-page, [aria-label="games area"]').first().waitFor({ state: 'visible' });
      await interactions(page);
      await page.goto(`${base}/play/many-birds-one-stone`);
      const game = page.frameLocator('.game-player-frame');
      await game.locator('#overlayPrimary').waitFor({ state: 'visible' });
      await game.locator('#overlayPrimary').click();
      await game.locator('#hintButton').click();
      if (name === 'tablet') await page.setViewportSize({ width: 1366, height: 1024 });
      await interactions(page);
      assert.equal(await page.locator('.game-player-fullscreen-guard').count(), 0);
      const geometry = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
      assert.ok(geometry.scrollWidth <= geometry.width + 2);
      assert.ok(geometry.scrollHeight <= geometry.height + 2);
      await page.screenshot({ path: `${output}/${name}.png` });
      results.push({ name, pass: true, geometry, fullscreenRequests: 0, physical: false });
      console.log(`PASS ${name}`);
    } catch (error) {
      results.push({ name, pass: false, error: error.stack });
      console.log(`FAIL ${name}: ${error.message}`);
    } finally { await context.close(); }
  }

  const context = await chrome.newContext({ viewport: { width: 1366, height: 900 } });
  await context.addInitScript(observeRequests);
  const page = await context.newPage();
  try {
    for (const path of ['2PlayersMathWrite', 'MathPuzzle', 'Word Puzzle', 'Farmersmarket']) {
      await page.goto(`${base}/Games/${encodeURIComponent(path)}/index.html`);
      await page.waitForLoadState('domcontentloaded');
      await interactions(page);
      results.push({ name: `standalone-${path}`, pass: true, fullscreenRequests: 0 });
      console.log(`PASS standalone-${path}`);
    }
    await page.goto(`${base}/Games/SpyAcademy/index.html`);
    await page.locator('#fullscreen-toggle').waitFor({ state: 'visible' });
    await page.locator('#fullscreen-toggle').click();
    await page.waitForFunction(() => Boolean(document.fullscreenElement));
    assert.equal(await page.evaluate(() => window.__fullscreenRequests.length), 1);
    await page.evaluate(() => document.exitFullscreen());
    await page.mouse.click(4, 4);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => window.__fullscreenRequests.length), 1);
    results.push({ name: 'explicit-fullscreen-button', pass: true, actualChromiumFullscreen: true });
    console.log('PASS explicit-fullscreen-button');
  } catch (error) {
    results.push({ name: 'standalone-and-manual', pass: false, error: error.stack });
    console.log(`FAIL standalone-and-manual: ${error.message}`);
  } finally { await context.close(); }
} finally {
  await chrome.close();
  await safari.close();
  await writeFile(`${output}/browser-report.json`, JSON.stringify(results, null, 2));
}
if (results.some(result => !result.pass)) process.exitCode = 1;
