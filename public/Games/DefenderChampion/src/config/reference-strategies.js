const freezeCommands = (commands) => Object.freeze(
  commands.map((command) => Object.freeze({ ...command })),
);

const pairedStrategies = (levelNumber, balancedDefender, artilleryDefender) => ({
  [`level-${levelNumber}-balanced`]: freezeCommands([
    { tick: 0, type: 'build', defenderId: balancedDefender, padId: `l${levelNumber}-pad-a` },
    ...(balancedDefender === 'ranger'
      ? [{ tick: 0, type: 'build', defenderId: 'bladeguard', padId: `l${levelNumber}-pad-b` }]
      : []),
  ]),
  [`level-${levelNumber}-artillery`]: freezeCommands([
    { tick: 0, type: 'build', defenderId: artilleryDefender, padId: `l${levelNumber}-pad-c` },
  ]),
});

export const REFERENCE_STRATEGIES = Object.freeze({
  ...pairedStrategies(1, 'ranger', 'rune-artificer'),
  ...pairedStrategies(2, 'bladeguard', 'rune-artificer'),
  ...pairedStrategies(3, 'ironwarden', 'rune-artificer'),
  ...pairedStrategies(4, 'ironwarden', 'rune-artificer'),
  ...pairedStrategies(5, 'ranger', 'rune-artificer'),
  ...pairedStrategies(6, 'ranger', 'rune-artificer'),
  ...pairedStrategies(7, 'ironwarden', 'rune-artificer'),
  ...pairedStrategies(8, 'ironwarden', 'rune-artificer'),
  ...pairedStrategies(9, 'ranger', 'rune-artificer'),
  ...pairedStrategies(10, 'ironwarden', 'rune-artificer'),
});
