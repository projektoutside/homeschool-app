import Phaser from 'phaser';
import { DEFENDERS } from '../config/defenders.js';
import { getLevel } from '../config/levels.js';
import {
  advanceSimulation,
  createSimulation,
  issueCommand,
  summarizeSimulation,
} from '../core/simulation.js';
import { createFixedStepClock } from '../ui/hud-controller.js';

const WORLD_WIDTH = 720;
const PATH_X_SCALE = WORLD_WIDTH / 640;
const PATH_Y_OFFSET = 110;
const PATH_Y_SCALE = 1.45;
const POINTER_HIT_RADIUS = 48;
const KEYBOARD_DEFENDERS = Object.freeze(Object.keys(DEFENDERS));
const DEBUG_TEXTURE_NAMES = Object.freeze([
  'enemy',
  'tower',
  'projectile',
  'telegraph',
  'particle',
]);
let nextDebugTextureSet = 1;

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
  const progress = Math.min(metrics.total, Math.max(0, pathProgress));
  const segment = metrics.segments.find((entry) => progress <= entry.offset + entry.length)
    ?? metrics.segments.at(-1);
  const ratio = segment.length === 0 ? 1 : (progress - segment.offset) / segment.length;
  return toWorldPoint({
    x: segment.start.x + ((segment.end.x - segment.start.x) * ratio),
    y: segment.start.y + ((segment.end.y - segment.start.y) * ratio),
  });
};

class ViewPool {
  constructor(createView) {
    this.available = [];
    this.createView = createView;
    this.views = new Set();
  }

  acquire() {
    const view = this.available.pop() ?? this.createView();
    this.views.add(view);
    view.setActive?.(true);
    view.setVisible?.(true);
    view.setAlpha?.(1);
    return view;
  }

  release(view) {
    if (!view || !this.views.has(view) || this.available.includes(view)) return;
    view.setActive?.(false);
    view.setVisible?.(false);
    this.available.push(view);
  }

  destroy() {
    for (const view of this.views) view.destroy?.();
    this.available.length = 0;
    this.views.clear();
  }
}

const syncProjectionMap = (projectionMap, pool, entries, applyProjection, onRelease) => {
  const activeIds = new Set(entries.map((entry) => entry.id));
  for (const [id, view] of projectionMap) {
    if (activeIds.has(id)) continue;
    onRelease?.(id, view);
    pool.release(view);
    projectionMap.delete(id);
  }
  for (const entry of entries) {
    let view = projectionMap.get(entry.id);
    if (!view) {
      view = pool.acquire();
      projectionMap.set(entry.id, view);
    }
    applyProjection(view, entry);
  }
};

const defenderTint = (defenderId) => ({
  bladeguard: 0xf6d77b,
  ranger: 0x91c56c,
  ironwarden: 0xb8c8d8,
  'rune-artificer': 0xb891e6,
}[defenderId] ?? 0xffffff);

const enemyTint = (enemyId) => ({
  skitter: 0xe6b66f,
  swarmkin: 0x9fd66f,
  shellguard: 0xa9a6a0,
  hexcaller: 0xb891e6,
  crusher: 0xc4775b,
  'mossback-brute': 0x6fa05b,
  'ironhide-warlord': 0x8b7768,
  'dread-colossus': 0x72475f,
}[enemyId] ?? 0xd98468);

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
    this.qaMode = Boolean(this.hostBridge?.getState?.().qaMode);
    this.simulation = createSimulation(this.level.id, { qa: this.qaMode });
    this.pathMetrics = createPathMetrics(this.level.path);
    this.selectedDefenderId = null;
    this.selectedTowerId = null;
    this.focusIndex = 0;
    this.lastSnapshot = summarizeSimulation(this.simulation);
    this.terminalHandled = false;
    this.destroyed = false;
    this.domCleanups = [];
    this.transientDamageLabels = [];
    this.transientParticles = [];
    this.previousEnemyHealth = new Map();
    this.enemySprites = new Map();
    this.towerSprites = new Map();
    this.projectileSprites = new Map();
    this.telegraphSprites = new Map();
    this.clock = createFixedStepClock({
      advanceSteps: (steps) => advanceSimulation(this.simulation, steps),
      getSpeed: () => this.lastSnapshot.timeScale,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume, this);
    this.scale.refresh();

    if (!this.qaMode) {
      this.hud.showBattle(this.lastSnapshot, {
        interactive: false,
        notice: 'Battle artwork is required before this level can start.',
      });
      return;
    }

    this.createDebugTextures();
    this.createDebugMap();
    this.createPools();
    this.createFocusViews();
    this.bindDomInput();
    this.disconnectHud = this.hud.connectBattle({
      issueCommand: (command) => this.issueBattleCommand(command),
      selectDefender: (defenderId) => this.selectDefender(defenderId),
    });
    this.hud.showBattle(this.lastSnapshot, { interactive: true });
    this.refreshProjection();
    this.hud.announce(`${this.level.name}. Select a defender, then choose an open pad.`);
  }

  createDebugTextures() {
    this.debugTexturePrefix = `dc-qa-${nextDebugTextureSet++}`;
    this.debugTextureKeys = Object.fromEntries(DEBUG_TEXTURE_NAMES.map((name) => [
      name,
      `${this.debugTexturePrefix}-${name}`,
    ]));
    const graphics = this.make.graphics({ add: false });

    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(24, 24, 20);
    graphics.lineStyle(4, 0x173329, 1);
    graphics.strokeCircle(24, 24, 20);
    graphics.generateTexture(this.debugTextureKeys.enemy, 48, 48);
    graphics.clear();

    graphics.fillStyle(0xffffff, 1);
    graphics.fillRoundedRect(4, 4, 48, 48, 12);
    graphics.lineStyle(4, 0x173329, 1);
    graphics.strokeRoundedRect(4, 4, 48, 48, 12);
    graphics.generateTexture(this.debugTextureKeys.tower, 56, 56);
    graphics.clear();

    graphics.fillStyle(0xf6d77b, 1);
    graphics.fillCircle(7, 7, 6);
    graphics.generateTexture(this.debugTextureKeys.projectile, 14, 14);
    graphics.clear();

    graphics.lineStyle(6, 0xffc857, 0.9);
    graphics.strokeCircle(62, 62, 56);
    graphics.generateTexture(this.debugTextureKeys.telegraph, 124, 124);
    graphics.clear();

    graphics.fillStyle(0xfff0a6, 1);
    graphics.fillCircle(5, 5, 5);
    graphics.generateTexture(this.debugTextureKeys.particle, 10, 10);
    graphics.destroy();
  }

  createDebugMap() {
    this.mapView = this.add.graphics();
    this.mapView.lineStyle(34, 0xd7c38b, 0.72);
    this.mapView.beginPath();
    this.level.path.forEach((point, index) => {
      const projected = toWorldPoint(point);
      if (index === 0) this.mapView.moveTo(projected.x, projected.y);
      else this.mapView.lineTo(projected.x, projected.y);
    });
    this.mapView.strokePath();

    for (const pad of this.level.pads) {
      const projected = toWorldPoint(pad);
      this.mapView.fillStyle(0x173f35, 0.92);
      this.mapView.fillCircle(projected.x, projected.y, 31);
      this.mapView.lineStyle(5, 0xf6d77b, 0.76);
      this.mapView.strokeCircle(projected.x, projected.y, 31);
    }

    this.mapView.fillStyle(0xf6ebca, 0.95);
    this.mapView.fillRoundedRect(570, 82, 104, 112, 18);
    this.mapView.lineStyle(6, 0xd7a63d, 0.95);
    this.mapView.strokeRoundedRect(570, 82, 104, 112, 18);
  }

  createPools() {
    this.enemyPool = new ViewPool(() => this.add.image(0, 0, this.debugTextureKeys.enemy).setDepth(4));
    this.towerPool = new ViewPool(() => this.add.image(0, 0, this.debugTextureKeys.tower).setDepth(3));
    this.projectilePool = new ViewPool(() => this.add.image(0, 0, this.debugTextureKeys.projectile).setDepth(6));
    this.telegraphPool = new ViewPool(() => this.add.image(0, 0, this.debugTextureKeys.telegraph).setDepth(2));
    this.damageLabelPool = new ViewPool(() => this.add.text(0, 0, '', {
      color: '#fff9e8',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      stroke: '#173329',
      strokeThickness: 5,
    }).setDepth(8).setOrigin(0.5));
    this.particlePool = new ViewPool(() => this.add.image(0, 0, this.debugTextureKeys.particle).setDepth(7));
  }

  createFocusViews() {
    this.focusRing = this.add.graphics().setDepth(9);
    this.rangeRing = this.add.graphics().setDepth(1);
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
  }

  pointerToWorld(event, battlefield) {
    const bounds = battlefield.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * WORLD_WIDTH,
      y: ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 960,
    };
  }

  handlePointerDown(event, battlefield) {
    event.preventDefault();
    battlefield.focus();
    try {
      battlefield.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can be unavailable for synthetic or already-ended pointers.
    }
    const point = this.pointerToWorld(event, battlefield);
    const pad = this.level.pads.find((candidate) => (
      distanceSquared(point, toWorldPoint(candidate)) <= POINTER_HIT_RADIUS ** 2
    ));
    if (!pad) return;
    this.focusIndex = this.level.pads.indexOf(pad);
    const tower = this.lastSnapshot.towers.find((entry) => entry.padId === pad.id);
    if (tower) {
      this.selectTower(tower.id);
      return;
    }
    if (this.selectedDefenderId) {
      this.issueBattleCommand({
        type: 'build',
        defenderId: this.selectedDefenderId,
        padId: pad.id,
      });
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
    if (event.key === 'Tab' || event.key === 'ArrowRight' || event.key === 'ArrowDown'
      || event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.shiftKey || event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      this.focusIndex = (this.focusIndex + direction + this.level.pads.length) % this.level.pads.length;
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
    const pad = this.level.pads[this.focusIndex];
    const tower = this.lastSnapshot.towers.find((entry) => entry.padId === pad.id);
    if (tower) {
      this.selectTower(tower.id);
    } else if (this.selectedDefenderId) {
      this.issueBattleCommand({
        type: 'build',
        defenderId: this.selectedDefenderId,
        padId: pad.id,
      });
    } else {
      this.hud.announce('Open build pad. Select defender 1 through 4 first.');
    }
  }

  announceFocusedTarget() {
    const pad = this.level.pads[this.focusIndex];
    const tower = this.lastSnapshot.towers.find((entry) => entry.padId === pad.id);
    this.hud.announce(tower
      ? `${DEFENDERS[tower.defenderId].id}, tier ${tower.tier + 1}. Press Enter to inspect.`
      : `Open build pad ${this.focusIndex + 1}. Press Enter to build.`);
  }

  selectDefender(defenderId) {
    if (!DEFENDERS[defenderId]) return;
    this.selectedDefenderId = defenderId;
    this.selectedTowerId = null;
    this.hud.announce(`${defenderId} selected. Choose an open build pad.`);
    this.refreshProjection();
  }

  selectTower(towerId) {
    if (!this.lastSnapshot.towers.some((tower) => tower.id === towerId)) return;
    this.selectedTowerId = towerId;
    this.selectedDefenderId = null;
    const tower = this.lastSnapshot.towers.find((entry) => entry.id === towerId);
    this.focusIndex = this.level.pads.findIndex((pad) => pad.id === tower.padId);
    this.hud.announce(`${tower.defenderId}, tier ${tower.tier + 1}, selected.`);
    this.refreshProjection();
  }

  issueBattleCommand(command) {
    if (this.destroyed || !this.qaMode) return { accepted: false, reason: 'battle-unavailable' };
    const result = issueCommand(this.simulation, command);
    if (!result.accepted) {
      this.hud.announce(`Command not accepted: ${result.reason}.`);
      return result;
    }
    if (command.type === 'sell' && command.towerId === this.selectedTowerId) this.selectedTowerId = null;
    this.lastSnapshot = summarizeSimulation(this.simulation);
    this.refreshProjection();
    if (command.type === 'set-pause-reason' && command.reason === 'manual') {
      this.hostBridge?.setManualPaused?.(command.active);
    }
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
      issueCommand(this.simulation, {
        type: 'set-pause-reason',
        reason,
        active: reasons.includes(reason),
      });
    }
    this.lastSnapshot = summarizeSimulation(this.simulation);
    if (this.qaMode) this.refreshProjection();
  }

  handleResume() {
    this.clock?.reset();
    if (this.simulation) {
      this.lastSnapshot = summarizeSimulation(this.simulation);
      if (this.qaMode) this.refreshProjection();
    }
  }

  update(_time, delta) {
    if (!this.qaMode || this.destroyed || this.terminalHandled) return;
    const advanced = this.clock.advanceFrame(delta);
    if (advanced > 0) {
      this.lastSnapshot = summarizeSimulation(this.simulation);
      this.refreshProjection();
      this.handleTerminalState();
    }
  }

  advanceTime(milliseconds) {
    if (!this.qaMode || this.destroyed || this.terminalHandled) return this.getTextSnapshot();
    const advanced = this.clock.advanceExact(milliseconds);
    if (advanced > 0) {
      this.lastSnapshot = summarizeSimulation(this.simulation);
      this.refreshProjection();
      this.handleTerminalState();
    }
    return this.getTextSnapshot();
  }

  refreshProjection() {
    const snapshot = this.lastSnapshot;
    this.projectEnemies(snapshot);
    this.projectTowers(snapshot);
    this.projectProjectiles(snapshot);
    this.projectTelegraphs(snapshot);
    this.projectTransients(snapshot.tick);
    this.updateFocusViews();
    this.hud.renderBattle(snapshot, {
      interactive: true,
      selectedDefenderId: this.selectedDefenderId,
      selectedTowerId: this.selectedTowerId,
    });
  }

  projectEnemies(snapshot) {
    syncProjectionMap(
      this.enemySprites,
      this.enemyPool,
      snapshot.enemies,
      (view, enemy) => {
        const position = projectPathProgress(this.pathMetrics, enemy.pathProgress);
        const previousHealth = this.previousEnemyHealth.get(enemy.id);
        view.setPosition(position.x, position.y);
        view.setTint(enemyTint(enemy.enemyId));
        view.setScale(enemy.enemyId.includes('brute') || enemy.enemyId.includes('warlord')
          || enemy.enemyId.includes('colossus') ? 1.35 : 1);
        if (previousHealth !== undefined && previousHealth > enemy.health) {
          const label = this.damageLabelPool.acquire();
          label.setText(`-${previousHealth - enemy.health}`);
          label.setPosition(position.x, position.y - 34);
          this.transientDamageLabels.push({ expiresAtTick: snapshot.tick + 30, view: label });
        }
        this.previousEnemyHealth.set(enemy.id, enemy.health);
      },
      (id, view) => {
        this.previousEnemyHealth.delete(id);
        const particle = this.particlePool.acquire();
        particle.setPosition(view.x, view.y);
        this.transientParticles.push({ expiresAtTick: snapshot.tick + 24, view: particle });
      },
    );
  }

  projectTowers(snapshot) {
    syncProjectionMap(this.towerSprites, this.towerPool, snapshot.towers, (view, tower) => {
      const pad = this.level.pads.find((entry) => entry.id === tower.padId);
      const position = toWorldPoint(pad);
      view.setPosition(position.x, position.y);
      view.setTint(defenderTint(tower.defenderId));
      view.setScale(1 + (tower.tier * 0.12));
    });
  }

  projectProjectiles(snapshot) {
    syncProjectionMap(this.projectileSprites, this.projectilePool, snapshot.projectiles, (view, projectile) => {
      const source = snapshot.towers.find((tower) => tower.id === projectile.sourceTowerId);
      const target = snapshot.enemies.find((enemy) => enemy.id === projectile.targetId);
      if (!source || !target) {
        view.setVisible(false);
        return;
      }
      const sourcePosition = toWorldPoint(this.level.pads.find((pad) => pad.id === source.padId));
      const targetPosition = projectPathProgress(this.pathMetrics, target.pathProgress);
      view.setVisible(true);
      view.setPosition(
        (sourcePosition.x + targetPosition.x) / 2,
        (sourcePosition.y + targetPosition.y) / 2,
      );
    });
  }

  projectTelegraphs(snapshot) {
    const telegraphs = snapshot.effects.filter((effect) => effect.kind.includes('telegraph'));
    syncProjectionMap(this.telegraphSprites, this.telegraphPool, telegraphs, (view, effect) => {
      const source = snapshot.enemies.find((enemy) => enemy.id === effect.sourceId);
      if (!source) {
        view.setVisible(false);
        return;
      }
      const position = projectPathProgress(this.pathMetrics, source.pathProgress);
      view.setVisible(true);
      view.setPosition(position.x, position.y);
      view.setAlpha(0.72);
    });
  }

  projectTransients(tick) {
    const retain = (entries, pool) => entries.filter((entry) => {
      if (entry.expiresAtTick > tick) {
        const progress = Math.max(0, (entry.expiresAtTick - tick) / 30);
        entry.view.setAlpha(Math.min(1, progress));
        return true;
      }
      pool.release(entry.view);
      return false;
    });
    this.transientDamageLabels = retain(this.transientDamageLabels, this.damageLabelPool);
    this.transientParticles = retain(this.transientParticles, this.particlePool);
  }

  updateFocusViews() {
    if (!this.focusRing || !this.rangeRing) return;
    const pad = this.level.pads[this.focusIndex];
    const position = toWorldPoint(pad);
    const tower = this.lastSnapshot.towers.find((entry) => entry.padId === pad.id);
    this.focusRing.clear();
    this.focusRing.lineStyle(6, 0xffffff, 1);
    this.focusRing.strokeCircle(position.x, position.y, 39);
    this.rangeRing.clear();
    if (tower) {
      const range = DEFENDERS[tower.defenderId].range[tower.tier] * PATH_X_SCALE;
      this.rangeRing.lineStyle(4, 0xf6d77b, 0.48);
      this.rangeRing.strokeCircle(position.x, position.y, range);
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
    }
    this.scene.start('ResultScene', {
      summary: victory
        ? `${this.lastSnapshot.medal} medal · ${this.lastSnapshot.score} points`
        : `Wave ${Math.max(1, this.lastSnapshot.waveIndex + 1)} reached the castle.`,
      victory,
    });
  }

  getTextSnapshot() {
    if (!this.lastSnapshot) return null;
    const snapshot = this.lastSnapshot;
    return {
      castleHearts: snapshot.castleHearts,
      coins: snapshot.coins,
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
      outcome: snapshot.outcome,
      pauseReasons: [...snapshot.pauseReasons],
      projectiles: snapshot.projectiles.map(({ id, sourceTowerId, targetId, impactTick }) => ({
        id,
        impactTick,
        sourceTowerId,
        targetId,
      })),
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
    this.disconnectHud?.();
    this.disconnectHud = null;
    for (const pool of [
      this.enemyPool,
      this.towerPool,
      this.projectilePool,
      this.telegraphPool,
      this.damageLabelPool,
      this.particlePool,
    ]) pool?.destroy();
    this.enemySprites.clear();
    this.towerSprites.clear();
    this.projectileSprites.clear();
    this.telegraphSprites.clear();
    this.previousEnemyHealth.clear();
    this.transientDamageLabels.length = 0;
    this.transientParticles.length = 0;
    this.focusRing?.destroy();
    this.rangeRing?.destroy();
    this.mapView?.destroy();
    for (const key of Object.values(this.debugTextureKeys ?? {})) this.textures.remove(key);
    this.clock?.reset();
  }
}
