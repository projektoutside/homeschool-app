import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186';
const url = `${base}/Games/Many%20Birds%20One%20Stone/index.html`;
const key = 'lahs-many-birds-one-stone-v1';
const backupKey = `${key}:before-starter-levels`;
const output = 'output/birds-starter-levels';
await mkdir(output, { recursive: true });
const chrome = await chromium.launch({ headless: true });
const safari = await webkit.launch({ headless: true });
const results = [];
const snapshot = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const step = (page, ms) => page.evaluate(duration => window.advanceTime(duration), ms);
async function freeze(page) {
  await page.evaluate(() => {
    window.__birdsTestRequestAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = () => 0;
  });
  await page.waitForTimeout(65);
}
async function record(name, run) {
  if (process.env.BIRDS_STARTER_FILTER && !new RegExp(process.env.BIRDS_STARTER_FILTER).test(name)) return;
  try { results.push({ name, pass: true, ...await run() }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, pass: false, error: error.stack }); console.log(`FAIL ${name}: ${error.message}`); }
  await writeFile(`${output}/${process.env.BIRDS_STARTER_REPORT || 'browser-report'}.json`, JSON.stringify(results, null, 2));
}
async function runCampaign(browser, name, viewport, mobile) {
  const context = await browser.newContext({ viewport, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const clears = [];
  try {
    await page.goto(url);
    await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#overlay').evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {}))); });
    assert.match(await page.locator('#overlayStats').textContent(), /1 bird, 1 stone/);
    await page.locator('#overlayPrimary').click({ timeout: 8000 });
    await freeze(page);
    assert.equal(await page.locator('#nextLevelButton').isDisabled(), true);
    await page.evaluate(() => window.__manyBirdsDebug.setLevel(6));
    assert.equal((await snapshot(page)).level, 1, 'locked stages cannot be skipped');
    const routes = [
      { aim: 90, strokes: [[[68, 290], [154, 320]]] },
      { aim: 276, strokes: [[[292, 284], [184, 334]]] },
      { aim: 90, strokes: [[[68, 290], [142, 356]]] },
      { aim: 132, strokes: [[[96, 326], [188, 360]]] },
      { aim: 234, strokes: [[[266, 340], [174, 374]]] },
      { aim: 242, strokes: [[[266, 244], [196, 280]], [[40, 355], [50, 400], [140, 430]]] },
    ];
    for (let level = 1; level <= 6; level++) {
      const before = await snapshot(page);
      const count = level <= 3 ? 1 : 2;
      assert.equal(before.level, level); assert.equal(before.totalLevels, 18);
      assert.equal(before.birds.length, count);
      assert.equal(await page.locator('.bird-token:not([hidden])').count(), count);
      assert.equal(await page.locator('#birdProgress').textContent(), `0 / ${count} ${count === 1 ? 'bird' : 'birds'}`);
      if ([1, 4].includes(level)) {
        await step(page, 16);
        await page.screenshot({ path: `${output}/${name}-level-${level}.png`, animations: 'disabled' });
      }
      const route = routes[level - 1];
      await page.evaluate(x => window.__manyBirdsDebug.moveClaw(x), route.aim);
      // Align patrol phase across engines; initial font/load time varies.
      await step(page, Math.max(0, 1600 - (await snapshot(page)).elapsed * 1000));
      const canvas = await page.locator('#gameCanvas').boundingBox();
      for (const stroke of route.strokes) {
        const at = (x, y) => [canvas.x + x * canvas.width / 360, canvas.y + y * canvas.height / 640];
        await page.mouse.move(...at(...stroke[0])); await page.mouse.down();
        for (const next of stroke.slice(1)) await page.mouse.move(...at(...next), { steps: 16 });
        await page.mouse.up();
        await step(page, 16);
      }
      assert.equal((await snapshot(page)).lines.length, route.strokes.length);
      if (level === 3) await step(page, 2400);
      if (level === 4) await step(page, 1600);
      await page.locator('#dropButton').click();
      const after = await page.evaluate(() => {
        let snapshot;
        for (let i = 0; i < 1200; i++) { window.advanceTime(1000 / 60); snapshot = JSON.parse(window.render_game_to_text()); if (snapshot.overlayVisible) break; }
        return snapshot;
      });
      assert.equal(after.outcome, 'win', `level ${level} must clear through actual collisions: ${JSON.stringify(after)}`);
      assert.equal(after.birds.filter(bird => bird.alive).length, 0);
      assert.equal(after.overlayVisible, true);
      assert.equal(await page.locator('#birdProgress').textContent(), `${count} / ${count} ${count === 1 ? 'bird' : 'birds'}`);
      assert.match(await page.locator('#overlayBody').textContent(), new RegExp(`${count} ${count === 1 ? 'bird' : 'birds'}`));
      clears.push({ level, count, title: before.title, outcome: after.outcome, onFloor: after.stone.onFloor });
      await page.evaluate(() => { window.requestAnimationFrame = window.__birdsTestRequestAnimationFrame; });
      assert.ok(await page.locator('#overlayPrimary').isVisible());
      assert.ok(await page.locator('#overlayPrimary').isEnabled());
      await page.locator('#overlayPrimary').press('Enter');
      await page.reload();
      await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
      await page.evaluate(() => document.fonts.ready);
      await freeze(page);
    }
    const original = await snapshot(page);
    assert.equal(original.level, 7); assert.equal(original.title, 'Feather Trail'); assert.equal(original.birds.length, 3);
    assert.equal(await page.locator('.bird-token:not([hidden])').count(), 3);
    await step(page, 16);
    await page.screenshot({ path: `${output}/${name}-level-7.png`, animations: 'disabled' });
    const progress = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(progress.campaignVersion, 2); assert.equal(progress.highestUnlocked, 7);
    for (let level = 1; level <= 6; level++) assert.ok(progress.bestStats[level].points > 0);
    await page.reload(); await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
    assert.equal((await snapshot(page)).level, 7);
    const layout = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
    assert.ok(layout.scrollWidth <= layout.width + 2 && layout.scrollHeight <= layout.height + 2);
    assert.deepEqual(errors, []);
    return { clears, original: { level: original.level, title: original.title, birdCount: original.birds.length }, layout, physical: false };
  } catch (error) { await page.screenshot({ path: `${output}/${name}-failure.png` }); throw error; }
  finally { await context.close(); }
}

try {
  for (const [name, browser, viewport, mobile] of [
    ['desktop', chrome, { width: 1440, height: 1000 }, false],
    ['android', chrome, { width: 393, height: 852 }, true],
    ['iphone-webkit', safari, { width: 390, height: 844 }, true],
    ['tablet-webkit', safari, { width: 1024, height: 1366 }, true],
  ]) await record(name, () => runCampaign(browser, name, viewport, mobile));

  for (const fixture of [
    { name: 'legacy-partial', raw: JSON.stringify({ highestUnlocked: 5, selectedLevel: 2, onboarded: true, bestStats: { 1: { points: 150, stars: 3 }, 4: { points: 100, stars: 1 } } }), expected: { highest: 11, selected: 8, keys: ['7', '10'] } },
    { name: 'legacy-final', raw: JSON.stringify({ highestUnlocked: 12, selectedLevel: 12, onboarded: true, bestStats: { 12: { points: 125, stars: 2 } } }), expected: { highest: 18, selected: 18, keys: ['18'] } },
    { name: 'legacy-unplayed', raw: JSON.stringify({ highestUnlocked: 1, selectedLevel: 1, onboarded: false, bestStats: {} }), expected: { highest: 1, selected: 1, keys: [] } },
    { name: 'malformed-save', raw: '{invalid JSON', expected: { highest: 1, selected: 1, keys: [] } },
    { name: 'versioned-current', raw: JSON.stringify({ campaignVersion: 2, highestUnlocked: 5, selectedLevel: 4, onboarded: true, bestStats: { 4: { points: 125, stars: 2 } } }), expected: { highest: 5, selected: 4, keys: ['4'], backup: false } },
  ]) await record(fixture.name, async () => {
    const context = await chrome.newContext();
    const page = await context.newPage();
    try {
      await page.addInitScript(({ key, raw }) => {
        if (!sessionStorage.getItem('starter-fixture-seeded')) { localStorage.setItem(key, raw); sessionStorage.setItem('starter-fixture-seeded', '1'); }
      }, { key, raw: fixture.raw });
      await page.goto(url); await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
      const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
      assert.equal(saved.campaignVersion, 2); assert.equal(saved.highestUnlocked, fixture.expected.highest); assert.equal(saved.selectedLevel, fixture.expected.selected);
      assert.deepEqual(Object.keys(saved.bestStats), fixture.expected.keys);
      if (fixture.name === 'legacy-partial') { assert.equal(saved.bestStats[7].points, 150); assert.equal(saved.bestStats[10].stars, 1); }
      assert.equal(await page.evaluate(key => localStorage.getItem(key), backupKey), fixture.expected.backup === false ? null : fixture.raw, 'legacy records remain recoverable and current records need no migration');
      await page.reload(); await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
      assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key), saved, 'migration applies exactly once');
      return { selectedLevel: saved.selectedLevel, highestUnlocked: saved.highestUnlocked, bestStatKeys: Object.keys(saved.bestStats), backupPreserved: fixture.expected.backup !== false };
    } finally { await context.close(); }
  });

  await record('backup-write-failure', async () => {
    const context = await chrome.newContext();
    const page = await context.newPage();
    const raw = JSON.stringify({ highestUnlocked: 5, selectedLevel: 2, onboarded: true, bestStats: { 1: { points: 150 } } });
    try {
      await page.addInitScript(({ key, backupKey, raw }) => {
        if (!sessionStorage.getItem('backup-failure-seeded')) { localStorage.setItem(key, raw); sessionStorage.setItem('backup-failure-seeded', '1'); }
        const setItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (name, value) {
          if (name === backupKey) throw new DOMException('Test storage quota', 'QuotaExceededError');
          return setItem.call(this, name, value);
        };
      }, { key, backupKey, raw });
      await page.goto(url); await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
      assert.equal((await snapshot(page)).level, 8, 'converted progress remains usable in memory');
      assert.equal(await page.evaluate(key => localStorage.getItem(key), key), raw, 'failed backup never overwrites the original');
      return { originalPreserved: true, playable: true };
    } finally { await context.close(); }
  });
} finally {
  await chrome.close(); await safari.close();
  await writeFile(`${output}/${process.env.BIRDS_STARTER_REPORT || 'browser-report'}.json`, JSON.stringify(results, null, 2));
}
if (results.some(result => !result.pass)) process.exitCode = 1;
