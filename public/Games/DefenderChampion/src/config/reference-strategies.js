const freezeCommands = (commands) => Object.freeze(
  commands.map((command) => Object.freeze({ ...command })),
);

const build = (tick, ref, defenderId, cellId) => ({
  tick,
  type: 'build',
  ref,
  defenderId,
  cellId,
});

const upgradeRef = (tick, ref) => ({ tick, type: 'upgrade-ref', ref });

const buildLegacy = (levelNumber, tick, defenderId, pad) => ({
  tick,
  type: 'build',
  defenderId,
  padId: `l${levelNumber}-pad-${pad}`,
});

const upgradeLegacy = (tick, towerId) => ({ tick, type: 'upgrade', towerId });

const EARLY_CELL_BLUEPRINTS = Object.freeze({
  'level-1': { roads: ['r2c6', 'r4c3', 'r7c5', 'r9c5'], grass: ['r1c6', 'r3c3', 'r6c5', 'r8c5'] },
  'level-2': { roads: ['r2c4', 'r6c8', 'r8c5', 'r10c6'], grass: ['r1c4', 'r7c8', 'r7c5', 'r9c6'] },
  'level-3': { roads: ['r1c3', 'r5c1', 'r7c8', 'r9c5'], grass: ['r1c2', 'r4c1', 'r6c8', 'r8c5'] },
  'level-4': { roads: ['r2c4', 'r4c3', 'r7c7', 'r9c5'], grass: ['r1c4', 'r4c2', 'r7c8', 'r9c4'] },
  'level-5': { roads: ['r2c2', 'r6c7', 'r8c2', 'r9c6'], grass: ['r2c1', 'r6c8', 'r7c2', 'r9c5'] },
  'level-6': { roads: ['r1c8', 'r5c3', 'r7c6', 'r9c4'], grass: ['r0c8', 'r4c3', 'r6c6', 'r8c4'] },
});

const roadCell = (levelId, index) => EARLY_CELL_BLUEPRINTS[levelId].roads[index];
const grassCell = (levelId, index) => EARLY_CELL_BLUEPRINTS[levelId].grass[index];

export const REFERENCE_STRATEGIES = Object.freeze({
  'level-1-balanced': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', roadCell('level-1', 0)),
    build(0, 'cover-a', 'ranger', grassCell('level-1', 0)),
    upgradeRef(600, 'cover-a'),
  ]),
  'level-1-artillery': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', roadCell('level-1', 1)),
    build(0, 'cover-a', 'ranger', grassCell('level-1', 1)),
    build(2100, 'frontline-b', 'ironwarden', roadCell('level-1', 2)),
  ]),
  'level-2-balanced': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', roadCell('level-2', 0)),
    build(0, 'cover-a', 'ranger', grassCell('level-2', 0)),
    upgradeRef(600, 'cover-a'),
  ]),
  'level-2-artillery': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', roadCell('level-2', 1)),
    build(0, 'cover-a', 'ranger', grassCell('level-2', 1)),
    build(18000, 'cover-b', 'rune-artificer', grassCell('level-2', 2)),
  ]),
  'level-3-balanced': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', roadCell('level-3', 0)),
    build(0, 'cover-a', 'ranger', grassCell('level-3', 0)),
    upgradeRef(600, 'cover-a'),
  ]),
  'level-3-artillery': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', roadCell('level-3', 1)),
    build(0, 'cover-a', 'ranger', grassCell('level-3', 1)),
    build(18000, 'cover-b', 'rune-artificer', grassCell('level-3', 2)),
  ]),
  'level-4-balanced': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', roadCell('level-4', 0)),
    build(34920, 'cover-a', 'ranger', grassCell('level-4', 0)),
    build(34920, 'frontline-b', 'ironwarden', roadCell('level-4', 2)),
    build(34980, 'cover-b', 'ranger', grassCell('level-4', 3)),
    build(37950, 'frontline-a', 'bladeguard', roadCell('level-4', 0)),
  ]),
  'level-4-artillery': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', roadCell('level-4', 0)),
    build(0, 'cover-a', 'ranger', grassCell('level-4', 1)),
    build(6000, 'cover-b', 'rune-artificer', grassCell('level-4', 3)),
  ]),
  'level-5-balanced': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', roadCell('level-5', 0)),
    build(0, 'cover-a', 'ranger', grassCell('level-5', 0)),
    upgradeRef(300, 'cover-a'),
  ]),
  'level-5-artillery': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', roadCell('level-5', 0)),
    build(0, 'cover-a', 'ranger', grassCell('level-5', 2)),
    build(18000, 'cover-b', 'rune-artificer', grassCell('level-5', 3)),
  ]),
  'level-6-balanced': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', roadCell('level-6', 0)),
    build(0, 'cover-a', 'ranger', grassCell('level-6', 0)),
    upgradeRef(300, 'cover-a'),
  ]),
  'level-6-artillery': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', roadCell('level-6', 1)),
    build(0, 'cover-a', 'ranger', grassCell('level-6', 1)),
    build(22000, 'cover-b', 'rune-artificer', grassCell('level-6', 2)),
  ]),
  'level-7-balanced': freezeCommands([
    buildLegacy(7, 0, 'bladeguard', 'a'),
    buildLegacy(7, 0, 'ranger', 'b'),
    upgradeLegacy(3600, 'tower-2'),
    upgradeLegacy(4800, 'tower-2'),
    buildLegacy(7, 6000, 'ironwarden', 'c'),
    buildLegacy(7, 7200, 'ironwarden', 'e'),
    buildLegacy(7, 9000, 'bladeguard', 'a'),
  ]),
  'level-7-artillery': freezeCommands([
    buildLegacy(7, 0, 'bladeguard', 'c'),
    buildLegacy(7, 0, 'ranger', 'd'),
    upgradeLegacy(6000, 'tower-1'),
    upgradeLegacy(7500, 'tower-1'),
    buildLegacy(7, 9000, 'ironwarden', 'e'),
    buildLegacy(7, 10500, 'ironwarden', 'g'),
    buildLegacy(7, 12000, 'ranger', 'h'),
  ]),
  'level-8-balanced': freezeCommands([
    buildLegacy(8, 0, 'bladeguard', 'a'),
    buildLegacy(8, 0, 'ranger', 'b'),
    upgradeLegacy(3600, 'tower-1'),
    upgradeLegacy(4800, 'tower-1'),
    buildLegacy(8, 6000, 'bladeguard', 'c'),
    buildLegacy(8, 7500, 'bladeguard', 'e'),
    buildLegacy(8, 9000, 'ranger', 'f'),
  ]),
  'level-8-artillery': freezeCommands([
    buildLegacy(8, 0, 'bladeguard', 'c'),
    buildLegacy(8, 0, 'ranger', 'd'),
    upgradeLegacy(4800, 'tower-2'),
    upgradeLegacy(6000, 'tower-2'),
    buildLegacy(8, 7500, 'rune-artificer', 'b'),
    buildLegacy(8, 9000, 'rune-artificer', 'f'),
    buildLegacy(8, 10500, 'ironwarden', 'e'),
  ]),
  'level-9-balanced': freezeCommands([
    buildLegacy(9, 0, 'bladeguard', 'a'),
    buildLegacy(9, 0, 'ranger', 'b'),
    upgradeLegacy(4800, 'tower-2'),
    upgradeLegacy(6000, 'tower-2'),
    buildLegacy(9, 7500, 'ironwarden', 'c'),
    buildLegacy(9, 9000, 'ironwarden', 'e'),
    buildLegacy(9, 10500, 'ranger', 'h'),
  ]),
  'level-9-artillery': freezeCommands([
    buildLegacy(9, 0, 'bladeguard', 'c'),
    buildLegacy(9, 0, 'ranger', 'd'),
    upgradeLegacy(7000, 'tower-1'),
    upgradeLegacy(8000, 'tower-1'),
    buildLegacy(9, 9000, 'ironwarden', 'e'),
    buildLegacy(9, 10500, 'ironwarden', 'g'),
    buildLegacy(9, 12000, 'rune-artificer', 'b'),
  ]),
  'level-10-balanced': freezeCommands([
    buildLegacy(10, 0, 'bladeguard', 'a'),
    buildLegacy(10, 0, 'ranger', 'b'),
    upgradeLegacy(3600, 'tower-2'),
    upgradeLegacy(4800, 'tower-2'),
    buildLegacy(10, 6000, 'ironwarden', 'c'),
    buildLegacy(10, 7000, 'rune-artificer', 'f'),
    buildLegacy(10, 9500, 'ranger', 'h'),
    buildLegacy(10, 10000, 'bladeguard', 'a'),
  ]),
  'level-10-artillery': freezeCommands([
    buildLegacy(10, 0, 'bladeguard', 'c'),
    buildLegacy(10, 0, 'ranger', 'd'),
    upgradeLegacy(6000, 'tower-1'),
    upgradeLegacy(7000, 'tower-1'),
    buildLegacy(10, 8000, 'ironwarden', 'e'),
    buildLegacy(10, 9000, 'ironwarden', 'g'),
    buildLegacy(10, 10500, 'rune-artificer', 'b'),
    buildLegacy(10, 12000, 'ranger', 'h'),
  ]),
});
