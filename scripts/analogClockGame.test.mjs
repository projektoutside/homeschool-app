import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const source = await readFile(new URL('../public/Games/analogclockgame/game.js', import.meta.url), 'utf8');

const node = () => {
  const classes = new Set();
  const attributes = new Map();
  return {
    style: {}, dataset: {}, textContent: '',
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name),
      toggle: (name, force) => { const next = force ?? !classes.has(name); next ? classes.add(name) : classes.delete(name); return next; },
    },
    setAttribute: (key, value) => attributes.set(key, String(value)),
    getAttribute: key => attributes.get(key) ?? null,
    removeAttribute: key => attributes.delete(key),
    addEventListener() {}, removeEventListener() {}, remove() {}, focus() {}, appendChild() {},
    querySelector: () => null, querySelectorAll: () => [],
  };
};

function runtime({ storageBlocked = false } = {}) {
  const clock = { now: 0, nextId: 0, tasks: new Map() };
  const schedule = (callback, delay, interval = false) => {
    const id = ++clock.nextId;
    clock.tasks.set(id, { callback, due: clock.now + delay, delay, interval });
    return id;
  };
  clock.tick = milliseconds => {
    const end = clock.now + milliseconds;
    for (let count = 0; count < 10000; count++) {
      const next = [...clock.tasks.entries()].filter(([, task]) => task.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      const [id, task] = next;
      clock.now = task.due;
      if (task.interval) task.due += task.delay;
      else clock.tasks.delete(id);
      task.callback();
    }
    clock.now = end;
  };
  const values = new Map();
  const localStorage = {
    getItem: key => { if (storageBlocked) throw new Error('Storage unavailable'); return values.get(key) ?? null; },
    setItem: (key, value) => values.set(key, value),
  };
  const listeners = new Map();
  const warnings = [];
  const elements = new Map();
  const getElement = id => {
    if (!elements.has(id)) elements.set(id, node());
    return elements.get(id);
  };
  const document = {
    readyState: 'loading', hidden: false, body: node(),
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener() {}, getElementById: getElement,
    querySelector: () => null, querySelectorAll: () => [],
  };
  const window = { location: { search: '', origin: 'http://localhost' }, localStorage, innerWidth: 1200, addEventListener() {} };
  const context = vm.createContext({
    window, document, localStorage, navigator: {}, URLSearchParams, crypto: webcrypto,
    console: { log() {}, warn(...args) { warnings.push(args); }, error() {} },
    Date: class extends Date { static now() { return clock.now; } },
    performance: { now: () => clock.now },
    setTimeout: (fn, delay = 0) => schedule(fn, delay),
    clearTimeout: id => clock.tasks.delete(id),
    setInterval: (fn, delay) => schedule(fn, delay, true),
    clearInterval: id => clock.tasks.delete(id),
  });
  vm.runInContext(source, context);
  const classes = vm.runInContext('({ SettingsManager, SettingsModalManager, InGameQuickSettingsManager, SoundManager, GameState, PerfectGameLogic, PerfectClockBuilder, LevelTransitionManager, HighScoreManager, GAME_CONFIG })', context);
  const settings = new classes.SettingsManager();
  const state = new classes.GameState(settings);
  let generated = 0;
  const dom = new Proxy({
    get: getElement,
    safeUpdate: (name, callback) => callback(getElement(name)),
    hideLevelTransitionModal: () => getElement('levelTransitionModal').classList.add('hidden'),
  }, { get: (target, key) => target[key] ?? (() => {}) });
  const logic = new classes.PerfectGameLogic(state, dom, {});
  logic.generateQuestion = () => { generated++; logic.isProcessingAnswer = false; };
  logic.rewardShop = {
    clockCoins: 10, resetClockCoins() {}, earnClockCoin() {}, updateClockCoinDisplay() {},
    getClockCoins() { return this.clockCoins; },
  };
  return { clock, classes, settings, state, logic, dom, document, window, localStorage, listeners, warnings, generated: () => generated };
}

test('music volume can be saved at zero', () => {
  const { settings } = runtime();
  settings.updateSetting('musicVolume', 0);
  assert.equal(settings.getSetting('musicVolume'), 0);
});

test('resetting settings restores the actual music volume and enabled state', () => {
  const { settings, classes } = runtime();
  settings.updateSetting('musicVolume', 0);
  settings.updateSetting('soundEnabled', false);
  let volume;
  let enabled;
  const manager = Object.create(classes.SettingsModalManager.prototype);
  manager.settingsManager = settings;
  manager.updateDisplay = () => {};
  manager.gameLogic = { soundManager: {
    updateMusicVolume(value) { volume = value; },
    updateMusicState() { enabled = settings.getSetting('soundEnabled'); },
  } };
  manager.resetSettings();
  assert.equal(volume, 50);
  assert.equal(enabled, true);
});

test('stored settings are validated before they reach audio and life displays', () => {
  const { localStorage, classes } = runtime();
  localStorage.setItem('analogClockGameSettings', JSON.stringify({ timeMultiplier: 9999, starCount: -5, musicVolume: 'broken' }));
  const settings = new classes.SettingsManager();
  assert.equal(settings.getSetting('timeMultiplier'), 15);
  assert.equal(settings.getMaxStars(), 1);
  assert.equal(settings.getSetting('musicVolume'), 50);
});

test('an answer from a previous round cannot replace a new round question', () => {
  const { logic, clock, generated } = runtime();
  logic.startGame();
  logic.currentCorrectAnswer = '1:00';
  logic.checkAnswer('1:00');
  logic.returnToMenu();
  logic.startGame();
  const before = generated();
  clock.tick(2000);
  assert.equal(generated(), before);
});

test('closing one overlay does not resume a timer paused by another overlay', () => {
  const { logic, state, clock } = runtime();
  logic.startGame();
  logic.pauseTimer('shop');
  logic.pauseTimer('quick-settings');
  logic.resumeTimer('shop');
  assert.equal(state.timer, null);
  clock.tick(3000);
  assert.equal(state.timeRemaining, 300);
  logic.resumeTimer('quick-settings');
  clock.tick(1000);
  assert.equal(state.timeRemaining, 299);
});

test('opening quick settings during another pause keeps the timer paused until both close', () => {
  const { logic, state, dom, classes, clock } = runtime();
  const quickSettings = Object.create(classes.InGameQuickSettingsManager.prototype);
  quickSettings.domManager = dom;
  quickSettings.gameLogic = logic;
  quickSettings.updateSoundButton = () => {};
  logic.startGame();
  logic.pauseTimer('shop');
  quickSettings.openPanel();
  logic.resumeTimer('shop');
  clock.tick(2000);
  assert.equal(state.timer, null);
  assert.equal(state.timeRemaining, 300);
  quickSettings.closePanel();
  clock.tick(1000);
  assert.equal(state.timeRemaining, 299);
});

test('timer accounts for delayed ticks rather than losing elapsed seconds', () => {
  const { logic, state, clock } = runtime();
  logic.startGame();
  clock.now += 10000;
  [...clock.tasks.values()].find(task => task.interval).callback();
  assert.equal(state.timeRemaining, 290);
});

test('an expired round stops once and can continue with another minute', () => {
  const { logic, state, clock } = runtime();
  logic.startGame();
  clock.tick(300000);
  assert.equal(state.timeRemaining, 0);
  assert.equal(state.isGameActive, false);
  assert.equal(state.timer, null);
  logic.handleBuyTime(10, node());
  assert.equal(state.timeRemaining, 60);
  assert.equal(state.stars, 3);
  assert.equal(state.isGameActive, true);
  clock.tick(1000);
  assert.equal(state.timeRemaining, 59);
});

test('continuing after losing lives restores a playable question', () => {
  const { logic, state, generated } = runtime();
  logic.startGame();
  state.stars = 0;
  logic.isProcessingAnswer = true;
  logic.handleGameOver();
  const before = generated();
  logic.handleBuyTime(10, node());
  assert.equal(state.stars, 1);
  assert.equal(state.isGameActive, true);
  assert.equal(logic.isProcessingAnswer, false);
  assert.equal(generated(), before + 1);
});

test('a level start can only generate one question even after repeated activation', () => {
  const { logic, state, dom, classes, clock, generated } = runtime();
  state.isGameActive = true;
  const manager = new classes.LevelTransitionManager(dom, logic);
  manager.startNextLevel();
  manager.startNextLevel();
  clock.tick(500);
  assert.equal(generated(), 1);
});

test('updating a finished round score does not duplicate its leaderboard entry', () => {
  const { classes } = runtime();
  const scores = Object.create(classes.HighScoreManager.prototype);
  scores.leaderboard = [];
  scores.saveLeaderboard = scores.updateDisplay = scores.animateNewRecord = () => {};
  scores.checkAndUpdateHighScore(100, 'round-1');
  scores.checkAndUpdateHighScore(110, 'round-1');
  assert.equal(scores.leaderboard.length, 1);
  assert.equal(scores.leaderboard[0].score, 110);
});

test('answering is blocked while a pause overlay is open', () => {
  const { logic, state } = runtime();
  logic.startGame();
  logic.currentCorrectAnswer = '1:00';
  logic.pauseTimer('shop');
  logic.checkAnswer('1:00');
  assert.equal(state.points, 0);
  assert.equal(state.questionsAnswered, 0);
});

test('answer feedback waits for a paused overlay to close before advancing', () => {
  const { logic, clock, generated } = runtime();
  logic.startGame();
  logic.currentCorrectAnswer = '1:00';
  logic.checkAnswer('1:00');
  logic.pauseTimer('shop');
  clock.tick(2000);
  assert.equal(generated(), 1);
  logic.resumeTimer('shop');
  assert.equal(generated(), 2);
  clock.tick(2000);
  assert.equal(generated(), 2);
});

test('extra time preserves elapsed fractions and stays paused inside the shop', () => {
  const { logic, state, clock } = runtime();
  logic.startGame();
  clock.tick(500);
  logic.pauseTimer('shop');
  logic.addTime(60);
  clock.tick(3000);
  assert.equal(state.timeRemaining, 360);
  logic.resumeTimer('shop');
  clock.tick(500);
  assert.equal(state.timeRemaining, 359);
});

test('backgrounding pauses the clock and foregrounding restores only its own pause', () => {
  const { logic, state, window, document, listeners, clock } = runtime();
  window.analogClockGame = { gameLogic: logic, soundManager: { updateMusicState() {} } };
  logic.startGame();
  document.hidden = true;
  listeners.get('visibilitychange')();
  clock.tick(5000);
  assert.equal(state.timeRemaining, 300);
  logic.pauseTimer('shop');
  document.hidden = false;
  listeners.get('visibilitychange')();
  assert.equal(state.timer, null);
  logic.resumeTimer('shop');
  clock.tick(1000);
  assert.equal(state.timeRemaining, 299);
});

test('end-of-round coin purchases also reach the host points bridge', () => {
  const { logic, state, window } = runtime();
  const awards = [];
  window.LAHSPointsBridge = { awardPoints: points => awards.push(points) };
  logic.handleGameoverPurchase({ cost: 1, value: 10, name: '+10 Points' });
  assert.equal(state.points, 10);
  assert.equal(logic.rewardShop.clockCoins, 9);
  assert.deepEqual(awards, [10]);
});

test('the level-up reward shop removes its hidden state when opened', () => {
  const { logic, dom, classes, clock } = runtime();
  const manager = new classes.LevelTransitionManager(dom, logic);
  manager.rewardShop = {};
  const overlay = node();
  overlay.classList.add('hidden');
  manager.createRewardShopOverlay = () => overlay;
  manager.showRewardShopOverlay();
  clock.tick(100);
  assert.equal(overlay.classList.contains('hidden'), false);
  assert.equal(overlay.classList.contains('visible'), true);
});

test('all seven levels generate valid times and exactly four distinct answer choices', () => {
  const { logic, state, dom, classes } = runtime();
  const choices = [];
  dom.addOption = text => choices.push(text);
  for (const level of classes.GAME_CONFIG.LEVELS) {
    state.currentLevel = level.id;
    for (let count = 0; count < 80; count++) {
      const time = logic.generateEnhancedRandomTimeForLevel(level);
      assert.ok(time.hours >= 1 && time.hours <= 12);
      assert.ok(Number.isInteger(time.minutes) && time.minutes >= 0 && time.minutes < 60);
      assert.ok(Number.isInteger(time.seconds) && time.seconds >= 0 && time.seconds < 60);
      if (!level.hasSeconds) assert.equal(time.seconds, 0);
      assert.ok(level.formats.includes(time.timeFormat));
      choices.length = 0;
      logic.generateOptions(time);
      assert.equal(choices.length, 4);
      assert.equal(new Set(choices).size, 4);
      assert.equal(choices.filter(choice => choice === logic.formatTime(time, level)).length, 1);
    }
  }
});

test('clock hand geometry includes fractional minutes and seconds at hour boundaries', () => {
  const { classes, document } = runtime();
  const clock = Object.create(classes.PerfectClockBuilder.prototype);
  for (const [hours, minutes, seconds] of [[12, 0, 0], [3, 15, 0], [6, 30, 30], [11, 59, 59]]) {
    assert.equal(clock.updateClockHands(hours, minutes, seconds), true);
    const cases = [
      ['hour-hand', 90, (hours % 12) * 30 + minutes / 2 + seconds / 120],
      ['minute-hand', 140, minutes * 6 + seconds / 10],
      ['seconds-hand', 150, seconds * 6],
    ];
    for (const [id, length, degrees] of cases) {
      const hand = document.getElementById(id);
      const radians = (degrees - 90) * Math.PI / 180;
      assert.ok(Math.abs(Number(hand.getAttribute('x2')) - (250 + length * Math.cos(radians))) < 0.006);
      assert.ok(Math.abs(Number(hand.getAttribute('y2')) - (250 + length * Math.sin(radians))) < 0.006);
    }
  }
});

test('unavailable browser storage does not prevent the game runtime from loading', () => {
  const { settings } = runtime({ storageBlocked: true });
  assert.equal(settings.getMaxStars(), 3);
  assert.equal(settings.getSetting('musicVolume'), 50);
});

test('malformed leaderboard entries cannot break the results screen', () => {
  const { classes, localStorage } = runtime();
  localStorage.setItem('scores', JSON.stringify([null, {score:-1}, {score:25,date:'today'}, {score:'broken'}]));
  const manager = Object.create(classes.HighScoreManager.prototype);
  manager.LEADERBOARD_KEY = 'scores';
  const scores = manager.loadLeaderboard();
  assert.equal(scores.length, 1);
  assert.equal(scores[0].score, 25);
});

test('unsupported Web Audio is detected once and does not warn on every answer', () => {
  const { classes, warnings } = runtime();
  const sound = Object.create(classes.SoundManager.prototype);
  sound.context = null;
  sound.audioContextUnavailable = false;
  sound.updateMusicState = () => {};
  sound.initAudio();
  sound.initAudio();
  sound.initAudio();
  assert.equal(sound.audioContextUnavailable, true);
  assert.equal(warnings.length, 1);
});
