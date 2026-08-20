export const getBuildCost = (defender) => defender.costs[0];

export const getUpgradeCost = (tower, defender) => defender.costs[tower.tier + 1] ?? null;

export const getSellRefund = (tower) => Math.floor(tower.totalInvested * 0.70);
