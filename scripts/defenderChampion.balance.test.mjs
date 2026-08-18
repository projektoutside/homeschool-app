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
    while (true) {
      const upgradeableTower = simulation.towers.find((tower) => {
        const nextCost = defender.costs[tower.tier + 1];
        return nextCost !== undefined && simulation.coins >= nextCost;
      });
      if (upgradeableTower) {
        issueCommand(simulation, { type: 'upgrade', towerId: upgradeableTower.id });
        continue;
      }

      const openPad = simulation.level.pads.find((pad) => (
        !simulation.towers.some((tower) => tower.padId === pad.id)
      ));
      if (!openPad || simulation.coins < defender.costs[0]) break;
      issueCommand(simulation, { type: 'build', defenderId, padId: openPad.id });
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
