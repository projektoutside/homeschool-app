import { COMBAT_RULES } from '../config/enemies.js';

export const calculateBattleResult = (simulation) => {
  const outcome = simulation.castleHearts > 0 ? 'victory' : 'defeat';
  if (outcome === 'defeat') {
    return Object.freeze({ outcome, score: simulation.score, medal: null });
  }

  const elapsedSeconds = simulation.tick / COMBAT_RULES.ticksPerSecond;
  const parRatio = Math.max(0, 1 - (elapsedSeconds / simulation.level.parSeconds));
  const finalScore = simulation.score
    + (simulation.castleHearts * COMBAT_RULES.castleHeartScore)
    + Math.round(parRatio * COMBAT_RULES.parTimeScore)
    + Math.min(simulation.coins, COMBAT_RULES.unspentCoinScoreCap);
  const medal = simulation.castleHearts === 3 && finalScore >= simulation.level.goldScore
    ? 'gold'
    : simulation.castleHearts >= 2 && finalScore >= simulation.level.silverScore
      ? 'silver'
      : 'bronze';

  return Object.freeze({ outcome, score: finalScore, medal });
};
