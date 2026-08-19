import Phaser from 'phaser';
import { DEFENDERS } from '../config/defenders.js';
import { ENEMIES } from '../config/enemies.js';
import { LEVELS, getLevel } from '../config/levels.js';
import {
  advanceSimulation,
  clearPresentationEvents,
  createSimulation,
  issueCommand,
  summarizePresentationSimulation,
  summarizeSimulation,
} from '../core/simulation.js';
import {
  DEFENDER_PRESENTATION,
  ENEMY_PRESENTATION,
  GAMEPLAY_FRAME,
  PATH_FRAME,
  ViewPool,
  animationKey,
  characterAssetId,
  deriveCampaignEnemyViewCapacity,
  projectCombatRadius,
  resolveBetweenWaveCountdown,
  resolveIronhidePlatePresentation,
  resolvePresentationLimits,
  resolveResultTransitionDelay,
  shouldProjectDefenderIdle,
  syncProjectionMap,
} from '../presentation.js';
import { WAVE_GAP_TICKS } from '../core/wave-controller.js';
import { createFixedStepClock, resolveBattlefieldFocusMove } from '../ui/hud-controller.js';

const WORLD_WIDTH = 720;
const WORLD_HEIGHT = 960;
const PATH_X_SCALE = WORLD_WIDTH / 640;
const PATH_Y_OFFSET = 110;
const PATH_Y_SCALE = 1.45;
const POINTER_HIT_RADIUS = 48;
const HUD_RENDER_INTERVAL_TICKS = 6;
const ENEMY_HEALTH_RENDER_INTERVAL_TICKS = 3;
const KEYBOARD_DEFENDERS = Object.freeze(Object.keys(DEFENDERS));
const BOSS_IDS = new Set(['mossback-brute', 'ironhide-warlord', 'dread-colossus']);
const ENEMY_VIEW_CAPACITY = deriveCampaignEnemyViewCapacity(LEVELS, ENEMIES);

const toWorldPoint = (point) => ({
  x: point.x * PATH_X_SCALE,
  y: PATH_Y_OFFSET + (point.y * PATH_Y_SCALE),
});

const distanceSquared = (first, second) => (
  ((first.x - second.x) ** 2) + ((first.y - second.y) ** 2)
);

const createPathMetrics = (path) => {
  const segments = [];
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1];
    const end = path[index];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    segments.push({ end, length, offset: total, start });
    total += length;
  }
  return { segments, total };
};

const projectPathProgress = (metrics, pathProgress) => {
  const progress = Math.min(metrics.total, Math.max(0, Number(pathProgress) || 0));
  const segment = metrics.segments.find((entry) => progress <= entry.offset + entry.length)
    ?? metrics.segments.at(-1);
  if (!segment) return { x: 0, y: 0 };
  const ratio = segment.length === 0 ? 1 : (progress - segment.offset) / segment.length;
  return toWorldPoint({
    x: segment.start.x + ((segment.end.x - segment.start.x) * ratio),
    y: segment.start.y + ((segment.end.y - segment.start.y) * ratio),
  });
};

const stopBody = (view) => {
  view?._body?.removeAllListeners?.('animationcomplete');
  view?._body?.anims?.stop?.();
  view?._body?.setTint?.(0xffffff);
  view?._body?.setFlipX?.(false);
  view?._healthBar?.clear?.();
  for (const plate of view?._plateAccents?.values?.() ?? []) plate.setVisible?.(false);
  if (view) {
    view._characterKey = null;
    view._flipX = false;
    view._healthKey = null;
    view._lastX = null;
  }
};

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  init(data = {}) {
    this.levelId = data.levelId ?? 'level-1';
  }

  create() {
    this.level = getLevel(this.levelId);
    this.hud = this.registry.get('hud');
    this.hostBridge = this.registry.get('hostBridge');
    this.audioController = this.registry.get('audioController');
    this.metadata = this.registry.get('assetMetadata');
    this.defenderMetadata = this.registry.get('metadata-defenders');
    this.ironhideMappings = this.metadata?.bosses?.bosses
      ?.find(({ id }) => id === 'ironhide-warlord')?.presentationMappings;
    this.qaMode = Boolean(this.hostBridge?.getState?.().qaMode);
    this.reducedMotion = globalThis.document?.documentElement?.dataset?.reducedMotion === 'true';
    this.presentationLimits = resolvePresentationLimits(this.reducedMotion);
    this.simulation = createSimulation(this.level.id, { qa: this.qaMode });
    this.pathMetrics = createPathMetrics(this.level.path);
    this.padById = new Map(this.level.pads.map((pad) => [pad.id, pad]));
    this.selectedDefenderId = null;
    this.selectedTowerId = null;
    this.focusIndex = 0;
    this.battlefieldHasFocus = false;
    this.battleStarted = false;
    this.countdownRemaining = 3;
    this.countdownActive = false;
    this.countdownElapsed = 0;
    this.betweenWaveCountdown = null;
    this.lastBossDefeat = null;
    this.lastSnapshot = summarizePresentationSimulation(this.simulation);
    this.lastPresentationEventId = 0;
    this.terminalHandled = false;
    this.destroyed = false;
    this.domCleanups = [];
    this.transientTimers = new Set();
    this.frameSamples = [];
    this.lastHudRenderTick = Number.NEGATIVE_INFINITY;
    this.lastHealthRenderTick = Number.NEGATIVE_INFINITY;
    this.enemySprites = new Map();
    this.towerSprites = new Map();
    this.projectileSprites = new Map();
    this.telegraphSprites = new Map();
    this.enemyById = new Map();
    this.towerById = new Map();
    this.defenderIdByTowerId = new Map();
    this.clock = createFixedStepClock({
      advanceSteps: (steps) => advanceSimulation(this.simulation, steps),
      getSpeed: () => this.lastSnapshot.timeScale,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume, this);
    this.scale.refresh();
    this.createMap();
    this.createPools();
    this.createFocusViews();
    this.bindDomInput();
    this.disconnectHud = this.hud.connectBattle({
      issueCommand: (command) => this.issueBattleCommand(command),
      selectDefender: (defenderId) => this.selectDefender(defenderId),
      startBattle: () => this.startBattleCountdown(),
    });
    this.hud.showBattle(this.lastSnapshot, {
      battleStarted: false,
      countdownRemaining: 0,
      focusBattlefield: false,
      interactive: true,
      notice: 'Review the chapter briefing, then build before starting the first wave.',
    });
    this.refreshProjection(true);
    this.hud.showLevelIntro(this.level.id, () => this.enterPlacementPhase());
  }

  createMap() {
    this.terrain = this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'environment-grass')
      .setOrigin(0)
      .setDepth(0)
      .setTileScale(0.62);

    this.staticViews = [];
    for (const segment of this.pathMetrics.segments) {
      const start = toWorldPoint(segment.start);
      const end = toWorldPoint(segment.end);
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const worldLength = Math.hypot(dx, dy);
      const path = this.add.image(
        (start.x + end.x) / 2,
        (start.y + end.y) / 2,
        'environment-path-atlas',
        PATH_FRAME.horizontal,
      )
        .setDepth(1)
        .setDisplaySize(worldLength + 54, 210)
        .setRotation(Math.atan2(dy, dx));
      this.staticViews.push(path);
    }
    for (const point of this.level.path) {
      const position = toWorldPoint(point);
      this.staticViews.push(this.add.image(
        position.x,
        position.y,
        'environment-path-atlas',
        PATH_FRAME.isolated,
      ).setDepth(1.1).setDisplaySize(206, 206));
    }

    this.padSprites = new Map();
    for (const pad of this.level.pads) {
      const position = toWorldPoint(pad);
      const view = this.add.image(
        position.x,
        position.y,
        'environment-gameplay-atlas',
        GAMEPLAY_FRAME.buildPad,
      ).setDepth(2).setScale(0.25);
      this.padSprites.set(pad.id, view);
    }

    if (this.textures.exists('environment-props-atlas')) this.createOptionalProps();
    const castlePosition = toWorldPoint(this.level.path.at(-1));
    this.castleSprite = this.add.sprite(
      castlePosition.x,
      castlePosition.y + 18,
      'castle-states',
      0,
    ).setOrigin(0.5, 672 / 724).setDepth(3).setScale(0.27);
  }

  createOptionalProps() {
    const placements = [
      [54, 92, 0, 0.34], [650, 84, 3, 0.32], [62, 850, 1, 0.31], [650, 840, 2, 0.34],
      [112, 540, 4, 0.25], [606, 520, 5, 0.24], [370, 78, 10, 0.18], [350, 870, 11, 0.18],
      [60, 320, 8, 0.20], [664, 330, 9, 0.19], [248, 76, 12, 0.16], [490, 876, 13, 0.17],
    ];
    for (const [x, y, frame, scale] of placements) {
      this.staticViews.push(this.add.image(x, y, 'environment-props-atlas', frame)
        .setDepth(0.6)
        .setScale(scale)
        .setAlpha(0.92));
    }
  }

  createCharacterView(kind) {
    const frameSize = kind === 'boss' ? 384 : 256;
    const body = this.add.sprite(0, 0, kind === 'defender'
      ? 'defender-bladeguard-idle'
      : 'enemy-blight-walker-walk').setOrigin(0.5, 1);
    const accent = this.add.image(0, -frameSize * 0.36, 'environment-gameplay-atlas', GAMEPLAY_FRAME.rangeMarker)
      .setAlpha(0.5)
      .setScale(0.34)
      .setVisible(false);
    const view = this.add.container(0, 0, [accent, body]);
    view._accent = accent;
    view._body = body;
    view._characterKey = null;
    view._flipX = false;
    view._healthKey = null;
    view._lastX = null;
    return view;
  }

  ensureIronhidePlateViews(view) {
    if (view._plateAccents) return view._plateAccents;
    view._plateAccents = new Map();
    const { plates } = resolveIronhidePlatePresentation(this.ironhideMappings);
    const plateTints = [0xbad7df, 0x93b9c5, 0xd7edf0];
    for (const [index, plate] of plates.entries()) {
      const accent = this.add.image(
        plate.x,
        plate.y,
        'environment-gameplay-atlas',
        GAMEPLAY_FRAME.shieldBash,
      )
        .setName(plate.id)
        .setScale(index === 2 ? 0.13 : 0.115)
        .setRotation(index === 0 ? -0.2 : index === 1 ? 0.2 : 0)
        .setTint(plateTints[index] ?? 0xbad7df)
        .setVisible(false);
      view.add(accent);
      view._plateAccents.set(plate.id, accent);
    }
    return view._plateAccents;
  }

  createDefenderView() {
    const aura = this.add.image(0, -34, 'environment-gameplay-atlas', GAMEPLAY_FRAME.rangeMarker)
      .setVisible(false);
    const body = this.add.sprite(0, 0, 'defender-bladeguard-idle').setOrigin(0.5, 1);
    const rank = this.add.image(0, -95, 'environment-gameplay-atlas', GAMEPLAY_FRAME.victoryBurst)
      .setVisible(false);
    const view = this.add.container(0, 0, [aura, body, rank]);
    view._aura = aura;
    view._body = body;
    view._rank = rank;
    return view;
  }

  createPools() {
    this.enemyPool = new ViewPool(() => this.createCharacterView('enemy').setDepth(5), {
      maximum: ENEMY_VIEW_CAPACITY,
      resetView: stopBody,
    });
    this.defenderPool = new ViewPool(() => this.createDefenderView().setDepth(4), {
      maximum: 24,
      resetView: stopBody,
    });
    this.projectilePool = new ViewPool(() => this.add.image(
      0, 0, 'environment-gameplay-atlas', GAMEPLAY_FRAME.arrow,
    ).setDepth(7), { maximum: 640 });
    this.telegraphPool = new ViewPool(() => this.add.image(
      0, 0, 'environment-gameplay-atlas', GAMEPLAY_FRAME.bossWarning,
    ).setDepth(2.5), { maximum: 48 });
    this.defeatPool = new ViewPool(() => this.createCharacterView('enemy').setDepth(5.5), {
      maximum: 32,
      resetView: stopBody,
    });
    this.damageLabelPool = new ViewPool(() => this.add.text(0, 0, '', {
      color: '#fff9e8',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      stroke: '#173329',
      strokeThickness: 5,
    }).setDepth(9).setOrigin(0.5), { maximum: this.presentationLimits.damageLabelCap });
    this.particlePool = new ViewPool(() => this.add.image(
      0, 0, 'environment-gameplay-atlas', GAMEPLAY_FRAME.healSparkle,
    ).setDepth(8), { maximum: this.presentationLimits.particleCap });
  }

  createFocusViews() {
    this.enemyHealthLayer = this.add.graphics().setDepth(6);
    this.focusRing = this.add.graphics().setDepth(10).setVisible(false);
    this.rangeRing = this.add.graphics().setDepth(2.2);
  }

  bindDomInput() {
    const battlefield = globalThis.document?.getElementById('battlefield');
    if (!battlefield) return;
    const on = (type, listener) => {
      battlefield.addEventListener(type, listener);
      this.domCleanups.push(() => battlefield.removeEventListener(type, listener));
    };
    on('pointerdown', (event) => this.handlePointerDown(event, battlefield));
    on('pointerup', (event) => this.releasePointer(event, battlefield));
    on('pointercancel', (event) => this.releasePointer(event, battlefield));
    on('keydown', (event) => this.handleKeyDown(event));
    on('focus', () => this.handleBattlefieldFocus(true));
    on('blur', () => this.handleBattlefieldFocus(false));
  }

  enterPlacementPhase() {
    if (this.destroyed) return;
    this.hud.showBattle(this.lastSnapshot, {
      battleStarted: false,
      countdownRemaining: 0,
      interactive: true,
      notice: 'Select a defender, choose a stone pad, then start the wave when ready.',
    });
    this.hud.announce(`${this.level.name}. Plan your formation before starting wave one.`);
  }

  startBattleCountdown() {
    if (this.destroyed || this.battleStarted || this.countdownActive) return false;
    this.countdownActive = true;
    this.countdownRemaining = 3;
    this.countdownElapsed = 0;
    this.hud.updateBattlePhase({ battleStarted: true, countdownRemaining: 3 });
    this.audioController?.playCue?.('ui');
    return true;
  }

  completeBattleCountdown() {
    this.countdownActive = false;
    this.countdownRemaining = 0;
    this.countdownElapsed = 0;
    this.battleStarted = true;
    this.hud.updateBattlePhase({ battleStarted: true, countdownRemaining: 0 });
    this.hud.announce('Wave one has begun.');
    this.audioController?.playCue?.('wave');
  }

  updateCountdown(delta) {
    this.countdownElapsed += Math.max(0, delta);
    const remaining = Math.max(0, 3 - Math.floor(this.countdownElapsed / 1_000));
    if (remaining !== this.countdownRemaining) {
      this.countdownRemaining = remaining;
      this.hud.updateBattlePhase({ battleStarted: true, countdownRemaining: remaining });
      if (remaining > 0) this.audioController?.playCue?.('ui');
    }
    if (this.countdownElapsed >= 3_000) this.completeBattleCountdown();
  }

  handleBattlefieldFocus(active) {
    this.battlefieldHasFocus = active;
    if (!active) {
      this.updateFocusViews();
      return;
    }
    if (!Number.isInteger(this.focusIndex) || this.focusIndex < 0 || this.focusIndex >= this.level.pads.length) {
      this.focusIndex = 0;
    }
    this.updateFocusViews();
    this.announceFocusedTarget();
  }

  pointerToWorld(event, battlefield) {
    const canvas = battlefield.querySelector('canvas');
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * WORLD_WIDTH,
      y: ((event.clientY - bounds.top) / bounds.height) * WORLD_HEIGHT,
    };
  }

  handlePointerDown(event, battlefield) {
    if (this.lastSnapshot?.terminal || this.terminalHandled) return;
    event.preventDefault();
    battlefield.focus({ preventScroll: true });
    try {
      battlefield.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can be unavailable for synthetic or already-ended pointers.
    }
    const point = this.pointerToWorld(event, battlefield);
    if (!point) return;
    const pad = this.level.pads.find((candidate) => (
      distanceSquared(point, toWorldPoint(candidate)) <= POINTER_HIT_RADIUS ** 2
    ));
    if (!pad) return;
    this.focusIndex = this.level.pads.indexOf(pad);
    const tower = [...this.towerById.values()].find((entry) => entry.padId === pad.id);
    if (tower) {
      this.selectTower(tower.id);
      return;
    }
    if (this.selectedDefenderId) {
      this.issueBattleCommand({ type: 'build', defenderId: this.selectedDefenderId, padId: pad.id });
    } else {
      this.hud.announce('Open build pad. Select defender 1 through 4 first.');
      this.updateFocusViews();
    }
  }

  releasePointer(event, battlefield) {
    try {
      if (battlefield.hasPointerCapture?.(event.pointerId)) battlefield.releasePointerCapture(event.pointerId);
    } catch {
      // The browser may release capture before the terminal pointer event.
    }
  }

  handleKeyDown(event) {
    if (this.lastSnapshot?.terminal || this.terminalHandled) return;
    const defenderIndex = Number.parseInt(event.key, 10) - 1;
    if (defenderIndex >= 0 && defenderIndex < KEYBOARD_DEFENDERS.length) {
      event.preventDefault();
      this.selectDefender(KEYBOARD_DEFENDERS[defenderIndex]);
      return;
    }
    if (event.code === 'Space' || event.key === ' ') {
      event.preventDefault();
      this.issueBattleCommand({
        type: 'set-pause-reason',
        reason: 'manual',
        active: !this.lastSnapshot.pauseReasons.includes('manual'),
      });
      return;
    }
    if (event.key === 'Tab') {
      const focusMove = resolveBattlefieldFocusMove({
        currentIndex: this.focusIndex,
        key: event.key,
        shiftKey: event.shiftKey,
        targetCount: this.level.pads.length,
      });
      if (focusMove.shouldExit) return;
      event.preventDefault();
      this.focusIndex = focusMove.nextIndex;
      this.announceFocusedTarget();
      this.updateFocusViews();
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown'
      || event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusIndex = resolveBattlefieldFocusMove({
        currentIndex: this.focusIndex,
        key: event.key,
        targetCount: this.level.pads.length,
      }).nextIndex;
      this.announceFocusedTarget();
      this.updateFocusViews();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.confirmFocusedTarget();
    }
  }

  confirmFocusedTarget() {
    if (this.lastSnapshot?.terminal || this.terminalHandled) return;
    const pad = this.level.pads[this.focusIndex];
    const tower = [...this.towerById.values()].find((entry) => entry.padId === pad.id);
    if (tower) this.selectTower(tower.id);
    else if (this.selectedDefenderId) {
      this.issueBattleCommand({ type: 'build', defenderId: this.selectedDefenderId, padId: pad.id });
    } else this.hud.announce('Open build pad. Select defender 1 through 4 first.');
  }

  announceFocusedTarget() {
    const pad = this.level.pads[this.focusIndex];
    const tower = [...this.towerById.values()].find((entry) => entry.padId === pad.id);
    this.hud.announce(tower
      ? `${DEFENDER_PRESENTATION[tower.defenderId].name}, tier ${tower.tier + 1}. Press Enter to inspect.`
      : `Open build pad ${this.focusIndex + 1}. Press Enter to build.`);
  }

  selectDefender(defenderId) {
    if (!DEFENDERS[defenderId] || this.destroyed || this.lastSnapshot?.terminal) return;
    this.selectedDefenderId = defenderId;
    this.selectedTowerId = null;
    this.hud.announce(`${DEFENDER_PRESENTATION[defenderId].name} selected. Choose an open build pad.`);
    this.refreshProjection(true);
  }

  selectTower(towerId) {
    if (this.lastSnapshot?.terminal || this.terminalHandled) return;
    const tower = this.towerById.get(towerId);
    if (!tower) return;
    this.selectedTowerId = towerId;
    this.selectedDefenderId = null;
    this.focusIndex = this.level.pads.findIndex((pad) => pad.id === tower.padId);
    this.hud.announce(`${DEFENDER_PRESENTATION[tower.defenderId].name}, tier ${tower.tier + 1}, selected.`);
    this.refreshProjection(true);
  }

  issueBattleCommand(command) {
    if (this.destroyed) return { accepted: false, reason: 'battle-unavailable' };
    if (this.lastSnapshot?.terminal || this.terminalHandled) {
      return { accepted: false, reason: 'battle-terminal' };
    }
    const result = issueCommand(this.simulation, command);
    if (!result.accepted) {
      this.hud.announce(`Command not accepted: ${result.reason}.`);
      return result;
    }
    if (command.type === 'sell' && command.towerId === this.selectedTowerId) this.selectedTowerId = null;
    this.lastSnapshot = summarizePresentationSimulation(this.simulation);
    this.refreshProjection(true);
    if (command.type === 'set-pause-reason' && command.reason === 'manual') {
      this.hostBridge?.setManualPaused?.(command.active);
    }
    const cues = { build: 'deploy', sell: 'coin', upgrade: 'upgrade', 'set-speed': 'ui', 'set-pause-reason': 'ui' };
    this.audioController?.playCue?.(cues[command.type] ?? 'ui');
    const messages = {
      build: 'Defender deployed.',
      sell: 'Defender sold.',
      upgrade: 'Defender upgraded.',
      'set-speed': `Battle speed set to ${command.value} times.`,
      'set-pause-reason': command.active ? 'Battle paused.' : 'Battle resumed.',
    };
    this.hud.announce(messages[command.type] ?? 'Command accepted.');
    return result;
  }

  setExternalPauseReasons(reasons = []) {
    if (!this.simulation || this.destroyed) return;
    for (const reason of ['host', 'visibility', 'modal']) {
      issueCommand(this.simulation, { type: 'set-pause-reason', reason, active: reasons.includes(reason) });
    }
    this.lastSnapshot = summarizePresentationSimulation(this.simulation);
    this.refreshProjection(true);
  }

  handleResume() {
    this.clock?.reset();
    if (this.simulation) {
      this.lastSnapshot = summarizePresentationSimulation(this.simulation);
      this.refreshProjection(true);
    }
  }

  update(_time, delta) {
    if (this.destroyed || this.terminalHandled) return;
    this.frameSamples.push(Math.max(0, Math.min(100, delta)));
    if (this.frameSamples.length > 120) this.frameSamples.shift();
    if (this.countdownActive) {
      this.updateCountdown(delta);
      return;
    }
    if (!this.battleStarted) return;
    const advanced = this.clock.advanceFrame(delta);
    if (advanced > 0) this.commitSimulationFrame();
  }

  advanceTime(milliseconds) {
    if (!this.qaMode || this.destroyed || this.terminalHandled) return this.getTextSnapshot();
    if (!this.battleStarted) {
      this.hud.dismissLevelIntro?.({ restoreFocus: false });
      this.completeBattleCountdown();
    }
    const advanced = this.clock.advanceExact(milliseconds);
    if (advanced > 0) this.commitSimulationFrame();
    return this.getTextSnapshot();
  }

  commitSimulationFrame() {
    this.lastSnapshot = summarizePresentationSimulation(this.simulation);
    this.refreshProjection();
    this.handleTerminalState();
  }

  refreshProjection(forceHud = false) {
    const snapshot = this.lastSnapshot;
    this.enemyById = new Map(snapshot.enemies.map((enemy) => [enemy.id, enemy]));
    this.towerById = new Map(snapshot.towers.map((tower) => [tower.id, tower]));
    this.defenderIdByTowerId = new Map(snapshot.purchaseHistory
      .filter(({ type }) => type === 'build')
      .map(({ towerId, defenderId }) => [towerId, defenderId]));
    this.consumePresentationEvents(snapshot.presentationEvents);
    this.projectEnemies(snapshot);
    this.projectEnemyHealthBars(snapshot, forceHud);
    this.projectTowers(snapshot);
    this.projectProjectiles(snapshot);
    this.projectTelegraphs(snapshot);
    this.updateCastle(snapshot.castleHearts);
    this.updateFocusViews();
    this.updateBetweenWaveCountdown(snapshot);
    if (forceHud || snapshot.terminal
      || snapshot.tick - this.lastHudRenderTick >= HUD_RENDER_INTERVAL_TICKS) {
      this.lastHudRenderTick = snapshot.tick;
      this.hud.renderBattle(snapshot, {
        interactive: !snapshot.terminal,
        selectedDefenderId: this.selectedDefenderId,
        selectedTowerId: this.selectedTowerId,
      });
      this.hud.updateBattlePhase({
        battleStarted: this.battleStarted || this.countdownActive,
        betweenWaveCountdown: this.betweenWaveCountdown,
        countdownRemaining: this.countdownActive ? this.countdownRemaining : 0,
      });
    }
  }

  playCharacterAction(view, kind, characterId, action, restore = 'walk') {
    const body = view?._body;
    const key = animationKey(kind, characterId, action);
    if (!body || !this.anims.exists(key)) return;
    body.removeAllListeners('animationcomplete');
    body.play(key, true);
    if (action !== restore) {
      body.once('animationcomplete', () => {
        if (view.active && this.anims.exists(animationKey(kind, characterId, restore))) {
          body.play(animationKey(kind, characterId, restore), true);
        }
      });
    }
  }

  consumePresentationEvents(events) {
    for (const event of events) {
      if (event.id <= this.lastPresentationEventId) continue;
      this.lastPresentationEventId = event.id;
      const { kind, payload } = event;
      if (kind === 'tower-attack' || kind === 'tower-mastery') {
        const view = this.towerSprites.get(payload.towerId);
        this.playCharacterAction(
          view,
          'defender',
          payload.defenderId,
          kind === 'tower-mastery' || payload.mastery ? 'mastery' : 'attack',
          'idle',
        );
        if (kind === 'tower-mastery') {
          const tower = this.towerById.get(payload.towerId);
          const pad = tower && this.padById.get(tower.padId);
          if (pad) this.spawnBurst(toWorldPoint(pad), GAMEPLAY_FRAME.victoryBurst, 7, event.id);
        }
        this.audioController?.playCue?.(kind === 'tower-mastery' ? 'mastery' : 'attack');
      } else if (kind === 'enemy-hit') {
        this.spawnDamageLabel(toWorldPoint(payload.position), payload.damage);
      } else if (kind === 'enemy-defeated') {
        this.spawnDefeat(payload);
        if (BOSS_IDS.has(payload.enemyId)) {
          this.lastBossDefeat = {
            enemyId: payload.enemyId,
            presentedAtMs: this.time.now,
            tick: event.tick,
          };
        }
        this.audioController?.playCue?.('coin');
      } else if (kind === 'projectile-impact') {
        this.spawnBurst(toWorldPoint(payload.position), GAMEPLAY_FRAME.explosion, 3, event.id);
        this.audioController?.playCue?.('impact');
      } else if (kind === 'hexcaller-cast') {
        this.playCharacterAction(this.enemySprites.get(payload.enemyId), 'enemy', 'hexcaller', 'cast');
        this.spawnBurst(toWorldPoint(payload.position), GAMEPLAY_FRAME.healSparkle, 6, event.id);
      } else if (kind === 'ironhide-rally') {
        this.playCharacterAction(this.enemySprites.get(payload.bossId), 'boss', 'ironhide-warlord', 'ability');
        this.spawnBurst(toWorldPoint(payload.position), GAMEPLAY_FRAME.shieldBash, 8, event.id);
        this.audioController?.playCue?.('boss-ability');
      } else if (kind === 'boss-ability-warning') {
        const bossKind = BOSS_IDS.has(payload.enemyId) ? 'boss' : 'enemy';
        this.playCharacterAction(this.enemySprites.get(payload.bossId), bossKind, payload.enemyId, 'ability');
        this.audioController?.playCue?.('boss-warning');
      } else if (kind === 'boss-ability-impact') {
        this.spawnBurst(toWorldPoint(payload.position), GAMEPLAY_FRAME.stunStars, 10, event.id);
        if (this.presentationLimits.cameraShake > 0) {
          this.cameras.main.shake(180, this.presentationLimits.cameraShake);
        }
        this.audioController?.playCue?.('boss-ability');
      } else if (kind === 'ironhide-plate-break') {
        const boss = this.enemyById.get(payload.bossId);
        if (boss) {
          this.spawnBurst(
            projectPathProgress(this.pathMetrics, boss.pathProgress),
            GAMEPLAY_FRAME.defeatCrack,
            7,
            event.id,
          );
        }
        this.audioController?.playCue?.('armor-break');
      } else if (kind === 'ironhide-vulnerable') {
        const boss = this.enemyById.get(payload.bossId);
        if (boss) {
          this.spawnBurst(
            projectPathProgress(this.pathMetrics, boss.pathProgress),
            GAMEPLAY_FRAME.slowRune,
            9,
            event.id,
          );
        }
      } else if (kind === 'dread-phase') {
        const view = this.enemySprites.get(payload.bossId);
        view?._accent?.setFrame(GAMEPLAY_FRAME.slowRune)
          .setTint([0xffffff, 0xa86bff, 0xff6b7a][payload.phase - 1] ?? 0xffffff)
          .setVisible(true);
        this.audioController?.playCue?.('boss-ability');
      } else if (kind === 'dread-summon') {
        const boss = this.enemyById.get(payload.bossId);
        if (boss) this.spawnBurst(projectPathProgress(this.pathMetrics, boss.pathProgress), GAMEPLAY_FRAME.slowRune, 12, event.id);
        this.audioController?.playCue?.('boss-warning');
      } else if (kind === 'castle-impact') {
        this.castleSprite?.setFrame(1);
        this.spawnBurst(toWorldPoint(payload.position), GAMEPLAY_FRAME.defeatCrack, 9, event.id);
        if (this.presentationLimits.cameraShake > 0) this.cameras.main.shake(220, 0.009);
        this.audioController?.playCue?.('castle-damage');
        const timer = this.time.delayedCall(this.reducedMotion ? 90 : 260, () => {
          this.transientTimers.delete(timer);
          this.castleSprite?.setFrame(this.lastSnapshot.castleHearts <= 0
            ? 3 : this.lastSnapshot.castleHearts === 1 ? 2 : 0);
        });
        this.transientTimers.add(timer);
      } else if (kind === 'wave-start') {
        this.betweenWaveCountdown = null;
        this.audioController?.playCue?.('wave');
      }
    }
  }

  spawnDamageLabel(position, damage) {
    const label = this.damageLabelPool.acquire();
    if (!label) return;
    label.setText(`−${damage}`);
    label.setPosition(position.x, position.y - 68);
    label.setAlpha(1);
    this.tweens.add({
      targets: label,
      y: position.y - (this.reducedMotion ? 76 : 112),
      alpha: 0,
      duration: this.reducedMotion ? 180 : 520,
      ease: 'Cubic.easeOut',
      onComplete: () => this.damageLabelPool.release(label),
    });
  }

  spawnBurst(position, frame, count, seed = 0) {
    const visibleCount = Math.min(count, this.presentationLimits.particleCap);
    for (let index = 0; index < visibleCount; index += 1) {
      const particle = this.particlePool.acquire();
      if (!particle) break;
      const angle = (((index * 137.5) + (seed * 17)) % 360) * (Math.PI / 180);
      const distance = this.reducedMotion ? 14 : 30 + ((index % 4) * 8);
      particle.setFrame(frame).setPosition(position.x, position.y - 28).setScale(0.12).setAlpha(0.95);
      this.tweens.add({
        targets: particle,
        x: position.x + (Math.cos(angle) * distance),
        y: position.y - 28 + (Math.sin(angle) * distance),
        alpha: 0,
        scale: 0.05,
        duration: this.reducedMotion ? 180 : 460,
        ease: 'Cubic.easeOut',
        onComplete: () => this.particlePool.release(particle),
      });
    }
  }

  spawnDefeat(payload) {
    const view = this.defeatPool.acquire();
    if (!view) return;
    const kind = BOSS_IDS.has(payload.enemyId) ? 'boss' : 'enemy';
    const presentation = ENEMY_PRESENTATION[payload.enemyId];
    const position = toWorldPoint(payload.position);
    view.setPosition(position.x, position.y);
    view._accent.setVisible(false);
    view._body.setTexture(characterAssetId(kind, payload.enemyId, 'defeat'), 0)
      .setScale(presentation.displayScale);
    const key = animationKey(kind, payload.enemyId, 'defeat');
    const animation = this.anims.exists(key) ? this.anims.get(key) : null;
    const release = () => this.defeatPool.release(view);
    if (this.reducedMotion || !animation) {
      view._body.setFrame(animation?.frames?.at(-1)?.textureFrame ?? 0);
      const timer = this.time.delayedCall(240, () => {
        this.transientTimers.delete(timer);
        release();
      });
      this.transientTimers.add(timer);
    } else {
      view._body.removeAllListeners('animationcomplete');
      view._body.once('animationcomplete', release);
      view._body.play(key, true);
    }
  }

  projectEnemies(snapshot) {
    syncProjectionMap(this.enemySprites, this.enemyPool, snapshot.enemies, (view, enemy) => {
      const presentation = ENEMY_PRESENTATION[enemy.enemyId];
      const kind = presentation.kind;
      const position = projectPathProgress(this.pathMetrics, enemy.pathProgress);
      const body = view._body;
      const characterKey = characterAssetId(kind, enemy.enemyId, 'walk');
      if (view._characterKey !== characterKey) {
        body.setTexture(characterKey, 0).setScale(presentation.displayScale);
        if (this.anims.exists(animationKey(kind, enemy.enemyId, 'walk'))) {
          body.play(animationKey(kind, enemy.enemyId, 'walk'), true);
        }
        view._characterKey = characterKey;
        view._healthKey = null;
      }
      const flipX = view._lastX !== null && position.x < view._lastX - 0.15;
      if (flipX !== view._flipX) {
        body.setFlipX(flipX);
        view._flipX = flipX;
      }
      view._lastX = position.x;
      view.setPosition(position.x, position.y);
      const ratio = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));
      const showHealth = kind === 'boss' || ratio < 0.999;
      view._healthKey = showHealth ? `${kind}:${Math.round(ratio * 1_000)}` : 'hidden';
      if (enemy.enemyId === 'ironhide-warlord') {
        const plateState = resolveIronhidePlatePresentation(this.ironhideMappings, {
          thresholdFlags: enemy.thresholdFlags,
          tick: snapshot.tick,
          vulnerableUntilTick: enemy.vulnerableUntilTick ?? 0,
        });
        const plateViews = this.ensureIronhidePlateViews(view);
        for (const plate of plateState.plates) {
          plateViews.get(plate.id)?.setPosition(plate.x, plate.y).setVisible(plate.visible);
        }
        view._accent.setFrame(GAMEPLAY_FRAME.slowRune)
          .setTint(0x58d5ff)
          .setVisible(plateState.vulnerabilityVisible);
      } else if (enemy.enemyId === 'dread-colossus') {
        for (const plate of view._plateAccents?.values?.() ?? []) plate.setVisible(false);
        const ratioPhase = ratio < 0.4 ? 3 : ratio < 0.75 ? 2 : 1;
        view._accent.setFrame(GAMEPLAY_FRAME.slowRune)
          .setTint([0xffffff, 0xa86bff, 0xff6b7a][ratioPhase - 1])
          .setVisible(true);
      } else {
        for (const plate of view._plateAccents?.values?.() ?? []) plate.setVisible(false);
        if (view._accent.visible) view._accent.setVisible(false);
      }
    }, (_id, view) => {
      view._lastX = null;
    });
  }

  projectEnemyHealthBars(snapshot, force = false) {
    if (!this.enemyHealthLayer || (!force
      && snapshot.tick - this.lastHealthRenderTick < ENEMY_HEALTH_RENDER_INTERVAL_TICKS)) return;
    this.lastHealthRenderTick = snapshot.tick;
    this.enemyHealthLayer.clear();
    for (const enemy of snapshot.enemies) {
      const presentation = ENEMY_PRESENTATION[enemy.enemyId];
      const kind = presentation.kind;
      const ratio = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));
      const showHealth = kind === 'boss' || ratio < 0.999;
      if (!showHealth) continue;
      const position = projectPathProgress(this.pathMetrics, enemy.pathProgress);
      const barY = position.y + (kind === 'boss' ? -176 : -108);
      const barWidth = kind === 'boss' ? 116 : 72;
      const barX = position.x - (barWidth / 2);
      this.enemyHealthLayer.fillStyle(0x102f29, 0.85)
        .fillRoundedRect(barX, barY, barWidth, 10, 5);
      this.enemyHealthLayer.fillStyle(kind === 'boss' ? 0xff6b61 : 0x8fe36a, 1)
        .fillRoundedRect(barX + 2, barY + 2, Math.max(1, (barWidth - 4) * ratio), 6, 3);
    }
  }

  projectTowers(snapshot) {
    syncProjectionMap(this.towerSprites, this.defenderPool, snapshot.towers, (view, tower) => {
      const pad = this.padById.get(tower.padId);
      const position = toWorldPoint(pad);
      const body = view._body;
      const idleAsset = characterAssetId('defender', tower.defenderId, 'idle');
      const idleAnimationKey = animationKey('defender', tower.defenderId, 'idle');
      if (shouldProjectDefenderIdle({
        currentAnimationKey: body.anims?.currentAnim?.key,
        idleAnimationKey,
        idleAsset,
        isPlaying: body.anims?.isPlaying,
        textureKey: body.texture.key,
      })) {
        body.setTexture(idleAsset, 0);
        if (this.anims.exists(idleAnimationKey)) {
          body.play(idleAnimationKey, true);
        }
      }
      const tint = {
        bladeguard: 0x8fe36a,
        ranger: 0xf2c94c,
        ironwarden: 0x69a7ff,
        'rune-artificer': 0x58d5ff,
      }[tower.defenderId];
      view.setPosition(position.x, position.y + 20);
      body.setScale(DEFENDER_PRESENTATION[tower.defenderId].displayScale * (1 + (tower.tier * 0.05)));
      view._aura.setTint(tint).setAlpha(tower.tier === 2 ? 0.46 : 0.28)
        .setScale(tower.tier === 2 ? 0.38 : 0.29).setVisible(tower.tier > 0);
      view._rank.setTint(tint).setScale(0.18).setVisible(tower.tier === 2);
      this.padSprites.get(tower.padId)?.setFrame(
        tower.id === this.selectedTowerId ? GAMEPLAY_FRAME.selectedBuildPad : GAMEPLAY_FRAME.buildPad,
      );
    });
    const occupiedPads = new Set(snapshot.towers.map(({ padId }) => padId));
    for (const [padId, view] of this.padSprites) {
      if (!occupiedPads.has(padId)) view.setFrame(GAMEPLAY_FRAME.buildPad);
    }
  }

  projectProjectiles(snapshot) {
    syncProjectionMap(this.projectileSprites, this.projectilePool, snapshot.projectiles, (view, projectile) => {
      const tower = this.towerById.get(projectile.sourceTowerId);
      const defenderId = tower?.defenderId
        ?? this.defenderIdByTowerId.get(projectile.sourceTowerId)
        ?? 'ranger';
      const sourcePosition = toWorldPoint(projectile.launchPosition);
      const target = this.enemyById.get(projectile.targetId);
      const targetPosition = target
        ? projectPathProgress(this.pathMetrics, target.pathProgress)
        : projectPathProgress(this.pathMetrics, projectile.targetPathProgressAtLaunch);
      const duration = Math.max(1, projectile.impactTick - projectile.launchTick);
      const progress = Math.max(0, Math.min(1, (snapshot.tick - projectile.launchTick) / duration));
      const frame = DEFENDER_PRESENTATION[defenderId]?.projectileFrame ?? GAMEPLAY_FRAME.arrow;
      const x = Phaser.Math.Linear(sourcePosition.x, targetPosition.x, progress);
      const y = Phaser.Math.Linear(sourcePosition.y - 42, targetPosition.y - 32, progress);
      view.setFrame(frame).setPosition(x, y).setVisible(true).setScale(frame === GAMEPLAY_FRAME.arrow ? 0.14 : 0.17);
      view.setRotation(Math.atan2(targetPosition.y - sourcePosition.y, targetPosition.x - sourcePosition.x));
    });
  }

  projectTelegraphs(snapshot) {
    const telegraphs = snapshot.effects.filter((effect) => effect.kind.includes('telegraph'));
    syncProjectionMap(this.telegraphSprites, this.telegraphPool, telegraphs, (view, effect) => {
      const source = this.enemyById.get(effect.sourceId);
      if (!source) {
        view.setVisible(false);
        return;
      }
      const position = projectPathProgress(this.pathMetrics, source.pathProgress);
      const radius = effect.radius ?? (effect.kind === 'mossback-telegraph'
        ? ENEMIES['mossback-brute'].abilityRadius
        : ENEMIES['dread-colossus'].pulseRadius);
      const geometry = projectCombatRadius({
        position,
        radius,
        xScale: PATH_X_SCALE,
        yScale: PATH_Y_SCALE,
      });
      const remaining = Math.max(0, effect.triggerTick - snapshot.tick);
      view.setFrame(GAMEPLAY_FRAME.bossWarning)
        .setPosition(geometry.x, geometry.y)
        .setDisplaySize(geometry.displayWidth, geometry.displayHeight)
        .setAlpha(0.56 + ((remaining % 20) / 100))
        .setVisible(this.presentationLimits.telegraphsEnabled);
    });
  }

  updateCastle(hearts) {
    if (!this.castleSprite || this.castleSprite.frame.name === 1) return;
    this.castleSprite.setFrame(hearts <= 0 ? 3 : hearts === 1 ? 2 : 0);
  }

  updateBetweenWaveCountdown(snapshot) {
    this.betweenWaveCountdown = resolveBetweenWaveCountdown(snapshot, WAVE_GAP_TICKS);
  }

  updateFocusViews() {
    if (!this.focusRing || !this.rangeRing) return;
    const pad = this.level.pads[this.focusIndex];
    if (!pad) return;
    const position = toWorldPoint(pad);
    const tower = [...this.towerById.values()].find((entry) => entry.padId === pad.id);
    this.focusRing.clear();
    if (!this.battlefieldHasFocus) {
      this.focusRing.setVisible(false);
    } else {
      this.focusRing.setVisible(true);
      this.focusRing.lineStyle(6, 0xffffff, 0.96);
      this.focusRing.strokeEllipse(position.x, position.y, 82, 62);
    }
    this.rangeRing.clear();
    if (tower) {
      const range = DEFENDERS[tower.defenderId].range[tower.tier];
      this.rangeRing.lineStyle(4, 0xffe59a, 0.5);
      this.rangeRing.strokeEllipse(position.x, position.y, range * PATH_X_SCALE * 2, range * PATH_Y_SCALE * 2);
    }
  }

  handleTerminalState() {
    if (!this.lastSnapshot.terminal || this.terminalHandled) return;
    this.terminalHandled = true;
    const victory = this.lastSnapshot.outcome === 'victory';
    if (victory) {
      const levelNumber = Number.parseInt(this.level.id.replace('level-', ''), 10);
      this.hostBridge?.recordBattleResult?.({
        highestUnlockedLevel: Math.min(10, levelNumber + 1),
        levelId: this.level.id,
        medal: this.lastSnapshot.medal,
        score: this.lastSnapshot.score,
      });
      this.spawnBurst(toWorldPoint(this.level.path.at(-1)), GAMEPLAY_FRAME.victoryBurst, 16, this.lastSnapshot.tick);
      this.audioController?.playCue?.('victory');
    } else this.audioController?.playCue?.('defeat');

    const resultData = {
      elapsedTicks: this.lastSnapshot.tick,
      hearts: this.lastSnapshot.castleHearts,
      levelId: this.level.id,
      medal: this.lastSnapshot.medal,
      score: this.lastSnapshot.score,
      summary: victory
        ? `${this.lastSnapshot.medal} medal · ${this.lastSnapshot.score} points`
        : `Wave ${Math.max(1, this.lastSnapshot.waveIndex + 1)} reached the castle.`,
      victory,
    };
    const terminalBossId = this.lastBossDefeat?.enemyId ?? null;
    const delay = resolveResultTransitionDelay({
      bossMetadata: this.metadata?.bosses,
      elapsedSinceBossDefeatMs: this.lastBossDefeat
        ? Math.max(0, this.time.now - this.lastBossDefeat.presentedAtMs)
        : 0,
      enemyId: terminalBossId,
      reducedMotion: this.reducedMotion,
    });
    this.resultTimer = this.time.delayedCall(delay, () => this.scene.start('ResultScene', resultData));
  }

  getPerformanceState() {
    const sorted = [...this.frameSamples].sort((a, b) => a - b);
    const averageFrameMs = this.frameSamples.length > 0
      ? this.frameSamples.reduce((sum, value) => sum + value, 0) / this.frameSamples.length
      : 0;
    return {
      averageFrameMs: Number(averageFrameMs.toFixed(3)),
      enemyProjection: {
        capacity: ENEMY_VIEW_CAPACITY,
        missing: Math.max(0, (this.lastSnapshot?.enemies?.length ?? 0) - this.enemySprites.size),
        projected: this.enemySprites.size,
        snapshot: this.lastSnapshot?.enemies?.length ?? 0,
      },
      p95FrameMs: Number((sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? 0).toFixed(3)),
      pools: {
        damageLabels: this.damageLabelPool?.getState() ?? null,
        defeats: this.defeatPool?.getState() ?? null,
        defenders: this.defenderPool?.getState() ?? null,
        enemies: this.enemyPool?.getState() ?? null,
        particles: this.particlePool?.getState() ?? null,
        projectiles: this.projectilePool?.getState() ?? null,
        telegraphs: this.telegraphPool?.getState() ?? null,
      },
      reducedMotion: this.reducedMotion,
      sampleCount: this.frameSamples.length,
    };
  }

  getPresentationState() {
    return {
      enemies: [...this.enemySprites].map(([id, view]) => ({
        accentVisible: Boolean(view._accent?.visible),
        id,
        plateAccents: [...(view._plateAccents?.entries?.() ?? [])].map(([plateId, plate]) => ({
          id: plateId,
          visible: Boolean(plate.visible),
          x: plate.x,
          y: plate.y,
        })),
      })),
      telegraphs: [...this.telegraphSprites].map(([id, view]) => ({
        displayHeight: Number(view.displayHeight.toFixed(3)),
        displayWidth: Number(view.displayWidth.toFixed(3)),
        id,
        visible: view.visible,
      })),
      tick: this.lastSnapshot?.tick ?? 0,
      towers: [...this.towerSprites].map(([id, view]) => {
        const body = view._body;
        return {
          animationKey: body.anims?.currentAnim?.key ?? null,
          frame: body.anims?.currentFrame?.textureFrame ?? body.frame?.name ?? null,
          id,
          isPlaying: Boolean(body.anims?.isPlaying),
          textureKey: body.texture?.key ?? null,
        };
      }),
    };
  }

  getTextSnapshot() {
    if (!this.lastSnapshot) return null;
    const snapshot = summarizeSimulation(this.simulation);
    return {
      battleStarted: this.battleStarted,
      betweenWaveCountdown: this.betweenWaveCountdown,
      castleHearts: snapshot.castleHearts,
      coins: snapshot.coins,
      countdownRemaining: this.countdownActive ? this.countdownRemaining : 0,
      effects: snapshot.effects.map(({ id, kind, sourceId, targetId }) => ({ id, kind, sourceId, targetId })),
      enemies: snapshot.enemies.map(({ id, enemyId, health, maxHealth, pathProgress }) => ({
        enemyId,
        health,
        id,
        maxHealth,
        pathProgress: Number(pathProgress.toFixed(3)),
      })),
      levelId: snapshot.levelId,
      medal: snapshot.medal,
      nextWaveIndex: snapshot.nextWaveIndex,
      nextWaveStartTick: snapshot.nextWaveStartTick,
      outcome: snapshot.outcome,
      pauseReasons: [...snapshot.pauseReasons],
      performance: this.getPerformanceState(),
      projectiles: snapshot.projectiles.map((projectile) => ({ ...projectile })),
      qa: snapshot.qa,
      score: snapshot.score,
      seed: snapshot.seed,
      selectedDefenderId: this.selectedDefenderId,
      selectedTowerId: this.selectedTowerId,
      terminal: snapshot.terminal,
      tick: snapshot.tick,
      timeScale: snapshot.timeScale,
      towers: snapshot.towers.map((tower) => ({ ...tower })),
      waveIndex: snapshot.waveIndex,
    };
  }

  shutdown() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.events.off(Phaser.Scenes.Events.RESUME, this.handleResume, this);
    this.domCleanups.splice(0).forEach((remove) => remove());
    this.hud.dismissLevelIntro?.({ restoreFocus: false });
    this.disconnectHud?.();
    this.disconnectHud = null;
    this.resultTimer?.remove?.(false);
    for (const timer of this.transientTimers) timer?.remove?.(false);
    this.transientTimers.clear();
    clearPresentationEvents(this.simulation);
    for (const pool of [
      this.enemyPool,
      this.defenderPool,
      this.projectilePool,
      this.telegraphPool,
      this.defeatPool,
      this.damageLabelPool,
      this.particlePool,
    ]) pool?.destroy();
    this.enemySprites.clear();
    this.towerSprites.clear();
    this.projectileSprites.clear();
    this.telegraphSprites.clear();
    this.enemyById.clear();
    this.towerById.clear();
    this.defenderIdByTowerId.clear();
    this.padSprites.clear();
    this.focusRing?.destroy();
    this.rangeRing?.destroy();
    this.castleSprite?.destroy();
    this.terrain?.destroy();
    for (const view of this.staticViews ?? []) view.destroy?.();
    this.clock?.reset();
  }
}
