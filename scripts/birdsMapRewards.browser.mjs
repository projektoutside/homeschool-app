import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186';
const url = `${base}/Games/Many%20Birds%20One%20Stone/index.html`, output = 'output/birds-map-motion';
await mkdir(output, { recursive: true });
const hash = createHash('sha256');
for (const file of ['index.html', 'style.css', 'level-map.js', 'campaign.js', 'physics.js', 'birds.js', 'runways.js', 'drop-mechanism.js']) hash.update(file).update(await readFile(new URL(`../public/Games/Many Birds One Stone/${file}`, import.meta.url)));
const sourceFingerprint = hash.digest('hex'), results = [];
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function record(name, run) {
  if (process.env.BIRDS_REWARDS_FILTER && !new RegExp(process.env.BIRDS_REWARDS_FILTER).test(name)) return;
  try { results.push({ name, pass: true, sourceFingerprint, ...await run() }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, pass: false, sourceFingerprint, error: error.stack }); console.log(`FAIL ${name}: ${error.message}`); }
  await writeFile(`${output}/${process.env.BIRDS_REWARDS_REPORT || 'rewards-report'}.json`, JSON.stringify(results, null, 2));
}
async function setup(browser, options = {}, unlocked = 1) {
  const context = await browser.newContext(options), page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(10000);
  await page.route('**/Many%20Birds%20One%20Stone/index.html', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('function frame(now) {', 'function frame(now) { return;') });
  });
  await page.addInitScript(unlocked => localStorage.setItem('lahs-many-birds-one-stone-v1', JSON.stringify({ campaignVersion: 2, highestUnlocked: unlocked, selectedLevel: 1, onboarded: true, bestStats: {} })), unlocked);
  await page.goto(url);
  await page.waitForFunction(() => window.render_game_to_text && document.fonts.status === 'loaded', undefined, { polling: 50 });
  await page.evaluate(() => window.advanceTime(0));
  return { context, page, errors };
}
async function clear(page, withHint = false) {
  if (withHint) await page.locator('#hintButton').click();
  const after = await page.evaluate(() => {
    const d = window.__manyBirdsDebug, level = window.WoodlandCampaign.levels[d.snapshot().level - 1];
    d.moveClaw(level.hintAim); level.hint.forEach(stroke => d.applyStroke(stroke));
    window.advanceTime(2000); d.drop(); window.advanceTime(12000); return d.snapshot();
  });
  assert.equal(after.outcome, 'win'); assert.equal(after.stone.onFloor, true); assert.equal(after.overlayVisible, true);
}
async function mapLayout(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const report = await page.evaluate(() => {
    const dialog = document.querySelector('#levelMap'), scroll = document.querySelector('#mapScroll');
    return { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight, overflowX: scroll.scrollWidth - scroll.clientWidth, dialogOverflow: dialog.scrollHeight - dialog.clientHeight, controls: ['#closeLevelMap', '#resumeFromMap'].map(selector => {
      const e = document.querySelector(selector), r = e.getBoundingClientRect();
      return { selector, width: r.width, height: r.height, bottom: r.bottom, hit: e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) };
    }), focus: document.activeElement.dataset.level, animationNames: [...dialog.getAnimations({ subtree: true })].map(animation => animation.animationName), burstCount: dialog.querySelectorAll('.celebration-burst > span').length };
  });
  assert.ok(report.documentWidth <= report.width + 1 && report.documentHeight <= report.height + 1, JSON.stringify(report));
  assert.ok(report.overflowX <= 1 && report.dialogOverflow <= 1, JSON.stringify(report));
  for (const control of report.controls) assert.ok(control.width >= 44 && control.height >= 44 && control.hit && control.bottom <= report.height, JSON.stringify(control));
  return report;
}

const chrome = await chromium.launch(), safari = await webkit.launch();
try {
  for (const [name, browser] of [['chromium-starting-ramps', chrome], ['webkit-starting-ramps', safari]]) await record(name, async () => {
    const { context, page, errors } = await setup(browser, {}, 18);
    try {
      const drops = await page.evaluate(() => window.WoodlandCampaign.levels.map((level, index) => {
        const d = window.__manyBirdsDebug; d.setLevel(index); d.drop(); window.advanceTime(6000);
        const snapshot = d.snapshot(); return { level: index + 1, y: snapshot.stone.y, top: Math.max(...level.blockers.filter(line => Math.min(line.y1, line.y2) < 280).flatMap(line => [line.y1, line.y2]).filter(y => y < 280)), outcome: snapshot.outcome };
      }));
      for (const drop of drops) assert.ok(drop.y > drop.top + 30, JSON.stringify(drop));
      assert.deepEqual(errors, []); return { drops, stoppedAtTop: 0, physical: false };
    } finally { await context.close(); }
  });

  for (const [name, browser, viewport, touch, reduced] of [
    ['desktop-rewards', chrome, { width: 1440, height: 900 }, false, false],
    ['android-rewards', chrome, { width: 393, height: 852 }, true, false],
    ['iphone-rewards', safari, { width: 390, height: 844 }, true, false],
    ['ipad-rewards', safari, { width: 1024, height: 1366 }, true, false],
    ['small-phone-reduced-motion', chrome, { width: 320, height: 568 }, true, true],
  ]) await record(name, async () => {
    const { context, page, errors } = await setup(browser, { viewport, hasTouch: touch, isMobile: touch, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const act = locator => touch ? locator.tap() : locator.click();
    try {
      await clear(page, true);
      assert.equal(await page.locator('#resultReward strong').textContent(), 'Level 2 unlocked!');
      assert.equal(await page.locator('#resultReward .celebration-copy > span').textContent(), '+2 new stars on Level 1');
      assert.equal(await page.locator('.reward-stars .is-new-star').count(), 2);
      await act(page.locator('#resultMapButton'));
      const unlockLayout = await mapLayout(page);
      assert.equal(unlockLayout.burstCount, 10);
      assert.equal(unlockLayout.focus, '1', 'newly unlocked node receives focus');
      assert.equal(await page.locator('.map-stop.is-newly-unlocked').getAttribute('data-level'), '1');
      assert.equal(await page.locator('.map-stop[data-level="0"] .is-new-star').count(), 2);
      assert.equal(await page.locator('#mapProgress').textContent(), '1 / 18 cleared · 2 / 54 stars');
      if (reduced) assert.deepEqual(unlockLayout.animationNames, [], 'reduced motion retains static rewards without animations');
      else assert.ok(unlockLayout.animationNames.includes('woodland-hover') && unlockLayout.animationNames.includes('woodland-unlock'));
      await page.screenshot({ path: `${output}/${name}-unlock.png` });
      await page.evaluate(() => window.postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'pause' }, location.origin));
      await page.waitForFunction(() => document.querySelector('#levelMap').classList.contains('is-motion-paused'), undefined, { polling: 50 });
      assert.equal(await page.evaluate(() => document.querySelector('#levelMap').getAnimations({ subtree: true }).every(animation => ['paused', 'finished'].includes(animation.playState))), true, 'host pause also pauses map motion');
      await page.evaluate(() => window.postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'resume' }, location.origin));
      await page.waitForFunction(() => !document.querySelector('#levelMap').classList.contains('is-motion-paused'), undefined, { polling: 50 });
      // Every node remains reachable while the celebration header is present.
      await page.locator('.map-stop[data-level="17"]').scrollIntoViewIfNeeded();
      await act(page.locator('#closeLevelMap'));
      await act(page.locator('#resultMapButton'));
      assert.equal(await page.locator('#mapReward').isVisible(), false, 'reopening does not repeat consumed confetti');
      await act(page.locator('.map-stop[data-level="0"]'));
      await clear(page);
      assert.equal(await page.locator('#resultReward strong').textContent(), '1 more star!');
      assert.equal(await page.locator('#resultReward .celebration-copy > span').textContent(), '+1 new star on Level 1');
      assert.equal(await page.locator('.reward-stars .is-new-star').count(), 1);
      await act(page.locator('#resultMapButton'));
      const starLayout = await mapLayout(page);
      assert.equal(await page.locator('.map-stop.is-newly-unlocked').count(), 0);
      assert.equal(await page.locator('.map-stop[data-level="0"] .is-new-star').count(), 1);
      assert.equal(await page.locator('#mapProgress').textContent(), '1 / 18 cleared · 3 / 54 stars');
      await page.screenshot({ path: `${output}/${name}-extra-star.png` });
      if (reduced) assert.deepEqual(starLayout.animationNames, []);
      await act(page.locator('.map-stop[data-level="0"]'));
      await clear(page);
      assert.equal(await page.locator('#resultReward').isVisible(), false, 'unchanged score gets no progress celebration');
      await act(page.locator('#resultMapButton'));
      assert.equal(await page.locator('#mapReward').isVisible(), false);
      assert.equal(await page.locator('.map-stop .is-new-star').count(), 0);
      await act(page.locator('.map-stop[data-level="1"]'));
      await clear(page);
      assert.equal(await page.locator('#resultReward strong').textContent(), 'Level 3 unlocked!');
      assert.equal(await page.locator('.reward-stars .is-new-star').count(), 3, 'new result stars restart on a later clear');
      assert.deepEqual(errors, []);
      return { unlockLayout, starLayout, newUnlock: true, improvedStars: true, unchangedReplayQuiet: true, hostPause: true, reducedMotion: reduced, physical: false };
    } finally { await context.close(); }
  });
} finally { await chrome.close(); await safari.close(); }
if (results.some(result => !result.pass)) process.exitCode = 1;
