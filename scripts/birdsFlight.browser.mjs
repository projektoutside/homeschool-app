import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.BIRDS_FLIGHT_OUTPUT || 'output/birds-flight-challenge';
const base = process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186';
const url = `${base}/Games/Many%20Birds%20One%20Stone/index.html`;
await mkdir(output, { recursive: true });
const chrome = await chromium.launch();
const safari = await webkit.launch();
const results = [];
const snapshot = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function record(name, run) {
  if (process.env.BIRDS_FLIGHT_FILTER && !new RegExp(process.env.BIRDS_FLIGHT_FILTER).test(name)) return;
  try { results.push({ name, pass: true, ...await run() }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, pass: false, error: error.stack }); console.log(`FAIL ${name}: ${error.message}`); }
  await writeFile(`${output}/${process.env.BIRDS_FLIGHT_REPORT || 'browser-report'}.json`, JSON.stringify(results, null, 2));
}
function seed(page) {
  return page.addInitScript(() => {
    localStorage.setItem('lahs-many-birds-one-stone-v1', JSON.stringify({ campaignVersion: 2, highestUnlocked: 18, selectedLevel: 7, onboarded: true, bestStats: {} }));
  });
}
try {
  for (const [name, browser, viewport, mobile, reduced] of [
    ['desktop', chrome, { width: 1440, height: 1000 }, false, false],
    ['android', chrome, { width: 393, height: 852 }, true, false],
    ['iphone-webkit', safari, { width: 390, height: 844 }, true, false],
    ['tablet-webkit', safari, { width: 1024, height: 1366 }, true, false],
    ['reduced-motion', chrome, { width: 1280, height: 900 }, false, true],
  ]) await record(name, async () => {
    const context = await browser.newContext({ viewport, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(request.url()));
    try {
      await seed(page); await page.goto(url);
      await page.waitForFunction(() => window.WoodlandBirds && window.render_game_to_text, undefined, { polling: 50 });
      await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).birdArt.loaded, undefined, { polling: 50 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => [...document.images].every(image => image.complete), undefined, { polling: 50 });
      await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
      await page.waitForTimeout(65);
      for (const phase of [0, 70, 140, 210]) {
        await page.evaluate(ms => window.advanceTime(ms), phase === 0 ? 0 : 70);
        await page.screenshot({ path: `${output}/${name}-flight-${phase}.png`, animations: 'disabled' });
      }
      const motion = await page.evaluate(() => {
        let prior = JSON.parse(window.render_game_to_text());
        const positions = prior.birds.map(bird => ({ x: bird.x, y: bird.y }));
        let maxHeadingStep = 0, maxWingStep = 0;
        const signs = new Set();
        const rig = { reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, pose: window.WoodlandBirds.prototype.pose };
        const representative = { index: 0, range: 32, speed: 1.24, phase: .3, bobAmp: 8 };
        let priorPose = rig.pose(representative, 0);
        for (let i = 1; i <= 1440; i++) {
          const pose = rig.pose(representative, i / 120);
          maxHeadingStep = Math.max(maxHeadingStep, Math.abs(pose.heading - priorPose.heading));
          maxWingStep = Math.max(maxWingStep, Math.abs(pose.wing - priorPose.wing));
          signs.add(Math.sign(pose.heading)); priorPose = pose;
        }
        const costs = [];
        for (let i = 0; i < 96; i++) {
          const start = performance.now(); window.advanceTime(1000 / 60); costs.push(performance.now() - start);
          const next = JSON.parse(window.render_game_to_text());
          next.birds.forEach((bird, j) => {
            for (const value of Object.values(bird.flight)) if (!Number.isFinite(value)) throw new Error('Invalid bird pose');
            maxHeadingStep = Math.max(maxHeadingStep, Math.abs(bird.flight.heading - prior.birds[j].flight.heading));
            maxWingStep = Math.max(maxWingStep, Math.abs(bird.flight.wing - prior.birds[j].flight.wing));
          });
          prior = next;
        }
        costs.sort((a, b) => a - b);
        return { maxHeadingStep, maxWingStep, signs: [...signs], positions, final: prior.birds,
          meanMs: costs.reduce((sum, value) => sum + value, 0) / costs.length, p95Ms: costs[Math.floor(costs.length * .95)] };
      });
      assert.ok(motion.maxHeadingStep < .12, 'analytic heading changes continuously');
      assert.ok(motion.maxWingStep < .62, 'continuous wingbeats');
      assert.ok(motion.signs.includes(-1) && motion.signs.includes(1), 'both banked directions exercised');
      assert.notDeepEqual(motion.positions, motion.final.map(({ x, y }) => ({ x, y })), 'essential target movement remains active');
      if (reduced) {
        assert.equal(motion.maxWingStep, 0);
        for (const bird of motion.final) assert.equal(bird.flight.bank + bird.flight.pitch + bird.flight.tail, 0);
      } else assert.ok(motion.maxWingStep > .1);
      assert.ok(requests.some(request => request.endsWith('/birds.js')));
      assert.equal(requests.some(request => request.includes('EnemyBird16-strip')), true, 'original bird artwork is loaded');
      const art = (await snapshot(page)).birdArt;
      assert.equal(art.source, 'EnemyBird16-strip.png'); assert.equal(art.loaded, true); assert.equal(art.interpolated, true);
      await page.evaluate(() => window.postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'pause' }, location.origin));
      await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).paused, undefined, { polling: 50 });
      const paused = await snapshot(page);
      await page.evaluate(() => window.advanceTime(1000));
      assert.deepEqual((await snapshot(page)).birds, paused.birds, 'flight freezes when host pauses');
      await page.evaluate(() => window.postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'resume' }, location.origin));
      await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).paused, undefined, { polling: 50 });
      await page.evaluate(() => window.advanceTime(100));
      assert.notDeepEqual((await snapshot(page)).birds, paused.birds, 'flight resumes');
      if (name === 'android') {
        await page.setViewportSize({ width: 852, height: 393 });
        await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).paused, undefined, { polling: 50 });
        await page.waitForTimeout(100);
        await page.setViewportSize(viewport);
        await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).paused, undefined, { polling: 50 });
      }
      if (name === 'tablet-webkit') await page.setViewportSize({ width: 1366, height: 1024 });
      const layout = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, fullscreen: Boolean(document.fullscreenElement) }));
      assert.ok(layout.scrollWidth <= layout.width + 2 && layout.scrollHeight <= layout.height + 2);
      assert.equal(layout.fullscreen, false); assert.deepEqual(errors, []);
      return { art, motion, layout, physical: false };
    } finally { await context.close(); }
  });

  await record('sprite-load-failure', async () => {
    const context = await chrome.newContext(); const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    try {
      await seed(page);
      await page.route('**/assets/birds/EnemyBird16-strip.png', route => route.abort());
      await page.goto(url);
      await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).birdArt.failed, undefined, { polling: 50 });
      const fallbackDraws = await page.evaluate(() => {
        let calls = 0; const original = window.WoodlandBirds.prototype.drawFallback;
        window.WoodlandBirds.prototype.drawFallback = function (...args) { calls++; return original.apply(this, args); };
        window.advanceTime(0); window.WoodlandBirds.prototype.drawFallback = original;
        return calls;
      });
      assert.equal(fallbackDraws, 3, 'missing artwork retains visible targets'); assert.deepEqual(errors, []);
      return { fallbackDraws, art: (await snapshot(page)).birdArt };
    } finally { await context.close(); }
  });

  await record('sprite-opacity', async () => {
    const context = await chrome.newContext(); const page = await context.newPage();
    try {
      await seed(page); await page.goto(url);
      const result = await page.evaluate(async () => {
        const rig = new window.WoodlandBirds(); await rig.ready;
        const canvas = document.createElement('canvas'); canvas.width = 180; canvas.height = 180;
        const ctx = canvas.getContext('2d');
        const bird = { index: 0, x: 80, y: 80, alive: true, range: 22, speed: 1, phase: .3, bobAmp: 8, tint: ['#c96f5e', '#7f3d35'] };
        let minAlpha = 255, opaqueSamples = 0;
        const originalPose = rig.pose.bind(rig);
        const pixels = pose => { const texture = rig.frameTexture(0, pose); return texture.getContext('2d').getImageData(0, 0, texture.width, texture.height).data; };
        for (let i = 0; i < 25; i++) {
          const pose = originalPose(bird, (i + .5) / 42);
          rig.pose = () => ({ ...pose, blend: 0 }); rig.draw(ctx, bird, 0); const first = pixels(rig.pose());
          rig.pose = () => ({ ...pose, frame: pose.nextFrame, blend: 0 }); rig.draw(ctx, bird, 0); const second = pixels(rig.pose());
          rig.pose = () => pose; rig.draw(ctx, bird, 0); const blended = pixels(rig.pose());
          for (let j = 3; j < blended.length; j += 4) {
            if (first[j] >= 252 && second[j] >= 252) { opaqueSamples++; minAlpha = Math.min(minAlpha, blended[j]); }
          }
        }
        return { minAlpha, opaqueSamples, samples: 25, loaded: rig.loaded };
      });
      assert.equal(result.loaded, true); assert.ok(result.opaqueSamples > 1000);
      assert.ok(result.minAlpha >= 250, `interpolation preserves opaque overlapping artwork: ${JSON.stringify(result)}`);
      return result;
    } finally { await context.close(); }
  });

  await record('unplanned-drops', async () => {
    const context = await chrome.newContext(); const page = await context.newPage();
    try {
      await seed(page);
      // Diagnostic copy skips painting only; the production collision/update code is unchanged.
      await page.route('**/Many%20Birds%20One%20Stone/index.html', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()).replace('function draw() {', 'function draw() { return;') });
      });
      await page.goto(url);
      await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
      await page.waitForTimeout(65);
      const levels = await page.evaluate(() => {
        const d = window.__manyBirdsDebug, results = [];
        for (let level = 0; level < 6; level++) {
          let wins = 0, attempts = 0;
          for (const aim of [54, 72, 90, 108, 132, 156, 180, 204, 234, 258, 276, 288, 306]) {
            for (const delay of [800, 1600, 2400]) {
              d.setLevel(level); d.moveClaw(aim); window.advanceTime(delay); d.drop(); window.advanceTime(18000);
              if (d.snapshot().outcome === 'win') wins++; attempts++;
            }
          }
          results.push({ level: level + 1, attempts, wins });
        }
        return results;
      });
      for (const level of levels) assert.ok(level.wins <= Math.floor(level.attempts * .2), `level ${level.level} should reward deliberate routes: ${JSON.stringify(levels)}`);
      return { levels, paintingDisabled: true };
    } finally { await context.close(); }
  });
} finally {
  await chrome.close(); await safari.close();
  await writeFile(`${output}/${process.env.BIRDS_FLIGHT_REPORT || 'browser-report'}.json`, JSON.stringify(results, null, 2));
}
if (results.some(result => !result.pass)) process.exitCode = 1;
