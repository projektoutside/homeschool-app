import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = 'output/birds-rolling';
await mkdir(output, { recursive: true });
const hash = createHash('sha256');
for (const file of ['index.html', 'physics.js', 'campaign.js', 'birds.js']) hash.update(file).update(await readFile(new URL(`../public/Games/Many Birds One Stone/${file}`, import.meta.url)));
const sourceFingerprint = hash.digest('hex'), report = [];
for (const [name, engine, viewport, touch] of [
  ['desktop', chromium, { width: 1440, height: 1000 }, false],
  ['iphone-webkit', webkit, { width: 390, height: 844 }, true],
  ['ipad-webkit', webkit, { width: 1024, height: 1366 }, true],
]) {
  if (process.env.BIRDS_ROLLING_FILTER && !new RegExp(process.env.BIRDS_ROLLING_FILTER).test(name)) continue;
  const browser = await engine.launch();
  const row = { name, sourceFingerprint, physical: false };
  try {
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch }), page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('**/Many%20Birds%20One%20Stone/index.html', async route => {
      const response = await route.fetch();
      const body = (await response.text())
        .replace('function frame(now) {', 'function frame(now) { return;')
        .replace(/function draw\([^)]*\) \{/, 'function draw(alpha = 1) { return;')
        .replace('function exposeHooks() {', `function exposeHooks() {
          window.setupRollingScenario = (paths, body, hintUsed = false) => {
            hideOverlay(); beginAttempt(true, false); state.runEnded = false; state.pendingResult = null;
            state.level.birds = []; state.staticColliders = [];
            state.drawnStrokes = paths.map(points => ({points, width: DRAWN_LINE_WIDTH})); rebuildDrawnColliders();
            state.inkUsed = paths.reduce((sum, points) => sum + points.slice(1).reduce((length, p, i) => length + distance(p, points[i]), 0), 0);
            state.hintUsed = hintUsed; state.runReleasedAt = performance.now();
            state.stone = {...createStone(), attached: false, active: true, ...body};
          };
          window.readRollingBody = () => ({...state.stone});
          window.readRollingRoute = () => ({lines: state.drawnStrokes.map(stroke => stroke.points), ink: state.inkUsed, hintUsed: state.hintUsed, aim: state.clawBaseX});
        `);
      await route.fulfill({ response, body });
    });
    await page.addInitScript(() => localStorage.setItem('lahs-many-birds-one-stone-v1', JSON.stringify({ campaignVersion: 2, highestUnlocked: 18, selectedLevel: 1, onboarded: true, bestStats: {} })));
    await page.goto(`${process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186'}/Games/Many%20Birds%20One%20Stone/index.html`);
    await page.waitForFunction(() => window.setupRollingScenario, undefined, { polling: 50 });
    row.drops = await page.evaluate(() => {
      const d = window.__manyBirdsDebug, cases = [];
      for (let level = 0; level < 18; level++) for (let aim = 54; aim <= 306; aim += 18) {
        d.setLevel(level); d.moveClaw(aim); d.drop(); window.advanceTime(12000);
        const s = d.snapshot();
        cases.push({ level: level + 1, aim, stone: s.stone, outcome: s.outcome });
      }
      return cases;
    });
    row.scenarios = await page.evaluate(() => {
      const cases = [], run = (name, paths, stone, ms = 12000) => {
        window.setupRollingScenario(paths, { x: 95, y: 260, vx: 0, vy: 0, ...stone });
        window.advanceTime(ms); cases.push({ name, ...window.readRollingBody() });
      };
      run('drawn-flat', [[{ x: 60, y: 300 }, { x: 300, y: 300 }]]);
      run('separate-seam', [[{ x: 60, y: 300 }, { x: 180, y: 324 }], [{ x: 180, y: 324 }, { x: 290, y: 346 }]]);
      run('overlap-seam', [[{ x: 60, y: 300 }, { x: 210, y: 330 }], [{ x: 170, y: 322 }, { x: 290, y: 346 }]]);
      run('noisy-curve', [Array.from({ length: 80 }, (_, i) => ({ x: 60 + i * 3, y: 300 + i * .45 + Math.sin(i) * .3 }))]);
      run('wall-pocket', [[{ x: 210, y: 300 }, { x: 310, y: 320 }]], { x: 280, y: 260 });
      run('closed-valley', [[{ x: 60, y: 260 }, { x: 180, y: 350 }, { x: 300, y: 260 }]], { x: 175, y: 270 });
      run('fully-enclosed', [[{ x: 100, y: 240 }, { x: 260, y: 240 }, { x: 260, y: 380 }, { x: 100, y: 380 }, { x: 100, y: 240 }]], { x: 180, y: 290 });
      return cases;
    });
    row.recovery = await page.evaluate(() => {
      const paths = [[{ x: 60, y: 260 }, { x: 180, y: 350 }, { x: 300, y: 260 }]];
      window.setupRollingScenario(paths, { x: 175, y: 270, vx: 0, vy: 0 }, true);
      window.__manyBirdsDebug.moveClaw(126);
      const before = window.readRollingRoute(), saved = localStorage.getItem('lahs-many-birds-one-stone-v1');
      let awards = 0; window.LAHSPointsBridge.awardPoints = () => { awards++; };
      window.advanceTime(12000);
      return { before, after: window.readRollingRoute(), body: window.readRollingBody(), savedUnchanged: saved === localStorage.getItem('lahs-many-birds-one-stone-v1'), awards };
    });
    row.completedRecovery = await page.evaluate(() => {
      window.setupRollingScenario([[{ x: 60, y: 260 }, { x: 180, y: 350 }, { x: 300, y: 260 }]], { x: 175, y: 270, vx: 0, vy: 0 });
      let awards = 0; window.LAHSPointsBridge.awardPoints = () => { awards++; };
      window.__manyBirdsDebug.forceWin(); window.advanceTime(12000); window.__manyBirdsDebug.forceWin();
      return { awards, ...window.__manyBirdsDebug.snapshot() };
    });
    row.stuck = row.drops.filter(({ stone }) => !stone.onFloor);
    row.errors = errors;
    await writeFile(`${output}/${process.env.BIRDS_ROLLING_REPORT || 'browser-report'}-${name}-details.json`, JSON.stringify(row, null, 2));
    assert.equal(row.stuck.length, 0, `${row.stuck.length} fixed-rail drops did not reach the floor: ${JSON.stringify(row.stuck.slice(0, 4))}`);
    for (const scenario of row.scenarios.slice(0, 4)) assert.ok(scenario.onFloor, JSON.stringify(scenario));
    for (const scenario of row.scenarios.slice(5)) assert.ok(scenario.attached && !scenario.active, `trapped routes return to the claw: ${JSON.stringify(scenario)}`);
    assert.deepEqual(row.recovery.after, row.recovery.before, 'returning to the claw preserves lines, ink, aim and hint penalty');
    assert.ok(row.recovery.body.attached && row.recovery.savedUnchanged && row.recovery.awards === 0, 'recovery neither awards points nor changes saved progress');
    assert.ok(row.completedRecovery.outcome === 'win' && row.completedRecovery.overlayVisible && row.completedRecovery.awards === 1, 'completed trapped runs keep their win and award exactly once');
    assert.deepEqual(errors, []);
    row.pass = true; console.log(`PASS ${name}`);
  } catch (error) { row.pass = false; row.error = error.stack; console.log(`FAIL ${name}: ${error.message}`); }
  finally { await browser.close(); }
  report.push(row);
  await writeFile(`${output}/${process.env.BIRDS_ROLLING_REPORT || 'browser-report'}.json`, JSON.stringify(report, null, 2));
}
if (report.some(row => !row.pass)) process.exitCode = 1;
