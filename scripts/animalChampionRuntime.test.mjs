import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const controllerUrl = new URL('../public/Games/Animal Champion/js/game.js', import.meta.url);

const REQUIRED_IDS = [
  'menuReveal',
  'menuPanel',
  'modeChallenger',
  'modeContinuous',
  'startButton',
  'countdownScreen',
  'countdownValue',
  'gameScreen',
  'scoreValue',
  'streakValue',
  'soundToggle',
  'newGameButton',
  'animalBackdrop',
  'animalImage',
  'timerBar',
  'timerRegion',
  'choiceGrid',
  'feedback',
  'gameOverScreen',
  'finalScore',
  'leaderboard',
  'playAgainButton',
  'mainMenuButton',
  'errorScreen',
  'errorMessage',
  'retryButton',
  'errorMenuButton',
];

const CONTROL_IDS = [
  'menuReveal',
  'modeChallenger',
  'modeContinuous',
  'startButton',
  'soundToggle',
  'newGameButton',
  'playAgainButton',
  'mainMenuButton',
  'retryButton',
  'errorMenuButton',
];

const HIDDEN_IDS = [
  'menuPanel',
  'countdownScreen',
  'gameScreen',
  'gameOverScreen',
  'errorScreen',
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function openingTagById(html, id) {
  const match = html.match(new RegExp(`<([a-z][\\w-]*)\\b[^>]*\\bid="${escapeRegExp(id)}"[^>]*>`, 'i'));
  assert.ok(match, `expected an opening tag with id="${id}"`);
  return { name: match[1].toLowerCase(), source: match[0] };
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${escapeRegExp(name)}="([^"]*)"`, 'i'))?.[1] ?? null;
}

function cssRule(css, selector) {
  const match = css.match(new RegExp(`(?:^|})\\s*${escapeRegExp(selector)}\\s*\\{([^}]*)}`, 'm'));
  assert.ok(match, `expected CSS rule for ${selector}`);
  return match[1];
}

function mediaBlock(css, header) {
  const marker = `@media ${header}`;
  const markerIndex = css.indexOf(marker);
  assert.notEqual(markerIndex, -1, `expected ${marker}`);
  const openingBrace = css.indexOf('{', markerIndex + marker.length);
  let depth = 0;
  for (let index = openingBrace; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') depth -= 1;
    if (depth === 0) return css.slice(openingBrace + 1, index);
  }
  assert.fail(`unclosed ${marker}`);
}

function controllerMethod(source, name) {
  const declaration = new RegExp(`^  (?:async )?${escapeRegExp(name)}\\([^\\n]*\\) \\{`, 'm');
  const match = declaration.exec(source);
  assert.ok(match, `expected controller method ${name}`);
  const bodyStart = match.index + match[0].length;
  const nextMethod = /^  (?:async )?[a-z][\w]*\([^\n]*\) \{/m.exec(source.slice(bodyStart));
  return source.slice(match.index, nextMethod ? bodyStart + nextMethod.index : source.length);
}

function assertEveryAwaitIsTokenGuarded(source, methodName) {
  const method = controllerMethod(source, methodName);
  const awaits = [...method.matchAll(/await\s+[^;]+;/g)];
  assert.ok(awaits.length > 0, `expected ${methodName} to have an async boundary`);
  for (const match of awaits) {
    const continuation = method.slice((match.index ?? 0) + match[0].length);
    assert.match(
      continuation,
      /^\s*if \(!this\.isCurrent\(runToken, roundToken\)\) return(?: null)?;/,
      `${methodName} must check both tokens immediately after ${match[0]}`,
    );
  }
}

const HARNESS_IDS = [...new Set(['menuScreen', ...REQUIRED_IDS])];

class FakeElement {
  constructor(id, ownerDocument) {
    this.id = id;
    this.ownerDocument = ownerDocument;
    this.hidden = false;
    this.disabled = false;
    this.type = '';
    this.alt = '';
    this.src = '';
    this.dataset = {};
    this.style = {};
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.textWrites = [];
    this._textContent = '';
  }

  set textContent(value) {
    this._textContent = String(value);
    this.textWrites.push(String(value));
  }

  get textContent() {
    return this._textContent;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === 'src') this.src = '';
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  append(...children) {
    this.children.push(...children);
  }

  querySelectorAll(selector) {
    if (selector === 'button') return this.children.filter((child) => child.type === 'button');
    return [];
  }
}

class FakeDocument {
  constructor({ omitIds = [] } = {}) {
    this.hidden = false;
    this.activeElement = null;
    this.listeners = new Map();
    this.body = new FakeElement('body', this);
    this.elements = new Map(
      HARNESS_IDS
        .filter((id) => !omitIds.includes(id))
        .map((id) => [id, new FakeElement(id, this)]),
    );
  }

  getElementById(id) {
    return this.elements.get(id) ?? null;
  }

  querySelectorAll(selector) {
    if (selector !== '.screen') return [];
    return ['menuScreen', 'countdownScreen', 'gameScreen', 'gameOverScreen', 'errorScreen']
      .map((id) => this.getElementById(id))
      .filter(Boolean);
  }

  createElement(tagName) {
    const element = new FakeElement('', this);
    element.tagName = tagName.toUpperCase();
    return element;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

function createFakeWindow({ ImageClass, localStorage, pointsBridge } = {}) {
  let now = 0;
  let nextFrameId = 1;
  let nextTimerId = 1;
  const frames = new Map();
  const cancelledFrames = [];
  const timers = new Map();
  const listeners = new Map();
  const storageValues = new Map();

  class DefaultImage {
    async decode() {}
  }

  const window = {
    AbortController,
    Image: ImageClass ?? DefaultImage,
    LAHSPointsBridge: pointsBridge,
    performance: { now: () => now },
    localStorage: localStorage ?? {
      getItem: (key) => storageValues.get(key) ?? null,
      setItem: (key, value) => storageValues.set(key, value),
    },
    requestAnimationFrame(callback) {
      const id = nextFrameId;
      nextFrameId += 1;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      cancelledFrames.push(id);
      frames.delete(id);
    },
    setTimeout(callback, delay) {
      const id = nextTimerId;
      nextTimerId += 1;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    addEventListener(type, listener) {
      const registered = listeners.get(type) ?? [];
      registered.push(listener);
      listeners.set(type, registered);
    },
  };

  return {
    window,
    frames,
    timers,
    cancelledFrames,
    setNow(value) {
      now = value;
    },
    stepAnimationFrame(value) {
      now = value;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(value));
    },
    flushTimers() {
      const callbacks = [...timers.values()].map((timer) => timer.callback);
      timers.clear();
      callbacks.forEach((callback) => callback());
    },
  };
}

async function createControllerHarness(options = {}) {
  const controllerModule = await import(controllerUrl.href);
  const document = new FakeDocument(options.document);
  const fakeWindow = createFakeWindow(options.window);
  const controller = new controllerModule.AnimalChampionController({
    document,
    window: fakeWindow.window,
  });
  return { controllerModule, controller, document, ...fakeWindow };
}

const FIXED_ROUND = Object.freeze({
  roundId: 'round-harness',
  correctAnimalId: 'bat',
  choiceIds: ['bat', 'bear', 'camel', 'cat'],
  imageOrder: ['Animals/Bat/first.webp', 'Animals/Bat/second.webp'],
});

test('Animal Champion shell has the exact stable semantic contract', async () => {
  const html = await read('public/Games/Animal Champion/index.html');

  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/);
  assert.doesNotMatch(html, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i);

  for (const id of REQUIRED_IDS) {
    const matches = html.match(new RegExp(`\\bid="${escapeRegExp(id)}"`, 'g')) ?? [];
    assert.equal(matches.length, 1, `expected id="${id}" exactly once`);
  }

  for (const id of CONTROL_IDS) {
    const tag = openingTagById(html, id);
    assert.equal(tag.name, 'button', `expected ${id} to be a native button`);
    assert.equal(attribute(tag.source, 'type'), 'button', `expected ${id} to declare type="button"`);
  }

  for (const id of HIDDEN_IDS) {
    assert.match(openingTagById(html, id).source, /\shidden(?:\s|>)/i, `expected ${id} to start hidden`);
  }

  assert.match(openingTagById(html, 'feedback').source, /\baria-live="polite"/i);
  assert.match(openingTagById(html, 'timerRegion').source, /\brole="progressbar"/i);
  assert.equal(
    attribute(openingTagById(html, 'countdownScreen').source, 'tabindex'),
    '-1',
    'expected the countdown screen to accept programmatic focus',
  );

  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map((match) => match[1]);
  assert.equal(scripts.length, 2, 'expected the bridge followed by the module controller');
  assert.deepEqual(scripts.map((tag) => attribute(tag, 'src')), [
    '../shared/lahsPointsBridge.js',
    './js/game.js',
  ]);
  assert.equal(attribute(scripts[0], 'type'), null, 'expected the shared bridge to load as a classic script');
  assert.equal(attribute(scripts[1], 'type'), 'module', 'expected the controller to load as a module');

  const links = [...html.matchAll(/<link\b([^>]*)>/gi)].map((match) => match[1]);
  assert.equal(links.length, 2, 'expected local icon and stylesheet dependencies');
  assert.deepEqual(links.map((tag) => [attribute(tag, 'rel'), attribute(tag, 'href')]), [
    ['icon', 'assets/images/ui/thumb.webp'],
    ['stylesheet', 'css/style.css'],
  ]);

  assert.doesNotMatch(html, /<(?:audio|input|textarea)\b/i);
  assert.doesNotMatch(html, /\b(?:microphone|speech|fullscreen|requestFullscreen|webkitRequestFullscreen|settings?)\b/i);
  assert.doesNotMatch(html, /\b(?:src|href)="https?:\/\//i);
});

test('Animal Champion controller exposes the playable runtime contract', async () => {
  const game = await read('public/Games/Animal Champion/js/game.js');
  const controllerModule = await import(`${controllerUrl.href}?contract=${Date.now()}`);

  assert.equal(typeof controllerModule.AnimalChampionController, 'function');
  const methods = Object.getOwnPropertyNames(controllerModule.AnimalChampionController.prototype).sort();
  assert.deepEqual(methods, [
    'acceptChoice',
    'beginRound',
    'beginFreshRun',
    'constructor',
    'delay',
    'finishFeedback',
    'handleTimeout',
    'invalidateRun',
    'isCurrent',
    'lockChoices',
    'loadImageCandidate',
    'mainMenu',
    'playAgain',
    'readLeaderboard',
    'renderChoices',
    'renderFeedback',
    'renderLeaderboard',
    'resetRoundView',
    'retry',
    'saveLeaderboard',
    'revealMenu',
    'scheduleFeedbackCompletion',
    'selectMode',
    'showScreen',
    'showFatalError',
    'showGameOver',
    'start',
    'startCountdown',
    'startRun',
    'teardown',
    'toggleSound',
    'updateHud',
    'updateSoundControl',
    'updateTimer',
  ].sort());

  const imports = [...game.matchAll(/^import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?$/gm)]
    .map(([, bindings, source]) => ({ bindings: bindings.replace(/\s+/g, ' ').trim(), source }));
  assert.deepEqual(imports, [
    { bindings: '{ ANIMAL_DATABASE }', source: './animal-data.js' },
    { bindings: '{ AnimalChampionAudio }', source: './audio-system.js' },
    {
      bindings: '{ ANSWER_WINDOW_MS, FEEDBACK_DELAY_MS, MODES, OUTCOMES, POINTS_PER_CORRECT, AnimalChampionEngine, createPausableDeadline, normalizeLeaderboard, recordLeaderboardScore, }',
      source: './game-engine.js',
    },
  ]);

  assert.match(game, /LAHSPointsBridge\?\.init\(\{\s*gameId:\s*['"]animal-champion['"]\s*\}\)/);
  assert.match(game, /LAHSPointsBridge\?\.awardPoints\(POINTS_PER_CORRECT,\s*\{/);
  assert.doesNotMatch(game, /await\s+(?:this\.)?window\.LAHSPointsBridge|await\s+window\.LAHSPointsBridge/);
  assert.match(game, /eventId:\s*result\.eventId/);
  assert.match(game, /visibilitychange/);
  assert.match(game, /pagehide/);
  assert.match(game, /animalChampionLeaderboard/);
  assert.equal((game.match(/animalChampionLeaderboard/g) ?? []).length, 1, 'expected one isolated storage-key declaration');
  assert.deepEqual(
    [...new Set([...game.matchAll(/this\.phase\s*=\s*['"]([^'"]+)['"]/g)].map((match) => match[1]))],
    ['menu-locked', 'menu-ready', 'countdown', 'loading-round', 'answering', 'feedback', 'game-over', 'error'],
    'expected every explicit controller state',
  );
  assert.match(game, /new AnimalChampionAudio\(\{ window/);
  assert.match(game, /this\.audio\.playMenu\(\)/);
  assert.match(game, /this\.audio\.playStart\(\)/);
  assert.match(game, /this\.audio\.playPrompt\(\)/);
  assert.match(game, /this\.audio\.playFeedback\(\{/);
  assert.match(game, /this\.audio\.playGameOver\(state\.score\)/);
  assert.doesNotMatch(game, /AudioContext|new\s+Audio\b|microphone|SpeechRecognition|getUserMedia|requestFullscreen|webkitRequestFullscreen|<input/i);
});

test('Animal Champion exposes one accessible persistent narration control', async () => {
  const html = await read('public/Games/Animal Champion/index.html');
  const soundToggle = openingTagById(html, 'soundToggle');
  assert.equal(soundToggle.name, 'button');
  assert.equal(attribute(soundToggle.source, 'type'), 'button');
  assert.equal(attribute(soundToggle.source, 'aria-pressed'), 'true');
  assert.equal(attribute(soundToggle.source, 'aria-label'), 'Mute Animal Champion voice');
  assert.match(html, /id="soundToggleLabel"[^>]*>Voice on</);
});

test('Animal Champion controller guards async work and centralizes run invalidation', async () => {
  const game = await read('public/Games/Animal Champion/js/game.js');

  assert.match(controllerMethod(game, 'invalidateRun'), /this\.runToken\s*\+=\s*1;[\s\S]*?this\.roundToken\s*\+=\s*1;[\s\S]*?this\.deadline\?\.stop\(\);[\s\S]*?cancelAnimationFrame\(this\.countdownFrame\);[\s\S]*?this\.pendingTimeouts\.clear\(\);/);
  assert.match(controllerMethod(game, 'delay'), /runToken\s*===\s*this\.runToken\s*&&\s*roundToken\s*===\s*this\.roundToken/);
  assertEveryAwaitIsTokenGuarded(game, 'beginRound');
  assertEveryAwaitIsTokenGuarded(game, 'loadImageCandidate');
  assert.match(
    controllerMethod(game, 'beginRound'),
    /this\.deadline\.start\(\);\s*if \(this\.document\.hidden\) this\.deadline\.pause\(\);/,
    'an image that decodes while hidden must not start consuming answer time',
  );

  for (const method of ['startRun', 'mainMenu', 'playAgain', 'retry', 'showFatalError', 'teardown']) {
    assert.match(
      controllerMethod(game, method),
      /this\.invalidateRun\(\);/,
      `${method} must invalidate the active run`,
    );
  }

  const start = controllerMethod(game, 'start');
  for (const id of ['menuReveal', 'modeChallenger', 'modeContinuous', 'startButton', 'newGameButton', 'playAgainButton', 'mainMenuButton', 'retryButton', 'errorMenuButton']) {
    assert.match(start, new RegExp(`this\\.elements\\.${id}\\.addEventListener\\(\\s*['"]click['"]`));
  }
  assert.match(start, /this\.document\.addEventListener\(['"]visibilitychange['"]/);
  assert.match(start, /this\.window\.addEventListener\(['"]pagehide['"]/);

  assert.match(controllerMethod(game, 'readLeaderboard'), /try \{[\s\S]*localStorage\.getItem\(LEADERBOARD_STORAGE_KEY\)[\s\S]*JSON\.parse\(raw\)[\s\S]*\} catch \{/);
  assert.match(controllerMethod(game, 'saveLeaderboard'), /try \{[\s\S]*localStorage\.setItem\(LEADERBOARD_STORAGE_KEY,[\s\S]*\} catch \{/);
});

test('controller menu and actions expose the expected state before transitions', async () => {
  const revealHarness = await createControllerHarness();
  revealHarness.controller.start();
  revealHarness.controller.revealMenu();
  assert.equal(revealHarness.document.getElementById('menuReveal').getAttribute('aria-expanded'), 'true');
  assert.equal(revealHarness.document.getElementById('menuPanel').hidden, false);
  assert.equal(revealHarness.document.activeElement?.id, 'modeChallenger');

  const cases = [
    ['startRun', ['invalidate', 'beginFresh']],
    ['playAgain', ['invalidate', 'beginFresh']],
    ['retry', ['invalidate', 'beginFresh']],
    ['mainMenu', ['invalidate', 'reset', 'show:menu']],
    ['showFatalError', ['invalidate', 'show:error']],
    ['teardown', ['invalidate']],
  ];
  for (const [method, expected] of cases) {
    const { controller } = await createControllerHarness();
    const events = [];
    controller.invalidateRun = () => events.push('invalidate');
    controller.beginFreshRun = () => events.push('beginFresh');
    controller.engine.reset = () => events.push('reset');
    controller.showScreen = (screen) => events.push(`show:${screen}`);
    controller.updateHud = () => events.push('hud');
    controller[method]('Harness failure');
    assert.deepEqual(events.filter((event) => event !== 'hud'), expected, `${method} ordering`);
  }

  const newGameHarness = await createControllerHarness();
  const newGameEvents = [];
  newGameHarness.controller.invalidateRun = () => newGameEvents.push('invalidate');
  newGameHarness.controller.engine.reset = () => newGameEvents.push('reset');
  newGameHarness.controller.showScreen = (screen) => newGameEvents.push(`show:${screen}`);
  newGameHarness.controller.start();
  newGameEvents.length = 0;
  newGameHarness.document.getElementById('newGameButton').dispatch('click');
  assert.deepEqual(newGameEvents, ['invalidate', 'reset', 'show:menu']);
});

test('controller countdown announces each label once and invalidates a rapid restart', async () => {
  const harness = await createControllerHarness();
  let beganRounds = 0;
  harness.controller.beginRound = async () => {
    beganRounds += 1;
  };
  harness.controller.startRun();

  const countdown = harness.document.getElementById('countdownValue');
  for (const time of [0, 300, 999, 1_000, 1_500, 2_000, 2_700, 3_000, 3_900, 4_499]) {
    harness.stepAnimationFrame(time);
  }
  assert.deepEqual(countdown.textWrites, ['3', '2', '1', 'GO']);
  assert.equal(beganRounds, 0);
  harness.stepAnimationFrame(4_500);
  assert.equal(beganRounds, 1);
  assert.equal(harness.frames.size, 0);

  const restartHarness = await createControllerHarness();
  let restartRounds = 0;
  restartHarness.controller.beginRound = async () => {
    restartRounds += 1;
  };
  restartHarness.controller.startRun();
  const firstFrameId = [...restartHarness.frames.keys()][0];
  restartHarness.controller.startRun();
  assert.ok(restartHarness.cancelledFrames.includes(firstFrameId));
  assert.equal(restartHarness.frames.size, 1);
  restartHarness.stepAnimationFrame(4_500);
  assert.equal(restartRounds, 1);
});

test('controller hands focus from Start to the countdown and first ready answer', async () => {
  const harness = await createControllerHarness();
  harness.controller.engine = {
    startRun: () => ({ phase: 'ready', mode: 'challenger', score: 0, streak: 0 }),
    beginRound: () => structuredClone(FIXED_ROUND),
    activateRound: () => true,
    getState: () => ({ phase: 'ready', mode: 'challenger', score: 0, streak: 0 }),
  };
  harness.controller.start();
  harness.controller.revealMenu();

  const startButton = harness.document.getElementById('startButton');
  startButton.focus();
  startButton.dispatch('click');

  assert.equal(harness.document.getElementById('menuScreen').hidden, true);
  assert.equal(harness.document.getElementById('countdownScreen').hidden, false);
  assert.equal(harness.document.activeElement?.id, 'countdownScreen');

  harness.stepAnimationFrame(4_500);
  await new Promise((resolve) => setImmediate(resolve));

  const choices = harness.document.getElementById('choiceGrid').children;
  assert.equal(choices.length, 4);
  assert.equal(harness.document.activeElement, choices[0]);
  assert.equal(choices[0].dataset.animalId, 'bat');
});

test('controller falls back after one decode failure and starts choices and timer only after success', async () => {
  const decodes = [];
  class FallbackImage {
    async decode() {
      decodes.push(this.src);
      if (this.src.endsWith('/first.webp')) throw new Error('first image failed');
    }
  }
  const harness = await createControllerHarness({ window: { ImageClass: FallbackImage } });
  const events = [];
  harness.controller.engine = {
    beginRound: () => structuredClone(FIXED_ROUND),
    activateRound: (roundId, path) => {
      events.push(`activate:${roundId}:${path}`);
      return true;
    },
    getState: () => ({ mode: 'challenger', score: 0, streak: 0 }),
  };

  const pendingRound = harness.controller.beginRound();
  assert.equal(harness.controller.deadline, null);
  assert.equal(harness.document.getElementById('choiceGrid').children.length, 0);
  await pendingRound;

  assert.deepEqual(decodes, FIXED_ROUND.imageOrder);
  assert.deepEqual(events, [`activate:${FIXED_ROUND.roundId}:${FIXED_ROUND.imageOrder[1]}`]);
  assert.equal(harness.document.getElementById('animalImage').src, FIXED_ROUND.imageOrder[1]);
  assert.equal(harness.document.getElementById('animalImage').alt, 'A bat in its natural habitat');
  assert.equal(harness.document.getElementById('choiceGrid').children.length, 4);
  assert.ok(harness.controller.deadline);
  assert.equal(harness.document.getElementById('timerRegion').getAttribute('aria-valuenow'), '15');
});

test('controller ignores a stale image decode completion after reset', async () => {
  let resolveDecode;
  class PendingImage {
    decode() {
      return new Promise((resolve) => {
        resolveDecode = resolve;
      });
    }
  }
  const harness = await createControllerHarness({ window: { ImageClass: PendingImage } });
  let activations = 0;
  harness.controller.engine = {
    beginRound: () => structuredClone(FIXED_ROUND),
    activateRound: () => {
      activations += 1;
      return true;
    },
    getState: () => ({ mode: 'challenger', score: 0, streak: 0 }),
    reset: () => ({ phase: 'idle', score: 0, streak: 0 }),
  };

  const pendingRound = harness.controller.beginRound();
  assert.equal(typeof resolveDecode, 'function');
  harness.controller.mainMenu();
  resolveDecode();
  await pendingRound;

  assert.equal(activations, 0);
  assert.equal(harness.controller.deadline, null);
  assert.equal(harness.document.getElementById('choiceGrid').children.length, 0);
  assert.equal(harness.document.getElementById('menuScreen').hidden, false);
  assert.equal(harness.document.getElementById('gameScreen').hidden, true);
});

test('controller accepts a correct choice once, absorbs award rejection, and cancels stale feedback', async () => {
  const awards = [];
  const harness = await createControllerHarness({
    window: {
      pointsBridge: {
        awardPoints(points, payload) {
          awards.push({ points, payload });
          return Promise.reject(new Error('host rejected award'));
        },
      },
    },
  });
  let submissions = 0;
  let progressions = 0;
  const state = { mode: 'challenger', score: 0, streak: 0 };
  harness.controller.engine = {
    submitChoice() {
      submissions += 1;
      if (submissions > 1) return { accepted: false };
      state.score = 10;
      state.streak = 1;
      return {
        accepted: true,
        outcome: 'correct',
        selectedAnimalId: 'bat',
        correctAnimalId: 'bat',
        score: 10,
        streak: 1,
        eventId: 'run-harness:round-harness:correct',
      };
    },
    getState: () => ({ ...state }),
    finishFeedback: () => ({ ...state, phase: 'ready' }),
    reset: () => ({ phase: 'idle', score: 0, streak: 0 }),
  };
  harness.controller.renderChoices(FIXED_ROUND);
  harness.controller.deadline = { stop() {} };
  harness.controller.beginRound = async () => {
    progressions += 1;
  };

  harness.controller.acceptChoice(FIXED_ROUND.roundId, 'bat');
  harness.controller.acceptChoice(FIXED_ROUND.roundId, 'bat');
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(submissions, 2);
  assert.equal(harness.document.getElementById('scoreValue').textContent, '10');
  assert.equal(harness.document.getElementById('streakValue').textContent, '1');
  assert.ok(harness.document.getElementById('choiceGrid').children.every((button) => button.disabled));
  assert.equal(awards.length, 1);
  assert.equal(awards[0].points, 10);
  assert.equal(awards[0].payload.eventId, 'run-harness:round-harness:correct');
  assert.match(harness.document.getElementById('feedback').textContent, /✓ Correct! That's a Bat\./);
  assert.equal([...harness.timers.values()][0].delay, 2_000);
  harness.flushTimers();
  assert.equal(progressions, 1);

  const resetHarness = await createControllerHarness();
  let staleProgressions = 0;
  resetHarness.controller.engine = {
    submitChoice: () => ({
      accepted: true,
      outcome: 'correct',
      selectedAnimalId: 'bat',
      correctAnimalId: 'bat',
      score: 10,
      streak: 1,
      eventId: 'reset-event',
    }),
    getState: () => ({ mode: 'challenger', score: 10, streak: 1 }),
    finishFeedback: () => ({ phase: 'ready', mode: 'challenger', score: 10, streak: 1 }),
    reset: () => ({ phase: 'idle', score: 0, streak: 0 }),
  };
  resetHarness.controller.renderChoices(FIXED_ROUND);
  resetHarness.controller.beginRound = async () => {
    staleProgressions += 1;
  };
  resetHarness.controller.acceptChoice(FIXED_ROUND.roundId, 'bat');
  assert.deepEqual(
    [...resetHarness.timers.values()].map(({ delay }) => delay).sort((left, right) => left - right),
    [2_000, 18_000],
  );
  resetHarness.controller.mainMenu();
  resetHarness.flushTimers();
  assert.equal(staleProgressions, 0);
});

test('controller wrong and timeout feedback reveal the answer before Challenger game over', async () => {
  for (const outcome of ['wrong', 'timeout']) {
    const harness = await createControllerHarness();
    harness.controller.engine = {
      submitChoice: () => ({
        accepted: true,
        outcome: 'wrong',
        selectedAnimalId: 'bear',
        correctAnimalId: 'bat',
        score: 0,
        streak: 0,
      }),
      timeout: () => ({
        accepted: true,
        outcome: 'timeout',
        selectedAnimalId: null,
        correctAnimalId: 'bat',
        score: 0,
        streak: 0,
      }),
      getState: () => ({ mode: 'challenger', score: 0, streak: 0 }),
      finishFeedback: () => ({ phase: 'game-over', mode: 'challenger', score: 0, streak: 0 }),
    };
    harness.controller.renderChoices(FIXED_ROUND);
    harness.controller.deadline = { stop() {} };
    if (outcome === 'wrong') harness.controller.acceptChoice(FIXED_ROUND.roundId, 'bear');
    else harness.controller.handleTimeout(FIXED_ROUND.roundId);

    const feedback = harness.document.getElementById('feedback').textContent;
    assert.match(feedback, outcome === 'wrong' ? /✕ Not quite/ : /⌛ Time's up/);
    assert.match(feedback, /correct answer is Bat/);
    const buttons = harness.document.getElementById('choiceGrid').children;
    assert.equal(buttons.find((button) => button.dataset.animalId === 'bat').dataset.result, 'correct');
    if (outcome === 'wrong') {
      assert.equal(buttons.find((button) => button.dataset.animalId === 'bear').dataset.result, 'wrong');
    }
    harness.flushTimers();
    assert.equal(harness.document.getElementById('gameOverScreen').hidden, false);
    assert.equal(harness.document.getElementById('finalScore').textContent, '0');
  }
});

test('controller renders game over when leaderboard storage is corrupt or denied', async () => {
  const storageCases = [
    { getItem: () => '{corrupt', setItem: () => { throw new Error('write denied'); } },
    { getItem: () => { throw new Error('read denied'); }, setItem: () => { throw new Error('write denied'); } },
  ];
  for (const localStorage of storageCases) {
    const harness = await createControllerHarness({ window: { localStorage } });
    harness.controller.engine = {
      getState: () => ({ mode: 'challenger', score: 0, streak: 0 }),
    };
    assert.doesNotThrow(() => harness.controller.showGameOver());
    assert.equal(harness.document.getElementById('gameOverScreen').hidden, false);
    assert.equal(harness.document.getElementById('leaderboard').children.length, 1);
    assert.match(harness.document.getElementById('leaderboard').children[0].textContent, /No scores yet/);
  }
});

test('controller visibility listener pauses and resumes the active deadline', async () => {
  const harness = await createControllerHarness();
  const calls = [];
  harness.controller.start();
  harness.controller.deadline = {
    pause: () => calls.push('pause'),
    resume: () => calls.push('resume'),
  };
  harness.document.hidden = true;
  harness.document.dispatch('visibilitychange');
  harness.document.hidden = false;
  harness.document.dispatch('visibilitychange');
  assert.deepEqual(calls, ['pause', 'resume']);
});

test('points initialization absorbs synchronous and rejected asynchronous failures', async () => {
  const { initializePointsBridge } = await import(controllerUrl.href);
  assert.equal(typeof initializePointsBridge, 'function');
  assert.doesNotThrow(() => initializePointsBridge({
    LAHSPointsBridge: { init: () => { throw new Error('sync init failure'); } },
  }));

  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    initializePointsBridge({
      LAHSPointsBridge: { init: () => Promise.reject(new Error('async init failure')) },
    });
    let thenCalled = false;
    initializePointsBridge({
      LAHSPointsBridge: {
        init: () => ({
          then(_resolve, reject) {
            thenCalled = true;
            reject(new Error('thenable init failure'));
          },
        }),
      },
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(thenCalled, true);
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});

test('startup failure uses body text when the complete error surface is unavailable', async () => {
  const { bootAnimalChampion } = await import(controllerUrl.href);
  assert.equal(typeof bootAnimalChampion, 'function');
  const document = new FakeDocument({ omitIds: ['errorMessage'] });
  const { window } = createFakeWindow();
  const controller = bootAnimalChampion({ document, window });
  assert.equal(controller, null);
  assert.equal(document.body.textContent, 'Animal Champion could not start: missing #errorMessage.');
});

test('Animal Champion theme locks safe areas, media treatment, and responsive geometry', async () => {
  const css = await read('public/Games/Animal Champion/css/style.css');
  const sides = ['top', 'right', 'bottom', 'left'];

  for (const side of sides) {
    assert.match(css, new RegExp(`--safe-${side}:\\s*env\\(safe-area-inset-${side},\\s*0px\\)`));
  }

  const screenRule = cssRule(css, '.screen');
  for (const side of sides) {
    assert.match(screenRule, new RegExp(`padding-${side}:\\s*max\\([^;]*(?:var\\(--safe-${side}\\)|env\\(safe-area-inset-${side}\\))`));
  }

  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(cssRule(css, '.animal-stage'), /aspect-ratio:\s*4\s*\/\s*3/);
  assert.match(cssRule(css, '#animalBackdrop'), /object-fit:\s*cover/);
  assert.match(cssRule(css, '#animalBackdrop'), /filter:\s*blur\(/);
  assert.match(cssRule(css, '#animalImage'), /object-fit:\s*contain/);

  const gameRule = cssRule(css, '.screen--game');
  assert.match(gameRule, /grid-template-rows:\s*repeat\(5,\s*auto\)/);
  assert.doesNotMatch(gameRule, /minmax\(0,\s*1fr\)/);
  assert.match(cssRule(css, '.animal-stage'), /grid-row:\s*2\s*\/\s*6/);

  const landscape = mediaBlock(css, '(orientation: landscape) and (max-height: 540px) and (min-width: 650px)');
  assert.match(landscape, /grid-template-rows:\s*repeat\(5,\s*auto\)/);
  assert.match(landscape, /grid-row:\s*1\s*\/\s*6/);

  const choiceRule = cssRule(css, '.choice-grid button');
  assert.doesNotMatch(choiceRule, /text-overflow:\s*ellipsis/);
  assert.doesNotMatch(css, /padding-right:\s*(?:5\.5|4\.6)rem/);
  const narrowPhone = mediaBlock(css, '(max-width: 420px)');
  assert.match(narrowPhone, /\.choice-grid button\[data-result\]/);
  assert.match(narrowPhone, /min-height:\s*64px/);

  assert.doesNotMatch(css, /https?:\/\//i);
});

test('Animal Champion uses emerald primary actions and robust forced colors', async () => {
  const css = await read('public/Games/Animal Champion/css/style.css');
  const primary = cssRule(css, '.primary-action');
  const primaryHover = cssRule(css, '.primary-action:hover');

  assert.match(primary, /background:[^;]*var\(--emerald-400\)/);
  assert.doesNotMatch(primary.match(/background:[^;]*/)?.[0] ?? '', /var\(--gold-(?:300|500)\)/);
  assert.match(primary, /box-shadow:[^;]*rgb\(49\s+215\s+155\s*\/\s*\d+%\)/);
  assert.match(primaryHover, /background:[^;]*var\(--emerald-400\)/);
  assert.match(primaryHover, /box-shadow:[^;]*rgb\(49\s+215\s+155\s*\/\s*\d+%\)/);

  const forcedColors = mediaBlock(css, '(forced-colors: active)');
  for (const systemColor of ['Canvas', 'CanvasText', 'ButtonFace', 'ButtonText', 'Highlight', 'HighlightText']) {
    assert.match(forcedColors, new RegExp(`\\b${systemColor}\\b`));
  }
  for (const selector of ['.eyebrow', '.menu-hero__intro', '.trail-mark', '.primary-action']) {
    assert.match(forcedColors, new RegExp(escapeRegExp(selector)));
  }
  const forcedPrimary = cssRule(
    forcedColors,
    '.primary-action,\n  .primary-action:hover,\n  .mode-toggle button[aria-pressed="true"]',
  );
  assert.match(forcedPrimary, /color:\s*ButtonText/);
  assert.match(forcedPrimary, /background:\s*ButtonFace/);
  assert.doesNotMatch(forcedPrimary, /color:\s*HighlightText/);
  assert.doesNotMatch(forcedPrimary, /background:\s*Highlight/);
  assert.match(forcedColors, /forced-color-adjust:\s*auto/);
  assert.match(forcedColors, /opacity:\s*1/);
  assert.match(forcedColors, /filter:\s*none/);
  assert.match(forcedColors, /text-shadow:\s*none/);
  assert.match(forcedColors, /box-shadow:\s*none/);
});
