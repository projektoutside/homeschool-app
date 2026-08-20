import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFENDERS } from '../public/Games/DefenderChampion/src/config/defenders.js';
import { LEVELS } from '../public/Games/DefenderChampion/src/config/levels.js';
import { REFERENCE_STRATEGIES } from '../public/Games/DefenderChampion/src/config/reference-strategies.js';
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

const runMonoRosterFixture = (levelId, defenderId) => {
  const simulation = createSimulation(levelId, { qa: true });
  const defender = DEFENDERS[defenderId];
  for (let requestedTick = 0; requestedTick < 60 * 720 && !simulation.terminal; requestedTick += 1) {
    while (true) {
      const openPad = simulation.level.pads.find((pad) => (
        pad.layer === defender.placementLayer
        && !simulation.towers.some((tower) => tower.padId === pad.id)
      ));
      if (openPad && simulation.coins >= defender.costs[0]) {
        issueCommand(simulation, { type: 'build', defenderId, padId: openPad.id });
        continue;
      }

      const upgradeableTower = simulation.towers.find((tower) => {
        const nextCost = defender.costs[tower.tier + 1];
        return nextCost !== undefined && simulation.coins >= nextCost;
      });
      if (upgradeableTower) {
        issueCommand(simulation, { type: 'upgrade', towerId: upgradeableTower.id });
        continue;
      }

      if (!openPad || simulation.coins < defender.costs[0]) break;
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
      const dueCommands = REFERENCE_STRATEGIES[strategyId]
        .filter((command) => command.tick < summary.tick);
      assert.equal(
        summary.purchaseHistory.length,
        dueCommands.length,
        `${level.id}:${strategyId} should accept every command issued before terminal`,
      );
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

    const padDifferenceRatio = compareStrategies(firstSummary, secondSummary);
    assert.notEqual(
      firstSummary.highestSpendDefenderId,
      secondSummary.highestSpendDefenderId,
      `${level.id} should have different actual highest-spend defenders`,
    );
    assert.ok(padDifferenceRatio >= 0.25, `${level.id} actual pad difference was ${padDifferenceRatio}`);
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
      assert.equal(summary.terminal, true, `${levelId}:${defenderId} should terminate`);
      assert.equal(summary.outcome, 'defeat', `${levelId}:${defenderId} should not clear`);
      assert.ok(
        summary.purchaseHistory.filter((purchase) => purchase.type === 'build').length >= 2,
        `${levelId}:${defenderId} should build multiple towers when economics permit`,
      );
      assert.ok(
        summary.purchaseHistory.filter((purchase) => purchase.tick > 0).length >= 2,
        `${levelId}:${defenderId} should make multiple bounty-funded purchases`,
      );
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
      assert.equal(summary.terminal, true, `${strategyId} should terminate`);
      assert.equal(summary.outcome, 'victory', `${strategyId} should win`);
      assert.ok(summary.maximumLivingEnemies <= 18, `${strategyId} exceeded 18 living enemies`);
      assert.ok(summary.maxConcurrentAttackers <= 3, `${strategyId} exceeded 3 attackers`);
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
