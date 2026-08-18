import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFENDERS } from '../public/Games/DefenderChampion/src/config/defenders.js';
import { EFFECT_LIMITS, ENEMIES } from '../public/Games/DefenderChampion/src/config/enemies.js';
import { LEVELS, getLevel } from '../public/Games/DefenderChampion/src/config/levels.js';
import { REFERENCE_STRATEGIES } from '../public/Games/DefenderChampion/src/config/reference-strategies.js';

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

test('levels are immutable authored shells with valid strategy fixtures', () => {
  const expectedMeta = [
    ['level-1', 'Meadow Watch', 1, 100],
    ['level-2', 'Quickstep Grove', 1.12, 135],
    ['level-3', 'Iron Trail', 1.25, 175],
    ['level-4', "Brute's Crossing", 1.38, 225],
    ['level-5', 'Twisting Thicket', 1.54, 285],
    ['level-6', 'Moonlit Rush', 1.72, 350],
    ['level-7', "Warlord's March", 1.92, 430],
    ['level-8', 'Fogbound Siege', 2.14, 525],
    ['level-9', 'The Last Green', 2.38, 640],
    ['level-10', "Champion's Stand", 2.65, 800],
  ];
  const highestSpendDefenders = new Set();

  assert.equal(Object.isFrozen(LEVELS), true);
  for (const [index, level] of LEVELS.entries()) {
    const [id, name, healthScale, threatIndex] = expectedMeta[index];
    assert.equal(level.id, id);
    assert.equal(level.name, name);
    assert.equal(level.healthScale, healthScale);
    assert.equal(level.threatIndex, threatIndex);
    assert.equal(Object.isFrozen(level), true);
    assert.equal(getLevel(id), level);
    assert.equal(level.path.length >= 2, true);
    assert.equal(level.pads.length >= 8 && level.pads.length <= 12, true);
    assert.equal(new Set(level.pads.map((pad) => pad.id)).size, level.pads.length);
    assert.equal(level.waves.length, level.waveCount);
    assert.equal(level.referenceStrategies.length, 2);
    assert.equal(new Set(level.referenceStrategies).size, 2);

    const [firstStrategyId, secondStrategyId] = level.referenceStrategies;
    const first = REFERENCE_STRATEGIES[firstStrategyId];
    const second = REFERENCE_STRATEGIES[secondStrategyId];
    assert.equal(Object.isFrozen(first), true);
    assert.equal(Object.isFrozen(second), true);
    assert.equal(first.every((command) => command.type === 'build' && command.tick >= 0), true);
    assert.equal(second.every((command) => command.type === 'build' && command.tick >= 0), true);

    for (const strategy of [first, second]) {
      const pads = new Set(level.pads.map((pad) => pad.id));
      const tickZeroSpend = strategy
        .filter((command) => command.tick === 0)
        .reduce((total, command) => {
          assert.ok(DEFENDERS[command.defenderId]);
          assert.equal(pads.has(command.padId), true);
          return total + DEFENDERS[command.defenderId].costs[0];
        }, 0);
      assert.equal(tickZeroSpend <= level.startingCoins, true);
    }

    const firstPads = new Set(first.map((command) => command.padId));
    const secondPads = new Set(second.map((command) => command.padId));
    const occupiedPads = new Set([...firstPads, ...secondPads]);
    const differingPads = [...occupiedPads].filter((padId) => firstPads.has(padId) !== secondPads.has(padId));
    assert.equal(differingPads.length / occupiedPads.size >= 0.25, true);

    const highestSpendDefender = (strategy) => {
      const spendByDefender = new Map();
      for (const command of strategy) {
        const previous = spendByDefender.get(command.defenderId) ?? 0;
        spendByDefender.set(command.defenderId, previous + DEFENDERS[command.defenderId].costs[0]);
      }
      return [...spendByDefender.entries()]
        .sort(([firstId, firstSpend], [secondId, secondSpend]) => secondSpend - firstSpend || firstId.localeCompare(secondId))[0][0];
    };
    const firstHighestSpendDefender = highestSpendDefender(first);
    const secondHighestSpendDefender = highestSpendDefender(second);
    assert.notEqual(firstHighestSpendDefender, secondHighestSpendDefender);
    highestSpendDefenders.add(firstHighestSpendDefender);
    highestSpendDefenders.add(secondHighestSpendDefender);
  }

  assert.deepEqual(highestSpendDefenders, new Set(['bladeguard', 'ranger', 'ironwarden', 'rune-artificer']));

  assert.throws(
    () => getLevel('missing-level'),
    (error) => error.message === 'Unknown level: missing-level',
  );
});
