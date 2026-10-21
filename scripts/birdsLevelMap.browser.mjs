import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186';
const gameUrl = `${base}/Games/Many%20Birds%20One%20Stone/index.html`;
const output = 'output/birds-level-map';
await mkdir(output, { recursive: true });
const files = ['index.html', 'style.css', 'level-map.js', 'campaign.js', 'physics.js', 'birds.js', 'runways.js', 'drop-mechanism.js'];
const hash = createHash('sha256');
for (const file of files) hash.update(file).update(await readFile(new URL(`../public/Games/Many Birds One Stone/${file}`, import.meta.url)));
const sourceFingerprint = hash.digest('hex'), results = [];
const snapshot = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const progress = (highestUnlocked = 10, selectedLevel = 9) => ({ campaignVersion: 2, highestUnlocked, selectedLevel, onboarded: true, bestStats: Object.fromEntries([3, 2, 1, 3, 2, 3, 2, 3].slice(0, highestUnlocked - 1).map((stars, index) => [String(index + 1), { stars, points: 75 + 25 * stars, clearTimeMs: 3000 }])) });

async function setup(browser, options = {}, saved = progress(), embedded = false) {
  const context = await browser.newContext(options), page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(10000);
  await context.route('**/Many%20Birds%20One%20Stone/index.html', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('function frame(now) {', 'function frame(now) { if (window.__mapTestClockPaused) return;');
    await route.fulfill({ response, body });
  });
  await context.addInitScript(saved => {
    window.__mapTestClockPaused = true;
    if (saved && !localStorage.getItem('lahs-many-birds-one-stone-v1')) localStorage.setItem('lahs-many-birds-one-stone-v1', JSON.stringify(saved));
  }, saved);
  let surface = page;
  if (embedded) {
    await page.route('**/level-map-test-host', route => route.fulfill({ contentType: 'text/html', body: `<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style><iframe src="${gameUrl}" allow="autoplay;fullscreen"></iframe>` }));
    await page.goto(`${base}/level-map-test-host`);
    surface = page.frames().find(frame => frame.url().includes('Many%20Birds'));
  } else await page.goto(gameUrl);
  await surface.waitForFunction(() => window.render_game_to_text && document.fonts.status === 'loaded', undefined, { polling: 50 });
  await surface.evaluate(() => window.advanceTime(0));
  return { context, page, surface, errors };
}

async function record(name, run) {
  if (process.env.BIRDS_MAP_FILTER && !new RegExp(process.env.BIRDS_MAP_FILTER).test(name)) return;
  try { results.push({ name, sourceFingerprint, pass: true, ...await run() }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, sourceFingerprint, pass: false, error: error.stack }); console.log(`FAIL ${name}: ${error.message}`); }
  await writeFile(`${output}/${process.env.BIRDS_MAP_REPORT || 'browser-report'}.json`, JSON.stringify(results, null, 2));
}

async function inspectLayout(surface) {
  await surface.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const layout = await surface.evaluate(() => {
    const dialog = document.querySelector('#levelMap'), scroll = document.querySelector('#mapScroll');
    const rect = dialog.getBoundingClientRect();
    const controls = ['#closeLevelMap', '#resumeFromMap'].map(selector => {
      const element = document.querySelector(selector), r = element.getBoundingClientRect();
      return { selector, x: r.x, y: r.y, width: r.width, height: r.height, hit: element.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) };
    });
    return { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight, rect: rect.toJSON(), dialogOverflow: dialog.scrollHeight - dialog.clientHeight, scrollWidth: scroll.scrollWidth, scrollClientWidth: scroll.clientWidth, scrollHeight: scroll.scrollHeight, scrollClientHeight: scroll.clientHeight, controls, fullscreen: Boolean(document.fullscreenElement) };
  });
  assert.ok(layout.documentWidth <= layout.width + 1 && layout.documentHeight <= layout.height + 1, JSON.stringify(layout));
  assert.ok(layout.dialogOverflow <= 1 && layout.scrollWidth <= layout.scrollClientWidth + 1, JSON.stringify(layout));
  assert.ok(layout.scrollHeight > layout.scrollClientHeight, '18 stages have a deliberate, reachable scrolling region');
  assert.ok(layout.rect.x >= 0 && layout.rect.y >= 0 && layout.rect.bottom <= layout.height + 1);
  for (const control of layout.controls) assert.ok(control.width >= 44 && control.height >= 44 && control.hit, JSON.stringify(control));
  assert.equal(layout.fullscreen, false);
  return layout;
}

const chrome = await chromium.launch(), safari = await webkit.launch();
try {
  for (const [name, browser, viewport, touch] of [
    ['desktop', chrome, { width: 1440, height: 900 }, false],
    ['android-touch', chrome, { width: 393, height: 852 }, true],
    ['iphone-webkit', safari, { width: 390, height: 844 }, true],
    ['ipad-webkit', safari, { width: 1024, height: 1366 }, true],
    ['small-phone', chrome, { width: 320, height: 568 }, true],
  ]) await record(name, async () => {
    const { context, page, surface, errors } = await setup(browser, { viewport, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
    const act = locator => touch ? locator.tap() : locator.click();
    try {
      await surface.evaluate(() => { window.__manyBirdsDebug.applyStroke([{ x: 50, y: 290 }, { x: 100, y: 310 }]); window.advanceTime(1200); });
      const before = await snapshot(surface);
      const saved = await surface.evaluate(() => localStorage.getItem('lahs-many-birds-one-stone-v1'));
      await act(surface.locator('#levelMapButton'));
      assert.equal((await snapshot(surface)).mapVisible, true);
      assert.equal(await surface.locator('.map-stop').count(), 18);
      assert.equal(await surface.locator('.map-chapter').count(), 6);
      assert.equal(await surface.locator('.map-stop:disabled').count(), 8);
      assert.equal(await surface.locator('#mapProgress').textContent(), '8 / 18 cleared · 19 / 54 stars');
      assert.equal(await surface.locator('.map-stop[aria-current="step"]').getAttribute('data-level'), '8');
      assert.equal(await surface.locator('.map-stop[data-level="0"]').getAttribute('aria-label'), 'Level 1: First Feather. 3 of 3 stars. Replay.');
      const layout = await inspectLayout(surface);
      await page.screenshot({ path: `${output}/${name}-current.png` });
      await surface.evaluate(() => window.advanceTime(9000));
      const paused = await snapshot(surface);
      assert.equal(paused.elapsed, before.elapsed);
      assert.deepEqual(paused.stone, before.stone); assert.deepEqual(paused.birds, before.birds);
      await surface.locator('.map-stop[data-level="17"]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/${name}-locked.png` });
      await surface.evaluate(() => document.querySelector('.map-stop[data-level="17"]').click());
      assert.equal((await snapshot(surface)).level, 9, 'locked node cannot navigate');
      await act(surface.locator('#resumeFromMap'));
      const closed = await snapshot(surface);
      assert.equal(closed.mapVisible, false); assert.equal(closed.paused, false);
      assert.deepEqual(closed.lines, before.lines); assert.equal(closed.inkLeftRatio, before.inkLeftRatio);
      assert.equal(await surface.evaluate(() => document.activeElement.id), 'levelMapButton');
      assert.equal(await surface.evaluate(() => localStorage.getItem('lahs-many-birds-one-stone-v1')), saved);
      await surface.evaluate(() => window.advanceTime(200));
      assert.ok((await snapshot(surface)).elapsed > before.elapsed);
      await act(surface.locator('#levelMapButton'));
      await act(surface.locator('.map-stop[data-level="0"]'));
      assert.equal((await snapshot(surface)).level, 1); assert.equal((await snapshot(surface)).elapsed, 0);
      assert.equal((await snapshot(surface)).lines.length, 0); assert.equal((await snapshot(surface)).mapVisible, false);
      const after = await surface.evaluate(() => JSON.parse(localStorage.getItem('lahs-many-birds-one-stone-v1')));
      assert.equal(after.selectedLevel, 1); assert.equal(after.highestUnlocked, 10); assert.deepEqual(after.bestStats, progress().bestStats);
      // Real navigation to another document, retaining this context's existing save.
      const fresh = await context.newPage(); await fresh.goto(gameUrl);
      await fresh.waitForFunction(() => window.render_game_to_text, undefined, { polling: 50 });
      assert.equal((await snapshot(fresh)).level, 1, 'replay selection survives a fresh document');
      assert.deepEqual(await fresh.evaluate(() => JSON.parse(localStorage.getItem('lahs-many-birds-one-stone-v1')).bestStats), after.bestStats);
      await fresh.close();
      await act(surface.locator('#levelMapButton'));
      await surface.locator('.map-stop[data-level="0"]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/${name}-start.png` });
      await act(surface.locator('#closeLevelMap'));
      assert.deepEqual(errors, []);
      return { layout, nodes: 18, locked: 8, replay: true, pausePreservesLinesAndBirds: true, starsPreserved: true, input: touch ? 'synthetic browser touch' : 'mouse', physical: false };
    } finally { await context.close(); }
  });

  await record('keyboard-and-live-unlock', async () => {
    const { context, page, surface, errors } = await setup(chrome, { viewport: { width: 1366, height: 768 } }, progress(1, 1));
    try {
      await surface.locator('#levelMapButton').press('Enter');
      assert.equal(await surface.locator('.map-stop:disabled').count(), 17);
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab');
        assert.equal(await surface.evaluate(() => document.querySelector('#levelMap').contains(document.activeElement)), true);
      }
      await page.keyboard.press('Escape');
      assert.equal((await snapshot(surface)).mapVisible, false);
      assert.equal(await surface.evaluate(() => document.activeElement.id), 'levelMapButton');
      await surface.evaluate(() => {
        const level = window.WoodlandCampaign.levels[0], debug = window.__manyBirdsDebug;
        debug.moveClaw(level.hintAim); level.hint.forEach(stroke => debug.applyStroke(stroke));
        window.advanceTime(2000); debug.drop(); window.advanceTime(100);
      });
      const falling = await snapshot(surface);
      await surface.locator('#levelMapButton').click();
      await surface.evaluate(() => window.advanceTime(7000));
      assert.deepEqual((await snapshot(surface)).stone, falling.stone, 'map pauses the falling ball too');
      await surface.evaluate(() => { const now = performance.now.bind(performance); performance.now = () => now() + 20000; });
      await surface.locator('#closeLevelMap').press('Space');
      await surface.evaluate(() => window.advanceTime(12000));
      assert.equal((await snapshot(surface)).outcome, 'win');
      assert.equal((await snapshot(surface)).overlayVisible, true);
      assert.ok(await surface.evaluate(() => JSON.parse(localStorage.getItem('lahs-many-birds-one-stone-v1')).bestStats['1'].clearTimeMs < 20000), 'time on the map is excluded from clear time and ball timeout');
      await surface.locator('#resultMapButton').press('Enter');
      assert.equal(await surface.locator('.map-stop:disabled').count(), 16);
      assert.equal(await surface.locator('#mapProgress').textContent(), '1 / 18 cleared · 3 / 54 stars');
      await page.keyboard.press('Escape');
      assert.equal(await surface.evaluate(() => document.activeElement.id), 'resultMapButton');
      assert.equal((await snapshot(surface)).overlayVisible, true, 'closing map returns to the existing result');
      await surface.locator('#resultMapButton').click();
      await surface.locator('.map-stop[data-level="0"]').press('Enter');
      assert.equal((await snapshot(surface)).overlayVisible, false);
      await surface.locator('#hintButton').click();
      await surface.evaluate(() => {
        const level = window.WoodlandCampaign.levels[0]; level.hint.forEach(stroke => window.__manyBirdsDebug.applyStroke(stroke));
        window.advanceTime(2000); window.__manyBirdsDebug.drop(); window.advanceTime(12000);
      });
      await surface.locator('#resultMapButton').click();
      assert.equal(await surface.locator('#mapProgress').textContent(), '1 / 18 cleared · 3 / 54 stars', 'weaker replay preserves the best score');
      assert.deepEqual(errors, []);
      return { keyboardFocus: true, escape: true, resultReturn: true, liveUnlock: true, bestStarsPreservedOnReplay: true, fallingBallPause: true };
    } finally { await context.close(); }
  });

  await record('save-compatibility-and-completion', async () => {
    const cases = [
      { name: 'old-and-malformed-stats', saved: { ...progress(7, 7), bestStats: { 1: { points: 100 }, 2: { points: 125 }, 3: { points: 150 }, 4: null, 5: [], 6: { stars: 'bad', points: 'bad' } } }, expected: '3 / 18 cleared · 6 / 54 stars' },
      { name: 'complete', saved: { ...progress(18, 18), bestStats: Object.fromEntries(Array.from({ length: 18 }, (_, index) => [String(index + 1), { stars: 3, points: 150 }])) }, expected: '18 / 18 cleared · 54 / 54 stars' },
    ];
    for (const test of cases) {
      const { context, page, surface, errors } = await setup(chrome, { viewport: { width: 1366, height: 768 } }, test.saved);
      try {
        await surface.locator('#levelMapButton').click();
        assert.equal(await surface.locator('#mapProgress').textContent(), test.expected);
        await surface.locator('.map-stop[data-level="17"]').scrollIntoViewIfNeeded();
        if (test.name === 'complete') {
          assert.equal(await surface.locator('.map-stop:disabled').count(), 0);
          await page.screenshot({ path: `${output}/completed-campaign.png` });
          await surface.locator('.map-stop[data-level="17"]').click();
          assert.equal((await snapshot(surface)).level, 18);
        }
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
    return { oldPointOnlyScores: true, malformedStats: true, all54Stars: true, finalLevelReplay: true };
  });

  await record('iframe-pause-and-responsive-access', async () => {
    const { context, page, surface, errors } = await setup(safari, { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true }, progress(), true);
    try {
      await surface.locator('#levelMapButton').click();
      await page.evaluate(() => frames[0].postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'pause' }, location.origin));
      await surface.locator('#closeLevelMap').click();
      assert.equal((await snapshot(surface)).paused, true, 'closing the map cannot resume a host-paused game');
      const before = await snapshot(surface); await surface.evaluate(() => window.advanceTime(1000));
      assert.equal((await snapshot(surface)).elapsed, before.elapsed);
      await page.evaluate(() => frames[0].postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'resume' }, location.origin));
      await surface.waitForFunction(() => !JSON.parse(window.render_game_to_text()).paused, undefined, { polling: 50 });
      await surface.locator('#levelMapButton').click();
      const layouts = [];
      for (const viewport of [{ width: 1024, height: 768 }, { width: 844, height: 390 }, { width: 320, height: 568 }]) {
        await page.setViewportSize(viewport); layouts.push(await inspectLayout(surface));
        await surface.locator('.map-stop[data-level="17"]').scrollIntoViewIfNeeded();
      }
      await page.setViewportSize({ width: 768, height: 1024 });
      await surface.evaluate(() => { document.documentElement.style.fontSize = '150%'; });
      layouts.push(await inspectLayout(surface));
      await page.screenshot({ path: `${output}/ipad-large-text.png` });
      await surface.locator('#resumeFromMap').tap();
      assert.deepEqual(errors, []);
      return { layouts, hostPausePreserved: true, embedded: true, textScaling: '150%', physical: false };
    } finally { await context.close(); }
  });
} finally { await chrome.close(); await safari.close(); }
if (results.some(result => !result.pass)) process.exitCode = 1;
