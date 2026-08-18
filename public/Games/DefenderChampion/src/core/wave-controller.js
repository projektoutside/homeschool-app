import { ENEMIES } from '../config/enemies.js';

export const WAVE_GAP_TICKS = 180;

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

export const spawnScheduledEnemies = (simulation) => {
  while (
    simulation.nextSpawnIndex < simulation.waveSchedule.length
    && simulation.waveSchedule[simulation.nextSpawnIndex].spawnTick === simulation.tick
  ) {
    const entry = simulation.waveSchedule[simulation.nextSpawnIndex];
    const enemy = ENEMIES[entry.enemyId];
    simulation.enemies.push({
      id: `enemy-${simulation.nextEntityId++}`,
      enemyId: enemy.id,
      spawnTick: entry.spawnTick,
      pathProgress: 0,
      health: Math.round(enemy.health * simulation.level.healthScale),
      speed: enemy.speed,
      armor: enemy.armor,
      clusterSize: 1,
      castleDamage: enemy.castleDamage,
    });
    simulation.waveIndex = entry.waveIndex;
    simulation.nextSpawnIndex += 1;
  }
  simulation.spawnedAllWaves = simulation.nextSpawnIndex === simulation.waveSchedule.length;
};
