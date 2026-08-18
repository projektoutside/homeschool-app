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
  || (first.id < second.id ? -1 : first.id > second.id ? 1 : 0)
))[0] ?? null;
