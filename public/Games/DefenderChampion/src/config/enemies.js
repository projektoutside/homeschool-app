export const EFFECT_LIMITS = Object.freeze({
  armorReductionMax: 0.65,
  slowMax: 0.40,
  supportSpeedMax: 0.25,
  supportHealingPerSecondMax: 0.03,
  standardStunSecondsMax: 1.5,
  standardStunImmunitySeconds: 2,
  bossStunSecondsMax: 0.5,
  bossStunImmunitySeconds: 4,
});

export const COMBAT_RULES = Object.freeze({
  ticksPerSecond: 60,
  movementScale: 0.09,
  waveCompletionScore: 35,
  castleHeartScore: 100,
  parTimeScore: 180,
  unspentCoinScoreCap: 120,
  enemySpeedMultiplierMax: 1.20,
  supportArmorMax: 0.15,
});

const freezeNested = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeNested(child);
    Object.freeze(value);
  }
  return value;
};

const freezeEnemy = (enemy) => freezeNested({ ...enemy });

export const ENEMIES = Object.freeze({
  'blight-walker': freezeEnemy({
    id: 'blight-walker', health: 58, speed: 42, bounty: 12, armor: 0, cooldownTicks: 0, castleDamage: 1,
    attackDamage: 18, attackCooldownTicks: 72, attackWindupTicks: 22,
    attackTargets: Object.freeze(['frontline']),
  }),
  skitter: freezeEnemy({
    id: 'skitter', health: 38, speed: 66, bounty: 13, armor: 0, cooldownTicks: 0, castleDamage: 1,
    attackDamage: 11, attackCooldownTicks: 42, attackWindupTicks: 14,
    attackTargets: Object.freeze(['frontline']),
  }),
  swarmkin: freezeEnemy({
    id: 'swarmkin', health: 27, speed: 50, bounty: 7, armor: 0, cooldownTicks: 0, castleDamage: 1,
    attackDamage: 8, attackCooldownTicks: 54, attackWindupTicks: 16,
    attackTargets: Object.freeze(['frontline']),
  }),
  shellguard: freezeEnemy({
    id: 'shellguard', health: 160, speed: 29, bounty: 27, armor: 0.55, cooldownTicks: 0, castleDamage: 1,
    attackDamage: 28, attackCooldownTicks: 96, attackWindupTicks: 30,
    attackTargets: Object.freeze(['frontline']),
  }),
  hexcaller: freezeEnemy({
    id: 'hexcaller', health: 110, speed: 34, bounty: 30, armor: 0.15, cooldownTicks: 180, castleDamage: 1,
    attackDamage: 12, attackCooldownTicks: 90, attackWindupTicks: 28,
    attackTargets: Object.freeze(['frontline']),
    supportRadius: 145, supportDurationTicks: 180, supportSpeed: 0.20, supportHealingPerSecond: 0.03,
  }),
  crusher: freezeEnemy({
    id: 'crusher', health: 800, speed: 24, bounty: 120, armor: 0.30, cooldownTicks: 0, castleDamage: 2,
    attackDamage: 62, attackCooldownTicks: 108, attackWindupTicks: 34,
    attackTargets: Object.freeze(['frontline']),
  }),
  'mossback-brute': freezeEnemy({
    id: 'mossback-brute', health: 1100, speed: 25, bounty: 190, armor: 0.20, cooldownTicks: 600, castleDamage: 2,
    attackDamage: 78, attackCooldownTicks: 102, attackWindupTicks: 36,
    attackTargets: Object.freeze(['frontline']),
    telegraphTicks: 60, stunSeconds: 1.5, abilityRadius: 150,
  }),
  'ironhide-warlord': freezeEnemy({
    id: 'ironhide-warlord', health: 12000, speed: 36, bounty: 370, armor: 0.35, cooldownTicks: 480, castleDamage: 2,
    attackDamage: 92, attackCooldownTicks: 96, attackWindupTicks: 32,
    attackTargets: Object.freeze(['frontline']),
    rallyRadius: 165, rallyDurationTicks: 180, rallyTelegraphTicks: 60, rallySpeed: 0.20, rallyArmor: 0.15,
    plateThresholds: Object.freeze([0.75, 0.50, 0.25]),
    plateArmorBonuses: Object.freeze([0.15, 0.10, 0.05]), vulnerableTicks: 180,
  }),
  'dread-colossus': freezeEnemy({
    id: 'dread-colossus', health: 1530, speed: 26, bounty: 900, armor: 0.25, cooldownTicks: 720, castleDamage: 3,
    attackDamage: 120, attackCooldownTicks: 114, attackWindupTicks: 40,
    attackTargets: Object.freeze(['frontline']),
    phaseThresholds: Object.freeze({ phase2: 0.75, phase3: 0.40 }),
    phase2Armor: 0.20, phase3Speed: 0.20,
    summonThresholds: Object.freeze([0.75, 0.50, 0.25]), summonCount: 6,
    summonTelegraphTicks: 60, summonWarningRadius: 84,
    pulseTelegraphTicks: 75, pulseDurationTicks: 180, pulseSlow: 0.25, pulseRadius: 190,
  }),
});
