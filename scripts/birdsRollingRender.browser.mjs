import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = 'output/birds-rolling'; await mkdir(output, { recursive: true });
const hash = createHash('sha256');
for (const file of ['index.html', 'physics.js', 'campaign.js', 'birds.js']) hash.update(file).update(await readFile(new URL(`../public/Games/Many Birds One Stone/${file}`, import.meta.url)));
const sourceFingerprint = hash.digest('hex'), results = [];
for (const [name, engine, viewport, mobile] of [
  ['desktop', chromium, { width: 1440, height: 1000 }, false],
  ['android', chromium, { width: 393, height: 852 }, true],
  ['iphone-webkit', webkit, { width: 390, height: 844 }, true],
  ['ipad-webkit', webkit, { width: 1024, height: 1366 }, true],
  ['reduced-motion', webkit, { width: 320, height: 568 }, true],
]) {
  if (process.env.BIRDS_RENDER_FILTER && !new RegExp(process.env.BIRDS_RENDER_FILTER).test(name)) continue;
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, reducedMotion: name === 'reduced-motion' ? 'reduce' : 'no-preference' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('**/Many%20Birds%20One%20Stone/index.html', async route => {
      const response = await route.fetch();
      const body = (await response.text())
        .replaceAll('window.requestAnimationFrame(frame);', 'if (!window.__rollingManualClock) window.requestAnimationFrame(frame);')
        .replace('function exposeHooks() {', `function exposeHooks() {
          window.setupRenderScenario = () => {
            hideOverlay(); beginAttempt(true, false); state.level.birds = [];
            state.staticColliders = []; rebuildDrawnColliders();
            state.stone = {...createStone(), x: 180, y: 200, vx: 40, attached: false, active: true};
            state.runReleasedAt = performance.now(); state.lastFrame = 0; state.accumulator = 0;
          };
          window.renderRollingFrame = frame;
          window.renderRollingAt = alpha => draw(alpha);
          window.poseRollingAt = stoneRenderPose;
        `);
      await route.fulfill({ response, body });
    });
    await page.addInitScript(() => {
      window.__rollingManualClock = true;
      localStorage.setItem('lahs-many-birds-one-stone-v1', JSON.stringify({ campaignVersion: 2, highestUnlocked: 18, selectedLevel: 18, onboarded: true, bestStats: {} }));
    });
    await page.goto(`${process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186'}/Games/Many%20Birds%20One%20Stone/index.html`);
    await page.waitForFunction(() => window.poseRollingAt && JSON.parse(window.render_game_to_text()).birdArt.loaded && document.fonts.status === 'loaded', undefined, { polling: 50 });
    const motion = await page.evaluate(() => {
      const rates = [], original = window.WoodlandDropMechanism.prototype.drawStone;
      let painted;
      window.WoodlandDropMechanism.prototype.drawStone = function(ctx, stone) { painted = { x: stone.x, y: stone.y, rotation: stone.rotation }; return original.call(this, ctx, stone); };
      for (const hz of [30, 60, 120]) {
        window.setupRenderScenario(); const samples = [];
        window.renderRollingFrame(0);
        for (let frame = 1; frame <= hz / 2; frame++) { window.renderRollingFrame(frame * 1000 / hz); samples.push(painted); }
        rates.push({ hz, painted, samples, physics: JSON.parse(window.render_game_to_text()).stone });
      }
      window.setupRenderScenario(); window.advanceTime(10000);
      const resting = [0, .25, .5, .75, 1].map(alpha => { window.renderRollingAt(alpha); return painted; });
      window.WoodlandDropMechanism.prototype.drawStone = original;
      return { rates, resting };
    });
    for (const rate of motion.rates) {
      assert.ok(Math.abs(rate.painted.x - motion.rates[0].painted.x) < .01 && Math.abs(rate.painted.y - motion.rates[0].painted.y) < .1, JSON.stringify(rate));
      if (rate.hz === 120) for (let i = 4; i < rate.samples.length; i++) assert.ok(rate.samples[i].x > rate.samples[i - 1].x, '120-Hz render frames advance between 60-Hz physics ticks');
    }
    for (const pose of motion.resting) assert.deepEqual(pose, motion.resting[0], 'a resting ball never interpolates stale movement');
    await page.evaluate(() => { window.__manyBirdsDebug.setLevel(17); window.advanceTime(0); });
    await page.screenshot({ path: `${output}/${name}-playfield.png` });
    const performance = await page.evaluate(() => {
      const level = window.WoodlandCampaign.levels[17], d = window.__manyBirdsDebug;
      d.moveClaw(level.hintAim); level.hint.forEach(stroke => d.applyStroke(stroke)); window.advanceTime(2000); d.drop();
      const costs = [];
      for (let i = 0; i < 120; i++) { const start = performance.now(); window.advanceTime(1000 / 60); costs.push(performance.now() - start); }
      costs.sort((a, b) => a - b);
      return { samples: costs.length, meanMs: costs.reduce((a, b) => a + b) / costs.length, p95Ms: costs[Math.floor(costs.length * .95)], art: d.snapshot().birdArt };
    });
    assert.ok(performance.p95Ms < 16.7, JSON.stringify(performance));
    // Closing the map or resuming the host must not render an old pre-pause position.
    await page.locator('#levelMapButton').click();
    const before = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    await page.evaluate(() => window.advanceTime(1000));
    assert.deepEqual((await page.evaluate(() => JSON.parse(window.render_game_to_text()))).stone, before.stone);
    await page.locator('#closeLevelMap').click();
    assert.deepEqual(await page.evaluate(() => { const a = window.poseRollingAt(0), b = window.poseRollingAt(1); return { x: a.x - b.x, y: a.y - b.y }; }), { x: 0, y: 0 });
    assert.deepEqual(errors, []);
    results.push({ name, pass: true, sourceFingerprint, motion, performance, physical: false, time: 'synthetic frame timestamps; actual production draw and solver' });
    console.log(`PASS ${name}: 30/60/120-Hz rendering and ${performance.p95Ms.toFixed(2)} ms p95 local update/draw`);
  } catch (error) { results.push({ name, pass: false, sourceFingerprint, error: error.stack }); console.log(`FAIL ${name}: ${error.message}`); }
  finally { await browser.close(); }
  await writeFile(`${output}/${process.env.BIRDS_RENDER_REPORT || 'render-report'}.json`, JSON.stringify(results, null, 2));
}
if (results.some(result => !result.pass)) process.exitCode = 1;
