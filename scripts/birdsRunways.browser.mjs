import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186';
const output = 'output/birds-runways';
await mkdir(output, { recursive: true });
const chrome = await chromium.launch({ headless: true });
const safari = await webkit.launch({ headless: true });
const results = [];
const snapshot = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const step = (page, ms) => page.evaluate(duration => window.advanceTime(duration), ms);

async function draw(page, points, touchSession = null) {
  const bounds = await page.locator('#gameCanvas').boundingBox();
  const at = ([x, y]) => [bounds.x + x * bounds.width / 360, bounds.y + y * bounds.height / 640];
  if (touchSession) {
    const finger = point => { const [x, y] = at(point); return { x, y, id: 1, radiusX: 2, radiusY: 2, force: 1 }; };
    await touchSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger(points[0])] });
    for (const point of points.slice(1)) await touchSession.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [finger(point)] });
    await step(page, 16);
    await page.screenshot({ path: `${output}/android-active-drawing.png` });
    await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await step(page, 16);
    return;
  }
  await page.mouse.move(...at(points[0])); await page.mouse.down();
  for (const point of points.slice(1)) await page.mouse.move(...at(point), { steps: 5 });
  await page.mouse.up(); await step(page, 16);
}
async function floorDrop(page, forceWin = false) {
  await page.evaluate(() => window.__manyBirdsDebug.moveClaw(54));
  await step(page, 120);
  await page.locator('#dropButton').click();
  if (forceWin) await page.evaluate(() => window.__manyBirdsDebug.forceWin());
  const falling = await snapshot(page);
  assert.equal(falling.overlayVisible, false, 'flight stays visible');
  if (forceWin) assert.equal(falling.resultPending, true);
  await step(page, 600);
  assert.ok((await snapshot(page)).stone.y > falling.stone.y + 90, 'gravity continues through the scene');
  // Stop at first floor contact for an unobscured landing capture.
  for (let i = 0; i < 140 && !(await snapshot(page)).stone.onFloor; i++) await step(page, 20);
  const contact = await snapshot(page);
  assert.equal(contact.stone.onFloor, true, 'a clear route reaches the actual ground');
  assert.ok(Math.abs(contact.stone.y + contact.stone.radius - contact.floorY) < 1, 'sphere meets the image floor');
  return contact;
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
    if (process.env.BIRDS_RUNWAYS_FILTER && !new RegExp(process.env.BIRDS_RUNWAYS_FILTER).test(name)) continue;
    const context = await browser.newContext({ viewport, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(`${base}/Games/Many%20Birds%20One%20Stone/index.html`);
      await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
      await page.evaluate(() => document.fonts.ready);
      await page.locator('#overlay').evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {}))); });
      await page.locator('#overlayPrimary').click({ timeout: 8000 });
      await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
      await page.waitForTimeout(65);
      await draw(page, [[82, 156], [115, 174], [143, 196], [174, 211]], name === 'android' ? await context.newCDPSession(page) : null);
      assert.equal((await snapshot(page)).lines.length, 1);
      assert.ok((await snapshot(page)).inkLeftRatio < 1);
      await page.screenshot({ path: `${output}/${name}-runways.png` });
      const contact = await floorDrop(page);
      await page.screenshot({ path: `${output}/${name}-landing.png` });
      await step(page, 2000);
      const landed = await snapshot(page);
      assert.equal(landed.outcome, 'lose');
      assert.equal(landed.overlayVisible, true);
      assert.equal(landed.stone.active, false);
      assert.equal(landed.stone.onFloor, true);
      const storageBeforeRetry = await page.evaluate(() => JSON.parse(localStorage.getItem('lahs-many-birds-one-stone-v1')));
      assert.equal(storageBeforeRetry.highestUnlocked, 1, 'missing birds does not unlock a level');
      await page.locator('#overlayPrimary').click();
      assert.equal((await snapshot(page)).attached, true);
      assert.equal((await snapshot(page)).lines.length, 0);

      // A real solid runway must still support the ball, including above the old sleep cutoff.
      await draw(page, [[115, 200], [240, 200]]);
      await page.locator('#dropButton').click(); await step(page, 2400);
      const supported = await snapshot(page);
      assert.ok(supported.stone.y < 200 && supported.stone.y > 175, 'visible runway collision is preserved');
      assert.equal(supported.stone.onFloor, false);
      assert.equal(supported.outcome, 'lose');
      assert.equal(supported.overlayVisible, true, 'a supported stone completes the attempt without hanging forever');
      await page.locator('#overlayPrimary').click();

      // Synthetic clear tests the real post-win physics without pretending to solve a level.
      await page.evaluate(() => window.__manyBirdsDebug.moveClaw(54)); await step(page, 120);
      await page.locator('#dropButton').click();
      await page.evaluate(() => window.__manyBirdsDebug.forceWin());
      const winFlight = await snapshot(page);
      assert.equal(winFlight.outcome, 'win'); assert.equal(winFlight.resultPending, true); assert.equal(winFlight.overlayVisible, false);
      await page.evaluate(() => window.postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'pause' }, location.origin));
      await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).paused);
      const paused = await snapshot(page); await step(page, 500);
      assert.deepEqual((await snapshot(page)).stone, paused.stone);
      await page.evaluate(() => window.postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'resume' }, location.origin));
      await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).paused);
      await step(page, 3000);
      const won = await snapshot(page);
      assert.equal(won.outcome, 'win'); assert.equal(won.overlayVisible, true); assert.equal(won.stone.onFloor, true); assert.equal(won.resultPending, false);
      const progress = await page.evaluate(() => localStorage.getItem('lahs-many-birds-one-stone-v1'));
      await page.evaluate(() => window.__manyBirdsDebug.forceWin());
      assert.equal(await page.evaluate(() => localStorage.getItem('lahs-many-birds-one-stone-v1')), progress, 'round completion is idempotent');
      await page.locator('#overlaySecondary').click();
      await page.evaluate(() => window.__manyBirdsDebug.moveClaw(54)); await step(page, 120);
      await page.locator('#dropButton').click(); await page.evaluate(() => window.__manyBirdsDebug.forceWin());
      assert.equal((await snapshot(page)).resultPending, true);
      await page.locator('#restartButton').click(); await step(page, 1500);
      assert.equal((await snapshot(page)).resultPending, false, 'retry cancels a pending result');
      assert.equal((await snapshot(page)).overlayVisible, false);
      assert.equal((await snapshot(page)).attached, true);
      if (name === 'desktop') {
        await page.evaluate(() => { window.__realNow = performance.now.bind(performance); performance.now = () => window.__realNow() + 20000; });
        await page.locator('#dropButton').click(); await step(page, 100);
        assert.equal((await snapshot(page)).outcome, 'running', 'planning time does not consume the flight timeout');
        await page.evaluate(() => { performance.now = window.__realNow; });
        await page.locator('#restartButton').click();
        const levels = await page.evaluate(() => {
          const results = [];
          for (let i = 0; i < 12; i++) {
            window.__manyBirdsDebug.reset(); window.__manyBirdsDebug.forceWin(); window.__manyBirdsDebug.setLevel(i);
            const game = JSON.parse(window.render_game_to_text());
            results.push({ level: game.level, floorY: game.floorY, platforms: game.platforms });
          }
          return results;
        });
        assert.equal(new Set(levels.map(level => level.level)).size, 12);
        for (const level of levels) assert.ok(level.platforms.every(platform => platform.kind === 'blocker'), 'every collider platform has visible material');
      }
      const layout = await page.evaluate(() => ({ viewport: [innerWidth, innerHeight], document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight], fullscreen: Boolean(document.fullscreenElement) }));
      assert.ok(layout.document[0] <= layout.viewport[0] + 2 && layout.document[1] <= layout.viewport[1] + 2);
      assert.equal(layout.fullscreen, false);
      assert.deepEqual(errors, []);
      results.push({ name, pass: true, landing: contact.stone, floorY: contact.floorY, supportedY: supported.stone.y, syntheticClear: true, touchDrawing: name === 'android', layout, physical: false });
      console.log(`PASS ${name}: landed at ${contact.stone.y}, supported at ${supported.stone.y}`);
    } catch (error) {
      await page.screenshot({ path: `${output}/${name}-failure.png` });
      results.push({ name, pass: false, error: error.stack, state: await snapshot(page), errors });
      console.log(`FAIL ${name}: ${error.message}`);
    } finally { await context.close(); }
  }
} finally {
  await chrome.close(); await safari.close();
  await writeFile(`${output}/${process.env.BIRDS_RUNWAYS_REPORT || 'browser-report'}.json`, JSON.stringify(results, null, 2));
}
if (results.some(result => !result.pass)) process.exitCode = 1;
