import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFENDERS } from '../public/Games/DefenderChampion/src/config/defenders.js';
import { LEVELS, getLevel } from '../public/Games/DefenderChampion/src/config/levels.js';
import { REFERENCE_STRATEGIES } from '../public/Games/DefenderChampion/src/config/reference-strategies.js';

test('reference command fixtures are legal deterministic inputs for every level', () => {
  for (const level of LEVELS) {
    assert.equal(getLevel(level.id), level);
    assert.deepEqual(level.referenceStrategies, [
      `${level.id}-balanced`,
      `${level.id}-artillery`,
    ]);

    const padIds = new Set(level.pads.map((pad) => pad.id));
    for (const strategyId of level.referenceStrategies) {
      const commands = REFERENCE_STRATEGIES[strategyId];
      assert.ok(commands);
      assert.equal(Object.isFrozen(commands), true);

      let previousTick = -1;
      let tickZeroSpend = 0;
      for (const command of commands) {
        assert.deepEqual(Object.keys(command).sort(), [
          'defenderId',
          'padId',
          'tick',
          'type',
        ]);
        assert.equal(command.type, 'build');
        assert.equal(Number.isInteger(command.tick), true);
        assert.equal(command.tick >= previousTick, true);
        assert.ok(DEFENDERS[command.defenderId]);
        assert.equal(padIds.has(command.padId), true);
        if (command.tick === 0) {
          tickZeroSpend += DEFENDERS[command.defenderId].costs[0];
        }
        previousTick = command.tick;
      }
      assert.equal(tickZeroSpend <= level.startingCoins, true);
    }
  }
});
