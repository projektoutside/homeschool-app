import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFENDERS } from '../public/Games/DefenderChampion/src/config/defenders.js';
import { LEVELS } from '../public/Games/DefenderChampion/src/config/levels.js';
import {
  advanceSimulation,
  createSimulation,
  issueCommand,
  runStrategyFixture,
  summarizeSimulation,
} from '../public/Games/DefenderChampion/src/core/simulation.js';

const compareStrategies = (first, second) => {
  const firstPads = new Set(first.occupiedPadIds);
  const secondPads = new Set(second.occupiedPadIds);
  const occupiedPads = new Set([...firstPads, ...secondPads]);
  const differingPads = [...occupiedPads]
    .filter((padId) => firstPads.has(padId) !== secondPads.has(padId));
  return differingPads.length / occupiedPads.size;
};

const runMonoRosterFixture = (levelId, defenderId) => {
  const simulation = createSimulation(levelId, { qa: true });
  const defender = DEFENDERS[defenderId];
  for (let requestedTick = 0; requestedTick < 60 * 720 && !simulation.terminal; requestedTick += 1) {
    for (const tower of simulation.towers) {
      const nextCost = defender.costs[tower.tier + 1];
      if (nextCost !== undefined && simulation.coins >= nextCost) {
        issueCommand(simulation, { type: 'upgrade', towerId: tower.id });
      }
    }
    for (const pad of simulation.level.pads) {
      if (simulation.towers.length >= 1) break;
      if (simulation.towers.some((tower) => tower.padId === pad.id)) continue;
      if (simulation.coins < defender.costs[0]) break;
      issueCommand(simulation, { type: 'build', defenderId, padId: pad.id });
    }
    advanceSimulation(simulation, 1);
  }
  return summarizeSimulation(simulation);
};

test('every level has a no-build loss and two materially distinct authored wins', () => {
  const highestSpendDefenderIds = new Set();

  for (const level of LEVELS) {
    const noBuildSimulation = createSimulation(level.id, { qa: true });
    advanceSimulation(noBuildSimulation, 60 * 720);
    const noBuildSummary = summarizeSimulation(noBuildSimulation);
    assert.equal(noBuildSummary.terminal, true, `${level.id} should terminate in no-build mode`);
    assert.equal(noBuildSummary.outcome, 'defeat', `${level.id} should lose without defenders`);

    const [firstId, secondId] = level.referenceStrategies;
    const firstSummary = runStrategyFixture(level.id, firstId);
    const secondSummary = runStrategyFixture(level.id, secondId);
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
  }

  assert.deepEqual(
    highestSpendDefenderIds,
    new Set(['bladeguard', 'ranger', 'ironwarden', 'rune-artificer']),
  );
});

test('reinvesting mono-roster fixtures cannot clear Levels 7 or 10', () => {
  for (const levelId of ['level-7', 'level-10']) {
    for (const defenderId of Object.keys(DEFENDERS)) {
      const summary = runMonoRosterFixture(levelId, defenderId);
      assert.equal(summary.terminal, true, `${levelId}:${defenderId} should terminate`);
      assert.equal(summary.outcome, 'defeat', `${levelId}:${defenderId} should not clear`);
      assert.equal(
        summary.purchaseHistory.some((purchase) => purchase.type === 'upgrade' && purchase.tick > 0),
        true,
        `${levelId}:${defenderId} should reinvest earned coins into upgrades`,
      );
    }
  }
});
