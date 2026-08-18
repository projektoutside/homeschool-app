import { DEFENDERS } from '../config/defenders.js';
import { COMBAT_RULES, EFFECT_LIMITS, ENEMIES } from '../config/enemies.js';
import { selectTarget } from './targeting.js';

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const isBoss = (enemy) => enemy.enemyId === 'mossback-brute'
  || enemy.enemyId === 'ironhide-warlord'
  || enemy.enemyId === 'dread-colossus';

export const applyArmor = (damage, armor, armorPierce = 0) => {
  if (!(damage > 0)) return 0;
  const effectiveArmor = clamp((armor ?? 0) - Math.max(0, armorPierce), 0, EFFECT_LIMITS.armorReductionMax);
  return Math.max(1, Math.round(damage * (1 - effectiveArmor)));
};

export const clampControlEffect = (enemyKind, effect) => ({
  stunSeconds: clamp(
    effect.stunSeconds ?? 0,
    0,
    enemyKind === 'boss' ? EFFECT_LIMITS.bossStunSecondsMax : EFFECT_LIMITS.standardStunSecondsMax,
  ),
  slow: clamp(effect.slow ?? 0, 0, EFFECT_LIMITS.slowMax),
});

export const getDreadColossusPhase = (healthRatio) => {
  if (healthRatio > 0.75) return 1;
  if (healthRatio > 0.40) return 2;
  return 3;
};

const distance = (first, second) => Math.hypot(first.x - second.x, first.y - second.y);

const getPathMetrics = (path) => {
  const segments = [];
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1];
    const end = path[index];
    const length = distance(start, end);
    segments.push({ start, end, length, offset: total });
    total += length;
  }
  return { segments, total };
};

const getEnemyPosition = (simulation, enemy) => {
  const metrics = simulation.pathMetrics;
  const progress = clamp(enemy.pathProgress, 0, metrics.total);
  const segment = metrics.segments.find((entry) => progress <= entry.offset + entry.length)
    ?? metrics.segments.at(-1);
  const ratio = segment.length === 0 ? 1 : (progress - segment.offset) / segment.length;
  return {
    x: segment.start.x + ((segment.end.x - segment.start.x) * ratio),
    y: segment.start.y + ((segment.end.y - segment.start.y) * ratio),
  };
};

const getTowerPosition = (simulation, tower) => simulation.level.pads.find((pad) => pad.id === tower.padId);

const effectKey = (targetId, kind) => `${targetId}\u0000${kind}`;

const rebuildEffectIndex = (simulation) => {
  simulation.activeEffectValues = new Map();
  for (const effect of simulation.effects) {
    const key = effectKey(effect.targetId, effect.kind);
    simulation.activeEffectValues.set(key, Math.max(simulation.activeEffectValues.get(key) ?? 0, effect.value));
  }
};

const strongestEffect = (simulation, targetId, kind, maximum) => Math.min(
  maximum,
  simulation.activeEffectValues?.get(effectKey(targetId, kind)) ?? 0,
);

const addEffect = (simulation, effect) => {
  const duplicate = simulation.effects.find((candidate) => (
    candidate.sourceId === effect.sourceId
    && candidate.targetId === effect.targetId
    && candidate.kind === effect.kind
  ));
  if (duplicate) {
    duplicate.value = Math.max(duplicate.value, effect.value);
    duplicate.expiresAtTick = Math.max(duplicate.expiresAtTick, Math.trunc(effect.expiresAtTick));
    const key = effectKey(effect.targetId, effect.kind);
    simulation.activeEffectValues?.set(key, Math.max(simulation.activeEffectValues.get(key) ?? 0, effect.value));
    return;
  }
  simulation.effects.push({
    id: `effect-${simulation.nextEntityId++}`,
    ...effect,
    expiresAtTick: Math.trunc(effect.expiresAtTick),
  });
  const key = effectKey(effect.targetId, effect.kind);
  simulation.activeEffectValues?.set(key, Math.max(simulation.activeEffectValues.get(key) ?? 0, effect.value));
};

export const applySupportEffects = (simulation, enemy) => {
  const speedBonus = strongestEffect(simulation, enemy.id, 'enemy-speed', EFFECT_LIMITS.supportSpeedMax);
  const armorBonus = strongestEffect(simulation, enemy.id, 'enemy-armor', COMBAT_RULES.supportArmorMax);
  const healingRate = strongestEffect(
    simulation,
    enemy.id,
    'enemy-healing',
    EFFECT_LIMITS.supportHealingPerSecondMax,
  );
  if (healingRate > 0
    && enemy.health > 0
    && enemy.health < enemy.maxHealth
    && enemy.lastHealingTick !== simulation.tick) {
    enemy.lastHealingTick = simulation.tick;
    enemy.healingRemainder = (enemy.healingRemainder ?? 0) + (enemy.maxHealth * healingRate);
    const wholeHealing = Math.floor(enemy.healingRemainder / COMBAT_RULES.ticksPerSecond);
    if (wholeHealing > 0) {
      enemy.health = Math.min(enemy.maxHealth, enemy.health + wholeHealing);
      enemy.healingRemainder -= wholeHealing * COMBAT_RULES.ticksPerSecond;
    }
  }
  return { speedBonus, armorBonus };
};

const getEnemyArmor = (simulation, enemy, supportArmor) => {
  let armor = enemy.armor;
  if (enemy.enemyId === 'ironhide-warlord') {
    const config = ENEMIES[enemy.enemyId];
    const ratio = enemy.health / enemy.maxHealth;
    if (enemy.vulnerableUntilTick > simulation.tick) armor = 0;
    else {
      const activePlateIndex = config.plateThresholds.findIndex((threshold) => ratio > threshold);
      if (activePlateIndex >= 0) armor += config.plateArmorBonuses[activePlateIndex];
    }
  }
  if (enemy.enemyId === 'dread-colossus' && getDreadColossusPhase(enemy.health / enemy.maxHealth) === 2) {
    armor += ENEMIES['dread-colossus'].phase2Armor;
  }
  return armor + supportArmor;
};

const defeatEnemy = (simulation, enemy) => {
  if (enemy.defeated) return;
  enemy.defeated = true;
  const config = ENEMIES[enemy.enemyId];
  simulation.coins += config.bounty;
  simulation.score += config.bounty;
};

export const applyHit = (simulation, enemy, hit) => {
  if (!enemy || enemy.health <= 0) return 0;
  const { armorBonus } = applySupportEffects(simulation, enemy);
  const dealt = applyArmor(hit.damage, getEnemyArmor(simulation, enemy, armorBonus), hit.armorPierce);
  enemy.health = Math.max(0, enemy.health - dealt);

  if (hit.stunSeconds > 0 && (enemy.stunImmuneUntilTick ?? 0) <= simulation.tick) {
    const control = clampControlEffect(isBoss(enemy) ? 'boss' : 'standard', hit);
    const stunTicks = Math.round(control.stunSeconds * COMBAT_RULES.ticksPerSecond);
    const immunitySeconds = isBoss(enemy)
      ? EFFECT_LIMITS.bossStunImmunitySeconds
      : EFFECT_LIMITS.standardStunImmunitySeconds;
    enemy.stunnedUntilTick = simulation.tick + stunTicks;
    enemy.stunImmuneUntilTick = enemy.stunnedUntilTick + (immunitySeconds * COMBAT_RULES.ticksPerSecond);
  }
  if (enemy.health === 0) defeatEnemy(simulation, enemy);
  return dealt;
};

const createEnemy = (simulation, enemyId, pathProgress, waveIndex, isSummon = false) => {
  const config = ENEMIES[enemyId];
  const maxHealth = Math.round(config.health * simulation.level.healthScale);
  return {
    id: `enemy-${simulation.nextEntityId++}`,
    enemyId,
    waveIndex,
    spawnTick: simulation.tick,
    pathProgress,
    health: maxHealth,
    maxHealth,
    speed: config.speed,
    armor: config.armor,
    clusterSize: 1,
    castleDamage: config.castleDamage,
    nextAbilityTick: simulation.tick + config.cooldownTicks,
    thresholdFlags: {},
    isSummon,
  };
};

const initializeSpawnedEnemy = (simulation, enemy) => {
  if (enemy.maxHealth !== undefined) return;
  const config = ENEMIES[enemy.enemyId];
  enemy.waveIndex = simulation.waveIndex;
  enemy.maxHealth = enemy.health;
  enemy.nextAbilityTick = enemy.spawnTick + config.cooldownTicks;
  enemy.thresholdFlags = {};
};

const summonDreadPack = (simulation, boss, threshold) => {
  const config = ENEMIES['dread-colossus'];
  for (let index = 0; index < config.summonCount; index += 1) {
    simulation.enemies.push(createEnemy(
      simulation,
      'swarmkin',
      Math.max(0, boss.pathProgress - (index * 8)),
      boss.waveIndex,
      true,
    ));
  }
  boss.thresholdFlags[`summon${threshold}`] = true;
};

const updateBossThresholds = (simulation, enemy) => {
  const ratio = enemy.health / enemy.maxHealth;
  if (enemy.enemyId === 'ironhide-warlord') {
    const config = ENEMIES[enemy.enemyId];
    for (const threshold of config.plateThresholds) {
      const thresholdPercent = Math.round(threshold * 100);
      if (ratio <= threshold && !enemy.thresholdFlags[`plate${thresholdPercent}`]) {
        enemy.thresholdFlags[`plate${thresholdPercent}`] = true;
        if (threshold === config.plateThresholds.at(-1)) {
          enemy.vulnerableUntilTick = simulation.tick + config.vulnerableTicks;
        }
      }
    }
  }
  if (enemy.enemyId === 'dread-colossus') {
    const config = ENEMIES[enemy.enemyId];
    for (const threshold of config.summonThresholds) {
      const thresholdPercent = Math.round(threshold * 100);
      if (ratio <= threshold && !enemy.thresholdFlags[`summon${thresholdPercent}`]) {
        summonDreadPack(simulation, enemy, thresholdPercent);
      }
    }
    const phase = getDreadColossusPhase(ratio);
    if (phase === 3 && !enemy.thresholdFlags.phase3Started) {
      enemy.thresholdFlags.phase3Started = true;
      enemy.nextAbilityTick = simulation.tick + ENEMIES[enemy.enemyId].cooldownTicks;
    }
  }
};

const applyHexcallerSupport = (simulation, source) => {
  const config = ENEMIES.hexcaller;
  const sourcePosition = getEnemyPosition(simulation, source);
  const allies = simulation.enemies.filter((enemy) => (
    enemy.health > 0 && enemy.id !== source.id
    && distance(sourcePosition, getEnemyPosition(simulation, enemy)) <= config.supportRadius
  ));
  const useHealing = allies.some((enemy) => enemy.health < enemy.maxHealth);
  for (const ally of allies) {
    addEffect(simulation, {
      sourceId: source.id,
      targetId: ally.id,
      kind: useHealing ? 'enemy-healing' : 'enemy-speed',
      value: useHealing ? config.supportHealingPerSecond : config.supportSpeed,
      expiresAtTick: simulation.tick + config.supportDurationTicks,
    });
  }
};

const applyWarlordRally = (simulation, source) => {
  const config = ENEMIES['ironhide-warlord'];
  const sourcePosition = getEnemyPosition(simulation, source);
  for (const ally of simulation.enemies) {
    if (ally.id === source.id || ally.health <= 0) continue;
    if (distance(sourcePosition, getEnemyPosition(simulation, ally)) > config.rallyRadius) continue;
    for (const [kind, value] of [['enemy-speed', config.rallySpeed], ['enemy-armor', config.rallyArmor]]) {
      addEffect(simulation, {
        sourceId: source.id,
        targetId: ally.id,
        kind,
        value,
        expiresAtTick: simulation.tick + config.rallyDurationTicks,
      });
    }
  }
};

const telegraphBossAbility = (simulation, source, kind, telegraphTicks) => addEffect(simulation, {
  sourceId: source.id,
  targetId: source.id,
  kind,
  value: 1,
  triggerTick: simulation.tick + telegraphTicks,
  expiresAtTick: simulation.tick + telegraphTicks + 1,
  triggered: false,
});

const updateEnemyAbilities = (simulation, enemy) => {
  const config = ENEMIES[enemy.enemyId];
  if (config.cooldownTicks <= 0 || simulation.tick < enemy.nextAbilityTick) return;
  if (enemy.enemyId === 'hexcaller') applyHexcallerSupport(simulation, enemy);
  if (enemy.enemyId === 'ironhide-warlord') applyWarlordRally(simulation, enemy);
  if (enemy.enemyId === 'mossback-brute') {
    telegraphBossAbility(simulation, enemy, 'mossback-telegraph', config.telegraphTicks);
  }
  if (enemy.enemyId === 'dread-colossus'
    && getDreadColossusPhase(enemy.health / enemy.maxHealth) === 3) {
    telegraphBossAbility(simulation, enemy, 'dread-pulse-telegraph', config.pulseTelegraphTicks);
  }
  enemy.nextAbilityTick += config.cooldownTicks;
};

const triggerTelegraphs = (simulation) => {
  for (const effect of simulation.effects) {
    if (effect.triggered || effect.triggerTick !== simulation.tick) continue;
    effect.triggered = true;
    const source = simulation.enemies.find((enemy) => enemy.id === effect.sourceId);
    if (!source || source.health <= 0) continue;
    const sourcePosition = getEnemyPosition(simulation, source);
    const config = ENEMIES[source.enemyId];
    for (const tower of simulation.towers) {
      const radius = effect.kind === 'mossback-telegraph' ? config.abilityRadius : config.pulseRadius;
      if (distance(sourcePosition, getTowerPosition(simulation, tower)) > radius) continue;
      if (effect.kind === 'mossback-telegraph') {
        addEffect(simulation, {
          sourceId: source.id,
          targetId: tower.id,
          kind: 'tower-stun',
          value: 1,
          expiresAtTick: simulation.tick + Math.round(config.stunSeconds * COMBAT_RULES.ticksPerSecond),
        });
      } else {
        addEffect(simulation, {
          sourceId: source.id,
          targetId: tower.id,
          kind: 'tower-attack-slow',
          value: config.pulseSlow,
          expiresAtTick: simulation.tick + config.pulseDurationTicks,
        });
      }
    }
  }
};

const addProjectile = (simulation, tower, target, damage, options = {}) => {
  simulation.projectiles.push({
    id: `projectile-${simulation.nextEntityId++}`,
    sourceTowerId: tower.id,
    targetId: target.id,
    impactTick: simulation.tick + (options.delayTicks ?? DEFENDERS[tower.defenderId].projectileTicks),
    damage,
    armorPierce: options.armorPierce ?? 0,
    splashRadius: options.splashRadius ?? 0,
    stunSeconds: options.stunSeconds ?? 0,
  });
};

const fireTower = (simulation, tower, targets) => {
  const config = DEFENDERS[tower.defenderId];
  const damage = config.damage[tower.tier];
  tower.attackCount = (tower.attackCount ?? 0) + 1;
  const mastery = tower.tier === 2 && tower.attackCount % config.masteryAttackCount === 0;
  const primary = selectTarget(targets, config.targetPriority);
  if (!primary) return;

  if (mastery && tower.defenderId === 'bladeguard') {
    const center = getEnemyPosition(simulation, primary);
    for (const target of simulation.enemies) {
      if (target.health > 0 && distance(center, getEnemyPosition(simulation, target)) <= config.masteryRadius) {
        addProjectile(simulation, tower, target, damage, { delayTicks: 1 });
      }
    }
  } else if (mastery && tower.defenderId === 'ranger') {
    const distinctTargets = [...targets].sort((first, second) => first.id.localeCompare(second.id)).slice(0, 3);
    for (const target of distinctTargets) {
      addProjectile(simulation, tower, target, Math.round(damage * config.masteryMultiplier));
    }
  } else {
    addProjectile(simulation, tower, primary, damage, {
      armorPierce: config.armorPierce,
      splashRadius: config.splashRadius,
      stunSeconds: tower.defenderId === 'ironwarden' ? config.stunSeconds : 0,
    });
    if (mastery && tower.defenderId === 'rune-artificer') {
      addProjectile(simulation, tower, primary, damage, {
        armorPierce: config.armorPierce,
        splashRadius: config.splashRadius,
        delayTicks: config.projectileTicks + config.masteryDelayTicks,
      });
    }
  }
};

const updateTowers = (simulation) => {
  for (const tower of simulation.towers) {
    if (strongestEffect(simulation, tower.id, 'tower-stun', 1) > 0) continue;
    if (simulation.tick < (tower.nextAttackTick ?? 0)) continue;
    const config = DEFENDERS[tower.defenderId];
    const towerPosition = getTowerPosition(simulation, tower);
    const targets = simulation.enemies.filter((enemy) => (
      enemy.health > 0 && distance(towerPosition, getEnemyPosition(simulation, enemy)) <= config.range[tower.tier]
    ));
    if (targets.length === 0) continue;
    fireTower(simulation, tower, targets);
    const attackSlow = strongestEffect(
      simulation,
      tower.id,
      'tower-attack-slow',
      ENEMIES['dread-colossus'].pulseSlow,
    );
    const allySpeed = strongestEffect(
      simulation,
      tower.id,
      'tower-attack-speed',
      DEFENDERS.ironwarden.rallySpeed,
    );
    tower.nextAttackTick = simulation.tick + Math.max(1, Math.round(
      config.cooldownTicks[tower.tier] * (1 + attackSlow) * (1 - allySpeed),
    ));
  }
};

const processProjectiles = (simulation) => {
  const pending = [];
  for (const projectile of simulation.projectiles) {
    if (projectile.impactTick > simulation.tick) {
      pending.push(projectile);
      continue;
    }
    const target = simulation.enemies.find((enemy) => enemy.id === projectile.targetId && enemy.health > 0);
    if (!target) continue;
    const targets = projectile.splashRadius > 0
      ? simulation.enemies.filter((enemy) => enemy.health > 0 && distance(
        getEnemyPosition(simulation, target),
        getEnemyPosition(simulation, enemy),
      ) <= projectile.splashRadius)
      : [target];
    for (const impacted of targets) applyHit(simulation, impacted, projectile);
  }
  simulation.projectiles = pending;
};

const applyIronwardenAuras = (simulation) => {
  for (const source of simulation.towers) {
    const config = DEFENDERS[source.defenderId];
    if (source.defenderId !== 'ironwarden' || source.tier !== 2) continue;
    const sourcePosition = getTowerPosition(simulation, source);
    for (const tower of simulation.towers) {
      if (tower.id !== source.id && distance(sourcePosition, getTowerPosition(simulation, tower)) <= config.rallyRadius) {
        addEffect(simulation, {
          sourceId: source.id,
          targetId: tower.id,
          kind: 'tower-attack-speed',
          value: config.rallySpeed,
          expiresAtTick: simulation.tick + 2,
        });
      }
    }
  }
};

const moveEnemies = (simulation) => {
  for (const enemy of simulation.enemies) {
    if (enemy.health <= 0 || (enemy.stunnedUntilTick ?? 0) > simulation.tick) continue;
    const support = applySupportEffects(simulation, enemy);
    const phaseSpeed = enemy.enemyId === 'dread-colossus'
      && getDreadColossusPhase(enemy.health / enemy.maxHealth) === 3
      ? ENEMIES[enemy.enemyId].phase3Speed
      : 0;
    const speedMultiplier = Math.min(
      COMBAT_RULES.enemySpeedMultiplierMax,
      1 + support.speedBonus + phaseSpeed,
    );
    enemy.pathProgress += (enemy.speed * COMBAT_RULES.movementScale * speedMultiplier) / COMBAT_RULES.ticksPerSecond;
  }
};

const resolveEnemies = (simulation) => {
  const survivors = [];
  for (const enemy of simulation.enemies) {
    if (enemy.health <= 0) continue;
    if (enemy.pathProgress >= simulation.pathMetrics.total) {
      simulation.castleHearts = Math.max(0, simulation.castleHearts - enemy.castleDamage);
      continue;
    }
    survivors.push(enemy);
  }
  simulation.enemies = survivors;
};

const awardCompletedWaves = (simulation) => {
  for (let waveIndex = 0; waveIndex < simulation.level.waveCount; waveIndex += 1) {
    if (simulation.waveCompletionFlags[waveIndex]) continue;
    const hasPendingSpawn = simulation.waveSchedule.slice(simulation.nextSpawnIndex)
      .some((entry) => entry.waveIndex === waveIndex);
    const hasLivingEnemy = simulation.enemies.some((enemy) => enemy.waveIndex === waveIndex);
    const hasProjectile = simulation.projectiles.some((projectile) => simulation.enemies
      .some((enemy) => enemy.id === projectile.targetId && enemy.waveIndex === waveIndex));
    if (!hasPendingSpawn && !hasLivingEnemy && !hasProjectile) {
      simulation.waveCompletionFlags[waveIndex] = true;
      simulation.score += COMBAT_RULES.waveCompletionScore;
    }
  }
};

export const stepCombat = (simulation) => {
  if (!simulation.pathMetrics) simulation.pathMetrics = getPathMetrics(simulation.level.path);
  for (const enemy of simulation.enemies) initializeSpawnedEnemy(simulation, enemy);
  simulation.effects = simulation.effects.filter((effect) => effect.expiresAtTick > simulation.tick);
  rebuildEffectIndex(simulation);
  triggerTelegraphs(simulation);
  for (const enemy of [...simulation.enemies]) {
    if (enemy.health <= 0) continue;
    updateBossThresholds(simulation, enemy);
    updateEnemyAbilities(simulation, enemy);
  }
  applyIronwardenAuras(simulation);
  updateTowers(simulation);
  processProjectiles(simulation);
  moveEnemies(simulation);
  resolveEnemies(simulation);
  awardCompletedWaves(simulation);
};
