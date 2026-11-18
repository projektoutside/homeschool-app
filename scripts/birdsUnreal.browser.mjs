import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186';
const url = base + '/Games/Many%20Birds%20One%20Stone/index.html';
const output = 'output/birds-unreal';
const saveKey = 'lahs-many-birds-one-stone-v1';
const snapshot = game => game.evaluate(() => JSON.parse(window.render_game_to_text()));
const advance = (game, ms) => game.evaluate(ms => window.advanceTime(ms), ms);

const routes = [
  [180, .5, 1],
  [270, .6, 1, [[292, 290], [206, 320]]],
  [128, 1, 2, [[96, 326], [188, 360]]],
  [126, 1.2, 2, [[94, 340], [186, 374]]],
  [242, 1, 2, [[266, 244], [196, 280]], [[40, 355], [50, 400], [140, 430]]],
  [110, 1, 3, [[315, 370], [186, 406]]],
  [90, 1.2, 3, [[64, 220], [172, 258]]],
  [260, 2.4, 3, [[190, 320], [80, 355]], [[30, 380], [155, 430]]],
  [270, 1.8, 3, [[292, 170], [190, 205]], [[60, 320], [170, 356]], [[300, 462], [205, 492]]],
  [270, 5, 4, [[296, 185], [185, 225]], [[30, 350], [172, 400]], [[295, 488], [185, 518]]],
];

await mkdir(output, { recursive: true });
const hash = createHash('sha256');
for (const file of ['index.html', 'unreal-levels.js', 'menu.css', 'physics.js', 'style.css', 'drop-mechanism.js']) {
  hash.update(await readFile(new URL('../public/Games/Many Birds One Stone/' + file, import.meta.url)));
}
console.log('Game source SHA-256 ' + hash.digest('hex'));

const profiles = [
  { name: 'desktop-iframe', engine: chromium, viewport: { width: 1440, height: 900 }, embedded: true },
  { name: 'android-touch', engine: chromium, viewport: { width: 393, height: 852 }, mobile: true, touchDrawing: true },
  { name: 'iphone-webkit', engine: webkit, viewport: { width: 390, height: 844 }, mobile: true },
  { name: 'ipad-webkit', engine: webkit, viewport: { width: 1024, height: 1366 }, mobile: true },
  { name: 'small-phone-webkit', engine: webkit, viewport: { width: 320, height: 568 }, mobile: true, layoutOnly: true },
];
for (const { name, engine, viewport, mobile, embedded, touchDrawing, layoutOnly } of profiles) {
  if (process.env.BIRDS_UNREAL_FILTER && !new RegExp(process.env.BIRDS_UNREAL_FILTER).test(name)) continue;
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({ viewport, isMobile: Boolean(mobile), hasTouch: Boolean(mobile), reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.addInitScript(key => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
        campaignVersion: 2, highestUnlocked: 9, selectedLevel: 8, onboarded: true, bestStats: {},
      }));
    }, saveKey);
    // Step the production update loop deterministically while layout and pointer input run normally.
    await page.route('**/Many%20Birds%20One%20Stone/index.html', async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace('function frame(now) {', 'function frame(now) { return;');
      await route.fulfill({ response, body });
    });
    let game = page;
    if (embedded) {
      await page.route('**/birds-unreal-host', route => route.fulfill({
        contentType: 'text/html',
        body: '<style>body{margin:0}iframe{border:0;width:100vw;height:100dvh;display:block}</style>'
          + '<iframe title="Birds" src="' + url + '"></iframe>'
          + '<script>window.awards=[];addEventListener("message",event=>{if(event.source===frames[0] && event.origin===location.origin && event.data.type==="LAHS_POINTS_EARNED")awards.push(event.data)})</script>',
      }));
      await page.goto(base + '/birds-unreal-host');
      game = await (await page.locator('iframe').elementHandle()).contentFrame();
    } else await page.goto(url);
    await game.waitForFunction(() => typeof window.render_game_to_text === 'function');
    await game.evaluate(() => document.fonts.ready);

    const click = selector => mobile ? game.locator(selector).tap() : game.locator(selector).click();
    const awards = () => page.evaluate(() => window.awards ?? []);
    const save = () => game.evaluate(key => localStorage.getItem(key), saveKey);
    async function hostLifecycle(phase) {
      await page.evaluate(phase => frames[0].postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase }, location.origin), phase);
      await game.waitForFunction(paused => JSON.parse(window.render_game_to_text()).paused === paused, phase === 'pause');
    }
    const previousSave = await save();
    const canvas = game.locator('#gameCanvas');
    const session = touchDrawing ? await context.newCDPSession(page) : null;

    async function gesture(points) {
      const bounds = await canvas.boundingBox();
      const [first, ...rest] = points.map(([x, y]) => ({ x: bounds.x + x * bounds.width / 360, y: bounds.y + y * bounds.height / 640 }));
      if (session) {
        const finger = point => ({ ...point, id: 1, radiusX: 2, radiusY: 2 });
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger(first)] });
        let previous = first;
        for (const point of rest) {
          for (let i = 1; i <= 12; i++) {
            const at = { x: previous.x + (point.x - previous.x) * i / 12, y: previous.y + (point.y - previous.y) * i / 12 };
            await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [finger(at)] });
          }
          previous = point;
        }
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.move(first.x, first.y);
        await page.mouse.down();
        for (const point of rest) await page.mouse.move(point.x, point.y, { steps: 12 });
        await page.mouse.up();
      }
    }

    async function assertFit(selector) {
      const geometry = await game.locator(selector).evaluate(element => {
        const { x, y, right, bottom, height } = element.getBoundingClientRect();
        return { x, y, right, bottom, height, width: innerWidth, viewportHeight: innerHeight, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight };
      });
      assert.ok(geometry.height >= 44 && geometry.x >= 0 && geometry.y >= 0
        && geometry.right <= geometry.width + 1 && geometry.bottom <= geometry.viewportHeight + 1
        && geometry.documentWidth <= geometry.width + 1 && geometry.documentHeight <= geometry.viewportHeight + 1, selector + ' fits ' + JSON.stringify(geometry));
    }

    await assertFit('#unrealButton');
    if (layoutOnly) {
      await page.screenshot({ path: output + '/' + name + '-menu.png' });
      await page.setViewportSize({ width: 320, height: 220 });
      const menu = game.locator('#mainMenu');
      await game.waitForFunction(() => innerHeight === 220);
      const overflow = await menu.evaluate(element => ({
        vertical: element.scrollHeight - element.clientHeight,
        horizontal: element.scrollWidth - element.clientWidth,
      }));
      assert.ok(overflow.vertical > 0 && overflow.horizontal <= 1, JSON.stringify(overflow));
      await game.locator('#unrealButton').scrollIntoViewIfNeeded();
      await assertFit('#unrealButton');
      await game.locator('#menuGamesButton').scrollIntoViewIfNeeded();
      await assertFit('#menuGamesButton');
      await page.setViewportSize(viewport);
    }
    await click('#unrealButton');
    assert.equal((await snapshot(game)).stonesRemaining, 1);
    assert.equal((await snapshot(game)).totalLevels, 10);
    assert.match(await game.locator('#overlayTitle').textContent(), /Unreal Mode/);
    await assertFit('#overlayPrimary');
    if (layoutOnly) await page.screenshot({ path: output + '/' + name + '-rules.png' });
    await click('#overlayPrimary');
    await assertFit('#dropButton');
    assert.equal(await game.locator('#levelMapButton').isVisible(), false);
    assert.equal(await game.locator('#restartButton').isVisible(), false);
    assert.equal(await game.locator('#hintButton').isVisible(), false);

    if (embedded) {
      await gesture([[180, 80], [54, 80]]);
      await canvas.press('ArrowRight');
      await advance(game, 500);
      await canvas.press('Space');
      let shot = await snapshot(game);
      assert.equal(shot.stonesRemaining, 0);
      assert.equal(shot.outcome, 'running', 'zero reserve can still be saved by the stone in flight');
      await hostLifecycle('pause');
      await advance(game, 17000);
      assert.deepEqual((await snapshot(game)).stone, shot.stone, 'an iframe pause does not run down the shot');
      await hostLifecycle('resume');
      await canvas.press('r');
      await advance(game, 17000);
      shot = await snapshot(game);
      assert.equal(shot.level, 1);
      assert.equal(shot.outcome, 'lose');
      assert.match(await game.locator('#overlayTitle').textContent(), /Out of stones/);
      assert.deepEqual(await awards(), []);
      await click('#overlayPrimary');
      assert.equal((await snapshot(game)).stonesRemaining, 1);
      assert.equal((await snapshot(game)).overlayVisible, false);
    }

    let reserve = 1;
    for (const [index, [aim, delay, birds, ...strokes]] of routes.entries()) {
      const before = await snapshot(game);
      assert.equal(before.level, index + 1);
      assert.equal(before.stonesRemaining, reserve);
      assert.equal(before.birdTarget, birds);
      if (aim !== 180) await gesture([[180, 80], [aim, 80]]);
      if (embedded && index === 2) {
        await gesture([[30, 515], [70, 520]]);
        await advance(game, 1000);
        await click('#dropButton');
        await advance(game, 3000);
        const partial = await snapshot(game);
        assert.equal(partial.attached, true, 'load the next stone after a partial hit');
        assert.equal(partial.stonesRemaining, reserve, 'one hit refunds the one stone spent');
        assert.deepEqual(partial.birds.map(bird => bird.alive), [false, true]);
        assert.equal(partial.lines.length, 1, 'preserve the drawn route on reload');
        assert.equal(partial.overlayVisible, false, 'every bird is required to pass');
        await click('#clearButton');
      }
      for (const stroke of strokes) await gesture(stroke);
      await advance(game, delay * 1000);
      await click('#dropButton');
      const released = await snapshot(game);
      assert.equal(released.stonesRemaining, reserve - 1, 'one charge per drop');
      await game.locator('#dropButton').dispatchEvent('click');
      assert.equal((await snapshot(game)).stonesRemaining, reserve - 1, 'a second activation cannot spend an in-flight stone');
      await advance(game, 17000);
      reserve += embedded && index === 2 ? 0 : birds - 1;
      const after = await snapshot(game);
      assert.equal(after.outcome, 'win', name + ' level ' + (index + 1) + ': ' + JSON.stringify(after));
      assert.ok(after.birds.every(bird => !bird.alive));
      assert.equal(after.stonesRemaining, reserve);
      await assertFit('#overlayPrimary');
      if (index === 0 && layoutOnly) {
        await page.screenshot({ path: output + '/' + name + '-clear.png' });
        await page.setViewportSize({ width: 568, height: 320 });
        await game.locator('#rotateNotice.is-visible').waitFor();
        assert.equal((await snapshot(game)).paused, true);
        await assertFit('#rotateHomeButton');
        await page.setViewportSize(viewport);
        await game.locator('#rotateNotice').waitFor({ state: 'hidden' });
        await assertFit('#overlayPrimary');
        break;
      }
      if (index < routes.length - 1) {
        assert.deepEqual(await awards(), [], 'points are awarded only at the end');
        await click('#overlayPrimary');
      }
    }

    if (!layoutOnly) {
      assert.match(await game.locator('#overlayTitle').textContent(), /Unreal Mode complete/);
      assert.match(await game.locator('#overlayStats').textContent(), new RegExp('Points earned' + reserve * 100));
      await page.screenshot({ path: output + '/' + name + '-final.png' });
      await advance(game, 4000);
      if (embedded) {
        await page.waitForFunction(() => window.awards.length > 0);
        const received = await awards();
        assert.equal(received.length, 1);
        assert.equal(received[0].points, reserve * 100);
        assert.deepEqual(received[0].meta, { mode: 'unreal', levelsCleared: 10, stonesRemaining: reserve });
        await click('#overlayPrimary');
        assert.equal((await snapshot(game)).level, 1);
        assert.equal((await snapshot(game)).stonesRemaining, 1);
        await click('#homeButton');
      } else {
        await click('#overlaySecondary');
      }
      assert.equal(await save(), previousSave, 'Unreal Mode never writes campaign or shop progress');
      await click('#singlePlayerButton');
      assert.match(await game.locator('#continuePlayButton').textContent(), /Level 8/);
      await click('#continuePlayButton');
      assert.equal((await snapshot(game)).level, 8);
      assert.equal(await game.locator('#levelMapButton').isVisible(), true);
    }
    if (!layoutOnly) {
      await click('#homeButton');
      await click('#singlePlayerButton');
    } else {
      await click('#overlaySecondary');
      await click('#singlePlayerButton');
    }
    await assertFit('#impossibleButton');
    await click('#impossibleButton');
    await assertFit('#overlayPrimary');
    await advance(game, 1500);
    assert.equal((await snapshot(game)).runTimeMs, 0, 'rules do not run the clock');
    await click('#overlayPrimary');
    await gesture([[180, 80], [54, 80]]);
    await advance(game, 750);
    await click('#dropButton');
    await advance(game, 17000);
    const lost = await snapshot(game);
    assert.equal(lost.playMode, 'impossible');
    assert.equal(lost.outcome, 'lose');
    assert.equal(lost.level, 1);
    assert.equal(lost.runPoints, 0);
    assert.ok(lost.runTimeMs > 750);
    assert.match(await game.locator('#overlayTitle').textContent(), /Impossible run over/);
    assert.match(await game.locator('#overlayStats').textContent(), /Levels cleared0 \/ 10.*Score0 pts.*Time/);
    await assertFit('#overlayPrimary');
    await page.screenshot({ path: output + '/' + name + '-impossible-loss.png' });

    if (embedded) {
      await click('#overlayPrimary');
      assert.equal((await snapshot(game)).runTimeMs, 0);
      let lastScore = 0;
      let lastTime = 0;
      for (const [index, [aim, delay, , ...strokes]] of routes.entries()) {
        if (aim !== 180) await gesture([[180, 80], [aim, 80]]);
        for (const stroke of strokes) await gesture(stroke);
        await advance(game, delay * 1000);
        await click('#dropButton');
        await advance(game, 17000);
        const round = await snapshot(game);
        assert.equal(round.level, index + 1);
        assert.equal(round.outcome, 'win', 'Impossible stage ' + (index + 1));
        assert.equal(round.stonesRemaining, 0);
        assert.ok(round.runPoints > lastScore && round.runTimeMs > lastTime);
        lastScore = round.runPoints;
        lastTime = round.runTimeMs;
        if (index < routes.length - 1) await click('#overlayPrimary');
      }
      assert.match(await game.locator('#overlayTitle').textContent(), /Impossible Mode complete/);
      assert.match(await game.locator('#overlayStats').textContent(), /10 \/ 10/);
      await assertFit('#overlayPrimary');
      await page.screenshot({ path: output + '/desktop-impossible-complete.png' });
      assert.equal(await save(), previousSave);
    }
    assert.deepEqual(errors, []);
    console.log('PASS ' + name + (layoutOnly ? ' menu and first clear' : ' all 10 stages, ' + reserve * 100 + ' points'));
  } finally {
    await browser.close();
  }
}
