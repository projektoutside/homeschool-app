import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFENDERS } from '../public/Games/DefenderChampion/src/config/defenders.js';
import { LEVELS, getLevel } from '../public/Games/DefenderChampion/src/config/levels.js';
import { resolvePlacementPoint } from '../public/Games/DefenderChampion/src/core/path-geometry.js';
import { REFERENCE_STRATEGIES } from '../public/Games/DefenderChampion/src/config/reference-strategies.js';
import {
  advanceSimulation,
  createSimulation,
  issueCommand,
  runStrategyFixture,
  summarizePresentationSimulation,
  summarizeSimulation,
} from '../public/Games/DefenderChampion/src/core/simulation.js';
import { selectTarget } from '../public/Games/DefenderChampion/src/core/targeting.js';
import { WAVE_GAP_TICKS } from '../public/Games/DefenderChampion/src/core/wave-controller.js';

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

test('build commands accept a legal defender and reject occupied pads without changing coins', () => {
  const simulation = createSimulation('level-1', { qa: true, seed: 7 });

  assert.deepEqual(issueCommand(simulation, {
    type: 'build', defenderId: 'bladeguard', padId: 'l1-pad-a',
  }), { accepted: true, reason: null });
  assert.deepEqual(issueCommand(simulation, {
    type: 'build', defenderId: 'ranger', padId: 'l1-pad-a',
  }), { accepted: false, reason: 'pad-occupied' });

  const summary = summarizeSimulation(simulation);
  assert.equal(summary.coins, 100);
  assert.deepEqual(summary.towers, [{
    id: 'tower-1', defenderId: 'bladeguard', padId: 'l1-pad-a', tier: 0, totalInvested: 50,
    attackCount: 0, masteryProgress: 0, nextAttackTick: 0,
  }]);
});

test('invalid economy commands reject without mutating the public summary', () => {
  const simulation = createSimulation('level-1', { qa: true, seed: 7 });
  const expectRejectedWithoutMutation = (command, reason) => {
    const before = summarizeSimulation(simulation);
    assert.deepEqual(issueCommand(simulation, command), { accepted: false, reason });
    assert.deepEqual(summarizeSimulation(simulation), before);
  };

  expectRejectedWithoutMutation({ type: 'build', defenderId: 'missing', padId: 'l1-pad-a' }, 'invalid-defender');
  expectRejectedWithoutMutation({ type: 'build', defenderId: 'bladeguard', padId: 'missing-pad' }, 'invalid-pad');
  assert.deepEqual(issueCommand(simulation, {
    type: 'build', defenderId: 'ironwarden', padId: 'l1-pad-a',
  }), { accepted: true, reason: null });
  expectRejectedWithoutMutation({ type: 'build', defenderId: 'bladeguard', padId: 'l1-pad-b' }, 'insufficient-coins');
  expectRejectedWithoutMutation({ type: 'upgrade', towerId: 'missing-tower' }, 'missing-tower');
  expectRejectedWithoutMutation({ type: 'sell', towerId: 'missing-tower' }, 'missing-tower');

  assert.deepEqual(issueCommand(simulation, { type: 'sell', towerId: 'tower-1' }), { accepted: true, reason: null });
  expectRejectedWithoutMutation({ type: 'sell', towerId: 'tower-1' }, 'missing-tower');

  const maxTierSimulation = createSimulation('level-1', { qa: true });
  maxTierSimulation.coins = 500;
  assert.deepEqual(issueCommand(maxTierSimulation, {
    type: 'build', defenderId: 'bladeguard', padId: 'l1-pad-b',
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

  issueCommand(simulation, { type: 'build', defenderId: 'bladeguard', padId: 'l1-pad-a' });
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
  assert.deepEqual(first.towers, [
    {
      id: 'tower-1', defenderId: 'ranger', padId: 'l1-pad-a', tier: 0, totalInvested: 70,
      attackCount: 48, masteryProgress: 3, nextAttackTick: 3090,
    },
    {
      id: 'tower-2', defenderId: 'bladeguard', padId: 'l1-pad-b', tier: 0, totalInvested: 50,
      attackCount: 0, masteryProgress: 0, nextAttackTick: 0,
    },
  ]);
  assert.throws(() => runStrategyFixture('level-1', 'missing'), /Unknown strategy: missing/);
  assert.throws(() => runStrategyFixture('level-1', 'level-2-balanced'), /does not belong to level-1/);
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
      type: 'build', defenderId: 'ranger', padId: 'l1-pad-a',
    });
    advanceSimulation(simulation, 1);
    simulation.enemies[0].pathProgress = LEVELS[0].pads[0].pathProgress;
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
    type: 'build', defenderId: 'ranger', padId: 'l1-pad-a',
  });
  advanceSimulation(simulation, 1);
  simulation.enemies[0].pathProgress = LEVELS[0].pads[0].pathProgress;
  advanceSimulation(simulation, 1);
  const towerId = simulation.towers[0].id;
  assert.ok(simulation.projectiles.length > 0);
  issueCommand(simulation, { type: 'sell', towerId });
  const [projectile] = summarizeSimulation(simulation).projectiles;

  assert.equal(projectile.sourceTowerId, towerId);
  assert.equal(projectile.launchTick, 1);
  assert.deepEqual(projectile.launchPosition, resolvePlacementPoint(
    LEVELS[0],
    LEVELS[0].pads.find(({ id }) => id === 'l1-pad-a'),
  ));
  assert.equal(typeof projectile.targetPathProgressAtLaunch, 'number');
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
  issueCommand(simulation, { type: 'build', defenderId: 'bladeguard', padId: 'l1-pad-a' });
  simulation.terminal = true;
  simulation.outcome = 'victory';
  const before = summarizeSimulation(simulation);
  const commands = [
    { type: 'build', defenderId: 'ranger', padId: 'l1-pad-b' },
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
