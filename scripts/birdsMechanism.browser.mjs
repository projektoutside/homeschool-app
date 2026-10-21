import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186';
const output = 'output/birds-mechanism';
await mkdir(output, { recursive: true });
const chrome = await chromium.launch({ headless: true });
const safari = await webkit.launch({ headless: true });
const results = [];
const snapshot = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const step = (page, ms) => page.evaluate(duration => window.advanceTime(duration), ms);
const filtered = name => process.env.BIRDS_MECHANISM_FILTER && !new RegExp(process.env.BIRDS_MECHANISM_FILTER).test(name);

async function freezeFrames(page) {
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  // Let the already scheduled frame finish before deterministic animation captures.
  await page.waitForTimeout(65);
}
async function capture(page, name, phase) {
  await page.screenshot({ path: `${output}/${name}-${phase}.png` });
  const canvas = await page.locator('#gameCanvas').boundingBox();
  await page.screenshot({ path: `${output}/${name}-${phase}-detail.png`, clip: { x: canvas.x, y: canvas.y, width: canvas.width, height: canvas.height * 145 / 640 } });
}

try {
  for (const [name, browser, viewport, mobile, reduced] of [
    ['desktop', chrome, { width: 1440, height: 1000 }, false, false],
    ['android', chrome, { width: 393, height: 852 }, true, false],
    ['iphone-webkit', safari, { width: 390, height: 844 }, true, false],
    ['tablet-webkit', safari, { width: 1024, height: 1366 }, true, false],
    ['small-phone', chrome, { width: 320, height: 568 }, true, false],
    ['reduced-motion', chrome, { width: 1280, height: 900 }, false, true],
  ]) {
    if (filtered(name)) continue;
    const context = await browser.newContext({ viewport, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1, reducedMotion: reduced ? 'reduce' : 'no-preference', ...(name === 'desktop' ? { recordVideo: { dir: output, size: viewport } } : {}) });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(`${base}/Games/Many%20Birds%20One%20Stone/index.html`);
      await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
      await page.evaluate(() => document.fonts.ready);
      await page.locator('#overlay').evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {}))); });
      await page.locator('#overlayPrimary').click({ timeout: 8000 });
      await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).overlayVisible);
      await freezeFrames(page);
      await capture(page, name, 'ready');
      const start = await snapshot(page);
      assert.equal(start.stone.radius, 12, 'unchanged puzzle collision radius');
      assert.equal(start.mechanism.swing, 0, 'no perpetual floating at rest');
      const canvas = await page.locator('#gameCanvas').boundingBox();
      const point = (x, y) => ({ x: canvas.x + x * canvas.width / 360, y: canvas.y + y * canvas.height / 640 });
      const grab = point(180, 33), move = point(252, 33);
      await page.mouse.move(grab.x, grab.y); await page.mouse.down();
      await page.mouse.move(move.x, move.y, { steps: 10 }); await page.mouse.up();
      await step(page, 100);
      const moving = await snapshot(page);
      assert.ok(Math.abs(moving.clawX - 252) < 2, 'carriage is draggable');
      assert.equal(moving.attached, true, 'dragging the trolley does not drop the load');
      assert.ok(reduced ? moving.mechanism.swing === 0 : Math.abs(moving.mechanism.swing) > .005, 'inertial swing follows motion preference');
      assert.ok(Math.abs(moving.stone.x - moving.mechanism.stoneX) < .02, 'stone remains attached to the moving grip');
      await capture(page, name, 'swing');
      await step(page, 1800);
      assert.ok(Math.abs((await snapshot(page)).mechanism.swing) < .001, 'suspension settles');
      await page.locator('#dropButton').click();
      assert.equal((await snapshot(page)).attached, false, 'drop remains immediate');
      await step(page, 60);
      const opening = await snapshot(page);
      assert.ok(opening.mechanism.jawOpen > .5 && opening.mechanism.jawOpen <= 1);
      assert.ok(opening.stone.y > moving.stone.y, 'load falls while fingers open');
      await capture(page, name, 'opening');
      await step(page, 120);
      const released = await snapshot(page);
      assert.equal(released.mechanism.jawOpen, 1);
      assert.ok(released.stone.y > opening.stone.y);
      await capture(page, name, 'released');

      await page.evaluate(() => window.postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'pause' }, location.origin));
      await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).paused);
      const paused = await snapshot(page);
      await step(page, 600);
      assert.deepEqual((await snapshot(page)).mechanism, paused.mechanism, 'mechanism freezes during host pause');
      assert.deepEqual((await snapshot(page)).stone, paused.stone, 'load freezes during host pause');
      await page.evaluate(() => window.postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'resume' }, location.origin));
      await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).paused);
      await page.locator('#restartButton').click();
      const reset = await snapshot(page);
      assert.equal(reset.mechanism.jawOpen, 0);
      assert.equal(reset.mechanism.releaseAge, null);
      assert.equal(reset.mechanism.swing, 0);
      assert.equal(reset.attached, true);
      await page.locator('#gameCanvas').focus(); await page.keyboard.press('d'); await step(page, 20);
      assert.equal((await snapshot(page)).clawX, 198);
      await page.keyboard.press('Space');
      assert.equal((await snapshot(page)).attached, false, 'keyboard release remains usable');
      await page.locator('#restartButton').click();
      if (mobile) {
        const ball = point(180, 92);
        await page.touchscreen.tap(ball.x, ball.y);
        assert.equal((await snapshot(page)).attached, false, 'touching the stone releases it');
        await page.locator('#restartButton').click();
      }
      const cost = await page.evaluate(() => {
        const samples = [];
        for (let i = 0; i < 120; i++) { const start = performance.now(); window.advanceTime(1000 / 60); samples.push(performance.now() - start); }
        samples.sort((a, b) => a - b);
        return { mean: samples.reduce((a, b) => a + b, 0) / samples.length, p95: samples[Math.floor(samples.length * .95)] };
      });
      const layout = await page.evaluate(() => ({ viewport: [innerWidth, innerHeight], document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight], fullscreen: Boolean(document.fullscreenElement) }));
      assert.ok(layout.document[0] <= layout.viewport[0] + 2 && layout.document[1] <= layout.viewport[1] + 2);
      assert.equal(layout.fullscreen, false);
      assert.deepEqual(errors, []);
      if (name === 'desktop') {
        // Record an uninterrupted real-time drag/release in addition to fixed-step captures.
        await page.reload(); await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
        await page.mouse.move(grab.x, grab.y); await page.mouse.down();
        await page.mouse.move(move.x, move.y, { steps: 22 }); await page.mouse.up();
        await page.waitForTimeout(500); await page.locator('#dropButton').click(); await page.waitForTimeout(900);
      }
      results.push({ name, pass: true, motion: { moving: moving.mechanism, opening: opening.mechanism, released: released.mechanism }, frameCostMs: cost, layout, physical: false });
      console.log(`PASS ${name}: draw/update mean ${cost.mean.toFixed(2)}ms, p95 ${cost.p95.toFixed(2)}ms`);
    } catch (error) {
      await page.screenshot({ path: `${output}/${name}-failure.png` });
      results.push({ name, pass: false, error: error.stack, errors });
      console.log(`FAIL ${name}: ${error.message}`);
    } finally { await context.close(); }
  }
} finally {
  await chrome.close(); await safari.close();
  await writeFile(`${output}/${process.env.BIRDS_MECHANISM_REPORT || 'browser-report'}.json`, JSON.stringify(results, null, 2));
}
if (results.some(result => !result.pass)) process.exitCode = 1;
