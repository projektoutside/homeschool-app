const freezeCommands = (commands) => Object.freeze(
  commands.map((command) => Object.freeze({ ...command })),
);

const build = (levelNumber, tick, defenderId, pad) => ({
  tick,
  type: 'build',
  defenderId,
  padId: `l${levelNumber}-pad-${pad}`,
});

const upgrade = (tick, towerId) => ({ tick, type: 'upgrade', towerId });

const openingPair = (levelNumber, roadPad, grassPad) => [
  build(levelNumber, 0, 'bladeguard', roadPad),
  build(levelNumber, 0, 'ranger', grassPad),
];

export const REFERENCE_STRATEGIES = Object.freeze({
  'level-1-balanced': freezeCommands([
    ...openingPair(1, 'a', 'b'),
    upgrade(3600, 'tower-1'),
  ]),
  'level-1-artillery': freezeCommands([
    ...openingPair(1, 'c', 'd'),
  ]),
  'level-2-balanced': freezeCommands([
    ...openingPair(2, 'a', 'b'),
    upgrade(600, 'tower-1'),
    build(2, 1200, 'bladeguard', 'c'),
  ]),
  'level-2-artillery': freezeCommands([
    ...openingPair(2, 'c', 'd'),
  ]),
  'level-3-balanced': freezeCommands([
    ...openingPair(3, 'a', 'b'),
    upgrade(3600, 'tower-1'),
    build(3, 4800, 'ironwarden', 'c'),
    build(3, 6000, 'ironwarden', 'e'),
  ]),
  'level-3-artillery': freezeCommands([
    ...openingPair(3, 'c', 'd'),
    upgrade(6000, 'tower-2'),
    build(3, 10500, 'rune-artificer', 'b'),
    build(3, 12600, 'rune-artificer', 'f'),
  ]),
  'level-4-balanced': freezeCommands([
    ...openingPair(4, 'a', 'h'),
    upgrade(3600, 'tower-2'),
    upgrade(4800, 'tower-2'),
    build(4, 10500, 'ironwarden', 'c'),
    build(4, 11000, 'bladeguard', 'a'),
    build(4, 12000, 'ranger', 'f'),
  ]),
  'level-4-artillery': freezeCommands([
    ...openingPair(4, 'c', 'd'),
    upgrade(3600, 'tower-1'),
    upgrade(4800, 'tower-1'),
    build(4, 5400, 'ironwarden', 'e'),
    build(4, 5700, 'ironwarden', 'g'),
    build(4, 9000, 'ranger', 'h'),
  ]),
  'level-5-balanced': freezeCommands([
    ...openingPair(5, 'a', 'b'),
    upgrade(3600, 'tower-1'),
    upgrade(4800, 'tower-1'),
    build(5, 6000, 'ironwarden', 'c'),
    build(5, 7500, 'ironwarden', 'e'),
  ]),
  'level-5-artillery': freezeCommands([
    ...openingPair(5, 'c', 'd'),
    upgrade(3600, 'tower-2'),
    upgrade(4800, 'tower-2'),
    build(5, 6000, 'rune-artificer', 'b'),
    build(5, 7500, 'ranger', 'h'),
  ]),
  'level-6-balanced': freezeCommands([
    ...openingPair(6, 'a', 'b'),
    upgrade(3600, 'tower-1'),
    upgrade(4800, 'tower-1'),
    build(6, 6000, 'bladeguard', 'c'),
    build(6, 7500, 'bladeguard', 'e'),
  ]),
  'level-6-artillery': freezeCommands([
    ...openingPair(6, 'c', 'd'),
    upgrade(3600, 'tower-2'),
    upgrade(4800, 'tower-2'),
    build(6, 6000, 'rune-artificer', 'b'),
    build(6, 7500, 'rune-artificer', 'f'),
  ]),
  'level-7-balanced': freezeCommands([
    ...openingPair(7, 'a', 'b'),
    upgrade(3600, 'tower-2'),
    upgrade(4800, 'tower-2'),
    build(7, 6000, 'ironwarden', 'c'),
    build(7, 7200, 'ironwarden', 'e'),
    build(7, 9000, 'bladeguard', 'a'),
  ]),
  'level-7-artillery': freezeCommands([
    ...openingPair(7, 'c', 'd'),
    upgrade(6000, 'tower-1'),
    upgrade(7500, 'tower-1'),
    build(7, 9000, 'ironwarden', 'e'),
    build(7, 10500, 'ironwarden', 'g'),
    build(7, 12000, 'ranger', 'h'),
  ]),
  'level-8-balanced': freezeCommands([
    ...openingPair(8, 'a', 'b'),
    upgrade(3600, 'tower-1'),
    upgrade(4800, 'tower-1'),
    build(8, 6000, 'bladeguard', 'c'),
    build(8, 7500, 'bladeguard', 'e'),
    build(8, 9000, 'ranger', 'f'),
  ]),
  'level-8-artillery': freezeCommands([
    ...openingPair(8, 'c', 'd'),
    upgrade(4800, 'tower-2'),
    upgrade(6000, 'tower-2'),
    build(8, 7500, 'rune-artificer', 'b'),
    build(8, 9000, 'rune-artificer', 'f'),
    build(8, 10500, 'ironwarden', 'e'),
  ]),
  'level-9-balanced': freezeCommands([
    ...openingPair(9, 'a', 'b'),
    upgrade(4800, 'tower-2'),
    upgrade(6000, 'tower-2'),
    build(9, 7500, 'ironwarden', 'c'),
    build(9, 9000, 'ironwarden', 'e'),
    build(9, 10500, 'ranger', 'h'),
  ]),
  'level-9-artillery': freezeCommands([
    ...openingPair(9, 'c', 'd'),
    upgrade(7000, 'tower-1'),
    upgrade(8000, 'tower-1'),
    build(9, 9000, 'ironwarden', 'e'),
    build(9, 10500, 'ironwarden', 'g'),
    build(9, 12000, 'rune-artificer', 'b'),
  ]),
  'level-10-balanced': freezeCommands([
    ...openingPair(10, 'a', 'b'),
    upgrade(3600, 'tower-2'),
    upgrade(4800, 'tower-2'),
    build(10, 6000, 'ironwarden', 'c'),
    build(10, 7000, 'rune-artificer', 'f'),
    build(10, 9500, 'ranger', 'h'),
    build(10, 10000, 'bladeguard', 'a'),
  ]),
  'level-10-artillery': freezeCommands([
    ...openingPair(10, 'c', 'd'),
    upgrade(6000, 'tower-1'),
    upgrade(7000, 'tower-1'),
    build(10, 8000, 'ironwarden', 'e'),
    build(10, 9000, 'ironwarden', 'g'),
    build(10, 10500, 'rune-artificer', 'b'),
    build(10, 12000, 'ranger', 'h'),
  ]),
});
