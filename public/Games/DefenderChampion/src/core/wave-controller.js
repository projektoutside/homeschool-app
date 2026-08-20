import { ENEMIES } from '../config/enemies.js';
import { emitPresentationEvent } from './presentation-events.js';

export const WAVE_GAP_TICKS = 180;
export const MAX_LIVING_ENEMIES = 18;

const livingEnemyCount = (simulation) => simulation.enemies.filter(({ health }) => health > 0).length;

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

const createEnemy = (simulation, request) => {
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
    laneOffset: 0,
    nextAbilityTick: simulation.tick + config.cooldownTicks,
    abilityActiveTicks: 0,
    nextAbilityActiveTick: config.cooldownTicks,
    thresholdFlags: {},
    isSummon: request.isSummon,
  };
};

export const flushPendingEnemySpawns = (simulation) => {
  simulation.pendingSpawns ??= [];
  while (livingEnemyCount(simulation) < MAX_LIVING_ENEMIES && simulation.pendingSpawns.length > 0) {
    simulation.enemies.push(createEnemy(simulation, simulation.pendingSpawns.shift()));
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
