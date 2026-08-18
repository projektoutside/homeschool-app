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

const freezeEnemy = (enemy) => Object.freeze({ ...enemy });

export const ENEMIES = Object.freeze({
  'blight-walker': freezeEnemy({
    id: 'blight-walker', health: 58, speed: 42, bounty: 12, armor: 0, cooldownTicks: 0, castleDamage: 1,
  }),
  skitter: freezeEnemy({
    id: 'skitter', health: 38, speed: 66, bounty: 13, armor: 0, cooldownTicks: 0, castleDamage: 1,
  }),
  swarmkin: freezeEnemy({
    id: 'swarmkin', health: 27, speed: 50, bounty: 7, armor: 0, cooldownTicks: 0, castleDamage: 1,
  }),
  shellguard: freezeEnemy({
    id: 'shellguard', health: 160, speed: 29, bounty: 27, armor: 0.55, cooldownTicks: 0, castleDamage: 1,
  }),
  hexcaller: freezeEnemy({
    id: 'hexcaller', health: 110, speed: 34, bounty: 30, armor: 0.15, cooldownTicks: 180, castleDamage: 1,
  }),
  crusher: freezeEnemy({
    id: 'crusher', health: 420, speed: 24, bounty: 72, armor: 0.30, cooldownTicks: 0, castleDamage: 2,
  }),
  'mossback-brute': freezeEnemy({
    id: 'mossback-brute', health: 1100, speed: 25, bounty: 190, armor: 0.20, cooldownTicks: 600, castleDamage: 2,
  }),
  'ironhide-warlord': freezeEnemy({
    id: 'ironhide-warlord', health: 2300, speed: 28, bounty: 370, armor: 0.35, cooldownTicks: 480, castleDamage: 2,
  }),
  'dread-colossus': freezeEnemy({
    id: 'dread-colossus', health: 5000, speed: 26, bounty: 900, armor: 0.25, cooldownTicks: 720, castleDamage: 3,
  }),
});
