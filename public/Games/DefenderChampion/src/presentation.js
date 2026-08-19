import { ROAD_WIDTH } from './core/path-geometry.js';

export const GAMEPLAY_FRAME = Object.freeze({
  buildPad: 0,
  selectedBuildPad: 1,
  rangeMarker: 2,
  coin: 3,
  fullHeart: 4,
  emptyHeart: 5,
  arrow: 6,
  runeBolt: 7,
  shieldBash: 8,
  explosion: 9,
  stunStars: 10,
  slowRune: 11,
  healSparkle: 12,
  bossWarning: 13,
  victoryBurst: 14,
  defeatCrack: 15,
});

export const PATH_FRAME = Object.freeze({
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

export const DEFENDER_PRESENTATION = Object.freeze({
  bladeguard: Object.freeze({ name: 'Bladeguard', role: 'Road melee', projectileFrame: GAMEPLAY_FRAME.shieldBash, displayScale: 0.44 }),
  ranger: Object.freeze({ name: 'Ranger', role: 'Grass ranged', projectileFrame: GAMEPLAY_FRAME.arrow, displayScale: 0.44 }),
  ironwarden: Object.freeze({ name: 'Ironwarden', role: 'Road melee', projectileFrame: GAMEPLAY_FRAME.shieldBash, displayScale: 0.46 }),
  'rune-artificer': Object.freeze({ name: 'Rune Artificer', role: 'Grass ranged', projectileFrame: GAMEPLAY_FRAME.runeBolt, displayScale: 0.46 }),
});

export const ENEMY_PRESENTATION = Object.freeze({
  'blight-walker': Object.freeze({ displayScale: 0.40, kind: 'enemy', roadFootprint: 48 }),
  skitter: Object.freeze({ displayScale: 0.39, kind: 'enemy', roadFootprint: 48 }),
  swarmkin: Object.freeze({ displayScale: 0.34, kind: 'enemy', roadFootprint: 42 }),
  shellguard: Object.freeze({ displayScale: 0.43, kind: 'enemy', roadFootprint: 52 }),
  hexcaller: Object.freeze({ displayScale: 0.42, kind: 'enemy', roadFootprint: 48 }),
  crusher: Object.freeze({ displayScale: 0.48, kind: 'enemy', roadFootprint: 58 }),
  'mossback-brute': Object.freeze({ displayScale: 0.48, kind: 'boss', roadFootprint: 80 }),
  'ironhide-warlord': Object.freeze({ displayScale: 0.50, kind: 'boss', roadFootprint: 80 }),
  'dread-colossus': Object.freeze({ displayScale: 0.53, kind: 'boss', roadFootprint: 80 }),
});

export const resolveEnemyRoadProjection = (enemy = {}, presentation = {}) => {
  const requestedScale = Number(enemy.displayScale);
  const scale = Number.isFinite(requestedScale) && requestedScale > 0
    ? Math.min(1, requestedScale)
    : 1;
  const footprintWidth = Math.min(
    ROAD_WIDTH,
    Math.max(0, Number(presentation.roadFootprint) || ROAD_WIDTH) * scale,
  );
  const maximumLateralOffset = Math.max(0, (ROAD_WIDTH - footprintWidth) / 2);
  const requestedLaneOffset = Number(enemy.displayLaneOffset ?? enemy.laneOffset) || 0;
  const queued = enemy.laneState === 'queued'
    || (enemy.queueIndex !== null && enemy.queueIndex !== undefined);
  return Object.freeze({
    depth: queued ? 3.6 : enemy.laneState === 'attacking' ? 5.2 : 4.6,
    footprintWidth,
    laneOffset: Math.max(-maximumLateralOffset, Math.min(maximumLateralOffset, requestedLaneOffset)),
    pathProgress: Number(enemy.displayPathProgress ?? enemy.pathProgress) || 0,
    scale,
  });
};

export const LEVEL_PRESENTATION = Object.freeze({
  'level-1': Object.freeze({ lesson: 'Blight Walkers are balanced. Cover both the early bend and the castle approach.', boss: null }),
  'level-2': Object.freeze({ lesson: 'Skitters are fast and fragile. Long-range coverage catches them across bends.', boss: null }),
  'level-3': Object.freeze({ lesson: 'Shellguards resist physical damage. Mix armor breaking with steady fire.', boss: null }),
  'level-4': Object.freeze({ lesson: 'Spread defenders so one stun cannot silence your whole line.', boss: 'Mossback Brute warns before a stunning ground slam.' }),
  'level-5': Object.freeze({ lesson: 'Hexcallers empower nearby enemies. Swarmkin punish defenses without splash damage.', boss: null }),
  'level-6': Object.freeze({ lesson: 'Dense mixed waves reward deliberate upgrade timing and overlapping roles.', boss: null }),
  'level-7': Object.freeze({ lesson: 'Break Ironhide’s three plates, then strike during the vulnerable window.', boss: 'Ironhide Warlord rallies escorts and carries three breakable plates.' }),
  'level-8': Object.freeze({ lesson: 'Elite combinations arrive close together. Preserve coins for flexible upgrades.', boss: null }),
  'level-9': Object.freeze({ lesson: 'Every standard role returns. Build for coverage, armor, speed, and clusters.', boss: null }),
  'level-10': Object.freeze({ lesson: 'Prepare every role before the final wave and adapt through three boss phases.', boss: 'Dread Colossus summons packs at 75%, 50%, and 25% health, then suppresses defenders.' }),
});

export const STRATEGY_HINTS = Object.freeze([
  'Cover more than one bend before buying a third-tier upgrade.',
  'Use Rangers for fast enemies and Rune Artificers for dense packs.',
  'Sell a poorly placed defender to recover 70% of its investment.',
  'Spread defenders before boss waves so one ability cannot disable the whole line.',
]);

export const animationKey = (kind, characterId, actionId) => `${kind}:${characterId}:${actionId}`;
export const characterAssetId = (kind, characterId, actionId) => `${kind}-${characterId}-${actionId}`;

export const shouldProjectDefenderIdle = ({
  currentAnimationKey,
  idleAnimationKey,
  idleAsset,
  isPlaying,
  textureKey,
} = {}) => {
  const playingAction = Boolean(isPlaying)
    && Boolean(currentAnimationKey)
    && currentAnimationKey !== idleAnimationKey;
  return !playingAction && (
    textureKey !== idleAsset
    || currentAnimationKey !== idleAnimationKey
    || !isPlaying
  );
};

export const resolvePresentationLimits = (reducedMotion = false) => Object.freeze({
  cameraShake: reducedMotion ? 0 : 0.006,
  damageLabelCap: reducedMotion ? 12 : 32,
  fixedStepMilliseconds: 1_000 / 60,
  particleCap: reducedMotion ? 18 : 64,
  telegraphsEnabled: true,
});

const SQUARE_ROAD_FRAMES = new Set([
  'isolated', 'cross', 'northEast', 'eastSouth', 'southWest', 'westNorth',
  'capNorth', 'capEast', 'capSouth', 'capWest',
]);

export const resolveRoadPieceDisplay = (piece = {}) => {
  if (piece.kind === 'straight') {
    if (piece.rotation !== 0) throw new Error('Road straight frames must not be rotated');
    if (piece.frame === 'horizontal') return { height: ROAD_WIDTH, width: piece.length };
    if (piece.frame === 'vertical') return { height: piece.length, width: ROAD_WIDTH };
    throw new Error(`Unsupported road straight frame: ${piece.frame}`);
  }
  if (!SQUARE_ROAD_FRAMES.has(piece.frame)) throw new Error(`Unsupported road piece frame: ${piece.frame}`);
  return { height: ROAD_WIDTH, width: ROAD_WIDTH };
};

export const resolvePlacementMarkerState = ({
  markerLayer,
  occupied = false,
  selected = false,
  selectedLayer = null,
} = {}) => {
  const compatible = !occupied && Boolean(selectedLayer) && markerLayer === selectedLayer;
  if (compatible) {
    return Object.freeze({
      acceptsBuild: true,
      alpha: 1,
      scale: 0.31,
      selectedFrame: true,
      visible: true,
    });
  }
  if (selected && occupied) {
    return Object.freeze({
      acceptsBuild: false,
      alpha: 0.92,
      scale: 0.28,
      selectedFrame: true,
      visible: true,
    });
  }
  if (selectedLayer) {
    return Object.freeze({
      acceptsBuild: false,
      alpha: 0.16,
      scale: 0.22,
      selectedFrame: false,
      visible: true,
    });
  }
  return Object.freeze({
    acceptsBuild: false,
    alpha: occupied ? 0.24 : 0.4,
    scale: 0.24,
    selectedFrame: false,
    visible: true,
  });
};

export const resolvePlacementPrompt = (layer) => (
  layer === 'road' ? 'Choose a road guard slot' : 'Choose a grass ranged slot'
);

export const attemptPlacementBuild = ({
  announce,
  issueCommand,
  pad,
  selectedDefenderId,
  selectedLayer,
} = {}) => {
  if (!selectedDefenderId) {
    announce?.('Open placement slot. Select defender 1 through 4 first.');
    return { accepted: false, reason: 'defender-required' };
  }
  if (!selectedLayer || pad?.layer !== selectedLayer) {
    announce?.(`${resolvePlacementPrompt(selectedLayer)}.`);
    return { accepted: false, reason: 'placement-layer-mismatch' };
  }
  return issueCommand?.({
    type: 'build',
    defenderId: selectedDefenderId,
    padId: pad.id,
  }) ?? { accepted: false, reason: 'battle-unavailable' };
};

export const resolveCommandRejectionMessage = (reason, selectedLayer = null) => ({
  'battle-terminal': 'This battle has already ended.',
  'battle-unavailable': 'The battlefield is not available.',
  'defender-engaged': 'That road defender is fighting and cannot be sold.',
  'insufficient-coins': 'Not enough coins for that command.',
  'invalid-defender': 'Choose an available defender.',
  'invalid-pad': 'Choose an available placement slot.',
  'max-tier': 'That defender is already at maximum tier.',
  'missing-tower': 'That defender is no longer available.',
  'pad-occupied': 'That placement slot is already occupied.',
  'placement-layer-mismatch': `${resolvePlacementPrompt(selectedLayer)}.`,
}[reason] ?? 'That command is not available right now.');

export const resolveFrontlineHealthBar = ({ combatLayer, health, maxHealth } = {}) => {
  if (combatLayer !== 'frontline' || !(maxHealth > 0)) {
    return Object.freeze({ key: 'hidden', ratio: 0, visible: false });
  }
  const ratio = Math.round(Math.max(0, Math.min(1, health / maxHealth)) * 100) / 100;
  return Object.freeze({ key: `frontline:${Math.round(ratio * 100)}`, ratio, visible: true });
};

export const resolveEnemyAttackMotion = ({
  bodyScale = 1,
  boss = false,
  currentTick = 0,
  enemyPosition = { x: 0, y: 0 },
  impactAtTick = currentTick,
  reducedMotion = false,
  targetPosition = enemyPosition,
  timeScale = 1,
} = {}) => {
  const totalMs = Math.max(0, Math.round(
    ((impactAtTick - currentTick) * (1_000 / 60)) / Math.max(0.25, timeScale),
  ));
  const windupMs = Math.round(totalMs * 0.35);
  const lungeMs = totalMs - windupMs;
  if (reducedMotion) {
    return Object.freeze({
      backX: 0,
      backY: 0,
      lungeMs,
      lungeX: 0,
      lungeY: 0,
      totalMs,
      windupMs,
    });
  }

  const deltaX = targetPosition.x - enemyPosition.x;
  const deltaY = targetPosition.y - enemyPosition.y;
  const distance = Math.hypot(deltaX, deltaY);
  const directionX = distance > 0 ? deltaX / distance : 0;
  const directionY = distance > 0 ? deltaY / distance : 1;
  const travelCap = Math.min(boss ? 32 : 44, Math.max(18, bodyScale * 80));
  const travel = Math.min(travelCap, distance * 0.55);
  const backTravel = Math.min(10, Math.max(5, travel * 0.25));
  return Object.freeze({
    backX: -directionX * backTravel,
    backY: -directionY * backTravel,
    lungeMs,
    lungeX: directionX * travel,
    lungeY: directionY * travel,
    totalMs,
    windupMs,
  });
};

export const resolveDefenderHitMotion = ({
  directionX = 0,
  directionY = 1,
  reducedMotion = false,
} = {}) => {
  const recoil = reducedMotion ? 0 : 10;
  const recoilPosition = Object.freeze({
    x: reducedMotion ? 0 : directionX * recoil,
    y: reducedMotion ? 0 : directionY * recoil,
  });
  const restPosition = Object.freeze({ x: 0, y: 0 });
  return Object.freeze({
    steps: Object.freeze([
      Object.freeze({
        angle: reducedMotion ? -3 : -6,
        duration: reducedMotion ? 45 : 75,
        ...recoilPosition,
      }),
      Object.freeze({
        angle: 0,
        duration: reducedMotion ? 55 : 125,
        ease: 'Cubic.easeOut',
        ...restPosition,
      }),
    ]),
  });
};

export const resolveDamageLabelMotion = ({
  position = { x: 0, y: 0 },
  reducedMotion = false,
  scale = 1,
} = {}) => {
  const visualScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const startX = position.x;
  const startY = position.y - (68 * visualScale);
  return Object.freeze({
    duration: reducedMotion ? 180 : 520,
    endX: startX,
    endY: reducedMotion ? startY : position.y - (112 * visualScale),
    startX,
    startY,
  });
};

export const resolveBurstMotion = ({
  index = 0,
  position = { x: 0, y: 0 },
  reducedMotion = false,
  scale = 1,
  seed = 0,
} = {}) => {
  const visualScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const startX = position.x;
  const startY = position.y - (28 * visualScale);
  if (reducedMotion) {
    return Object.freeze({ duration: 180, endX: startX, endY: startY, startX, startY });
  }
  const angle = (((index * 137.5) + (seed * 17)) % 360) * (Math.PI / 180);
  const distance = (30 + ((index % 4) * 8)) * visualScale;
  return Object.freeze({
    duration: 460,
    endX: startX + (Math.cos(angle) * distance),
    endY: startY + (Math.sin(angle) * distance),
    startX,
    startY,
  });
};

export const beginDefenderDefeatPresentation = (view, { reducedMotion = false } = {}) => {
  view._healthKey = 'defeated';
  view._healthBackground?.clear?.();
  view._healthBackground?.setVisible?.(false);
  view._healthFill?.clear?.();
  view._healthFill?.setVisible?.(false);
  view._body?.anims?.stop?.();
  view._body?.setTint?.(0x8b5a52);
  return Object.freeze({
    alpha: 0,
    angle: reducedMotion ? 4 : 12,
    duration: reducedMotion ? 160 : 360,
    y: reducedMotion ? 0 : 26,
  });
};

export const finishTrackedMotion = (view, motion, onComplete) => {
  if (!view || view._motion !== motion) return false;
  view._motion = null;
  onComplete?.();
  return true;
};

export const clearPresentationTransients = ({
  cancelViewMotion,
  pools = [],
  timers,
} = {}) => {
  for (const timer of [...(timers ?? [])]) timer?.remove?.(false);
  timers?.clear?.();
  for (const pool of pools) {
    for (const view of [...(pool?.activeViews ?? [])]) {
      view?._body?.removeAllListeners?.('animationcomplete');
      cancelViewMotion?.(view);
      pool.release(view);
    }
  }
};

const LANE_PRESENTATION_HANDLER = Object.freeze({
  'defender-defeated': 'onDefenderDefeated',
  'defender-hit': 'onDefenderHit',
  'enemy-attack-impact': 'onEnemyAttackImpact',
  'enemy-attack-start': 'onEnemyAttackStart',
});

export const dispatchLanePresentationEvent = (event, handlers = {}) => {
  const handlerName = LANE_PRESENTATION_HANDLER[event?.kind];
  if (!handlerName) return false;
  handlers[handlerName]?.(event.payload, event);
  return true;
};

export const deriveCampaignEnemyViewCapacity = (levels = [], enemies = {}) => Math.max(
  0,
  ...levels.map((level) => level.waves.reduce((levelTotal, wave) => (
    levelTotal + wave.reduce((waveTotal, group) => {
      const enemy = enemies[group.enemyId] ?? {};
      const authoredSummons = Array.isArray(enemy.summonThresholds)
        ? enemy.summonThresholds.length * Math.max(0, enemy.summonCount ?? 0)
        : 0;
      return waveTotal + (group.count * (1 + authoredSummons));
    }, 0)
  ), 0)),
);

export class ViewPool {
  constructor(createView, { maximum = Number.POSITIVE_INFINITY, resetView } = {}) {
    this.availableViews = [];
    this.activeViews = new Set();
    this.allViews = new Set();
    this.createView = createView;
    this.maximum = maximum;
    this.resetView = resetView;
    this.stats = {
      created: 0,
      active: 0,
      available: 0,
      highWater: 0,
      acquires: 0,
      releases: 0,
    };
  }

  acquire() {
    let view = this.availableViews.pop();
    if (!view) {
      if (this.allViews.size >= this.maximum) return null;
      view = this.createView();
      this.allViews.add(view);
      this.stats.created += 1;
    }
    this.activeViews.add(view);
    view.setActive?.(true);
    view.setVisible?.(true);
    view.setAlpha?.(1);
    this.stats.acquires += 1;
    this.stats.active = this.activeViews.size;
    this.stats.available = this.availableViews.length;
    this.stats.highWater = Math.max(this.stats.highWater, this.stats.active);
    return view;
  }

  release(view) {
    if (!view || !this.activeViews.delete(view)) return;
    this.resetView?.(view);
    view.setActive?.(false);
    view.setVisible?.(false);
    this.availableViews.push(view);
    this.stats.releases += 1;
    this.stats.active = this.activeViews.size;
    this.stats.available = this.availableViews.length;
  }

  getState() {
    return { ...this.stats };
  }

  destroy() {
    for (const view of this.allViews) {
      this.resetView?.(view);
      view.destroy?.();
    }
    this.availableViews.length = 0;
    this.activeViews.clear();
    this.allViews.clear();
    for (const key of Object.keys(this.stats)) this.stats[key] = 0;
  }
}

export const syncProjectionMap = (projectionMap, pool, entries, applyProjection, onRelease) => {
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
      if (!view) throw new Error(`Projection pool exhausted for ${entry.id}`);
      projectionMap.set(entry.id, view);
    }
    applyProjection(view, entry);
  }
};

export const projectCombatRadius = ({ position, radius, xScale, yScale }) => ({
  displayHeight: 2 * radius * yScale,
  displayWidth: 2 * radius * xScale,
  x: position.x,
  y: position.y,
});

export const resolveBetweenWaveCountdown = (snapshot, gapTicks, ticksPerSecond = 60) => {
  const startTick = snapshot?.nextWaveStartTick;
  const tick = snapshot?.tick;
  if (!Number.isInteger(startTick) || !Number.isInteger(tick) || startTick <= tick) return null;
  const ticksRemaining = startTick - tick;
  if (ticksRemaining > gapTicks) return null;
  return Math.ceil(ticksRemaining / ticksPerSecond);
};

const IRONHIDE_PLATE_POSITIONS = Object.freeze({
  plate75: Object.freeze({ x: -54, y: -112 }),
  plate50: Object.freeze({ x: 54, y: -112 }),
  plate25: Object.freeze({ x: 0, y: -158 }),
});

export const resolveIronhidePlatePresentation = (mappings, {
  thresholdFlags = {},
  tick = 0,
  vulnerableUntilTick = 0,
} = {}) => {
  const plates = (mappings?.plateAccents ?? []).map(({ removeAccent: id, threshold }) => ({
    id,
    threshold,
    ...(IRONHIDE_PLATE_POSITIONS[threshold] ?? { x: 0, y: -112 }),
    visible: thresholdFlags[threshold] !== true,
  }));
  return {
    plates,
    vulnerabilityVisible: plates.length > 0
      && plates.every(({ visible }) => !visible)
      && vulnerableUntilTick > tick,
  };
};

export const resolveResultTransitionDelay = ({
  bossMetadata,
  elapsedSinceBossDefeatMs = 0,
  enemyId,
  fallbackDelayMs = 1_350,
  reducedMotion = false,
} = {}) => {
  if (reducedMotion) return 650;
  const records = bossMetadata?.bosses ?? bossMetadata?.enemies ?? [];
  const defeat = records.find(({ id }) => id === enemyId)
    ?.actions?.find(({ id }) => id === 'defeat');
  if (!defeat) return fallbackDelayMs;
  const authoredDuration = defeat.frameCount * defeat.frameDurationMs;
  const remainingDuration = authoredDuration - Math.max(0, elapsedSinceBossDefeatMs);
  return Math.max(fallbackDelayMs, remainingDuration);
};
