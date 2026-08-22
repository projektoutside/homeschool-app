export const DIFFICULTIES = Object.freeze({
  EASY: 'easy',
  HARD: 'hard',
  EXPERT: 'expert',
});

export const isValidDifficulty = (difficulty) => Object.values(DIFFICULTIES).includes(difficulty);
