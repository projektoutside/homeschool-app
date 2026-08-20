import { createTerrainCells, expandGridPath } from '../core/grid-geometry.js';

const freeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      freeze(child);
    }
    Object.freeze(value);
  }
  return value;
};

const GRID_WAYPOINTS = Object.freeze({
  'level-1': [[0, 4], [2, 4], [2, 7], [4, 7], [4, 2], [7, 2], [7, 6], [9, 6], [9, 4], [11, 4]],
  'level-2': [[0, 1], [2, 1], [2, 5], [4, 5], [4, 8], [6, 8], [6, 3], [8, 3], [8, 7], [10, 7], [10, 4], [11, 4]],
  'level-3': [[0, 7], [1, 7], [1, 3], [3, 3], [3, 0], [5, 0], [5, 5], [7, 5], [7, 8], [9, 8], [9, 4], [11, 4]],
  'level-4': [[0, 2], [2, 2], [2, 6], [3, 6], [3, 3], [5, 3], [5, 7], [7, 7], [7, 5], [10, 5], [10, 4], [11, 4]],
  'level-5': [[0, 6], [2, 6], [2, 2], [4, 2], [4, 7], [6, 7], [6, 1], [8, 1], [8, 6], [10, 6], [10, 4], [11, 4]],
  'level-6': [[0, 4], [1, 4], [1, 8], [3, 8], [3, 5], [5, 5], [5, 1], [7, 1], [7, 7], [9, 7], [9, 3], [11, 3]],
  'level-7': [[0, 5], [2, 5], [2, 1], [4, 1], [4, 6], [6, 6], [6, 8], [8, 8], [8, 3], [10, 3], [10, 4], [11, 4]],
  'level-8': [[0, 1], [2, 1], [2, 6], [4, 6], [4, 3], [6, 3], [6, 8], [8, 8], [8, 5], [10, 5], [10, 4], [11, 4]],
  'level-9': [[0, 7], [2, 7], [2, 3], [4, 3], [4, 6], [6, 6], [6, 2], [8, 2], [8, 8], [10, 8], [10, 4], [11, 4]],
  'level-10': [[0, 2], [2, 2], [2, 7], [4, 7], [4, 4], [6, 4], [6, 8], [8, 8], [8, 1], [10, 1], [10, 4], [11, 4]],
});

const waypoints = (levelId) => GRID_WAYPOINTS[levelId]
  .map(([row, column]) => ({ row, column }));

const spawn = (enemyId, count, intervalTicks, delayTicks = 0) => ({
  enemyId,
  count,
  intervalTicks,
  delayTicks,
});

const PAD_CELL_IDS = Object.freeze({
  1: ['r2c7', 'r0c5', 'r4c4', 'r1c1', 'r7c3', 'r4c1', 'r9c6', 'r5c5'],
  2: ['r2c4', 'r0c3', 'r5c8', 'r1c6', 'r7c3', 'r1c3', 'r9c7', 'r5c6'],
  3: ['r1c3', 'r0c3', 'r5c0', 'r2c0', 'r7c5', 'r4c3', 'r9c7', 'r6c6'],
  4: ['r2c5', 'r0c5', 'r3c3', 'r1c1', 'r5c7', 'r4c4', 'r8c5', 'r4c2'],
  5: ['r2c2', 'r0c2', 'r4c7', 'r1c7', 'r6c2', 'r2c1', 'r8c6', 'r3c6'],
  6: ['r2c8', 'r0c7', 'r5c5', 'r2c5', 'r7c3', 'r4c2', 'r9c6', 'r6c5'],
  7: ['r2c2', 'r0c3', 'r4c4', 'r1c7', 'r6c8', 'r4c0', 'r8c3', 'r5c7'],
  8: ['r2c4', 'r0c3', 'r4c4', 'r1c6', 'r6c6', 'r3c1', 'r8c5', 'r3c3'],
  9: ['r2c3', 'r0c2', 'r5c6', 'r3c6', 'r8c3', 'r4c2', 'r10c8', 'r5c5'],
  10: ['r2c6', 'r0c4', 'r5c4', 'r1c7', 'r8c8', 'r4c0', 'r9c1', 'r5c7'],
});

const authoredPads = (levelNumber) => PAD_CELL_IDS[levelNumber]
  .map((cellId, index) => ({
    id: `l${levelNumber}-pad-${String.fromCharCode(97 + index)}`,
    cellId,
  }));

const level = ({
  id, name, waveCount, healthScale, bountyCoinCap = null, threatIndex,
  waves, silverScore, goldScore, parSeconds,
}) => {
  const roadCells = expandGridPath(waypoints(id));
  const levelNumber = Number.parseInt(id.replace('level-', ''), 10);
  return freeze({
    id,
    name,
    waveCount,
    healthScale,
    bountyCoinCap,
    threatIndex,
    castleHearts: 3,
    startingCoins: 150,
    pads: authoredPads(levelNumber),
    roadCells,
    cells: createTerrainCells(roadCells),
    waves,
    silverScore,
    goldScore,
    parSeconds,
    referenceStrategies: [`${id}-balanced`, `${id}-artillery`],
  });
};

export const LEVELS = freeze([
  level({
    id: 'level-1', name: 'Meadow Watch', waveCount: 3, healthScale: 1.00, threatIndex: 100,
    waves: [
      [spawn('blight-walker', 6, 84, 0)],
      [spawn('blight-walker', 8, 72, 0)],
      [spawn('blight-walker', 10, 66, 0)],
    ],
    silverScore: 180, goldScore: 250, parSeconds: 180,
  }),
  level({
    id: 'level-2', name: 'Quickstep Grove', waveCount: 4, healthScale: 1.12, threatIndex: 135,
    waves: [
      [spawn('blight-walker', 7, 78, 0)],
      [spawn('skitter', 8, 56, 0)],
      [spawn('blight-walker', 6, 66, 0), spawn('skitter', 6, 54, 120)],
      [spawn('skitter', 12, 48, 0)],
    ],
    silverScore: 280, goldScore: 380, parSeconds: 210,
  }),
  level({
    id: 'level-3', name: 'Iron Trail', waveCount: 4, healthScale: 1.25, threatIndex: 175,
    waves: [
      [spawn('blight-walker', 8, 72, 0)],
      [spawn('shellguard', 4, 108, 0), spawn('skitter', 6, 60, 90)],
      [spawn('shellguard', 6, 96, 0)],
      [spawn('blight-walker', 8, 66, 0), spawn('shellguard', 5, 90, 144)],
    ],
    silverScore: 390, goldScore: 520, parSeconds: 240,
  }),
  level({
    id: 'level-4', name: "Brute's Crossing", waveCount: 5, healthScale: 1.38, threatIndex: 225,
    waves: [
      [spawn('blight-walker', 10, 66, 0)],
      [spawn('skitter', 10, 50, 0), spawn('shellguard', 4, 102, 120)],
      [spawn('shellguard', 7, 90, 0)],
      [spawn('blight-walker', 10, 60, 0), spawn('skitter', 10, 48, 90)],
      [
        spawn('mossback-brute', 1, 0, 0),
        spawn('crusher', 7, 72, 0),
        spawn('blight-walker', 8, 66, 180),
      ],
    ],
    silverScore: 520, goldScore: 690, parSeconds: 270,
  }),
  level({
    id: 'level-5', name: 'Twisting Thicket', waveCount: 5, healthScale: 1.54, threatIndex: 285,
    waves: [
      [spawn('swarmkin', 18, 32, 0)],
      [spawn('hexcaller', 3, 120, 0), spawn('blight-walker', 10, 60, 84)],
      [spawn('swarmkin', 24, 28, 0)],
      [spawn('shellguard', 7, 84, 0), spawn('hexcaller', 3, 114, 150)],
      [spawn('swarmkin', 18, 30, 0), spawn('skitter', 12, 48, 60)],
    ],
    silverScore: 680, goldScore: 880, parSeconds: 300,
  }),
  level({
    id: 'level-6', name: 'Moonlit Rush', waveCount: 5, healthScale: 1.72, threatIndex: 350,
    waves: [
      [spawn('swarmkin', 22, 28, 0)],
      [spawn('skitter', 16, 42, 0), spawn('hexcaller', 3, 108, 96)],
      [spawn('shellguard', 8, 78, 0), spawn('swarmkin', 18, 30, 90)],
      [spawn('crusher', 3, 144, 0), spawn('skitter', 12, 44, 80)],
      [spawn('hexcaller', 4, 102, 0), spawn('swarmkin', 26, 26, 90)],
    ],
    silverScore: 850, goldScore: 1100, parSeconds: 330,
  }),
  level({
    id: 'level-7', name: "Warlord's March", waveCount: 6, healthScale: 1.92, bountyCoinCap: 550, threatIndex: 430,
    waves: [
      [spawn('swarmkin', 24, 24, 0)],
      [spawn('hexcaller', 4, 102, 0), spawn('skitter', 16, 42, 72)],
      [spawn('crusher', 4, 132, 0), spawn('shellguard', 6, 78, 96)],
      [spawn('swarmkin', 28, 24, 0)],
      [spawn('shellguard', 10, 72, 0), spawn('hexcaller', 4, 96, 108)],
      [
        spawn('ironhide-warlord', 1, 0, 0),
        spawn('shellguard', 12, 54, 120),
        spawn('crusher', 8, 78, 180),
        spawn('skitter', 32, 24, 120),
        spawn('skitter', 12, 30, 15000),
      ],
    ],
    silverScore: 1050, goldScore: 1360, parSeconds: 360,
  }),
  level({
    id: 'level-8', name: 'Fogbound Siege', waveCount: 6, healthScale: 2.14, threatIndex: 525,
    waves: [
      [spawn('swarmkin', 30, 24, 0), spawn('skitter', 12, 42, 84)],
      [spawn('shellguard', 10, 72, 0), spawn('hexcaller', 4, 96, 90)],
      [spawn('crusher', 5, 126, 0), spawn('swarmkin', 22, 24, 90)],
      [spawn('hexcaller', 5, 90, 0), spawn('skitter', 18, 38, 72)],
      [spawn('shellguard', 12, 66, 0), spawn('crusher', 4, 120, 96)],
      [spawn('swarmkin', 34, 22, 0), spawn('hexcaller', 5, 90, 120)],
    ],
    silverScore: 1280, goldScore: 1650, parSeconds: 390,
  }),
  level({
    id: 'level-9', name: 'The Last Green', waveCount: 7, healthScale: 2.38, threatIndex: 640,
    waves: [
      [spawn('crusher', 5, 120, 0), spawn('shellguard', 8, 66, 96)],
      [spawn('hexcaller', 5, 90, 0), spawn('swarmkin', 20, 26, 84)],
      [spawn('skitter', 14, 40, 0), spawn('crusher', 4, 114, 90)],
      [spawn('shellguard', 12, 60, 0), spawn('hexcaller', 5, 84, 90)],
      [spawn('swarmkin', 24, 24, 0), spawn('skitter', 14, 38, 72)],
      [spawn('crusher', 6, 108, 0), spawn('shellguard', 10, 60, 108)],
      [spawn('hexcaller', 6, 84, 0), spawn('swarmkin', 26, 24, 96)],
    ],
    silverScore: 1540, goldScore: 1980, parSeconds: 420,
  }),
  level({
    id: 'level-10', name: "Champion's Stand", waveCount: 8, healthScale: 2.65, bountyCoinCap: 580, threatIndex: 800,
    waves: [
      [
        spawn('crusher', 3, 72, 0),
        spawn('swarmkin', 24, 24, 0),
        spawn('shellguard', 4, 72, 120),
      ],
      [spawn('swarmkin', 24, 24, 0), spawn('skitter', 12, 40, 72)],
      [spawn('crusher', 3, 114, 0), spawn('shellguard', 8, 66, 90)],
      [spawn('hexcaller', 4, 84, 0), spawn('swarmkin', 22, 24, 96)],
      [spawn('skitter', 16, 38, 0), spawn('crusher', 3, 108, 90)],
      [spawn('shellguard', 10, 60, 0), spawn('hexcaller', 4, 84, 108)],
      [spawn('swarmkin', 26, 22, 0), spawn('crusher', 2, 108, 90)],
      [
        spawn('dread-colossus', 1, 0, 0),
        spawn('swarmkin', 16, 26, 120),
        spawn('skitter', 32, 22, 120),
        spawn('skitter', 16, 30, 15000),
        spawn('skitter', 32, 18, 22000),
        spawn('shellguard', 12, 42, 120),
        spawn('crusher', 3, 78, 180),
        spawn('hexcaller', 4, 90, 240),
      ],
    ],
    silverScore: 1850, goldScore: 2400, parSeconds: 480,
  }),
]);

export const getLevel = (levelId) => {
  const matchedLevel = LEVELS.find((levelEntry) => levelEntry.id === levelId);
  if (!matchedLevel) {
    throw new Error(`Unknown level: ${levelId}`);
  }
  return matchedLevel;
};
