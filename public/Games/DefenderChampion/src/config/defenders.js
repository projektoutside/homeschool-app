const freezeNested = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeNested(child);
    Object.freeze(value);
  }
  return value;
};

const freezeDefender = (defender) => freezeNested({ ...defender });

export const DEFENDERS = Object.freeze({
  bladeguard: freezeDefender({
    id: 'bladeguard',
    costs: [50, 60, 90],
    targetPriority: 'closest-to-castle',
    mastery: 'whirlwind',
    damage: [60, 65, 70],
    range: [80, 88, 96],
    cooldownTicks: [30, 28, 26],
    projectileTicks: 1,
    masteryAttackCount: 6,
    masteryRadius: 72,
  }),
  ranger: freezeDefender({
    id: 'ranger',
    costs: [70, 85, 120],
    targetPriority: 'fastest',
    mastery: 'critical-volley',
    damage: [50, 55, 60],
    range: [190, 202, 216],
    cooldownTicks: [46, 42, 38],
    projectileTicks: 3,
    masteryAttackCount: 5,
    masteryMultiplier: 1.8,
    masteryTargetCount: 3,
  }),
  ironwarden: freezeDefender({
    id: 'ironwarden',
    costs: [120, 145, 205],
    targetPriority: 'highest-armor',
    mastery: 'rally-bash',
    damage: [180, 185, 190],
    range: [132, 142, 154],
    cooldownTicks: [66, 60, 54],
    projectileTicks: 2,
    masteryAttackCount: 4,
    stunSeconds: 0.75,
    rallySpeed: 0.18,
    rallyRadius: 150,
  }),
  'rune-artificer': freezeDefender({
    id: 'rune-artificer',
    costs: [150, 180, 255],
    targetPriority: 'densest-cluster',
    mastery: 'double-detonation',
    damage: [28, 32, 36],
    range: [70, 80, 90],
    cooldownTicks: [84, 76, 68],
    projectileTicks: 4,
    splashRadius: 60,
    masteryArmorPierce: 0.35,
    masteryAttackCount: 4,
    masteryDelayTicks: 8,
  }),
});
