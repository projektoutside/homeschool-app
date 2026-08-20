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

const LATE_CELL_BLUEPRINTS = Object.freeze({
  'level-7': { roads: ['r2c2', 'r4c4', 'r6c8', 'r8c3'], grass: ['r0c4', 'r1c7', 'r4c0', 'r5c7'] },
  'level-8': { roads: ['r2c4', 'r4c4', 'r6c6', 'r8c5'], grass: ['r0c3', 'r1c6', 'r3c1', 'r3c3'] },
  'level-9': { roads: ['r2c3', 'r5c6', 'r8c3', 'r10c8'], grass: ['r0c2', 'r3c6', 'r4c2', 'r5c5'] },
  'level-10': { roads: ['r2c6', 'r5c4', 'r8c8', 'r9c1'], grass: ['r0c3', 'r1c7', 'r4c0', 'r5c7'] },
});

const roadCell = (levelId, index) => EARLY_CELL_BLUEPRINTS[levelId].roads[index];
const grassCell = (levelId, index) => EARLY_CELL_BLUEPRINTS[levelId].grass[index];
const lateRoadCell = (levelId, index) => LATE_CELL_BLUEPRINTS[levelId].roads[index];
const lateGrassCell = (levelId, index) => LATE_CELL_BLUEPRINTS[levelId].grass[index];

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
    build(0, 'frontline-a', 'bladeguard', lateRoadCell('level-7', 0)),
    build(0, 'cover-a', 'ranger', lateGrassCell('level-7', 0)),
    upgradeRef(3600, 'cover-a'),
    upgradeRef(4800, 'cover-a'),
    build(6000, 'frontline-b', 'ironwarden', lateRoadCell('level-7', 1)),
    build(7200, 'frontline-c', 'ironwarden', lateRoadCell('level-7', 2)),
    build(18040, 'frontline-a', 'bladeguard', lateRoadCell('level-7', 0)),
    build(32000, 'cover-b', 'ranger', lateGrassCell('level-7', 3)),
  ]),
  'level-7-artillery': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', lateRoadCell('level-7', 1)),
    build(0, 'cover-a', 'ranger', lateGrassCell('level-7', 1)),
    upgradeRef(6000, 'frontline-a'),
    upgradeRef(7500, 'frontline-a'),
    build(9000, 'frontline-b', 'ironwarden', lateRoadCell('level-7', 2)),
    build(10500, 'frontline-c', 'ironwarden', lateRoadCell('level-7', 3)),
    build(12000, 'cover-b', 'ranger', lateGrassCell('level-7', 3)),
    build(18000, 'cover-c', 'rune-artificer', lateGrassCell('level-7', 2)),
    build(26000, 'cover-d', 'ranger', lateGrassCell('level-7', 0)),
  ]),
  'level-8-balanced': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', lateRoadCell('level-8', 0)),
    build(0, 'cover-a', 'ranger', lateGrassCell('level-8', 0)),
    upgradeRef(3600, 'frontline-a'),
    upgradeRef(4800, 'frontline-a'),
    build(6000, 'frontline-b', 'bladeguard', lateRoadCell('level-8', 1)),
    build(7500, 'frontline-c', 'bladeguard', lateRoadCell('level-8', 2)),
    build(9000, 'cover-b', 'ranger', lateGrassCell('level-8', 2)),
  ]),
  'level-8-artillery': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', lateRoadCell('level-8', 0)),
    build(0, 'cover-a', 'ranger', lateGrassCell('level-8', 0)),
    upgradeRef(3600, 'cover-a'),
    upgradeRef(4800, 'cover-a'),
    build(6000, 'frontline-b', 'ironwarden', lateRoadCell('level-8', 2)),
    build(9000, 'cover-b', 'rune-artificer', lateGrassCell('level-8', 3)),
    build(12000, 'cover-c', 'ranger', lateGrassCell('level-8', 1)),
  ]),
  'level-9-balanced': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', lateRoadCell('level-9', 1)),
    build(0, 'cover-a', 'ranger', lateGrassCell('level-9', 1)),
    upgradeRef(7000, 'frontline-a'),
    upgradeRef(8000, 'frontline-a'),
    build(9000, 'frontline-b', 'ironwarden', lateRoadCell('level-9', 2)),
    build(15000, 'cover-b', 'ranger', lateGrassCell('level-9', 2)),
    upgradeRef(22000, 'cover-a'),
    build(17000, 'cover-c', 'rune-artificer', lateGrassCell('level-9', 3)),
    build(32000, 'frontline-c', 'ironwarden', lateRoadCell('level-9', 3)),
    build(34000, 'frontline-d', 'bladeguard', lateRoadCell('level-9', 0)),
  ]),
  'level-9-artillery': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', lateRoadCell('level-9', 1)),
    build(0, 'cover-a', 'ranger', lateGrassCell('level-9', 1)),
    upgradeRef(7000, 'frontline-a'),
    upgradeRef(8000, 'frontline-a'),
    build(9000, 'frontline-b', 'ironwarden', lateRoadCell('level-9', 2)),
    build(10500, 'frontline-c', 'ironwarden', lateRoadCell('level-9', 3)),
    build(17000, 'cover-b', 'rune-artificer', lateGrassCell('level-9', 3)),
    build(24000, 'cover-c', 'ranger', lateGrassCell('level-9', 2)),
    upgradeRef(32000, 'cover-b'),
    build(33000, 'cover-d', 'ranger', lateGrassCell('level-9', 0)),
    build(34000, 'frontline-d', 'bladeguard', lateRoadCell('level-9', 0)),
  ]),
  'level-10-balanced': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', lateRoadCell('level-10', 0)),
    build(0, 'cover-a', 'ranger', lateGrassCell('level-10', 0)),
    upgradeRef(3600, 'cover-a'),
    build(6000, 'frontline-b', 'ironwarden', lateRoadCell('level-10', 1)),
    build(7000, 'cover-b', 'rune-artificer', lateGrassCell('level-10', 2)),
    build(9500, 'cover-c', 'ranger', lateGrassCell('level-10', 3)),
    build(20000, 'cover-d', 'rune-artificer', lateGrassCell('level-10', 1)),
    build(30000, 'frontline-a', 'bladeguard', lateRoadCell('level-10', 0)),
  ]),
  'level-10-artillery': freezeCommands([
    build(0, 'frontline-a', 'bladeguard', lateRoadCell('level-10', 0)),
    build(0, 'cover-a', 'ranger', lateGrassCell('level-10', 0)),
    upgradeRef(3600, 'cover-a'),
    upgradeRef(4800, 'cover-a'),
    build(6000, 'frontline-b', 'ironwarden', lateRoadCell('level-10', 1)),
    build(14000, 'frontline-c', 'ironwarden', lateRoadCell('level-10', 2)),
    build(18000, 'cover-b', 'rune-artificer', lateGrassCell('level-10', 2)),
    build(22000, 'cover-c', 'ranger', lateGrassCell('level-10', 3)),
  ]),
});
