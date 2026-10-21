import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186';
const output = 'output/birds-performance-physics';
await mkdir(output, { recursive: true });
const results = [];
for (const [name, engine, viewport] of [
  ['desktop', chromium, { width: 1440, height: 1000 }],
  ['iphone-webkit', webkit, { width: 390, height: 844 }],
  ['ipad-webkit', webkit, { width: 1024, height: 1366 }],
]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    // Isolated diagnostic copy exposes setup only. Production update/collision/sleep code is unchanged.
    await page.route('**/Many%20Birds%20One%20Stone/index.html', async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace('function exposeHooks() {', `function exposeHooks() {
        window.setupPhysicsScenario = (strokes, stone) => {
          hideOverlay(); state.runEnded = true; state.pendingResult = null;
          state.level.birds = []; state.staticColliders = [];
          state.drawnStrokes = strokes.map(points => ({points, width: DRAWN_LINE_WIDTH})); rebuildDrawnColliders();
          state.stone = {...createStone(), attached: false, active: true, ...stone};
        };
        window.readPhysicsScenario = () => ({...state.stone});
      `).replace('function draw() {', 'function draw() { return;');
      await route.fulfill({ response, body });
    });
    await page.addInitScript(() => localStorage.setItem('lahs-many-birds-one-stone-v1', JSON.stringify({ campaignVersion: 2, highestUnlocked: 18, selectedLevel: 1, onboarded: true, bestStats: {} })));
    await page.goto(`${base}/Games/Many%20Birds%20One%20Stone/index.html`);
    await page.waitForFunction(() => window.setupPhysicsScenario, undefined, { polling: 50 });
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(65);
    const cases = await page.evaluate(() => {
      const results = [];
      const run = (name, strokes, stone, ms = 6000) => {
        window.setupPhysicsScenario(strokes, { x: 95, y: 260, vx: 0, vy: 0, ...stone });
        window.advanceTime(ms);
        results.push({ name, ...window.readPhysicsScenario() });
      };
      const points = Array.from({ length: 81 }, (_, i) => ({ x: 60 + i * 3, y: 300 + i * .075 }));
      run('gentle-sparse', [[points[0], points.at(-1)]]);
      run('gentle-dense', [points]);
      run('gentle-reversed', [points.slice().reverse()]);
      run('gentle-complete', [points], {}, 16000);
      run('flat-support', [[{ x: 60, y: 300 }, { x: 300, y: 300 }]]);
      run('valley-support', [[{ x: 60, y: 260 }, { x: 180, y: 350 }, { x: 300, y: 260 }]], { x: 175, y: 270 });
      run('corner-traverse', [[{ x: 60, y: 300 }, { x: 150, y: 350 }, { x: 260, y: 380 }]]);
      run('fast-floor', [], { x: 180, y: 500, vx: 0, vy: 780 });
      return results;
    });
    const [sparse, dense, reversed, complete, flat, valley, corner, floor] = cases;
    assert.ok(sparse.active && sparse.x > 180 && sparse.sleepMs === 0, 'gentle downhill motion never sleeps prematurely');
    for (const candidate of [dense, reversed]) {
      assert.ok(Math.abs(candidate.x - sparse.x) < 1e-8 && Math.abs(candidate.y - sparse.y) < 1e-8);
    }
    for (const candidate of [complete, corner, floor]) {
      assert.ok(candidate.onFloor && !candidate.active && Math.abs(candidate.y - 614) < .1, candidate.name);
    }
    assert.ok(!flat.active && flat.supported && Math.abs(flat.y - 282.5) < .1);
    assert.ok(!valley.active && valley.supported && valley.y < 334);
    assert.deepEqual(errors, []);
    results.push({ name, pass: true, cases, physical: false, paintingDisabled: true });
    console.log(`PASS ${name}: slopes, sampling, corners, true supports, floor`);
  } catch (error) {
    results.push({ name, pass: false, error: error.stack }); console.log(`FAIL ${name}: ${error.message}`);
  } finally { await browser.close(); }
}
await writeFile(`${output}/physics-browser.json`, JSON.stringify(results, null, 2));
if (results.some(result => !result.pass)) process.exitCode = 1;
