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
  build(levelNumber, 18000, 'rune-artificer', pads[1]),
]);

const pairedStrategies = (levelNumber, primary, support) => ({
  [`level-${levelNumber}-balanced`]: primaryStrategy(levelNumber, primary, ['c', 'a', 'e', 'g', 'd', 'b', 'f', 'h']),
  [`level-${levelNumber}-artillery`]: artilleryStrategy(levelNumber, support, ['f', 'b', 'd', 'h', 'e', 'a', 'c', 'g']),
});

const earlyDiverseStrategies = (levelNumber) => ({
  [`level-${levelNumber}-balanced`]: freezeCommands([
    build(levelNumber, 0, 'bladeguard', 'a'),
    build(levelNumber, 0, 'bladeguard', 'c'),
    build(levelNumber, 0, 'bladeguard', 'g'),
  ]),
  [`level-${levelNumber}-artillery`]: freezeCommands([
    build(levelNumber, 0, 'ranger', 'b'),
    build(levelNumber, 0, 'ranger', 'f'),
  ]),
});

const lateDiverseStrategies = (levelNumber, artilleryReinforcement = null) => ({
  [`level-${levelNumber}-balanced`]: freezeCommands([
    build(levelNumber, 0, 'bladeguard', 'a'),
    build(levelNumber, 0, 'bladeguard', 'c'),
    build(levelNumber, 0, 'bladeguard', 'g'),
    build(levelNumber, 3600, 'ironwarden', 'e'),
    build(levelNumber, 4800, 'rune-artificer', 'f'),
    build(levelNumber, 6000, 'ranger', 'b'),
    ...(artilleryReinforcement ? [build(
      levelNumber,
      artilleryReinforcement.tick,
      'rune-artificer',
      'h',
    )] : []),
  ]),
  [`level-${levelNumber}-artillery`]: freezeCommands([
    build(levelNumber, 0, 'ranger', 'b'),
    build(levelNumber, 0, 'ranger', 'h'),
    build(levelNumber, 3600, 'rune-artificer', 'f'),
    build(levelNumber, 4800, 'rune-artificer', 'd'),
    build(levelNumber, 6000, 'bladeguard', 'e'),
    ...(artilleryReinforcement ? [build(
      levelNumber,
      artilleryReinforcement.tick,
      artilleryReinforcement.defenderId,
      'g',
    )] : []),
  ]),
});

export const REFERENCE_STRATEGIES = Object.freeze({
  'level-1-balanced': freezeCommands([
    build(1, 0, 'ranger', 'b'),
    build(1, 0, 'bladeguard', 'a'),
  ]),
  'level-1-artillery': freezeCommands([
    build(1, 0, 'bladeguard', 'a'),
    build(1, 0, 'bladeguard', 'c'),
    build(1, 0, 'bladeguard', 'g'),
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
  ...earlyDiverseStrategies(2),
  ...earlyDiverseStrategies(3),
  ...earlyDiverseStrategies(4),
  ...earlyDiverseStrategies(5),
  ...earlyDiverseStrategies(6),
  'level-7-balanced': freezeCommands([
    build(7, 0, 'rune-artificer', 'f'),
    build(7, 5400, 'ranger', 'b'),
    build(7, 6000, 'ironwarden', 'g'),
    build(7, 6600, 'ironwarden', 'c'),
    build(7, 7200, 'ironwarden', 'e'),
    build(7, 7500, 'bladeguard', 'a'),
  ]),
  ...lateDiverseStrategies(8),
  ...lateDiverseStrategies(9, { tick: 7200, defenderId: 'ironwarden', pad: 'h' }),
  'level-10-balanced': freezeCommands([
    build(10, 0, 'rune-artificer', 'b'),
    build(10, 3600, 'ironwarden', 'g'),
    build(10, 4800, 'ironwarden', 'c'),
    build(10, 6000, 'ranger', 'f'),
    build(10, 7500, 'bladeguard', 'e'),
    build(10, 9000, 'ranger', 'h'),
    build(10, 10500, 'ironwarden', 'a'),
  ]),
  'level-10-artillery': freezeCommands([
    build(10, 0, 'rune-artificer', 'f'),
    build(10, 5400, 'ironwarden', 'c'),
    build(10, 6000, 'rune-artificer', 'b'),
    build(10, 6600, 'ironwarden', 'g'),
    build(10, 7200, 'ranger', 'd'),
    build(10, 7800, 'ranger', 'h'),
    build(10, 8400, 'bladeguard', 'e'),
  ]),
});
