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

const level = ({ id, name, waveCount, healthScale, threatIndex, path, pads, waves, silverScore, goldScore, parSeconds }) => freeze({
  id,
  name,
  waveCount,
  healthScale,
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
    path: [{ x: 34, y: 354 }, { x: 178, y: 342 }, { x: 282, y: 228 }, { x: 452, y: 218 }, { x: 604, y: 108 }],
    pads: [
      { id: 'l1-pad-a', x: 122, y: 278 }, { id: 'l1-pad-b', x: 214, y: 396 },
      { id: 'l1-pad-c', x: 304, y: 154 }, { id: 'l1-pad-d', x: 366, y: 306 },
      { id: 'l1-pad-e', x: 446, y: 132 }, { id: 'l1-pad-f', x: 500, y: 300 },
      { id: 'l1-pad-g', x: 554, y: 182 }, { id: 'l1-pad-h', x: 590, y: 358 },
    ],
    waves: [
      [spawn('blight-walker', 6, 84, 0)],
      [spawn('blight-walker', 8, 72, 0)],
      [spawn('blight-walker', 10, 66, 0)],
    ],
    silverScore: 180, goldScore: 250, parSeconds: 180,
  }),
  level({
    id: 'level-2', name: 'Quickstep Grove', waveCount: 4, healthScale: 1.12, threatIndex: 135,
    path: [{ x: 32, y: 124 }, { x: 154, y: 146 }, { x: 220, y: 280 }, { x: 362, y: 322 }, { x: 510, y: 248 }, { x: 622, y: 366 }],
    pads: [
      { id: 'l2-pad-a', x: 90, y: 230 }, { id: 'l2-pad-b', x: 166, y: 88 },
      { id: 'l2-pad-c', x: 252, y: 194 }, { id: 'l2-pad-d', x: 286, y: 370 },
      { id: 'l2-pad-e', x: 398, y: 230 }, { id: 'l2-pad-f', x: 434, y: 382 },
      { id: 'l2-pad-g', x: 540, y: 182 }, { id: 'l2-pad-h', x: 572, y: 306 },
    ],
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
    path: [{ x: 36, y: 394 }, { x: 148, y: 314 }, { x: 184, y: 172 }, { x: 330, y: 138 }, { x: 470, y: 224 }, { x: 612, y: 170 }],
    pads: [
      { id: 'l3-pad-a', x: 92, y: 300 }, { id: 'l3-pad-b', x: 158, y: 406 },
      { id: 'l3-pad-c', x: 238, y: 238 }, { id: 'l3-pad-d', x: 248, y: 92 },
      { id: 'l3-pad-e', x: 358, y: 238 }, { id: 'l3-pad-f', x: 406, y: 112 },
      { id: 'l3-pad-g', x: 490, y: 316 }, { id: 'l3-pad-h', x: 566, y: 128 },
    ],
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
    path: [{ x: 36, y: 204 }, { x: 142, y: 310 }, { x: 280, y: 300 }, { x: 336, y: 164 }, { x: 486, y: 134 }, { x: 612, y: 250 }],
    pads: [
      { id: 'l4-pad-a', x: 96, y: 130 }, { id: 'l4-pad-b', x: 114, y: 364 },
      { id: 'l4-pad-c', x: 220, y: 210 }, { id: 'l4-pad-d', x: 244, y: 372 },
      { id: 'l4-pad-e', x: 362, y: 258 }, { id: 'l4-pad-f', x: 404, y: 112 },
      { id: 'l4-pad-g', x: 500, y: 242 }, { id: 'l4-pad-h', x: 558, y: 132 },
    ],
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
    path: [{ x: 30, y: 104 }, { x: 146, y: 128 }, { x: 220, y: 262 }, { x: 156, y: 372 }, { x: 342, y: 394 }, { x: 464, y: 300 }, { x: 606, y: 346 }],
    pads: [
      { id: 'l5-pad-a', x: 88, y: 204 }, { id: 'l5-pad-b', x: 180, y: 72 },
      { id: 'l5-pad-c', x: 286, y: 182 }, { id: 'l5-pad-d', x: 242, y: 346 },
      { id: 'l5-pad-e', x: 390, y: 302 }, { id: 'l5-pad-f', x: 410, y: 414 },
      { id: 'l5-pad-g', x: 504, y: 230 }, { id: 'l5-pad-h', x: 550, y: 378 },
    ],
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
    path: [{ x: 38, y: 382 }, { x: 160, y: 354 }, { x: 234, y: 226 }, { x: 380, y: 202 }, { x: 462, y: 92 }, { x: 604, y: 142 }],
    pads: [
      { id: 'l6-pad-a', x: 96, y: 286 }, { id: 'l6-pad-b', x: 170, y: 432 },
      { id: 'l6-pad-c', x: 264, y: 150 }, { id: 'l6-pad-d', x: 318, y: 278 },
      { id: 'l6-pad-e', x: 386, y: 110 }, { id: 'l6-pad-f', x: 438, y: 294 },
      { id: 'l6-pad-g', x: 514, y: 92 }, { id: 'l6-pad-h', x: 548, y: 224 },
    ],
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
    id: 'level-7', name: "Warlord's March", waveCount: 6, healthScale: 1.92, threatIndex: 430,
    path: [{ x: 34, y: 166 }, { x: 148, y: 220 }, { x: 266, y: 166 }, { x: 356, y: 300 }, { x: 504, y: 304 }, { x: 610, y: 204 }],
    pads: [
      { id: 'l7-pad-a', x: 86, y: 260 }, { id: 'l7-pad-b', x: 160, y: 108 },
      { id: 'l7-pad-c', x: 230, y: 262 }, { id: 'l7-pad-d', x: 306, y: 92 },
      { id: 'l7-pad-e', x: 372, y: 206 }, { id: 'l7-pad-f', x: 412, y: 366 },
      { id: 'l7-pad-g', x: 510, y: 210 }, { id: 'l7-pad-h', x: 558, y: 326 },
    ],
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
        spawn('crusher', 3, 120, 300),
      ],
    ],
    silverScore: 1050, goldScore: 1360, parSeconds: 360,
  }),
  level({
    id: 'level-8', name: 'Fogbound Siege', waveCount: 6, healthScale: 2.14, threatIndex: 525,
    path: [{ x: 36, y: 352 }, { x: 128, y: 244 }, { x: 264, y: 270 }, { x: 374, y: 382 }, { x: 484, y: 250 }, { x: 606, y: 286 }],
    pads: [
      { id: 'l8-pad-a', x: 82, y: 244 }, { id: 'l8-pad-b', x: 144, y: 404 },
      { id: 'l8-pad-c', x: 206, y: 186 }, { id: 'l8-pad-d', x: 302, y: 358 },
      { id: 'l8-pad-e', x: 366, y: 278 }, { id: 'l8-pad-f', x: 424, y: 426 },
      { id: 'l8-pad-g', x: 500, y: 170 }, { id: 'l8-pad-h', x: 548, y: 336 },
    ],
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
    path: [{ x: 30, y: 122 }, { x: 148, y: 188 }, { x: 178, y: 344 }, { x: 324, y: 366 }, { x: 448, y: 238 }, { x: 612, y: 158 }],
    pads: [
      { id: 'l9-pad-a', x: 82, y: 228 }, { id: 'l9-pad-b', x: 152, y: 96 },
      { id: 'l9-pad-c', x: 238, y: 246 }, { id: 'l9-pad-d', x: 252, y: 416 },
      { id: 'l9-pad-e', x: 370, y: 286 }, { id: 'l9-pad-f', x: 394, y: 414 },
      { id: 'l9-pad-g', x: 486, y: 154 }, { id: 'l9-pad-h', x: 554, y: 244 },
    ],
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
    id: 'level-10', name: "Champion's Stand", waveCount: 8, healthScale: 2.65, threatIndex: 800,
    path: [{ x: 34, y: 388 }, { x: 142, y: 332 }, { x: 238, y: 214 }, { x: 376, y: 246 }, { x: 486, y: 364 }, { x: 610, y: 286 }],
    pads: [
      { id: 'l10-pad-a', x: 88, y: 300 }, { id: 'l10-pad-b', x: 150, y: 414 },
      { id: 'l10-pad-c', x: 218, y: 298 }, { id: 'l10-pad-d', x: 282, y: 136 },
      { id: 'l10-pad-e', x: 358, y: 166 }, { id: 'l10-pad-f', x: 406, y: 326 },
      { id: 'l10-pad-g', x: 492, y: 260 }, { id: 'l10-pad-h', x: 554, y: 390 },
    ],
    waves: [
      [spawn('shellguard', 12, 60, 0), spawn('hexcaller', 5, 84, 96)],
      [spawn('swarmkin', 40, 20, 0), spawn('skitter', 20, 34, 72)],
      [spawn('crusher', 6, 108, 0), spawn('shellguard', 10, 60, 90)],
      [spawn('hexcaller', 6, 78, 0), spawn('swarmkin', 36, 20, 96)],
      [spawn('skitter', 24, 32, 0), spawn('crusher', 6, 102, 90)],
      [spawn('shellguard', 14, 54, 0), spawn('hexcaller', 6, 78, 108)],
      [spawn('swarmkin', 42, 18, 0), spawn('crusher', 5, 102, 90)],
      [spawn('dread-colossus', 1, 0, 0), spawn('swarmkin', 20, 22, 180)],
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
