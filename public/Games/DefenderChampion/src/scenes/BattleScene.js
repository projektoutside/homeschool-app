import Phaser from 'phaser';
import { DEFENDERS } from '../config/defenders.js';
import { getLevel } from '../config/levels.js';
import {
  GRID,
  cellCenter,
  createGridPathMetrics,
  deriveRoadTiles,
} from '../core/grid-geometry.js';
import { evaluateCellBuild, getGridCell } from '../core/grid-placement.js';
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
  ViewPool,
  animationKey,
  attemptPlacementBuild,
  beginDefenderDefeatPresentation,
  characterAssetId,
  clearPresentationTransients,
  dispatchLanePresentationEvent,
  finishTrackedMotion,
  resolveBurstMotion,
  resolveBetweenWaveCountdown,
  resolveCommandRejectionMessage,
  resolveDamageLabelMotion,
  resolveDefenderHitMotion,
  resolveEnemyAttackMotion,
  resolveEnemyRoadProjection,
  resolveFrontlineHealthBar,
  resolveIronhidePlatePresentation,
  resolvePlacementPrompt,
  resolvePresentationLimits,
  resolveResultTransitionDelay,
  shouldProjectDefenderIdle,
  syncProjectionMap,
} from '../presentation.js';
import {
  formatCellAccessibleLabel,
  projectGridPathProgress,
  resolveCellFromWorldPoint,
  resolveCellVisualState,
  resolveContainWorldPoint,
  resolveGridFocusMove,
  resolveReadableSpriteScale,
  resolveSquareRangeCells,
} from '../grid-presentation.js';
import { WAVE_GAP_TICKS } from '../core/wave-controller.js';
import { createBattlefieldGridMirror, createFixedStepClock } from '../ui/hud-controller.js';

const WORLD_WIDTH = GRID.width;
const WORLD_HEIGHT = GRID.height;
const HUD_RENDER_INTERVAL_TICKS = 6;
const ENEMY_HEALTH_RENDER_INTERVAL_TICKS = 3;
const KEYBOARD_DEFENDERS = Object.freeze(Object.keys(DEFENDERS));
const BOSS_IDS = new Set(['mossback-brute', 'ironhide-warlord', 'dread-colossus']);
const ENEMY_VIEW_CAPACITY = 18;
const DEFENDER_VIEW_CAPACITY = GRID.columns * GRID.rows;
const ROAD_TILE_FRAME = Object.freeze({
  isolated: 0,
  horizontal: 1,
  vertical: 2,
  cross: 3,
  northEast: 4,
  eastSouth: 5,
  southWest: 6,
  westNorth: 7,
  capNorth: 12,
  capEast: 13,
  capSouth: 14,
  capWest: 15,
});

const stopBody = (view) => {
  view?._body?.removeAllListeners?.('animationcomplete');
  view?._body?.anims?.stop?.();
  view?._visualRoot?.setPosition?.(0, 0);
  view?._visualRoot?.setAngle?.(0);
  view?._visualRoot?.setAlpha?.(1);
  view?._body?.setPosition?.(0, 0);
  view?._body?.setAngle?.(0);
  view?._body?.setAlpha?.(1);
  view?._body?.setTint?.(0xffffff);
  view?._body?.setFlipX?.(false);
  view?._body?.setScale?.(1);
  view?._healthBackground?.clear?.().setVisible?.(false);
  view?._healthFill?.clear?.().setVisible?.(false);
  view?._aura?.setVisible?.(false);
  view?._rank?.setVisible?.(false);
  const resetOverlay = (overlay) => {
    overlay?.setVisible?.(false);
    if (Number.isFinite(overlay?._baseScale)) overlay.setScale?.(overlay._baseScale);
    if (Number.isFinite(overlay?._baseX) && Number.isFinite(overlay?._baseY)) {
      overlay.setPosition?.(overlay._baseX, overlay._baseY);
    }
  };
  resetOverlay(view?._accent);
  for (const plate of view?._plateAccents?.values?.() ?? []) resetOverlay(plate);
  if (view) {
    view.setAlpha?.(1);
    view.setScale?.(1);
    if (Number.isFinite(view._poolDepth)) view.setDepth?.(view._poolDepth);
    view._baseScale = null;
    view._characterKey = null;
    view._defenderId = null;
    view._enemyId = null;
    view._flipX = false;
    view._healthKey = null;
    view._lastX = null;
    view._cellId = null;
    view._visualTransform = null;
  }
};

const preparePooledView = (view, depth) => {
  view._poolDepth = depth;
  return view.setDepth(depth);
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
    this.pathMetrics = createGridPathMetrics(this.level.roadCells);
    this.selectedDefenderId = null;
    this.selectedTowerId = null;
    this.focusedCellId = 'r0c0';
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
    this.detachedDefenderViews = new Set();
    this.projectionDiagnostics = [];
    this.transientTimers = new Set();
    this.frameSamples = [];
    this.lastHudRenderTick = Number.NEGATIVE_INFINITY;
    this.lastHealthRenderTick = Number.NEGATIVE_INFINITY;
    this.enemySprites = new Map();
    this.towerSprites = new Map();
    this.projectileSprites = new Map();
    this.enemyById = new Map();
    this.towerById = new Map();
    this.defenderIdByTowerId = new Map();
    this.recentDefenderPositions = new Map();
    this.clock = createFixedStepClock({
      advanceSteps: (steps) => advanceSimulation(this.simulation, steps),
      getSpeed: () => this.lastSnapshot.timeScale,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume, this);
    this.scale.refresh();
    this.createBattlefield();
    this.createPools();
    this.createProjectionLayers();
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

  createBattlefield() {
    this.terrain = this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'environment-grass')
      .setOrigin(0)
      .setDepth(0)
      .setTileScale(0.62);

    this.staticViews = [];
    this.roadTileViews = new Map();
    for (const tile of deriveRoadTiles(this.level.roadCells)) {
      const view = this.add.image(
        tile.x,
        tile.y,
        'environment-path-atlas',
        ROAD_TILE_FRAME[tile.frame],
      )
        .setDepth(1)
        .setDisplaySize(GRID.cellSize, GRID.cellSize);
      view._cellId = tile.cellId;
      this.roadTileViews.set(tile.cellId, view);
      this.staticViews.push(view);
    }

    this.cellViews = new Map();
    for (const cell of this.level.cells) {
      const center = cellCenter(cell.id);
      const view = this.createCellView(cell, center);
      view.setInteractive(
        new Phaser.Geom.Rectangle(
          -GRID.cellSize / 2,
          -GRID.cellSize / 2,
          GRID.cellSize,
          GRID.cellSize,
        ),
        Phaser.Geom.Rectangle.Contains,
      );
      this.cellViews.set(cell.id, view);
    }

    if (this.textures.exists('environment-props-atlas')) this.createOptionalProps();
    const castlePosition = cellCenter(this.level.roadCells.at(-1));
    this.castleSprite = this.add.sprite(
      castlePosition.x,
      castlePosition.y + 18,
      'castle-states',
      0,
    ).setOrigin(0.5, 672 / 724).setDepth(3).setScale(0.27);
  }

  createCellView(cell, center) {
    const view = this.add.graphics().setPosition(center.x, center.y).setDepth(1.8);
    view._cellId = cell.id;
    view._terrain = cell.terrain;
    view._visualState = resolveCellVisualState({ terrain: cell.terrain });
    this.drawCellView(view, view._visualState);
    view.setName?.(`${cell.terrain}-cell-${cell.id}`);
    return view;
  }

  drawCellView(view, state) {
    view.clear();
    view.fillStyle(state.fillColor, state.fillAlpha)
      .fillRect(-GRID.cellSize / 2, -GRID.cellSize / 2, GRID.cellSize, GRID.cellSize);
    const inset = state.focused ? 3 : 1;
    view.lineStyle(state.focused ? 5 : 2, state.borderColor, state.borderAlpha)
      .strokeRect(
        (-GRID.cellSize / 2) + inset,
        (-GRID.cellSize / 2) + inset,
        GRID.cellSize - (inset * 2),
        GRID.cellSize - (inset * 2),
      );
  }

  resolveTowerProjection(tower) {
    const cell = getGridCell(this.level, tower?.cellId);
    if (!cell) return null;
    const center = cellCenter(cell.id);
    return { cell, position: { x: center.x, y: center.y + 32 } };
  }

  createOptionalProps() {
    const placements = [
      [54, 92, 0, 0.34], [650, 84, 3, 0.32], [62, 850, 1, 0.31], [650, 840, 2, 0.34],
      [112, 540, 4, 0.25], [606, 520, 5, 0.24], [370, 78, 10, 0.18], [350, 870, 11, 0.18],
      [60, 320, 8, 0.20], [664, 330, 9, 0.19], [248, 76, 12, 0.16], [490, 876, 13, 0.17],
    ];
    for (const [x, y, frame, scale] of placements) {
      const cellId = resolveCellFromWorldPoint({ x, y });
      const cell = getGridCell(this.level, cellId);
      const castlePosition = cellCenter(this.level.roadCells.at(-1));
      if (cell?.terrain !== 'grass' || Math.hypot(x - castlePosition.x, y - castlePosition.y) < 116) continue;
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
    const accent = this.add.image(0, -frameSize * 0.36, 'environment-gameplay-atlas', GAMEPLAY_FRAME.slowRune)
      .setAlpha(0.5)
      .setScale(0.34)
      .setVisible(false);
    accent._baseScale = 0.34;
    accent._baseX = 0;
    accent._baseY = -frameSize * 0.36;
    const visualRoot = this.add.container(0, 0, [accent, body]);
    const view = this.add.container(0, 0, [visualRoot]);
    view._accent = accent;
    view._body = body;
    view._characterKey = null;
    view._flipX = false;
    view._healthKey = null;
    view._lastX = null;
    view._motion = null;
    view._visualRoot = visualRoot;
    view._attackPoseReady = false;
    view._attackTargetTowerId = null;
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
      accent._baseScale = index === 2 ? 0.13 : 0.115;
      accent._baseX = plate.x;
      accent._baseY = plate.y;
      view._visualRoot.add(accent);
      view._plateAccents.set(plate.id, accent);
    }
    return view._plateAccents;
  }

  createDefenderView() {
    const aura = this.add.image(0, -34, 'environment-gameplay-atlas', GAMEPLAY_FRAME.slowRune)
      .setVisible(false);
    const healthBackground = this.add.graphics().setVisible(false);
    const healthFill = this.add.graphics().setVisible(false);
    const body = this.add.sprite(0, 0, 'defender-bladeguard-idle').setOrigin(0.5, 1);
    const rank = this.add.image(0, -95, 'environment-gameplay-atlas', GAMEPLAY_FRAME.victoryBurst)
      .setVisible(false);
    const visualRoot = this.add.container(0, 0, [aura, healthBackground, healthFill, body, rank]);
    const view = this.add.container(0, 0, [visualRoot]);
    view._aura = aura;
    view._body = body;
    view._healthBackground = healthBackground;
    view._healthFill = healthFill;
    view._healthKey = null;
    view._motion = null;
    view._rank = rank;
    view._visualRoot = visualRoot;
    return view;
  }

  releasePooledView(view) {
    this.cancelViewMotion(view);
    this.tweens?.killTweensOf?.(view);
    this.tweens?.killTweensOf?.(view?._visualRoot);
    stopBody(view);
  }

  createPools() {
    this.enemyPool = new ViewPool(() => preparePooledView(this.createCharacterView('enemy'), 5), {
      maximum: ENEMY_VIEW_CAPACITY,
      resetView: (view) => this.releasePooledView(view),
    });
    this.defenderPool = new ViewPool(() => preparePooledView(this.createDefenderView(), 4), {
      maximum: DEFENDER_VIEW_CAPACITY,
      resetView: (view) => this.releasePooledView(view),
    });
    this.defenderDefeatPool = new ViewPool(() => preparePooledView(this.createDefenderView(), 4.5), {
      maximum: ENEMY_VIEW_CAPACITY,
      resetView: (view) => this.releasePooledView(view),
    });
    this.projectilePool = new ViewPool(() => preparePooledView(this.add.image(
      0, 0, 'environment-gameplay-atlas', GAMEPLAY_FRAME.arrow,
    ), 7), { maximum: 640, resetView: (view) => this.releasePooledView(view) });
    this.defeatPool = new ViewPool(() => preparePooledView(this.createCharacterView('enemy'), 5.5), {
      maximum: ENEMY_VIEW_CAPACITY,
      resetView: (view) => this.releasePooledView(view),
    });
    this.damageLabelPool = new ViewPool(() => preparePooledView(this.add.text(0, 0, '', {
      color: '#fff9e8',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      stroke: '#173329',
      strokeThickness: 5,
    }).setOrigin(0.5), 9), {
      maximum: this.presentationLimits.damageLabelCap,
      resetView: (view) => this.releasePooledView(view),
    });
    this.particlePool = new ViewPool(() => preparePooledView(this.add.image(
      0, 0, 'environment-gameplay-atlas', GAMEPLAY_FRAME.healSparkle,
    ), 8), {
      maximum: this.presentationLimits.particleCap,
      resetView: (view) => this.releasePooledView(view),
    });
  }

  createProjectionLayers() {
    this.queuedEnemyHealthLayer = this.add.graphics().setDepth(3.7);
    this.activeEnemyHealthLayer = this.add.graphics().setDepth(6);
    this.enemyHealthLayer = this.activeEnemyHealthLayer;
  }

  bindDomInput() {
    const battlefield = globalThis.document?.getElementById('battlefield');
    if (!battlefield) return;
    this.battlefieldElement = battlefield;
    this.semanticGridMirror = createBattlefieldGridMirror({
      battlefield,
      cells: this.level.cells,
      documentRef: globalThis.document,
    });
    this.accessibleCellNodes = this.semanticGridMirror.cells;
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
      notice: 'Select a Road melee or Grass ranged defender, choose its matching square, then start the wave.',
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
    if (!getGridCell(this.level, this.focusedCellId)) this.focusedCellId = 'r0c0';
    this.updateFocusViews();
    if (active) this.announceFocusedTarget();
  }

  pointerToWorld(event, battlefield) {
    const canvas = battlefield.querySelector('canvas');
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    return resolveContainWorldPoint({
      bounds,
      clientX: event.clientX,
      clientY: event.clientY,
      worldHeight: WORLD_HEIGHT,
      worldWidth: WORLD_WIDTH,
    });
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
    const cellId = resolveCellFromWorldPoint(point);
    const cell = getGridCell(this.level, cellId);
    if (!cell) return;
    this.focusedCellId = cell.id;
    const tower = [...this.towerById.values()].find((entry) => entry.cellId === cell.id);
    if (tower) {
      this.selectTower(tower.id);
      return;
    }
    this.attemptBuildAtCell(cell);
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
        active: !(this.lastSnapshot.pauseReasons ?? []).includes('manual'),
      });
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown'
      || event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusedCellId = resolveGridFocusMove({
        cellId: this.focusedCellId,
        key: event.key,
      });
      this.updateFocusViews();
      this.announceFocusedTarget();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.confirmFocusedTarget();
    }
  }

  confirmFocusedTarget() {
    if (this.lastSnapshot?.terminal || this.terminalHandled) return;
    const cell = getGridCell(this.level, this.focusedCellId);
    if (!cell) return;
    const tower = [...this.towerById.values()].find((entry) => entry.cellId === cell.id);
    if (tower) this.selectTower(tower.id);
    else this.attemptBuildAtCell(cell);
  }

  isPlacementCompatible(cell) {
    const selectedLayer = DEFENDERS[this.selectedDefenderId]?.placementLayer ?? null;
    return Boolean(selectedLayer) && cell?.terrain === selectedLayer;
  }

  attemptBuildAtCell(cell) {
    const result = attemptPlacementBuild({
      announce: (message) => this.hud.announce(message),
      cell,
      issueCommand: (command) => this.issueBattleCommand(command),
      selectedDefenderId: this.selectedDefenderId,
      selectedLayer: DEFENDERS[this.selectedDefenderId]?.placementLayer ?? null,
    });
    if (!result.accepted) this.updateFocusViews();
    return result.accepted;
  }

  announceFocusedTarget() {
    const cell = getGridCell(this.level, this.focusedCellId);
    if (!cell) return;
    const tower = [...this.towerById.values()].find((entry) => entry.cellId === cell.id);
    const selected = DEFENDERS[this.selectedDefenderId];
    const visualState = this.cellViews?.get(cell.id)?._visualState
      ?? resolveCellVisualState({
        occupied: Boolean(tower),
        selectedLayer: selected?.placementLayer ?? null,
        terrain: cell.terrain,
      });
    const label = this.accessibleCellNodes?.get?.(cell.id)?.getAttribute?.('aria-label')
      ?? formatCellAccessibleLabel({
      acceptsBuild: visualState.acceptsBuild,
      cellId: cell.id,
      danger: visualState.danger,
      enemyCovered: visualState.enemyCovered,
      occupiedBy: tower ? DEFENDER_PRESENTATION[tower.defenderId].name : null,
      selectedRole: selected ? DEFENDER_PRESENTATION[selected.id].role : null,
      terrain: cell.terrain,
    });
    this.hud.announce(label);
  }

  selectDefender(defenderId) {
    if (!DEFENDERS[defenderId] || this.destroyed || this.lastSnapshot?.terminal) return;
    this.selectedDefenderId = defenderId;
    this.selectedTowerId = null;
    const layer = DEFENDERS[defenderId].placementLayer;
    const firstCompatible = this.level.cells.find((cell) => (
      cell.terrain === layer && ![...this.towerById.values()].some((tower) => tower.cellId === cell.id)
    ));
    if (firstCompatible) this.focusedCellId = firstCompatible.id;
    this.hud.announce(`${DEFENDER_PRESENTATION[defenderId].name} selected. ${resolvePlacementPrompt(layer)}.`);
    this.refreshProjection(true);
  }

  selectTower(towerId) {
    if (this.lastSnapshot?.terminal || this.terminalHandled) return;
    const tower = this.towerById.get(towerId);
    if (!tower) return;
    this.selectedTowerId = towerId;
    this.selectedDefenderId = null;
    this.focusedCellId = tower.cellId;
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
      const selectedLayer = DEFENDERS[command.defenderId ?? this.selectedDefenderId]?.placementLayer ?? null;
      this.hud.announce(resolveCommandRejectionMessage(result.reason, selectedLayer));
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
    if (reasons.length > 0) this.cancelAllPresentationMotion();
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
    this.recentDefenderPositions.clear();
    this.consumePresentationEvents(snapshot.presentationEvents);
    this.projectEnemies(snapshot);
    this.projectEnemyHealthBars(snapshot, forceHud);
    this.projectTowers(snapshot);
    this.projectCells(snapshot);
    this.projectProjectiles(snapshot);
    this.updateCastle(snapshot.castleHearts);
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

  finishViewMotion(view, motion, onComplete) {
    return finishTrackedMotion(view, motion, onComplete);
  }

  resolveSharedViewPosition(view) {
    return {
      x: (Number(view?.x) || 0) + (Number(view?._visualRoot?.x) || 0),
      y: (Number(view?.y) || 0) + (Number(view?._visualRoot?.y) || 0),
    };
  }

  recordProjectionDiagnostic(entry, reason) {
    this.projectionDiagnostics ??= [];
    this.projectionDiagnostics.push({ id: entry?.id ?? null, reason });
    if (this.projectionDiagnostics.length > 32) this.projectionDiagnostics.shift();
  }

  cancelViewMotion(view, { preservePose = false } = {}) {
    if (!view) return;
    const motion = view._motion;
    view._motion = null;
    motion?.stop?.();
    motion?.destroy?.();
    this.tweens?.killTweensOf?.(view);
    this.tweens?.killTweensOf?.(view._body);
    this.tweens?.killTweensOf?.(view._visualRoot);
    view._attackPoseReady = false;
    view._attackTargetTowerId = null;
    if (preservePose) return;
    view.setAlpha?.(1);
    view._visualRoot?.setPosition?.(0, 0);
    view._visualRoot?.setAngle?.(0);
    view._visualRoot?.setAlpha?.(1);
    view._body?.setPosition?.(0, 0);
    view._body?.setAngle?.(0);
    view._body?.setAlpha?.(1);
    view._body?.setTint?.(0xffffff);
    if (Number.isFinite(view._baseScale)) view._body?.setScale?.(view._baseScale);
  }

  cancelAllPresentationMotion() {
    this.tweens?.killAll?.();
    for (const pool of [this.enemyPool, this.defenderPool, this.defenderDefeatPool]) {
      for (const view of pool?.activeViews ?? []) this.cancelViewMotion(view);
    }
    for (const view of [...this.detachedDefenderViews]) {
      this.detachedDefenderViews.delete(view);
      this.defenderDefeatPool?.release(view);
    }
    clearPresentationTransients({
      cancelViewMotion: (view) => this.cancelViewMotion(view),
      pools: [this.defenderDefeatPool, this.defeatPool, this.damageLabelPool, this.particlePool],
      timers: this.transientTimers,
    });
    if (this.castleSprite?.frame?.name === 1) {
      this.castleSprite.setFrame(this.lastSnapshot.castleHearts <= 0
        ? 3 : this.lastSnapshot.castleHearts === 1 ? 2 : 0);
    }
  }

  beginEnemyAttackProjection(view, enemy, targetTowerId, impactAtTick) {
    const targetView = this.towerSprites.get(targetTowerId);
    if (!view?._body || !targetView) return;
    if (view._attackTargetTowerId === targetTowerId && (view._motion || view._attackPoseReady)) return;
    this.cancelViewMotion(view);
    const body = view._body;
    body.anims?.stop?.();
    body.setTint(0xffd27a);
    view._visualRoot?.setAngle?.(-3);
    const enemyPosition = this.resolveSharedViewPosition(view);
    const targetPosition = this.resolveSharedViewPosition(targetView);
    const motionState = resolveEnemyAttackMotion({
      bodyScale: view._baseScale ?? ENEMY_PRESENTATION[enemy.enemyId].displayScale,
      boss: BOSS_IDS.has(enemy.enemyId),
      currentTick: this.lastSnapshot.tick,
      enemyPosition,
      impactAtTick,
      reducedMotion: this.reducedMotion,
      targetPosition,
      timeScale: this.lastSnapshot.timeScale,
    });
    view._attackTargetTowerId = targetTowerId;
    view._attackPoseReady = motionState.totalMs === 0;
    if (motionState.totalMs === 0) return;

    let motion;
    motion = this.tweens.chain({
      targets: view._visualRoot,
      tweens: [
        {
          angle: -5,
          duration: motionState.windupMs,
          ease: 'Sine.easeOut',
          x: motionState.backX,
          y: motionState.backY,
        },
        {
          angle: 4,
          duration: motionState.lungeMs,
          ease: 'Cubic.easeIn',
          x: motionState.lungeX,
          y: motionState.lungeY,
        },
      ],
      onComplete: () => this.finishViewMotion(view, motion, () => {
        view._attackPoseReady = true;
      }),
    });
    view._motion = motion;
  }

  recoverEnemyAttack(view, enemyId) {
    if (!view?._body) return;
    this.cancelViewMotion(view, { preservePose: true });
    const body = view._body;
    body.setTint(0xfff0a3);
    let motion;
    motion = this.tweens.add({
      targets: view._visualRoot,
      angle: 0,
      duration: this.reducedMotion ? 90 : 180,
      ease: 'Cubic.easeOut',
      x: 0,
      y: 0,
      onComplete: () => this.finishViewMotion(view, motion, () => {
        body.setTint(0xffffff);
        const kind = BOSS_IDS.has(enemyId) ? 'boss' : 'enemy';
        const walk = animationKey(kind, enemyId, 'walk');
        if (view.active && this.anims.exists(walk)) body.play(walk, true);
      }),
    });
    view._motion = motion;
  }

  animateDefenderHit(payload) {
    const view = this.towerSprites.get(payload.towerId);
    if (!view?._body) return;
    const sourceView = this.enemySprites.get(payload.sourceId);
    const defenderPosition = this.resolveSharedViewPosition(view);
    const sourcePosition = sourceView ? this.resolveSharedViewPosition(sourceView) : null;
    const directionX = sourcePosition ? Math.sign(defenderPosition.x - sourcePosition.x) : 0;
    const directionY = sourcePosition ? Math.sign(defenderPosition.y - sourcePosition.y) : 1;
    this.recentDefenderPositions.set(payload.towerId, defenderPosition);
    this.cancelViewMotion(view);
    const body = view._body;
    body.setTint(0xff8b78);
    const hitMotion = resolveDefenderHitMotion({ directionX, directionY, reducedMotion: this.reducedMotion });
    let motion;
    motion = this.tweens.chain({
      targets: view._visualRoot,
      tweens: hitMotion.steps,
      onComplete: () => this.finishViewMotion(view, motion, () => body.setTint(0xffffff)),
    });
    view._motion = motion;
    this.spawnDamageLabel(defenderPosition, payload.damage);
    const name = DEFENDER_PRESENTATION[view._defenderId]?.name ?? 'Road defender';
    this.hud.announce(`${name} took ${payload.damage} damage. ${payload.remainingHealth} health remains.`);
  }

  animateDefenderDefeat(payload) {
    const view = this.towerSprites.get(payload.towerId);
    if (!view?._body) return;
    this.towerSprites.delete(payload.towerId);
    const position = this.resolveSharedViewPosition(view);
    const defenderId = view._defenderId;
    const bodyScale = view._baseScale ?? view._body.scale ?? 1;
    const textureKey = view._body.texture?.key
      ?? characterAssetId('defender', defenderId, 'idle');
    const frame = view._body.frame?.name ?? 0;
    this.recentDefenderPositions.set(payload.towerId, position);
    this.cancelViewMotion(view);
    const defeatView = this.defenderDefeatPool?.acquire?.() ?? null;
    this.defenderPool.release(view);
    this.spawnBurst(position, GAMEPLAY_FRAME.defeatCrack, 8, payload.towerId.length);
    this.audioController?.playCue?.('defeat');
    const name = DEFENDER_PRESENTATION[defenderId]?.name ?? 'Road defender';
    this.hud.announce(`${name} was permanently defeated. The road guard slot is available again.`);
    if (!defeatView) {
      this.recordProjectionDiagnostic({ id: payload.towerId }, 'defender-defeat-pool-exhausted');
      return;
    }
    defeatView.setPosition(position.x, position.y);
    defeatView._defenderId = defenderId;
    defeatView._baseScale = bodyScale;
    defeatView._body.setTexture(textureKey, frame).setScale(bodyScale);
    const fade = beginDefenderDefeatPresentation(defeatView, { reducedMotion: this.reducedMotion });
    this.detachedDefenderViews.add(defeatView);
    let motion;
    motion = this.tweens.add({
      targets: defeatView._visualRoot,
      ...fade,
      ease: 'Cubic.easeIn',
      onComplete: () => this.finishViewMotion(defeatView, motion, () => {
        this.detachedDefenderViews.delete(defeatView);
        this.defenderDefeatPool.release(defeatView);
      }),
    });
    defeatView._motion = motion;
  }

  handleEnemyAttackImpact(event, payload) {
    const view = this.enemySprites.get(payload.id);
    const activeTarget = this.towerSprites.get(payload.targetTowerId);
    const targetPosition = activeTarget
      ? this.resolveSharedViewPosition(activeTarget)
      : this.recentDefenderPositions.get(payload.targetTowerId);
    if (targetPosition) {
      this.spawnBurst(targetPosition, GAMEPLAY_FRAME.shieldBash, 4, event.id);
      this.spawnBurst(targetPosition, GAMEPLAY_FRAME.explosion, 3, event.id + 1);
    }
    this.recoverEnemyAttack(view, payload.enemyId);
    if (this.presentationLimits.cameraShake > 0) this.cameras.main.shake(90, 0.003);
    this.audioController?.playCue?.('impact');
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
      const laneEventHandled = dispatchLanePresentationEvent(event, {
        onDefenderDefeated: (lanePayload) => this.animateDefenderDefeat(lanePayload),
        onDefenderHit: (lanePayload) => this.animateDefenderHit(lanePayload),
        onEnemyAttackImpact: (lanePayload, laneEvent) => this.handleEnemyAttackImpact(laneEvent, lanePayload),
        onEnemyAttackStart: (lanePayload) => {
          const view = this.enemySprites.get(lanePayload.id);
          const enemy = this.enemyById.get(lanePayload.id);
          if (view && enemy) {
            this.beginEnemyAttackProjection(
              view,
              enemy,
              lanePayload.targetTowerId,
              lanePayload.impactAtTick,
            );
          }
        },
      });
      if (laneEventHandled) continue;
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
          const projection = tower && this.resolveTowerProjection(tower);
          if (projection) this.spawnBurst(projection.position, GAMEPLAY_FRAME.victoryBurst, 7, event.id);
        }
        this.audioController?.playCue?.(kind === 'tower-mastery' ? 'mastery' : 'attack');
      } else if (kind === 'enemy-hit') {
        const visual = this.resolveEnemyVisualTransform(payload);
        this.spawnDamageLabel(visual.position, payload.damage, visual);
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
        const visual = this.resolveEnemyVisualTransform(payload);
        this.spawnBurst(visual.position, GAMEPLAY_FRAME.explosion, 3, event.id, visual);
        this.audioController?.playCue?.('impact');
      } else if (kind === 'hexcaller-cast') {
        this.playCharacterAction(this.enemySprites.get(payload.enemyId), 'enemy', 'hexcaller', 'cast');
        const visual = this.resolveEnemyVisualTransform(payload);
        this.spawnBurst(visual.position, GAMEPLAY_FRAME.healSparkle, 6, event.id, visual);
      } else if (kind === 'ironhide-rally') {
        this.playCharacterAction(this.enemySprites.get(payload.bossId), 'boss', 'ironhide-warlord', 'ability');
        const visual = this.resolveEnemyVisualTransform(payload);
        this.spawnBurst(visual.position, GAMEPLAY_FRAME.shieldBash, 8, event.id, visual);
        this.audioController?.playCue?.('boss-ability');
      } else if (kind === 'boss-ability-warning') {
        const bossKind = BOSS_IDS.has(payload.enemyId) ? 'boss' : 'enemy';
        this.playCharacterAction(this.enemySprites.get(payload.bossId), bossKind, payload.enemyId, 'ability');
        this.audioController?.playCue?.('boss-warning');
      } else if (kind === 'boss-ability-impact') {
        const visual = this.resolveEnemyVisualTransform(payload);
        this.spawnBurst(visual.position, GAMEPLAY_FRAME.stunStars, 10, event.id, visual);
        if (this.presentationLimits.cameraShake > 0) {
          this.cameras.main.shake(180, this.presentationLimits.cameraShake);
        }
        this.audioController?.playCue?.('boss-ability');
      } else if (kind === 'ironhide-plate-break') {
        const boss = this.enemyById.get(payload.bossId);
        if (boss) {
          const visual = this.resolveEnemyVisualTransform(boss);
          this.spawnBurst(
            visual.position,
            GAMEPLAY_FRAME.defeatCrack,
            7,
            event.id,
            visual,
          );
        }
        this.audioController?.playCue?.('armor-break');
      } else if (kind === 'ironhide-vulnerable') {
        const boss = this.enemyById.get(payload.bossId);
        if (boss) {
          const visual = this.resolveEnemyVisualTransform(boss);
          this.spawnBurst(
            visual.position,
            GAMEPLAY_FRAME.slowRune,
            9,
            event.id,
            visual,
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
        if (boss) {
          const visual = this.resolveEnemyVisualTransform(boss);
          this.spawnBurst(visual.position, GAMEPLAY_FRAME.slowRune, 12, event.id, visual);
        }
        this.audioController?.playCue?.('boss-warning');
      } else if (kind === 'castle-impact') {
        this.castleSprite?.setFrame(1);
        const position = payload.position && Number.isFinite(payload.position.x)
          && Number.isFinite(payload.position.y)
          ? payload.position
          : cellCenter(this.level.roadCells.at(-1));
        this.spawnBurst(position, GAMEPLAY_FRAME.defeatCrack, 9, event.id);
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

  spawnDamageLabel(position, damage, visual = null) {
    const label = this.damageLabelPool.acquire();
    if (!label) return;
    const visualScale = visual?.artScale ?? 1;
    const labelMotion = resolveDamageLabelMotion({
      position,
      reducedMotion: this.reducedMotion,
      scale: visualScale,
    });
    label.setText(`−${damage}`);
    label.setPosition(labelMotion.startX, labelMotion.startY);
    label.setDepth?.(visual ? Math.max(visual.depth + 0.2, 3.8) : 9);
    label.setScale?.(visualScale);
    label.setAlpha(1);
    this.tweens.add({
      targets: label,
      x: labelMotion.endX,
      y: labelMotion.endY,
      alpha: 0,
      duration: labelMotion.duration,
      ease: 'Cubic.easeOut',
      onComplete: () => this.damageLabelPool.release(label),
    });
  }

  spawnBurst(position, frame, count, seed = 0, visual = null) {
    const visibleCount = Math.min(count, this.presentationLimits.particleCap);
    const visualScale = visual?.artScale ?? 1;
    for (let index = 0; index < visibleCount; index += 1) {
      const particle = this.particlePool.acquire();
      if (!particle) break;
      const burstMotion = resolveBurstMotion({
        index,
        position,
        reducedMotion: this.reducedMotion,
        scale: visualScale,
        seed,
      });
      particle.setFrame(frame).setPosition(burstMotion.startX, burstMotion.startY)
        .setDepth?.(visual ? visual.depth + 0.1 : 8);
      particle.setScale(0.12 * visualScale).setAlpha(0.95);
      this.tweens.add({
        targets: particle,
        x: burstMotion.endX,
        y: burstMotion.endY,
        alpha: 0,
        scale: 0.05 * visualScale,
        duration: burstMotion.duration,
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
    const visual = this.resolveEnemyVisualTransform(payload);
    view.setPosition(visual.position.x, visual.position.y).setDepth(visual.depth);
    view._accent.setVisible(false);
    view._body.setTexture(characterAssetId(kind, payload.enemyId, 'defeat'), 0)
      .setScale(visual.artScale);
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

  resolveEnemyVisualTransform(source = {}, { includeMotion = true } = {}) {
    const entityId = source.id ?? source.targetId ?? source.bossId
      ?? (this.enemyById?.has?.(source.enemyId) ? source.enemyId : null);
    const liveEnemy = entityId ? this.enemyById?.get?.(entityId) : null;
    const enemy = liveEnemy ? { ...liveEnemy, ...source } : source;
    const presentation = ENEMY_PRESENTATION[enemy.enemyId] ?? { displayScale: 1, kind: 'enemy' };
    const roadProjection = resolveEnemyRoadProjection(enemy, presentation);
    const frameHeight = presentation.kind === 'boss'
      ? this.metadata?.bosses?.frame?.height ?? 384
      : this.metadata?.enemies?.frame?.height ?? 256;
    const artScale = resolveReadableSpriteScale({
      authoredScale: presentation.displayScale,
      cssWorldScale: this.resolveCssWorldScale(),
      frameHeight,
      kind: presentation.kind,
      population: this.lastSnapshot?.enemies?.length ?? 1,
    });
    const projectedPosition = projectGridPathProgress(
      this.pathMetrics,
      roadProjection.pathProgress,
      roadProjection.laneOffset,
    );
    const liveView = entityId ? this.enemySprites?.get?.(entityId) : null;
    const position = includeMotion && liveView
      ? this.resolveSharedViewPosition(liveView)
      : projectedPosition;
    return Object.freeze({
      ...roadProjection,
      artScale,
      bodyScale: artScale,
      enemyId: enemy.enemyId ?? null,
      entityId,
      position: Object.freeze(position),
    });
  }

  resolveCssWorldScale() {
    const bounds = this.game?.canvas?.getBoundingClientRect?.();
    if (!(bounds?.width > 0) || !(bounds?.height > 0)) return 1;
    return Math.min(bounds.width / WORLD_WIDTH, bounds.height / WORLD_HEIGHT);
  }

  projectEnemies(snapshot) {
    const seen = new Set();
    const validEnemies = [];
    for (const enemy of snapshot.enemies ?? []) {
      if (!enemy?.id || seen.has(enemy.id) || !ENEMY_PRESENTATION[enemy.enemyId]) {
        this.recordProjectionDiagnostic(enemy, ENEMY_PRESENTATION[enemy?.enemyId]
          ? 'invalid-enemy' : 'unknown-enemy');
        continue;
      }
      seen.add(enemy.id);
      validEnemies.push(enemy);
    }
    syncProjectionMap(this.enemySprites, this.enemyPool, validEnemies, (view, enemy) => {
      const presentation = ENEMY_PRESENTATION[enemy.enemyId];
      const kind = presentation.kind;
      const visual = this.resolveEnemyVisualTransform(enemy, { includeMotion: false });
      const position = visual.position;
      const body = view._body;
      const characterKey = characterAssetId(kind, enemy.enemyId, 'walk');
      if (view._characterKey !== characterKey) {
        body.setTexture(characterKey, 0);
        view._enemyId = enemy.enemyId;
        if (this.anims.exists(animationKey(kind, enemy.enemyId, 'walk'))) {
          body.play(animationKey(kind, enemy.enemyId, 'walk'), true);
        }
        view._characterKey = characterKey;
        view._healthKey = null;
      }
      const displayScale = visual.bodyScale;
      body.setScale(displayScale);
      view._baseScale = displayScale;
      view.setDepth(visual.depth);
      view._visualTransform = visual;
      const accentFrameHeight = kind === 'boss'
        ? this.metadata?.bosses?.frame?.height ?? 384
        : this.metadata?.enemies?.frame?.height ?? 256;
      view._accent._baseY = -accentFrameHeight * 0.36;
      const flipX = view._lastX !== null && position.x < view._lastX - 0.15;
      if (flipX !== view._flipX) {
        body.setFlipX(flipX);
        view._flipX = flipX;
      }
      view._lastX = position.x;
      view.setPosition(position.x, position.y);
      const activeAttack = enemy.attackState?.targetTowerId !== null
        && enemy.attackState?.targetTowerId !== undefined;
      if (activeAttack) {
        this.beginEnemyAttackProjection(
          view,
          enemy,
          enemy.attackState.targetTowerId,
          enemy.attackState.impactAtTick,
        );
      } else if (view._attackTargetTowerId || view._attackPoseReady) {
        this.cancelViewMotion(view);
        if (this.anims.exists(animationKey(kind, enemy.enemyId, 'walk'))) {
          body.play(animationKey(kind, enemy.enemyId, 'walk'), true);
        }
      }
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
          plateViews.get(plate.id)?.setPosition(
            plate.x * visual.artScale,
            plate.y * visual.artScale,
          ).setScale(
            plateViews.get(plate.id)._baseScale * visual.artScale,
          ).setVisible(plate.visible);
        }
        view._accent.setFrame(GAMEPLAY_FRAME.slowRune)
          .setTint(0x58d5ff)
          .setPosition(view._accent._baseX * visual.artScale, view._accent._baseY * visual.artScale)
          .setScale(view._accent._baseScale * visual.artScale)
          .setVisible(plateState.vulnerabilityVisible);
      } else if (enemy.enemyId === 'dread-colossus') {
        for (const plate of view._plateAccents?.values?.() ?? []) plate.setVisible(false);
        const ratioPhase = ratio < 0.4 ? 3 : ratio < 0.75 ? 2 : 1;
        view._accent.setFrame(GAMEPLAY_FRAME.slowRune)
          .setTint([0xffffff, 0xa86bff, 0xff6b7a][ratioPhase - 1])
          .setPosition(view._accent._baseX * visual.artScale, view._accent._baseY * visual.artScale)
          .setScale(view._accent._baseScale * visual.artScale)
          .setVisible(true);
      } else {
        for (const plate of view._plateAccents?.values?.() ?? []) plate.setVisible(false);
        if (view._accent.visible) view._accent.setVisible(false);
      }
    }, (_id, view) => {
      this.cancelViewMotion(view);
      view._lastX = null;
    });
  }

  projectEnemyHealthBars(snapshot, force = false) {
    if (!this.activeEnemyHealthLayer || !this.queuedEnemyHealthLayer || (!force
      && snapshot.tick - this.lastHealthRenderTick < ENEMY_HEALTH_RENDER_INTERVAL_TICKS)) return;
    this.lastHealthRenderTick = snapshot.tick;
    this.activeEnemyHealthLayer.clear();
    this.queuedEnemyHealthLayer.clear();
    for (const enemy of snapshot.enemies) {
      const presentation = ENEMY_PRESENTATION[enemy.enemyId];
      if (!presentation || !this.enemySprites?.has?.(enemy.id)) continue;
      const kind = presentation.kind;
      const ratio = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));
      const showHealth = kind === 'boss' || ratio < 0.999;
      if (!showHealth) continue;
      const visual = this.resolveEnemyVisualTransform(enemy);
      const position = visual.position;
      const layer = visual.depth < 4 ? this.queuedEnemyHealthLayer : this.activeEnemyHealthLayer;
      const barY = position.y + ((kind === 'boss' ? -176 : -108) * visual.artScale);
      const barWidth = (kind === 'boss' ? 116 : 72) * visual.artScale;
      const barHeight = 10 * visual.artScale;
      const radius = 5 * visual.artScale;
      const barX = position.x - (barWidth / 2);
      layer.fillStyle(0x102f29, 0.85)
        .fillRoundedRect(barX, barY, barWidth, barHeight, radius);
      layer.fillStyle(kind === 'boss' ? 0xff6b61 : 0x8fe36a, 1)
        .fillRoundedRect(
          barX + (2 * visual.artScale),
          barY + (2 * visual.artScale),
          Math.max(visual.artScale, (barWidth - (4 * visual.artScale)) * ratio),
          6 * visual.artScale,
          3 * visual.artScale,
        );
    }
  }

  projectTowers(snapshot) {
    const seen = new Set();
    const validTowers = [];
    for (const tower of snapshot.towers ?? []) {
      const projection = this.resolveTowerProjection(tower);
      if (!projection) {
        this.recordProjectionDiagnostic(tower, 'invalid-cell');
        continue;
      }
      if (!tower?.id || seen.has(tower.id) || !DEFENDERS[tower.defenderId]
        || !DEFENDER_PRESENTATION[tower.defenderId]) {
        this.recordProjectionDiagnostic(tower, DEFENDERS[tower?.defenderId]
          ? 'invalid-defender' : 'unknown-defender');
        continue;
      }
      seen.add(tower.id);
      validTowers.push(tower);
    }
    syncProjectionMap(this.towerSprites, this.defenderPool, validTowers, (view, tower) => {
      const projection = this.resolveTowerProjection(tower);
      const { cell, position } = projection;
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
      view.setPosition(position.x, position.y);
      const bodyScale = resolveReadableSpriteScale({
        authoredScale: DEFENDER_PRESENTATION[tower.defenderId].displayScale * (1 + (tower.tier * 0.05)),
        cssWorldScale: this.resolveCssWorldScale(),
        frameHeight: this.defenderMetadata?.frame?.height ?? 256,
        kind: 'defender',
        population: snapshot.towers.length,
      });
      body.setScale(bodyScale);
      view._baseScale = bodyScale;
      view._defenderId = tower.defenderId;
      view._cellId = cell.id;
      view._aura.setTint(tint).setAlpha(tower.tier === 2 ? 0.46 : 0.28)
        .setScale((tower.tier === 2 ? 0.38 : 0.29) * bodyScale).setVisible(tower.tier > 0);
      view._rank.setTint(tint).setScale(0.18 * bodyScale).setVisible(tower.tier === 2);
      this.projectFrontlineHealth(view, tower, bodyScale);
    });
  }

  projectFrontlineHealth(view, tower, artScale = 1) {
    const health = resolveFrontlineHealthBar(tower);
    const healthKey = `${health.key}:${artScale.toFixed(6)}`;
    if (view._healthKey === healthKey) return;
    view._healthKey = healthKey;
    const background = view._healthBackground.clear().setVisible(health.visible);
    const fill = view._healthFill.clear().setVisible(health.visible);
    if (!health.visible) return;
    background.fillStyle(0x08221c, 0.94).fillRoundedRect(
      -38 * artScale, 7 * artScale, 76 * artScale, 11 * artScale, 5 * artScale,
    );
    fill.fillStyle(health.ratio <= 0.3 ? 0xff6b61 : 0x8fe36a, 1)
      .fillRoundedRect(
        -35 * artScale,
        10 * artScale,
        Math.max(2 * artScale, 70 * artScale * health.ratio),
        5 * artScale,
        2 * artScale,
      );
  }

  projectCells(snapshot) {
    const occupiedByCell = new Map((snapshot.towers ?? [])
      .filter((tower) => this.resolveTowerProjection(tower)
        && DEFENDERS[tower.defenderId] && DEFENDER_PRESENTATION[tower.defenderId])
      .map((tower) => [tower.cellId, tower]));
    const selectedLayer = DEFENDERS[this.selectedDefenderId]?.placementLayer ?? null;
    const selectedTower = this.towerById.get(this.selectedTowerId);
    const selectedDefinition = selectedTower ? DEFENDERS[selectedTower.defenderId] : null;
    const selectedRangeCells = selectedTower && selectedDefinition
      ? new Set(resolveSquareRangeCells({
        level: this.level,
        originCellId: selectedTower.cellId,
        range: selectedDefinition.range[selectedTower.tier],
        targetTerrain: 'road',
      }).map(({ cellId }) => cellId))
      : new Set();
    const dangerCells = new Set();
    for (const effect of snapshot.effects ?? []) {
      if (!effect.kind?.includes('telegraph')) continue;
      const source = this.enemyById.get(effect.sourceId);
      if (!source) continue;
      const sourcePosition = this.resolveEnemyVisualTransform(source).position;
      const originCellId = resolveCellFromWorldPoint(sourcePosition);
      for (const { cellId } of resolveSquareRangeCells({
        level: this.level,
        originCellId,
        range: Number(effect.radius) || GRID.cellSize,
      })) dangerCells.add(cellId);
    }
    for (const cell of this.level.cells) {
      const view = this.cellViews.get(cell.id);
      const occupiedTower = occupiedByCell.get(cell.id) ?? null;
      const buildState = selectedLayer ? evaluateCellBuild({
        cellId: cell.id,
        defender: DEFENDERS[this.selectedDefenderId],
        enemies: snapshot.enemies,
        level: this.level,
        towers: snapshot.towers,
      }) : null;
      const state = resolveCellVisualState({
        danger: dangerCells.has(cell.id),
        enemyCovered: buildState?.reason === 'enemy-occupied',
        focused: this.battlefieldHasFocus && cell.id === this.focusedCellId,
        inRange: selectedRangeCells.has(cell.id),
        masteryCovered: selectedTower?.tier === 2 && selectedRangeCells.has(cell.id),
        occupied: Boolean(occupiedTower),
        selectedLayer,
        terrain: cell.terrain,
      });
      view._visualState = state;
      this.drawCellView(view, state);
      const accessibleNode = this.accessibleCellNodes?.get?.(cell.id);
      if (accessibleNode) {
        accessibleNode.setAttribute('aria-label', formatCellAccessibleLabel({
          acceptsBuild: state.acceptsBuild,
          cellId: cell.id,
          danger: state.danger,
          enemyCovered: state.enemyCovered,
          occupiedBy: occupiedTower
            ? DEFENDER_PRESENTATION[occupiedTower.defenderId]?.name ?? 'defender'
            : null,
          selectedRole: this.selectedDefenderId
            ? DEFENDER_PRESENTATION[this.selectedDefenderId]?.role ?? null
            : null,
          terrain: cell.terrain,
        }));
        accessibleNode.setAttribute('aria-selected', String(cell.id === this.focusedCellId));
        accessibleNode.setAttribute('aria-disabled', String(Boolean(selectedLayer) && !state.acceptsBuild));
      }
    }
    this.battlefieldElement?.setAttribute?.(
      'aria-activedescendant',
      `battlefield-cell-${this.focusedCellId}`,
    );
  }

  projectProjectiles(snapshot) {
    syncProjectionMap(this.projectileSprites, this.projectilePool, snapshot.projectiles, (view, projectile) => {
      const tower = this.towerById.get(projectile.sourceTowerId);
      const defenderId = tower?.defenderId
        ?? this.defenderIdByTowerId?.get?.(projectile.sourceTowerId)
        ?? 'ranger';
      const sourceView = this.towerSprites?.get?.(projectile.sourceTowerId);
      const sourceProjection = tower ? this.resolveTowerProjection(tower) : null;
      const sourcePosition = sourceView
        ? this.resolveSharedViewPosition(sourceView)
        : sourceProjection?.position ?? projectile.launchPosition;
      const sourceArtScale = this.towerSprites?.get?.(projectile.sourceTowerId)?._baseScale
        ?? DEFENDER_PRESENTATION[defenderId]?.displayScale
        ?? 1;
      const launchPosition = {
        x: sourcePosition.x,
        y: sourcePosition.y - (42 * sourceArtScale),
      };
      const target = this.enemyById.get(projectile.targetId);
      const targetVisual = target
        ? this.resolveEnemyVisualTransform(target)
        : this.resolveEnemyVisualTransform({
          enemyId: projectile.targetEnemyIdAtLaunch,
          id: projectile.targetId,
          pathProgress: projectile.targetPathProgressAtLaunch,
          displayPathProgress: projectile.targetDisplayPathProgressAtLaunch
            ?? projectile.targetPathProgressAtLaunch,
          displayLaneOffset: projectile.targetDisplayLaneOffsetAtLaunch ?? 0,
          displayScale: projectile.targetDisplayScaleAtLaunch ?? 1,
          laneState: projectile.targetLaneStateAtLaunch ?? 'moving',
          queueIndex: projectile.targetQueueIndexAtLaunch ?? null,
        });
      const targetPosition = targetVisual.position;
      const duration = Math.max(1, projectile.impactTick - projectile.launchTick);
      const progress = Math.max(0, Math.min(1, (snapshot.tick - projectile.launchTick) / duration));
      const frame = DEFENDER_PRESENTATION[defenderId]?.projectileFrame ?? GAMEPLAY_FRAME.arrow;
      const targetBodyPosition = {
        x: targetPosition.x,
        y: targetPosition.y - (32 * targetVisual.artScale),
      };
      const x = Phaser.Math.Linear(launchPosition.x, targetBodyPosition.x, progress);
      const y = Phaser.Math.Linear(
        launchPosition.y,
        targetBodyPosition.y,
        progress,
      );
      view.setFrame(frame).setPosition(x, y).setVisible(true)
        .setDepth(targetVisual.depth + 0.2)
        .setScale((frame === GAMEPLAY_FRAME.arrow ? 0.14 : 0.17) * targetVisual.artScale);
      view.setRotation(Math.atan2(
        targetBodyPosition.y - launchPosition.y,
        targetBodyPosition.x - launchPosition.x,
      ));
    });
  }

  updateCastle(hearts) {
    if (!this.castleSprite || this.castleSprite.frame.name === 1) return;
    this.castleSprite.setFrame(hearts <= 0 ? 3 : hearts === 1 ? 2 : 0);
  }

  updateBetweenWaveCountdown(snapshot) {
    this.betweenWaveCountdown = resolveBetweenWaveCountdown(snapshot, WAVE_GAP_TICKS);
  }

  exerciseMalformedProjection() {
    if (!this.qaMode || !this.lastSnapshot) return null;
    this.projectionDiagnostics = [];
    const towerSnapshot = {
      ...this.lastSnapshot,
      towers: [
        { id: 'qa-invalid-cell', defenderId: 'ranger', cellId: 'r99c99' },
        { id: 'qa-unknown-defender', defenderId: 'qa-unknown', cellId: 'r0c0' },
        ...(this.lastSnapshot.towers ?? []),
      ],
    };
    const enemySnapshot = {
      ...this.lastSnapshot,
      enemies: [
        { id: 'qa-unknown-enemy', enemyId: 'qa-unknown' },
        ...(this.lastSnapshot.enemies ?? []),
      ],
    };
    this.projectTowers(towerSnapshot);
    this.projectEnemies(enemySnapshot);
    const result = {
      diagnostics: this.projectionDiagnostics.map((entry) => ({ ...entry })),
      projectedEnemies: this.enemySprites.size,
      projectedTowers: this.towerSprites.size,
    };
    this.projectTowers(this.lastSnapshot);
    this.projectEnemies(this.lastSnapshot);
    return result;
  }

  updateFocusViews() {
    if (this.lastSnapshot && this.cellViews) this.projectCells(this.lastSnapshot);
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
      this.spawnBurst(
        projectGridPathProgress(this.pathMetrics, this.pathMetrics.total),
        GAMEPLAY_FRAME.victoryBurst,
        16,
        this.lastSnapshot.tick,
      );
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
        defenderDefeats: this.defenderDefeatPool?.getState() ?? null,
        defeats: this.defeatPool?.getState() ?? null,
        defenders: this.defenderPool?.getState() ?? null,
        enemies: this.enemyPool?.getState() ?? null,
        particles: this.particlePool?.getState() ?? null,
        projectiles: this.projectilePool?.getState() ?? null,
      },
      projectionDiagnostics: (this.projectionDiagnostics ?? []).map((entry) => ({ ...entry })),
      reducedMotion: this.reducedMotion,
      sampleCount: this.frameSamples.length,
    };
  }

  getPresentationState() {
    return {
      cells: [...(this.cellViews ?? [])].map(([id, view]) => ({
        acceptsBuild: Boolean(view._visualState?.acceptsBuild),
        borderColor: view._visualState?.borderColor ?? null,
        fillColor: view._visualState?.fillColor ?? null,
        compatible: view._visualState?.compatible ?? null,
        danger: Boolean(view._visualState?.danger),
        enemyCovered: Boolean(view._visualState?.enemyCovered),
        focused: Boolean(view._visualState?.focused),
        id,
        occupied: Boolean(view._visualState?.occupied),
        terrain: view._terrain,
      })),
      enemies: [...this.enemySprites].map(([id, view]) => {
        const enemy = this.enemyById.get(id);
        const roadProjection = resolveEnemyRoadProjection(
          enemy,
          ENEMY_PRESENTATION[enemy?.enemyId],
        );
        const position = this.resolveSharedViewPosition(view);
        return {
          accentVisible: Boolean(view._accent?.visible),
          attackTargetTowerId: view._attackTargetTowerId,
          blockingTowerId: enemy?.blockingTowerId ?? null,
          depth: view.depth,
          footprintWidth: roadProjection.footprintWidth,
          id,
          laneOffset: roadProjection.laneOffset,
          laneState: enemy?.laneState ?? null,
          motionOffset: {
            x: Number(view._visualRoot?.x) || 0,
            y: Number(view._visualRoot?.y) || 0,
          },
          plateAccents: [...(view._plateAccents?.entries?.() ?? [])].map(([plateId, plate]) => ({
            id: plateId,
            visible: Boolean(plate.visible),
            x: plate.x,
            y: plate.y,
          })),
          queueIndex: enemy?.queueIndex ?? null,
          artScale: view._visualTransform?.artScale ?? null,
          scale: roadProjection.scale,
          x: position.x,
          y: position.y,
        };
      }),
      roadTiles: [...(this.roadTileViews ?? [])].map(([id, view]) => ({
        height: view.displayHeight,
        id,
        width: view.displayWidth,
      })),
      tick: this.lastSnapshot?.tick ?? 0,
      towers: [...this.towerSprites].map(([id, view]) => {
        const body = view._body;
        const position = this.resolveSharedViewPosition(view);
        return {
          animationKey: body.anims?.currentAnim?.key ?? null,
          frame: body.anims?.currentFrame?.textureFrame ?? body.frame?.name ?? null,
          healthKey: view._healthKey,
          id,
          isPlaying: Boolean(body.anims?.isPlaying),
          cellId: view._cellId,
          motionOffset: {
            x: Number(view._visualRoot?.x) || 0,
            y: Number(view._visualRoot?.y) || 0,
          },
          scale: body.scale,
          textureKey: body.texture?.key ?? null,
          x: position.x,
          y: position.y,
        };
      }),
    };
  }

  getTextSnapshot() {
    if (!this.lastSnapshot) return null;
    const snapshot = summarizeSimulation(this.simulation);
    const presentation = this.getPresentationState();
    return {
      battlefield: {
        cells: presentation.cells,
        enemies: presentation.enemies,
        roadTiles: presentation.roadTiles,
        towers: presentation.towers,
      },
      battleStarted: this.battleStarted,
      betweenWaveCountdown: this.betweenWaveCountdown,
      castleHearts: snapshot.castleHearts,
      coins: snapshot.coins,
      countdownRemaining: this.countdownActive ? this.countdownRemaining : 0,
      effects: snapshot.effects.map(({ id, kind, sourceId, targetId }) => ({ id, kind, sourceId, targetId })),
      enemies: snapshot.enemies.map(({ id, enemyId, health, maxHealth, pathProgress, attackState,
        laneState, blockingTowerId, queueIndex, laneOffset,
        displayPathProgress, displayLaneOffset, displayScale }) => ({
        attackState: { ...attackState },
        blockingTowerId,
        displayLaneOffset,
        displayPathProgress: Number(displayPathProgress.toFixed(3)),
        displayScale,
        enemyId,
        health,
        id,
        laneOffset,
        laneState,
        maxHealth,
        pathProgress: Number(pathProgress.toFixed(3)),
        queueIndex,
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
    this.cancelAllPresentationMotion();
    this.events.off(Phaser.Scenes.Events.RESUME, this.handleResume, this);
    this.domCleanups.splice(0).forEach((remove) => remove());
    this.hud.dismissLevelIntro?.({ restoreFocus: false });
    this.disconnectHud?.();
    this.disconnectHud = null;
    this.resultTimer?.remove?.(false);
    clearPresentationEvents(this.simulation);
    for (const pool of [
      this.enemyPool,
      this.defenderPool,
      this.defenderDefeatPool,
      this.projectilePool,
      this.defeatPool,
      this.damageLabelPool,
      this.particlePool,
    ]) pool?.destroy();
    this.enemySprites.clear();
    this.towerSprites.clear();
    this.projectileSprites.clear();
    this.enemyById.clear();
    this.towerById.clear();
    this.defenderIdByTowerId.clear();
    this.recentDefenderPositions.clear();
    this.detachedDefenderViews.clear();
    this.semanticGridMirror?.destroy?.();
    this.semanticGridMirror = null;
    this.accessibleCellNodes = null;
    this.battlefieldElement = null;
    for (const view of this.cellViews?.values?.() ?? []) view.destroy?.();
    this.cellViews?.clear?.();
    this.roadTileViews?.clear?.();
    this.castleSprite?.destroy();
    this.terrain?.destroy();
    for (const view of this.staticViews ?? []) view.destroy?.();
    this.clock?.reset();
  }
}
