import { compareEntityIds } from './entity-id.js';

const roleMetric = (candidate, priority) => {
  switch (priority) {
    case 'fastest':
      return candidate.speed;
    case 'highest-armor':
      return candidate.armor;
    case 'densest-cluster':
      return candidate.clusterSize ?? 1;
    case 'closest-to-castle':
    default:
      return candidate.pathProgress;
  }
};

export const selectTarget = (candidates, priority) => [...candidates].sort((first, second) => (
  roleMetric(second, priority) - roleMetric(first, priority)
  || second.pathProgress - first.pathProgress
  || first.spawnTick - second.spawnTick
  || compareEntityIds(first.id, second.id)
))[0] ?? null;

export const selectMeleeTarget = (candidates, priority, towerId) => {
  const attackers = candidates.filter((candidate) => (
    candidate.blockingTowerId === towerId && candidate.laneState === 'attacking'
  ));
  if (attackers.length > 0) return selectTarget(attackers, priority);

  const queued = candidates.filter((candidate) => (
    candidate.blockingTowerId === towerId && candidate.laneState === 'queued'
  ));
  if (queued.length > 0) return selectTarget(queued, priority);

  return selectTarget(candidates, priority);
};
