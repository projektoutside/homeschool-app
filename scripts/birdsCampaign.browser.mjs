import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = `${process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186'}/Games/Many%20Birds%20One%20Stone/index.html`;
const output = 'output/birds-campaign-design';
await mkdir(output, { recursive: true });
const results = [];
const sourceHash = createHash('sha256');
for (const file of ['index.html', 'campaign.js', 'physics.js', 'birds.js', 'runways.js', 'drop-mechanism.js', 'style.css']) {
  sourceHash.update(file).update(await readFile(new URL(`../public/Games/Many Birds One Stone/${file}`, import.meta.url)));
}
const sourceFingerprint = sourceHash.digest('hex');
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function createPage(browser, options = {}, { unlocked = false, diagnostic = false } = {}) {
  const context = await browser.newContext(options), page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  // Pause only the game's scheduler. Browser animation, layout, fonts and UI remain native.
  await page.route('**/Many%20Birds%20One%20Stone/index.html', async route => {
    const response = await route.fetch();
    let body = (await response.text()).replace('function frame(now) {', 'function frame(now) { if (window.__campaignClockPaused) return;');
    if (diagnostic) body = body.replace('function draw() {', 'function draw() { return;');
    await route.fulfill({ response, body });
  });
  await page.addInitScript(unlocked => {
    window.__campaignClockPaused = true;
    if (unlocked) localStorage.setItem('lahs-many-birds-one-stone-v1', JSON.stringify({ campaignVersion: 2, highestUnlocked: 18, selectedLevel: 1, onboarded: true, bestStats: {} }));
  }, unlocked);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).birdArt.loaded && document.fonts.status === 'loaded', undefined, { polling: 50 });
  await page.evaluate(() => window.advanceTime(0));
  return { context, page, errors };
}

async function record(name, run) {
  if (process.env.BIRDS_CAMPAIGN_FILTER && !new RegExp(process.env.BIRDS_CAMPAIGN_FILTER).test(name)) return;
  try { results.push({ name, sourceFingerprint, pass: true, ...await run() }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, sourceFingerprint, pass: false, error: error.stack }); console.log(`FAIL ${name}: ${error.message}`); }
  await writeFile(`${output}/${process.env.BIRDS_CAMPAIGN_REPORT || 'browser-report'}.json`, JSON.stringify(results, null, 2));
}

const chrome = await chromium.launch(), safari = await webkit.launch();
try {
  await record('balance-and-tolerance', async () => {
    const { context, page, errors } = await createPage(chrome, {}, { unlocked: true, diagnostic: true });
    try {
      const balance = await page.evaluate(() => {
        const levels = window.WoodlandCampaign.levels, d = window.__manyBirdsDebug, rows = [];
        const run = (index, { delay = 2, dx = 0, dy = 0, tilt = 0, aimDelta = 0, noLines = false, aim } = {}) => {
          d.setLevel(index); const level = levels[index];
          d.moveClaw(aim ?? level.hintAim + aimDelta);
          if (!noLines) level.hint.forEach(stroke => d.applyStroke(stroke.map((p, i) => ({ x: p.x + dx, y: p.y + dy + (i === stroke.length - 1 ? tilt : 0) }))));
          window.advanceTime(delay * 1000); d.drop(); window.advanceTime(12000);
          return d.snapshot();
        };
        for (let i = 0; i < levels.length; i++) {
          const reference = run(i), perturbations = [], windows = [];
          for (const variation of [{ dx: -2 }, { dx: 2 }, { dy: -2 }, { dy: 2 }, { tilt: -2 }, { tilt: 2 }, { aimDelta: -3 }, { aimDelta: 3 }]) {
            perturbations.push({ ...variation, win: run(i, variation).outcome === 'win' });
          }
          for (let delay = .8; delay <= 8; delay += .3) if (run(i, { delay }).outcome === 'win') windows.push(+delay.toFixed(1));
          let unplannedWins = 0;
          for (const aim of [54, 78, 102, 126, 150, 174, 198, 222, 246, 270, 294, 306]) for (const delay of [1, 2, 3]) {
            if (run(i, { aim, delay, noLines: true }).outcome === 'win') unplannedWins++;
          }
          rows.push({ level: i + 1, title: levels[i].title, reference: { outcome: reference.outcome, birds: reference.birds.filter(b => !b.alive).length, onFloor: reference.stone.onFloor, inkLeft: reference.inkLeftRatio }, perturbations, windows, unplannedWins, unplannedAttempts: 36 });
        }
        return rows;
      });
      for (const row of balance) {
        assert.equal(row.reference.outcome, 'win', `reference route ${row.level}`);
        assert.equal(row.reference.onFloor, true, `complete descent ${row.level}`);
        assert.ok(row.reference.inkLeft >= .4, `a three-star route exists on ${row.level}`);
        assert.ok(row.perturbations.filter(p => p.win).length >= (row.level <= 9 ? 7 : 5), `drawing tolerance ${JSON.stringify(row)}`);
        assert.ok(row.windows.length >= (row.level <= 3 ? 22 : 8), `release window ${row.level}`);
        let longest = 0, length = 0, prior = -10;
        for (const value of row.windows) { length = value - prior < .31 ? length + 1 : 1; prior = value; longest = Math.max(longest, length); }
        assert.ok(longest >= 4, `release window is broader than a split-second tap on ${row.level}`);
        assert.ok(row.unplannedWins <= 3, `route planning required on ${row.level}`);
      }
      assert.deepEqual(errors, []);
      return { balance, productionPhysics: true, paintingDisabled: true, physical: false };
    } finally { await context.close(); }
  });

  await record('hints-retry-and-resume', async () => {
    const { context, page, errors } = await createPage(chrome, {}, { unlocked: true });
    try {
      const hints = [];
      const campaign = await page.evaluate(() => window.WoodlandCampaign.levels);
      for (let index = 0; index < campaign.length; index++) {
        await page.evaluate(index => window.__manyBirdsDebug.setLevel(index), index);
        const before = await state(page);
        await page.locator('#hintButton').click();
        await page.evaluate(() => window.advanceTime(12000));
        const held = await state(page);
        assert.equal(held.hintVisible, true, 'guides stay available while planning');
        assert.equal(held.clawX, campaign[index].hintAim);
        assert.equal(held.attached, true);
        await page.locator('#restartButton').click();
        const retry = await state(page);
        assert.equal(retry.elapsed, 0); assert.equal(retry.hintUsed, false); assert.equal(retry.hintVisible, false);
        assert.deepEqual(retry.birds, before.birds, 'retry begins at the same patrol phase');
        await page.locator('#hintButton').click();
        await page.evaluate(index => window.WoodlandCampaign.levels[index].hint.forEach(stroke => window.__manyBirdsDebug.applyStroke(stroke)), index);
        if (index === 17) {
          await page.evaluate(() => window.postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'pause' }, location.origin));
          await page.waitForFunction(() => window.__manyBirdsDebug.snapshot().paused, undefined, { polling: 50 });
          const paused = await state(page); await page.evaluate(() => window.advanceTime(5000));
          assert.deepEqual((await state(page)).birds, paused.birds);
          assert.equal((await state(page)).hintVisible, true);
          await page.evaluate(() => window.postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'resume' }, location.origin));
          await page.waitForFunction(() => !window.__manyBirdsDebug.snapshot().paused, undefined, { polling: 50 });
        }
        await page.evaluate(() => window.advanceTime(2000));
        await page.locator('#dropButton').click();
        assert.equal((await state(page)).hintVisible, false);
        await page.evaluate(() => window.advanceTime(12000));
        const complete = await state(page);
        assert.equal(complete.outcome, 'win', `hint route ${index + 1}`);
        const stats = await page.evaluate(index => JSON.parse(localStorage.getItem('lahs-many-birds-one-stone-v1')).bestStats[index + 1], index);
        assert.equal(stats.stars, 2, 'the hint penalty stays transparent and consistent');
        hints.push({ level: index + 1, aligned: held.clawX, guideClear: true, stars: stats.stars });
      }
      await page.evaluate(() => window.__manyBirdsDebug.setLevel(5));
      await page.locator('#hintButton').click(); await page.locator('#dropButton').click();
      await page.evaluate(() => window.advanceTime(12000));
      assert.equal((await state(page)).outcome, 'lose');
      await page.locator('#overlaySecondary').click();
      assert.equal((await state(page)).hintUsed, true);
      await page.locator('#hintButton').click();
      assert.equal((await state(page)).hintVisible, true, 'editing a failed route can reopen its guide');
      assert.deepEqual(errors, []);
      return { hints, deterministicRetry: true, resumePreservesGuide: true, physical: false };
    } finally { await context.close(); }
  });

  await record('touch-drop-control', async () => {
    const { context, page, errors } = await createPage(chrome, { viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, { unlocked: true });
    try {
      const session = await context.newCDPSession(page);
      const box = await page.locator('#dropButton').boundingBox();
      const center = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1, radiusX: 2, radiusY: 2, force: 1 };
      const begin = () => session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [center] });
      await begin();
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...center, x: box.x - 30, y: box.y - 30 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      assert.equal((await state(page)).attached, true, 'dragging off Drop does not release');
      await begin(); await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      assert.equal((await state(page)).attached, true, 'cancelled touches do not release');
      await begin(); await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForFunction(() => !window.__manyBirdsDebug.snapshot().attached, undefined, { polling: 50 });
      await page.evaluate(() => window.advanceTime(100));
      const released = await state(page);
      await page.locator('#dropButton').dispatchEvent('click');
      assert.deepEqual((await state(page)).stone, released.stone, 'a compatibility click cannot release twice');
      await page.locator('#restartButton').click();
      await page.locator('#gameCanvas').press('Space');
      assert.equal((await state(page)).attached, false, 'keyboard release remains available');
      assert.deepEqual(errors, []);
      return { singleTap: true, cancelledAndOutsideTouchesIgnored: true, idempotent: true, keyboard: true, physical: false };
    } finally { await context.close(); }
  });

  for (const [name, browser, viewport, touch] of [
    ['desktop', chrome, { width: 1440, height: 1000 }, false],
    ['android-touch', chrome, { width: 393, height: 852 }, true],
    ['iphone-webkit', safari, { width: 390, height: 844 }, false],
    ['ipad-webkit', safari, { width: 1024, height: 1366 }, false],
  ]) await record(name, async () => {
    const mobile = name !== 'desktop';
    const { context, page, errors } = await createPage(browser, { viewport, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    const clears = [];
    try {
      await page.locator('#overlayPrimary').click();
      await page.evaluate(() => window.__manyBirdsDebug.reset());
      await page.evaluate(() => window.__manyBirdsDebug.setLevel(17));
      assert.equal((await state(page)).level, 1, 'future stages remain locked');
      const campaign = await page.evaluate(() => window.WoodlandCampaign.levels);
      const session = touch ? await context.newCDPSession(page) : null;
      async function gesture(points) {
        const bounds = await page.locator('#gameCanvas').boundingBox();
        const toScreen = p => ({ x: bounds.x + p.x * bounds.width / 360, y: bounds.y + p.y * bounds.height / 640 });
        const expanded = [points[0]];
        for (let i = 1; i < points.length; i++) for (let step = 1; step <= 12; step++) expanded.push({ x: points[i - 1].x + (points[i].x - points[i - 1].x) * step / 12, y: points[i - 1].y + (points[i].y - points[i - 1].y) * step / 12 });
        if (session) {
          const finger = p => ({ ...toScreen(p), id: 1, radiusX: 2, radiusY: 2, force: 1 });
          await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger(expanded[0])] });
          for (const p of expanded.slice(1)) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [finger(p)] });
          await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else {
          const first = toScreen(expanded[0]); await page.mouse.move(first.x, first.y); await page.mouse.down();
          for (const p of expanded.slice(1)) { const at = toScreen(p); await page.mouse.move(at.x, at.y); }
          await page.mouse.up();
        }
      }
      for (let i = 0; i < campaign.length; i++) {
        const level = campaign[i], before = await state(page);
        assert.equal(before.level, i + 1); assert.equal(before.elapsed, 0, 'every new stage has a repeatable start');
        assert.equal(before.chapter, level.chapter);
        await gesture([{ x: 180, y: 80 }, { x: level.hintAim, y: 80 }]);
        assert.ok(Math.abs((await state(page)).clawX - level.hintAim) < 1);
        for (const stroke of level.hint) await gesture(stroke);
        assert.equal((await state(page)).lines.length, level.hint.length);
        await page.evaluate(() => window.advanceTime(2000));
        if ([0, 3, 6, 11, 15, 17].includes(i)) await page.screenshot({ path: `${output}/${name}-level-${i + 1}.png`, animations: 'disabled' });
        if (touch) await page.locator('#dropButton').tap(); else await page.locator('#dropButton').click();
        await page.waitForFunction(() => !window.__manyBirdsDebug.snapshot().attached, undefined, { polling: 50 });
        const after = await page.evaluate(() => {
          for (let i = 0; i < 100; i++) {
            window.advanceTime(100);
            const snapshot = window.__manyBirdsDebug.snapshot();
            if (snapshot.overlayVisible) return snapshot;
          }
          return window.__manyBirdsDebug.snapshot();
        });
        assert.equal(after.outcome, 'win', `${name} level ${i + 1}: ${JSON.stringify(after)}`);
        assert.equal(after.birds.filter(b => b.alive).length, 0);
        assert.equal(after.stone.onFloor, true); assert.equal(after.resultPending, false);
        const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('lahs-many-birds-one-stone-v1')));
        assert.equal(progress.highestUnlocked, Math.min(18, i + 2));
        assert.equal(progress.bestStats[i + 1].stars, 3, 'the authored route earns all stars without using a hint');
        clears.push({ level: i + 1, title: level.title, birdCount: after.birdTarget, stars: progress.bestStats[i + 1].stars, inkLeft: after.inkLeftRatio });
        if ([2, 8, 17].includes(i)) await page.screenshot({ path: `${output}/${name}-chapter-${Math.floor(i / 3) + 1}.png`, animations: 'disabled' });
        if (touch) await page.locator('#overlayPrimary').tap(); else await page.locator('#overlayPrimary').press('Enter');
        await page.waitForFunction(expected => window.__manyBirdsDebug.snapshot().level === expected, i === 17 ? 1 : i + 2, { polling: 50 });
      }
      assert.equal((await state(page)).level, 1, 'campaign completion offers a fresh replay');
      const saved = await page.evaluate(() => localStorage.getItem('lahs-many-birds-one-stone-v1'));
      // A fresh document verifies persistence without repeatedly reloading a frozen scheduler.
      const fresh = await context.newPage(); await fresh.goto(url, { waitUntil: 'domcontentloaded' });
      await fresh.waitForFunction(() => window.render_game_to_text, undefined, { polling: 50 });
      assert.equal(await fresh.evaluate(() => localStorage.getItem('lahs-many-birds-one-stone-v1')), saved);
      await fresh.close();
      const layout = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, fullscreen: Boolean(document.fullscreenElement) }));
      assert.ok(layout.scrollWidth <= layout.width + 1 && layout.scrollHeight <= layout.height + 1); assert.equal(layout.fullscreen, false);
      assert.deepEqual(errors, []);
      return { clears, layout, input: touch ? 'synthetic CDP touch' : 'browser pointer', physical: false };
    } catch (error) {
      await page.screenshot({ path: `${output}/${name}-failure.png`, timeout: 2000 }).catch(() => {});
      error.message += `\n${JSON.stringify({ cleared: clears.map(c => c.level), errors })}`; throw error;
    } finally { await context.close(); }
  });
} finally { await chrome.close(); await safari.close(); }
if (results.some(result => !result.pass)) process.exitCode = 1;
