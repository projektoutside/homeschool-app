(() => {
  'use strict';

  // Birds are authored as [center x, lane y, range, phase]. All positions use the 360 × 640 playfield.
  const levels = [
    {
      title: 'First Drop',
      note: 'Start with a straight drop down the center. The bird stays close to the claw’s starting line.',
      inkBudget: 100,
      blockers: [],
      birds: [[180, 350, 13, 0]],
    },
    {
      title: 'Willow Slide',
      note: 'Start to the right of the steel rail. Draw a runway below it that slopes down toward the bird.',
      inkBudget: 155,
      blockers: [[90, 188, 241, 225]],
      birds: [[117, 413, 15, 3.44]],
    },
    {
      title: 'High and Low',
      note: 'Drop through the high bird first. Use a sloping runway underneath it to reach the low bird.',
      inkBudget: 165,
      blockers: [[203, 183, 309, 207]],
      birds: [[118, 284, 15, 0.3], [283, 446, 18, 1.6]],
    },
    {
      title: 'Crosswind',
      note: 'Catch the high bird on the left, then cross to the right before the lower rail.',
      inkBudget: 145,
      blockers: [[190, 215, 307, 187], [90, 495, 172, 478]],
      birds: [[137, 295, 17, 3.44], [262, 466, 21, 4.74]],
    },
    {
      title: 'Fern Switchback',
      note: 'Turn left through the first bird, then build a return runway to catch the low bird.',
      inkBudget: 295,
      blockers: [[63, 171, 200, 205]],
      birds: [[112, 318, 18, 0.3], [258, 486, 20, 1.6]],
    },
    {
      title: 'Three-Wing Relay',
      note: 'Use the steel rail for the first turn. Reverse below the high bird to reach the lower pair.',
      inkBudget: 182,
      blockers: [[74, 217, 239, 249], [50, 399, 114, 382]],
      birds: [[254, 299, 21, 3.44], [144, 460, 23, 4.74], [94, 540, 24, 6.24]],
    },
    {
      title: 'Briar Gate',
      note: 'Send the stone through the upper opening. The right gatepost can guide the stone back left.',
      inkBudget: 160,
      blockers: [[138, 189, 300, 150], [153, 285, 153, 355], [262, 260, 262, 360]],
      birds: [[215, 268, 15, -0.5], [246, 399, 19, 0.4], [200, 494, 22, 2.3]],
    },
    {
      title: 'Shale Steps',
      note: 'Let the first steel step set the direction. Link two drawn slopes to reverse the stone below it.',
      inkBudget: 322,
      blockers: [[233, 259, 314, 235], [69, 254, 196, 226]],
      birds: [[184, 301, 21, 3.44], [214, 455, 23, 4.74], [252, 534, 20, 6.24]],
    },
    {
      title: 'Canopy Spiral',
      note: 'Plan three alternating turns. Leave a gap between the runways so the stone can descend.',
      inkBudget: 365,
      blockers: [[105, 119, 219, 145], [214, 295, 294, 309]],
      birds: [[131, 269, 24, 0.3], [209, 411, 26, 1.6], [174, 550, 28, 3.1]],
    },
    {
      title: 'Thunder Crown',
      note: 'Thread three narrow turns and lead the fast patrols. The last bird skims just above the forest floor.',
      inkBudget: 410,
      blockers: [[61, 132, 220, 168], [221, 360, 281, 340], [51, 465, 130, 449]],
      birds: [[86, 300, 24, 2.04], [252, 455, 26, 3.34], [109, 570, 28, 4.24], [83, 602, 19, 1.9]],
    },
  ];

  window.WoodlandUnrealLevels = Object.freeze(levels.map(({ birds, blockers, ...level }, index) => Object.freeze({
    ...level,
    hint: [],
    blockers: blockers.map(([x1, y1, x2, y2]) => ({ x1, y1, x2, y2, radius: 7, kind: 'blocker' })),
    birdXs: birds.map(([x]) => x),
    birdLaneYs: birds.map(([, y]) => y),
    birdRanges: birds.map(([, , range]) => range),
    birdPhases: birds.map(([, , , phase]) => phase),
    birdSpeeds: birds.map(([, , range], birdIndex) => (8 + index * 3.7 + birdIndex * 2) / range),
  })));
})();
