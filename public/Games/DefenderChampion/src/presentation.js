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
  bladeguard: Object.freeze({ name: 'Bladeguard', role: 'Close defense', projectileFrame: GAMEPLAY_FRAME.shieldBash, displayScale: 0.44 }),
  ranger: Object.freeze({ name: 'Ranger', role: 'Long range', projectileFrame: GAMEPLAY_FRAME.arrow, displayScale: 0.44 }),
  ironwarden: Object.freeze({ name: 'Ironwarden', role: 'Armor breaker', projectileFrame: GAMEPLAY_FRAME.shieldBash, displayScale: 0.46 }),
  'rune-artificer': Object.freeze({ name: 'Rune Artificer', role: 'Splash damage', projectileFrame: GAMEPLAY_FRAME.runeBolt, displayScale: 0.46 }),
});

export const ENEMY_PRESENTATION = Object.freeze({
  'blight-walker': Object.freeze({ displayScale: 0.40, kind: 'enemy' }),
  skitter: Object.freeze({ displayScale: 0.39, kind: 'enemy' }),
  swarmkin: Object.freeze({ displayScale: 0.34, kind: 'enemy' }),
  shellguard: Object.freeze({ displayScale: 0.43, kind: 'enemy' }),
  hexcaller: Object.freeze({ displayScale: 0.42, kind: 'enemy' }),
  crusher: Object.freeze({ displayScale: 0.48, kind: 'enemy' }),
  'mossback-brute': Object.freeze({ displayScale: 0.48, kind: 'boss' }),
  'ironhide-warlord': Object.freeze({ displayScale: 0.50, kind: 'boss' }),
  'dread-colossus': Object.freeze({ displayScale: 0.53, kind: 'boss' }),
});

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
    for (const view of this.allViews) view.destroy?.();
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
