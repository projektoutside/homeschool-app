const freezeDefender = (defender) => Object.freeze({
  ...defender,
  costs: Object.freeze([...defender.costs]),
});

export const DEFENDERS = Object.freeze({
  bladeguard: freezeDefender({
    id: 'bladeguard',
    costs: [50, 60, 90],
    targetPriority: 'closest-to-castle',
    mastery: 'whirlwind',
    damage: [12, 18, 28],
    range: [80, 88, 96],
    cooldownTicks: [30, 28, 26],
  }),
  ranger: freezeDefender({
    id: 'ranger',
    costs: [70, 85, 120],
    targetPriority: 'fastest',
    mastery: 'critical-volley',
    damage: [18, 27, 42],
    range: [190, 202, 216],
    cooldownTicks: [46, 42, 38],
  }),
  ironwarden: freezeDefender({
    id: 'ironwarden',
    costs: [120, 145, 205],
    targetPriority: 'highest-armor',
    mastery: 'rally-bash',
    damage: [28, 42, 65],
    range: [132, 142, 154],
    cooldownTicks: [66, 60, 54],
  }),
  'rune-artificer': freezeDefender({
    id: 'rune-artificer',
    costs: [150, 180, 255],
    targetPriority: 'densest-cluster',
    mastery: 'double-detonation',
    damage: [44, 66, 102],
    range: [166, 178, 192],
    cooldownTicks: [84, 76, 68],
  }),
});
