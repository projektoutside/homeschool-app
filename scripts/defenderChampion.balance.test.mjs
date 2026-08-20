import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFENDERS } from '../public/Games/DefenderChampion/src/config/defenders.js';
import { LEVELS } from '../public/Games/DefenderChampion/src/config/levels.js';
import { REFERENCE_STRATEGIES } from '../public/Games/DefenderChampion/src/config/reference-strategies.js';
import {
  cellCenter,
  createGridPathMetrics,
  sampleGridPathProgress,
} from '../public/Games/DefenderChampion/src/core/grid-geometry.js';
import {
  advanceSimulation,
  createSimulation,
  issueStrategyCommand,
  issueCommand,
  summarizeSimulation,
} from '../public/Games/DefenderChampion/src/core/simulation.js';

const MAX_STRATEGY_TICKS = 60 * 720;
const METRIC_KEYS = Object.freeze([
  'frontlineDefeats',
  'frontlineRepurchases',
  'damageTakenByDefender',
  'maxQueueDepth',
  'maxConcurrentAttackers',
]);
const EARLY_FIXTURE_EXPECTATIONS = Object.freeze({
  'level-1-balanced': Object.freeze({
    outcome: 'victory', tick: 2086, hearts: 3, score: 958, highest: 'ranger',
    occupied: Object.freeze(['r1c6', 'r2c6']), maxLiving: 3, maxAttackers: 3, purchaseCount: 3,
  }),
  'level-1-artillery': Object.freeze({
    outcome: 'victory', tick: 3289, hearts: 3, score: 938, highest: 'ironwarden',
    occupied: Object.freeze(['r3c3', 'r4c3', 'r7c5']), maxLiving: 14, maxAttackers: 3, purchaseCount: 3,
  }),
  'level-2-balanced': Object.freeze({
    outcome: 'victory', tick: 15588, hearts: 3, score: 1054, highest: 'ranger',
    occupied: Object.freeze(['r1c4', 'r2c4']), maxLiving: 8, maxAttackers: 3, purchaseCount: 2,
  }),
  'level-2-artillery': Object.freeze({
    outcome: 'victory', tick: 34256, hearts: 3, score: 1054, highest: 'rune-artificer',
    occupied: Object.freeze(['r6c8', 'r7c5', 'r7c8']), maxLiving: 16, maxAttackers: 3, purchaseCount: 3,
  }),
  'level-3-balanced': Object.freeze({
    outcome: 'victory', tick: 30569, hearts: 3, score: 1235, highest: 'ranger',
    occupied: Object.freeze(['r1c2', 'r1c3']), maxLiving: 8, maxAttackers: 3, purchaseCount: 2,
  }),
  'level-3-artillery': Object.freeze({
    outcome: 'victory', tick: 30770, hearts: 3, score: 1235, highest: 'rune-artificer',
    occupied: Object.freeze(['r4c1', 'r5c1', 'r6c8']), maxLiving: 16, maxAttackers: 3, purchaseCount: 3,
  }),
  'level-4-balanced': Object.freeze({
    outcome: 'victory', tick: 37972, hearts: 3, score: 1942, highest: 'ranger',
    occupied: Object.freeze(['r1c4', 'r2c4', 'r7c7', 'r9c4']), maxLiving: 10, maxAttackers: 3, purchaseCount: 5,
    frontlineDefeats: 1, frontlineRepurchases: 1,
    replacementPurchase: Object.freeze({
      tick: 37950, type: 'build', defenderId: 'bladeguard', cellId: 'r2c4', cost: 50,
    }),
  }),
  'level-4-artillery': Object.freeze({
    outcome: 'victory', tick: 23444, hearts: 3, score: 1942, highest: 'rune-artificer',
    occupied: Object.freeze(['r2c4', 'r4c2', 'r9c4']), maxLiving: 7, maxAttackers: 3, purchaseCount: 3,
  }),
  'level-5-balanced': Object.freeze({
    outcome: 'victory', tick: 31008, hearts: 3, score: 1125, highest: 'ranger',
    occupied: Object.freeze(['r2c1', 'r2c2']), maxLiving: 9, maxAttackers: 3, purchaseCount: 2,
  }),
  'level-5-artillery': Object.freeze({
    outcome: 'victory', tick: 33596, hearts: 3, score: 1125, highest: 'rune-artificer',
    occupied: Object.freeze(['r2c2', 'r7c2', 'r9c5']), maxLiving: 9, maxAttackers: 3, purchaseCount: 3,
  }),
  'level-6-balanced': Object.freeze({
    outcome: 'victory', tick: 26254, hearts: 3, score: 1412, highest: 'ranger',
    occupied: Object.freeze(['r0c8', 'r1c8']), maxLiving: 8, maxAttackers: 3, purchaseCount: 2,
  }),
  'level-6-artillery': Object.freeze({
    outcome: 'victory', tick: 41285, hearts: 3, score: 1412, highest: 'rune-artificer',
    occupied: Object.freeze(['r4c3', 'r5c3', 'r6c6']), maxLiving: 17, maxAttackers: 3, purchaseCount: 3,
  }),
});
const LATE_FIXTURE_EXPECTATIONS = Object.freeze({
  'level-7-balanced': Object.freeze({
    outcome: 'victory', tick: 24952, hearts: 3, score: 4539, highest: 'ranger',
    occupied: Object.freeze(['r0c4', 'r2c2', 'r4c4', 'r4c7', 'r6c8']),
    maxLiving: 14, maxAttackers: 3, purchaseCount: 8,
    frontlineDefeats: 2, frontlineRepurchases: 1,
    replacementPurchase: Object.freeze({
      tick: 18000, type: 'build', defenderId: 'bladeguard', cellId: 'r2c2', cost: 50,
    }),
  }),
  'level-7-artillery': Object.freeze({
    outcome: 'victory', tick: 25902, hearts: 3, score: 4554, highest: 'rune-artificer',
    occupied: Object.freeze(['r1c4', 'r1c7', 'r3c2', 'r4c4', 'r5c5', 'r6c8']),
    maxLiving: 14, maxAttackers: 3, purchaseCount: 7,
  }),
  'level-8-balanced': Object.freeze({
    outcome: 'victory', tick: 21302, hearts: 3, score: 3732, highest: 'bladeguard',
    occupied: Object.freeze(['r0c3', 'r2c4', 'r3c1', 'r4c4', 'r6c6']),
    maxLiving: 8, maxAttackers: 3, purchaseCount: 7,
  }),
  'level-8-artillery': Object.freeze({
    outcome: 'victory', tick: 42793, hearts: 3, score: 3716, highest: 'rune-artificer',
    occupied: Object.freeze([
      'r0c0', 'r0c2', 'r0c3', 'r1c0', 'r1c2', 'r1c4', 'r1c6', 'r2c0',
      'r3c1', 'r3c2', 'r3c3', 'r3c4', 'r3c5', 'r4c4', 'r6c6',
    ]),
    maxLiving: 14, maxAttackers: 3, purchaseCount: 21,
  }),
  'level-9-balanced': Object.freeze({
    outcome: 'victory', tick: 40590, hearts: 3, score: 3631, highest: 'ironwarden',
    occupied: Object.freeze([
      'r0c5', 'r0c8', 'r10c6', 'r1c4', 'r1c6', 'r1c8', 'r2c4', 'r2c8',
      'r4c4', 'r5c5', 'r6c5', 'r7c6', 'r8c6',
    ]),
    maxLiving: 8, maxAttackers: 3, purchaseCount: 23,
  }),
  'level-9-artillery': Object.freeze({
    outcome: 'victory', tick: 38823, hearts: 3, score: 3631, highest: 'rune-artificer',
    occupied: Object.freeze([
      'r0c6', 'r0c8', 'r10c6', 'r1c6', 'r5c5', 'r6c5', 'r7c6', 'r8c6', 'r9c6',
    ]),
    maxLiving: 17, maxAttackers: 3, purchaseCount: 12,
  }),
  'level-10-balanced': Object.freeze({
    outcome: 'victory', tick: 40492, hearts: 3, score: 7794, highest: 'bladeguard',
    occupied: Object.freeze([
      'r10c3', 'r1c2', 'r1c4', 'r2c4', 'r3c4',
      'r4c4', 'r5c6', 'r6c6', 'r7c6', 'r9c3',
    ]),
    maxLiving: 18, maxAttackers: 3, purchaseCount: 12,
    frontlineDefeats: 4, frontlineRepurchases: 1,
    replacementPurchase: Object.freeze({
      tick: 35000, type: 'build', defenderId: 'bladeguard', cellId: 'r1c2', cost: 50,
    }),
  }),
  'level-10-artillery': Object.freeze({
    outcome: 'victory', tick: 34766, hearts: 3, score: 7819, highest: 'ranger',
    occupied: Object.freeze([
      'r10c3', 'r1c3', 'r2c4', 'r3c4', 'r4c4',
      'r5c6', 'r6c6', 'r7c6', 'r8c6', 'r9c4',
    ]),
    maxLiving: 18, maxAttackers: 3, purchaseCount: 11,
  }),
});
const MONO_FIXTURE_EXPECTATIONS = Object.freeze({
  'level-7:bladeguard': Object.freeze({ tick: 42231, purchases: 13, postZero: 10, maxLiving: 18, maxAttackers: 3 }),
  'level-7:ranger': Object.freeze({ tick: 39366, purchases: 10, postZero: 8, maxLiving: 18, maxAttackers: 0 }),
  'level-7:ironwarden': Object.freeze({ tick: 30931, purchases: 4, postZero: 3, maxLiving: 18, maxAttackers: 3 }),
  'level-7:rune-artificer': Object.freeze({ tick: 39402, purchases: 4, postZero: 3, maxLiving: 18, maxAttackers: 0 }),
  'level-10:bladeguard': Object.freeze({ tick: 39039, purchases: 12, postZero: 9, maxLiving: 18, maxAttackers: 3 }),
  'level-10:ranger': Object.freeze({ tick: 38070, purchases: 10, postZero: 8, maxLiving: 18, maxAttackers: 0 }),
  'level-10:ironwarden': Object.freeze({ tick: 39145, purchases: 5, postZero: 4, maxLiving: 18, maxAttackers: 3 }),
  'level-10:rune-artificer': Object.freeze({ tick: 38064, purchases: 4, postZero: 3, maxLiving: 18, maxAttackers: 0 }),
});

const deterministicEvidence = (summary) => ({
  outcome: summary.outcome,
  tick: summary.tick,
  castleHearts: summary.castleHearts,
  coins: summary.coins,
  score: summary.score,
  medal: summary.medal,
  purchaseHistory: summary.purchaseHistory,
  occupiedCellIds: summary.occupiedCellIds,
  highestSpendDefenderId: summary.highestSpendDefenderId,
  frontlineDefeats: summary.frontlineDefeats,
  frontlineRepurchases: summary.frontlineRepurchases,
  damageTakenByDefender: summary.damageTakenByDefender,
  maxQueueDepth: summary.maxQueueDepth,
  maxConcurrentAttackers: summary.maxConcurrentAttackers,
});

const snapshotFrontline = (simulation) => new Map(simulation.towers
  .filter((tower) => tower.combatLayer === 'frontline')
  .map((tower) => [tower.id, {
    defenderId: tower.defenderId,
    health: tower.health,
    cellId: tower.cellId,
  }]));

const updateLaneMaximums = (metrics, simulation) => {
  const queueDepthByGate = new Map();
  for (const enemy of simulation.enemies) {
    if (enemy.laneState !== 'queued' || !enemy.blockingTowerId) continue;
    queueDepthByGate.set(
      enemy.blockingTowerId,
      (queueDepthByGate.get(enemy.blockingTowerId) ?? 0) + 1,
    );
  }
  metrics.maxQueueDepth = Math.max(metrics.maxQueueDepth, 0, ...queueDepthByGate.values());
  metrics.maxConcurrentAttackers = Math.max(
    metrics.maxConcurrentAttackers,
    0,
    ...simulation.towers.map((tower) => tower.engagedEnemyIds?.length ?? 0),
  );
};

const runInstrumentedStrategyFixture = (levelId, strategyId) => {
  const strategy = REFERENCE_STRATEGIES[strategyId];
  assert.ok(strategy, `Unknown strategy: ${strategyId}`);
  const simulation = createSimulation(levelId, { qa: true });
  const towerRefs = new Map();
  const defeatedCells = new Map();
  const metrics = {
    frontlineDefeats: 0,
    frontlineRepurchases: 0,
    damageTakenByDefender: Object.fromEntries(Object.keys(DEFENDERS).map((id) => [id, 0])),
    maxQueueDepth: 0,
    maxConcurrentAttackers: 0,
  };

  for (let requestedTick = 0; requestedTick < MAX_STRATEGY_TICKS && !simulation.terminal; requestedTick += 1) {
    for (const command of strategy) {
      if (command.tick !== simulation.tick) continue;
      const result = issueStrategyCommand(simulation, command, towerRefs);
      if (result.accepted && command.type === 'build') {
        const defender = DEFENDERS[command.defenderId];
        const builtCellId = simulation.purchaseHistory.at(-1)?.cellId ?? command.cellId ?? null;
        const defeatedAtTick = defeatedCells.get(builtCellId);
        if (defender.combatLayer === 'frontline' && defeatedAtTick < simulation.tick) {
          metrics.frontlineRepurchases += 1;
        }
      }
    }

    const before = snapshotFrontline(simulation);
    advanceSimulation(simulation, 1);
    const after = snapshotFrontline(simulation);
    for (const [towerId, towerBefore] of before) {
      const towerAfter = after.get(towerId);
      const remainingHealth = towerAfter?.health ?? 0;
      metrics.damageTakenByDefender[towerBefore.defenderId] += Math.max(
        0,
        towerBefore.health - remainingHealth,
      );
      if (!towerAfter) {
        metrics.frontlineDefeats += 1;
        defeatedCells.set(towerBefore.cellId, simulation.tick - 1);
      }
    }
    updateLaneMaximums(metrics, simulation);
  }

  return { ...summarizeSimulation(simulation), ...metrics };
};

const compareStrategies = (first, second) => {
  const firstCells = new Set(first.occupiedCellIds);
  const secondCells = new Set(second.occupiedCellIds);
  const occupiedCells = new Set([...firstCells, ...secondCells]);
  const differingCells = [...occupiedCells]
    .filter((cellId) => firstCells.has(cellId) !== secondCells.has(cellId));
  return differingCells.length / occupiedCells.size;
};

const occupiedDifference = (first, second) => {
  const union = new Set([...first.occupiedCellIds, ...second.occupiedCellIds]);
  const shared = first.occupiedCellIds
    .filter((id) => second.occupiedCellIds.includes(id)).length;
  return union.size === 0 ? 0 : (union.size - shared) / union.size;
};

const EXPOSURE_SAMPLE_STEP = 8;
const RANKED_CELL_CACHE = new Map();

const candidateCoverageScore = (level, defender, cell, metrics) => {
  const origin = cellCenter(cell.id);
  const range = defender.range[0];
  let exposureLength = 0;
  let firstExposureProgress = null;
  let furthestExposureProgress = -1;
  for (let progress = 0; progress <= metrics.total; progress += EXPOSURE_SAMPLE_STEP) {
    const point = sampleGridPathProgress(metrics, progress);
    if (Math.hypot(point.x - origin.x, point.y - origin.y) <= range) {
      exposureLength += EXPOSURE_SAMPLE_STEP;
      if (firstExposureProgress === null) firstExposureProgress = progress;
      furthestExposureProgress = progress;
    }
  }
  const cellIndex = level.roadCells.indexOf(cell.id);
  const frontlineBias = defender.combatLayer === 'frontline' ? (cellIndex >= 0 ? cellIndex : -1) : 0;
  return {
    exposureLength,
    firstExposureProgress,
    furthestExposureProgress,
    frontlineBias,
  };
};

const compareCandidateCoverage = (left, right) => (
  (left.firstExposureProgress ?? Number.POSITIVE_INFINITY)
    - (right.firstExposureProgress ?? Number.POSITIVE_INFINITY)
  || right.exposureLength - left.exposureLength
  || right.furthestExposureProgress - left.furthestExposureProgress
  || right.frontlineBias - left.frontlineBias
  || left.cell.id.localeCompare(right.cell.id)
);

const getRankedCells = (level, defender) => {
  const cacheKey = `${level.id}:${defender.id}`;
  const cached = RANKED_CELL_CACHE.get(cacheKey);
  if (cached) return cached;
  const metrics = createGridPathMetrics(level.roadCells);
  const ranked = level.cells
    .filter((cell) => cell.terrain === defender.placementLayer)
    .map((cell) => ({
      cell,
      ...candidateCoverageScore(level, defender, cell, metrics),
    }))
    .sort(compareCandidateCoverage)
    .map(({ cell }) => cell);
  RANKED_CELL_CACHE.set(cacheKey, ranked);
  return ranked;
};

const chooseBestOpenCell = (simulation, defender, rankedCells) => {
  const occupied = new Set(simulation.towers.map((tower) => tower.cellId));
  return rankedCells.find((cell) => !occupied.has(cell.id)) ?? null;
};

const runMonoRosterFixture = (levelId, defenderId) => {
  const simulation = createSimulation(levelId, { qa: true });
  const defender = DEFENDERS[defenderId];
  const rankedCells = getRankedCells(simulation.level, defender);
  for (let requestedTick = 0; requestedTick < 60 * 720 && !simulation.terminal; requestedTick += 1) {
    while (true) {
      const openCell = chooseBestOpenCell(simulation, defender, rankedCells);
      if (openCell && simulation.coins >= defender.costs[0]) {
        const result = issueCommand(simulation, {
          type: 'build',
          defenderId,
          cellId: openCell.id,
        });
        if (result.accepted) {
          continue;
        }
      }

      const upgradeableTower = simulation.towers.find((tower) => {
        const nextCost = defender.costs[tower.tier + 1];
        return nextCost !== undefined && simulation.coins >= nextCost;
      });
      if (upgradeableTower) {
        issueCommand(simulation, { type: 'upgrade', towerId: upgradeableTower.id });
        continue;
      }

      if (!openCell || simulation.coins < defender.costs[0]) break;
      break;
    }
    advanceSimulation(simulation, 1);
  }
  return summarizeSimulation(simulation);
};

test('every level has a no-build loss and two materially distinct authored wins', () => {
  const highestSpendDefenderIds = new Set();
  const replacementLevels = new Map();

  for (const level of LEVELS) {
    const noBuildSimulation = createSimulation(level.id, { qa: true });
    advanceSimulation(noBuildSimulation, 60 * 720);
    const noBuildSummary = summarizeSimulation(noBuildSimulation);
    assert.equal(noBuildSummary.terminal, true, `${level.id} should terminate in no-build mode`);
    assert.equal(noBuildSummary.outcome, 'defeat', `${level.id} should lose without defenders`);

    const [firstId, secondId] = level.referenceStrategies;
    const firstSummary = runInstrumentedStrategyFixture(level.id, firstId);
    const secondSummary = runInstrumentedStrategyFixture(level.id, secondId);
    for (const [strategyId, summary] of [[firstId, firstSummary], [secondId, secondSummary]]) {
      for (const metricKey of METRIC_KEYS) {
        assert.ok(Object.hasOwn(summary, metricKey), `${level.id}:${strategyId} lacks ${metricKey}`);
      }
      assert.ok(
        summary.maxConcurrentAttackers <= 3,
        `${level.id}:${strategyId} reached ${summary.maxConcurrentAttackers} concurrent attackers`,
      );
      if (Number.parseInt(level.id.replace('level-', ''), 10) >= 7) {
        const dueCommands = REFERENCE_STRATEGIES[strategyId]
          .filter((command) => command.tick < summary.tick);
        assert.equal(
          summary.purchaseHistory.length,
          dueCommands.length,
          `${level.id}:${strategyId} should accept every command issued before terminal`,
        );
        const expected = LATE_FIXTURE_EXPECTATIONS[strategyId];
        assert.equal(summary.outcome, expected.outcome, `${strategyId} should match authored outcome`);
        assert.equal(summary.tick, expected.tick, `${strategyId} should match authored terminal tick`);
        assert.equal(summary.castleHearts, expected.hearts, `${strategyId} should match authored hearts`);
        assert.equal(summary.score, expected.score, `${strategyId} should match authored score`);
        assert.equal(summary.highestSpendDefenderId, expected.highest, `${strategyId} should match authored highest spender`);
        assert.deepEqual(summary.occupiedCellIds, expected.occupied, `${strategyId} should match authored occupied cells`);
        assert.equal(summary.maximumLivingEnemies, expected.maxLiving, `${strategyId} should match authored max living enemies`);
        assert.equal(summary.maxConcurrentAttackers, expected.maxAttackers, `${strategyId} should match authored max concurrent attackers`);
        assert.equal(summary.purchaseHistory.length, expected.purchaseCount, `${strategyId} should match authored purchase count`);
        if (expected.replacementPurchase) {
          assert.equal(summary.frontlineDefeats, expected.frontlineDefeats, `${strategyId} should match authored frontline defeats`);
          assert.equal(summary.frontlineRepurchases, expected.frontlineRepurchases, `${strategyId} should match authored repurchases`);
          const replacementPurchase = summary.purchaseHistory.find((purchase) => (
            purchase.tick === expected.replacementPurchase.tick
            && purchase.type === expected.replacementPurchase.type
            && purchase.defenderId === expected.replacementPurchase.defenderId
            && purchase.cellId === expected.replacementPurchase.cellId
            && purchase.cost === expected.replacementPurchase.cost
          ));
          assert.deepEqual(replacementPurchase && {
            tick: replacementPurchase.tick,
            type: replacementPurchase.type,
            defenderId: replacementPurchase.defenderId,
            cellId: replacementPurchase.cellId,
            cost: replacementPurchase.cost,
          }, expected.replacementPurchase, `${strategyId} should include exact paid same-cell rebuild evidence`);
        }
      }
      assert.deepEqual(
        deterministicEvidence(runInstrumentedStrategyFixture(level.id, strategyId)),
        deterministicEvidence(summary),
        `${level.id}:${strategyId} metrics must be deterministic`,
      );
    }
    assert.equal(firstSummary.terminal, true, `${level.id}:${firstId} should terminate`);
    assert.equal(firstSummary.outcome, 'victory', `${level.id}:${firstId} should win`);
    assert.equal(secondSummary.terminal, true, `${level.id}:${secondId} should terminate`);
    assert.equal(secondSummary.outcome, 'victory', `${level.id}:${secondId} should win`);

    const cellDifferenceRatio = compareStrategies(firstSummary, secondSummary);
    assert.notEqual(
      firstSummary.highestSpendDefenderId,
      secondSummary.highestSpendDefenderId,
      `${level.id} should have different actual highest-spend defenders`,
    );
    assert.ok(cellDifferenceRatio >= 0.25, `${level.id} actual cell difference was ${cellDifferenceRatio}`);
    highestSpendDefenderIds.add(firstSummary.highestSpendDefenderId);
    highestSpendDefenderIds.add(secondSummary.highestSpendDefenderId);
    replacementLevels.set(level.id, [firstSummary, secondSummary].some((summary) => (
      summary.outcome === 'victory'
      && summary.frontlineDefeats > 0
      && summary.frontlineRepurchases > 0
    )));
  }

  assert.deepEqual(
    highestSpendDefenderIds,
    new Set(['bladeguard', 'ranger', 'ironwarden', 'rune-artificer']),
  );
  for (const levelId of ['level-4', 'level-7', 'level-10']) {
    assert.equal(
      replacementLevels.get(levelId),
      true,
      `${levelId} needs a winning fixture with a permanent frontline defeat and repurchase`,
    );
  }
});

test('reinvesting mono-roster fixtures cannot clear Levels 7 or 10', () => {
  for (const levelId of ['level-7', 'level-10']) {
    for (const defenderId of Object.keys(DEFENDERS)) {
      const summary = runMonoRosterFixture(levelId, defenderId);
      const expected = MONO_FIXTURE_EXPECTATIONS[`${levelId}:${defenderId}`];
      const postZeroPurchases = summary.purchaseHistory.filter((purchase) => purchase.tick > 0).length;
      assert.equal(summary.terminal, true, `${levelId}:${defenderId} should terminate`);
      assert.equal(summary.outcome, 'defeat', `${levelId}:${defenderId} should not clear`);
      assert.equal(summary.tick, expected.tick, `${levelId}:${defenderId} should match its terminal tick`);
      assert.equal(summary.purchaseHistory.length, expected.purchases, `${levelId}:${defenderId} should match its purchase count`);
      assert.equal(postZeroPurchases, expected.postZero, `${levelId}:${defenderId} should match its bounty-funded purchases`);
      assert.ok(postZeroPurchases >= 3, `${levelId}:${defenderId} should make at least three bounty-funded purchases`);
      assert.equal(summary.maximumLivingEnemies, expected.maxLiving, `${levelId}:${defenderId} should match its living-enemy cap evidence`);
      assert.equal(summary.maximumConcurrentAttackers, expected.maxAttackers, `${levelId}:${defenderId} should match its attacker-cap evidence`);
    }
  }
});

test('Levels 1-6 square-grid campaign preserves distinct legal victories', () => {
  const level4Strategies = [];

  for (const level of LEVELS.slice(0, 6)) {
    const noBuildSimulation = createSimulation(level.id, { qa: true });
    advanceSimulation(noBuildSimulation, MAX_STRATEGY_TICKS);
    const noBuildSummary = summarizeSimulation(noBuildSimulation);
    assert.equal(noBuildSummary.terminal, true, `${level.id} should terminate in no-build mode`);
    assert.equal(noBuildSummary.outcome, 'defeat', `${level.id} should lose without defenders`);

    const balanced = runInstrumentedStrategyFixture(level.id, `${level.id}-balanced`);
    const artillery = runInstrumentedStrategyFixture(level.id, `${level.id}-artillery`);

    for (const [strategyId, summary] of [
      [`${level.id}-balanced`, balanced],
      [`${level.id}-artillery`, artillery],
    ]) {
      const expected = EARLY_FIXTURE_EXPECTATIONS[strategyId];
      assert.equal(summary.terminal, true, `${strategyId} should terminate`);
      assert.equal(summary.outcome, expected.outcome, `${strategyId} should match authored outcome`);
      assert.equal(summary.tick, expected.tick, `${strategyId} should match authored terminal tick`);
      assert.equal(summary.castleHearts, expected.hearts, `${strategyId} should match authored hearts`);
      assert.equal(summary.score, expected.score, `${strategyId} should match authored score`);
      assert.equal(summary.highestSpendDefenderId, expected.highest, `${strategyId} should match authored highest spender`);
      assert.deepEqual(summary.occupiedCellIds, expected.occupied, `${strategyId} should match authored occupied cells`);
      assert.equal(summary.maximumLivingEnemies, expected.maxLiving, `${strategyId} should match authored max living enemies`);
      assert.equal(summary.maxConcurrentAttackers, expected.maxAttackers, `${strategyId} should match authored max concurrent attackers`);
      assert.equal(summary.purchaseHistory.length, expected.purchaseCount, `${strategyId} should match authored purchase count`);
      assert.ok(summary.maximumLivingEnemies <= 18, `${strategyId} exceeded 18 living enemies`);
      assert.ok(summary.maxConcurrentAttackers <= 3, `${strategyId} exceeded 3 attackers`);
      assert.deepEqual(
        deterministicEvidence(runInstrumentedStrategyFixture(level.id, strategyId)),
        deterministicEvidence(summary),
        `${strategyId} exact evidence must remain deterministic on an independent rerun`,
      );
      if (strategyId === 'level-4-balanced') {
        assert.equal(summary.frontlineDefeats, expected.frontlineDefeats, 'level-4-balanced should record exactly one frontline defeat');
        assert.equal(summary.frontlineRepurchases, expected.frontlineRepurchases, 'level-4-balanced should record exactly one paid frontline repurchase');
        const replacementPurchase = summary.purchaseHistory.find((purchase) => (
          purchase.tick === expected.replacementPurchase.tick
          && purchase.type === expected.replacementPurchase.type
          && purchase.defenderId === expected.replacementPurchase.defenderId
          && purchase.cellId === expected.replacementPurchase.cellId
          && purchase.cost === expected.replacementPurchase.cost
        ));
        assert.deepEqual(replacementPurchase && {
          tick: replacementPurchase.tick,
          type: replacementPurchase.type,
          defenderId: replacementPurchase.defenderId,
          cellId: replacementPurchase.cellId,
          cost: replacementPurchase.cost,
        }, expected.replacementPurchase, 'level-4-balanced should include the exact paid same-cell rebuild evidence');
      }
    }

    assert.notEqual(
      balanced.highestSpendDefenderId,
      artillery.highestSpendDefenderId,
      `${level.id} should have different highest-spend defenders`,
    );
    assert.ok(
      occupiedDifference(balanced, artillery) >= 0.25,
      `${level.id} actual occupied-cell difference was ${occupiedDifference(balanced, artillery)}`,
    );

    if (level.id === 'level-4') {
      level4Strategies.push(balanced, artillery);
    }
  }

  assert.equal(
    level4Strategies.some((summary) => (
      summary.outcome === 'victory'
      && summary.frontlineDefeats > 0
      && summary.frontlineRepurchases > 0
    )),
    true,
    'level-4 needs a winning fixture with a permanent frontline defeat and repurchase',
  );
});
