import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFENDERS } from '../public/Games/DefenderChampion/src/config/defenders.js';
import { LEVELS } from '../public/Games/DefenderChampion/src/config/levels.js';
import { REFERENCE_STRATEGIES } from '../public/Games/DefenderChampion/src/config/reference-strategies.js';
import {
  advanceSimulation,
  createSimulation,
  issueCommand,
  runStrategyFixture,
  summarizeSimulation,
} from '../public/Games/DefenderChampion/src/core/simulation.js';

const analyzeStrategy = (strategyId) => {
  const spendByDefender = new Map();
  const pads = new Set();
  for (const command of REFERENCE_STRATEGIES[strategyId]) {
    if (command.type === 'build') {
      spendByDefender.set(
        command.defenderId,
        (spendByDefender.get(command.defenderId) ?? 0) + DEFENDERS[command.defenderId].costs[0],
      );
      pads.add(command.padId);
    }
  }
  const highestSpendDefenderId = [...spendByDefender]
    .sort(([firstId, firstSpend], [secondId, secondSpend]) => (
      secondSpend - firstSpend || firstId.localeCompare(secondId)
    ))[0][0];
  return { highestSpendDefenderId, pads };
};

const compareStrategies = (firstId, secondId) => {
  const first = analyzeStrategy(firstId);
  const second = analyzeStrategy(secondId);
  const occupiedPads = new Set([...first.pads, ...second.pads]);
  const differingPads = [...occupiedPads]
    .filter((padId) => first.pads.has(padId) !== second.pads.has(padId));
  return {
    first,
    second,
    padDifferenceRatio: differingPads.length / occupiedPads.size,
  };
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

    const { first, second, padDifferenceRatio } = compareStrategies(firstId, secondId);
    assert.notEqual(first.highestSpendDefenderId, second.highestSpendDefenderId);
    assert.ok(padDifferenceRatio >= 0.25);
    highestSpendDefenderIds.add(first.highestSpendDefenderId);
    highestSpendDefenderIds.add(second.highestSpendDefenderId);
  }

  assert.deepEqual(
    highestSpendDefenderIds,
    new Set(['bladeguard', 'ranger', 'ironwarden', 'rune-artificer']),
  );
});

test('single-defender openings cannot clear Levels 7 or 10', () => {
  for (const levelId of ['level-7', 'level-10']) {
    for (const defenderId of Object.keys(DEFENDERS)) {
      const simulation = createSimulation(levelId, { qa: true });
      for (const pad of simulation.level.pads) {
        issueCommand(simulation, { type: 'build', defenderId, padId: pad.id });
      }
      advanceSimulation(simulation, 60 * 720);
      const summary = summarizeSimulation(simulation);
      assert.equal(summary.terminal, true, `${levelId}:${defenderId} should terminate`);
      assert.equal(summary.outcome, 'defeat', `${levelId}:${defenderId} should not clear`);
    }
  }
});
