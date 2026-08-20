import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFENDERS } from '../public/Games/DefenderChampion/src/config/defenders.js';
import { ENEMIES } from '../public/Games/DefenderChampion/src/config/enemies.js';
import { LEVELS, getLevel } from '../public/Games/DefenderChampion/src/config/levels.js';
import { cellCenter } from '../public/Games/DefenderChampion/src/core/grid-geometry.js';
import {
  isRoadCellEnemyCovered,
} from '../public/Games/DefenderChampion/src/core/grid-placement.js';
import { REFERENCE_STRATEGIES } from '../public/Games/DefenderChampion/src/config/reference-strategies.js';
import {
  advanceSimulation,
  clearPresentationEvents,
  createSimulation,
  issueCommand,
  issueStrategyCommand,
  runStrategyFixture,
  summarizePresentationSimulation,
  summarizeSimulation,
} from '../public/Games/DefenderChampion/src/core/simulation.js';
import {
  selectMeleeTarget,
  selectTarget,
} from '../public/Games/DefenderChampion/src/core/targeting.js';
import { WAVE_GAP_TICKS, spawnScheduledEnemies } from '../public/Games/DefenderChampion/src/core/wave-controller.js';

test('every free road and grass cell accepts exactly its matching defenders', () => {
  for (const level of LEVELS) {
    for (const cell of level.cells) {
      for (const defenderId of ['bladeguard', 'ironwarden', 'ranger', 'rune-artificer']) {
        const simulation = createSimulation(level.id, { qa: true });
        simulation.coins = 10_000;
        const result = issueCommand(simulation, { type: 'build', defenderId, cellId: cell.id });
        const expected = DEFENDERS[defenderId].placementLayer === cell.terrain;
        assert.equal(result.accepted, expected, `${level.id} ${cell.id} ${defenderId}`);
        assert.equal(simulation.coins < 10_000, expected);
      }
    }
  }
});

test('an enemy-covered road cell rejects atomically until it clears', () => {
  const simulation = createSimulation('level-1', { qa: true });
  simulation.enemies.push({ id: 'enemy-1', health: 10, pathProgress: 160 });
  const cellId = simulation.level.roadCells[2];
  assert.deepEqual(issueCommand(simulation, { type: 'build', defenderId: 'bladeguard', cellId }), {
    accepted: false,
    reason: 'enemy-occupied',
  });
  assert.equal(simulation.coins, 150);
  simulation.enemies[0].pathProgress = 241;
  assert.equal(issueCommand(simulation, { type: 'build', defenderId: 'bladeguard', cellId }).accepted, true);
});

test('cell builds expose cell IDs in snapshots and strategy metrics', () => {
  const simulation = createSimulation('level-1', { qa: true });
  simulation.coins = 10_000;
  const cellId = simulation.level.roadCells[0];

  assert.deepEqual(issueCommand(simulation, {
    type: 'build', defenderId: 'bladeguard', cellId,
  }), { accepted: true, reason: null });

  const summary = summarizeSimulation(simulation);
  assert.equal(summary.towers[0].cellId, cellId);
  assert.deepEqual(summary.occupiedCellIds, [cellId]);
  assert.equal(Object.isFrozen(summary.occupiedCellIds), true);
  assert.throws(() => summary.occupiedCellIds.push('r0c0'), TypeError);
  assert.deepEqual(summary.purchaseHistory, [{
    tick: 0,
    type: 'build',
    towerId: 'tower-1',
    defenderId: 'bladeguard',
    cellId,
    cost: DEFENDERS.bladeguard.costs[0],
  }]);
});

test('road coverage includes the forty-pixel boundary, clamps progress, and ignores dead enemies', () => {
  const level = LEVELS[0];
  const thirdRoadCell = level.roadCells[2];
  assert.equal(isRoadCellEnemyCovered({
    level, cellId: thirdRoadCell, enemies: [{ health: 1, pathProgress: 120 }],
  }), true);
  assert.equal(isRoadCellEnemyCovered({
    level, cellId: thirdRoadCell, enemies: [{ health: 1, pathProgress: 200 }],
  }), true);
  assert.equal(isRoadCellEnemyCovered({
    level, cellId: thirdRoadCell, enemies: [{ health: 1, pathProgress: 119 }],
  }), false);
  assert.equal(isRoadCellEnemyCovered({
    level, cellId: thirdRoadCell, enemies: [{ health: 1, pathProgress: 201 }],
  }), false);
  assert.equal(isRoadCellEnemyCovered({
    level, cellId: level.roadCells[0], enemies: [{ health: 1, pathProgress: -1 }],
  }), true);
  assert.equal(isRoadCellEnemyCovered({
    level, cellId: 'r11c4', enemies: [{ health: 1, pathProgress: 9_999 }],
  }), true);
  assert.equal(isRoadCellEnemyCovered({
    level, cellId: thirdRoadCell, enemies: [{ health: 0, pathProgress: 160 }],
  }), false);
});

test('prospective gate congestion rejects capacity plus one but ignores dead upstream overflow', () => {
  const simulation = createSimulation('level-1', { qa: true });
  simulation.coins = 10_000;
  simulation.enemies = Array.from({ length: 6 }, (_, index) => ({
    id: `enemy-${index + 1}`,
    health: 10,
    pathProgress: 0,
  }));
  const cellId = simulation.level.roadCells[2];

  assert.deepEqual(issueCommand(simulation, {
    type: 'build', defenderId: 'bladeguard', cellId,
  }), { accepted: false, reason: 'enemy-occupied' });
  assert.equal(simulation.coins, 10_000);
  assert.deepEqual(simulation.towers, []);

  simulation.enemies[5].health = 0;
  assert.deepEqual(issueCommand(simulation, {
    type: 'build', defenderId: 'bladeguard', cellId,
  }), { accepted: true, reason: null });
  assert.equal(simulation.coins, 9_950);
  assert.equal(simulation.towers[0].cellId, cellId);
});

test('new cell commands reject duplicate and invalid cells without charging coins', () => {
  const simulation = createSimulation('level-1', { qa: true });
  simulation.coins = 1_000;
  const cellId = simulation.level.roadCells[0];
  assert.deepEqual(issueCommand(simulation, { type: 'build', defenderId: 'bladeguard', cellId }), {
    accepted: true,
    reason: null,
  });
  const coinsAfterBuild = simulation.coins;
  assert.deepEqual(issueCommand(simulation, { type: 'build', defenderId: 'ironwarden', cellId }), {
    accepted: false,
    reason: 'cell-occupied',
  });
  assert.equal(simulation.coins, coinsAfterBuild);
  assert.deepEqual(issueCommand(simulation, {
    type: 'build', defenderId: 'bladeguard', cellId: 'r12c9',
  }), { accepted: false, reason: 'invalid-cell' });
  assert.equal(simulation.coins, coinsAfterBuild);
});

test('levels and commands expose cell-authored placement surfaces', () => {
  for (const level of LEVELS) {
    assert.equal(level.cells.length, 108, level.id);
    assert.ok(level.roadCells.length > 0, level.id);
  }
  for (const commands of Object.values(REFERENCE_STRATEGIES)) {
    for (const command of commands) {
      if (command.type === 'build') assert.match(command.cellId, /^r\d+c\d+$/);
    }
  }
});

test('presentation snapshots omit nonvisual effect fan-out without weakening full deterministic summaries', () => {
  const simulation = createSimulation('level-10', { qa: true });
  simulation.effects = [
    { id: 'effect-1', kind: 'enemy-healing', sourceId: 'enemy-1', targetId: 'enemy-2' },
    { id: 'effect-2', kind: 'mossback-telegraph', sourceId: 'enemy-3', untilTick: 60 },
  ];

  assert.deepEqual(summarizePresentationSimulation(simulation).effects, [
    { id: 'effect-2', kind: 'mossback-telegraph', sourceId: 'enemy-3', untilTick: 60 },
  ]);
  assert.equal(summarizeSimulation(simulation).effects.length, 2);
});

test('reference command fixtures are legal deterministic inputs for every level', () => {
  for (const level of LEVELS) {
    assert.equal(getLevel(level.id), level);
    assert.deepEqual(level.referenceStrategies, [
      `${level.id}-balanced`,
      `${level.id}-artillery`,
    ]);

    for (const strategyId of level.referenceStrategies) {
      const commands = REFERENCE_STRATEGIES[strategyId];
      assert.ok(commands);
      assert.equal(Object.isFrozen(commands), true);

      let previousTick = -1;
      let tickZeroSpend = 0;
      const firstBuildTickByPlacement = new Map();
      for (const command of commands) {
        const expectedKeys = command.type === 'build'
          ? ['cellId', 'defenderId', 'ref', 'tick', 'type']
          : (command.type === 'upgrade-ref'
            ? ['ref', 'tick', 'type']
            : ['tick', 'towerId', 'type']);
        assert.deepEqual(Object.keys(command).sort(), expectedKeys);
        assert.ok(['build', 'upgrade', 'upgrade-ref'].includes(command.type));
        assert.equal(Number.isInteger(command.tick), true);
        assert.equal(command.tick >= previousTick, true);
        if (command.type === 'build') {
          assert.ok(DEFENDERS[command.defenderId]);
          const placementId = command.cellId;
          const translationCell = level.cells.find(({ id }) => id === command.cellId);
          assert.equal(translationCell.terrain, DEFENDERS[command.defenderId].placementLayer);
          const firstBuildTick = firstBuildTickByPlacement.get(placementId);
          if (firstBuildTick !== undefined) {
            assert.ok(['level-4', 'level-7', 'level-10'].includes(level.id));
            assert.equal(DEFENDERS[command.defenderId].combatLayer, 'frontline');
            assert.ok(command.tick > firstBuildTick);
          } else {
            firstBuildTickByPlacement.set(placementId, command.tick);
          }
          if (command.tick === 0) {
            tickZeroSpend += DEFENDERS[command.defenderId].costs[0];
          }
        } else {
          if (command.type === 'upgrade') {
            assert.match(command.towerId, /^tower-\d+$/);
          } else {
            assert.equal(typeof command.ref, 'string');
            assert.notEqual(command.ref.length, 0);
          }
        }
        previousTick = command.tick;
      }
      assert.equal(tickZeroSpend <= level.startingCoins, true);
    }
  }
});

test('build commands enforce placement layers before charging coins and snapshot tower durability', () => {
  const simulation = createSimulation('level-1', { qa: true, seed: 7 });

  assert.deepEqual(issueCommand(simulation, {
    type: 'build', defenderId: 'bladeguard', cellId: 'r2c7',
  }), { accepted: true, reason: null });
  assert.deepEqual(issueCommand(simulation, {
    type: 'build', defenderId: 'ranger', cellId: 'r4c4',
  }), { accepted: false, reason: 'placement-layer-mismatch' });
  assert.deepEqual(issueCommand(simulation, {
    type: 'build', defenderId: 'ranger', cellId: 'r0c5',
  }), { accepted: true, reason: null });

  const summary = summarizeSimulation(simulation);
  assert.equal(summary.coins, 30);
  assert.deepEqual(summary.towers.map(({ defenderId, cellId, placementLayer, combatLayer, health, maxHealth, armor, engagedEnemyIds }) => ({
    defenderId, cellId, placementLayer, combatLayer, health, maxHealth, armor, engagedEnemyIds,
  })), [
    {
      defenderId: 'bladeguard', cellId: 'r2c7', placementLayer: 'road', combatLayer: 'frontline',
      health: 420, maxHealth: 420, armor: 0.10, engagedEnemyIds: [],
    },
    {
      defenderId: 'ranger', cellId: 'r0c5', placementLayer: 'grass', combatLayer: 'backline',
      health: 1, maxHealth: 1, armor: 0, engagedEnemyIds: [],
    },
  ]);
  assert.deepEqual(
    summarizePresentationSimulation(simulation).towers.map(({ defenderId, health, maxHealth, armor, engagedEnemyIds }) => ({
      defenderId, health, maxHealth, armor, engagedEnemyIds,
    })),
    [
      { defenderId: 'bladeguard', health: 420, maxHealth: 420, armor: 0.10, engagedEnemyIds: [] },
      { defenderId: 'ranger', health: 1, maxHealth: 1, armor: 0, engagedEnemyIds: [] },
    ],
  );
});

test('frontline upgrades preserve missing health and engaged defenders cannot be sold', () => {
  const simulation = createSimulation('level-1', { qa: true, seed: 7 });
  simulation.coins = 500;

  assert.deepEqual(issueCommand(simulation, {
    type: 'build', defenderId: 'bladeguard', cellId: 'r2c7',
  }), { accepted: true, reason: null });
  simulation.towers[0].health = 300;
  assert.deepEqual(issueCommand(simulation, { type: 'upgrade', towerId: 'tower-1' }), {
    accepted: true, reason: null,
  });
  assert.deepEqual(
    summarizeSimulation(simulation).towers[0].health,
    440,
  );
  assert.deepEqual(
    summarizeSimulation(simulation).towers[0].maxHealth,
    560,
  );
  assert.deepEqual(
    summarizeSimulation(simulation).towers[0].armor,
    0.14,
  );

  simulation.towers[0].engagedEnemyIds.push('enemy-1');
  const beforeSell = summarizeSimulation(simulation);
  assert.deepEqual(issueCommand(simulation, { type: 'sell', towerId: 'tower-1' }), {
    accepted: false, reason: 'defender-engaged',
  });
  assert.deepEqual(summarizeSimulation(simulation), beforeSell);
});
test('invalid economy commands reject without mutating the public summary', () => {
  const simulation = createSimulation('level-1', { qa: true, seed: 7 });
  const expectRejectedWithoutMutation = (command, reason) => {
    const before = summarizeSimulation(simulation);
    assert.deepEqual(issueCommand(simulation, command), { accepted: false, reason });
    assert.deepEqual(summarizeSimulation(simulation), before);
  };

  expectRejectedWithoutMutation({ type: 'build', defenderId: 'missing', cellId: 'r2c7' }, 'invalid-defender');
  expectRejectedWithoutMutation({ type: 'build', defenderId: 'bladeguard', cellId: 'missing-cell' }, 'invalid-cell');
  assert.deepEqual(issueCommand(simulation, {
    type: 'build', defenderId: 'ironwarden', cellId: 'r2c7',
  }), { accepted: true, reason: null });
  expectRejectedWithoutMutation({ type: 'build', defenderId: 'bladeguard', cellId: 'r4c4' }, 'insufficient-coins');
  expectRejectedWithoutMutation({ type: 'upgrade', towerId: 'missing-tower' }, 'missing-tower');
  expectRejectedWithoutMutation({ type: 'sell', towerId: 'missing-tower' }, 'missing-tower');

  assert.deepEqual(issueCommand(simulation, { type: 'sell', towerId: 'tower-1' }), { accepted: true, reason: null });
  expectRejectedWithoutMutation({ type: 'sell', towerId: 'tower-1' }, 'missing-tower');

  const maxTierSimulation = createSimulation('level-1', { qa: true });
  maxTierSimulation.coins = 500;
  assert.deepEqual(issueCommand(maxTierSimulation, {
    type: 'build', defenderId: 'bladeguard', cellId: 'r2c7',
  }), { accepted: true, reason: null });
  assert.deepEqual(issueCommand(maxTierSimulation, { type: 'upgrade', towerId: 'tower-1' }), { accepted: true, reason: null });
  assert.deepEqual(issueCommand(maxTierSimulation, { type: 'upgrade', towerId: 'tower-1' }), { accepted: true, reason: null });
  const maxTierBefore = summarizeSimulation(maxTierSimulation);
  assert.deepEqual(issueCommand(maxTierSimulation, { type: 'upgrade', towerId: 'tower-1' }), {
    accepted: false, reason: 'max-tier',
  });
  assert.deepEqual(summarizeSimulation(maxTierSimulation), maxTierBefore);
});

test('sell refunds seventy percent of all invested costs without changing score', () => {
  const simulation = createSimulation('level-1', { qa: true });

  issueCommand(simulation, { type: 'build', defenderId: 'bladeguard', cellId: 'r2c7' });
  issueCommand(simulation, { type: 'upgrade', towerId: 'tower-1' });
  const beforeSell = summarizeSimulation(simulation);
  assert.deepEqual(issueCommand(simulation, { type: 'sell', towerId: 'tower-1' }), { accepted: true, reason: null });
  const afterSell = summarizeSimulation(simulation);

  assert.equal(afterSell.coins, beforeSell.coins + 77);
  assert.equal(afterSell.score, beforeSell.score);
  assert.deepEqual(afterSell.towers, []);
});

test('pause reasons compose and speed remains a fixed-step request multiplier', () => {
  const simulation = createSimulation('level-1', { qa: true });

  assert.deepEqual(issueCommand(simulation, { type: 'set-speed', value: 2 }), { accepted: true, reason: null });
  assert.deepEqual(issueCommand(simulation, { type: 'set-pause-reason', reason: 'menu', active: true }), { accepted: true, reason: null });
  assert.deepEqual(issueCommand(simulation, { type: 'set-pause-reason', reason: 'modal', active: true }), { accepted: true, reason: null });
  advanceSimulation(simulation, 10);
  assert.equal(summarizeSimulation(simulation).tick, 0);

  issueCommand(simulation, { type: 'set-pause-reason', reason: 'menu', active: false });
  advanceSimulation(simulation, 10);
  assert.equal(summarizeSimulation(simulation).tick, 0);
  issueCommand(simulation, { type: 'set-pause-reason', reason: 'modal', active: false });
  advanceSimulation(simulation, 2);
  const summary = summarizeSimulation(simulation);
  assert.equal(summary.tick, 2);
  assert.equal(summary.timeScale, 2);
  assert.deepEqual(summary.pauseReasons, []);
});

test('scheduled enemies never exceed 18 living and preserve FIFO order', () => {
  const simulation = createSimulation('level-10', { qa: true });
  simulation.waveSchedule = Array.from({ length: 30 }, (_, index) => ({
    enemyId: index % 2 ? 'skitter' : 'swarmkin', spawnTick: 0, waveIndex: 0,
  }));

  advanceSimulation(simulation, 1);

  assert.equal(simulation.enemies.length, 18);
  assert.equal(simulation.pendingSpawns.length, 12);
  assert.equal(summarizeSimulation(simulation).maximumLivingEnemies, 18);
  assert.equal(summarizePresentationSimulation(simulation).maximumLivingEnemies, 18);
  const firstPending = simulation.pendingSpawns[0];
  simulation.enemies.shift();
  advanceSimulation(simulation, 1);
  assert.equal(simulation.enemies.length, 18);
  assert.equal(simulation.enemies.at(-1).enemyId, firstPending.enemyId);
});

test('paused ticks keep scheduled requests out of the cap queue until simulation resumes', () => {
  const simulation = createSimulation('level-10', { qa: true });
  simulation.waveSchedule = Array.from({ length: 19 }, () => ({
    enemyId: 'swarmkin', spawnTick: 0, waveIndex: 0,
  }));

  issueCommand(simulation, { type: 'set-pause-reason', reason: 'menu', active: true });
  advanceSimulation(simulation, 1);
  assert.equal(simulation.tick, 0);
  assert.equal(simulation.enemies.length, 0);
  assert.equal(simulation.pendingSpawns.length, 0);

  issueCommand(simulation, { type: 'set-pause-reason', reason: 'menu', active: false });
  advanceSimulation(simulation, 1);
  assert.equal(simulation.enemies.length, 18);
  assert.equal(simulation.pendingSpawns.length, 1);

  issueCommand(simulation, { type: 'set-pause-reason', reason: 'menu', active: true });
  advanceSimulation(simulation, 3);
  assert.equal(simulation.pendingSpawns.length, 1);
});

test('pending-only requests prevent terminal victory and summaries expose detached cap state', () => {
  const simulation = createSimulation('level-1', { qa: true });
  simulation.waveSchedule = [];
  simulation.nextSpawnIndex = 0;
  simulation.spawnedAllWaves = true;
  simulation.pendingSpawns = [{
    enemyId: 'swarmkin', isSummon: true, pathProgress: 12, requestedTick: 0, sequence: 1, waveIndex: 0,
  }];
  assert.deepEqual(simulation.enemies, []);

  const beforeAdvance = summarizeSimulation(simulation);
  assert.equal(beforeAdvance.pendingSpawnCount, 1);
  assert.equal(beforeAdvance.livingEnemyCap, 18);
  assert.equal(beforeAdvance.maximumLivingEnemies, 0);
  simulation.pendingSpawns[0].enemyId = 'skitter';
  assert.equal(beforeAdvance.pendingSpawnCount, 1);

  advanceSimulation(simulation, 1);
  assert.equal(simulation.terminal, false);
  assert.equal(simulation.enemies.length, 1);
  assert.equal(simulation.enemies[0].enemyId, 'skitter');
});

test('scheduled spawning replaces an unresolved defeated enemy without exceeding 18 living', () => {
  const simulation = createSimulation('level-1', { qa: true });
  simulation.enemies = Array.from({ length: 18 }, (_, index) => ({
    id: `enemy-${index + 1}`,
    health: index === 0 ? 0 : 10,
  }));
  simulation.waveSchedule = [{ enemyId: 'swarmkin', spawnTick: 0, waveIndex: 0 }];

  spawnScheduledEnemies(simulation);

  assert.equal(simulation.enemies.filter(({ health }) => health > 0).length, 18);
  assert.equal(simulation.enemies.length, 19);
  assert.equal(simulation.enemies.at(-1).enemyId, 'swarmkin');
  assert.equal(simulation.maximumLivingEnemies, 18);
});

test('full and presentation cap summaries are immutable values, not pending request references', () => {
  const simulation = createSimulation('level-10', { qa: true });
  simulation.waveSchedule = Array.from({ length: 19 }, () => ({
    enemyId: 'swarmkin', spawnTick: 0, waveIndex: 0,
  }));
  advanceSimulation(simulation, 1);

  const full = summarizeSimulation(simulation);
  const presentation = summarizePresentationSimulation(simulation);
  assert.deepEqual(
    [full.pendingSpawnCount, full.livingEnemyCap, full.maximumLivingEnemies],
    [1, 18, 18],
  );
  assert.deepEqual(
    [presentation.pendingSpawnCount, presentation.livingEnemyCap, presentation.maximumLivingEnemies],
    [1, 18, 18],
  );
  simulation.pendingSpawns[0].pathProgress = 999;
  assert.deepEqual(
    [full.pendingSpawnCount, full.livingEnemyCap, full.maximumLivingEnemies],
    [1, 18, 18],
  );
});

test('authored waves use integer ticks and snapshots are detached and deterministic', () => {
  const first = createSimulation('level-1', { qa: true, seed: 7 });
  const second = createSimulation('level-1', { qa: true, seed: 7 });

  advanceSimulation(first, 85);
  advanceSimulation(second, 85);
  const firstSummary = summarizeSimulation(first);
  const secondSummary = summarizeSimulation(second);
  assert.deepEqual(firstSummary, secondSummary);
  assert.deepEqual(firstSummary.enemies.map((enemy) => enemy.spawnTick), [0, 84]);
  firstSummary.enemies[0].health = 0;
  assert.notEqual(summarizeSimulation(first).enemies[0].health, 0);
});

test('full and presentation snapshots expose detached lane and enemy attack state', () => {
  const simulation = createSimulation('level-1', { qa: true, seed: 7 });
  issueCommand(simulation, {
    type: 'build', defenderId: 'bladeguard', cellId: 'r2c7',
  });

  advanceSimulation(simulation, 1);
  const fullEnemy = summarizeSimulation(simulation).enemies[0];
  const presentationEnemy = summarizePresentationSimulation(simulation).enemies[0];
  const expected = {
    attackDamage: 24,
    attackCooldownTicks: 72,
    attackWindupTicks: 22,
    attackTargets: ['frontline'],
    attackState: {
      targetTowerId: null,
      startedAtTick: null,
      impactAtTick: null,
      readyAtTick: 0,
    },
    laneState: 'moving',
    blockingTowerId: simulation.towers[0].id,
    queueIndex: null,
    laneOffset: -22,
    displayLaneOffset: -22,
    displayScale: 1,
  };

  for (const snapshot of [fullEnemy, presentationEnemy]) {
    assert.deepEqual(Object.fromEntries(Object.keys(expected).map((key) => [key, snapshot[key]])), expected);
  }
  fullEnemy.attackTargets.push('backline');
  fullEnemy.attackState.readyAtTick = 999;
  const freshEnemy = summarizeSimulation(simulation).enemies[0];
  assert.deepEqual(freshEnemy.attackTargets, ['frontline']);
  assert.equal(freshEnemy.attackState.readyAtTick, 0);
});

test('terminal cleanup cancels attack ownership and prevents stale impacts', () => {
  const simulation = createSimulation('level-1', { qa: true });
  simulation.waveSchedule = [];
  simulation.nextSpawnIndex = 0;
  simulation.spawnedAllWaves = true;
  simulation.castleHearts = 1;
  simulation.coins = 1_000;
  issueCommand(simulation, {
    type: 'build', defenderId: 'bladeguard', cellId: 'r2c7',
  });
  const [tower] = simulation.towers;
  tower.nextAttackTick = Number.MAX_SAFE_INTEGER;
  const config = ENEMIES['blight-walker'];
  const attacker = {
    id: 'enemy-2', enemyId: config.id, waveIndex: 0, spawnTick: 0,
    pathProgress: 243, health: 1_000, maxHealth: 1_000, speed: 0,
    armor: config.armor, clusterSize: 1, castleDamage: config.castleDamage,
    attackDamage: config.attackDamage, attackCooldownTicks: config.attackCooldownTicks,
    attackWindupTicks: config.attackWindupTicks, attackTargets: config.attackTargets,
    attackState: { targetTowerId: tower.id, startedAtTick: 0, impactAtTick: 10, readyAtTick: 72 },
    laneState: 'attacking', blockingTowerId: tower.id, queueIndex: null, laneOffset: 0,
    nextAbilityTick: 0, abilityActiveTicks: 0, nextAbilityActiveTick: 0, thresholdFlags: {},
  };
  const castleEnemy = {
    ...attacker,
    id: 'enemy-3',
    pathProgress: 1_000_000,
    attackState: { targetTowerId: null, startedAtTick: null, impactAtTick: null, readyAtTick: 0 },
    laneState: 'moving',
    blockingTowerId: null,
  };
  simulation.enemies = [attacker, castleEnemy];
  simulation.projectiles = [{ id: 'projectile-stale', sourceTowerId: tower.id, targetId: attacker.id, impactTick: 99 }];
  simulation.effects = [{
    id: 'effect-stale', sourceId: attacker.id, targetId: tower.id,
    kind: 'tower-stun', value: 1, expiresAtTick: 99,
  }];
  tower.engagedEnemyIds = [attacker.id];
  simulation.presentationEvents = [{
    id: 90, kind: 'enemy-attack-start', payload: { id: attacker.id }, tick: -1,
  }];
  simulation.nextPresentationEventId = 91;

  advanceSimulation(simulation, 1);

  assert.equal(simulation.terminal, true);
  assert.deepEqual(simulation.projectiles, []);
  assert.deepEqual(simulation.effects, []);
  assert.deepEqual(tower.engagedEnemyIds, []);
  assert.deepEqual(attacker.attackState, {
    targetTowerId: null,
    startedAtTick: null,
    impactAtTick: null,
    readyAtTick: 72,
  });
  assert.deepEqual(simulation.presentationEvents.map(({ id, kind, tick }) => ({ id, kind, tick })), [
    { id: 91, kind: 'castle-impact', tick: 0 },
    { id: 92, kind: 'wave-complete', tick: 0 },
    { id: 93, kind: 'wave-complete', tick: 0 },
    { id: 94, kind: 'battle-terminal', tick: 0 },
  ]);
  const healthAfterTerminal = tower.health;
  advanceSimulation(simulation, 100);
  assert.equal(tower.health, healthAfterTerminal);
});

test('terminal transient cleanup retains detached maximum attacker high-water summaries', () => {
  const simulation = createSimulation('level-1', { qa: true });
  simulation.waveSchedule = [];
  simulation.pendingSpawns = [];
  simulation.spawnedAllWaves = true;
  simulation.coins = 10_000;
  issueCommand(simulation, {
    type: 'build', defenderId: 'bladeguard', cellId: LEVELS[0].roadCells[11],
  });
  const config = ENEMIES['blight-walker'];
  simulation.enemies = Array.from({ length: 3 }, (_, index) => ({
    id: `enemy-${index + 20}`,
    enemyId: config.id,
    waveIndex: 0,
    spawnTick: index,
    pathProgress: 880,
    health: 1_000,
    maxHealth: 1_000,
    speed: 0,
    armor: config.armor,
    clusterSize: 1,
    castleDamage: config.castleDamage,
    attackDamage: config.attackDamage,
    attackCooldownTicks: config.attackCooldownTicks,
    attackWindupTicks: config.attackWindupTicks,
    attackTargets: config.attackTargets,
    attackState: {
      targetTowerId: null, startedAtTick: null, impactAtTick: null, readyAtTick: 0,
    },
    laneState: 'moving',
    blockingTowerId: null,
    queueIndex: null,
    laneOffset: 0,
    nextAbilityTick: config.cooldownTicks,
    abilityActiveTicks: 0,
    nextAbilityActiveTick: config.cooldownTicks,
    thresholdFlags: {},
  }));
  simulation.castleHearts = 0;

  advanceSimulation(simulation, 1);
  assert.equal(simulation.maximumConcurrentAttackers, 3);
  const deterministic = summarizeSimulation(simulation);
  const presentation = summarizePresentationSimulation(simulation);
  simulation.maximumConcurrentAttackers = 0;

  assert.equal(simulation.terminal, true);
  assert.deepEqual(simulation.towers[0].engagedEnemyIds, []);
  assert.equal(deterministic.maximumConcurrentAttackers, 3);
  assert.equal(presentation.maximumConcurrentAttackers, 3);
});

test('terminal victory snapshots preserve the final enemy hit and defeat before battle terminal', () => {
  const simulation = createSimulation('level-1', { qa: true });
  const bossConfig = ENEMIES['blight-walker'];
  simulation.waveSchedule = [];
  simulation.nextSpawnIndex = 0;
  simulation.spawnedAllWaves = true;
  simulation.presentationEvents = [{
    id: 40, kind: 'enemy-hit', payload: { id: 'stale-enemy' }, tick: -1,
  }];
  simulation.nextPresentationEventId = 41;
  simulation.enemies = [{
    id: 'enemy-1',
    enemyId: bossConfig.id,
    waveIndex: simulation.level.waveCount - 1,
    spawnTick: 0,
    pathProgress: 100,
    health: 1,
    maxHealth: bossConfig.health,
    speed: 0,
    armor: bossConfig.armor,
    clusterSize: 1,
    castleDamage: bossConfig.castleDamage,
    attackDamage: bossConfig.attackDamage,
    attackCooldownTicks: bossConfig.attackCooldownTicks,
    attackWindupTicks: bossConfig.attackWindupTicks,
    attackTargets: bossConfig.attackTargets,
    attackState: { targetTowerId: null, startedAtTick: null, impactAtTick: null, readyAtTick: 0 },
    laneState: 'moving',
    blockingTowerId: null,
    queueIndex: null,
    laneOffset: 0,
    nextAbilityTick: Number.MAX_SAFE_INTEGER,
    abilityActiveTicks: 0,
    nextAbilityActiveTick: 0,
    thresholdFlags: {},
  }];
  simulation.projectiles = [{
    id: 'projectile-final',
    sourceTowerId: 'tower-final',
    targetId: 'enemy-1',
    targetPathProgressAtLaunch: 100,
    launchPosition: { x: 0, y: 0 },
    launchTick: 0,
    impactTick: 0,
    damage: 10_000,
    armorPierce: 1,
    stunSeconds: 0,
    slow: 0,
    splashRadius: 0,
  }];

  advanceSimulation(simulation, 1);

  const snapshot = summarizePresentationSimulation(simulation);
  assert.equal(snapshot.terminal, true);
  assert.equal(snapshot.outcome, 'victory');
  assert.deepEqual(snapshot.presentationEvents.map(({ id, kind, tick }) => ({ id, kind, tick })), [
    { id: 41, kind: 'projectile-impact', tick: 0 },
    { id: 42, kind: 'enemy-hit', tick: 0 },
    { id: 43, kind: 'enemy-defeated', tick: 0 },
    { id: 44, kind: 'wave-complete', tick: 0 },
    { id: 45, kind: 'wave-complete', tick: 0 },
    { id: 46, kind: 'wave-complete', tick: 0 },
    { id: 47, kind: 'battle-terminal', tick: 0 },
  ]);
  assert.deepEqual(snapshot.enemies, []);
  assert.deepEqual(snapshot.projectiles, []);
});

test('restart and unload cleanup leave no transient combat state', () => {
  const simulation = createSimulation('level-1', { qa: true });
  simulation.coins = 1_000;
  issueCommand(simulation, {
    type: 'build', defenderId: 'bladeguard', cellId: 'r2c7',
  });
  const [tower] = simulation.towers;
  const config = ENEMIES['blight-walker'];
  simulation.enemies = [{
    id: 'enemy-2', enemyId: config.id, health: config.health,
    attackState: { targetTowerId: tower.id, startedAtTick: 1, impactAtTick: 23, readyAtTick: 73 },
    blockingTowerId: tower.id, queueIndex: null, laneState: 'attacking', laneOffset: 0,
  }];
  tower.engagedEnemyIds = ['enemy-2'];
  simulation.projectiles = [{ id: 'projectile-3' }];
  simulation.effects = [{ id: 'effect-4' }];
  simulation.pendingSpawns = [{
    enemyId: 'swarmkin', isSummon: true, pathProgress: 12, requestedTick: 1, sequence: 1, waveIndex: 0,
  }];
  simulation.presentationEvents = [{ id: 1, kind: 'enemy-attack-start', tick: 1, payload: {} }];

  clearPresentationEvents(simulation);

  assert.deepEqual(simulation.enemies[0].attackState, {
    targetTowerId: null,
    startedAtTick: null,
    impactAtTick: null,
    readyAtTick: 73,
  });
  assert.equal(simulation.enemies[0].blockingTowerId, null);
  assert.equal(simulation.enemies[0].laneState, 'moving');
  assert.deepEqual(tower.engagedEnemyIds, []);
  assert.deepEqual(simulation.projectiles, []);
  assert.deepEqual(simulation.effects, []);
  assert.deepEqual(simulation.pendingSpawns, []);
  assert.deepEqual(simulation.presentationEvents, []);

  const restarted = createSimulation('level-1', { qa: true });
  assert.deepEqual(restarted.enemies, []);
  assert.deepEqual(restarted.towers, []);
  assert.deepEqual(restarted.projectiles, []);
  assert.deepEqual(restarted.effects, []);
  assert.deepEqual(restarted.presentationEvents, []);
  assert.deepEqual(restarted.pendingSpawns, []);
  assert.equal(restarted.maximumLivingEnemies, 0);
});

test('targeting resolves role metrics then path progress, spawn tick, and entity id', () => {
  const candidates = [
    { id: 'enemy-4', speed: 40, armor: 0.1, clusterSize: 1, pathProgress: 10, spawnTick: 8 },
    { id: 'enemy-3', speed: 40, armor: 0.1, clusterSize: 1, pathProgress: 12, spawnTick: 9 },
    { id: 'enemy-2', speed: 40, armor: 0.1, clusterSize: 1, pathProgress: 12, spawnTick: 7 },
    { id: 'enemy-1', speed: 40, armor: 0.1, clusterSize: 1, pathProgress: 12, spawnTick: 7 },
  ];

  assert.equal(selectTarget(candidates, 'fastest').id, 'enemy-1');
  assert.equal(selectTarget([...candidates, {
    id: 'armored', speed: 20, armor: 0.8, clusterSize: 1, pathProgress: 1, spawnTick: 1,
  }], 'highest-armor').id, 'armored');
});

test('melee targeting exhausts its own attackers then its own queue before other candidates', () => {
  const attacker = {
    id: 'enemy-1', armor: 0, pathProgress: 10, spawnTick: 0,
    blockingTowerId: 'tower-1', laneState: 'attacking',
  };
  const queued = {
    id: 'enemy-2', armor: 0.1, pathProgress: 20, spawnTick: 0,
    blockingTowerId: 'tower-1', laneState: 'queued',
  };
  const other = {
    id: 'enemy-3', armor: 0.9, pathProgress: 30, spawnTick: 0,
    blockingTowerId: null, laneState: 'moving',
  };

  assert.equal(selectMeleeTarget([other, queued, attacker], 'highest-armor', 'tower-1'), attacker);
  assert.equal(selectMeleeTarget([other, queued], 'highest-armor', 'tower-1'), queued);
});

test('targeting orders matching entity ID prefixes by numeric suffix', () => {
  const candidates = [
    { id: 'enemy-10', speed: 40, armor: 0.1, clusterSize: 1, pathProgress: 12, spawnTick: 7 },
    { id: 'enemy-2', speed: 40, armor: 0.1, clusterSize: 1, pathProgress: 12, spawnTick: 7 },
  ];

  assert.equal(selectTarget(candidates, 'fastest').id, 'enemy-2');
});

test('public snapshots order matching entity ID prefixes by numeric suffix', () => {
  const simulation = createSimulation('level-1', { qa: true, seed: 7 });

  advanceSimulation(simulation, 817);

  assert.deepEqual(
    summarizeSimulation(simulation).enemies.map((enemy) => enemy.id),
    ['enemy-1', 'enemy-2', 'enemy-3', 'enemy-4', 'enemy-5', 'enemy-6', 'enemy-7', 'enemy-8', 'enemy-9', 'enemy-10'],
  );
});

test('strategy fixtures apply exact command ticks and reject unknown or cross-level strategies', () => {
  const first = runStrategyFixture('level-1', 'level-1-balanced');
  const second = runStrategyFixture('level-1', 'level-1-balanced');

  assert.deepEqual(first, second);
  assert.deepEqual({
    outcome: first.outcome,
    terminal: first.terminal,
    tick: first.tick,
    maximumLivingEnemies: first.maximumLivingEnemies,
    maximumConcurrentAttackers: first.maximumConcurrentAttackers,
    pendingSpawnCount: first.pendingSpawnCount,
  }, {
    outcome: 'victory',
    terminal: true,
    tick: 2086,
    maximumLivingEnemies: 3,
    maximumConcurrentAttackers: 3,
    pendingSpawnCount: 0,
  });
  assert.equal(first.towers[0].cellId, 'r2c6');
  assert.deepEqual(first.towers, [
    {
      id: 'tower-1', defenderId: 'bladeguard', cellId: 'r2c6', placementLayer: 'road', combatLayer: 'frontline',
      tier: 0, health: 420, maxHealth: 420, armor: 0.1, engagedEnemyIds: [], totalInvested: 50,
      attackCount: 0, masteryProgress: 0, nextAttackTick: 0,
    },
    {
      id: 'tower-2', defenderId: 'ranger', cellId: 'r1c6', placementLayer: 'grass', combatLayer: 'backline',
      tier: 1, health: 1, maxHealth: 1, armor: 0, engagedEnemyIds: [], totalInvested: 155,
      attackCount: 48, masteryProgress: 3, nextAttackTick: 2124,
    },
  ]);
  assert.throws(() => runStrategyFixture('level-1', 'missing'), /Unknown strategy: missing/);
  assert.throws(() => runStrategyFixture('level-1', 'level-2-balanced'), /does not belong to level-1/);
});

test('upgrade-ref rebinds to a same-ref replacement tower and clears stale refs on rejection', () => {
  const simulation = createSimulation('level-1', { qa: true });
  const refs = new Map();

  assert.deepEqual(issueStrategyCommand(simulation, {
    tick: 0,
    type: 'build',
    ref: 'frontline-a',
    defenderId: 'bladeguard',
    cellId: 'r2c6',
  }, refs), { accepted: true, reason: null });
  const originalTowerId = refs.get('frontline-a');
  assert.equal(typeof originalTowerId, 'string');

  assert.deepEqual(issueCommand(simulation, { type: 'sell', towerId: originalTowerId }), {
    accepted: true,
    reason: null,
  });
  assert.equal(simulation.towers.length, 0);

  assert.deepEqual(issueStrategyCommand(simulation, {
    tick: 0,
    type: 'upgrade-ref',
    ref: 'frontline-a',
  }, refs), { accepted: false, reason: 'missing-tower' });
  assert.equal(refs.has('frontline-a'), false, 'stale missing ref should be cleared after rejection');

  assert.deepEqual(issueStrategyCommand(simulation, {
    tick: 0,
    type: 'build',
    ref: 'frontline-a',
    defenderId: 'bladeguard',
    cellId: 'r2c6',
  }, refs), { accepted: true, reason: null });
  const replacementTowerId = refs.get('frontline-a');
  assert.notEqual(replacementTowerId, originalTowerId);

  assert.deepEqual(issueStrategyCommand(simulation, {
    tick: 0,
    type: 'upgrade-ref',
    ref: 'frontline-a',
  }, refs), { accepted: true, reason: null });
  assert.deepEqual(summarizeSimulation(simulation).purchaseHistory.map((purchase) => ({
    type: purchase.type,
    towerId: purchase.towerId,
    defenderId: purchase.defenderId,
    cellId: purchase.cellId,
    tier: purchase.tier ?? null,
  })), [
    {
      type: 'build',
      towerId: originalTowerId,
      defenderId: 'bladeguard',
      cellId: 'r2c6',
      tier: null,
    },
    {
      type: 'build',
      towerId: replacementTowerId,
      defenderId: 'bladeguard',
      cellId: 'r2c6',
      tier: null,
    },
    {
      type: 'upgrade',
      towerId: replacementTowerId,
      defenderId: 'bladeguard',
      cellId: 'r2c6',
      tier: 1,
    },
  ]);
});

test('presentation events are deterministic, monotonic, bounded, and expose attack mastery progress', async () => {
  const {
    PRESENTATION_EVENT_LIMIT,
    emitPresentationEvent,
  } = await import('../public/Games/DefenderChampion/src/core/presentation-events.js');
  const first = createSimulation('level-1', { qa: true, seed: 13 });
  const second = createSimulation('level-1', { qa: true, seed: 13 });
  for (const simulation of [first, second]) {
    issueCommand(simulation, {
      type: 'build', defenderId: 'ranger', cellId: 'r0c5',
    });
    advanceSimulation(simulation, 1);
    simulation.enemies[0].pathProgress = 264;
    advanceSimulation(simulation, 239);
  }
  const firstSummary = summarizeSimulation(first);
  const secondSummary = summarizeSimulation(second);
  assert.deepEqual(firstSummary.presentationEvents, secondSummary.presentationEvents);
  assert.ok(firstSummary.presentationEvents.some(({ kind }) => kind === 'wave-start'));
  assert.ok(firstSummary.presentationEvents.some(({ kind }) => kind === 'tower-attack'));
  assert.equal(typeof firstSummary.towers[0].attackCount, 'number');
  assert.equal(typeof firstSummary.towers[0].nextAttackTick, 'number');
  assert.equal(typeof firstSummary.towers[0].masteryProgress, 'number');
  assert.ok(firstSummary.presentationEvents.every((event, index, events) => (
    index === 0 || event.id > events[index - 1].id
  )));

  for (let index = 0; index < PRESENTATION_EVENT_LIMIT + 50; index += 1) {
    emitPresentationEvent(first, 'qa-bounded-event', { index });
  }
  const bounded = summarizeSimulation(first).presentationEvents;
  assert.equal(bounded.length, PRESENTATION_EVENT_LIMIT);
  assert.equal(bounded.at(-1).payload.index, PRESENTATION_EVENT_LIMIT + 49);
});

test('projectile snapshots retain launch data after their source tower is sold', () => {
  const simulation = createSimulation('level-1', { qa: true, seed: 17 });
  issueCommand(simulation, {
    type: 'build', defenderId: 'ranger', cellId: 'r1c5',
  });
  advanceSimulation(simulation, 1);
  simulation.enemies[0].pathProgress = 264;
  advanceSimulation(simulation, 1);
  const towerId = simulation.towers[0].id;
  assert.ok(simulation.projectiles.length > 0);
  issueCommand(simulation, { type: 'sell', towerId });
  const [projectile] = summarizeSimulation(simulation).projectiles;

  assert.equal(projectile.sourceTowerId, towerId);
  assert.equal(projectile.launchTick, 0);
  assert.deepEqual(projectile.launchPosition, cellCenter('r1c5'));
  assert.equal(typeof projectile.targetPathProgressAtLaunch, 'number');
  assert.equal(typeof projectile.targetDisplayPathProgressAtLaunch, 'number');
  assert.equal(typeof projectile.targetDisplayLaneOffsetAtLaunch, 'number');
  assert.equal(typeof projectile.targetDisplayScaleAtLaunch, 'number');
  assert.equal(projectile.targetDisplayPathProgressAtLaunch, projectile.targetPathProgressAtLaunch);
  assert.equal(projectile.targetDisplayLaneOffsetAtLaunch, 0);
  assert.equal(projectile.targetDisplayScaleAtLaunch, 1);
  assert.equal(summarizeSimulation(simulation).towers.length, 0);
});

test('between-wave countdown follows authored start ticks through overlapping enemies at Levels 1 and 4', async () => {
  const { resolveBetweenWaveCountdown } = await import(
    '../public/Games/DefenderChampion/src/presentation.js'
  );

  for (const levelId of ['level-1', 'level-4']) {
    const simulation = createSimulation(levelId, { qa: true });
    const waveStarts = Array.from(
      { length: simulation.level.waveCount },
      (_unused, waveIndex) => simulation.waveSchedule.find((entry) => entry.waveIndex === waveIndex).spawnTick,
    );
    const nextStartTick = waveStarts[1];

    advanceSimulation(simulation, nextStartTick - WAVE_GAP_TICKS);
    let summary = summarizeSimulation(simulation);
    assert.equal(summary.nextWaveIndex, 1, `${levelId} next wave index`);
    assert.equal(summary.nextWaveStartTick, nextStartTick, `${levelId} next wave start`);
    assert.equal(resolveBetweenWaveCountdown(summary, WAVE_GAP_TICKS), 3);
    assert.equal(summary.enemies.some(({ waveIndex }) => waveIndex === 0), true, `${levelId} overlap`);

    advanceSimulation(simulation, 60);
    summary = summarizeSimulation(simulation);
    assert.equal(resolveBetweenWaveCountdown(summary, WAVE_GAP_TICKS), 2);
    advanceSimulation(simulation, 60);
    summary = summarizeSimulation(simulation);
    assert.equal(resolveBetweenWaveCountdown(summary, WAVE_GAP_TICKS), 1);
    advanceSimulation(simulation, 60);
    summary = summarizeSimulation(simulation);
    assert.equal(summary.tick, nextStartTick);
    assert.equal(resolveBetweenWaveCountdown(summary, WAVE_GAP_TICKS), null);
    assert.equal(summary.presentationEvents.some(({ kind, tick, payload }) => (
      kind === 'wave-start' && tick === nextStartTick && payload.waveIndex === 1
    )), false);

    advanceSimulation(simulation, 1);
    summary = summarizeSimulation(simulation);
    assert.equal(resolveBetweenWaveCountdown(summary, WAVE_GAP_TICKS), null);
    assert.equal(summary.presentationEvents.some(({ kind, tick, payload }) => (
      kind === 'wave-start' && tick === nextStartTick && payload.waveIndex === 1
    )), true);

    const finalStartTick = waveStarts.at(-1);
    advanceSimulation(simulation, finalStartTick - summary.tick + 1);
    summary = summarizeSimulation(simulation);
    assert.equal(summary.waveIndex, simulation.level.waveCount - 1);
    assert.equal(summary.nextWaveIndex, null);
    assert.equal(summary.nextWaveStartTick, null);
    assert.equal(resolveBetweenWaveCountdown(summary, WAVE_GAP_TICKS), null);
  }
});

test('terminal simulations reject every gameplay command without changing coins, entities, time, or pause state', () => {
  const simulation = createSimulation('level-1', { qa: true });
  issueCommand(simulation, { type: 'build', defenderId: 'bladeguard', cellId: 'r2c7' });
  simulation.terminal = true;
  simulation.outcome = 'victory';
  const before = summarizeSimulation(simulation);
  const commands = [
    { type: 'build', defenderId: 'ranger', cellId: 'r0c5' },
    { type: 'upgrade', towerId: 'tower-1' },
    { type: 'sell', towerId: 'tower-1' },
    { type: 'set-speed', value: 2 },
    { type: 'set-pause-reason', reason: 'manual', active: true },
  ];

  for (const command of commands) {
    assert.deepEqual(issueCommand(simulation, command), { accepted: false, reason: 'battle-terminal' });
    assert.deepEqual(summarizeSimulation(simulation), before);
  }
  advanceSimulation(simulation, 120);
  assert.deepEqual(summarizeSimulation(simulation), before);
});
