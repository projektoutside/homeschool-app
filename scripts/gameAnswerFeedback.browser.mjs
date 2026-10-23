import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186';
const output = 'output/answer-feedback';
await mkdir(output, { recursive: true });
const rows = [];
const profiles = [
  ['desktop', chromium, 1440, 900],
  ['android-phone', chromium, 393, 852],
  ['iphone-webkit', webkit, 390, 844],
  ['ipad-portrait-webkit', webkit, 1024, 1366],
  ['ipad-landscape-webkit', webkit, 1366, 1024],
  ['short-phone-webkit', webkit, 568, 320],
];

async function assertCorrection(page, expected, name) {
  const feedback = page.locator('#feedback');
  await feedback.waitFor({ state: 'visible' });
  assert.ok((await feedback.textContent()).includes(`The correct answer is ${expected}.`));
  const geometry = await feedback.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => {})));
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
    const clippingAncestors = [];
    for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      const bounds = parent.getBoundingClientRect(), parentStyle = getComputedStyle(parent);
      if ((/hidden|clip/.test(parentStyle.overflowX) && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1))
        || (/hidden|clip/.test(parentStyle.overflowY) && (rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1))) {
        clippingAncestors.push(parent.id || parent.className);
      }
    }
    return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: innerWidth, height: innerHeight, clippingAncestors,
      color: style.color, position: style.position, pointerEvents: style.pointerEvents,
      documentWidth: document.documentElement.scrollWidth };
  });
  assert.equal(geometry.color, 'rgb(185, 28, 28)', 'answer text is readable red');
  assert.equal(geometry.position, 'fixed');
  assert.equal(geometry.pointerEvents, 'none', 'popup does not steal retry controls');
  assert.ok(geometry.x >= 0 && geometry.right <= geometry.width + 1 && geometry.y >= 0 && geometry.bottom <= geometry.height + 1, 'whole answer fits');
  assert.ok(geometry.documentWidth <= geometry.width + 1, 'no horizontal overflow');
  assert.deepEqual(geometry.clippingAncestors, [], 'no ancestor clips the answer text');
  await page.screenshot({ path: `${output}/${name}.png` });
  return geometry;
}

async function speech(page, text, isFinal) {
  await page.evaluate(({ text, isFinal }) => window.__speechInstances.at(-1).onresult({
    resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal })],
  }), { text, isFinal });
}

async function setupCar(page, mode = 'continuous', inputMode = 'voice') {
  await page.goto(`${base}/Games/CarKingFinal/index.html`);
  await page.waitForFunction(() => window.game?.recognition);
  return page.evaluate(({ mode, inputMode }) => {
    const game = window.game;
    game.stopListening();
    game.switchScreen('gameScreen');
    game.currentCar = [...game.carDatabase].sort((a, b) => b.name.length - a.name.length)[0];
    game.gameMode = mode;
    game.inputMode = inputMode;
    game.isGameRunning = true;
    game.isProcessingGuess = false;
    game.isListeningForAnswer = true;
    game.isAnswerAcceptanceOpen = true;
    game.score = 0;
    game.updateScore();
    if (game.voiceSystem) game.voiceSystem.enabled = false;
    document.getElementById('carImage').src = game.currentCar.images?.[0] || game.currentCar.image;
    document.getElementById('guessInput').disabled = false;
    document.getElementById('inputSection').classList.toggle('hidden', inputMode === 'choice');
    document.getElementById('choicesSection').classList.toggle('hidden', inputMode !== 'choice');
    if (inputMode === 'choice') game.generateChoices();
    return game.currentCar.name;
  }, { mode, inputMode });
}

for (const [name, engine, width, height] of profiles) {
  if (process.env.FEEDBACK_TEST_FILTER && !new RegExp(process.env.FEEDBACK_TEST_FILTER).test(name)) continue;
  const browser = await engine.launch(), context = await browser.newContext({ viewport: { width, height }, hasTouch: name !== 'desktop', isMobile: name !== 'desktop', reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await context.addInitScript(() => {
    localStorage.setItem('animalChampionSoundEnabled', 'false');
    window.__speechInstances = [];
    window.SpeechRecognition = class {
      constructor() { window.__speechInstances.push(this); }
      start() { this.onstart?.(); }
      abort() { this.onend?.(); }
    };
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [] });
  });
  try {
    await page.goto(`${base}/Games/Animal%20Champion/index.html`);
    await page.locator('#menuReveal').click();
    await page.locator('#startButton').click();
    await page.waitForFunction(() => document.getElementById('voiceAnswerPanel').dataset.listening === 'true');
    const animal = await page.evaluate(async () => {
      const { ANIMAL_DATABASE } = await import('./js/animal-data.js');
      return ANIMAL_DATABASE.find((entry) => entry.alt === document.getElementById('animalImage').alt).name;
    });
    await speech(page, 'wrong answer', false);
    assert.equal(await page.locator('#feedback').textContent(), '', 'partial speech does not reveal answers');
    await speech(page, 'wrong answer', true);
    const animalGeometry = await assertCorrection(page, animal, `animal-${name}-wrong`);
    assert.equal(await page.locator('#voiceAnswerPanel').getAttribute('data-listening'), 'true');
    await speech(page, animal, true);
    assert.equal(await page.locator('#feedback').textContent(), `Correct!! ${animal}`);
    assert.equal(await page.locator('#scoreValue').textContent(), '10');

    await page.locator('#newGameButton').click();
    assert.equal(await page.locator('#feedback').textContent(), '', 'new game clears previous popup');
    await page.locator('#inputChoice').click();
    await page.locator('#startButton').click();
    await page.locator('#choiceGrid button').first().waitFor({ state: 'visible' });
    const choice = await page.evaluate(async () => {
      const { ANIMAL_DATABASE } = await import('./js/animal-data.js');
      const correct = ANIMAL_DATABASE.find((entry) => entry.alt === document.getElementById('animalImage').alt);
      const wrong = [...document.querySelectorAll('#choiceGrid button')].find((button) => button.dataset.animalId !== correct.id);
      return { answer: correct.name, wrongId: wrong.dataset.animalId };
    });
    await page.locator(`#choiceGrid button[data-animal-id="${choice.wrongId}"]`).click();
    await assertCorrection(page, choice.answer, `animal-${name}-choice`);
    assert.equal(await page.locator('#scoreValue').textContent(), '0');

    const car = await setupCar(page);
    await speech(page, 'wrong answer', false);
    assert.equal(await page.locator('#feedback').isVisible(), false);
    await speech(page, 'wrong answer', true);
    const carGeometry = await assertCorrection(page, car, `car-${name}-wrong`);
    await speech(page, car, true);
    assert.equal(await page.locator('#feedback').textContent(), `Correct!! ${car}`);
    assert.equal(await page.locator('#scoreValue').textContent(), '10');
    if (name === 'desktop') {
      const answer = await setupCar(page, 'continuous', 'choice');
      await page.locator('#choicesSection button').filter({ hasNotText: answer }).first().click();
      await assertCorrection(page, answer, 'car-desktop-choice');
      assert.equal(await page.locator('#choicesSection button:enabled').count(), 0, 'answer locks against double taps');
      assert.equal(await page.locator('#scoreValue').textContent(), '0');
      await page.waitForFunction((previous) => window.game.currentCar.name !== previous && !window.game.isProcessingGuess, answer);
      assert.equal(await page.locator('#feedback').isVisible(), false, 'next round clears correction');
      const timeoutAnswer = await setupCar(page, 'challenger');
      await page.evaluate(() => window.game.revealAnswer());
      await assertCorrection(page, timeoutAnswer, 'car-desktop-timeout');
      await page.locator('#gameOverScreen').waitFor({ state: 'visible' });
    }
    assert.deepEqual(errors, []);
    rows.push({ name, pass: true, animalGeometry, carGeometry, syntheticSpeech: true, physicalDevice: false, errors });
    console.log(`PASS ${name}: red corrections, retry, correct feedback, choices and reset`);
  } catch (error) {
    rows.push({ name, pass: false, error: error.stack, errors });
    await page.screenshot({ path: `${output}/${name}-failure.png` });
    console.log(`FAIL ${name}: ${error.message}`);
  } finally { await browser.close(); }
}
await writeFile(`${output}/${process.env.FEEDBACK_REPORT || 'browser-report.json'}`, JSON.stringify(rows, null, 2));
if (rows.some((row) => !row.pass)) process.exitCode = 1;
