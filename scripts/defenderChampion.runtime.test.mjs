import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import test from 'node:test';

const gameRoot = new URL('../public/Games/DefenderChampion/', import.meta.url);
const readGameFile = (path) => readFile(new URL(path, gameRoot), 'utf8');

let battleSceneModulePromise;
const importBattleSceneModule = () => {
  if (battleSceneModulePromise) return battleSceneModulePromise;
  const phaserStub = `export default {
    Scene: class {},
    Scenes: { Events: { SHUTDOWN: 'shutdown', RESUME: 'resume' } },
    Geom: { Rectangle: class Rectangle {
      constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }); }
      static Contains(rectangle, x, y) {
        return x >= rectangle.x && y >= rectangle.y
          && x <= rectangle.x + rectangle.width && y <= rectangle.y + rectangle.height;
      }
    } },
    Math: { Linear: (start, end, ratio) => start + ((end - start) * ratio) }
  };`;
  const hook = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === 'phaser') {
        return { shortCircuit: true, url: `data:text/javascript,${encodeURIComponent(phaserStub)}` };
      }
      return nextResolve(specifier, context);
    },
  });
  battleSceneModulePromise = import(
    '../public/Games/DefenderChampion/src/scenes/BattleScene.js?runtime-test'
  ).finally(() => hook.deregister());
  return battleSceneModulePromise;
};

const createSceneBody = () => ({
  alpha: 1,
  angle: 0,
  listenerCount: 1,
  tint: 0xffffff,
  texture: { key: 'enemy-blight-walker-walk' },
  x: 0,
  y: 0,
  anims: {
    currentAnim: { key: 'enemy:blight-walker:walk' },
    isPlaying: true,
    playCalls: [],
    play(key) {
      this.playCalls.push(key);
      this.isPlaying = true;
      return this;
    },
    stop() {
      this.isPlaying = false;
      return this;
    },
  },
  removeAllListeners(eventName) {
    assert.equal(eventName, 'animationcomplete');
    this.listenerCount = 0;
    return this;
  },
  setAlpha(alpha) { this.alpha = alpha; return this; },
  setAngle(angle) { this.angle = angle; return this; },
  setPosition(x, y) { this.x = x; this.y = y; return this; },
  setScale(scale) { this.scale = scale; return this; },
  setFlipX(flipX) { this.flipX = flipX; return this; },
  setFrame(frame) { this.frame = frame; return this; },
  setTexture(key) { this.texture.key = key; return this; },
  setTint(tint) { this.tint = tint; return this; },
});

const createVisualRoot = () => ({
  alpha: 1,
  angle: 0,
  x: 0,
  y: 0,
  setAlpha(alpha) { this.alpha = alpha; return this; },
  setAngle(angle) { this.angle = angle; return this; },
  setPosition(x, y) { this.x = x; this.y = y; return this; },
});

const createSceneView = () => ({
  active: false,
  alpha: 1,
  visible: false,
  x: 0,
  y: 0,
  _attackPoseReady: false,
  _attackTargetTowerId: null,
  _accent: {
    _baseScale: 0.34,
    _baseX: 0,
    _baseY: -92.16,
    scale: 0.34,
    visible: false,
    x: 0,
    y: -92.16,
    setFrame() { return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setScale(scale) { this.scale = scale; return this; },
    setTint() { return this; },
    setVisible(visible) { this.visible = visible; return this; },
  },
  _baseScale: 0.4,
  _body: createSceneBody(),
  _motion: null,
  _visualRoot: createVisualRoot(),
  setActive(active) { this.active = active; return this; },
  setAlpha(alpha) { this.alpha = alpha; return this; },
  setDepth(depth) { this.depth = depth; return this; },
  setPosition(x, y) { this.x = x; this.y = y; return this; },
  setVisible(visible) { this.visible = visible; return this; },
});

const createGraphicsDouble = () => ({
  clearCount: 0,
  visible: true,
  clear() { this.clearCount += 1; return this; },
  fillRoundedRect() { return this; },
  fillStyle() { return this; },
  setVisible(visible) { this.visible = visible; return this; },
});

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

class SemanticElementDouble extends EventTargetDouble {
  constructor(tagName, documentRef) {
    super();
    this.attributes = new Map();
    this.children = [];
    this.documentRef = documentRef;
    this.tagName = tagName.toUpperCase();
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
  }

  appendChild(child) {
    this.append(child);
    return child;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'id') this.documentRef.elements.set(String(value), this);
  }
}

const createSemanticDocument = () => {
  const documentRef = {
    activeElement: null,
    elements: new Map(),
    createElement(tagName) {
      return new SemanticElementDouble(tagName, documentRef);
    },
    getElementById(id) {
      return this.elements.get(id) ?? null;
    },
  };
  return documentRef;
};

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
  assert.match(html, /id="battlefield" tabindex="0" role="grid" aria-rowcount="12" aria-colcount="9"/);
  assert.match(html, /aria-describedby="battlefield-instructions"/);
  assert.match(html, /id="battlefield-instructions"[^>]*class="sr-only"/);
  assert.match(html, /id="defender-dock"/);
  assert.match(html, /<section id="result-screen" aria-live="polite" hidden>/);
  assert.match(html, /id="how-to-screen"[^>]+role="dialog"[^>]+aria-modal="true"/);
  assert.match(html, /id="settings-screen"[^>]+role="dialog"[^>]+aria-modal="true"/);
  assert.match(html, /id="portrait-lock-screen"[^>]+role="dialog"[^>]+aria-modal="true"/);
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
  assert.match(css, /#portrait-lock-screen\s*{[^}]*position:\s*fixed;[^}]*inset:\s*0;/s);
  assert.match(css, /#battle-screen\s*{[^}]*min-width:\s*0;/s);
  assert.match(css, /\.battle-hud,[^}]*#battlefield,[^}]*#defender-dock\s*{[^}]*min-width:\s*0;/s);
  assert.match(css, /#battlefield canvas\s*{[^}]*position:\s*absolute;[^}]*inset:\s*0;/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[^{]*{[^}]*html\[data-motion-preference="system"\]/s);
  assert.match(css, /html\[data-motion-preference="reduce"\]/);
});

test('portrait CSS uses a definite safe-height 3 by 4 battlefield without document scrolling', async () => {
  const css = await readGameFile('css/game.css');
  const html = await readGameFile('index.html');

  assert.match(html, /id="portrait-lock-screen"[^>]+role="dialog"[^>]+aria-modal="true"/);
  assert.match(css, /#battlefield\s*{[^}]*aspect-ratio:\s*3\s*\/\s*4;/s);
  assert.match(css, /#battle-screen\s*{[^}]*height:\s*calc\(100dvh/s);
  assert.match(
    css,
    /#battlefield\s*{[^}]*width:\s*100%;[^}]*max-width:\s*calc\(\(100dvh - 250px\) \* \.75\);/s,
  );
  assert.match(css, /body\s*{[^}]*overflow:\s*hidden;/s);
});

test('compact battle controls preserve the forty-four pixel native hit floor', async () => {
  const css = await readGameFile('css/game.css');
  assert.match(css, /\.battle-start-button\s*{[^}]*min-height:\s*44px;/s);
});

test('compact portrait dock preserves space for the contextual action row', async () => {
  const css = await readGameFile('css/game.css');
  assert.match(
    css,
    /@media \(orientation:\s*portrait\) and \(max-height:\s*680px\)\s*{[\s\S]*?#defender-dock\s*{[^}]*grid-template-areas:\s*"heading heading"\s*"cards panel"\s*"notice notice";[\s\S]*?\.dock-list\s*{[^}]*grid-area:\s*cards;[^}]*grid-template-columns:\s*repeat\(2,[^;]+;[\s\S]*?#tower-panel\s*{[^}]*grid-area:\s*panel;[^}]*grid-template-columns:\s*1fr 1fr;/s,
  );
});

test('the local entry boots one transparent Phaser game with the declared scene list', async () => {
  const [main, phaserEntry, runtimeLifecycle] = await Promise.all([
    readGameFile('src/main.js'),
    readGameFile('src/phaser-entry.js'),
    readGameFile('src/runtime-lifecycle.js'),
  ]);

  assert.match(main, /from ['"]phaser['"]/);
  assert.match(main, /createDefenderPhaserGame/);
  assert.match(phaserEntry, /parent:\s*['"]battlefield['"]/);
  assert.match(phaserEntry, /transparent:\s*true/);
  assert.match(phaserEntry, /width:\s*720/);
  assert.match(phaserEntry, /height:\s*960/);
  assert.match(main, /Math\.min\([^)]*devicePixelRatio[^)]*,\s*2\)/);
  assert.match(main, /createOrientationController/);
  assert.match(main, /orientationController\.start\(\)/);
  assert.match(main, /scenes:\s*\[\s*BootScene,\s*MenuScene,\s*LevelSelectScene,\s*BattleScene,\s*ResultScene\s*\]/s);
  assert.match(main, /applyRuntimePauseState\(\{\s*battleScene,\s*game,\s*paused,\s*reasons\s*\}\)/);
  assert.match(runtimeLifecycle, /export const applyRuntimePauseState/);
  assert.match(runtimeLifecycle, /game\?\.loop\?\.sleep\?\.\(\)/);
  assert.match(runtimeLifecycle, /game\?\.loop\?\.wake\?\.\(\)/);
  assert.match(phaserEntry, /hostBridge\?\.getPauseState\?\.\(\)\.paused/);
  assert.match(main, /rel\s*=\s*['"]icon['"]/);
  assert.match(main, /data:image\/gif;base64/);
});

test('the production Phaser entry boots with denied Web Audio while independent audio degrades silently', async () => {
  const [{ createDefenderPhaserGame }, { createAudioController }] = await Promise.all([
    import('../public/Games/DefenderChampion/src/phaser-entry.js'),
    import('../public/Games/DefenderChampion/src/services/audio.js'),
  ]);
  const windowRef = new EventTargetDouble();
  let audioConstructionAttempts = 0;
  windowRef.AudioContext = class DeniedAudioContext {
    constructor() {
      audioConstructionAttempts += 1;
      throw new DOMException('QA audio denied', 'NotAllowedError');
    }
  };
  const audioController = createAudioController({ windowRef });
  const registryEntries = new Map();
  const constructedGames = [];
  const PhaserDouble = {
    AUTO: 'auto',
    Scale: { CENTER_BOTH: 'center-both', FIT: 'fit' },
    Game: class GameDouble {
      constructor(config) {
        if (!config.audio?.noAudio) new windowRef.AudioContext();
        this.config = config;
        this.registry = { set: (key, value) => registryEntries.set(key, value) };
        config.callbacks.preBoot(this);
        constructedGames.push(this);
      }
    },
  };
  const hud = { id: 'hud' };
  const hostBridge = { id: 'host' };
  const scenes = [class Boot {}, class Menu {}, class Levels {}, class Battle {}, class Result {}];

  const game = createDefenderPhaserGame({
    PhaserLib: PhaserDouble,
    audioController,
    hostBridge,
    hud,
    resolution: 2,
    scenes,
  });

  assert.equal(constructedGames.length, 1);
  assert.equal(game, constructedGames[0]);
  assert.deepEqual(game.config.audio, { noAudio: true });
  assert.equal(game.config.parent, 'battlefield');
  assert.equal(game.config.resolution, 2);
  assert.equal(game.config.scale.mode, PhaserDouble.Scale.FIT);
  assert.deepEqual(game.config.scene, scenes);
  assert.equal(registryEntries.get('hud'), hud);
  assert.equal(registryEntries.get('hostBridge'), hostBridge);
  assert.equal(registryEntries.get('audioController'), audioController);
  assert.equal(audioConstructionAttempts, 0, 'Phaser must not construct its own audio context');

  windowRef.dispatch('pointerdown');
  assert.equal(audioConstructionAttempts, 1, 'only the independent audio controller tries Web Audio');
  assert.equal(audioController.isUnlocked(), false);
  audioController.setAudioMuted(true);
  audioController.setPaused(true);
  audioController.setPaused(false);
  assert.deepEqual(audioController.getSettings(), { muted: true, musicVolume: 0.3, sfxVolume: 0.7 });
  audioController.destroy();
});

test('world points and keyboard moves resolve exact square cells at every boundary', async () => {
  const grid = await import('../public/Games/DefenderChampion/src/grid-presentation.js');
  const pointCases = [
    [{ x: 0, y: 0 }, 'r0c0'],
    [{ x: 79.999, y: 79.999 }, 'r0c0'],
    [{ x: 80, y: 80 }, 'r1c1'],
    [{ x: 719.99, y: 959.99 }, 'r11c8'],
    [{ x: -0.001, y: 0 }, null],
    [{ x: 0, y: -0.001 }, null],
    [{ x: 720, y: 0 }, null],
    [{ x: 0, y: 960 }, null],
    [{ x: Number.NaN, y: 0 }, null],
  ];
  for (const [point, expected] of pointCases) {
    assert.equal(grid.resolveCellFromWorldPoint(point), expected);
  }

  const moveCases = [
    [{ cellId: 'r4c4', key: 'ArrowRight' }, 'r4c5'],
    [{ cellId: 'r4c4', key: 'ArrowLeft' }, 'r4c3'],
    [{ cellId: 'r4c4', key: 'ArrowDown' }, 'r5c4'],
    [{ cellId: 'r4c4', key: 'ArrowUp' }, 'r3c4'],
    [{ cellId: 'r0c0', key: 'ArrowLeft' }, 'r0c0'],
    [{ cellId: 'r0c0', key: 'ArrowUp' }, 'r0c0'],
    [{ cellId: 'r11c8', key: 'ArrowRight' }, 'r11c8'],
    [{ cellId: 'r11c8', key: 'ArrowDown' }, 'r11c8'],
    [{ cellId: 'invalid', key: 'ArrowRight' }, 'r0c0'],
    [{ cellId: 'r4c4', key: 'Enter' }, 'r4c4'],
  ];
  for (const [input, expected] of moveCases) {
    assert.equal(grid.resolveGridFocusMove(input), expected);
  }
});

test('cell visuals independently expose terrain compatibility occupancy and enemy coverage', async () => {
  const { resolveCellVisualState } = await import(
    '../public/Games/DefenderChampion/src/grid-presentation.js'
  );
  assert.deepEqual(resolveCellVisualState({
    enemyCovered: false,
    focused: false,
    occupied: false,
    selectedLayer: 'road',
    terrain: 'road',
  }), {
    acceptsBuild: true,
    borderAlpha: 0.9,
    borderColor: 0x8fe36a,
    fillAlpha: 0.18,
    fillColor: 0x8fe36a,
    compatible: true,
    danger: false,
    enemyCovered: false,
    focused: false,
    occupied: false,
    terrain: 'road',
  });
  assert.deepEqual(resolveCellVisualState({
    focused: true,
    occupied: true,
    selectedLayer: 'road',
    terrain: 'grass',
  }), {
    acceptsBuild: false,
    borderAlpha: 1,
    borderColor: 0xffffff,
    fillAlpha: 0.22,
    fillColor: 0xf2c94c,
    compatible: false,
    danger: false,
    enemyCovered: false,
    focused: true,
    occupied: true,
    terrain: 'grass',
  });
  assert.deepEqual(resolveCellVisualState({
    enemyCovered: true,
    selectedLayer: 'road',
    terrain: 'road',
  }), {
    acceptsBuild: false,
    borderAlpha: 0.9,
    borderColor: 0xff6b61,
    fillAlpha: 0.24,
    fillColor: 0xff6b61,
    compatible: true,
    danger: false,
    enemyCovered: true,
    focused: false,
    occupied: false,
    terrain: 'road',
  });
  const dangerOnly = resolveCellVisualState({
    danger: true,
    enemyCovered: false,
    selectedLayer: 'road',
    terrain: 'road',
  });
  assert.equal(dangerOnly.fillColor, 0xff6b61);
  assert.equal(dangerOnly.danger, true);
  assert.equal(dangerOnly.enemyCovered, false,
    'inferring coverage from shared danger color must fail this assertion');
});

test('range mastery and danger presentation returns square cell IDs, never radii', async () => {
  const [{ LEVELS }, grid] = await Promise.all([
    import('../public/Games/DefenderChampion/src/config/levels.js'),
    import('../public/Games/DefenderChampion/src/grid-presentation.js'),
  ]);
  const result = grid.resolveSquareRangeCells({
    originCellId: 'r6c4', range: 160, targetTerrain: 'road', level: LEVELS[0],
  });
  assert.deepEqual(result, [
    { cellId: 'r4c4', inRange: true },
    { cellId: 'r6c2', inRange: true },
    { cellId: 'r7c3', inRange: true },
    { cellId: 'r7c4', inRange: true },
    { cellId: 'r7c5', inRange: true },
  ]);
  assert.equal(result.every((entry) => !('radius' in entry)), true);
  assert.deepEqual(grid.resolveSquareRangeCells({
    originCellId: 'r0c0', range: -1, targetTerrain: null, level: LEVELS[0],
  }), []);
});

test('accessible labels and readable art scales preserve cell and unit identity', async () => {
  const { formatCellAccessibleLabel, resolveReadableSpriteScale } = await import(
    '../public/Games/DefenderChampion/src/grid-presentation.js'
  );
  assert.equal(formatCellAccessibleLabel({
    acceptsBuild: true, cellId: 'r4c7', selectedRole: 'Road melee', terrain: 'road',
  }), 'Road square row 5 column 8, available for Road melee');
  assert.equal(formatCellAccessibleLabel({
    cellId: 'r6c3', occupiedBy: 'Ranger', terrain: 'grass',
  }), 'Grass square row 7 column 4, occupied by Ranger');
  assert.equal(formatCellAccessibleLabel({
    cellId: 'r2c7', enemyCovered: true, terrain: 'road',
  }), 'Road square row 3 column 8, blocked by enemies');
  assert.equal(formatCellAccessibleLabel({
    acceptsBuild: true, cellId: 'r0c0', danger: true,
    selectedRole: 'Grass ranged', terrain: 'grass',
  }), 'Grass square row 1 column 1, available for Grass ranged, danger telegraph');

  assert.equal(resolveReadableSpriteScale({
    authoredScale: 0.1, cssWorldScale: 0.5, frameHeight: 256, kind: 'defender', population: 108,
  }), 0.34375);
  assert.equal(resolveReadableSpriteScale({
    authoredScale: 0.1, cssWorldScale: 0.5, frameHeight: 256, kind: 'enemy', population: 18,
  }), 0.296875);
  assert.ok(Math.abs(resolveReadableSpriteScale({
    authoredScale: 0.1, cssWorldScale: 0.5, frameHeight: 384, kind: 'boss', population: 1,
  }) - (52 / 192)) < 1e-12);
  assert.equal(resolveReadableSpriteScale({
    authoredScale: 0.44, cssWorldScale: 1, frameHeight: 256, kind: 'defender', population: 1,
  }), 0.44);
});

test('semantic grid mirror keeps 12 rows, 108 cells, one active descendant, and explicit state labels', async () => {
  const [{ BattleScene }, { LEVELS }, hudModule] = await Promise.all([
    importBattleSceneModule(),
    import('../public/Games/DefenderChampion/src/config/levels.js'),
    import('../public/Games/DefenderChampion/src/ui/hud-controller.js'),
  ]);
  assert.equal(typeof hudModule.createBattlefieldGridMirror, 'function',
    'removing the semantic-grid builder must fail this real DOM boundary');

  const documentRef = createSemanticDocument();
  const battlefield = documentRef.createElement('div');
  battlefield.setAttribute('id', 'battlefield');
  const mirror = hudModule.createBattlefieldGridMirror({
    battlefield,
    cells: LEVELS[0].cells,
    documentRef,
  });
  assert.equal(mirror.rows.length, 12);
  assert.equal(mirror.cells.size, 108);
  assert.equal(mirror.rows.every((row) => row.getAttribute('role') === 'row'), true);
  assert.equal([...mirror.cells.values()].every((cell) => (
    cell.getAttribute('role') === 'gridcell' && cell.getAttribute('tabindex') === null
  )), true, 'adding 108 tab stops must fail this assertion');

  const scene = Object.create(BattleScene.prototype);
  Object.assign(scene, {
    accessibleCellNodes: mirror.cells,
    battlefieldElement: battlefield,
    battlefieldHasFocus: true,
    cellViews: new Map(LEVELS[0].cells.map((cell) => [cell.id, {
      _terrain: cell.terrain,
      _visualState: null,
    }])),
    drawCellView() {},
    enemyById: new Map(),
    focusedCellId: 'r0c0',
    level: LEVELS[0],
    selectedDefenderId: 'bladeguard',
    selectedTowerId: null,
    towerById: new Map(),
  });

  scene.projectCells({ effects: [], enemies: [], towers: [] });
  assert.equal(battlefield.getAttribute('aria-activedescendant'), 'battlefield-cell-r0c0');
  assert.equal(mirror.cells.get('r0c0').getAttribute('aria-label'),
    'Grass square row 1 column 1, unavailable for Road melee');
  assert.equal(mirror.cells.get('r0c0').getAttribute('aria-selected'), 'true');

  scene.projectCells({
    effects: [{ kind: 'boss-telegraph', radius: 80, sourceId: 'enemy-warning' }],
    enemies: [],
    towers: [],
  });
  assert.equal(mirror.cells.get('r0c0').getAttribute('aria-label'),
    'Grass square row 1 column 1, unavailable for Road melee',
    'danger red must not be inferred as enemy coverage');

  scene.towerById = new Map([['tower-1', {
    cellId: 'r0c0', defenderId: 'ranger', id: 'tower-1', tier: 0,
  }]]);
  scene.projectCells({ effects: [], enemies: [], towers: [...scene.towerById.values()] });
  assert.equal(mirror.cells.get('r0c0').getAttribute('aria-label'),
    'Grass square row 1 column 1, occupied by Ranger');

  scene.towerById.clear();
  scene.selectedDefenderId = 'ranger';
  scene.projectCells({ effects: [], enemies: [], towers: [] });
  assert.equal(mirror.cells.get('r0c0').getAttribute('aria-label'),
    'Grass square row 1 column 1, available for Grass ranged');

  mirror.destroy();
  assert.equal(battlefield.children.length, 0);
});

test('actual battlefield creates 108 interactive square cells and square road tile records', async () => {
  const [{ BattleScene }, { getLevel }, { createSimulation }] = await Promise.all([
    importBattleSceneModule(),
    import('../public/Games/DefenderChampion/src/config/levels.js'),
    import('../public/Games/DefenderChampion/src/core/simulation.js'),
  ]);
  const graphicViews = [];
  const roadViews = [];
  const chain = (view) => Object.assign(view, {
    setAlpha(alpha) { this.alpha = alpha; return this; },
    setDepth(depth) { this.depth = depth; return this; },
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
    setInteractive(hitArea) {
      this.interactive = true;
      this.width = hitArea.width;
      this.height = hitArea.height;
      return this;
    },
    setName(name) { this.name = name; return this; },
    setOrigin() { return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setScale() { return this; },
    setTileScale() { return this; },
  });
  const scene = Object.create(BattleScene.prototype);
  Object.assign(scene, {
    add: {
      graphics() {
        const view = chain({
          clear() { return this; },
          fillRect() { return this; },
          fillStyle() { return this; },
          lineStyle() { return this; },
          strokeRect() { return this; },
        });
        graphicViews.push(view);
        return view;
      },
      image(x, y, texture, frame) {
        const view = chain({ x, y, texture, frame });
        if (texture === 'environment-path-atlas') roadViews.push(view);
        return view;
      },
      sprite(x, y, texture, frame) { return chain({ x, y, texture, frame }); },
      tileSprite() { return chain({}); },
    },
    level: getLevel('level-1'),
    textures: { exists: () => false },
  });

  scene.createBattlefield();
  assert.equal(scene.cellViews.size, 108);
  assert.equal(graphicViews.length, 108);
  assert.equal(graphicViews.every(({ width, height, interactive }) => (
    width === 80 && height === 80 && interactive === true
  )), true);
  assert.equal(roadViews.length, scene.level.roadCells.length);
  assert.equal(roadViews.every(({ displayWidth, displayHeight }) => (
    displayWidth === 80 && displayHeight === 80
  )), true);

  Object.assign(scene, {
    enemyById: new Map(), enemySprites: new Map(), lastSnapshot: { tick: 0 },
    towerSprites: new Map(), projectileSprites: new Map(),
  });
  const state = scene.getPresentationState();
  assert.equal(state.cells.length, 108);
  assert.equal(state.roadTiles.length, scene.level.roadCells.length);
  assert.equal(state.roadTiles.every(({ height, width }) => height === 80 && width === 80), true);
  assert.equal('markers' in state, false);
  Object.assign(scene, {
    battleStarted: false,
    betweenWaveCountdown: null,
    countdownActive: false,
    frameSamples: [],
    selectedDefenderId: null,
    selectedTowerId: null,
    simulation: createSimulation('level-1', { qa: true }),
  });
  const textState = scene.getTextSnapshot();
  assert.equal(textState.battlefield.cells.length, 108);
  assert.equal(textState.battlefield.roadTiles.length, scene.level.roadCells.length);
  assert.equal(textState.battlefield.enemies.length, textState.enemies.length);
});

test('actual pointer containment and keyboard entry dispatch direct cell commands', async () => {
  const [{ BattleScene }, { getLevel }] = await Promise.all([
    importBattleSceneModule(),
    import('../public/Games/DefenderChampion/src/config/levels.js'),
  ]);
  let canvasBounds = { left: 0, top: 0, width: 720, height: 960 };
  const focusedBounds = { left: 30, top: 20, width: 360, height: 500 };
  const announcements = [];
  const dispatched = [];
  const selectedTowers = [];
  const scene = Object.create(BattleScene.prototype);
  Object.assign(scene, {
    focusedCellId: 'r0c0',
    lastSnapshot: { enemies: [], terminal: false, towers: [] },
    level: getLevel('level-1'),
    selectedDefenderId: 'bladeguard',
    selectedTowerId: null,
    terminalHandled: false,
    towerById: new Map(),
    hud: { announce: (message) => announcements.push(message) },
    issueBattleCommand(command) {
      dispatched.push(command);
      return { accepted: true, reason: null };
    },
    selectTower: (towerId) => selectedTowers.push(towerId),
    updateFocusViews() {},
  });
  const battlefield = {
    focus(options) {
      assert.deepEqual(options, { preventScroll: true });
      canvasBounds = focusedBounds;
    },
    querySelector: () => ({ getBoundingClientRect: () => canvasBounds }),
    setPointerCapture() {},
  };
  const pointerEvent = (clientX, clientY, pointerId = 7) => ({
    clientX, clientY, pointerId, preventDefault() {},
  });
  const clientFor = (x, y) => ({
    x: focusedBounds.left + (x * 0.5),
    y: focusedBounds.top + 10 + (y * 0.5),
  });
  const grass = clientFor(440, 40);

  scene.handlePointerDown(pointerEvent(grass.x, grass.y), battlefield);
  assert.equal(
    scene.focusedCellId,
    'r0c0',
    'an incompatible pointer rejection must preserve the previously focused square',
  );
  assert.deepEqual(dispatched, []);
  assert.equal(announcements.at(-1), 'Choose a road square for this melee defender.');

  scene.selectedDefenderId = 'ranger';
  scene.handlePointerDown(pointerEvent(grass.x, grass.y, 8), battlefield);
  assert.equal(scene.focusedCellId, 'r0c5');
  assert.deepEqual(dispatched, [{ type: 'build', defenderId: 'ranger', cellId: 'r0c5' }]);

  scene.selectedDefenderId = null;
  scene.towerById = new Map([['tower-1', { id: 'tower-1', cellId: 'r0c5', defenderId: 'ranger' }]]);
  scene.handlePointerDown(pointerEvent(grass.x, grass.y, 9), battlefield);
  assert.deepEqual(selectedTowers, ['tower-1']);

  scene.selectedDefenderId = 'bladeguard';
  scene.focusedCellId = 'r4c4';
  let prevented = false;
  scene.handleKeyDown({ key: 'ArrowRight', code: 'ArrowRight', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(scene.focusedCellId, 'r4c5');
  scene.handleKeyDown({ key: 'Enter', code: 'Enter', preventDefault() {} });
  assert.deepEqual(dispatched.at(-1), { type: 'build', defenderId: 'bladeguard', cellId: 'r4c5' });
});

test('BattleScene source contains no circular battlefield drawing primitive or legacy pad presentation', async () => {
  const source = await readGameFile('src/scenes/BattleScene.js');
  assert.doesNotMatch(
    source,
    /strokeEllipse|fillCircle|strokeCircle|rangeRing|padSprites|POINTER_HIT_RADIUS|level\.path/,
  );
});

test('the shared placement gate blocks an incompatible command before dispatch', async () => {
  const { attemptPlacementBuild } = await import(
    '../public/Games/DefenderChampion/src/presentation.js'
  );
  assert.equal(typeof attemptPlacementBuild, 'function');

  const dispatched = [];
  const announcements = [];
  const issueCommand = (command) => {
    dispatched.push(command);
    return { accepted: true, reason: null };
  };
  const announce = (message) => announcements.push(message);
  const incompatible = {
    announce,
    cell: { id: 'r0c5', terrain: 'grass' },
    issueCommand,
    selectedDefenderId: 'bladeguard',
    selectedLayer: 'road',
  };

  assert.deepEqual(attemptPlacementBuild(incompatible), {
    accepted: false,
    reason: 'placement-layer-mismatch',
  });
  assert.deepEqual(dispatched, [], 'incompatible input never reaches simulation commands');
  assert.deepEqual(announcements, ['Choose a road square for this melee defender.']);

  assert.deepEqual(attemptPlacementBuild({
    ...incompatible,
    cell: { id: 'r2c7', terrain: 'road' },
  }), { accepted: true, reason: null });
  assert.deepEqual(dispatched, [{
    type: 'build', defenderId: 'bladeguard', cellId: 'r2c7',
  }]);
});

test('cell-only tower snapshots project directly at their square center', async () => {
  const [
    { BattleScene },
    { LEVELS },
  ] = await Promise.all([
    importBattleSceneModule(),
    import('../public/Games/DefenderChampion/src/config/levels.js'),
  ]);
  const view = Object.assign(createSceneView(), {
    _aura: {
      setAlpha() { return this; }, setScale() { return this; }, setTint() { return this; }, setVisible() { return this; },
    },
    _healthBackground: createGraphicsDouble(),
    _healthFill: createGraphicsDouble(),
    _rank: {
      setScale() { return this; }, setTint() { return this; }, setVisible() { return this; },
    },
  });
  const scene = Object.create(BattleScene.prototype);
  Object.assign(scene, {
    anims: { exists: () => false },
    defenderPool: { acquire: () => view, release() {} },
    level: LEVELS[0],
    metadata: { defenders: { frame: { height: 256 } } },
    towerSprites: new Map(),
  });

  BattleScene.prototype.projectTowers.call(scene, {
    towers: [{
      id: 'tower-1', defenderId: 'ranger', cellId: 'r0c5', placementLayer: 'grass', combatLayer: 'backline',
      tier: 0, health: 1, maxHealth: 1,
    }],
  });

  assert.equal(view._cellId, 'r0c5');
  assert.deepEqual({ x: view.x, y: view.y }, { x: 440, y: 72 });
});

test('mixed valid and malformed towers release invalid leases without hiding valid projections', async () => {
  const [
    { BattleScene },
    { LEVELS },
    { ViewPool },
  ] = await Promise.all([
    importBattleSceneModule(),
    import('../public/Games/DefenderChampion/src/config/levels.js'),
    import('../public/Games/DefenderChampion/src/presentation.js'),
  ]);
  const makeView = () => Object.assign(createSceneView(), {
    _aura: {
      setAlpha() { return this; }, setScale() { return this; }, setTint() { return this; }, setVisible() { return this; },
    },
    _healthBackground: createGraphicsDouble(),
    _healthFill: createGraphicsDouble(),
    _rank: {
      setScale() { return this; }, setTint() { return this; }, setVisible() { return this; },
    },
  });
  const scene = Object.create(BattleScene.prototype);
  const defenderPool = new ViewPool(makeView, { maximum: 3 });
  Object.assign(scene, {
    anims: { exists: () => false },
    defenderPool,
    level: LEVELS[0],
    metadata: { defenders: { frame: { height: 256 } } },
    projectionDiagnostics: [],
    towerSprites: new Map(),
  });

  scene.projectTowers({
    towers: [
      {
        id: 'tower-malformed', defenderId: 'ranger', cellId: 'r0c0', placementLayer: 'grass', combatLayer: 'backline',
        tier: 0, health: 1, maxHealth: 1,
      },
      {
        id: 'tower-unknown', defenderId: 'ranger', cellId: 'r0c1', placementLayer: 'grass', combatLayer: 'backline',
        tier: 0, health: 1, maxHealth: 1,
      },
    ],
  });
  assert.equal(defenderPool.getState().active, 2);
  scene.projectionDiagnostics = [];

  assert.doesNotThrow(() => BattleScene.prototype.projectTowers.call(scene, {
    towers: [
      {
        id: 'tower-road', defenderId: 'bladeguard', cellId: 'r0c4', placementLayer: 'road', combatLayer: 'frontline',
        tier: 0, health: 420, maxHealth: 420,
      },
      {
        id: 'tower-grass', defenderId: 'ranger', cellId: 'r11c0', placementLayer: 'grass', combatLayer: 'backline',
        tier: 0, health: 1, maxHealth: 1,
      },
      {
        id: 'tower-malformed', defenderId: 'ranger', cellId: 'r12c9', placementLayer: 'grass', combatLayer: 'backline',
        tier: 0, health: 1, maxHealth: 1,
      },
      {
        id: 'tower-unknown', defenderId: 'unknown-defender', cellId: 'r0c0', placementLayer: 'grass', combatLayer: 'backline',
        tier: 0, health: 1, maxHealth: 1,
      },
    ],
  }));

  assert.deepEqual({ x: scene.towerSprites.get('tower-road').x, y: scene.towerSprites.get('tower-road').y }, {
    x: 360, y: 72,
  });
  assert.deepEqual({ x: scene.towerSprites.get('tower-grass').x, y: scene.towerSprites.get('tower-grass').y }, {
    x: 40, y: 952,
  });
  assert.deepEqual([...scene.towerSprites.keys()], ['tower-road', 'tower-grass']);
  assert.equal(defenderPool.getState().active, 2);
  assert.deepEqual(scene.projectionDiagnostics.map(({ id, reason }) => ({ id, reason })), [
    { id: 'tower-malformed', reason: 'invalid-cell' },
    { id: 'tower-unknown', reason: 'unknown-defender' },
  ]);

  scene.projectTowers({ towers: [] });
  assert.equal(defenderPool.getState().active, 0);
  assert.equal(defenderPool.getState().available, 2);
});

test('mixed valid and unknown enemies isolate malformed entries and recover the enemy pool', async () => {
  const [{ BattleScene }, { createGridPathMetrics }, { LEVELS }, { ViewPool }] = await Promise.all([
    importBattleSceneModule(),
    import('../public/Games/DefenderChampion/src/core/grid-geometry.js'),
    import('../public/Games/DefenderChampion/src/config/levels.js'),
    import('../public/Games/DefenderChampion/src/presentation.js'),
  ]);
  const valid = {
    attackState: { targetTowerId: null }, displayLaneOffset: 0, displayPathProgress: 0,
    displayScale: 1, enemyId: 'blight-walker', health: 80, id: 'enemy-valid',
    laneState: 'moving', maxHealth: 80, pathProgress: 0,
  };
  const unknown = { ...valid, enemyId: 'unknown-enemy', id: 'enemy-unknown' };
  const scene = Object.create(BattleScene.prototype);
  const enemyPool = new ViewPool(createSceneView, { maximum: 2 });
  Object.assign(scene, {
    anims: { exists: () => false },
    cancelViewMotion() {},
    enemyById: new Map([[valid.id, valid], [unknown.id, unknown]]),
    enemyPool,
    enemySprites: new Map(),
    ironhideMappings: null,
    lastSnapshot: { enemies: [valid, unknown], tick: 0 },
    metadata: { enemies: { frame: { height: 256 } }, bosses: { frame: { height: 384 } } },
    pathMetrics: createGridPathMetrics(LEVELS[0].roadCells),
    projectionDiagnostics: [],
    towerSprites: new Map(),
  });

  scene.projectEnemies({ enemies: [{ ...unknown, enemyId: 'blight-walker' }], tick: 0 });
  assert.deepEqual([...scene.enemySprites.keys()], ['enemy-unknown']);
  scene.projectionDiagnostics = [];

  assert.doesNotThrow(() => scene.projectEnemies({ enemies: [unknown, valid], tick: 0 }));
  assert.deepEqual([...scene.enemySprites.keys()], ['enemy-valid']);
  assert.equal(enemyPool.getState().active, 1);
  assert.deepEqual(scene.projectionDiagnostics.map(({ id, reason }) => ({ id, reason })), [
    { id: 'enemy-unknown', reason: 'unknown-enemy' },
  ]);

  scene.projectEnemies({ enemies: [], tick: 1 });
  assert.equal(enemyPool.getState().active, 0);
  assert.equal(enemyPool.getState().available, 1);
});

test('fatal defender presentation hides frontline health before its fade starts', async () => {
  const { beginDefenderDefeatPresentation } = await import(
    '../public/Games/DefenderChampion/src/presentation.js'
  );
  assert.equal(typeof beginDefenderDefeatPresentation, 'function');

  const createGraphics = () => ({
    clearCount: 0,
    visible: true,
    clear() {
      this.clearCount += 1;
      return this;
    },
    setVisible(visible) {
      this.visible = visible;
      return this;
    },
  });
  const healthBackground = createGraphics();
  const healthFill = createGraphics();
  const body = {
    animStops: 0,
    tint: null,
    anims: { stop() { body.animStops += 1; } },
    setTint(tint) {
      this.tint = tint;
      return this;
    },
  };
  const view = {
    _body: body,
    _healthBackground: healthBackground,
    _healthFill: healthFill,
    _healthKey: 'frontline:12',
  };

  const fade = beginDefenderDefeatPresentation(view, { reducedMotion: false });

  assert.equal(view._healthKey, 'defeated');
  assert.equal(healthBackground.visible, false);
  assert.equal(healthFill.visible, false);
  assert.equal(healthBackground.clearCount, 1);
  assert.equal(healthFill.clearCount, 1);
  assert.equal(body.animStops, 1);
  assert.equal(body.tint, 0x8b5a52);
  assert.deepEqual(fade, { alpha: 0, angle: 12, duration: 360, y: 26 });
});

test('presentation teardown idempotently clears timers, listeners, and active defeat views', async () => {
  const { clearPresentationTransients, ViewPool } = await import(
    '../public/Games/DefenderChampion/src/presentation.js'
  );
  assert.equal(typeof clearPresentationTransients, 'function');

  let listenerCount = 1;
  let timerRemovals = 0;
  let resets = 0;
  let cancellations = 0;
  const pool = new ViewPool(() => ({
    _body: {
      removeAllListeners(eventName) {
        assert.equal(eventName, 'animationcomplete');
        listenerCount = 0;
      },
    },
    setActive() { return this; },
    setAlpha() { return this; },
    setVisible() { return this; },
  }), { resetView: () => { resets += 1; } });
  pool.acquire();
  const timers = new Set([{
    remove(dispatchCallback) {
      assert.equal(dispatchCallback, false);
      timerRemovals += 1;
    },
  }]);

  const cleanup = () => clearPresentationTransients({
    cancelViewMotion: () => { cancellations += 1; },
    pools: [pool],
    timers,
  });
  cleanup();
  cleanup();

  assert.equal(timerRemovals, 1);
  assert.equal(timers.size, 0);
  assert.equal(listenerCount, 0);
  assert.equal(cancellations, 1);
  assert.equal(resets, 1);
  assert.deepEqual(pool.getState(), {
    created: 1, active: 0, available: 1, highWater: 1, acquires: 1, releases: 1,
  });
});

test('pool destruction resets an available character view before destroying its animation state', async () => {
  const [{ BattleScene }, { ViewPool }] = await Promise.all([
    importBattleSceneModule(),
    import('../public/Games/DefenderChampion/src/presentation.js'),
  ]);
  const scene = Object.create(BattleScene.prototype);
  scene.tweens = { killTweensOf() {} };
  const view = createSceneView();
  let destroyCalls = 0;
  view.destroy = () => { destroyCalls += 1; };
  const pool = new ViewPool(() => view, {
    resetView: (leasedView) => BattleScene.prototype.releasePooledView.call(scene, leasedView),
  });

  pool.release(pool.acquire());
  view._body.anims.isPlaying = true;
  view._body.listenerCount = 1;
  pool.destroy();

  assert.equal(view._body.anims.isPlaying, false);
  assert.equal(view._body.listenerCount, 0);
  assert.equal(destroyCalls, 1);
});

test('actual external pause entry clears every transient scene resource idempotently', async () => {
  const [{ BattleScene }, { ViewPool }, { createSimulation, summarizePresentationSimulation }] = await Promise.all([
    importBattleSceneModule(),
    import('../public/Games/DefenderChampion/src/presentation.js'),
    import('../public/Games/DefenderChampion/src/core/simulation.js'),
  ]);
  const scene = Object.create(BattleScene.prototype);
  const simulation = createSimulation('level-1');
  const resets = [];
  const makePool = (name, createView) => new ViewPool(createView, {
    resetView: (view) => {
      resets.push(name);
      BattleScene.prototype.releasePooledView.call(scene, view);
    },
  });
  const defeatPool = makePool('defeat', createSceneView);
  const damageLabelPool = makePool('damage', createSceneView);
  const particlePool = makePool('particle', createSceneView);
  const defeatView = defeatPool.acquire();
  damageLabelPool.acquire();
  particlePool.acquire();
  let timerRemovals = 0;
  const transientTimers = new Set([{
    remove(dispatchCallback) {
      assert.equal(dispatchCallback, false);
      timerRemovals += 1;
    },
  }]);
  Object.assign(scene, {
    castleSprite: null,
    damageLabelPool,
    defeatPool,
    defenderPool: null,
    destroyed: false,
    detachedDefenderViews: new Set(),
    enemyPool: null,
    lastSnapshot: summarizePresentationSimulation(simulation),
    particlePool,
    refreshProjection() {},
    simulation,
    transientTimers,
    tweens: {
      killAll() {},
      killTweensOf() {},
    },
  });

  scene.setExternalPauseReasons(['host']);
  scene.setExternalPauseReasons(['host']);

  assert.deepEqual(scene.lastSnapshot.pauseReasons, ['host']);
  assert.equal(timerRemovals, 1);
  assert.equal(transientTimers.size, 0);
  assert.equal(defeatView._body.listenerCount, 0);
  assert.deepEqual(defeatPool.getState(), {
    created: 1, active: 0, available: 1, highWater: 1, acquires: 1, releases: 1,
  });
  assert.equal(damageLabelPool.getState().active, 0);
  assert.equal(particlePool.getState().active, 0);
  assert.deepEqual(resets.sort(), ['damage', 'defeat', 'particle']);
});

test('tracked motion completion ignores stale callbacks after pooled reuse', async () => {
  const { finishTrackedMotion, ViewPool } = await import(
    '../public/Games/DefenderChampion/src/presentation.js'
  );
  assert.equal(typeof finishTrackedMotion, 'function');

  const pool = new ViewPool(() => ({
    _motion: null,
    setActive() { return this; },
    setAlpha() { return this; },
    setVisible() { return this; },
  }), { resetView: (view) => { view._motion = null; } });
  const firstLease = pool.acquire();
  const staleMotion = { id: 'old' };
  firstLease._motion = staleMotion;
  pool.release(firstLease);
  const reusedView = pool.acquire();
  const currentMotion = { id: 'new' };
  reusedView._motion = currentMotion;
  const completions = [];

  assert.equal(finishTrackedMotion(reusedView, staleMotion, () => completions.push('stale')), false);
  assert.equal(reusedView._motion, currentMotion);
  assert.deepEqual(completions, []);
  assert.equal(finishTrackedMotion(reusedView, currentMotion, () => completions.push('current')), true);
  assert.equal(reusedView._motion, null);
  assert.deepEqual(completions, ['current']);
});

test('actual fatal defender entry hides health before tweening and releases on completion', async () => {
  const [{ BattleScene }, { ViewPool }] = await Promise.all([
    importBattleSceneModule(),
    import('../public/Games/DefenderChampion/src/presentation.js'),
  ]);
  const scene = Object.create(BattleScene.prototype);
  const healthBackground = createGraphicsDouble();
  const healthFill = createGraphicsDouble();
  const defenderView = Object.assign(createSceneView(), {
    _defenderId: 'bladeguard',
    _healthBackground: healthBackground,
    _healthFill: healthFill,
    _healthKey: 'frontline:3',
    x: 120,
    y: 260,
  });
  const defeatView = Object.assign(createSceneView(), {
    _defenderId: 'bladeguard',
    _healthBackground: createGraphicsDouble(),
    _healthFill: createGraphicsDouble(),
  });
  let fadeConfig;
  let healthHiddenWhenTweenAdded = false;
  const defenderPool = new ViewPool(() => defenderView, {
    resetView: (view) => BattleScene.prototype.releasePooledView.call(scene, view),
  });
  const defenderDefeatPool = new ViewPool(() => defeatView, {
    maximum: 18,
    resetView: (view) => BattleScene.prototype.releasePooledView.call(scene, view),
  });
  const leasedView = defenderPool.acquire();
  Object.assign(scene, {
    audioController: { playCue() {} },
    defenderDefeatPool,
    defenderPool,
    detachedDefenderViews: new Set(),
    hud: { announce() {} },
    recentDefenderPositions: new Map(),
    reducedMotion: false,
    spawnBurst() {},
    towerSprites: new Map([['tower-9', leasedView]]),
    tweens: {
      add(config) {
        fadeConfig = config;
        healthHiddenWhenTweenAdded = !defeatView._healthBackground.visible
          && !defeatView._healthFill.visible;
        return { destroy() {}, stop() {} };
      },
      killTweensOf() {},
    },
  });

  scene.animateDefenderDefeat({ towerId: 'tower-9' });

  assert.equal(healthHiddenWhenTweenAdded, true);
  assert.equal(healthBackground.visible, false);
  assert.equal(healthFill.visible, false);
  assert.equal(scene.towerSprites.has('tower-9'), false);
  assert.equal(scene.detachedDefenderViews.has(defeatView), true);
  assert.equal(defenderPool.getState().active, 0);
  assert.equal(defenderDefeatPool.getState().active, 1);

  fadeConfig.onComplete();

  assert.equal(scene.detachedDefenderViews.size, 0);
  assert.equal(defenderDefeatPool.getState().active, 0);
  assert.equal(defenderPool.getState().releases, 1);
  assert.equal(defenderDefeatPool.getState().releases, 1);
});

test('full occupied defender pool releases immediately while a bounded transient owns defeat fade', async () => {
  const [{ BattleScene }, { LEVELS }, { ViewPool }] = await Promise.all([
    importBattleSceneModule(),
    import('../public/Games/DefenderChampion/src/config/levels.js'),
    import('../public/Games/DefenderChampion/src/presentation.js'),
  ]);
  const makeDefenderView = () => Object.assign(createSceneView(), {
    _aura: { setAlpha() { return this; }, setScale() { return this; }, setTint() { return this; }, setVisible() { return this; } },
    _defenderId: 'ranger',
    _healthBackground: createGraphicsDouble(),
    _healthFill: createGraphicsDouble(),
    _healthKey: 'hidden',
    _rank: { setScale() { return this; }, setTint() { return this; }, setVisible() { return this; } },
  });
  const scene = Object.create(BattleScene.prototype);
  const defenderPool = new ViewPool(makeDefenderView, {
    maximum: 108,
    resetView: (view) => BattleScene.prototype.releasePooledView.call(scene, view),
  });
  const defenderDefeatPool = new ViewPool(makeDefenderView, {
    maximum: 18,
    resetView: (view) => BattleScene.prototype.releasePooledView.call(scene, view),
  });
  const towers = LEVELS[0].cells.map((cell, index) => ({
    cellId: cell.id,
    combatLayer: 'backline',
    defenderId: 'ranger',
    health: 1,
    id: `tower-${index + 1}`,
    maxHealth: 1,
    placementLayer: 'grass',
    tier: 0,
  }));
  const towerSprites = new Map(towers.map((tower) => {
    const view = defenderPool.acquire();
    const row = Number(tower.cellId.match(/^r(\d+)c/)[1]);
    const column = Number(tower.cellId.match(/c(\d+)$/)[1]);
    view.setPosition((column * 80) + 40, (row * 80) + 72);
    view._cellId = tower.cellId;
    return [tower.id, view];
  }));
  let fadeConfig;
  Object.assign(scene, {
    anims: { exists: () => false },
    audioController: { playCue() {} },
    defenderDefeatPool,
    defenderPool,
    detachedDefenderViews: new Set(),
    hud: { announce() {} },
    level: LEVELS[0],
    recentDefenderPositions: new Map(),
    reducedMotion: false,
    spawnBurst() {},
    towerSprites,
    tweens: {
      add(config) { fadeConfig = config; return { destroy() {}, stop() {} }; },
      killTweensOf() {},
    },
  });

  scene.animateDefenderDefeat({ towerId: 'tower-1' });
  assert.equal(defenderPool.getState().created, 108);
  assert.equal(defenderPool.getState().active, 107,
    'retaining the occupied lease during fade must fail at the 108-view cap');
  assert.equal(defenderDefeatPool.getState().active, 1);
  assert.equal(scene.detachedDefenderViews.size, 1);

  const rebuilt = {
    ...towers[0],
    defenderId: 'bladeguard',
    health: 420,
    id: 'tower-rebuilt',
    maxHealth: 420,
    placementLayer: 'road',
  };
  const replacementSnapshot = { towers: [...towers.slice(1), rebuilt] };
  assert.doesNotThrow(() => scene.projectTowers(replacementSnapshot));
  assert.equal(scene.towerSprites.size, 108);
  assert.equal(scene.towerSprites.get('tower-rebuilt')._cellId, towers[0].cellId);
  assert.deepEqual(defenderPool.getState(), {
    created: 108, active: 108, available: 0, highWater: 108, acquires: 109, releases: 1,
  });
  assert.equal(fadeConfig.targets, [...defenderDefeatPool.activeViews][0]._visualRoot);

  fadeConfig.onComplete();
  assert.equal(defenderDefeatPool.getState().active, 0);
  assert.equal(defenderDefeatPool.getState().created, 1);
  assert.equal(scene.detachedDefenderViews.size, 0);
});

test('reduced motion keeps attack, hit, impact, and defeat cosmetic positions fixed', async () => {
  const presentation = await import('../public/Games/DefenderChampion/src/presentation.js');
  const {
    beginDefenderDefeatPresentation,
    resolveBurstMotion,
    resolveDamageLabelMotion,
    resolveDefenderHitMotion,
    resolveEnemyAttackMotion,
  } = presentation;
  for (const helper of [
    beginDefenderDefeatPresentation,
    resolveBurstMotion,
    resolveDamageLabelMotion,
    resolveDefenderHitMotion,
  ]) assert.equal(typeof helper, 'function');

  const attack = resolveEnemyAttackMotion({
    currentTick: 0,
    enemyPosition: { x: 10, y: 20 },
    impactAtTick: 60,
    reducedMotion: true,
    targetPosition: { x: 300, y: 400 },
  });
  assert.deepEqual(
    { backX: attack.backX, backY: attack.backY, lungeX: attack.lungeX, lungeY: attack.lungeY },
    { backX: 0, backY: 0, lungeX: 0, lungeY: 0 },
  );
  assert.deepEqual(resolveDefenderHitMotion({
    directionX: 1, directionY: -1, reducedMotion: true,
  }).steps.map(({ x, y }) => ({ x, y })), [{ x: 0, y: 0 }, { x: 0, y: 0 }]);
  assert.deepEqual(resolveDamageLabelMotion({
    position: { x: 100, y: 200 }, reducedMotion: true,
  }), {
    duration: 180, endX: 100, endY: 132, startX: 100, startY: 132,
  });
  assert.deepEqual(resolveBurstMotion({
    index: 2, position: { x: 100, y: 200 }, reducedMotion: true, seed: 7,
  }), {
    duration: 180, endX: 100, endY: 172, startX: 100, startY: 172,
  });
  const healthGraphic = { clear() { return this; }, setVisible() { return this; } };
  const body = { anims: { stop() {} }, setTint() { return this; } };
  const defeat = beginDefenderDefeatPresentation({
    _body: body,
    _healthBackground: healthGraphic,
    _healthFill: healthGraphic,
  }, { reducedMotion: true });
  assert.equal(defeat.y, 0);
});

test('lane presentation events execute the authoritative attack and defender handlers once', async () => {
  const { dispatchLanePresentationEvent } = await import(
    '../public/Games/DefenderChampion/src/presentation.js'
  );
  assert.equal(typeof dispatchLanePresentationEvent, 'function');

  const calls = [];
  const handlers = {
    onDefenderDefeated: (payload) => calls.push(['defeat', payload.towerId]),
    onDefenderHit: (payload) => calls.push(['hit', payload.towerId]),
    onEnemyAttackImpact: (payload, event) => calls.push(['impact', payload.id, event.id]),
    onEnemyAttackStart: (payload) => calls.push(['start', payload.id]),
  };
  const events = [
    { id: 1, kind: 'enemy-attack-start', payload: { id: 'enemy-1' } },
    { id: 2, kind: 'enemy-attack-impact', payload: { id: 'enemy-1' } },
    { id: 3, kind: 'defender-hit', payload: { towerId: 'tower-1' } },
    { id: 4, kind: 'defender-defeated', payload: { towerId: 'tower-1' } },
  ];
  assert.deepEqual(events.map((event) => dispatchLanePresentationEvent(event, handlers)), [true, true, true, true]);
  assert.deepEqual(calls, [
    ['start', 'enemy-1'],
    ['impact', 'enemy-1', 2],
    ['hit', 'tower-1'],
    ['defeat', 'tower-1'],
  ]);
  assert.equal(dispatchLanePresentationEvent({ kind: 'wave-start', payload: {} }, handlers), false);
});

test('actual lane-event entry preserves overlap and stale-motion identity across pool reuse', async () => {
  const [{ BattleScene }, { ViewPool }] = await Promise.all([
    importBattleSceneModule(),
    import('../public/Games/DefenderChampion/src/presentation.js'),
  ]);
  const scene = Object.create(BattleScene.prototype);
  const enemyView = Object.assign(createSceneView(), { x: 30, y: 40 });
  const targetView = Object.assign(createSceneView(), { x: 90, y: 120 });
  const defeatedView = Object.assign(createSceneView(), {
    _defenderId: 'bladeguard',
    _healthBackground: createGraphicsDouble(),
    _healthFill: createGraphicsDouble(),
    x: 90,
    y: 120,
  });
  const defeatTransient = Object.assign(createSceneView(), {
    _defenderId: 'bladeguard',
    _healthBackground: createGraphicsDouble(),
    _healthFill: createGraphicsDouble(),
  });
  const chainEntries = [];
  const addEntries = [];
  const makeMotion = (kind, index) => ({
    id: `${kind}-${index}`,
    destroyed: false,
    stopped: false,
    destroy() { this.destroyed = true; },
    stop() { this.stopped = true; },
  });
  const enemyPool = new ViewPool(() => enemyView, {
    resetView: (view) => BattleScene.prototype.releasePooledView.call(scene, view),
  });
  enemyPool.acquire();
  const defenderPool = new ViewPool(() => defeatedView, {
    resetView: (view) => BattleScene.prototype.releasePooledView.call(scene, view),
  });
  defenderPool.acquire();
  const defenderDefeatPool = new ViewPool(() => defeatTransient, {
    maximum: 18,
    resetView: (view) => BattleScene.prototype.releasePooledView.call(scene, view),
  });
  const announcements = [];
  Object.assign(scene, {
    anims: { exists: () => true },
    audioController: { playCue() {} },
    cameras: { main: { shake() {} } },
    defenderDefeatPool,
    defenderPool,
    detachedDefenderViews: new Set(),
    enemyById: new Map([['enemy-1', { enemyId: 'blight-walker', id: 'enemy-1' }]]),
    enemyPool,
    enemySprites: new Map([['enemy-1', enemyView]]),
    hud: { announce: (message) => announcements.push(message) },
    lastPresentationEventId: 0,
    lastSnapshot: { tick: 10, timeScale: 1 },
    presentationLimits: { cameraShake: 0 },
    recentDefenderPositions: new Map(),
    reducedMotion: false,
    spawnBurst() {},
    spawnDamageLabel() {},
    towerSprites: new Map([
      ['tower-1', targetView],
      ['tower-2', defeatedView],
    ]),
    tweens: {
      add(config) {
        const motion = makeMotion('add', addEntries.length);
        addEntries.push({ config, motion });
        return motion;
      },
      chain(config) {
        const motion = makeMotion('chain', chainEntries.length);
        chainEntries.push({ config, motion });
        return motion;
      },
      killTweensOf() {},
    },
  });

  scene.consumePresentationEvents([
    {
      id: 1,
      kind: 'enemy-attack-start',
      payload: { id: 'enemy-1', impactAtTick: 30, targetTowerId: 'tower-1' },
    },
    {
      id: 2,
      kind: 'enemy-attack-start',
      payload: { id: 'enemy-1', impactAtTick: 30, targetTowerId: 'tower-1' },
    },
  ]);
  assert.equal(chainEntries.length, 1, 'overlap does not replace the active wind-up');
  const staleWindup = chainEntries[0];

  scene.consumePresentationEvents([{
    id: 3,
    kind: 'enemy-attack-impact',
    payload: { enemyId: 'blight-walker', id: 'enemy-1', targetTowerId: 'tower-1' },
  }]);
  assert.equal(addEntries.length, 1);
  const recovery = addEntries[0];
  assert.equal(enemyView._motion, recovery.motion);
  staleWindup.config.onComplete();
  assert.equal(enemyView._motion, recovery.motion, 'stale wind-up completion cannot clear recovery');

  enemyPool.release(enemyView);
  const reusedEnemyView = enemyPool.acquire();
  const reusedMotion = makeMotion('reuse', 0);
  reusedEnemyView._motion = reusedMotion;
  recovery.config.onComplete();
  assert.equal(reusedEnemyView._motion, reusedMotion, 'stale recovery cannot mutate the next pool lease');

  scene.consumePresentationEvents([{
    id: 4,
    kind: 'defender-defeated',
    payload: { towerId: 'tower-2' },
  }]);
  assert.equal(scene.towerSprites.has('tower-2'), false);
  assert.equal(scene.detachedDefenderViews.has(defeatTransient), true);
  assert.equal(defenderPool.getState().active, 0);
  assert.equal(defenderDefeatPool.getState().active, 1);
  assert.match(announcements.at(-1), /permanently defeated/);
});

test('actual BattleScene consumes decisive terminal visuals before scheduling victory or defeat results', async () => {
  const { BattleScene } = await importBattleSceneModule();

  const createTerminalScene = ({ outcome, castleHearts }) => {
    const calls = [];
    const scene = Object.create(BattleScene.prototype);
    Object.assign(scene, {
      audioController: { playCue: (cue) => calls.push(`audio:${cue}`) },
      cameras: { main: { shake: () => calls.push('castle-shake') } },
      castleSprite: { setFrame: (frame) => { calls.push(`castle-frame:${frame}`); } },
      hostBridge: { recordBattleResult: () => calls.push('record-result') },
      lastBossDefeat: null,
      lastPresentationEventId: 0,
      lastSnapshot: {
        castleHearts,
        medal: outcome === 'victory' ? 'gold' : null,
        outcome,
        score: outcome === 'victory' ? 9_999 : 120,
        terminal: true,
        tick: 8_000,
        waveIndex: 7,
      },
      level: { id: outcome === 'victory' ? 'level-10' : 'level-4' },
      metadata: {},
      pathMetrics: { total: 100, segments: [{ start: { x: 0, y: 0 }, end: { x: 0, y: 100 }, length: 100, offset: 0 }] },
      presentationLimits: { cameraShake: 0.006 },
      reducedMotion: false,
      scene: { start: () => calls.push('result-start') },
      spawnBurst: (_position, frame) => calls.push(`burst:${frame}`),
      spawnDamageLabel: () => calls.push('enemy-hit'),
      spawnDefeat: () => calls.push('enemy-defeated'),
      terminalHandled: false,
      time: {
        now: 2_000,
        delayedCall(delay, callback) {
          const timer = { delay, callback, remove() {} };
          calls.push(`timer:${delay}`);
          return timer;
        },
      },
      transientTimers: new Set(),
    });
    return { calls, scene };
  };

  const victory = createTerminalScene({ outcome: 'victory', castleHearts: 3 });
  victory.scene.metadata = {
    bosses: {
      bosses: [{
        id: 'dread-colossus',
        actions: [{ id: 'defeat', frameCount: 10, frameDurationMs: 150 }],
      }],
    },
  };
  victory.scene.consumePresentationEvents([
    { id: 10, kind: 'enemy-hit', tick: 8_000, payload: { damage: 160, position: { x: 0, y: 0 } } },
    { id: 11, kind: 'enemy-defeated', tick: 8_000, payload: { enemyId: 'dread-colossus', id: 'enemy-99', pathProgress: 90 } },
    { id: 12, kind: 'battle-terminal', tick: 8_000, payload: { outcome: 'victory' } },
  ]);
  victory.scene.handleTerminalState();

  assert.ok(victory.calls.indexOf('enemy-hit') < victory.calls.indexOf('enemy-defeated'));
  assert.ok(victory.calls.indexOf('enemy-defeated') < victory.calls.indexOf('timer:1500'));
  assert.equal(victory.scene.lastBossDefeat.enemyId, 'dread-colossus');

  const defeat = createTerminalScene({ outcome: 'defeat', castleHearts: 0 });
  defeat.scene.consumePresentationEvents([
    { id: 20, kind: 'castle-impact', tick: 8_000, payload: { damage: 1, position: { x: 0, y: 100 } } },
    { id: 21, kind: 'battle-terminal', tick: 8_000, payload: { outcome: 'defeat' } },
  ]);
  defeat.scene.handleTerminalState();

  assert.ok(defeat.calls.indexOf('castle-frame:1') < defeat.calls.indexOf('timer:1350'));
  assert.ok(defeat.calls.indexOf(`burst:15`) < defeat.calls.indexOf('timer:1350'));
  assert.ok(defeat.scene.transientTimers.size > 0, 'castle recovery remains tracked for terminal cleanup');
});

test('enemy projection keeps exact 18-of-18 living view parity at fixed display scale', async () => {
  const [
    { BattleScene },
    { createQueuePresentationLayout },
    { createGridPathMetrics, sampleGridPathProgress },
    { LEVELS },
    presentation,
  ] = await Promise.all([
    importBattleSceneModule(),
    import('../public/Games/DefenderChampion/src/core/lane-combat.js'),
    import('../public/Games/DefenderChampion/src/core/grid-geometry.js'),
    import('../public/Games/DefenderChampion/src/config/levels.js'),
    import('../public/Games/DefenderChampion/src/presentation.js'),
  ]);
  const { ENEMY_PRESENTATION, ViewPool, resolveEnemyRoadProjection } = presentation;
  assert.equal(typeof resolveEnemyRoadProjection, 'function');

  for (const enemyPresentation of Object.values(ENEMY_PRESENTATION)) {
    assert.ok(enemyPresentation.roadFootprint > 0 && enemyPresentation.roadFootprint <= 80);
  }
  const bossProjection = resolveEnemyRoadProjection({
    laneState: 'attacking',
    laneOffset: 22,
    pathProgress: 260,
  }, ENEMY_PRESENTATION['dread-colossus']);
  assert.equal(
    Math.abs(bossProjection.laneOffset) + (bossProjection.footprintWidth / 2) <= 40,
    true,
  );
  assert.equal(resolveEnemyRoadProjection({
    displayLaneOffset: 0,
    displayPathProgress: 180,
    displayScale: 1,
    laneState: 'moving',
    pathProgress: 200,
    queueIndex: 4,
  }, ENEMY_PRESENTATION.crusher).depth < 4, true, 'an approaching reserved queue slot stays behind its blocker');

  const pathMetrics = createGridPathMetrics(LEVELS[0].roadCells);
  const queueLayout = createQueuePresentationLayout({ gatePathProgress: 960, queueCount: 15 });
  const enemies = [
    ...[-22, 0, 22].map((laneOffset, index) => ({
      id: `enemy-${index + 1}`,
      enemyId: 'blight-walker',
      pathProgress: 932 - index,
      laneOffset,
      laneState: 'attacking',
      health: 100,
      maxHealth: 100,
      attackState: { targetTowerId: null },
    })),
    ...queueLayout.map((slot, index) => ({
      id: `enemy-${index + 4}`,
      enemyId: 'blight-walker',
      pathProgress: 884 - (Math.floor(index / 3) * 48),
      laneOffset: [-22, 0, 22][index % 3],
      laneState: 'queued',
      displayPathProgress: slot.pathProgress,
      displayLaneOffset: slot.laneOffset,
      displayScale: slot.scale,
      health: 100,
      maxHealth: 100,
      attackState: { targetTowerId: null },
    })),
  ];
  const scene = Object.create(BattleScene.prototype);
  Object.assign(scene, {
    anims: { exists: () => false },
    cancelViewMotion() {},
    enemyPool: new ViewPool(() => createSceneView(), { maximum: 18 }),
    enemyById: new Map(enemies.map((enemy) => [enemy.id, enemy])),
    enemySprites: new Map(),
    ironhideMappings: null,
    lastSnapshot: { tick: 0 },
    metadata: { enemies: { frame: { height: 256 } }, bosses: { frame: { height: 384 } } },
    pathMetrics,
    towerSprites: new Map(),
  });

  scene.projectEnemies({ enemies, tick: 0 });

  assert.equal(scene.enemySprites.size, enemies.length);
  const queuedViews = enemies.slice(3).map(({ id }) => scene.enemySprites.get(id));
  assert.equal(new Set(queuedViews.map(({ x, y }) => `${x.toFixed(9)},${y.toFixed(9)}`)).size, 15);
  assert.equal(queuedViews.every(({ depth }) => depth < 4), true, 'queued sprites render behind depth-4 blocker');
  assert.equal(enemies.slice(0, 3).every(({ id }) => scene.enemySprites.get(id).depth > 4), true);
  assert.equal(queuedViews.every((view) => view._body.scale >= ENEMY_PRESENTATION['blight-walker'].displayScale), true);
  const projectionState = scene.getPresentationState();
  assert.equal(projectionState.enemies.length, 18);
  assert.equal(projectionState.enemies.filter(({ laneState }) => laneState === 'queued').length, 15);
  assert.equal(projectionState.enemies.filter(({ laneState }) => laneState === 'attacking').length, 3);
  assert.equal(projectionState.enemies.filter(({ laneState }) => laneState === 'queued')
    .every(({ depth, footprintWidth, scale, x, y }) => (
      depth < 4 && footprintWidth <= 80 && scale === 1 && Number.isFinite(x) && Number.isFinite(y)
    )), true);

  for (const enemy of enemies) {
    const projected = resolveEnemyRoadProjection(enemy, ENEMY_PRESENTATION[enemy.enemyId]);
    assert.equal(Math.abs(projected.laneOffset) + (projected.footprintWidth / 2) <= 40, true, enemy.id);
    const logical = sampleGridPathProgress(pathMetrics, projected.pathProgress);
    assert.equal(Number.isFinite(logical.x) && Number.isFinite(logical.y), true);
  }
});

test('actual Level 10 cap projects every living enemy without density cues', async () => {
  const [
    { BattleScene },
    { advanceSimulation, createSimulation, summarizePresentationSimulation },
    { createGridPathMetrics },
    { ENEMY_PRESENTATION, ViewPool },
    { resolveBodyOverlapRatio, resolveReadableEnemyLayout },
  ] = await Promise.all([
    importBattleSceneModule(),
    import('../public/Games/DefenderChampion/src/core/simulation.js'),
    import('../public/Games/DefenderChampion/src/core/grid-geometry.js'),
    import('../public/Games/DefenderChampion/src/presentation.js'),
    import('../public/Games/DefenderChampion/src/grid-presentation.js'),
  ]);
  const simulation = createSimulation('level-10', { qa: true });
  advanceSimulation(simulation, 289);
  const snapshot = summarizePresentationSimulation(simulation);
  const scene = Object.create(BattleScene.prototype);
  Object.assign(scene, {
    anims: { exists: () => false },
    cancelViewMotion() {},
    enemyPool: new ViewPool(() => createSceneView(), { maximum: snapshot.enemies.length }),
    enemyById: new Map(snapshot.enemies.map((enemy) => [enemy.id, enemy])),
    enemySprites: new Map(),
    ironhideMappings: null,
    lastSnapshot: snapshot,
    metadata: { enemies: { frame: { height: 256 } }, bosses: { frame: { height: 384 } } },
    pathMetrics: createGridPathMetrics(simulation.level.roadCells),
    towerSprites: new Map(),
  });

  scene.projectEnemies(snapshot);

  const projected = scene.getPresentationState().enemies;
  const ordered = [...projected].sort((first, second) => first.id.localeCompare(second.id));
  const attackers = projected.filter(({ laneState }) => laneState === 'attacking');
  const bodyRects = ordered.map(({ bodyRect }) => bodyRect).filter(Boolean);
  const overlapRatio = (first, second) => {
    const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
    const height = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
    return (width * height) / Math.min(first.width * first.height, second.width * second.height);
  };
  let maximumBodyOverlapRatio = Number.POSITIVE_INFINITY;
  if (bodyRects.length === ordered.length) {
    maximumBodyOverlapRatio = 0;
    for (let firstIndex = 0; firstIndex < bodyRects.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < bodyRects.length; secondIndex += 1) {
        maximumBodyOverlapRatio = Math.max(
          maximumBodyOverlapRatio,
          overlapRatio(bodyRects[firstIndex], bodyRects[secondIndex]),
        );
      }
    }
  }
  let minimumCenterDistance = Number.POSITIVE_INFINITY;
  for (let firstIndex = 0; firstIndex < ordered.length; firstIndex += 1) {
    const first = ordered[firstIndex];
    for (let secondIndex = firstIndex + 1; secondIndex < ordered.length; secondIndex += 1) {
      const second = ordered[secondIndex];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      minimumCenterDistance = Math.min(minimumCenterDistance, distance);
    }
  }

  assert.equal(projected.length, snapshot.enemies.length, 'all living enemies keep a projected view');
  assert.equal(snapshot.enemies.length, 18, 'the real campaign reaches the living cap');
  assert.equal(ordered.every(({ laneOffset, footprintWidth }) => (
    Math.abs(laneOffset) + (footprintWidth / 2) <= 40
  )), true, 'every complete declared footprint remains on road');
  assert.ok(minimumCenterDistance > 0, 'no living pair shares an exact projected center');
  assert.equal(ordered.every(({ scale }) => scale === 1), true);
  assert.equal(attackers.length <= 3, true);
  assert.equal(attackers.every(({ depth }) => depth > 4), true, 'active attackers remain readable');
  assert.equal(Math.min(...ordered.map(({ x, y }) => Math.hypot(x, y))) > 0, true);
  assert.equal(Object.values(ENEMY_PRESENTATION).every(({ roadFootprint }) => roadFootprint <= 80), true);
  assert.equal('queueDensityCues' in scene.getPresentationState(), false);
  assert.deepEqual({
    bodyRectangles: bodyRects.length,
    contained: bodyRects.length === ordered.length && bodyRects.every((rect) => (
      rect.left >= 0 && rect.top >= 0 && rect.right <= 720 && rect.bottom <= 960
    )),
    maximumOverlapWithinLimit: maximumBodyOverlapRatio <= (1 / 3) + 1e-9,
  }, {
    bodyRectangles: 18,
    contained: true,
    maximumOverlapWithinLimit: true,
  });
  const metrics = scene.pathMetrics;
  const entries = Array.from({ length: 18 }, (_, index) => ({
    bodyHeight: index < 3 ? 112 : 76,
    bodyWidth: index < 3 ? 104 : 64,
    bottomInset: 0,
    id: `packed-${index}`,
    laneOffset: 0,
    maximumLaneOffset: index < 3 ? 6 : 18,
    pathProgress: metrics.total,
  }));

  const layout = resolveReadableEnemyLayout({
    entries,
    maximumOverlapRatio: 0,
    metrics,
  });
  let maximumOverlapRatio = 0;
  for (let firstIndex = 0; firstIndex < layout.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < layout.length; secondIndex += 1) {
      maximumOverlapRatio = Math.max(
        maximumOverlapRatio,
        resolveBodyOverlapRatio(layout[firstIndex].bodyRect, layout[secondIndex].bodyRect),
      );
    }
  }

  assert.equal(layout.length, 18);
  assert.equal(maximumOverlapRatio, 0);
  assert.equal(layout.every(({ bodyRect }) => (
    bodyRect.left >= 0 && bodyRect.top >= 0
      && bodyRect.right <= 720 && bodyRect.bottom <= 960
  )), true);
});

test('queued bodies, projectiles, health, plates, hits, and defeats share one readable transform', async () => {
  const [{ BattleScene }, { createGridPathMetrics }, { LEVELS }, { ViewPool }] = await Promise.all([
    importBattleSceneModule(),
    import('../public/Games/DefenderChampion/src/core/grid-geometry.js'),
    import('../public/Games/DefenderChampion/src/config/levels.js'),
    import('../public/Games/DefenderChampion/src/presentation.js'),
  ]);
  const expected = { x: 360, y: 192 };
  const makeImage = () => ({
    alpha: 1,
    depth: 0,
    displayHeight: 0,
    displayWidth: 0,
    scale: 1,
    visible: true,
    x: 0,
    y: 0,
    setActive(active) { this.active = active; return this; },
    setAlpha(alpha) { this.alpha = alpha; return this; },
    setDepth(depth) { this.depth = depth; return this; },
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
    setFrame(frame) { this.frame = frame; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setRotation(rotation) { this.rotation = rotation; return this; },
    setScale(scale) { this.scale = scale; return this; },
    setText(text) { this.text = text; return this; },
    setTexture(texture) { this.texture = { key: texture }; return this; },
    setTint(tint) { this.tint = tint; return this; },
    setVisible(visible) { this.visible = visible; return this; },
  });
  const makeGraphics = (depth) => ({
    depth,
    rectangles: [],
    clear() { this.rectangles.length = 0; return this; },
    fillRoundedRect(x, y, width, height, radius) {
      this.rectangles.push({ x, y, width, height, radius });
      return this;
    },
    fillStyle() { return this; },
    setDepth(value) { this.depth = value; return this; },
  });
  const plate = (baseScale) => ({
    ...makeImage(),
    _baseScale: baseScale,
  });
  const enemyView = createSceneView();
  enemyView._accent = { ...makeImage(), _baseScale: 0.34, _baseY: -138.24 };
  enemyView._plateAccents = new Map([
    ['iron-bark-plate-1', plate(0.115)],
    ['iron-bark-plate-2', plate(0.115)],
    ['iron-bark-plate-3', plate(0.13)],
  ]);
  const enemy = {
    attackState: { targetTowerId: null },
    blockingTowerId: 'tower-1',
    displayLaneOffset: 22,
    displayPathProgress: 150,
    displayScale: 1,
    enemyId: 'ironhide-warlord',
    health: 500,
    id: 'enemy-queued',
    laneOffset: 0,
    laneState: 'queued',
    maxHealth: 1_000,
    pathProgress: 0,
    queueIndex: 2,
    thresholdFlags: {},
    vulnerableUntilTick: 0,
  };
  const queuedHealth = makeGraphics(3.7);
  const activeHealth = makeGraphics(6);
  const scene = Object.create(BattleScene.prototype);
  Object.assign(scene, {
    activeEnemyHealthLayer: activeHealth,
    anims: { exists: () => false },
    audioController: { playCue() {} },
    cancelViewMotion() {},
    damageLabelPool: new ViewPool(makeImage, { maximum: 4 }),
    defeatPool: new ViewPool(() => ({ ...createSceneView(), _accent: makeImage() }), { maximum: 4 }),
    enemyById: new Map([[enemy.id, enemy]]),
    enemyPool: new ViewPool(() => enemyView, { maximum: 1 }),
    enemySprites: new Map(),
    ironhideMappings: {
      plateAccents: [
        { removeAccent: 'iron-bark-plate-1', threshold: 'plate75' },
        { removeAccent: 'iron-bark-plate-2', threshold: 'plate50' },
        { removeAccent: 'iron-bark-plate-3', threshold: 'plate25' },
      ],
    },
    lastHealthRenderTick: Number.NEGATIVE_INFINITY,
    lastPresentationEventId: 0,
    lastSnapshot: { tick: 10 },
    metadata: { enemies: { frame: { height: 256 } }, bosses: { frame: { height: 384 } } },
    pathMetrics: createGridPathMetrics(LEVELS[0].roadCells),
    presentationLimits: { cameraShake: 0, particleCap: 0, telegraphsEnabled: true },
    projectilePool: new ViewPool(makeImage, { maximum: 4 }),
    projectileSprites: new Map(),
    queuedEnemyHealthLayer: queuedHealth,
    reducedMotion: true,
    time: { delayedCall: () => ({ remove() {} }) },
    towerById: new Map(),
    transientTimers: new Set(),
    tweens: { add() {} },
  });

  scene.projectEnemies({ enemies: [enemy], tick: 10 });
  const projectedBody = scene.enemySprites.get(enemy.id);
  assert.deepEqual({ x: projectedBody.x, y: projectedBody.y }, expected);
  assert.equal(projectedBody._visualTransform.bodyRect.top, 0);
  assert.equal(projectedBody.depth, 3.6);
  assert.equal(projectedBody._body.scale, 0.5);
  assert.ok(Math.abs(projectedBody._plateAccents.get('iron-bark-plate-1').x - -27) < 1e-9);
  assert.ok(Math.abs(projectedBody._plateAccents.get('iron-bark-plate-1').y - -56) < 1e-9);
  assert.ok(Math.abs(projectedBody._plateAccents.get('iron-bark-plate-1').scale - 0.0575) < 1e-9);
  assert.ok(Math.abs(projectedBody._accent.y - -69.12) < 1e-9);
  assert.ok(Math.abs(projectedBody._accent.scale - 0.17) < 1e-9);

  scene.projectEnemyHealthBars({ enemies: [enemy], tick: 10 }, true);
  assert.equal(activeHealth.rectangles.length, 0);
  assert.equal(queuedHealth.rectangles.length, 2);
  const queuedBar = queuedHealth.rectangles[0];
  assert.ok(Math.abs(queuedBar.x - (expected.x - 29)) < 1e-9);
  assert.ok(Math.abs(queuedBar.y - (expected.y - 88)) < 1e-9);
  assert.ok(Math.abs(queuedBar.width - 58) < 1e-9);
  assert.ok(Math.abs(queuedBar.height - 5) < 1e-9);
  assert.ok(Math.abs(queuedBar.radius - 2.5) < 1e-9);

  const liveProjectile = {
    id: 'projectile-live',
    sourceTowerId: 'tower-missing',
    targetId: enemy.id,
    targetEnemyIdAtLaunch: enemy.enemyId,
    launchTick: 0,
    launchPosition: { x: 0, y: 0 },
    targetPathProgressAtLaunch: 0,
    targetDisplayPathProgressAtLaunch: 150,
    targetDisplayLaneOffsetAtLaunch: 22,
    targetDisplayScaleAtLaunch: 1,
    impactTick: 10,
  };
  scene.projectProjectiles({ projectiles: [liveProjectile], tick: 10 });
  const liveProjectileView = scene.projectileSprites.get(liveProjectile.id);
  assert.equal(liveProjectileView.x, expected.x);
  assert.equal(liveProjectileView.y, expected.y - 16);

  scene.enemyById.clear();
  const missingProjectile = { ...liveProjectile, id: 'projectile-fallback', targetId: 'enemy-gone' };
  scene.projectProjectiles({ projectiles: [missingProjectile], tick: 10 });
  const fallbackProjectileView = scene.projectileSprites.get(missingProjectile.id);
  assert.equal(fallbackProjectileView.x, expected.x);
  assert.equal(fallbackProjectileView.y, expected.y - 16);

  const labels = [];
  const bursts = [];
  scene.spawnDamageLabel = (position, damage, visual) => labels.push({ position, damage, visual });
  scene.spawnBurst = (position, frame, count, seed, visual) => bursts.push({ position, frame, count, seed, visual });
  scene.consumePresentationEvents([
    { id: 1, kind: 'enemy-hit', tick: 10, payload: {
      damage: 14, enemyId: enemy.enemyId, id: enemy.id, position: { x: 0, y: 0 },
      displayPathProgress: 150, displayLaneOffset: 22, displayScale: 1, laneState: 'queued', queueIndex: 2,
    } },
    { id: 2, kind: 'projectile-impact', tick: 10, payload: {
      enemyId: enemy.enemyId, targetId: enemy.id, position: { x: 0, y: 0 },
      displayPathProgress: 150, displayLaneOffset: 22, displayScale: 1, laneState: 'queued', queueIndex: 2,
    } },
  ]);
  assert.deepEqual(labels[0].position, expected);
  assert.deepEqual({ scale: labels[0].visual.artScale, depth: labels[0].visual.depth }, { scale: 0.5, depth: 3.6 });
  assert.deepEqual(bursts[0].position, expected);
  assert.deepEqual({ scale: bursts[0].visual.artScale, depth: bursts[0].visual.depth }, { scale: 0.5, depth: 3.6 });

  BattleScene.prototype.spawnDamageLabel.call(scene, expected, 14, { artScale: 0.5, depth: 3.6 });
  const renderedLabel = [...scene.damageLabelPool.activeViews][0];
  assert.equal(renderedLabel.x, expected.x);
  assert.ok(Math.abs(renderedLabel.y - (expected.y - 34)) < 1e-9);
  assert.equal(renderedLabel.scale, 0.5);
  assert.ok(Math.abs(renderedLabel.depth - 3.8) < 1e-9);

  scene.presentationLimits.particleCap = 1;
  scene.particlePool = new ViewPool(makeImage, { maximum: 1 });
  BattleScene.prototype.spawnBurst.call(
    scene,
    expected,
    9,
    1,
    2,
    { artScale: 0.5, depth: 3.6 },
  );
  const renderedBurst = [...scene.particlePool.activeViews][0];
  assert.equal(renderedBurst.x, expected.x);
  assert.ok(Math.abs(renderedBurst.y - (expected.y - 14)) < 1e-9);
  assert.ok(Math.abs(renderedBurst.scale - 0.06) < 1e-9);
  assert.ok(Math.abs(renderedBurst.depth - 3.7) < 1e-9);

  scene.enemyById.clear();
  scene.spawnDefeat({
    enemyId: enemy.enemyId,
    id: enemy.id,
    position: { x: 0, y: 0 },
    displayPathProgress: 150,
    displayLaneOffset: 22,
    displayScale: 1,
    laneState: 'queued',
    queueIndex: 2,
  });
  const defeat = [...scene.defeatPool.activeViews][0];
  assert.deepEqual({ x: defeat.x, y: defeat.y }, expected);
  assert.equal(defeat.depth, 3.6);
  assert.equal(defeat._body.scale, 0.5);
});

test('enemy attack and defender hit motion move one shared root consumed by health projectiles and effects', async () => {
  const [{ BattleScene }, { createGridPathMetrics }, { LEVELS }, { ViewPool }] = await Promise.all([
    importBattleSceneModule(),
    import('../public/Games/DefenderChampion/src/core/grid-geometry.js'),
    import('../public/Games/DefenderChampion/src/config/levels.js'),
    import('../public/Games/DefenderChampion/src/presentation.js'),
  ]);
  const makeImage = () => ({
    setActive() { return this; }, setAlpha() { return this; }, setDepth(value) { this.depth = value; return this; },
    setFrame() { return this; }, setPosition(x, y) { this.x = x; this.y = y; return this; },
    setRotation() { return this; }, setScale() { return this; }, setVisible() { return this; },
  });
  const enemyView = createSceneView();
  enemyView.setPosition(360, 40);
  enemyView._baseScale = 0.4;
  const defenderView = Object.assign(createSceneView(), {
    _defenderId: 'bladeguard',
    _healthBackground: createGraphicsDouble(),
    _healthFill: createGraphicsDouble(),
    x: 440,
    y: 72,
  });
  const chainConfigs = [];
  const addConfigs = [];
  const labels = [];
  const bursts = [];
  const enemy = {
    attackState: { impactAtTick: 20, targetTowerId: 'tower-1' },
    displayLaneOffset: 0,
    displayPathProgress: 0,
    displayScale: 1,
    enemyId: 'blight-walker',
    health: 40,
    id: 'enemy-1',
    laneState: 'attacking',
    maxHealth: 80,
    pathProgress: 0,
  };
  const scene = Object.create(BattleScene.prototype);
  Object.assign(scene, {
    activeEnemyHealthLayer: { ...createGraphicsDouble(), rectangles: [], fillRoundedRect(...args) { this.rectangles.push(args); return this; } },
    anims: { exists: () => false },
    audioController: { playCue() {} },
    cameras: { main: { shake() {} } },
    damageLabelPool: new ViewPool(makeImage, { maximum: 2 }),
    enemyById: new Map([[enemy.id, enemy]]),
    enemySprites: new Map([[enemy.id, enemyView]]),
    hud: { announce() {} },
    lastHealthRenderTick: Number.NEGATIVE_INFINITY,
    lastSnapshot: { enemies: [enemy], tick: 10, timeScale: 1 },
    metadata: { enemies: { frame: { height: 256 } }, bosses: { frame: { height: 384 } } },
    pathMetrics: createGridPathMetrics(LEVELS[0].roadCells),
    presentationLimits: { cameraShake: 0 },
    projectilePool: new ViewPool(makeImage, { maximum: 2 }),
    projectileSprites: new Map(),
    queuedEnemyHealthLayer: { ...createGraphicsDouble(), rectangles: [], fillRoundedRect(...args) { this.rectangles.push(args); return this; } },
    recentDefenderPositions: new Map(),
    reducedMotion: false,
    spawnBurst: (position) => bursts.push(position),
    spawnDamageLabel: (position) => labels.push(position),
    towerById: new Map([['tower-1', { cellId: 'r0c5', defenderId: 'bladeguard', id: 'tower-1' }]]),
    towerSprites: new Map([['tower-1', defenderView]]),
    tweens: {
      add(config) { addConfigs.push(config); return { destroy() {}, stop() {} }; },
      chain(config) { chainConfigs.push(config); return { destroy() {}, stop() {} }; },
      killTweensOf() {},
    },
  });

  scene.beginEnemyAttackProjection(enemyView, enemy, 'tower-1', 20);
  assert.equal(chainConfigs[0].targets, enemyView._visualRoot,
    'changing attack tween targets back to _body must fail this assertion');
  enemyView._visualRoot.setPosition(-12, 6);
  const movingEnemy = scene.resolveEnemyVisualTransform(enemy);
  assert.deepEqual(movingEnemy.position, { x: 348, y: 46 });

  scene.projectEnemyHealthBars({ enemies: [enemy], tick: 10 }, true);
  const healthRect = scene.activeEnemyHealthLayer.rectangles[0];
  assert.ok(Math.abs(healthRect[0] - (348 - 14.4)) < 1e-9);
  assert.ok(Math.abs(healthRect[1] - (46 - 43.2)) < 1e-9);

  scene.projectProjectiles({
    projectiles: [{
      id: 'projectile-1', impactTick: 10, launchPosition: { x: 0, y: 0 }, launchTick: 0,
      sourceTowerId: 'tower-missing', targetEnemyIdAtLaunch: enemy.enemyId,
      targetId: enemy.id, targetPathProgressAtLaunch: 0,
    }],
    tick: 10,
  });
  const projectile = scene.projectileSprites.get('projectile-1');
  assert.deepEqual({ x: projectile.x, y: projectile.y }, { x: 348, y: 33.2 });

  scene.consumePresentationEvents([{
    id: 1, kind: 'enemy-hit', tick: 10,
    payload: { damage: 9, enemyId: enemy.enemyId, id: enemy.id },
  }]);
  assert.deepEqual(labels[0], { x: 348, y: 46 });

  scene.animateDefenderHit({ damage: 5, remainingHealth: 415, sourceId: enemy.id, towerId: 'tower-1' });
  assert.equal(chainConfigs[1].targets, defenderView._visualRoot,
    'changing hit tween targets back to _body must fail this assertion');
  defenderView._visualRoot.setPosition(7, -5);
  scene.handleEnemyAttackImpact({ id: 2 }, {
    enemyId: enemy.enemyId, id: enemy.id, targetTowerId: 'tower-1',
  });
  assert.deepEqual(bursts.slice(-2), [{ x: 447, y: 67 }, { x: 447, y: 67 }]);
  const presentationState = scene.getPresentationState();
  assert.deepEqual(presentationState.enemies[0].motionOffset, { x: -12, y: 6 });
  assert.deepEqual(presentationState.towers[0].motionOffset, { x: 7, y: -5 });
});

test('boss projection upgrades the generic enemy overlay to the 384-pixel accent basis', async () => {
  const [{ BattleScene }, { createGridPathMetrics }, { LEVELS }, { ViewPool }] = await Promise.all([
    importBattleSceneModule(),
    import('../public/Games/DefenderChampion/src/core/grid-geometry.js'),
    import('../public/Games/DefenderChampion/src/config/levels.js'),
    import('../public/Games/DefenderChampion/src/presentation.js'),
  ]);
  const view = createSceneView();
  view._accent._baseY = -92.16;
  const boss = {
    attackState: { targetTowerId: null }, displayLaneOffset: 0, displayPathProgress: 0,
    displayScale: 1, enemyId: 'dread-colossus', health: 1_000, id: 'enemy-boss',
    laneState: 'moving', maxHealth: 1_000, pathProgress: 0,
  };
  const scene = Object.create(BattleScene.prototype);
  Object.assign(scene, {
    anims: { exists: () => false },
    cancelViewMotion() {},
    enemyById: new Map([[boss.id, boss]]),
    enemyPool: new ViewPool(() => view, { maximum: 1 }),
    enemySprites: new Map(),
    ironhideMappings: null,
    lastSnapshot: { enemies: [boss], tick: 0 },
    metadata: { enemies: { frame: { height: 256 } }, bosses: { frame: { height: 384 } } },
    pathMetrics: createGridPathMetrics(LEVELS[9].roadCells),
    towerSprites: new Map(),
  });

  scene.projectEnemies({ enemies: [boss], tick: 0 });
  assert.equal(view._accent._baseY, -138.24,
    'keeping the generic 256-pixel basis must fail this literal boss assertion');
  assert.ok(Math.abs(view._accent.y - (-138.24 * view._visualTransform.artScale)) < 1e-9);
});

test('pooled enemy presentation resets queue scale, depth, and overlay transforms before reuse', async () => {
  const { BattleScene } = await importBattleSceneModule();
  const makeOverlay = (baseScale, baseX, baseY) => ({
    scale: 0.01,
    visible: true,
    x: 99,
    y: 99,
    _baseScale: baseScale,
    _baseX: baseX,
    _baseY: baseY,
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setScale(scale) { this.scale = scale; return this; },
    setVisible(visible) { this.visible = visible; return this; },
  });
  const view = createSceneView();
  view.depth = 3.6;
  view._poolDepth = 5;
  view._baseScale = 0.03;
  view._body.scale = 0.03;
  view._accent = makeOverlay(0.34, 0, -92.16);
  view._plateAccents = new Map([
    ['plate-1', makeOverlay(0.115, -54, -112)],
  ]);
  view._visualTransform = { scale: 0.075, depth: 3.6 };
  const scene = Object.create(BattleScene.prototype);
  Object.assign(scene, {
    cancelViewMotion() {},
    tweens: { killTweensOf() {} },
  });

  scene.releasePooledView(view);

  assert.equal(view.depth, 5);
  assert.equal(view._body.scale, 1);
  assert.equal(view._accent.scale, 0.34);
  assert.deepEqual({ x: view._accent.x, y: view._accent.y }, { x: 0, y: -92.16 });
  assert.equal(view._plateAccents.get('plate-1').scale, 0.115);
  assert.deepEqual(
    { x: view._plateAccents.get('plate-1').x, y: view._plateAccents.get('plate-1').y },
    { x: -54, y: -112 },
  );
  assert.equal(view._visualTransform, null);
});

test('frontline durability and lane attack helpers preserve simulation-authoritative motion', async () => {
  const presentation = await import('../public/Games/DefenderChampion/src/presentation.js');
  const { resolveEnemyAttackMotion, resolveFrontlineHealthBar, ViewPool } = presentation;

  assert.deepEqual(resolveFrontlineHealthBar({ combatLayer: 'backline', health: 1, maxHealth: 1 }), {
    key: 'hidden', ratio: 0, visible: false,
  });
  assert.deepEqual(resolveFrontlineHealthBar({ combatLayer: 'frontline', health: 419, maxHealth: 560 }), {
    key: 'frontline:75', ratio: 0.75, visible: true,
  });
  const fullMotion = resolveEnemyAttackMotion({
    bodyScale: 0.5,
    currentTick: 100,
    enemyPosition: { x: 200, y: 300 },
    impactAtTick: 124,
    targetPosition: { x: 230, y: 340 },
    timeScale: 2,
  });
  assert.equal(fullMotion.totalMs, 200);
  assert.equal(fullMotion.windupMs + fullMotion.lungeMs, fullMotion.totalMs);
  assert.ok(Math.hypot(fullMotion.lungeX, fullMotion.lungeY) <= 36);
  const bossMotion = resolveEnemyAttackMotion({
    bodyScale: 0.53,
    boss: true,
    currentTick: 10,
    enemyPosition: { x: 0, y: 0 },
    impactAtTick: 70,
    targetPosition: { x: 500, y: 0 },
  });
  assert.ok(Math.hypot(bossMotion.lungeX, bossMotion.lungeY) <= 32);
  assert.deepEqual(resolveEnemyAttackMotion({
    bodyScale: 0.53,
    boss: true,
    currentTick: 10,
    enemyPosition: { x: 0, y: 0 },
    impactAtTick: 70,
    reducedMotion: true,
    targetPosition: { x: 500, y: 0 },
  }), {
    backX: 0,
    backY: 0,
    lungeMs: 650,
    lungeX: 0,
    lungeY: 0,
    totalMs: 1_000,
    windupMs: 350,
  });

  const resets = [];
  const destroyed = [];
  const pool = new ViewPool(() => ({
    destroy: () => destroyed.push('destroy'),
    setActive() { return this; },
    setAlpha() { return this; },
    setVisible() { return this; },
  }), { resetView: () => resets.push('reset') });
  pool.acquire();
  pool.destroy();
  assert.deepEqual(resets, ['reset']);
  assert.deepEqual(destroyed, ['destroy']);

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

test('runtime pause resumes real scene frames without sleeping the global Phaser loop', async () => {
  const { applyRuntimePauseState } = await import(
    '../public/Games/DefenderChampion/src/runtime-lifecycle.js'
  );
  const operations = [];
  let active = true;
  let paused = false;
  const battleScene = {
    handleResume: () => operations.push(['battle-resume']),
    setExternalPauseReasons: (reasons) => operations.push(['reasons', [...reasons]]),
  };
  const game = {
    loop: {
      sleep: () => operations.push(['loop-sleep']),
      wake: () => operations.push(['loop-wake']),
    },
    scene: {
      scenes: [{
        scene: {
          isActive: () => active,
          isPaused: () => paused,
          pause() {
            operations.push(['scene-pause']);
          },
          resume() {
            operations.push(['scene-resume']);
          },
        },
      }],
    },
  };

  applyRuntimePauseState({ battleScene, game, paused: true, reasons: ['manual'] });
  applyRuntimePauseState({ battleScene, game, paused: true, reasons: ['host', 'manual'] });
  applyRuntimePauseState({ battleScene, game, paused: false, reasons: [] });

  assert.deepEqual(operations, [
    ['reasons', ['manual']],
    ['scene-pause'],
    ['reasons', ['host', 'manual']],
    ['reasons', []],
    ['scene-resume'],
    ['battle-resume'],
  ]);
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

test('battlefield cell focus leaves Tab to semantic controls', async () => {
  const { BattleScene } = await importBattleSceneModule();
  const scene = Object.create(BattleScene.prototype);
  Object.assign(scene, {
    focusedCellId: 'r4c4',
    lastSnapshot: { terminal: false },
    terminalHandled: false,
  });
  let prevented = false;
  scene.handleKeyDown({ key: 'Tab', code: 'Tab', preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(scene.focusedCellId, 'r4c4');
});

test('battlefield focus entry restores visible internal feedback without trapping semantic controls', async () => {
  const battleScene = await readGameFile('src/scenes/BattleScene.js');

  assert.match(battleScene, /on\(['"]focus['"],\s*\(\)\s*=>\s*this\.handleBattlefieldFocus\(true\)\)/);
  assert.match(battleScene, /on\(['"]blur['"],\s*\(\)\s*=>\s*this\.handleBattlefieldFocus\(false\)\)/);
  assert.match(battleScene, /focusedCellId/);
  assert.match(battleScene, /resolveGridFocusMove/);
  assert.match(battleScene, /cellViews/);
  assert.doesNotMatch(battleScene, /focusIndex|focusRing/);
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
    exerciseMalformedProjection: () => ({ diagnostics: [{ id: 'qa-invalid-cell', reason: 'invalid-cell' }] }),
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
  assert.deepEqual(qaWindow.__defenderChampion.exerciseMalformedProjection(), {
    diagnostics: [{ id: 'qa-invalid-cell', reason: 'invalid-cell' }],
  });
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
      id: 'tower-1', defenderId: 'bladeguard', cellId: 'r2c7', tier: 0, totalInvested: 50,
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
    id: 'tower-1', defenderId: 'bladeguard', cellId: 'r2c7', tier: 0, totalInvested: 50,
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
  assert.match(battleScene, /['"]ArrowRight['"]/);
  assert.match(battleScene, /['"]Enter['"]/);
  assert.match(battleScene, /['"]Space['"]/);
  assert.match(battleScene, /enemySprites\s*=\s*new Map/);
  assert.match(battleScene, /cellViews\s*=\s*new Map/);
  assert.match(battleScene, /projectileSprites\s*=\s*new Map/);
  assert.doesNotMatch(battleScene, /telegraphSprites\s*=\s*new Map/);
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
  assert.equal(ASSET_USAGE_BY_ID['environment-path-atlas'], 'BattleScene square road tiles');
  assert.equal(
    ASSET_USAGE_BY_ID['environment-gameplay-atlas'],
    'BattleScene projectiles and effects, plus ResultScene art',
  );
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

test('range mastery and danger states stay rectangular and use deterministic precedence', async () => {
  const { resolveCellVisualState } = await import(
    '../public/Games/DefenderChampion/src/grid-presentation.js'
  );
  const range = resolveCellVisualState({ inRange: true, terrain: 'road' });
  const mastery = resolveCellVisualState({ inRange: true, masteryCovered: true, terrain: 'road' });
  const danger = resolveCellVisualState({
    danger: true, inRange: true, masteryCovered: true, terrain: 'road',
  });
  assert.deepEqual(
    [range.fillColor, mastery.fillColor, danger.fillColor],
    [0xffe59a, 0x58d5ff, 0xff6b61],
  );
  assert.deepEqual(
    [range.fillAlpha, mastery.fillAlpha, danger.fillAlpha],
    [0.16, 0.2, 0.28],
  );
  assert.equal([range, mastery, danger].every((state) => !('radius' in state)), true);
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
  assert.match(battle, /fillRect\(/);
  assert.match(battle, /strokeRect\(/);
  assert.doesNotMatch(battle, /strokeEllipse|fillCircle|strokeCircle/);
  assert.match(css, /#portrait-lock-screen/);
  assert.match(css, /html\[data-orientation="landscape"\]/);
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

test('scene pools cap 18 living enemies, 108 defenders, and reset every released lease', async () => {
  const { BattleScene } = await importBattleSceneModule();
  const makeView = () => ({
    setActive() { return this; },
    setAlpha() { return this; },
    setDepth() { return this; },
    setOrigin() { return this; },
    setVisible() { return this; },
  });
  const resets = [];
  const scene = Object.create(BattleScene.prototype);
  Object.assign(scene, {
    add: { image: makeView, text: makeView },
    createCharacterView: makeView,
    createDefenderView: makeView,
    presentationLimits: { damageLabelCap: 12, particleCap: 18 },
    releasePooledView(view) { resets.push(view); },
  });
  scene.createPools();
  assert.equal(scene.enemyPool.maximum, 18);
  assert.equal(scene.defenderPool.maximum, 108);
  assert.equal(scene.defenderDefeatPool.maximum, 18);
  assert.equal(scene.defeatPool.maximum, 18);
  const enemies = Array.from({ length: 18 }, () => scene.enemyPool.acquire());
  assert.equal(enemies.every(Boolean), true);
  assert.equal(scene.enemyPool.acquire(), null);
  scene.enemyPool.release(enemies[0]);
  assert.equal(resets.includes(enemies[0]), true);
  assert.equal(scene.enemyPool.acquire(), enemies[0]);
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
