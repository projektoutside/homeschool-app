import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186';
const output = 'output/games-v2';
await mkdir(output, { recursive: true });
const results = [];
const birdsUrl = `${base}/Games/Many%20Birds%20One%20Stone/index.html`;
const snapshot = (page) => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function record(name, run) {
  if (process.env.GAMES_TEST_FILTER && !new RegExp(process.env.GAMES_TEST_FILTER).test(name)) return;
  try { const detail = await run(); results.push({ name, status: 'pass', ...detail }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, status: 'fail', error: error.stack }); console.log(`FAIL ${name}: ${error.message}`); }
}
async function geometry(page) {
  return page.evaluate(() => ({
    viewport: [innerWidth, innerHeight],
    document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    fonts: document.fonts.check('600 18px Fredoka') && document.fonts.check('800 18px Nunito'),
    canvas: (() => { const rect = document.querySelector('canvas').getBoundingClientRect(); return { width: rect.width, height: rect.height }; })(),
  }));
}
const desktop = await chromium.launch({ headless: true, args: ['--mute-audio'] });
const safari = await webkit.launch({ headless: true });

try {
  for (const [name, engine, viewport, mobile] of [
    ['desktop', desktop, { width: 1440, height: 900 }, false],
    ['android', desktop, { width: 393, height: 852 }, true],
    ['iphone-webkit', safari, { width: 390, height: 844 }, true],
    ['tablet', safari, { width: 1024, height: 1366 }, true],
    ['small-phone', desktop, { width: 320, height: 568 }, true],
  ]) {
    await record(`birds-${name}`, async () => {
      const context = await engine.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      try {
        await page.goto(birdsUrl);
        await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `${output}/birds-${name}-intro.png` });
        await page.locator('#overlayPrimary').click();
        await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).overlayVisible);
        const layout = await geometry(page);
        assert.ok(layout.document[0] <= viewport.width + 1, 'no horizontal page overflow');
        assert.ok(layout.document[1] <= viewport.height + 1, 'no vertical page overflow');
        assert.ok(Math.abs(layout.canvas.width / layout.canvas.height - 9 / 16) < 0.005, 'undistorted playfield');
        assert.equal(layout.fonts, true, 'local display and UI fonts loaded');
        for (const id of ['homeButton', 'restartButton', 'soundButton', 'hintButton', 'dropButton']) {
          const control = page.locator(`#${id}`);
          assert.ok(await control.isVisible(), `${id} reachable`);
          const bounds = await control.boundingBox();
          assert.ok(bounds.height >= 43 && bounds.width >= 43, `${id} usable touch target`);
        }
        const canvas = await page.locator('#gameCanvas').boundingBox();
        await page.mouse.move(canvas.x + canvas.width * .23, canvas.y + canvas.height * .30);
        await page.mouse.down();
        await page.mouse.move(canvas.x + canvas.width * .65, canvas.y + canvas.height * .45, { steps: 12 });
        await page.mouse.up();
        assert.equal((await snapshot(page)).lines.length, 1, 'drawing commits one stroke');
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.screenshot({ path: `${output}/birds-${name}-play.png` });
        await page.locator('#clearButton').click();
        assert.equal((await snapshot(page)).lines.length, 0);
        await page.locator('#hintButton').click();
        assert.equal((await snapshot(page)).hintUsed, true);
        await page.locator('#dropButton').click();
        assert.equal((await snapshot(page)).attached, false);
        await page.locator('#restartButton').click();
        assert.equal((await snapshot(page)).attached, true);
        const webAudioAvailable = await page.evaluate(() => Boolean(window.AudioContext || window.webkitAudioContext));
        if (webAudioAvailable) await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).sound.loaded.length === 8, null, { timeout: 12000 });
        await page.locator('#soundButton').click();
        assert.equal((await snapshot(page)).sound.muted, true);
        await page.locator('#soundButton').click();
        assert.equal((await snapshot(page)).sound.muted, false);
        // Synthetic result for result layout/persistence, not proof of solving a level.
        await page.evaluate(() => window.__manyBirdsDebug.forceWin());
        await page.locator('#overlay').evaluate(async (element) => { await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => {}))); });
        const details = page.locator('.overlay-content');
        await details.evaluate((element) => { element.scrollTop = element.scrollHeight; });
        assert.ok(await page.locator('#overlayStats').isVisible());
        const target = (await snapshot(page)).birds.length;
        assert.equal(await page.locator('#birdProgress').textContent(), `${target} / ${target} ${target === 1 ? 'bird' : 'birds'}`);
        await details.evaluate((element) => { element.scrollTop = 0; });
        await page.screenshot({ path: `${output}/birds-${name}-result.png` });
        assert.equal(await page.locator('.reward-stars .is-earned').count(), 3);
        await page.locator('#overlayPrimary').click();
        assert.equal((await snapshot(page)).level, 2);
        await page.reload();
        await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
        assert.equal((await snapshot(page)).level, 2, 'level progress survives reload');
        if (mobile && viewport.width < 700) {
          await page.setViewportSize({ width: viewport.height, height: viewport.width });
          await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).paused);
          assert.ok(await page.locator('#rotateNotice').isVisible());
          assert.ok(await page.locator('#rotateHomeButton').isVisible());
        }
        assert.deepEqual(errors, []);
        return { layout, audioDecoded: webAudioAvailable ? 8 : 0, webAudioAvailable, audioGap: webAudioAvailable ? null : 'Installed Windows WebKit engine does not expose Web Audio; physical Safari audio remains unverified.', errors };
      } finally { await context.close(); }
    });
  }

  await record('birds-iframe-lifecycle', async () => {
    const page = await desktop.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      await page.route('**/games-v2-host', (route) => route.fulfill({ contentType: 'text/html', body: `<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style><iframe src="${birdsUrl}" allow="autoplay;fullscreen"></iframe>` }));
      await page.goto(`${base}/games-v2-host`);
      const frame = page.frames().find((frame) => frame.url().includes('Many%20Birds'));
      await frame.waitForFunction(() => typeof window.render_game_to_text === 'function');
      await frame.locator('#overlayPrimary').click();
      const send = (data) => page.evaluate((message) => frames[0].postMessage(message, location.origin), data);
      await send({ type: 'LAHS_HOST_LIFECYCLE', phase: 'pause' });
      await frame.waitForFunction(() => JSON.parse(window.render_game_to_text()).paused);
      await send({ type: 'APP_SOUND_SETTINGS_UPDATE', payload: { muted: true, sfxVolume: 0.2 } });
      await frame.waitForFunction(() => JSON.parse(window.render_game_to_text()).sound.muted);
      assert.equal((await snapshot(frame)).sound.volume, 0.2);
      await send({ type: 'LAHS_HOST_LIFECYCLE', phase: 'resume' });
      await frame.waitForFunction(() => !JSON.parse(window.render_game_to_text()).paused);
      return { pauseResume: true, hostSound: true };
    } finally { await page.close(); }
  });

  for (const [name, engine, viewport] of [['desktop', desktop, { width: 1440, height: 900 }], ['iphone-webkit', safari, { width: 390, height: 844 }]]) {
    await record(`microphone-feedback-${name}`, async () => {
      const context = await engine.newContext({ viewport, hasTouch: name !== 'desktop', isMobile: name !== 'desktop' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      try {
        await page.addInitScript(() => {
          window.__speechInstances = [];
          window.SpeechRecognition = class {
            constructor() { window.__speechInstances.push(this); }
            start() { this.onstart?.(); }
            abort() { this.onend?.(); }
          };
          if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [] });
          localStorage.setItem('animalChampionSoundEnabled', 'false');
        });
        await page.goto(`${base}/Games/Animal%20Champion/index.html`);
        await page.locator('#menuReveal').click();
        await page.locator('#startButton').click();
        await page.waitForFunction(() => document.getElementById('voiceAnswerPanel').dataset.listening === 'true', null, { timeout: 15000 });
        const animalName = await page.evaluate(async () => {
          const { ANIMAL_DATABASE } = await import('./js/animal-data.js');
          const name = ANIMAL_DATABASE.find((animal) => animal.alt === document.getElementById('animalImage').alt).name;
          const recognition = window.__speechInstances.at(-1);
          recognition.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'unrelated words' }], { isFinal: true })] });
          const parts = name.split(' ');
          const results = parts.map((part) => Object.assign([{ transcript: part }], { isFinal: true }));
          recognition.onresult({ resultIndex: results.length - 1, results });
          recognition.onresult({ resultIndex: results.length - 1, results });
          return name;
        });
        assert.equal(await page.locator('#feedback').textContent(), `Correct!! ${animalName}`);
        assert.equal(await page.locator('#scoreValue').textContent(), '10');
        const animalBounds = await page.locator('#feedback').boundingBox();
        assert.ok(animalBounds.x >= 0 && animalBounds.x + animalBounds.width <= viewport.width + 1);
        await page.locator('#feedback').evaluate(async (element) => { await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => {}))); });
        await page.screenshot({ path: `${output}/animal-${name}-correct.png` });
        await page.goto(`${base}/Games/CarKingFinal/index.html`);
        await page.waitForFunction(() => window.game && window.game.recognition);
        const carName = await page.evaluate(() => {
          const game = window.game;
          game.switchScreen('gameScreen');
          game.currentCar = game.carDatabase.find((car) => car.name.split(' ').length >= 2);
          game.isGameRunning = true;
          game.isProcessingGuess = false;
          game.isListeningForAnswer = true;
          game.isAnswerAcceptanceOpen = true;
          if (game.voiceSystem) game.voiceSystem.enabled = false;
          const image = document.getElementById('carImage');
          image.src = game.currentCar.images?.[0] || game.currentCar.image;
          document.getElementById('guessInput').disabled = false;
          const parts = game.currentCar.name.split(' ');
          const event = { resultIndex: parts.length - 1, results: parts.map((part) => Object.assign([{ transcript: part }], { isFinal: true })) };
          game.recognition.onresult(event);
          return game.currentCar.name;
        });
        await page.locator('#feedback').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#feedback').textContent(), `Correct!! ${carName}`);
        const carBounds = await page.locator('#feedback').boundingBox();
        assert.ok(carBounds.x >= 0 && carBounds.x + carBounds.width <= viewport.width + 1);
        await page.locator('#feedback').evaluate(async (element) => { await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => {}))); });
        await page.screenshot({ path: `${output}/car-${name}-correct.png` });
        assert.deepEqual(errors, []);
        return { animalName, carName, syntheticSpeech: true, actualMicrophone: false, errors };
      } finally { await context.close(); }
    });
  }

  await record('write-math-simultaneous-touch', async () => {
    const context = await desktop.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.addInitScript(() => {
        window.__listenerCounts = {};
        const add = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function (type, ...args) {
          if (this.id && /p[12]-(work-)?canvas/.test(this.id)) {
            const key = `${this.id}:${type}`;
            window.__listenerCounts[key] = (window.__listenerCounts[key] || 0) + 1;
          }
          return add.call(this, type, ...args);
        };
      });
      await page.goto(`${base}/Games/2PlayersMathWrite/index.html`);
      await page.locator('#vs-mode-btn').click();
      // Avoid external digit-model loading in a test concerned specifically with input.
      await page.evaluate(() => { window.hm_warmup = async () => {}; });
      await page.evaluate(() => startVsGame());
      await page.waitForFunction(() => document.querySelector('#p1-canvas').width > 100);
      // Recognition is explicitly synthetic; hold it pending to exercise stale-result protection.
      await page.evaluate(() => {
        window.__pendingRecognition = [];
        window.hm_recognizeMultiDigitFromCanvas = () => new Promise((resolve) => window.__pendingRecognition.push(resolve));
        window.hm_recognizeDigitMLFromCanvas = async () => null;
      });
      const a = await page.locator('#p1-canvas').boundingBox();
      const b = await page.locator('#p2-canvas').boundingBox();
      const session = await context.newCDPSession(page);
      const finger = (id, rect, dx = 0) => ({ id, x: rect.x + rect.width * .4 + dx, y: rect.y + rect.height * .5, radiusX: 2, radiusY: 2, force: 1 });
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger(1, a), finger(2, b)] });
      for (let dx = 4; dx <= 32; dx += 4) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [finger(1, a, dx), finger(2, b, -dx)] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      const ink = () => page.evaluate(() => ['p1-canvas', 'p2-canvas'].map((id) => {
        const canvas = document.getElementById(id), pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let n = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) n++; return n;
      }));
      assert.ok((await ink()).every((n) => n > 10), 'both players draw at once');
      assert.equal(await page.evaluate(() => visualViewport.scale), 1, 'simultaneous touches did not zoom');
      await page.waitForFunction(() => window.__pendingRecognition.length === 2);
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger(3, a, 60)] });
      const before = (await ink())[0];
      await page.evaluate(() => window.__pendingRecognition.forEach((resolve) => resolve('wrong')));
      await page.waitForTimeout(60);
      assert.equal((await ink())[0], before, 'old recognition did not erase a new stroke');
      await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      await page.screenshot({ path: `${output}/write-math-tablet.png` });
      await page.evaluate(() => { endVsGame(true); startVsGame(); endVsGame(true); startVsGame(); });
      const registrations = await page.evaluate(() => window.__listenerCounts);
      for (const id of ['p1-canvas', 'p2-canvas', 'p1-work-canvas', 'p2-work-canvas']) assert.equal(registrations[`${id}:pointerdown`], 1, `${id} listeners do not stack across matches`);
      assert.deepEqual(errors, []);
      return { registrations, gestureScale: 1, staleResultPreserved: true, errors };
    } finally { await context.close(); }
  });
} finally {
  await desktop.close();
  await safari.close();
  await writeFile(`${output}/${process.env.GAMES_REPORT || 'browser-report'}.json`, JSON.stringify(results, null, 2));
}
if (results.some((result) => result.status !== 'pass')) process.exitCode = 1;
