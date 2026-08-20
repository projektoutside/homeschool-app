import assert from 'node:assert/strict';
import test from 'node:test';

import { LEVELS } from '../public/Games/DefenderChampion/src/config/levels.js';

import {
  advanceEnemyAttacks,
  applyDefenderDamage,
  assignLanePositions,
  createQueuePresentationLayout,
  selectAttackersForGate,
  selectEnemyAttackTarget,
} from '../public/Games/DefenderChampion/src/core/lane-combat.js';
import {
  createGridPathMetrics,
} from '../public/Games/DefenderChampion/src/core/grid-geometry.js';
import { projectGridPathProgress } from '../public/Games/DefenderChampion/src/grid-presentation.js';
import * as laneCombat from '../public/Games/DefenderChampion/src/core/lane-combat.js';
import {
  createSimulation as createGameSimulation,
  issueCommand,
} from '../public/Games/DefenderChampion/src/core/simulation.js';
import {
  enqueueEnemySpawn,
  flushPendingEnemySpawns,
} from '../public/Games/DefenderChampion/src/core/wave-controller.js';

const FIRST_GATE_CELL_ID = LEVELS[0].roadCells[2];
const MIDDLE_GATE_CELL_ID = LEVELS[0].roadCells[3];
const SECOND_GATE_CELL_ID = LEVELS[0].roadCells[4];
const GRASS_CELL_ID = 'r0c5';

const createTower = ({
  id,
  cellId,
  combatLayer = 'frontline',
  health = 100,
  armor = 0,
}) => ({
  id,
  cellId,
  placementLayer: combatLayer === 'frontline' ? 'road' : 'grass',
  combatLayer,
  health,
  maxHealth: health,
  armor,
  engagedEnemyIds: [],
});

const createEnemy = ({
  id,
  pathProgress,
  spawnTick = 0,
  attackDamage = 10,
  attackCooldownTicks = 12,
  attackWindupTicks = 3,
  attackTargets = ['frontline'],
}) => ({
  id,
  enemyId: 'test-enemy',
  pathProgress,
  spawnTick,
  health: 20,
  maxHealth: 20,
  attackDamage,
  attackCooldownTicks,
  attackWindupTicks,
  attackTargets,
  attackState: {
    targetTowerId: null,
    startedAtTick: null,
    impactAtTick: null,
    readyAtTick: 0,
  },
  laneState: 'moving',
  blockingTowerId: null,
  queueIndex: null,
  laneOffset: 0,
});

const createSimulation = ({ towers, enemies, tick = 0 } = {}) => ({
  tick,
  coins: 75,
  level: LEVELS[0],
  towers: towers ?? [
    createTower({ id: 'tower-1', cellId: FIRST_GATE_CELL_ID }),
    createTower({ id: 'tower-2', cellId: SECOND_GATE_CELL_ID }),
  ],
  enemies: enemies ?? [],
  projectiles: [],
  effects: [],
  presentationEvents: [],
  nextPresentationEventId: 1,
});

const createGridLaneFixture = ({ gateCellId, enemyCount }) => {
  const simulation = createGameSimulation('level-1', { qa: true });
  simulation.waveSchedule = [];
  simulation.pendingSpawns = [];
  simulation.spawnedAllWaves = true;
  simulation.coins = 10_000;
  assert.equal(issueCommand(simulation, {
    type: 'build', defenderId: 'bladeguard', cellId: gateCellId,
  }).accepted, true);
  const gateProgress = simulation.level.roadCells.indexOf(gateCellId) * 80;
  simulation.enemies = Array.from({ length: enemyCount }, (_, index) => createEnemy({
    id: `enemy-${index + 20}`,
    pathProgress: Math.max(0, gateProgress - 1),
    spawnTick: index,
  }));
  simulation.pathMetrics = createGridPathMetrics(simulation.level.roadCells);
  return simulation;
};

test('a living road defender stops the whole lane with three attackers and a stable queue', () => {
  const simulation = createSimulation({
    enemies: [
      createEnemy({ id: 'enemy-1', pathProgress: 154, spawnTick: 5 }),
      createEnemy({ id: 'enemy-2', pathProgress: 155, spawnTick: 4 }),
      createEnemy({ id: 'enemy-3', pathProgress: 156, spawnTick: 3 }),
      createEnemy({ id: 'enemy-4', pathProgress: 157, spawnTick: 2 }),
      createEnemy({ id: 'enemy-5', pathProgress: 158, spawnTick: 1 }),
      createEnemy({ id: 'enemy-6', pathProgress: 159, spawnTick: 0 }),
    ],
  });

  const state = assignLanePositions(simulation);
  const [firstGate] = state.gates;

  assert.deepEqual(state.gates.map(({ towerId }) => towerId), ['tower-1', 'tower-2']);
  assert.deepEqual(firstGate.attackerIds, ['enemy-6', 'enemy-5', 'enemy-4']);
  assert.deepEqual(firstGate.queuedIds, ['enemy-3', 'enemy-2', 'enemy-1']);
  assert.equal(simulation.enemies.every((enemy) => enemy.pathProgress <= firstGate.pathProgress), true);
  assert.deepEqual(simulation.towers[0].engagedEnemyIds, ['enemy-6', 'enemy-5', 'enemy-4']);
  assert.deepEqual(
    simulation.enemies.filter(({ laneState }) => laneState === 'attacking').map(({ id }) => id),
    ['enemy-4', 'enemy-5', 'enemy-6'],
  );
  assert.deepEqual(
    simulation.enemies.filter(({ laneState }) => laneState === 'queued').map(({ id, queueIndex }) => ({ id, queueIndex })),
    [
      { id: 'enemy-1', queueIndex: 2 },
      { id: 'enemy-2', queueIndex: 1 },
      { id: 'enemy-3', queueIndex: 0 },
    ],
  );
  assert.equal(simulation.enemies.every(({ blockingTowerId }) => blockingTowerId === 'tower-1'), true);
  assert.equal(simulation.enemies.every(({ laneOffset }) => Number.isFinite(laneOffset)), true);
  assert.equal(simulation.enemies.every(({ laneOffset }) => Math.abs(laneOffset) <= 56), true);
});

test('a road-cell defender owns one whole-lane grid gate with three attackers', () => {
  const gateCellId = LEVELS[0].roadCells[20];
  const simulation = createGridLaneFixture({ gateCellId, enemyCount: 18 });
  const state = assignLanePositions(simulation);
  assert.equal(state.gates[0].pathProgress, 20 * 80);
  assert.deepEqual(state.gates[0].attackerIds, ['enemy-20', 'enemy-21', 'enemy-22']);
  assert.deepEqual(state.gates[0].queuedIds, [
    'enemy-23', 'enemy-24', 'enemy-25', 'enemy-26', 'enemy-27',
    'enemy-28', 'enemy-29', 'enemy-30', 'enemy-31', 'enemy-32',
    'enemy-33', 'enemy-34', 'enemy-35', 'enemy-36', 'enemy-37',
  ]);
  assert.equal(simulation.enemies.every(({ displayScale }) => displayScale === 1), true);
  assert.equal(new Set(simulation.enemies.map(({ displayPathProgress }) => displayPathProgress)).size, 18);
  const projectedPositions = simulation.enemies.map((enemy) => projectGridPathProgress(
    simulation.pathMetrics,
    enemy.displayPathProgress,
    enemy.displayLaneOffset,
  ));
  assert.equal(new Set(projectedPositions.map(({ x, y }) => `${x}:${y}`)).size, 18);
  assert.deepEqual(
    simulation.enemies
      .filter(({ laneState }) => laneState === 'attacking')
      .map(({ id, displayLaneOffset, displayPathProgress }) => ({
        id, displayLaneOffset, displayPathProgress,
      })),
    [
      { id: 'enemy-20', displayLaneOffset: -22, displayPathProgress: 1572 },
      { id: 'enemy-21', displayLaneOffset: 0, displayPathProgress: 1570 },
      { id: 'enemy-22', displayLaneOffset: 22, displayPathProgress: 1568 },
    ],
  );
  assert.deepEqual(
    simulation.enemies
      .filter(({ laneState }) => laneState === 'queued')
      .sort((first, second) => first.queueIndex - second.queueIndex)
      .map(({ displayLaneOffset, displayPathProgress }) => [displayLaneOffset, displayPathProgress]),
    [
      [-22, 1524], [0, 1476], [22, 1428], [-22, 1380], [0, 1332],
      [22, 1284], [-22, 1236], [0, 1188], [22, 1140], [-22, 1092],
      [0, 1044], [22, 996], [-22, 948], [0, 900], [22, 852],
    ],
  );
  assert.equal(simulation.enemies.every(({ displayLaneOffset }) => (
    Math.abs(displayLaneOffset) <= 22
  )), true);
  assert.equal(simulation.maximumConcurrentAttackers, 3);

  simulation.towers = [];
  assignLanePositions(simulation);
  assert.equal(simulation.maximumConcurrentAttackers, 3);
});

test('an early gate backpressures new spawns before queue art overlaps', () => {
  const gateCellId = LEVELS[0].roadCells[2];
  const simulation = createGridLaneFixture({ gateCellId, enemyCount: 3 });
  assert.equal(laneCombat.deriveReadableSpawnCapacity?.(simulation), 5);
});

test('a congested early road-cell gate waits for readable capacity without deleting the 18-body FIFO', () => {
  const simulation = createGameSimulation('level-1', { qa: true });
  simulation.waveSchedule = [];
  simulation.pendingSpawns = [];
  simulation.spawnedAllWaves = true;
  simulation.coins = 10_000;
  for (let index = 0; index < 18; index += 1) {
    enqueueEnemySpawn(simulation, {
      enemyId: 'blight-walker', pathProgress: 0, waveIndex: 0,
    });
  }
  flushPendingEnemySpawns(simulation);
  const originalEntityIds = simulation.enemies.map(({ id }) => id);
  assert.deepEqual(originalEntityIds, [
    'enemy-1', 'enemy-2', 'enemy-3', 'enemy-4', 'enemy-5', 'enemy-6',
    'enemy-7', 'enemy-8', 'enemy-9', 'enemy-10', 'enemy-11', 'enemy-12',
    'enemy-13', 'enemy-14', 'enemy-15', 'enemy-16', 'enemy-17', 'enemy-18',
  ]);

  const gateCellId = LEVELS[0].roadCells[2];
  assert.deepEqual(issueCommand(simulation, {
    type: 'build', defenderId: 'bladeguard', cellId: gateCellId,
  }), { accepted: false, reason: 'enemy-occupied' });
  assert.equal(simulation.coins, 10_000);
  assert.deepEqual(simulation.enemies.map(({ id }) => id), originalEntityIds);
  assert.deepEqual(simulation.towers, []);

  const downstreamProgress = [
    241, 289, 337, 385, 433, 481, 529, 577, 625, 673, 721, 769, 817,
  ];
  simulation.enemies.slice(5).forEach((enemy, index) => {
    enemy.pathProgress = downstreamProgress[index];
  });
  assert.deepEqual(issueCommand(simulation, {
    type: 'build', defenderId: 'bladeguard', cellId: gateCellId,
  }), { accepted: true, reason: null });
  assert.equal(simulation.coins, 9_950);
  enqueueEnemySpawn(simulation, { enemyId: 'skitter', pathProgress: 0, waveIndex: 0 });
  enqueueEnemySpawn(simulation, { enemyId: 'shellguard', pathProgress: 0, waveIndex: 0 });
  flushPendingEnemySpawns(simulation);
  simulation.pathMetrics = createGridPathMetrics(simulation.level.roadCells);
  const state = assignLanePositions(simulation);

  assert.deepEqual(simulation.enemies.map(({ id }) => id), originalEntityIds);
  assert.deepEqual(state.gates[0].attackerIds, ['enemy-1', 'enemy-2', 'enemy-3']);
  assert.deepEqual(state.gates[0].queuedIds, ['enemy-4', 'enemy-5']);
  assert.equal(simulation.maximumConcurrentAttackers, 3);
  assert.deepEqual(
    simulation.enemies
      .filter(({ queueIndex }) => queueIndex !== null)
      .sort((first, second) => first.queueIndex - second.queueIndex)
      .map(({ id, displayLaneOffset, displayPathProgress }) => ({
        id, displayLaneOffset, displayPathProgress,
      })),
    [
      { id: 'enemy-4', displayLaneOffset: -22, displayPathProgress: 84 },
      { id: 'enemy-5', displayLaneOffset: 0, displayPathProgress: 36 },
    ],
  );
  assert.equal(simulation.enemies.every(({ displayScale }) => displayScale === 1), true);
  assert.equal(simulation.enemies.every(({ displayLaneOffset }) => (
    Math.abs(displayLaneOffset) <= 22
  )), true);
  assert.deepEqual(
    simulation.enemies.slice(5).map(({ pathProgress }) => pathProgress),
    downstreamProgress,
  );
  const queuePositions = simulation.enemies
    .filter(({ queueIndex }) => queueIndex !== null)
    .sort((first, second) => first.queueIndex - second.queueIndex)
    .map((enemy) => projectGridPathProgress(
      simulation.pathMetrics,
      enemy.displayPathProgress,
      enemy.displayLaneOffset,
    ));
  assert.equal(Math.hypot(
    queuePositions[0].x - queuePositions[1].x,
    queuePositions[0].y - queuePositions[1].y,
  ) >= 48, true);
  const projectedPositions = simulation.enemies.map((enemy) => projectGridPathProgress(
    simulation.pathMetrics,
    enemy.displayPathProgress,
    enemy.displayLaneOffset,
  ));
  assert.equal(new Set(projectedPositions.map(({ x, y }) => `${x}:${y}`)).size, 18);
  assert.deepEqual(
    simulation.pendingSpawns.map(({ enemyId, sequence }) => ({ enemyId, sequence })),
    [
      { enemyId: 'skitter', sequence: 19 },
      { enemyId: 'shellguard', sequence: 20 },
    ],
  );

  simulation.enemies[0].health = 0;
  simulation.towers = [];
  flushPendingEnemySpawns(simulation);
  assert.equal(simulation.enemies.at(-1).enemyId, 'skitter');
  assert.deepEqual(
    simulation.pendingSpawns.map(({ enemyId, sequence }) => ({ enemyId, sequence })),
    [{ enemyId: 'shellguard', sequence: 20 }],
  );
});

test('a malformed cell tower never becomes a lane gate', () => {
  const simulation = createSimulation({
    towers: [createTower({ id: 'tower-1', cellId: 'invalid-cell' })],
    enemies: [createEnemy({ id: 'enemy-1', pathProgress: 100 })],
  });

  assert.deepEqual(assignLanePositions(simulation).gates, []);
  assert.equal(simulation.enemies[0].blockingTowerId, null);
  assert.equal(laneCombat.deriveReadableSpawnCapacity(simulation), 18);
});

test('a non-frontline road tower never becomes a lane gate', () => {
  const simulation = createSimulation({
    towers: [{
      ...createTower({ id: 'tower-1', cellId: FIRST_GATE_CELL_ID }),
      combatLayer: 'backline',
    }],
    enemies: [createEnemy({ id: 'enemy-1', pathProgress: 100 })],
  });

  assert.deepEqual(assignLanePositions(simulation).gates, []);
  assert.equal(simulation.enemies[0].blockingTowerId, null);
  assert.equal(laneCombat.deriveReadableSpawnCapacity(simulation), 18);
});

test('a tower on a non-road cell never becomes a lane gate', () => {
  const simulation = createSimulation({
    towers: [createTower({ id: 'tower-1', cellId: GRASS_CELL_ID })],
    enemies: [createEnemy({ id: 'enemy-1', pathProgress: 100 })],
  });

  assert.deepEqual(assignLanePositions(simulation).gates, []);
  assert.equal(simulation.enemies[0].blockingTowerId, null);
  assert.equal(laneCombat.deriveReadableSpawnCapacity(simulation), 18);
});

test('malformed externally injected interval state clamps deterministically without readability claims', () => {
  const simulation = createSimulation({
    towers: [
      createTower({ id: 'tower-1', cellId: LEVELS[0].roadCells[2] }),
      createTower({ id: 'tower-2', cellId: LEVELS[0].roadCells[3] }),
    ],
    enemies: Array.from({ length: 18 }, (_, index) => createEnemy({
      id: `enemy-${index + 20}`,
      pathProgress: 239,
      spawnTick: index,
    })),
  });
  simulation.pathMetrics = createGridPathMetrics(simulation.level.roadCells);

  const state = assignLanePositions(simulation);

  assert.deepEqual(state.gates[0].attackerIds, []);
  assert.deepEqual(state.gates[1].attackerIds, ['enemy-20', 'enemy-21', 'enemy-22']);
  assert.deepEqual(state.gates[1].queuedIds, [
    'enemy-23', 'enemy-24', 'enemy-25', 'enemy-26', 'enemy-27',
    'enemy-28', 'enemy-29', 'enemy-30', 'enemy-31', 'enemy-32',
    'enemy-33', 'enemy-34', 'enemy-35', 'enemy-36', 'enemy-37',
  ]);
  assert.deepEqual(
    simulation.enemies
      .filter(({ queueIndex }) => queueIndex !== null)
      .sort((first, second) => first.queueIndex - second.queueIndex)
      .map(({ displayPathProgress }) => displayPathProgress),
    [
      164, 161, 161, 161, 161, 161, 161, 161,
      161, 161, 161, 161, 161, 161, 161,
    ],
  );
  assert.deepEqual(
    simulation.enemies
      .filter(({ queueIndex }) => queueIndex !== null)
      .sort((first, second) => first.queueIndex - second.queueIndex)
      .map(({ pathProgress }) => pathProgress),
    [164, 161, 161, 161, 161, 161, 161, 161, 161, 161, 161, 161, 161, 161, 161],
  );
  assert.equal(simulation.enemies.every(({ pathProgress }) => (
    pathProgress > 160 && pathProgress < 240
  )), true);
  assert.equal(simulation.enemies.every(({ displayScale }) => displayScale === 1), true);
  assert.equal(simulation.enemies.every(({ displayLaneOffset }) => (
    Math.abs(displayLaneOffset) <= 22
  )), true);
  assert.equal(simulation.enemies.every(({ displayPathProgress }) => (
    Number.isFinite(displayPathProgress)
  )), true);
});

test('a lane with no living road-cell gate retains the full readable spawn capacity', () => {
  const simulation = createGridLaneFixture({
    gateCellId: LEVELS[0].roadCells[2],
    enemyCount: 0,
  });
  simulation.towers[0].health = 0;
  assert.equal(laneCombat.deriveReadableSpawnCapacity?.(simulation), 18);
});

test('fixed-scale queue slots use hand-authored 48-progress spacing and bounded offsets', () => {
  const slots = createQueuePresentationLayout({ gatePathProgress: 160, queueCount: 2 });
  assert.deepEqual(slots, [
    { laneOffset: -22, pathProgress: 84, scale: 1 },
    { laneOffset: 0, pathProgress: 36, scale: 1 },
  ]);
});

test('gate and attacker ties use numeric entity IDs without mutating the candidate list', () => {
  const candidates = [
    createEnemy({ id: 'enemy-10', pathProgress: 90, spawnTick: 4 }),
    createEnemy({ id: 'enemy-2', pathProgress: 90, spawnTick: 4 }),
    createEnemy({ id: 'enemy-1', pathProgress: 90, spawnTick: 4 }),
  ];
  const originalOrder = candidates.map(({ id }) => id);

  assert.deepEqual(
    selectAttackersForGate(candidates, { towerId: 'tower-1', pathProgress: 100 }, 3).map(({ id }) => id),
    ['enemy-1', 'enemy-2', 'enemy-10'],
  );
  assert.deepEqual(candidates.map(({ id }) => id), originalOrder);

  const simulation = createSimulation({
    towers: [
      createTower({ id: 'tower-10', cellId: FIRST_GATE_CELL_ID }),
      createTower({ id: 'tower-2', cellId: FIRST_GATE_CELL_ID }),
    ],
    enemies: [],
  });
  assert.deepEqual(assignLanePositions(simulation).gates.map(({ towerId }) => towerId), ['tower-2', 'tower-10']);
});

test('an enemy moves toward its reserved contact slot before it may start an attack', () => {
  const enemy = createEnemy({ id: 'enemy-1', pathProgress: 10 });
  const simulation = createSimulation({
    towers: [createTower({ id: 'tower-1', cellId: FIRST_GATE_CELL_ID })],
    enemies: [enemy],
  });

  const state = assignLanePositions(simulation);
  advanceEnemyAttacks(simulation);

  assert.deepEqual(state.gates[0].attackerIds, ['enemy-1']);
  assert.equal(enemy.blockingTowerId, 'tower-1');
  assert.equal(enemy.laneState, 'moving');
  assert.equal(enemy.pathProgress, 10);
  assert.deepEqual(enemy.attackState, {
    targetTowerId: null,
    startedAtTick: null,
    impactAtTick: null,
    readyAtTick: 0,
  });
});

test('a moving enemy cannot bypass its reserved living gate by overshooting the contact slot', () => {
  const enemy = createEnemy({ id: 'enemy-1', pathProgress: 10 });
  const simulation = createSimulation({ enemies: [enemy] });
  assignLanePositions(simulation);
  assert.equal(enemy.blockingTowerId, 'tower-1');

  enemy.pathProgress = 165;
  const state = assignLanePositions(simulation);

  assert.deepEqual(state.gates[0].attackerIds, ['enemy-1']);
  assert.deepEqual(state.gates[1].attackerIds, []);
  assert.equal(enemy.blockingTowerId, 'tower-1');
  assert.equal(enemy.laneState, 'attacking');
  assert.equal(enemy.pathProgress < 160, true);
});

test('a newly built nearer gate supersedes a farther reservation before the enemy reaches it', () => {
  const enemy = createEnemy({ id: 'enemy-1', pathProgress: 100 });
  const fartherTower = createTower({ id: 'tower-2', cellId: SECOND_GATE_CELL_ID });
  const simulation = createSimulation({ towers: [fartherTower], enemies: [enemy] });
  assignLanePositions(simulation);
  assert.equal(enemy.blockingTowerId, 'tower-2');

  simulation.towers.push(createTower({ id: 'tower-3', cellId: MIDDLE_GATE_CELL_ID }));
  const state = assignLanePositions(simulation);

  assert.deepEqual(state.gates.map(({ towerId }) => towerId), ['tower-3', 'tower-2']);
  assert.deepEqual(state.gates[0].attackerIds, ['enemy-1']);
  assert.deepEqual(state.gates[1].attackerIds, []);
  assert.equal(enemy.blockingTowerId, 'tower-3');
});

test('enemy attacks use exact active ticks and a stun at impact cancels the same target', () => {
  const tower = createTower({ id: 'tower-1', cellId: FIRST_GATE_CELL_ID, health: 40, armor: 0.5 });
  const enemy = createEnemy({
    id: 'enemy-1',
    pathProgress: 160,
    attackDamage: 7,
    attackCooldownTicks: 6,
    attackWindupTicks: 2,
  });
  const simulation = createSimulation({ towers: [tower], enemies: [enemy], tick: 10 });
  assignLanePositions(simulation);

  advanceEnemyAttacks(simulation);
  assert.deepEqual(enemy.attackState, {
    targetTowerId: 'tower-1',
    startedAtTick: 10,
    impactAtTick: 12,
    readyAtTick: 16,
  });
  assert.equal(simulation.presentationEvents.at(-1).kind, 'enemy-attack-start');

  simulation.tick = 11;
  advanceEnemyAttacks(simulation);
  assert.equal(tower.health, 40);

  simulation.tick = 12;
  enemy.stunnedUntilTick = 13;
  advanceEnemyAttacks(simulation);
  assert.equal(tower.health, 40);
  assert.deepEqual(enemy.attackState, {
    targetTowerId: null,
    startedAtTick: null,
    impactAtTick: null,
    readyAtTick: 16,
  });
  assert.equal(simulation.presentationEvents.some(({ kind }) => kind === 'enemy-attack-impact'), false);
});

test('a zero-windup attack resolves once in its start tick with stable event order and cooldown', () => {
  const tower = createTower({ id: 'tower-1', cellId: FIRST_GATE_CELL_ID, health: 10 });
  const enemy = createEnemy({
    id: 'enemy-1', pathProgress: 160, attackDamage: 4, attackCooldownTicks: 6, attackWindupTicks: 0,
  });
  const simulation = createSimulation({ towers: [tower], enemies: [enemy], tick: 20 });
  assignLanePositions(simulation);

  advanceEnemyAttacks(simulation);
  advanceEnemyAttacks(simulation);

  assert.equal(tower.health, 6);
  assert.deepEqual(enemy.attackState, {
    targetTowerId: null,
    startedAtTick: null,
    impactAtTick: null,
    readyAtTick: 26,
  });
  assert.deepEqual(
    simulation.presentationEvents.map(({ kind }) => kind),
    ['enemy-attack-start', 'defender-hit', 'enemy-attack-impact'],
  );
});

test('a valid impact applies defender armor with a minimum of one damage', () => {
  const tower = createTower({ id: 'tower-1', cellId: FIRST_GATE_CELL_ID, health: 10, armor: 0.99 });
  const enemy = createEnemy({
    id: 'enemy-1', pathProgress: 160, attackDamage: 1, attackCooldownTicks: 6, attackWindupTicks: 1,
  });
  const simulation = createSimulation({ towers: [tower], enemies: [enemy], tick: 20 });
  assignLanePositions(simulation);
  advanceEnemyAttacks(simulation);

  simulation.tick = 21;
  advanceEnemyAttacks(simulation);

  assert.equal(tower.health, 9);
  assert.deepEqual(enemy.attackState, {
    targetTowerId: null,
    startedAtTick: null,
    impactAtTick: null,
    readyAtTick: 26,
  });
  assert.deepEqual(
    simulation.presentationEvents.map(({ kind }) => kind),
    ['enemy-attack-start', 'defender-hit', 'enemy-attack-impact'],
  );
});

test('permanent defender defeat removes owned combat state without refund or duplicate events', () => {
  const tower = createTower({ id: 'tower-1', cellId: FIRST_GATE_CELL_ID, health: 3 });
  const enemy = createEnemy({ id: 'enemy-1', pathProgress: 82 });
  enemy.laneState = 'attacking';
  enemy.blockingTowerId = tower.id;
  enemy.queueIndex = null;
  enemy.laneOffset = -24;
  enemy.attackState = {
    targetTowerId: tower.id,
    startedAtTick: 4,
    impactAtTick: 6,
    readyAtTick: 16,
  };
  tower.engagedEnemyIds = [enemy.id];
  const simulation = createSimulation({ towers: [tower], enemies: [enemy], tick: 6 });
  simulation.effects = [
    { id: 'effect-1', sourceId: 'tower-2', targetId: tower.id, kind: 'tower-attack-speed' },
    { id: 'effect-2', sourceId: tower.id, targetId: 'enemy-1', kind: 'enemy-slow' },
  ];
  simulation.projectiles = [
    { id: 'projectile-1', sourceTowerId: tower.id, targetId: 'enemy-1' },
    { id: 'projectile-2', sourceTowerId: 'tower-2', targetId: 'enemy-1' },
  ];
  const positionBeforeDefeat = enemy.pathProgress;

  assert.equal(applyDefenderDamage(simulation, tower, 3, enemy), 3);
  assert.equal(applyDefenderDamage(simulation, tower, 3, enemy), 0);

  assert.equal(simulation.coins, 75);
  assert.deepEqual(simulation.towers, []);
  assert.deepEqual(simulation.effects.map(({ id }) => id), ['effect-2']);
  assert.deepEqual(simulation.projectiles.map(({ id }) => id), ['projectile-2']);
  assert.equal(enemy.pathProgress, positionBeforeDefeat);
  assert.equal(enemy.blockingTowerId, null);
  assert.equal(enemy.queueIndex, null);
  assert.equal(enemy.laneState, 'moving');
  assert.equal(enemy.laneReleasedAtTick, 6);
  assert.deepEqual(enemy.attackState, {
    targetTowerId: null,
    startedAtTick: null,
    impactAtTick: null,
    readyAtTick: 16,
  });
  assert.deepEqual(simulation.presentationEvents.map(({ kind }) => kind), ['defender-defeated']);
});

test('a defeated first gate preserves positions this tick and releases toward the fallback gate next tick', () => {
  const firstTower = createTower({ id: 'tower-1', cellId: FIRST_GATE_CELL_ID, health: 1 });
  const secondTower = createTower({ id: 'tower-2', cellId: SECOND_GATE_CELL_ID });
  const enemy = createEnemy({ id: 'enemy-1', pathProgress: 99 });
  const simulation = createSimulation({ towers: [firstTower, secondTower], enemies: [enemy], tick: 30 });
  assignLanePositions(simulation);
  const stoppedProgress = enemy.pathProgress;

  applyDefenderDamage(simulation, firstTower, 1, enemy);
  const sameTickState = assignLanePositions(simulation);
  assert.equal(enemy.pathProgress, stoppedProgress);
  assert.equal(enemy.blockingTowerId, null);
  assert.deepEqual(sameTickState.gates[0].attackerIds, []);

  simulation.tick = 31;
  const nextTickState = assignLanePositions(simulation);
  assert.equal(enemy.pathProgress, stoppedProgress);
  assert.equal(enemy.blockingTowerId, 'tower-2');
  assert.equal(enemy.laneState, 'moving');
  assert.deepEqual(nextTickState.gates[0].attackerIds, ['enemy-1']);
});

test('attack target capabilities allow a future backline enemy without widening ordinary targeting', () => {
  const frontline = createTower({ id: 'tower-1', cellId: FIRST_GATE_CELL_ID });
  const backline = createTower({ id: 'tower-2', cellId: GRASS_CELL_ID, combatLayer: 'backline' });
  const ordinary = createEnemy({ id: 'enemy-1', pathProgress: 100, attackTargets: ['frontline'] });
  ordinary.laneState = 'attacking';
  ordinary.blockingTowerId = frontline.id;
  const futureMage = createEnemy({ id: 'enemy-2', pathProgress: 80, attackTargets: ['backline'] });
  const simulation = createSimulation({ towers: [frontline, backline], enemies: [ordinary, futureMage] });

  assert.equal(selectEnemyAttackTarget(simulation, ordinary, 'frontline'), frontline);
  assert.equal(selectEnemyAttackTarget(simulation, ordinary, 'backline'), null);
  assert.equal(selectEnemyAttackTarget(simulation, futureMage, 'frontline'), null);
  assert.equal(selectEnemyAttackTarget(simulation, futureMage, 'backline'), backline);
});

test('a missing attackTargets profile defaults to frontline-only targeting', () => {
  const frontline = createTower({ id: 'tower-1', cellId: FIRST_GATE_CELL_ID });
  const backline = createTower({ id: 'tower-2', cellId: GRASS_CELL_ID, combatLayer: 'backline' });
  const productionEnemy = createEnemy({ id: 'enemy-1', pathProgress: 100 });
  delete productionEnemy.attackTargets;
  productionEnemy.laneState = 'attacking';
  productionEnemy.blockingTowerId = frontline.id;
  const simulation = createSimulation({ towers: [frontline, backline], enemies: [productionEnemy] });

  assert.equal(selectEnemyAttackTarget(simulation, productionEnemy, 'frontline'), frontline);
  assert.equal(selectEnemyAttackTarget(simulation, productionEnemy, 'backline'), null);
});
