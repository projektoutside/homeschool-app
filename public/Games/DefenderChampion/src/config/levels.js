import { createPathMetrics } from '../core/path-geometry.js';

const freeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      freeze(child);
    }
    Object.freeze(value);
  }
  return value;
};

const spawn = (enemyId, count, intervalTicks, delayTicks = 0) => ({
  enemyId,
  count,
  intervalTicks,
  delayTicks,
});

const roadPad = (levelNumber, letter, pathProgress) => ({
  id: `l${levelNumber}-pad-${letter}`,
  layer: 'road',
  pathProgress,
});

const grassPad = (levelNumber, letter, x, y) => ({
  id: `l${levelNumber}-pad-${letter}`,
  layer: 'grass',
  x,
  y,
});

const authoredPads = (levelNumber, path, grassPlacements) => {
  const { total } = createPathMetrics(path);
  return [
    roadPad(levelNumber, 'a', total * 0.18),
    grassPad(levelNumber, 'b', ...grassPlacements[0]),
    roadPad(levelNumber, 'c', total * 0.39),
    grassPad(levelNumber, 'd', ...grassPlacements[1]),
    roadPad(levelNumber, 'e', total * 0.62),
    grassPad(levelNumber, 'f', ...grassPlacements[2]),
    roadPad(levelNumber, 'g', total * 0.84),
    grassPad(levelNumber, 'h', ...grassPlacements[3]),
  ];
};

const level = ({
  id, name, waveCount, healthScale, bountyCoinCap = null, threatIndex,
  path, pads, waves, silverScore, goldScore, parSeconds,
}) => freeze({
  id,
  name,
  waveCount,
  healthScale,
  bountyCoinCap,
  threatIndex,
  castleHearts: 3,
  startingCoins: 150,
  path,
  pads,
  waves,
  silverScore,
  goldScore,
  parSeconds,
  referenceStrategies: [`${id}-balanced`, `${id}-artillery`],
});

export const LEVELS = freeze([
  level({
    id: 'level-1', name: 'Meadow Watch', waveCount: 3, healthScale: 1.00, threatIndex: 100,
    path: [
      { x: 238, y: 0 }, { x: 238, y: 72 },
      { x: 430, y: 72 }, { x: 430, y: 174 },
      { x: 158, y: 174 }, { x: 158, y: 300 },
      { x: 414, y: 300 }, { x: 414, y: 392 },
      { x: 252, y: 392 }, { x: 252, y: 500 },
      { x: 320, y: 500 },
    ],
    pads: authoredPads(1, [
      { x: 238, y: 0 }, { x: 238, y: 72 }, { x: 430, y: 72 }, { x: 430, y: 174 },
      { x: 158, y: 174 }, { x: 158, y: 300 }, { x: 414, y: 300 }, { x: 414, y: 392 },
      { x: 252, y: 392 }, { x: 252, y: 500 }, { x: 320, y: 500 },
    ], [[40, 80], [580, 200], [70, 400], [580, 460]]),
    waves: [
      [spawn('blight-walker', 6, 84, 0)],
      [spawn('blight-walker', 8, 72, 0)],
      [spawn('blight-walker', 10, 66, 0)],
    ],
    silverScore: 180, goldScore: 250, parSeconds: 180,
  }),
  level({
    id: 'level-2', name: 'Quickstep Grove', waveCount: 4, healthScale: 1.12, threatIndex: 135,
    path: [
      { x: 140, y: 0 }, { x: 140, y: 92 }, { x: 360, y: 92 }, { x: 360, y: 170 },
      { x: 520, y: 170 }, { x: 520, y: 260 }, { x: 250, y: 260 }, { x: 250, y: 350 },
      { x: 440, y: 350 }, { x: 440, y: 500 }, { x: 320, y: 500 },
    ],
    pads: authoredPads(2, [
      { x: 140, y: 0 }, { x: 140, y: 92 }, { x: 360, y: 92 }, { x: 360, y: 170 },
      { x: 520, y: 170 }, { x: 520, y: 260 }, { x: 250, y: 260 }, { x: 250, y: 350 },
      { x: 440, y: 350 }, { x: 440, y: 500 }, { x: 320, y: 500 },
    ], [[580, 80], [70, 220], [70, 430], [590, 430]]),
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
    path: [
      { x: 500, y: 0 }, { x: 500, y: 74 }, { x: 290, y: 74 }, { x: 290, y: 144 },
      { x: 110, y: 144 }, { x: 110, y: 240 }, { x: 340, y: 240 }, { x: 340, y: 330 },
      { x: 520, y: 330 }, { x: 520, y: 420 }, { x: 320, y: 420 }, { x: 320, y: 500 },
    ],
    pads: authoredPads(3, [
      { x: 500, y: 0 }, { x: 500, y: 74 }, { x: 290, y: 74 }, { x: 290, y: 144 },
      { x: 110, y: 144 }, { x: 110, y: 240 }, { x: 340, y: 240 }, { x: 340, y: 330 },
      { x: 520, y: 330 }, { x: 520, y: 420 }, { x: 320, y: 420 }, { x: 320, y: 500 },
    ], [[60, 50], [600, 150], [60, 350], [620, 430]]),
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
    path: [
      { x: 180, y: 0 }, { x: 180, y: 80 }, { x: 400, y: 80 }, { x: 400, y: 155 },
      { x: 220, y: 155 }, { x: 220, y: 250 }, { x: 480, y: 250 }, { x: 480, y: 335 },
      { x: 400, y: 335 }, { x: 400, y: 500 }, { x: 320, y: 500 },
    ],
    pads: authoredPads(4, [
      { x: 180, y: 0 }, { x: 180, y: 80 }, { x: 400, y: 80 }, { x: 400, y: 155 },
      { x: 220, y: 155 }, { x: 220, y: 250 }, { x: 480, y: 250 }, { x: 480, y: 335 },
      { x: 400, y: 335 }, { x: 400, y: 500 }, { x: 320, y: 500 },
    ], [[70, 80], [570, 160], [70, 340], [590, 400]]),
    waves: [
      [spawn('blight-walker', 10, 66, 0)],
      [spawn('skitter', 10, 50, 0), spawn('shellguard', 4, 102, 120)],
      [spawn('shellguard', 7, 90, 0)],
      [spawn('blight-walker', 10, 60, 0), spawn('skitter', 10, 48, 90)],
      [spawn('mossback-brute', 1, 0, 0), spawn('blight-walker', 8, 66, 180)],
    ],
    silverScore: 520, goldScore: 690, parSeconds: 270,
  }),
  level({
    id: 'level-5', name: 'Twisting Thicket', waveCount: 5, healthScale: 1.54, threatIndex: 285,
    path: [
      { x: 440, y: 0 }, { x: 440, y: 90 }, { x: 210, y: 90 }, { x: 210, y: 175 },
      { x: 470, y: 175 }, { x: 470, y: 260 }, { x: 160, y: 260 }, { x: 160, y: 350 },
      { x: 400, y: 350 }, { x: 400, y: 430 }, { x: 300, y: 430 }, { x: 300, y: 500 },
    ],
    pads: authoredPads(5, [
      { x: 440, y: 0 }, { x: 440, y: 90 }, { x: 210, y: 90 }, { x: 210, y: 175 },
      { x: 470, y: 175 }, { x: 470, y: 260 }, { x: 160, y: 260 }, { x: 160, y: 350 },
      { x: 400, y: 350 }, { x: 400, y: 430 }, { x: 300, y: 430 }, { x: 300, y: 500 },
    ], [[80, 60], [570, 120], [80, 430], [560, 400]]),
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
    path: [
      { x: 280, y: 0 }, { x: 280, y: 65 }, { x: 500, y: 65 }, { x: 500, y: 150 },
      { x: 320, y: 150 }, { x: 320, y: 230 }, { x: 120, y: 230 }, { x: 120, y: 320 },
      { x: 460, y: 320 }, { x: 460, y: 410 }, { x: 300, y: 410 }, { x: 300, y: 500 },
    ],
    pads: authoredPads(6, [
      { x: 280, y: 0 }, { x: 280, y: 65 }, { x: 500, y: 65 }, { x: 500, y: 150 },
      { x: 320, y: 150 }, { x: 320, y: 230 }, { x: 120, y: 230 }, { x: 120, y: 320 },
      { x: 460, y: 320 }, { x: 460, y: 410 }, { x: 300, y: 410 }, { x: 300, y: 500 },
    ], [[70, 60], [600, 130], [50, 410], [570, 470]]),
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
    path: [
      { x: 360, y: 0 }, { x: 360, y: 80 }, { x: 140, y: 80 }, { x: 140, y: 165 },
      { x: 390, y: 165 }, { x: 390, y: 250 }, { x: 560, y: 250 }, { x: 560, y: 330 },
      { x: 260, y: 330 }, { x: 260, y: 420 }, { x: 340, y: 420 }, { x: 340, y: 500 },
    ],
    pads: authoredPads(7, [
      { x: 360, y: 0 }, { x: 360, y: 80 }, { x: 140, y: 80 }, { x: 140, y: 165 },
      { x: 390, y: 165 }, { x: 390, y: 250 }, { x: 560, y: 250 }, { x: 560, y: 330 },
      { x: 260, y: 330 }, { x: 260, y: 420 }, { x: 340, y: 420 }, { x: 340, y: 500 },
    ], [[70, 20], [600, 130], [60, 380], [600, 430]]),
    waves: [
      [spawn('shellguard', 8, 78, 0)],
      [spawn('hexcaller', 4, 102, 0), spawn('skitter', 16, 42, 72)],
      [spawn('crusher', 4, 132, 0), spawn('shellguard', 6, 78, 96)],
      [spawn('swarmkin', 28, 24, 0)],
      [spawn('shellguard', 10, 72, 0), spawn('hexcaller', 4, 96, 108)],
      [
        spawn('ironhide-warlord', 1, 0, 0),
        spawn('shellguard', 8, 72, 180),
        spawn('skitter', 4, 40, 240),
        spawn('crusher', 4, 90, 300),
        spawn('skitter', 30, 30, 240),
        spawn('shellguard', 30, 15, 180),
      ],
    ],
    silverScore: 1050, goldScore: 1360, parSeconds: 360,
  }),
  level({
    id: 'level-8', name: 'Fogbound Siege', waveCount: 6, healthScale: 2.14, threatIndex: 525,
    path: [
      { x: 160, y: 0 }, { x: 160, y: 95 }, { x: 430, y: 95 }, { x: 430, y: 180 },
      { x: 240, y: 180 }, { x: 240, y: 265 }, { x: 510, y: 265 }, { x: 510, y: 350 },
      { x: 400, y: 350 }, { x: 400, y: 435 }, { x: 320, y: 435 }, { x: 320, y: 500 },
    ],
    pads: authoredPads(8, [
      { x: 160, y: 0 }, { x: 160, y: 95 }, { x: 430, y: 95 }, { x: 430, y: 180 },
      { x: 240, y: 180 }, { x: 240, y: 265 }, { x: 510, y: 265 }, { x: 510, y: 350 },
      { x: 400, y: 350 }, { x: 400, y: 435 }, { x: 320, y: 435 }, { x: 320, y: 500 },
    ], [[60, 50], [590, 120], [60, 350], [600, 430]]),
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
    path: [
      { x: 480, y: 0 }, { x: 480, y: 70 }, { x: 260, y: 70 }, { x: 260, y: 145 },
      { x: 450, y: 145 }, { x: 450, y: 235 }, { x: 200, y: 235 }, { x: 200, y: 325 },
      { x: 500, y: 325 }, { x: 500, y: 410 }, { x: 310, y: 410 }, { x: 310, y: 500 },
    ],
    pads: authoredPads(9, [
      { x: 480, y: 0 }, { x: 480, y: 70 }, { x: 260, y: 70 }, { x: 260, y: 145 },
      { x: 450, y: 145 }, { x: 450, y: 235 }, { x: 200, y: 235 }, { x: 200, y: 325 },
      { x: 500, y: 325 }, { x: 500, y: 410 }, { x: 310, y: 410 }, { x: 310, y: 500 },
    ], [[80, 20], [580, 170], [70, 300], [600, 450]]),
    waves: [
      [spawn('crusher', 5, 120, 0), spawn('shellguard', 8, 66, 96)],
      [spawn('hexcaller', 5, 90, 0), spawn('swarmkin', 30, 22, 84)],
      [spawn('skitter', 20, 36, 0), spawn('crusher', 4, 114, 90)],
      [spawn('shellguard', 12, 60, 0), spawn('hexcaller', 5, 84, 90)],
      [spawn('swarmkin', 36, 20, 0), spawn('skitter', 20, 34, 72)],
      [spawn('crusher', 6, 108, 0), spawn('shellguard', 10, 60, 108)],
      [spawn('hexcaller', 6, 84, 0), spawn('swarmkin', 40, 20, 96)],
    ],
    silverScore: 1540, goldScore: 1980, parSeconds: 420,
  }),
  level({
    id: 'level-10', name: "Champion's Stand", waveCount: 8, healthScale: 2.65, bountyCoinCap: 580, threatIndex: 800,
    path: [
      { x: 220, y: 0 }, { x: 220, y: 85 }, { x: 460, y: 85 }, { x: 460, y: 165 },
      { x: 300, y: 165 }, { x: 300, y: 245 }, { x: 530, y: 245 }, { x: 530, y: 335 },
      { x: 240, y: 335 }, { x: 240, y: 425 }, { x: 350, y: 425 }, { x: 350, y: 500 },
    ],
    pads: authoredPads(10, [
      { x: 220, y: 0 }, { x: 220, y: 85 }, { x: 460, y: 85 }, { x: 460, y: 165 },
      { x: 300, y: 165 }, { x: 300, y: 245 }, { x: 530, y: 245 }, { x: 530, y: 335 },
      { x: 240, y: 335 }, { x: 240, y: 425 }, { x: 350, y: 425 }, { x: 350, y: 500 },
    ], [[80, 35], [590, 140], [70, 390], [600, 455]]),
    waves: [
      [spawn('shellguard', 12, 60, 0), spawn('hexcaller', 5, 84, 96)],
      [spawn('swarmkin', 40, 20, 0), spawn('skitter', 20, 34, 72)],
      [spawn('crusher', 6, 108, 0), spawn('shellguard', 10, 60, 90)],
      [spawn('hexcaller', 6, 78, 0), spawn('swarmkin', 36, 20, 96)],
      [spawn('skitter', 24, 32, 0), spawn('crusher', 6, 102, 90)],
      [spawn('shellguard', 14, 54, 0), spawn('hexcaller', 6, 78, 108)],
      [spawn('swarmkin', 42, 18, 0), spawn('crusher', 5, 102, 90)],
      [
        spawn('dread-colossus', 1, 0, 0),
        spawn('swarmkin', 20, 22, 180),
        spawn('shellguard', 50, 5, 120),
        spawn('swarmkin', 100, 3, 120),
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
