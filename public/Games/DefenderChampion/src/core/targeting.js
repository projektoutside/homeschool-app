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
