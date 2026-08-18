const freezeCommands = (commands) => Object.freeze(
  commands.map((command) => Object.freeze({ ...command })),
);

const build = (levelNumber, tick, defenderId, pad) => ({
  tick,
  type: 'build',
  defenderId,
  padId: `l${levelNumber}-pad-${pad}`,
});

const primaryStrategy = (levelNumber, primary, pads) => freezeCommands([
  build(levelNumber, 0, 'rune-artificer', pads[0]),
  build(levelNumber, 3600, primary, pads[3]),
  build(levelNumber, 4800, primary, pads[4]),
  build(levelNumber, 6000, 'ranger', pads[5]),
  build(levelNumber, 7500, 'bladeguard', pads[6]),
  build(levelNumber, 9000, 'ranger', pads[7]),
  build(levelNumber, 10500, primary, pads[2]),
]);

const artilleryStrategy = (levelNumber, support, pads) => freezeCommands([
  build(levelNumber, 0, 'rune-artificer', pads[0]),
  build(levelNumber, 9000, 'rune-artificer', pads[2]),
  build(levelNumber, 10500, 'ironwarden', pads[5]),
  build(levelNumber, 12000, 'ironwarden', pads[7]),
  build(levelNumber, 13500, support, pads[3]),
  build(levelNumber, 15000, 'bladeguard', pads[4]),
  build(levelNumber, 18000, 'rune-artificer', pads[5]),
]);

const pairedStrategies = (levelNumber, primary, support) => ({
  [`level-${levelNumber}-balanced`]: primaryStrategy(levelNumber, primary, ['c', 'a', 'e', 'g', 'd', 'b', 'f', 'h']),
  [`level-${levelNumber}-artillery`]: artilleryStrategy(levelNumber, support, ['f', 'b', 'd', 'h', 'e', 'a', 'c', 'g']),
});

export const REFERENCE_STRATEGIES = Object.freeze({
  'level-1-balanced': freezeCommands([
    build(1, 0, 'ranger', 'a'),
    build(1, 0, 'bladeguard', 'b'),
  ]),
  'level-1-artillery': freezeCommands([
    build(1, 0, 'rune-artificer', 'f'),
  ]),
  ...pairedStrategies(2, 'bladeguard', 'ranger'),
  ...pairedStrategies(3, 'ironwarden', 'bladeguard'),
  ...pairedStrategies(4, 'ironwarden', 'ranger'),
  ...pairedStrategies(5, 'ranger', 'bladeguard'),
  ...pairedStrategies(6, 'ranger', 'ironwarden'),
  ...pairedStrategies(7, 'ironwarden', 'ranger'),
  ...pairedStrategies(8, 'ironwarden', 'bladeguard'),
  ...pairedStrategies(9, 'ranger', 'ironwarden'),
  ...pairedStrategies(10, 'ironwarden', 'ranger'),
  'level-2-balanced': freezeCommands([
    build(2, 0, 'bladeguard', 'c'),
    build(2, 0, 'bladeguard', 'g'),
    build(2, 0, 'bladeguard', 'd'),
  ]),
  'level-5-balanced': freezeCommands([
    build(5, 0, 'rune-artificer', 'c'),
    build(5, 3600, 'ranger', 'g'),
    build(5, 4800, 'ranger', 'd'),
    build(5, 5100, 'ranger', 'b'),
  ]),
});
