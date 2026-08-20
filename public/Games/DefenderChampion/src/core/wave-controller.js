import { ENEMIES } from '../config/enemies.js';
import { deriveReadableSpawnCapacity, getFirstLivingGateProgress } from './lane-combat.js';
import { emitPresentationEvent } from './presentation-events.js';
import {
  EARLY_GATE_BACKPRESSURE_LIMIT,
  ENTRANCE_LANE_CLEARANCE,
  MAX_ATTACKERS_PER_GATE,
  MAX_LIVING_ENEMIES,
  MIN_CONGESTED_GATE_CAPACITY,
  MIN_ENTRANCE_ADJACENT_LANE_PROGRESS,
  MIN_ENTRANCE_SAME_LANE_PROGRESS,
  READABLE_ENTRANCE_POLICIES,
} from './rules.js';

export const WAVE_GAP_TICKS = 180;
export { deriveReadableSpawnCapacity, MAX_ATTACKERS_PER_GATE, MAX_LIVING_ENEMIES };

const livingEnemyCount = (simulation) => simulation.enemies.filter(({ health }) => health > 0).length;
const getEntrancePolicy = (enemyId) => READABLE_ENTRANCE_POLICIES[enemyId]
  ?? READABLE_ENTRANCE_POLICIES['blight-walker'];

const updateSpawnedAllWaves = (simulation) => {
  simulation.spawnedAllWaves = simulation.nextSpawnIndex === simulation.waveSchedule.length
    && simulation.pendingSpawns.length === 0;
};

export const createWaveController = (level) => {
  let waveStartTick = 0;
  const schedule = [];

  level.waves.forEach((wave, waveIndex) => {
    let finalSpawnTick = waveStartTick;
    wave.forEach((group) => {
      for (let index = 0; index < group.count; index += 1) {
        const spawnTick = waveStartTick + group.delayTicks + (group.intervalTicks * index);
        schedule.push({ waveIndex, enemyId: group.enemyId, spawnTick });
        finalSpawnTick = Math.max(finalSpawnTick, spawnTick);
      }
    });
    waveStartTick = finalSpawnTick + WAVE_GAP_TICKS;
  });

  return schedule.sort((first, second) => (
    first.spawnTick - second.spawnTick
    || first.waveIndex - second.waveIndex
    || first.enemyId.localeCompare(second.enemyId)
  ));
};

export const enqueueEnemySpawn = (simulation, request) => {
  simulation.pendingSpawns ??= [];
  simulation.nextSpawnSequence ??= 1;
  simulation.pendingSpawns.push({
    enemyId: request.enemyId,
    isSummon: request.isSummon === true,
    pathProgress: request.pathProgress ?? 0,
    requestedTick: simulation.tick,
    sequence: simulation.nextSpawnSequence++,
    waveIndex: request.waveIndex,
  });
  updateSpawnedAllWaves(simulation);
};

const createEnemy = (simulation, request, entranceLaneOffset = 0) => {
  const config = ENEMIES[request.enemyId];
  const maxHealth = Math.round(config.health * simulation.level.healthScale);
  return {
    id: `enemy-${simulation.nextEntityId++}`,
    enemyId: config.id,
    waveIndex: request.waveIndex,
    spawnTick: request.requestedTick,
    pathProgress: request.pathProgress,
    health: maxHealth,
    maxHealth,
    speed: config.speed,
    armor: config.armor,
    clusterSize: 1,
    castleDamage: config.castleDamage,
    attackDamage: config.attackDamage,
    attackCooldownTicks: config.attackCooldownTicks,
    attackWindupTicks: config.attackWindupTicks,
    attackTargets: config.attackTargets,
    attackState: {
      targetTowerId: null,
      startedAtTick: null,
      impactAtTick: null,
      readyAtTick: simulation.tick,
    },
    laneState: 'moving',
    blockingTowerId: null,
    queueIndex: null,
    laneOffset: entranceLaneOffset,
    entranceLaneOffset,
    displayLaneOffset: entranceLaneOffset,
    displayPathProgress: request.pathProgress,
    displayScale: 1,
    nextAbilityTick: simulation.tick + config.cooldownTicks,
    abilityActiveTicks: 0,
    nextAbilityActiveTick: config.cooldownTicks,
    thresholdFlags: {},
    isSummon: request.isSummon,
  };
};

export const flushPendingEnemySpawns = (simulation) => {
  simulation.pendingSpawns ??= [];
  const readableCapacity = Math.min(
    MAX_LIVING_ENEMIES,
    deriveReadableSpawnCapacity(simulation),
  );
  const firstGateProgress = getFirstLivingGateProgress(simulation);
  const hasBackpressuredGate = readableCapacity < MAX_LIVING_ENEMIES
    && readableCapacity >= MIN_CONGESTED_GATE_CAPACITY
    && firstGateProgress !== null
    && firstGateProgress <= EARLY_GATE_BACKPRESSURE_LIMIT
    && simulation.nextSpawnIndex < simulation.waveSchedule.length;
  while (livingEnemyCount(simulation) < readableCapacity && simulation.pendingSpawns.length > 0) {
    const request = simulation.pendingSpawns[0];
    const policy = getEntrancePolicy(request.enemyId);
    const preferredLaneIndex = (request.sequence - 1) % policy.length;
    const candidateLaneOffsets = [
      ...policy.slice(preferredLaneIndex),
      ...policy.slice(0, preferredLaneIndex),
    ];
    const entranceLaneOffset = hasBackpressuredGate
      ? candidateLaneOffsets.find((candidateOffset) => !simulation.enemies.some((enemy) => {
        if (!(enemy.health > 0)) return false;
        const laneDistance = Math.abs((Number(enemy.laneOffset) || 0) - candidateOffset);
        if (laneDistance >= ENTRANCE_LANE_CLEARANCE) return false;
        const clearance = laneDistance === 0
          ? MIN_ENTRANCE_SAME_LANE_PROGRESS
          : MIN_ENTRANCE_ADJACENT_LANE_PROGRESS;
        return enemy.pathProgress < clearance;
      }))
      : candidateLaneOffsets[0];
    if (entranceLaneOffset === undefined) break;
    simulation.enemies.push(createEnemy(
      simulation,
      simulation.pendingSpawns.shift(),
      entranceLaneOffset,
    ));
  }
  simulation.maximumLivingEnemies = Math.max(
    simulation.maximumLivingEnemies ?? 0,
    livingEnemyCount(simulation),
  );
  updateSpawnedAllWaves(simulation);
};

export const spawnScheduledEnemies = (simulation) => {
  while (
    simulation.nextSpawnIndex < simulation.waveSchedule.length
    && simulation.waveSchedule[simulation.nextSpawnIndex].spawnTick <= simulation.tick
  ) {
    const entry = simulation.waveSchedule[simulation.nextSpawnIndex];
    simulation.waveStartedFlags ??= {};
    if (!simulation.waveStartedFlags[entry.waveIndex]) {
      simulation.waveStartedFlags[entry.waveIndex] = true;
      emitPresentationEvent(simulation, 'wave-start', {
        waveIndex: entry.waveIndex,
      });
    }
    enqueueEnemySpawn(simulation, {
      enemyId: entry.enemyId,
      pathProgress: 0,
      waveIndex: entry.waveIndex,
    });
    simulation.waveIndex = entry.waveIndex;
    simulation.nextSpawnIndex += 1;
  }
  flushPendingEnemySpawns(simulation);
};
