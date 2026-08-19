import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const gameRoot = new URL('../public/Games/DefenderChampion/', import.meta.url);
const readGameFile = (path) => readFile(new URL(path, gameRoot), 'utf8');

class EventTargetDouble {
  listeners = new Map();

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type, event = {}) {
    const dispatched = {
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      type,
      ...event,
    };
    for (const listener of this.listeners.get(type) ?? []) listener(dispatched);
    return dispatched;
  }

  listenerCount(type) {
    return this.listeners.get(type)?.size ?? 0;
  }
}

const createFocusable = (documentRef, id) => ({
  disabled: false,
  hidden: false,
  id,
  isConnected: true,
  focus() {
    documentRef.activeElement = this;
  },
  getAttribute() {
    return null;
  },
});

test('the browser shell exposes semantic local-only screens and controls', async () => {
  const html = await readGameFile('index.html');

  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/);
  assert.match(html, /<main id="game-shell" data-screen="loading">/);
  assert.match(html, /<section id="menu-screen" aria-labelledby="game-title">/);
  assert.match(html, /<section id="level-select-screen" aria-label="Level selection" hidden>/);
  assert.match(html, /<section id="battle-screen" aria-label="Defender Champion battlefield" hidden>/);
  assert.match(html, /id="battle-hud"/);
  assert.match(html, /id="battlefield" tabindex="0" aria-label="Defense map"/);
  assert.match(html, /id="defender-dock"/);
  assert.match(html, /<section id="result-screen" aria-live="polite" hidden>/);
  assert.match(html, /id="how-to-screen"[^>]+role="dialog"[^>]+aria-modal="true"/);
  assert.match(html, /id="settings-screen"[^>]+role="dialog"[^>]+aria-modal="true"/);
  assert.match(html, /id="status-announcer"[^>]+aria-live="polite"/);
  assert.match(html, /src="\.\.\/shared\/lahsPointsBridge\.js"/);
  assert.match(html, /src="\.\/js\/app\.bundle\.js"/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.equal((html.match(/app\.bundle\.js/g) ?? []).length, 1);
});

test('the themed layout protects touch, safe-area, focus, motion, and orientation needs', async () => {
  const css = await readGameFile('css/game.css');

  assert.match(css, /:root\s*{/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /min-(?:width|height):\s*44px/);
  assert.match(css, /orientation:\s*landscape/);
  assert.match(css, /touch-action:/);
  assert.match(css, /#battle-screen\s*{[^}]*min-width:\s*0;/s);
  assert.match(css, /\.battle-hud,[^}]*#battlefield,[^}]*#defender-dock\s*{[^}]*min-width:\s*0;/s);
  assert.match(css, /#battlefield canvas\s*{[^}]*position:\s*absolute;[^}]*inset:\s*0;/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[^{]*{[^}]*html\[data-motion-preference="system"\]/s);
  assert.match(css, /html\[data-motion-preference="reduce"\]/);
});

test('portrait and tall-tablet battlefields cap their aspect-ratio width so the defender dock stays reachable', async () => {
  const css = await readGameFile('css/game.css');

  assert.match(
    css,
    /#battlefield\s*{[^}]*width:\s*100%;[^}]*max-width:\s*calc\(\(100dvh - 250px\) \* \.75\);/s,
  );
  assert.match(
    css,
    /@media \(orientation:\s*landscape\) and \(max-height:\s*760px\)[\s\S]*#battlefield\s*{[^}]*max-width:\s*none;/,
  );
});

test('the local entry boots one transparent Phaser game with the declared scene list', async () => {
  const main = await readGameFile('src/main.js');

  assert.match(main, /from ['"]phaser['"]/);
  assert.match(main, /parent:\s*['"]battlefield['"]/);
  assert.match(main, /transparent:\s*true/);
  assert.match(main, /width:\s*720/);
  assert.match(main, /height:\s*960/);
  assert.match(main, /Math\.min\([^)]*devicePixelRatio[^)]*,\s*2\)/);
  assert.match(main, /scene:\s*\[\s*BootScene,\s*MenuScene,\s*LevelSelectScene,\s*BattleScene,\s*ResultScene\s*\]/s);
  assert.match(main, /if\s*\(paused\)\s*{[^}]*scene\.scene\.isActive\(\)/s);
  assert.match(main, /rel\s*=\s*['"]icon['"]/);
  assert.match(main, /data:image\/gif;base64/);
});

test('BattleScene renders shared path pieces and resolves every typed pad position', async () => {
  const battleScene = await readGameFile('src/scenes/BattleScene.js');

  assert.match(battleScene, /import\s*{[^}]*derivePathPieces[^}]*resolvePlacementPoint[^}]*samplePathProgress[^}]*}/s);
  assert.match(battleScene, /derivePathPieces\(this\.level\.path,\s*toWorldPoint\)/);
  assert.match(battleScene, /PATH_FRAME\[piece\.frame\]/);
  assert.match(battleScene, /if \(piece\.kind !== 'straight'\) return \{ height: piece\.width, width: piece\.width \};/);
  assert.match(battleScene, /setDisplaySize\(size\.width, size\.height\)/);
  assert.match(battleScene, /setRotation\(piece\.rotation\)/);
  assert.match(battleScene, /resolvePlacementPoint\(this\.level,\s*placement\)/);
  assert.doesNotMatch(battleScene, /setDisplaySize\(worldLength \+ 54,\s*210\)/);
});

test('continue targets the highest unlocked uncleared level and falls back to level 10', async () => {
  const { resolveContinueLevel } = await import('../public/Games/DefenderChampion/src/ui/hud-controller.js');

  assert.equal(resolveContinueLevel({ highestUnlockedLevel: 1, levels: {} }), null);
  assert.equal(resolveContinueLevel({
    highestUnlockedLevel: 4,
    levels: {
      'level-1': { bestScore: 250, medal: 'gold' },
      'level-2': { bestScore: 300, medal: 'silver' },
    },
  }), 'level-4');
  assert.equal(resolveContinueLevel({
    highestUnlockedLevel: 10,
    levels: Object.fromEntries(Array.from({ length: 10 }, (_, index) => [
      `level-${index + 1}`,
      { bestScore: 100, medal: 'bronze' },
    ])),
  }), 'level-10');
  assert.equal(resolveContinueLevel({
    highestUnlockedLevel: 10,
    levels: {
      'level-1': { bestScore: 250, medal: 'gold' },
      'level-2': { bestScore: 300, medal: 'silver' },
    },
  }), null, 'partial corrupt progress must never jump to locked Level 10');
});

test('revisiting level select uses one delegated level handler', async () => {
  const hud = await readGameFile('src/ui/hud-controller.js');

  assert.match(hud, /on\(documentRef\.getElementById\('level-grid'\), 'click'/);
  assert.doesNotMatch(hud, /on\(button, 'click'/);
});

test('saved motion overrides take precedence over the system preference', async () => {
  const { resolveMotionState } = await import('../public/Games/DefenderChampion/src/ui/hud-controller.js');

  assert.deepEqual(resolveMotionState(null, true), { mode: 'system', reduced: true });
  assert.deepEqual(resolveMotionState(null, false), { mode: 'system', reduced: false });
  assert.deepEqual(resolveMotionState(true, false), { mode: 'reduce', reduced: true });
  assert.deepEqual(resolveMotionState(false, true), { mode: 'full', reduced: false });
});

test('modal focus trapping handles wrapping, single targets, empty overlays, Escape, and cleanup', async () => {
  const { createModalFocusTrap } = await import('../public/Games/DefenderChampion/src/ui/hud-controller.js');
  const documentRef = new EventTargetDouble();
  const trigger = createFocusable(documentRef, 'trigger');
  const first = createFocusable(documentRef, 'first');
  const middle = createFocusable(documentRef, 'middle');
  const last = createFocusable(documentRef, 'last');
  let focusables = [first, middle, last];
  let escapeCount = 0;
  const overlay = createFocusable(documentRef, 'overlay');
  overlay.contains = (element) => element === overlay || focusables.includes(element);
  overlay.querySelectorAll = () => focusables;
  documentRef.activeElement = trigger;
  const trap = createModalFocusTrap({
    documentRef,
    overlay,
    onEscape: () => { escapeCount += 1; },
  });

  trap.activate({ returnFocus: trigger });
  assert.equal(documentRef.activeElement, first);
  assert.equal(documentRef.listenerCount('keydown'), 1);

  documentRef.activeElement = last;
  assert.equal(documentRef.dispatch('keydown', { key: 'Tab' }).defaultPrevented, true);
  assert.equal(documentRef.activeElement, first);
  documentRef.activeElement = first;
  assert.equal(documentRef.dispatch('keydown', { key: 'Tab', shiftKey: true }).defaultPrevented, true);
  assert.equal(documentRef.activeElement, last);
  documentRef.activeElement = middle;
  assert.equal(documentRef.dispatch('keydown', { key: 'Tab' }).defaultPrevented, false);

  focusables = [middle];
  assert.equal(documentRef.dispatch('keydown', { key: 'Tab' }).defaultPrevented, true);
  assert.equal(documentRef.activeElement, middle);
  focusables = [];
  assert.equal(documentRef.dispatch('keydown', { key: 'Tab' }).defaultPrevented, true);
  assert.equal(documentRef.activeElement, overlay);
  assert.equal(documentRef.dispatch('keydown', { key: 'Escape' }).defaultPrevented, true);
  assert.equal(escapeCount, 1);

  trap.deactivate({ restoreFocus: true });
  assert.equal(documentRef.activeElement, trigger);
  assert.equal(documentRef.listenerCount('keydown'), 0);
});

test('chapter briefing is a contained modal that blocks the battlefield and restores focus', async () => {
  const [html, hud] = await Promise.all([
    readGameFile('index.html'),
    readGameFile('src/ui/hud-controller.js'),
  ]);

  assert.match(
    html,
    /id="level-intro-panel"[^>]+role="dialog"[^>]+aria-modal="true"[^>]+aria-labelledby="level-intro-title"[^>]+tabindex="-1"/,
  );
  assert.match(hud, /intro:\s*createModalFocusTrap\(\{[\s\S]*?overlay:\s*introPanel/);
  assert.match(
    hud,
    /showLevelIntro[\s\S]*?setBattleIntroInert\(true\)[\s\S]*?modalTraps\.intro\.activate\(\{\s*returnFocus:\s*battlefield\s*\}\)/,
  );
  assert.match(
    hud,
    /closeLevelIntro[\s\S]*?setBattleIntroInert\(false\)[\s\S]*?modalTraps\.intro\.deactivate\(\{\s*restoreFocus\s*\}\)/,
  );
});

test('BFCache transitions suspend and restore one runtime while real unload destroys it', async () => {
  const { createRuntimeLifecycle } = await import('../public/Games/DefenderChampion/src/runtime-lifecycle.js');
  const windowRef = new EventTargetDouble();
  const operations = [];
  const lifecycle = createRuntimeLifecycle({
    windowRef,
    audioController: {
      setPauseReason: (reason, active) => operations.push(['audio', reason, active]),
    },
    game: {
      destroy: (removeCanvas) => operations.push(['game-destroy', removeCanvas]),
      loop: {
        sleep: () => operations.push(['loop-sleep']),
        wake: () => operations.push(['loop-wake']),
      },
      scale: { refresh: () => operations.push(['scale-refresh']) },
    },
    hostBridge: { cleanup: () => operations.push(['host-cleanup']) },
    hud: {
      destroy: () => operations.push(['hud-destroy']),
      reconcile: () => operations.push(['hud-reconcile']),
    },
  });

  assert.equal(windowRef.listenerCount('pagehide'), 1);
  assert.equal(windowRef.listenerCount('pageshow'), 1);
  windowRef.dispatch('pagehide', { persisted: true });
  windowRef.dispatch('pagehide', { persisted: true });
  assert.deepEqual(operations, [
    ['audio', 'bfcache', true],
    ['loop-sleep'],
  ]);

  windowRef.dispatch('pageshow', { persisted: true });
  windowRef.dispatch('pageshow', { persisted: true });
  assert.deepEqual(operations.slice(2), [
    ['loop-wake'],
    ['scale-refresh'],
    ['hud-reconcile'],
    ['audio', 'bfcache', false],
  ]);

  windowRef.dispatch('pagehide', { persisted: false });
  assert.deepEqual(operations.slice(-3), [
    ['host-cleanup'],
    ['hud-destroy'],
    ['game-destroy', true],
  ]);
  assert.equal(windowRef.listenerCount('pagehide'), 0);
  assert.equal(windowRef.listenerCount('pageshow'), 0);
  assert.equal(lifecycle.getState().destroyed, true);
});

test('the fixed-step clock caps wall-clock catch-up, doubles simulation steps at 2x, and resets on resume', async () => {
  const hudModule = await import('../public/Games/DefenderChampion/src/ui/hud-controller.js');
  assert.equal(typeof hudModule.createFixedStepClock, 'function');

  const advances = [];
  let speed = 1;
  const clock = hudModule.createFixedStepClock({
    advanceSteps: (steps) => advances.push(steps),
    getSpeed: () => speed,
  });

  assert.equal(clock.advanceFrame(8), 0);
  assert.equal(clock.advanceFrame(9), 1);
  assert.deepEqual(advances, [1]);

  clock.reset();
  assert.equal(clock.advanceFrame(1_000), 5);
  assert.deepEqual(advances, [1, 5]);

  speed = 2;
  clock.reset();
  assert.equal(clock.advanceFrame(17), 2);
  assert.deepEqual(advances, [1, 5, 2]);

  clock.reset();
  assert.equal(clock.advanceFrame(8), 0);
  clock.reset();
  assert.equal(clock.advanceFrame(9), 0);
  assert.deepEqual(advances, [1, 5, 2]);
});

test('battlefield focus wraps with arrows but releases Tab at the forward and reverse boundaries', async () => {
  const hudModule = await import('../public/Games/DefenderChampion/src/ui/hud-controller.js');
  assert.equal(typeof hudModule.resolveBattlefieldFocusMove, 'function');

  const move = hudModule.resolveBattlefieldFocusMove;
  assert.deepEqual(move({ currentIndex: 2, key: 'ArrowRight', targetCount: 3 }), {
    nextIndex: 0,
    shouldExit: false,
  });
  assert.deepEqual(move({ currentIndex: 0, key: 'ArrowLeft', targetCount: 3 }), {
    nextIndex: 2,
    shouldExit: false,
  });
  assert.deepEqual(move({ currentIndex: 0, key: 'Tab', shiftKey: false, targetCount: 3 }), {
    nextIndex: 1,
    shouldExit: false,
  });
  assert.deepEqual(move({ currentIndex: 2, key: 'Tab', shiftKey: false, targetCount: 3 }), {
    nextIndex: 2,
    shouldExit: true,
  });
  assert.deepEqual(move({ currentIndex: 0, key: 'Tab', shiftKey: true, targetCount: 3 }), {
    nextIndex: 0,
    shouldExit: true,
  });
});

test('battlefield focus entry restores visible internal feedback without trapping semantic controls', async () => {
  const battleScene = await readGameFile('src/scenes/BattleScene.js');

  assert.match(battleScene, /on\(['"]focus['"],\s*\(\)\s*=>\s*this\.handleBattlefieldFocus\(true\)\)/);
  assert.match(battleScene, /on\(['"]blur['"],\s*\(\)\s*=>\s*this\.handleBattlefieldFocus\(false\)\)/);
  assert.match(battleScene, /const focusMove = resolveBattlefieldFocusMove/);
  assert.match(battleScene, /if \(focusMove\.shouldExit\) return;/);
  assert.match(battleScene, /if \(!this\.battlefieldHasFocus\)\s*{[^}]*this\.focusRing\.setVisible\(false\)/s);
});

test('the browser entry resets the battle accumulator after a BFCache resume', async () => {
  const main = await readGameFile('src/main.js');

  assert.match(main, /addEventListener\(['"]pageshow['"]/);
  assert.match(main, /event\.persisted[^]*getBattleScene\(\)\?\.handleResume\?\.\(\)/);
});

test('bounded QA advancement uses fixed simulation steps without a variable delta', async () => {
  const hudModule = await import('../public/Games/DefenderChampion/src/ui/hud-controller.js');
  assert.equal(typeof hudModule.createFixedStepClock, 'function');

  const advances = [];
  const clock = hudModule.createFixedStepClock({
    advanceSteps: (steps) => advances.push(steps),
    getSpeed: () => 2,
  });

  assert.equal(clock.advanceExact(1_000), 120);
  assert.equal(clock.advanceExact(-10), 0);
  assert.equal(clock.advanceExact(Number.POSITIVE_INFINITY), 0);
  assert.equal(clock.advanceExact(999_999), 7_200);
  assert.deepEqual(advances, [120, 7_200]);
});

test('QA runtime hooks expose deterministic controls only for qa=1 and restrict level starts', async () => {
  const hudModule = await import('../public/Games/DefenderChampion/src/ui/hud-controller.js');
  assert.equal(typeof hudModule.installQaRuntimeHooks, 'function');

  const ordinaryWindow = {};
  const ordinaryCleanup = hudModule.installQaRuntimeHooks({
    windowRef: ordinaryWindow,
    enabled: false,
  });
  assert.equal('render_game_to_text' in ordinaryWindow, false);
  assert.equal('advanceTime' in ordinaryWindow, false);
  assert.equal('__defenderChampion' in ordinaryWindow, false);
  ordinaryCleanup();

  const qaWindow = {};
  const starts = [];
  const battle = {
    advanceTime: (milliseconds) => ({ advanced: milliseconds }),
    getPerformanceState: () => ({ averageFrameMs: 16.6 }),
    getTextSnapshot: () => ({ levelId: 'level-1', tick: 42 }),
    issueBattleCommand: (command) => ({ accepted: command.type === 'build' }),
  };
  const cleanup = hudModule.installQaRuntimeHooks({
    windowRef: qaWindow,
    enabled: true,
    getActiveBattle: () => battle,
    isKnownLevel: (levelId) => levelId === 'level-1',
    startLevel: (levelId) => starts.push(levelId),
  });

  assert.equal(qaWindow.render_game_to_text(), '{"levelId":"level-1","tick":42}');
  assert.deepEqual(qaWindow.advanceTime(250), { advanced: 250 });
  assert.equal(qaWindow.__defenderChampion.startLevel('missing'), false);
  assert.equal(qaWindow.__defenderChampion.startLevel('level-1'), true);
  assert.deepEqual(qaWindow.__defenderChampion.getPerformanceState(), { averageFrameMs: 16.6 });
  assert.deepEqual(qaWindow.__defenderChampion.issueCommand({ type: 'build' }), { accepted: true });
  assert.deepEqual(starts, ['level-1']);

  cleanup();
  assert.equal('render_game_to_text' in qaWindow, false);
  assert.equal('advanceTime' in qaWindow, false);
  assert.equal('__defenderChampion' in qaWindow, false);
});

test('the battle HUD model projects all combat labels and four defender cards from one detached snapshot', async () => {
  const hudModule = await import('../public/Games/DefenderChampion/src/ui/hud-controller.js');
  assert.equal(typeof hudModule.createBattleHudModel, 'function');

  const snapshot = {
    levelId: 'level-1',
    tick: 125,
    timeScale: 2,
    pauseReasons: ['manual'],
    coins: 100,
    score: 90,
    castleHearts: 2,
    waveIndex: 1,
    towers: [{
      id: 'tower-1', defenderId: 'bladeguard', padId: 'l1-pad-a', tier: 0, totalInvested: 50,
    }],
  };
  const model = hudModule.createBattleHudModel(snapshot, {
    selectedDefenderId: 'ranger',
    selectedTowerId: 'tower-1',
  });

  assert.deepEqual({
    title: model.levelTitle,
    hearts: model.hearts,
    wave: model.waveLabel,
    time: model.timeLabel,
    score: model.score,
    coins: model.coins,
    paused: model.paused,
    speed: model.speed,
  }, {
    title: 'Meadow Watch',
    hearts: 2,
    wave: '2 / 3',
    time: '0:02',
    score: 90,
    coins: 100,
    paused: true,
    speed: 2,
  });
  assert.equal(model.defenders.length, 4);
  assert.deepEqual(model.defenders.map(({ id, cost, selected }) => ({ id, cost, selected })), [
    { id: 'bladeguard', cost: 50, selected: false },
    { id: 'ranger', cost: 70, selected: true },
    { id: 'ironwarden', cost: 120, selected: false },
    { id: 'rune-artificer', cost: 150, selected: false },
  ]);
  assert.deepEqual({
    id: model.selectedTower.id,
    upgradeCost: model.selectedTower.upgradeCost,
    sellValue: model.selectedTower.sellValue,
    damage: model.selectedTower.damage,
    range: model.selectedTower.range,
  }, {
    id: 'tower-1', upgradeCost: 60, sellValue: 35, damage: 60, range: 80,
  });
  assert.deepEqual(snapshot.towers, [{
    id: 'tower-1', defenderId: 'bladeguard', padId: 'l1-pad-a', tier: 0, totalInvested: 50,
  }]);
});

test('battle source routes pointer, keyboard, pause, speed, upgrade, and sell actions through validated commands', async () => {
  const [battleScene, hud, main, bundle] = await Promise.all([
    readGameFile('src/scenes/BattleScene.js'),
    readGameFile('src/ui/hud-controller.js'),
    readGameFile('src/main.js'),
    readGameFile('js/app.bundle.js'),
  ]);

  assert.match(battleScene, /createSimulation/);
  assert.match(battleScene, /summarizeSimulation/);
  assert.match(battleScene, /issueCommand\(this\.simulation, command\)/);
  assert.equal((battleScene.match(/this\.hud\.showBattle\(this\.lastSnapshot/g) ?? []).length, 2);
  assert.match(battleScene, /setPointerCapture/);
  assert.match(battleScene, /['"]keydown['"]/);
  assert.match(battleScene, /['"]Tab['"]/);
  assert.match(battleScene, /['"]ArrowRight['"]/);
  assert.match(battleScene, /['"]Enter['"]/);
  assert.match(battleScene, /['"]Space['"]/);
  assert.match(battleScene, /enemySprites\s*=\s*new Map/);
  assert.match(battleScene, /projectileSprites\s*=\s*new Map/);
  assert.match(battleScene, /telegraphSprites\s*=\s*new Map/);
  assert.match(battleScene, /damageLabelPool/);
  assert.match(battleScene, /particlePool/);
  assert.match(hud, /type:\s*['"]upgrade['"]/);
  assert.match(hud, /type:\s*['"]sell['"]/);
  assert.match(hud, /name\.style\.overflowWrap\s*=\s*['"]anywhere['"]/);
  assert.match(hud, /name\.style\.fontSize/);
  assert.match(hud, /battleHeading\.style\.minWidth\s*=/);
  assert.match(hud, /battleControls\.style\.gap\s*=/);
  assert.match(main, /installQaRuntimeHooks/);
  assert.match(hud, /getPresentationState/);
  assert.match(battleScene, /getPresentationState/);
  assert.match(bundle, /render_game_to_text/);
  assert.match(bundle, /__defenderChampion/);
});

test('campaign loading validates the manifest first and classifies one optional decorative raster', async () => {
  const [loaderModule, manifest, boot, html] = await Promise.all([
    import('../public/Games/DefenderChampion/src/services/asset-loader.js'),
    readGameFile('assets/manifest.json').then(JSON.parse),
    readGameFile('src/scenes/BootScene.js'),
    readGameFile('index.html'),
  ]);
  const {
    ASSET_USAGE_BY_ID,
    RUNTIME_METADATA_REQUESTS,
    createCampaignAssetPlan,
    validateManifest,
  } = loaderModule;
  assert.equal(validateManifest(manifest), manifest);
  const plan = createCampaignAssetPlan(manifest);

  assert.equal(plan.rasters.length, 41);
  assert.deepEqual(plan.rasters.filter(({ optional }) => optional).map(({ id }) => id), [
    'environment-props-atlas',
  ]);
  assert.equal(plan.rasters.filter(({ essential }) => essential).length, 40);
  assert.deepEqual(RUNTIME_METADATA_REQUESTS.map(({ id, essential }) => [id, essential]), [
    ['metadata-environment', true],
    ['metadata-castle', true],
    ['metadata-defenders', true],
    ['metadata-enemies', true],
    ['metadata-bosses', true],
  ]);
  assert.deepEqual(Object.keys(ASSET_USAGE_BY_ID).sort(), manifest.assets.map(({ id }) => id).sort());
  assert.ok(Object.values(ASSET_USAGE_BY_ID).every((use) => typeof use === 'string' && use.length > 0));
  assert.match(boot, /preload\(\)[\s\S]*assets\/manifest\.json[\s\S]*create\(\)[\s\S]*validateManifest[\s\S]*queueCampaignAssets/);
  assert.match(html, /id="loading-progress"/);
  assert.match(html, /id="loading-percent"/);
  assert.match(html, /id="loading-asset-id"/);
  assert.match(html, /id="retry-loading-button"[^>]*>Retry Loading</);
  assert.match(html, /id="loading-exit-button"[^>]*>Exit</);
});

test('essential raster URLs are not parser-discoverable before validated Boot loading', async () => {
  const [html, manifest, { createCampaignAssetPlan }] = await Promise.all([
    readGameFile('index.html'),
    readGameFile('assets/manifest.json').then(JSON.parse),
    import('../public/Games/DefenderChampion/src/services/asset-loader.js'),
  ]);
  const parserMarkup = html.slice(0, html.indexOf('<script src="./js/app.bundle.js"'));
  const parserDiscoveredUrls = [...parserMarkup.matchAll(/\b(?:src|srcset|href)=["']([^"']+)["']/gi)]
    .map((match) => match[1]);
  const essentialPaths = createCampaignAssetPlan(manifest).rasters
    .filter(({ essential }) => essential)
    .map(({ path }) => path);

  assert.deepEqual(
    parserDiscoveredUrls.filter((url) => essentialPaths.some((path) => url.endsWith(path))),
    [],
  );
  assert.match(html, /data-campaign-asset-id="environment-title-emblem"/);
  assert.match(html, /data-campaign-asset-id="catalog-thumbnail"/);
});

test('asset failure tracking retries only essential failures and records optional failure once', async () => {
  const { createAssetLoadTracker } = await import(
    '../public/Games/DefenderChampion/src/services/asset-loader.js'
  );
  const tracker = createAssetLoadTracker([
    { id: 'castle-states', essential: true, optional: false },
    { id: 'environment-props-atlas', essential: false, optional: true },
  ]);

  tracker.recordFailure('environment-props-atlas');
  tracker.recordFailure('environment-props-atlas');
  assert.deepEqual(tracker.getOptionalFailures(), ['environment-props-atlas']);
  assert.equal(tracker.isBlocked(), false);

  tracker.recordFailure('castle-states');
  assert.equal(tracker.isBlocked(), true);
  assert.deepEqual(tracker.getFailedEssentialIds(), ['castle-states']);
  assert.deepEqual(tracker.getRetryRecords().map(({ id }) => id), ['castle-states']);
  tracker.recordSuccess('castle-states');
  assert.equal(tracker.isBlocked(), false);
  assert.deepEqual(tracker.getRetryRecords(), []);
});

test('QA asset failure injection uses a network-level failure that cannot be masked by an SPA fallback', async () => {
  const { createQaFailureInjector } = await import(
    '../public/Games/DefenderChampion/src/services/asset-loader.js'
  );
  const injector = createQaFailureInjector({
    enabled: true,
    search: '?qa=1&qaFailEssential=environment-title-emblem',
  });
  const record = { id: 'environment-title-emblem', path: 'assets/environment/title-emblem.webp' };

  assert.equal(
    injector.rewrite(record),
    'http://127.0.0.1:1/__defender_champion_qa_missing__/environment-title-emblem',
  );
  assert.equal(injector.rewrite(record), record.path);
});

test('all character actions register exact metadata-driven Phaser animation contracts', async () => {
  const { buildAnimationDefinitions } = await import(
    '../public/Games/DefenderChampion/src/services/asset-loader.js'
  );
  const [defenders, enemies, bosses] = await Promise.all([
    readGameFile('assets/metadata/defenders.json').then(JSON.parse),
    readGameFile('assets/metadata/enemies.json').then(JSON.parse),
    readGameFile('assets/metadata/bosses.json').then(JSON.parse),
  ]);
  const definitions = buildAnimationDefinitions({ defenders, enemies, bosses });
  const authoredActions = [
    ...defenders.defenders,
    ...enemies.enemies,
    ...bosses.bosses,
  ].flatMap((character) => character.actions.map((action) => ({ character, action })));

  assert.equal(definitions.length, authoredActions.length);
  for (const { character, action } of authoredActions) {
    const expectedKind = defenders.defenders.includes(character)
      ? 'defender'
      : enemies.enemies.includes(character) ? 'enemy' : 'boss';
    const definition = definitions.find(({ key }) => key === `${expectedKind}:${character.id}:${action.id}`);
    assert.deepEqual(definition, {
      assetId: action.assetId,
      durationMs: action.frameDurationMs * action.frameCount,
      frameCount: action.frameCount,
      frameDurationMs: action.frameDurationMs,
      key: `${expectedKind}:${character.id}:${action.id}`,
      loop: action.loop,
      repeat: action.loop ? -1 : 0,
    });
  }
});

test('tower projection preserves attack and mastery actions until animation completion', async () => {
  const [{ shouldProjectDefenderIdle }, battle] = await Promise.all([
    import('../public/Games/DefenderChampion/src/presentation.js'),
    readGameFile('src/scenes/BattleScene.js'),
  ]);
  const baseState = {
    idleAnimationKey: 'defender:ranger:idle',
    idleAsset: 'defender-ranger-idle',
  };

  assert.equal(shouldProjectDefenderIdle({
    ...baseState,
    currentAnimationKey: 'defender:ranger:attack',
    isPlaying: true,
    textureKey: 'defender-ranger-attack',
  }), false);
  assert.equal(shouldProjectDefenderIdle({
    ...baseState,
    currentAnimationKey: 'defender:ranger:mastery',
    isPlaying: true,
    textureKey: 'defender-ranger-mastery',
  }), false);
  assert.equal(shouldProjectDefenderIdle({
    ...baseState,
    currentAnimationKey: 'defender:ranger:attack',
    isPlaying: false,
    textureKey: 'defender-ranger-attack',
  }), true);
  assert.equal(shouldProjectDefenderIdle({
    ...baseState,
    currentAnimationKey: 'defender:ranger:idle',
    isPlaying: true,
    textureKey: 'defender-ranger-idle',
  }), false);
  assert.match(battle, /shouldProjectDefenderIdle\(\{[\s\S]*?currentAnimationKey:[\s\S]*?isPlaying:[\s\S]*?textureKey:/);
});

test('boss warning geometry centers the full projected combat diameter on its logical source', async () => {
  const { projectCombatRadius } = await import(
    '../public/Games/DefenderChampion/src/presentation.js'
  );

  assert.deepEqual(projectCombatRadius({
    position: { x: 208, y: 412 },
    radius: 150,
    xScale: 720 / 640,
    yScale: 1.45,
  }), {
    displayHeight: 435,
    displayWidth: 337.5,
    x: 208,
    y: 412,
  });
});

test('ordinary play uses final art, responsive side rails, reduced-motion cosmetic caps, and exact canvas bounds', async () => {
  const [battle, css, presentation] = await Promise.all([
    readGameFile('src/scenes/BattleScene.js'),
    readGameFile('css/game.css'),
    import('../public/Games/DefenderChampion/src/presentation.js'),
  ]);

  assert.doesNotMatch(battle, /createDebugTextures|generateTexture|debugTextureKeys/);
  assert.match(battle, /assets\/metadata\/defenders\.json|metadata-defenders|defender:/);
  assert.match(battle, /canvas\.getBoundingClientRect\(\)/);
  assert.match(battle, /focus\(\{\s*preventScroll:\s*true\s*\}\)/);
  assert.match(battle, /HUD_RENDER_INTERVAL_TICKS/);
  assert.match(battle, /_healthKey/);
  assert.match(battle, /enemyHealthLayer/);
  assert.match(battle, /const showHealth\s*=\s*kind === 'boss' \|\| ratio < 0\.999/);
  assert.doesNotMatch(battle, /const healthBar = this\.add\.graphics\(\)/);
  assert.match(battle, /animation\?\.frames\?\.at\(-1\)\?\.textureFrame/);
  assert.doesNotMatch(battle, /texture\.frameTotal\s*-\s*1/);
  assert.match(battle, /strokeEllipse\([^\n]*PATH_X_SCALE[^\n]*PATH_Y_SCALE/);
  assert.match(css, /@media \(orientation:\s*landscape\)[\s\S]*grid-template-areas:[^;]*"status battlefield defenders"/);
  assert.doesNotMatch(css, /rotate-(?:only|device)|please rotate/i);
  assert.match(css, /#battlefield canvas\s*{[^}]*width:\s*auto\s*!important;[^}]*height:\s*auto\s*!important;/s);

  const full = presentation.resolvePresentationLimits(false);
  const reduced = presentation.resolvePresentationLimits(true);
  assert.equal(reduced.cameraShake, 0);
  assert.ok(reduced.particleCap < full.particleCap);
  assert.ok(reduced.damageLabelCap <= full.damageLabelCap);
  assert.equal(reduced.telegraphsEnabled, true);
  assert.equal(reduced.fixedStepMilliseconds, full.fixedStepMilliseconds);
});

test('battle flow starts paused for placement, counts down before tick zero, and exposes complete result actions', async () => {
  const [html, battle, hud] = await Promise.all([
    readGameFile('index.html'),
    readGameFile('src/scenes/BattleScene.js'),
    readGameFile('src/ui/hud-controller.js'),
  ]);
  assert.match(html, /id="level-intro-panel"/);
  assert.match(html, /id="battle-start-button"/);
  assert.match(html, /id="battle-countdown"[^>]+aria-live="assertive"/);
  assert.match(html, /id="result-next-button"/);
  assert.match(html, /id="result-replay-button"/);
  assert.match(battle, /battleStarted\s*=\s*false/);
  assert.match(battle, /countdownRemaining\s*=\s*3/);
  assert.match(battle, /startBattleCountdown/);
  assert.match(hud, /showLevelIntro/);
  assert.match(hud, /betweenWaveCountdown/);
});

test('campaign-derived enemy pool maps every possible authored combatant and fails loudly below capacity', async () => {
  const [{ LEVELS }, { ENEMIES }, presentation] = await Promise.all([
    import('../public/Games/DefenderChampion/src/config/levels.js'),
    import('../public/Games/DefenderChampion/src/config/enemies.js'),
    import('../public/Games/DefenderChampion/src/presentation.js'),
  ]);
  const {
    ViewPool,
    deriveCampaignEnemyViewCapacity,
    syncProjectionMap,
  } = presentation;
  const capacity = deriveCampaignEnemyViewCapacity(LEVELS, ENEMIES);
  assert.equal(capacity, 421);

  const createView = () => ({
    setActive() { return this; },
    setAlpha() { return this; },
    setVisible() { return this; },
  });
  const entries = Array.from({ length: capacity }, (_unused, index) => ({ id: `enemy-${index + 1}` }));
  const projections = new Map();
  const pool = new ViewPool(createView, { maximum: capacity });
  syncProjectionMap(projections, pool, entries, () => {});
  assert.equal(projections.size, capacity);
  assert.deepEqual(pool.getState(), {
    active: capacity,
    acquires: capacity,
    available: 0,
    created: capacity,
    highWater: capacity,
    releases: 0,
  });

  const undersizedPool = new ViewPool(createView, { maximum: capacity - 1 });
  assert.throws(
    () => syncProjectionMap(new Map(), undersizedPool, entries, () => {}),
    /Projection pool exhausted for enemy-421/,
  );
});

test('Ironhide metadata maps three stable removable plate overlays and a plate-free vulnerability accent', async () => {
  const { resolveIronhidePlatePresentation } = await import(
    '../public/Games/DefenderChampion/src/presentation.js'
  );
  const metadata = JSON.parse(await readGameFile('assets/metadata/bosses.json'));
  const mappings = metadata.bosses.find(({ id }) => id === 'ironhide-warlord').presentationMappings;

  const expectedPlates = [
    { id: 'iron-bark-plate-1', threshold: 'plate75', x: -54, y: -112 },
    { id: 'iron-bark-plate-2', threshold: 'plate50', x: 54, y: -112 },
    { id: 'iron-bark-plate-3', threshold: 'plate25', x: 0, y: -158 },
  ];
  for (const [thresholdFlags, visibleIds, vulnerabilityVisible] of [
    [{}, expectedPlates.map(({ id }) => id), false],
    [{ plate75: true }, ['iron-bark-plate-2', 'iron-bark-plate-3'], false],
    [{ plate75: true, plate50: true }, ['iron-bark-plate-3'], false],
    [{ plate75: true, plate50: true, plate25: true }, [], true],
  ]) {
    const state = resolveIronhidePlatePresentation(mappings, {
      thresholdFlags,
      tick: 120,
      vulnerableUntilTick: vulnerabilityVisible ? 180 : 0,
    });
    assert.deepEqual(state.plates.map(({ id, threshold, x, y }) => ({ id, threshold, x, y })), expectedPlates);
    assert.deepEqual(state.plates.filter(({ visible }) => visible).map(({ id }) => id), visibleIds);
    assert.equal(state.vulnerabilityVisible, vulnerabilityVisible);
  }
});

test('result transition waits exactly for the authored ten-frame boss defeat and preserves a reduced-motion final frame', async () => {
  const { resolveResultTransitionDelay } = await import(
    '../public/Games/DefenderChampion/src/presentation.js'
  );
  const metadata = JSON.parse(await readGameFile('assets/metadata/bosses.json'));

  assert.equal(resolveResultTransitionDelay({
    bossMetadata: metadata,
    enemyId: 'dread-colossus',
    reducedMotion: false,
  }), 1_500);
  assert.equal(resolveResultTransitionDelay({
    bossMetadata: metadata,
    elapsedSinceBossDefeatMs: 100,
    enemyId: 'dread-colossus',
    reducedMotion: false,
  }), 1_400);
  assert.equal(resolveResultTransitionDelay({
    bossMetadata: metadata,
    elapsedSinceBossDefeatMs: 200,
    enemyId: 'dread-colossus',
    reducedMotion: false,
  }), 1_350);
  assert.equal(resolveResultTransitionDelay({
    bossMetadata: metadata,
    enemyId: 'dread-colossus',
    reducedMotion: true,
  }), 650);
});

test('combat emits every required short-lived presentation edge without changing authored rules', async () => {
  const [combat, waves, simulation] = await Promise.all([
    readGameFile('src/core/combat.js'),
    readGameFile('src/core/wave-controller.js'),
    readGameFile('src/core/simulation.js'),
  ]);
  for (const kind of [
    'tower-attack', 'tower-mastery', 'enemy-defeated', 'castle-impact',
    'hexcaller-cast', 'ironhide-rally', 'boss-ability-warning', 'boss-ability-impact',
    'ironhide-plate-break', 'ironhide-vulnerable', 'dread-phase', 'dread-summon',
  ]) assert.match(combat, new RegExp(`['\"]${kind}['\"]`), `missing ${kind}`);
  assert.match(waves, /['"]wave-start['"]/);
  assert.match(combat, /['"]wave-complete['"]/);
  assert.match(simulation, /presentationEvents/);
  assert.match(simulation, /clearPresentationEvents/);
});

test('the complete uncompressed first-load file ledger stays within fifteen million bytes', async () => {
  const { getRuntimePayloadPaths } = await import(
    '../public/Games/DefenderChampion/src/services/asset-loader.js'
  );
  const manifest = JSON.parse(await readGameFile('assets/manifest.json'));
  const relativePaths = getRuntimePayloadPaths(manifest);
  assert.equal(relativePaths.length, new Set(relativePaths).size, 'payload ledger cannot double-count files');
  const byteEntries = await Promise.all(relativePaths.map(async (relativePath) => ({
    bytes: (await stat(new URL(relativePath, gameRoot))).size,
    path: relativePath,
  })));
  const totalBytes = byteEntries.reduce((sum, entry) => sum + entry.bytes, 0);
  assert.ok(totalBytes <= 15_000_000, `raw first-load payload ${totalBytes} exceeds 15000000 bytes`);
  assert.ok(15_000_000 - totalBytes >= 100_000, `payload headroom ${15_000_000 - totalBytes} is below 100 KB`);
});
