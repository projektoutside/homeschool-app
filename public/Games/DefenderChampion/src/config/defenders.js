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
    placementLayer: 'road',
    combatLayer: 'frontline',
    costs: [50, 60, 90],
    maxHealth: [420, 560, 720],
    armor: [0.10, 0.14, 0.18],
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
    placementLayer: 'grass',
    combatLayer: 'backline',
    costs: [70, 85, 120],
    maxHealth: [1, 1, 1],
    armor: [0, 0, 0],
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
    placementLayer: 'road',
    combatLayer: 'frontline',
    costs: [120, 145, 205],
    maxHealth: [850, 1120, 1450],
    armor: [0.28, 0.34, 0.40],
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
    placementLayer: 'grass',
    combatLayer: 'backline',
    costs: [150, 180, 255],
    maxHealth: [1, 1, 1],
    armor: [0, 0, 0],
    targetPriority: 'densest-cluster',
    mastery: 'double-detonation',
    damage: [36, 36, 36],
    range: [72, 80, 90],
    cooldownTicks: [84, 76, 68],
    projectileTicks: 4,
    splashRadius: 60,
    masteryArmorPierce: 0.35,
    masteryAttackCount: 4,
    masteryDelayTicks: 8,
  }),
});
