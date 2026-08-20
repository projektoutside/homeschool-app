import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFENDERS } from '../public/Games/DefenderChampion/src/config/defenders.js';
import { EFFECT_LIMITS, ENEMIES } from '../public/Games/DefenderChampion/src/config/enemies.js';
import { LEVELS, getLevel } from '../public/Games/DefenderChampion/src/config/levels.js';
import { REFERENCE_STRATEGIES } from '../public/Games/DefenderChampion/src/config/reference-strategies.js';
import { cellCenter } from '../public/Games/DefenderChampion/src/core/grid-geometry.js';
import {
  createSimulation,
  issueCommand,
  summarizeSimulation,
} from '../public/Games/DefenderChampion/src/core/simulation.js';

const minimumGrassRoadDistance = (level, cells = level.cells.filter(({ terrain }) => terrain === 'grass')) => (
  Math.min(...cells.flatMap((cell) => level.roadCells.map((roadCellId) => {
    const first = cellCenter(cell.id);
    const second = cellCenter(roadCellId);
    return Math.hypot(first.x - second.x, first.y - second.y);
  })))
);

test('defender economy matches the approved contract', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(DEFENDERS).map(([id, value]) => [id, value.costs])),
    {
      bladeguard: [50, 60, 90],
      ranger: [70, 85, 120],
      ironwarden: [120, 145, 205],
      'rune-artificer': [150, 180, 255],
    },
  );
});

test('defender placement roles and durability values match the approved contract', () => {
  assert.deepEqual(
    Object.fromEntries(Object.values(DEFENDERS).map((defender) => [defender.id, [
      defender.placementLayer,
      defender.combatLayer,
    ]])),
    {
      bladeguard: ['road', 'frontline'],
      ranger: ['grass', 'backline'],
      ironwarden: ['road', 'frontline'],
      'rune-artificer': ['grass', 'backline'],
    },
  );
  assert.deepEqual(
    Object.fromEntries(Object.values(DEFENDERS).map((defender) => [defender.id, [
      defender.maxHealth,
      defender.armor,
    ]])),
    {
      bladeguard: [[420, 560, 720], [0.10, 0.14, 0.18]],
      ranger: [[1, 1, 1], [0, 0, 0]],
      ironwarden: [[850, 1120, 1450], [0.28, 0.34, 0.40]],
      'rune-artificer': [[1, 1, 1], [0, 0, 0]],
    },
  );
});

test('all nested combat config is immutable and Ranger mastery target count is authored', () => {
  for (const defender of Object.values(DEFENDERS)) {
    for (const key of ['costs', 'damage', 'range', 'cooldownTicks']) {
      assert.equal(Object.isFrozen(defender[key]), true, `${defender.id}.${key} should be frozen`);
    }
  }
  assert.equal(DEFENDERS.ranger.masteryTargetCount, 3);
  assert.throws(() => {
    DEFENDERS.ranger.damage[0] = 999;
  }, TypeError);

  assert.equal(Object.isFrozen(ENEMIES['ironhide-warlord'].plateThresholds), true);
  assert.equal(Object.isFrozen(ENEMIES['ironhide-warlord'].plateArmorBonuses), true);
  assert.equal(Object.isFrozen(ENEMIES['dread-colossus'].summonThresholds), true);
});

test('square-cell centers establish the exact ranged coverage floor without rewriting balance', () => {
  assert.equal(DEFENDERS.ranger.range[0], 190);
  assert.equal(DEFENDERS['rune-artificer'].range[0], 72);

  assert.equal(Math.min(...LEVELS.map((level) => minimumGrassRoadDistance(level))), 80);
  assert.equal(
    Math.min(...LEVELS.map((level) => minimumGrassRoadDistance(level))) <= DEFENDERS.ranger.range[0],
    true,
  );

  for (const levelId of ['level-7', 'level-10']) {
    const level = getLevel(levelId);
    const firstGrassPad = level.pads.find(({ cellId }) => (
      level.cells.find(({ id }) => id === cellId)?.terrain === 'grass'
    ));
    assert.equal(
      minimumGrassRoadDistance(level, [{ id: firstGrassPad.cellId }]),
      80,
      `${levelId} first grass translation cell must touch the road by one square edge`,
    );
    const nonAdjacentGrass = level.cells.find((cell) => (
      cell.terrain === 'grass'
      && minimumGrassRoadDistance(level, [{ id: cell.id }]) > 80
    ));
    assert.ok(nonAdjacentGrass, `${levelId} fixture must contain a non-adjacent mutation candidate`);
    assert.notEqual(
      minimumGrassRoadDistance(level, [{ id: nonAdjacentGrass.id }]),
      80,
      `${levelId} exact equality must reject a grass translation farther than one square edge`,
    );
  }
});

test('Rune Artificer keeps the legal two-hit floor without exceeding its damage cap', () => {
  const runeDamage = DEFENDERS['rune-artificer'].damage;
  assert.deepEqual(runeDamage, [36, 36, 36]);
  assert.equal(runeDamage.every((damage, index) => index === 0 || damage >= runeDamage[index - 1]), true);
  assert.equal(Math.max(...runeDamage), 36);
});

test('campaign and effect ceilings are exact', () => {
  assert.equal(LEVELS.length, 10);
  assert.deepEqual(LEVELS.map((level) => level.waveCount), [3, 4, 4, 5, 5, 5, 6, 6, 7, 8]);
  assert.deepEqual(LEVELS.map((level) => level.startingCoins), Array(10).fill(150));
  assert.deepEqual(LEVELS.map((level) => level.castleHearts), Array(10).fill(3));
  assert.deepEqual(EFFECT_LIMITS, {
    armorReductionMax: 0.65,
    slowMax: 0.40,
    supportSpeedMax: 0.25,
    supportHealingPerSecondMax: 0.03,
    standardStunSecondsMax: 1.5,
    standardStunImmunitySeconds: 2,
    bossStunSecondsMax: 0.5,
    bossStunImmunitySeconds: 4,
  });
  assert.equal(ENEMIES['dread-colossus'].castleDamage, 3);
  assert.deepEqual(ENEMIES['dread-colossus'].phaseThresholds, {
    phase2: 0.75,
    phase3: 0.40,
  });
  assert.equal(Object.isFrozen(ENEMIES['dread-colossus'].phaseThresholds), true);
});

test('levels are immutable authored shells with legal mixed strategy fixtures', () => {
  const expectedMeta = [
    ['level-1', 'Meadow Watch', 1, 100],
    ['level-2', 'Quickstep Grove', 1.12, 135],
    ['level-3', 'Iron Trail', 1.25, 175],
    ['level-4', "Brute's Crossing", 1.52, 225],
    ['level-5', 'Twisting Thicket', 1.34, 285],
    ['level-6', 'Moonlit Rush', 1.48, 350],
    ['level-7', "Warlord's March", 1.48, 430],
    ['level-8', 'Fogbound Siege', 1.58, 525],
    ['level-9', 'The Last Green', 1.68, 640],
    ['level-10', "Champion's Stand", 1.88, 800],
  ];
  assert.equal(Object.isFrozen(LEVELS), true);
  for (const [index, level] of LEVELS.entries()) {
    const [id, name, healthScale, threatIndex] = expectedMeta[index];
    assert.equal(level.id, id);
    assert.equal(level.name, name);
    assert.equal(level.healthScale, healthScale);
    assert.equal(level.threatIndex, threatIndex);
    assert.equal(Object.isFrozen(level), true);
    assert.equal(getLevel(id), level);
    assert.equal(Object.hasOwn(level, 'path'), false);
    assert.equal(level.pads.length, 8);
    assert.equal(new Set(level.pads.map((pad) => pad.id)).size, level.pads.length);
    assert.equal(level.pads.every((pad) => (
      Object.keys(pad).sort().join(',') === 'cellId,id'
      && level.cells.some(({ id }) => id === pad.cellId)
    )), true);
    assert.equal(level.waves.length, level.waveCount);
    assert.equal(level.referenceStrategies.length, 2);
    assert.equal(new Set(level.referenceStrategies).size, 2);

    const [firstStrategyId, secondStrategyId] = level.referenceStrategies;
    const first = REFERENCE_STRATEGIES[firstStrategyId];
    const second = REFERENCE_STRATEGIES[secondStrategyId];
    assert.equal(Object.isFrozen(first), true);
    assert.equal(Object.isFrozen(second), true);
    assert.equal(first.every((command) => ['build', 'upgrade', 'upgrade-ref'].includes(command.type) && command.tick >= 0), true);
    assert.equal(second.every((command) => ['build', 'upgrade', 'upgrade-ref'].includes(command.type) && command.tick >= 0), true);

    for (const [strategyId, strategy] of [[firstStrategyId, first], [secondStrategyId, second]]) {
      const pads = new Map(level.pads.map((pad) => [pad.id, pad]));
      const openingBuilds = strategy.filter((command) => command.tick === 0);
      const openingExpectation = strategyId === 'level-4-balanced' ? 1 : 2;
      assert.equal(openingBuilds.length, openingExpectation, `${strategyId} opens with its authored early placement count`);
      assert.equal(openingBuilds.every((command) => command.type === 'build'), true);
      if (openingExpectation === 2) {
        assert.deepEqual(
          openingBuilds.map((command) => DEFENDERS[command.defenderId].placementLayer).sort(),
          ['grass', 'road'],
        );
      } else {
        assert.deepEqual(
          openingBuilds.map((command) => DEFENDERS[command.defenderId].placementLayer),
          ['road'],
        );
      }
      assert.ok(
        openingBuilds.reduce((total, command) => total + DEFENDERS[command.defenderId].costs[0], 0)
          <= level.startingCoins,
      );

      const buildCommands = strategy.filter((command) => command.type === 'build');
      for (const command of buildCommands) {
        const defender = DEFENDERS[command.defenderId];
        assert.ok(defender, `${level.id} has unknown ${command.defenderId}`);
        const cellId = command.cellId ?? pads.get(command.padId)?.cellId;
        assert.ok(cellId, `${level.id} has unknown placement for ${command.defenderId}`);
        assert.equal(
          level.cells.find(({ id }) => id === cellId)?.terrain,
          defender.placementLayer,
          `${command.defenderId} cannot use ${cellId}`,
        );
      }

      const thirdBuildIndex = strategy.findIndex((command, index) => (
        command.type === 'build' && strategy.slice(0, index + 1)
          .filter((candidate) => candidate.type === 'build').length === 3
      ));
      if (thirdBuildIndex >= 0 && Number.parseInt(level.id.replace('level-', ''), 10) >= 7) {
        assert.ok(
          strategy.slice(0, thirdBuildIndex).some((command) => ['upgrade', 'upgrade-ref'].includes(command.type)),
          `${level.id} upgrades before speculative extra builds`,
        );
      }
    }

    const firstPlacements = new Set(first.filter(({ type }) => type === 'build').map((command) => command.cellId ?? level.pads.find((pad) => pad.id === command.padId)?.cellId));
    const secondPlacements = new Set(second.filter(({ type }) => type === 'build').map((command) => command.cellId ?? level.pads.find((pad) => pad.id === command.padId)?.cellId));
    const occupiedPlacements = new Set([...firstPlacements, ...secondPlacements]);
    const differingPlacements = [...occupiedPlacements].filter((cellId) => firstPlacements.has(cellId) !== secondPlacements.has(cellId));
    assert.ok(differingPlacements.length >= 1, `${level.id} reference strategies must differ by at least one placement`);
  }

  assert.throws(
    () => getLevel('missing-level'),
    (error) => error.message === 'Unknown level: missing-level',
  );
});

test('simplified pad translation accepts legacy strategy commands and snapshots only cell IDs', () => {
  const level = getLevel('level-1');
  assert.deepEqual(level.pads.slice(0, 2), [
    { id: 'l1-pad-a', cellId: 'r2c7' },
    { id: 'l1-pad-b', cellId: 'r0c5' },
  ]);

  const simulation = createSimulation('level-1');
  const firstCommand = REFERENCE_STRATEGIES['level-1-balanced'][0];
  assert.deepEqual(firstCommand, {
    type: 'build', tick: 0, ref: 'frontline-a', defenderId: 'bladeguard', cellId: 'r2c6',
  });
  assert.deepEqual(issueCommand(simulation, firstCommand), { accepted: true, reason: null });
  assert.deepEqual(summarizeSimulation(simulation).towers[0], {
    armor: 0.1,
    attackCount: 0,
    cellId: 'r2c6',
    combatLayer: 'frontline',
    defenderId: 'bladeguard',
    engagedEnemyIds: [],
    health: 420,
    id: 'tower-1',
    masteryProgress: 0,
    maxHealth: 420,
    nextAttackTick: 0,
    placementLayer: 'road',
    tier: 0,
    totalInvested: 50,
  });
});

test('reference strategies are immutable and commands are chronologically authored', () => {
  for (const strategy of Object.values(REFERENCE_STRATEGIES)) {
    assert.equal(Object.isFrozen(strategy), true);
    assert.deepEqual([...strategy].sort((first, second) => first.tick - second.tick), strategy);
  }
});
