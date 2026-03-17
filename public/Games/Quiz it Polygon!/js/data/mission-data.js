const palette = {
    triangle: '#4f8cff',
    'right-triangle': '#4f8cff',
    'acute-triangle': '#4f8cff',
    'obtuse-triangle': '#4f8cff',
    square: '#ffb03a',
    rectangle: '#ff8a5b',
    parallelogram: '#27b07d',
    rhombus: '#8c63ff',
    trapezoid: '#ff6d8f',
    pentagon: '#00a5a7',
    hexagon: '#5d7cff',
    heptagon: '#5f90ff',
    octagon: '#ff8c42',
    kite: '#ff5f8f'
};

const shapeChoices = [
    { type: 'triangle', title: 'Triangle', copy: '3 sides' },
    { type: 'square', title: 'Square', copy: '4 same sides' },
    { type: 'rectangle', title: 'Rectangle', copy: '4 square corners' },
    { type: 'parallelogram', title: 'Parallelogram', copy: '2 side pairs match' },
    { type: 'trapezoid', title: 'Trapezoid', copy: '1 side pair matches' },
    { type: 'rhombus', title: 'Rhombus', copy: '4 same sides' },
    { type: 'pentagon', title: 'Pentagon', copy: '5 sides' },
    { type: 'hexagon', title: 'Hexagon', copy: '6 sides' },
    { type: 'heptagon', title: 'Heptagon', copy: '7 sides' },
    { type: 'octagon', title: 'Octagon', copy: '8 sides' }
];

function def(shapeType, extra = {}) {
    return {
        shapeType,
        color: palette[shapeType] || '#4f8cff',
        name: extra.name || shapeType,
        ...extra
    };
}

function custom(vertices, extra = {}) {
    return {
        vertices,
        color: extra.color || '#4f8cff',
        name: extra.name || 'Shape',
        ...extra
    };
}

const ISOSCELES_TRAPEZOID_GUIDE = custom([
    { x: -72, y: 42 },
    { x: 72, y: 42 },
    { x: 42, y: -42 },
    { x: -42, y: -42 }
], { name: 'Isosceles Trapezoid', color: palette.trapezoid });

const KITE_GUIDE = custom([
    { x: 0, y: -72 },
    { x: 48, y: -12 },
    { x: 0, y: 72 },
    { x: -72, y: -12 }
], { name: 'Kite', color: palette.kite });

const RHOMBUS_GUIDE = custom([
    { x: 0, y: -48 },
    { x: 72, y: 0 },
    { x: 0, y: 48 },
    { x: -72, y: 0 }
], { name: 'Rhombus', color: palette.rhombus });

const CONCAVE_PENTAGON_GUIDE = custom([
    { x: 0, y: -72 },
    { x: 72, y: -24 },
    { x: 24, y: 0 },
    { x: 48, y: 72 },
    { x: -72, y: 48 }
], { name: 'Concave Pentagon', color: palette.pentagon });

const CONCAVE_HEXAGON_GUIDE = custom([
    { x: -72, y: -48 },
    { x: 24, y: -48 },
    { x: 24, y: -12 },
    { x: 72, y: 0 },
    { x: 24, y: 48 },
    { x: -72, y: 48 }
], { name: 'Concave Hexagon', color: palette.hexagon });

const ISOSCELES_TRIANGLE_GUIDE = custom([
    { x: -48, y: 48 },
    { x: 48, y: 48 },
    { x: 0, y: -48 }
], { name: 'Isosceles Triangle', color: palette.triangle });

const SCALENE_TRIANGLE_GUIDE = custom([
    { x: -72, y: 48 },
    { x: 48, y: 48 },
    { x: -24, y: -36 }
], { name: 'Scalene Triangle', color: palette.triangle });

const ISOSCELES_RIGHT_TRIANGLE_GUIDE = custom([
    { x: -48, y: 48 },
    { x: 48, y: 48 },
    { x: -48, y: -48 }
], { name: 'Isosceles Right Triangle', color: palette['right-triangle'] });

const OBTUSE_SCALENE_TRIANGLE_GUIDE = custom([
    { x: -72, y: 48 },
    { x: 72, y: 48 },
    { x: -48, y: 0 }
], { name: 'Obtuse Scalene Triangle', color: palette['obtuse-triangle'] });

const REGULAR_PENTAGON_STARTER = custom([
    { x: 0, y: -72 },
    { x: 48, y: -24 },
    { x: 24, y: 48 },
    { x: -24, y: 48 },
    { x: -48, y: -24 }
], { name: 'Starter', color: palette.pentagon });

const REGULAR_HEXAGON_STARTER = custom([
    { x: 0, y: -72 },
    { x: 48, y: -24 },
    { x: 72, y: 24 },
    { x: 0, y: 48 },
    { x: -48, y: 24 },
    { x: -48, y: -24 }
], { name: 'Starter', color: palette.hexagon });

const REGULAR_OCTAGON_STARTER = custom([
    { x: 0, y: -72 },
    { x: 24, y: -24 },
    { x: 72, y: 0 },
    { x: 24, y: 24 },
    { x: 0, y: 48 },
    { x: -24, y: 24 },
    { x: -48, y: 0 },
    { x: -24, y: -24 }
], { name: 'Starter', color: palette.octagon });

function ensureFourOptions(options = [], fallbackOptions = []) {
    const next = [];
    const seen = new Set();

    [...options, ...fallbackOptions].forEach((option) => {
        if (!option || seen.has(option) || next.length >= 4) return;
        seen.add(option);
        next.push(option);
    });

    return next;
}

function guessVertexCount(target = {}, extra = {}) {
    if (Number.isFinite(extra.points)) return extra.points;
    if (Array.isArray(extra.guideDefinitions) && extra.guideDefinitions[0]?.vertices?.length) {
        return extra.guideDefinitions[0].vertices.length;
    }

    const label = String(target.exact || target.primary || target.family || extra.guideShape || '').toLowerCase();
    if (label.includes('triangle')) return 3;
    if (label.includes('quadrilateral') || label.includes('square') || label.includes('rectangle') || label.includes('trapezoid') || label.includes('rhombus') || label.includes('kite') || label.includes('parallelogram')) return 4;
    if (label.includes('pentagon')) return 5;
    if (label.includes('hexagon')) return 6;
    if (label.includes('heptagon')) return 7;
    if (label.includes('octagon')) return 8;
    return 4;
}

function buildShapeTask(id, prompt, target, extra = {}) {
    const helperBadges = extra.helperBadges || [];
    return {
        id,
        type: extra.fix ? 'fix-shape' : extra.type || 'make-shape',
        modeTitle: extra.modeTitle || (extra.fix ? 'Fix' : 'Make'),
        answerMode: 'board',
        prompt,
        shortHelp: extra.shortHelp || 'Drag corners until the polygon matches.',
        boardNote: extra.boardNote || 'Move a corner point or plot a new shape on the grid.',
        celebrationText: extra.celebrationText || 'Nice polygon!',
        hintLadder: extra.hintLadder || [
            extra.fix ? 'Start by checking the side count and corner rules.' : 'Think about the side count and shape rules first.',
            extra.fix ? 'The helper guide is on the board now.' : 'The helper outline is on the board now.',
            extra.teachText || 'Use the polygon rules, not just the name.'
        ],
        visualNote: extra.visualNote || 'The yellow guide shows what to aim for when help is on.',
        board: {
            editable: true,
            starterDefinitions: extra.starterDefinitions || [],
            guideShape: extra.guideShape || target.shapeType || null,
            guideDefinitions: extra.guideDefinitions || [],
            guideCenter: extra.guideCenter || null,
            guideScale: extra.guideScale,
            allowDraw: extra.allowDraw !== false,
            allowShapePicker: extra.allowShapePicker !== false,
            preferredTool: extra.preferredTool || (extra.requireDrawnShape ? 'draw' : 'move'),
            helperBadges
        },
        success: {
            type: 'shape-match',
            primary: target.primary || null,
            exact: target.exact || null,
            exactAny: target.exactAny || [],
            exactAll: target.exactAll || [],
            family: target.family || null,
            requireTraits: target.requireTraits || [],
            rejectTraits: target.rejectTraits || [],
            rejectPrimary: target.rejectPrimary || [],
            rejectExact: target.rejectExact || []
        },
        proof: {
            requireDrawnShape: extra.requireDrawnShape === true,
            requireShapeCreate: extra.requireShapeCreate === true,
            minPlacedVertices: extra.minPlacedVertices || 0,
            minVertexMoves: extra.minVertexMoves || 0,
            minShapeMoves: extra.minShapeMoves || 0,
            drawMessage: extra.drawMessage,
            createMessage: extra.createMessage,
            plotMessage: extra.plotMessage,
            moveMessage: extra.moveMessage,
            shapeMoveMessage: extra.shapeMoveMessage
        }
    };
}

function plotTask(id, prompt, target, extra = {}) {
    const points = guessVertexCount(target, extra);
    return buildShapeTask(id, prompt, target, {
        ...extra,
        type: 'plot-shape',
        modeTitle: extra.modeTitle || 'Plot',
        allowShapePicker: false,
        allowDraw: true,
        preferredTool: 'draw',
        requireDrawnShape: true,
        minPlacedVertices: points,
        shortHelp: extra.shortHelp || `Plot ${points} corner points, then tap the first point again to close the polygon.`,
        boardNote: extra.boardNote || 'Use Plot to place corner points on the grid. Tap the first point again when you are ready to close the shape.',
        helperBadges: extra.helperBadges || [`Plot ${points} points`, 'Tap first point to close'],
        celebrationText: extra.celebrationText || 'You drew the polygon!'
    });
}

function moveTask(id, prompt, target, extra = {}) {
    return buildShapeTask(id, prompt, target, {
        ...extra,
        modeTitle: extra.modeTitle || (extra.fix ? 'Fix' : 'Move'),
        allowShapePicker: extra.allowShapePicker ?? false,
        allowDraw: extra.allowDraw ?? false,
        preferredTool: 'move',
        minVertexMoves: extra.minVertexMoves ?? 1,
        shortHelp: extra.shortHelp || 'Move one or more corner points until the polygon matches.',
        boardNote: extra.boardNote || 'Drag the corner points on the grid.',
        helperBadges: extra.helperBadges || ['Move corner points', 'Use the grid to line it up']
    });
}

function choiceTask(id, prompt, boardDefinitions, options, answer, extra = {}) {
    return {
        id,
        type: extra.type || 'pick-name',
        modeTitle: extra.modeTitle || 'Pick',
        answerMode: 'choice',
        prompt,
        shortHelp: extra.shortHelp || 'Tap the best answer.',
        boardNote: extra.boardNote || 'Study the shape on the board.',
        celebrationText: extra.celebrationText || 'You picked the best answer!',
        hintLadder: extra.hintLadder || [
            'Look at the sides and corners.',
            'The board now shows a helper clue.',
            extra.teachText || 'Pick the most exact true name.'
        ],
        visualNote: extra.visualNote || 'Use the clue on the board to help.',
        board: {
            editable: false,
            starterDefinitions: boardDefinitions,
            showLiveMetric: extra.showLiveMetric || null,
            allowDraw: false,
            allowShapePicker: false,
            preferredTool: 'move',
            helperBadges: extra.helperBadges || []
        },
        options: ensureFourOptions(options, extra.fallbackOptions),
        success: { type: 'choice', answer },
        proof: {}
    };
}

const factories = {
    countTriangle: () => choiceTask('count-triangle', 'How many sides does this shape have?', [def('triangle', { locked: true })], ['3', '4', '5', '6'], '3', { type: 'count-sides', modeTitle: 'Count', teachText: 'A triangle has 3 sides.' }),
    countSquare: () => choiceTask('count-square', 'How many sides does this shape have?', [def('square', { locked: true })], ['3', '4', '5', '6'], '4', { type: 'count-sides', modeTitle: 'Count', teachText: 'A square has 4 sides.' }),
    countPentagon: () => choiceTask('count-pentagon', 'How many sides does this shape have?', [def('pentagon', { locked: true })], ['4', '5', '6', '8'], '5', { type: 'count-sides', modeTitle: 'Count', teachText: 'A pentagon has 5 sides.' }),

    pickSquare: () => choiceTask('pick-square', 'What is the best name for this shape?', [def('square', { locked: true })], ['Square', 'Rectangle', 'Rhombus', 'Parallelogram'], 'Square', { teachText: 'Square is the most exact true name.' }),
    pickRectangle: () => choiceTask('pick-rectangle', 'What is the best name for this shape?', [def('rectangle', { locked: true })], ['Square', 'Rectangle', 'Trapezoid', 'Rhombus'], 'Rectangle', { teachText: 'A rectangle has 4 right corners.' }),
    pickPentagon: () => choiceTask('pick-pentagon', 'What is the best name for this shape?', [def('pentagon', { locked: true })], ['Pentagon', 'Hexagon', 'Square', 'Polygon'], 'Pentagon', { teachText: 'A pentagon is a 5-sided polygon.' }),
    pickTriangleTypeRight: () => choiceTask('pick-triangle-right', 'What kind of triangle is this?', [def('right-triangle', { locked: true })], ['Acute Triangle', 'Right Triangle', 'Obtuse Triangle', 'Scalene Triangle'], 'Right Triangle', { teachText: 'A right triangle has one square corner.' }),
    pickTriangleTypeAcute: () => choiceTask('pick-triangle-acute', 'What kind of triangle is this?', [def('acute-triangle', { locked: true })], ['Acute Triangle', 'Right Triangle', 'Obtuse Triangle', 'Scalene Triangle'], 'Acute Triangle', { teachText: 'An acute triangle has all angles smaller than a right angle.' }),
    pickTriangleTypeObtuse: () => choiceTask('pick-triangle-obtuse', 'What kind of triangle is this?', [def('obtuse-triangle', { locked: true })], ['Acute Triangle', 'Right Triangle', 'Obtuse Triangle', 'Isosceles Triangle'], 'Obtuse Triangle', { teachText: 'An obtuse triangle has one angle bigger than a right angle.' }),
    pickParallelogram: () => choiceTask('pick-parallelogram', 'What is the best name for this shape?', [def('parallelogram', { locked: true })], ['Parallelogram', 'Rectangle', 'Trapezoid', 'Kite'], 'Parallelogram', { teachText: 'A parallelogram has 2 opposite side pairs that stay parallel.' }),
    pickRhombus: () => choiceTask('pick-rhombus', 'What is the best name for this shape?', [def('rhombus', { locked: true })], ['Rhombus', 'Square', 'Trapezoid', 'Rectangle'], 'Rhombus', { teachText: 'A rhombus has 4 equal sides.' }),
    pickTrapezoid: () => choiceTask('pick-trapezoid', 'What is the best name for this shape?', [def('trapezoid', { locked: true })], ['Trapezoid', 'Parallelogram', 'Rectangle', 'Rhombus'], 'Trapezoid', { teachText: 'A trapezoid has one matching pair of opposite sides here.' }),

    plotTriangle: () => plotTask('plot-triangle', 'Plot 3 corner points to draw a triangle.', { family: 'Triangle' }, { guideShape: 'triangle', helperBadges: ['Plot 3 points', 'Any triangle works'] }),
    plotSquare: () => plotTask('plot-square', 'Plot 4 corner points to draw a square.', { primary: 'Square' }, { guideShape: 'square', helperBadges: ['Plot 4 points', '4 equal sides'] }),
    plotRectangle: () => plotTask('plot-rectangle', 'Plot 4 corner points to draw a rectangle.', { primary: 'Rectangle' }, { guideShape: 'rectangle', helperBadges: ['Plot 4 points', '4 right corners'] }),
    plotPentagon: () => plotTask('plot-pentagon', 'Plot 5 corner points to draw a pentagon.', { family: 'Pentagon' }, { guideShape: 'pentagon' }),
    plotHexagon: () => plotTask('plot-hexagon', 'Plot 6 corner points to draw a hexagon.', { family: 'Hexagon' }, { guideShape: 'hexagon' }),
    plotHeptagon: () => plotTask('plot-heptagon', 'Plot 7 corner points to draw a heptagon.', { family: 'Heptagon' }, { guideShape: 'heptagon' }),
    plotOctagon: () => plotTask('plot-octagon', 'Plot 8 corner points to draw an octagon.', { family: 'Octagon' }, { guideShape: 'octagon' }),

    fixSquare: () => moveTask('fix-square', 'Fix this shape so it becomes a square.', { primary: 'Square' }, {
        fix: true,
        starterDefinitions: [custom([{ x: -48, y: -36 }, { x: 48, y: -24 }, { x: 60, y: 48 }, { x: -60, y: 36 }], { name: 'Starter', color: palette.square })],
        guideShape: 'square',
        shortHelp: 'Make all 4 sides the same and all 4 corners square.'
    }),
    fixRectangle: () => moveTask('fix-rectangle', 'Fix this shape so it becomes a rectangle.', { primary: 'Rectangle' }, {
        fix: true,
        starterDefinitions: [custom([{ x: -72, y: -48 }, { x: 72, y: -48 }, { x: 96, y: 48 }, { x: -48, y: 48 }], { name: 'Starter', color: palette.rectangle })],
        guideShape: 'rectangle',
        shortHelp: 'Make 4 square corners. Opposite sides should match.'
    }),
    fixPentagon: () => moveTask('fix-pentagon', 'Fix this shape so it becomes a clean pentagon.', { family: 'Pentagon', requireTraits: ['Convex'], rejectTraits: ['Complex Polygon', 'Degenerate'] }, {
        fix: true,
        starterDefinitions: [custom([{ x: 0, y: -72 }, { x: 72, y: 24 }, { x: -72, y: -24 }, { x: 72, y: -24 }, { x: -24, y: 72 }], { name: 'Starter', color: palette.pentagon })],
        guideShape: 'pentagon',
        shortHelp: 'Make 5 sides that do not cross each other.',
        moveMessage: 'Move the corner points until the pentagon is clean and convex.'
    }),
    fixHexagon: () => moveTask('fix-hexagon', 'Fix this shape so it becomes a clean hexagon.', { family: 'Hexagon', requireTraits: ['Convex'], rejectTraits: ['Complex Polygon', 'Degenerate'] }, {
        fix: true,
        starterDefinitions: [custom([{ x: -72, y: -48 }, { x: 0, y: 72 }, { x: 72, y: -48 }, { x: -24, y: 0 }, { x: 72, y: 48 }, { x: -72, y: 48 }], { name: 'Starter', color: palette.hexagon })],
        guideShape: 'hexagon',
        shortHelp: 'Keep 6 corners, but stop the sides from crossing.',
        moveMessage: 'Move the corner points until the hexagon is clean and convex.'
    }),
    fixHeptagon: () => moveTask('fix-heptagon', 'Fix this shape so it becomes a clean heptagon.', { family: 'Heptagon', requireTraits: ['Convex'], rejectTraits: ['Complex Polygon', 'Degenerate'] }, {
        fix: true,
        starterDefinitions: [custom([{ x: 0, y: -72 }, { x: 48, y: -48 }, { x: 72, y: 0 }, { x: 24, y: 0 }, { x: 72, y: 72 }, { x: -48, y: 72 }, { x: -72, y: -24 }], { name: 'Starter', color: palette.heptagon })],
        guideShape: 'heptagon',
        shortHelp: 'A heptagon needs 7 clean sides.',
        moveMessage: 'Move the corner points until the heptagon is clean and convex.'
    }),
    fixOctagon: () => moveTask('fix-octagon', 'Fix this shape so it becomes a clean octagon.', { family: 'Octagon', requireTraits: ['Convex'], rejectTraits: ['Complex Polygon', 'Degenerate'] }, {
        fix: true,
        starterDefinitions: [custom([{ x: 0, y: -72 }, { x: 48, y: -48 }, { x: 72, y: 0 }, { x: 24, y: 0 }, { x: 48, y: 72 }, { x: 0, y: 48 }, { x: -48, y: 72 }, { x: -72, y: -24 }], { name: 'Starter', color: palette.octagon })],
        guideShape: 'octagon',
        shortHelp: 'An octagon needs 8 clean sides.',
        moveMessage: 'Move the corner points until the octagon is clean and convex.'
    }),

    moveSquareIntoRectangle: () => moveTask('move-square-into-rectangle', 'Move points so this square becomes a rectangle, not a square.', { primary: 'Rectangle' }, {
        starterDefinitions: [def('square')],
        guideShape: 'rectangle',
        shortHelp: 'Stretch one side pair so not all 4 sides stay equal.'
    }),
    rectangleToSquare: () => moveTask('rectangle-to-square', 'Move points so this rectangle becomes a square.', { primary: 'Square' }, {
        starterDefinitions: [def('rectangle')],
        guideShape: 'square',
        shortHelp: 'Make all 4 sides the same and keep all 4 right corners.'
    }),

    plotRightTriangle: () => plotTask('plot-right-triangle', 'Plot 3 points to draw a right triangle.', { exact: 'Right Triangle' }, {
        guideShape: 'right-triangle',
        helperBadges: ['Plot 3 points', 'Make one square corner']
    }),
    plotAcuteTriangle: () => plotTask('plot-acute-triangle', 'Plot 3 points to draw an acute triangle.', { exact: 'Acute Triangle' }, {
        guideShape: 'acute-triangle',
        helperBadges: ['Plot 3 points', 'All angles smaller than 90°']
    }),
    plotObtuseTriangle: () => plotTask('plot-obtuse-triangle', 'Plot 3 points to draw an obtuse triangle.', { exact: 'Obtuse Triangle' }, {
        guideShape: 'obtuse-triangle',
        helperBadges: ['Plot 3 points', 'One angle bigger than 90°']
    }),
    fixRightTriangle: () => moveTask('fix-right-triangle', 'Fix this so it becomes a right triangle.', { exact: 'Right Triangle' }, {
        fix: true,
        starterDefinitions: [custom([{ x: -72, y: 48 }, { x: 72, y: 48 }, { x: 48, y: -48 }], { name: 'Starter', color: palette['right-triangle'] })],
        guideShape: 'right-triangle',
        shortHelp: 'Move one corner until you make a square corner.'
    }),
    fixAcuteTriangle: () => moveTask('fix-acute-triangle', 'Fix this so it becomes an acute triangle.', { exact: 'Acute Triangle' }, {
        fix: true,
        starterDefinitions: [custom([{ x: -72, y: 48 }, { x: 72, y: 48 }, { x: 0, y: 0 }], { name: 'Starter', color: palette['acute-triangle'] })],
        guideShape: 'acute-triangle',
        shortHelp: 'All 3 angles should end up smaller than a right angle.'
    }),
    fixObtuseTriangle: () => moveTask('fix-obtuse-triangle', 'Fix this so it becomes an obtuse triangle.', { exact: 'Obtuse Triangle' }, {
        fix: true,
        starterDefinitions: [def('triangle')],
        guideShape: 'obtuse-triangle',
        shortHelp: 'One angle needs to open wide.'
    }),
    plotScaleneTriangle: () => plotTask('plot-scalene-triangle', 'Plot 3 points to draw a scalene triangle.', { exact: 'Scalene Triangle' }, {
        guideDefinitions: [SCALENE_TRIANGLE_GUIDE],
        shortHelp: 'All 3 sides should end up different lengths.',
        helperBadges: ['Plot 3 points', 'All sides different']
    }),
    plotIsoscelesTriangle: () => plotTask('plot-isosceles-triangle', 'Plot 3 points to draw an isosceles triangle.', { exact: 'Isosceles Triangle', rejectExact: ['Equilateral Triangle'] }, {
        guideDefinitions: [ISOSCELES_TRIANGLE_GUIDE],
        shortHelp: 'Exactly 2 sides should match.',
        helperBadges: ['Plot 3 points', '2 equal sides']
    }),
    plotAcuteIsoscelesTriangle: () => plotTask('plot-acute-isosceles-triangle', 'Plot 3 points to draw an acute isosceles triangle.', { exactAll: ['Acute Triangle', 'Isosceles Triangle'], rejectExact: ['Equilateral Triangle'] }, {
        guideDefinitions: [ISOSCELES_TRIANGLE_GUIDE],
        shortHelp: 'Make 2 equal sides and keep all 3 angles smaller than 90°.',
        helperBadges: ['Plot 3 points', 'Acute + 2 equal sides']
    }),
    turnRightToAcute: () => moveTask('turn-right-to-acute', 'Move points so this right triangle becomes an acute triangle.', { exact: 'Acute Triangle' }, {
        starterDefinitions: [def('right-triangle')],
        guideShape: 'acute-triangle',
        shortHelp: 'Remove the square corner so all 3 angles are smaller than 90°.'
    }),
    turnAcuteToObtuse: () => moveTask('turn-acute-to-obtuse', 'Move points so this acute triangle becomes an obtuse triangle.', { exact: 'Obtuse Triangle' }, {
        starterDefinitions: [def('acute-triangle')],
        guideShape: 'obtuse-triangle',
        shortHelp: 'Open one angle wider than 90°.'
    }),
    turnObtuseToRight: () => moveTask('turn-obtuse-to-right', 'Move points so this obtuse triangle becomes a right triangle.', { exact: 'Right Triangle' }, {
        starterDefinitions: [def('obtuse-triangle')],
        guideShape: 'right-triangle',
        shortHelp: 'Close the wide angle until one corner becomes a square corner.'
    }),
    turnAcuteToRight: () => moveTask('turn-acute-to-right', 'Move points so this acute triangle becomes a right triangle.', { exact: 'Right Triangle' }, {
        starterDefinitions: [def('acute-triangle')],
        guideShape: 'right-triangle',
        shortHelp: 'Make exactly one square corner.'
    }),
    fixScaleneTriangle: () => moveTask('fix-scalene-triangle', 'Move points so this triangle becomes scalene.', { exact: 'Scalene Triangle' }, {
        starterDefinitions: [def('triangle')],
        guideDefinitions: [SCALENE_TRIANGLE_GUIDE],
        shortHelp: 'All 3 side lengths should end up different.'
    }),
    plotIsoscelesRightTriangle: () => plotTask('plot-isosceles-right-triangle', 'Plot 3 points to draw an isosceles right triangle.', { exactAll: ['Right Triangle', 'Isosceles Triangle'] }, {
        guideDefinitions: [ISOSCELES_RIGHT_TRIANGLE_GUIDE],
        shortHelp: 'Make one square corner and 2 equal sides.',
        helperBadges: ['Plot 3 points', 'Right angle + 2 equal sides']
    }),
    plotObtuseScaleneTriangle: () => plotTask('plot-obtuse-scalene-triangle', 'Plot 3 points to draw an obtuse scalene triangle.', { exactAll: ['Obtuse Triangle', 'Scalene Triangle'] }, {
        guideDefinitions: [OBTUSE_SCALENE_TRIANGLE_GUIDE],
        shortHelp: 'Make one wide angle and keep all 3 side lengths different.',
        helperBadges: ['Plot 3 points', 'Obtuse + all sides different']
    }),

    plotParallelogram: () => plotTask('plot-parallelogram', 'Plot 4 points to draw a parallelogram.', { primary: 'Parallelogram' }, {
        guideShape: 'parallelogram',
        helperBadges: ['Plot 4 points', '2 opposite side pairs stay parallel']
    }),
    plotTrapezoid: () => plotTask('plot-trapezoid', 'Plot 4 points to draw a trapezoid.', { exactAny: ['Trapezoid', 'Isosceles Trapezoid'] }, {
        guideShape: 'trapezoid',
        helperBadges: ['Plot 4 points', 'Only 1 side pair stays parallel']
    }),
    plotRhombus: () => plotTask('plot-rhombus', 'Plot 4 points to draw a rhombus.', { primary: 'Rhombus' }, {
        guideDefinitions: [RHOMBUS_GUIDE],
        helperBadges: ['Plot 4 points', '4 equal sides']
    }),
    fixParallelogram: () => moveTask('fix-parallelogram', 'Fix this so it becomes a parallelogram.', { primary: 'Parallelogram', rejectPrimary: ['Square', 'Rectangle'] }, {
        fix: true,
        starterDefinitions: [custom([{ x: -72, y: -48 }, { x: 48, y: -48 }, { x: 96, y: 48 }, { x: -48, y: 24 }], { name: 'Starter', color: palette.parallelogram })],
        guideShape: 'parallelogram',
        shortHelp: 'Make both opposite side pairs stay parallel.'
    }),
    fixTrapezoid: () => moveTask('fix-trapezoid', 'Fix this so it becomes a trapezoid.', { exactAny: ['Trapezoid', 'Isosceles Trapezoid'] }, {
        fix: true,
        starterDefinitions: [def('rectangle')],
        guideShape: 'trapezoid',
        shortHelp: 'Keep only one pair of opposite sides parallel.'
    }),
    fixRhombus: () => moveTask('fix-rhombus', 'Fix this so it becomes a rhombus.', { primary: 'Rhombus' }, {
        fix: true,
        starterDefinitions: [custom([{ x: 0, y: -72 }, { x: 60, y: -12 }, { x: 0, y: 72 }, { x: -48, y: 12 }], { name: 'Starter', color: palette.rhombus })],
        guideDefinitions: [RHOMBUS_GUIDE],
        shortHelp: 'Make all 4 sides the same length.'
    }),
    makeRectangleNotSquare: () => plotTask('make-rectangle-not-square', 'Plot 4 points to make a rectangle, not a square.', { primary: 'Rectangle' }, {
        guideShape: 'rectangle',
        shortHelp: 'Keep 4 square corners, but do not make all 4 sides equal.',
        helperBadges: ['Plot 4 points', 'Rectangle, not square']
    }),
    makeParallelogramNotRectangle: () => plotTask('make-parallelogram-not-rectangle', 'Plot 4 points to make a parallelogram, not a rectangle.', { primary: 'Parallelogram' }, {
        guideShape: 'parallelogram',
        shortHelp: 'Both opposite side pairs stay parallel, but no full set of square corners.',
        helperBadges: ['Plot 4 points', 'Parallelogram, not rectangle']
    }),
    makeRhombusNotSquare: () => plotTask('make-rhombus-not-square', 'Plot 4 points to make a rhombus, not a square.', { primary: 'Rhombus' }, {
        guideDefinitions: [RHOMBUS_GUIDE],
        shortHelp: 'All 4 sides should match, but do not make all 4 right corners.',
        helperBadges: ['Plot 4 points', 'Rhombus, not square']
    }),
    makeIsoscelesTrap: () => plotTask('make-isosceles-trap', 'Plot 4 points to make an isosceles trapezoid.', { exact: 'Isosceles Trapezoid' }, {
        guideDefinitions: [ISOSCELES_TRAPEZOID_GUIDE],
        shortHelp: 'Keep one pair of opposite sides parallel and make the legs match.',
        helperBadges: ['Plot 4 points', '1 parallel pair + matching legs']
    }),
    makeKite: () => plotTask('make-kite', 'Plot 4 points to make a kite.', { exact: 'Kite' }, {
        guideDefinitions: [KITE_GUIDE],
        shortHelp: 'Make 2 matching side pairs that meet at the corners.',
        helperBadges: ['Plot 4 points', '2 adjacent side pairs match']
    }),
    squareToRhombus: () => moveTask('square-to-rhombus', 'Move points so this square becomes a rhombus, not a square.', { primary: 'Rhombus' }, {
        starterDefinitions: [def('square')],
        guideDefinitions: [RHOMBUS_GUIDE],
        shortHelp: 'Keep all 4 sides equal, but lose the full set of right corners.'
    }),
    trapezoidToIsoscelesTrap: () => moveTask('trapezoid-to-isosceles-trap', 'Move points so this trapezoid becomes an isosceles trapezoid.', { exact: 'Isosceles Trapezoid' }, {
        starterDefinitions: [def('trapezoid')],
        guideDefinitions: [ISOSCELES_TRAPEZOID_GUIDE],
        shortHelp: 'Keep the parallel side pair and make the legs match.'
    }),
    parallelogramToRectangle: () => moveTask('parallelogram-to-rectangle', 'Move points so this parallelogram becomes a rectangle.', { primary: 'Rectangle' }, {
        starterDefinitions: [def('parallelogram')],
        guideShape: 'rectangle',
        shortHelp: 'Make all 4 corners square.'
    }),

    makeConvexPentagon: () => plotTask('make-convex-pentagon', 'Plot 5 points to draw a convex pentagon.', { family: 'Pentagon', requireTraits: ['Convex'], rejectTraits: ['Complex Polygon', 'Degenerate'] }, {
        guideShape: 'pentagon',
        shortHelp: 'Keep all corners pointing outward with no crossings.',
        helperBadges: ['Plot 5 points', 'Convex shape']
    }),
    makeConvexHexagon: () => plotTask('make-convex-hexagon', 'Plot 6 points to draw a convex hexagon.', { family: 'Hexagon', requireTraits: ['Convex'], rejectTraits: ['Complex Polygon', 'Degenerate'] }, {
        guideShape: 'hexagon',
        shortHelp: 'Keep all corners pointing outward with no crossings.',
        helperBadges: ['Plot 6 points', 'Convex shape']
    }),
    makeConcavePentagon: () => plotTask('make-concave-pentagon', 'Plot 5 points to draw a concave pentagon.', { family: 'Pentagon', requireTraits: ['Concave'], rejectTraits: ['Complex Polygon', 'Degenerate'] }, {
        guideDefinitions: [CONCAVE_PENTAGON_GUIDE],
        shortHelp: 'Push one corner inward so the pentagon caves in.',
        helperBadges: ['Plot 5 points', 'One corner points inward']
    }),
    makeConcaveHexagon: () => plotTask('make-concave-hexagon', 'Plot 6 points to draw a concave hexagon.', { family: 'Hexagon', requireTraits: ['Concave'], rejectTraits: ['Complex Polygon', 'Degenerate'] }, {
        guideDefinitions: [CONCAVE_HEXAGON_GUIDE],
        shortHelp: 'Push one corner inward so the hexagon caves in.',
        helperBadges: ['Plot 6 points', 'One corner points inward']
    }),
    fixRegularPentagon: () => moveTask('fix-regular-pentagon', 'Move points so this pentagon becomes a clean convex pentagon.', { family: 'Pentagon', requireTraits: ['Convex'], rejectTraits: ['Complex Polygon', 'Degenerate'] }, {
        starterDefinitions: [REGULAR_PENTAGON_STARTER],
        guideShape: 'pentagon',
        shortHelp: 'Keep 5 sides, stop crossings, and make the corners point outward.'
    }),
    fixRegularHexagon: () => moveTask('fix-regular-hexagon', 'Move points so this hexagon becomes a clean convex hexagon.', { family: 'Hexagon', requireTraits: ['Convex'], rejectTraits: ['Complex Polygon', 'Degenerate'] }, {
        starterDefinitions: [REGULAR_HEXAGON_STARTER],
        guideShape: 'hexagon',
        shortHelp: 'Keep 6 sides, stop crossings, and make the corners point outward.'
    }),
    fixRegularOctagon: () => moveTask('fix-regular-octagon', 'Move points so this octagon becomes a clean convex octagon.', { family: 'Octagon', requireTraits: ['Convex'], rejectTraits: ['Complex Polygon', 'Degenerate'] }, {
        starterDefinitions: [REGULAR_OCTAGON_STARTER],
        guideShape: 'octagon',
        shortHelp: 'Keep 8 sides, stop crossings, and make the corners point outward.'
    })
};

const missionKeys = {
    shapeStart: [
        ['shape-1', 'Count the Sides', 'Start with the basic side counts.', 'Count easy polygons.', ['countTriangle', 'countSquare', 'countPentagon']],
        ['shape-2', 'Plot the First Shapes', 'Now draw the easy polygons yourself.', 'Plot simple polygons.', ['plotTriangle', 'plotSquare', 'plotRectangle']],
        ['shape-3', 'More Sides', 'Add more corners and keep your lines clean.', 'Plot 5- and 6-sided polygons.', ['plotPentagon', 'plotHexagon', 'pickPentagon']],
        ['shape-4', 'Fix the Shape', 'Move the corner points until each polygon is right.', 'Fix basic polygons.', ['fixSquare', 'fixRectangle', 'fixPentagon']],
        ['shape-5', 'Best Name', 'Name the polygons after you build them.', 'Pick exact names.', ['pickSquare', 'pickRectangle', 'moveSquareIntoRectangle']],
        ['shape-6', 'Stretch and Snap', 'Turn one polygon into another by moving points.', 'Transform easy polygons.', ['rectangleToSquare', 'fixHexagon', 'plotHexagon']],
        ['shape-boss', 'Shape Start Boss', 'Mix drawing and fixing in one run.', 'Boss mix.', ['plotSquare', 'fixRectangle', 'plotPentagon'], true]
    ],
    triangleTrail: [
        ['triangle-1', 'Triangle Types', 'Read the angles first.', 'Name triangle kinds.', ['pickTriangleTypeRight', 'pickTriangleTypeAcute', 'pickTriangleTypeObtuse']],
        ['triangle-2', 'Plot Triangle Types', 'Draw each kind of triangle yourself.', 'Plot triangle kinds.', ['plotRightTriangle', 'plotAcuteTriangle', 'plotObtuseTriangle']],
        ['triangle-3', 'Fix the Corners', 'Move one corner and watch the angle type change.', 'Fix triangle kinds.', ['fixRightTriangle', 'fixAcuteTriangle', 'fixObtuseTriangle']],
        ['triangle-4', 'Side Clues', 'Now prove triangle names with side lengths too.', 'Plot side-based triangles.', ['plotScaleneTriangle', 'plotIsoscelesTriangle', 'plotAcuteIsoscelesTriangle']],
        ['triangle-5', 'Turn One Into Another', 'Move points to remake each triangle type.', 'Transform triangle kinds.', ['turnRightToAcute', 'turnAcuteToObtuse', 'turnObtuseToRight']],
        ['triangle-6', 'Hard Triangle Builds', 'Mix angle and side clues in the same drawing.', 'Hard triangle build.', ['plotIsoscelesRightTriangle', 'fixScaleneTriangle', 'turnAcuteToRight']],
        ['triangle-boss', 'Triangle Trail Boss', 'One more triangle proof run.', 'Boss mix.', ['plotAcuteIsoscelesTriangle', 'plotIsoscelesRightTriangle', 'turnObtuseToRight'], true]
    ],
    quadQuest: [
        ['quad-1', 'Name the Quad', 'Read the side clues and choose the best name.', 'Name quad shapes.', ['pickParallelogram', 'pickRhombus', 'pickTrapezoid']],
        ['quad-2', 'Plot the Quads', 'Draw each 4-sided polygon yourself.', 'Plot quad shapes.', ['plotParallelogram', 'plotTrapezoid', 'plotRhombus']],
        ['quad-3', 'Fix the Quads', 'Move the corner points until the quad is right.', 'Fix quad shapes.', ['fixParallelogram', 'fixTrapezoid', 'fixRhombus']],
        ['quad-4', 'Exact Quads', 'Make the more exact polygon, not just any 4-sided shape.', 'Build exact quads.', ['makeRectangleNotSquare', 'makeParallelogramNotRectangle', 'makeRhombusNotSquare']],
        ['quad-5', 'Special Quads', 'These need more than one clue at once.', 'Build special quads.', ['makeIsoscelesTrap', 'makeKite', 'rectangleToSquare']],
        ['quad-6', 'Quad Transform Lab', 'Start with one quad and move points into a new one.', 'Transform quads.', ['squareToRhombus', 'trapezoidToIsoscelesTrap', 'parallelogramToRectangle']],
        ['quad-boss', 'Quad Quest Boss', 'A final mixed quad challenge.', 'Boss mix.', ['makeIsoscelesTrap', 'makeKite', 'squareToRhombus'], true]
    ],
    measureMountain: [
        ['measure-1', 'Polygon Peaks', 'Now climb into polygons with many sides.', 'Plot 5- to 7-sided polygons.', ['plotPentagon', 'plotHexagon', 'plotHeptagon']],
        ['measure-2', 'More Corners', 'Eight sides is waiting now.', 'Plot and fix many-sided polygons.', ['plotOctagon', 'fixPentagon', 'fixHexagon']],
        ['measure-3', 'Clean the Shape', 'Keep the side count, but clean up the polygon.', 'Fix higher polygons.', ['fixHeptagon', 'fixOctagon', 'makeConvexHexagon']],
        ['measure-4', 'Concave or Convex', 'Now prove you can control which way a polygon bends.', 'Concave and convex practice.', ['makeConcavePentagon', 'makeConcaveHexagon', 'makeConvexPentagon']],
        ['measure-5', 'Clean Polygon Challenge', 'These polygons need careful point moves to stay clean and convex.', 'Fix many-sided polygons.', ['fixRegularPentagon', 'fixRegularHexagon', 'fixRegularOctagon']],
        ['measure-6', 'Many-Side Mix', 'Switch between clean, regular, and side-count ideas.', 'Mixed polygon climb.', ['plotOctagon', 'fixHeptagon', 'makeConcaveHexagon']],
        ['measure-boss', 'Polygon Peaks Boss', 'One more many-sided proof run.', 'Boss mix.', ['makeConcaveHexagon', 'fixRegularHexagon', 'fixRegularOctagon'], true]
    ],
    masterMix: [
        ['master-1', 'Exact Builder', 'Make the strongest true name each time.', 'Exact polygon mix.', ['makeRectangleNotSquare', 'makeParallelogramNotRectangle', 'makeRhombusNotSquare']],
        ['master-2', 'Angles and Sides', 'Now mix angle clues with side clues.', 'Triangle mastery mix.', ['plotIsoscelesRightTriangle', 'plotObtuseScaleneTriangle', 'turnAcuteToRight']],
        ['master-3', 'Special Polygon Lab', 'These shapes need careful point moves.', 'Special polygon mix.', ['makeIsoscelesTrap', 'makeKite', 'makeConcavePentagon']],
        ['master-4', 'Clean Repair', 'Fix the many-sided polygons until they are clean and convex.', 'Many-sided repair mix.', ['fixRegularPentagon', 'fixRegularHexagon', 'fixRegularOctagon']],
        ['master-5', 'Corner Sprint', 'Draw bigger polygons quickly and cleanly.', 'Many-side sprint.', ['plotHexagon', 'plotHeptagon', 'plotOctagon']],
        ['master-6', 'Prove It by Moving Points', 'Start with one shape and move it into another.', 'Hard transform mix.', ['squareToRhombus', 'trapezoidToIsoscelesTrap', 'turnObtuseToRight']],
        ['master-boss', 'Master Mix Boss', 'Your final polygon proof test.', 'Boss mix.', ['makeKite', 'plotIsoscelesRightTriangle', 'fixRegularHexagon'], true]
    ]
};

function makeMission([id, title, intro, short, keys, boss = false]) {
    return { id, title, intro, short, tasks: keys.map((key) => factories[key]()), boss };
}

export const WORLDS = [
    {
        id: 'shape-start',
        title: 'Shape Start',
        theme: 'Warm Up',
        copy: 'Count sides, draw your first polygons, and fix simple shapes by moving points.',
        badge: 'Shape Starter',
        missions: missionKeys.shapeStart.map(makeMission),
        taskPool: ['countTriangle', 'countSquare', 'countPentagon', 'plotTriangle', 'plotSquare', 'plotRectangle', 'plotPentagon', 'plotHexagon', 'fixSquare', 'fixRectangle', 'fixPentagon', 'moveSquareIntoRectangle', 'rectangleToSquare']
    },
    {
        id: 'triangle-trail',
        title: 'Triangle Trail',
        theme: 'Angle Path',
        copy: 'Build triangle types, fix near-misses, and prove angle-plus-side triangle names.',
        badge: 'Triangle Tracker',
        missions: missionKeys.triangleTrail.map(makeMission),
        taskPool: ['pickTriangleTypeRight', 'pickTriangleTypeAcute', 'pickTriangleTypeObtuse', 'plotRightTriangle', 'plotAcuteTriangle', 'plotObtuseTriangle', 'fixRightTriangle', 'fixAcuteTriangle', 'fixObtuseTriangle', 'plotScaleneTriangle', 'plotIsoscelesTriangle', 'plotAcuteIsoscelesTriangle', 'turnRightToAcute', 'turnAcuteToObtuse', 'turnObtuseToRight', 'turnAcuteToRight', 'plotIsoscelesRightTriangle', 'plotObtuseScaleneTriangle']
    },
    {
        id: 'quad-quest',
        title: 'Quad Quest',
        theme: 'Quad Lab',
        copy: 'Draw, fix, and transform quadrilaterals until the exact name is true.',
        badge: 'Quad Quest Hero',
        missions: missionKeys.quadQuest.map(makeMission),
        taskPool: ['pickParallelogram', 'pickRhombus', 'pickTrapezoid', 'plotParallelogram', 'plotTrapezoid', 'plotRhombus', 'fixParallelogram', 'fixTrapezoid', 'fixRhombus', 'makeRectangleNotSquare', 'makeParallelogramNotRectangle', 'makeRhombusNotSquare', 'makeIsoscelesTrap', 'makeKite', 'rectangleToSquare', 'squareToRhombus', 'trapezoidToIsoscelesTrap', 'parallelogramToRectangle']
    },
    {
        id: 'measure-mountain',
        title: 'Polygon Peaks',
        theme: 'Many Sides',
        copy: 'Climb from pentagons to octagons and prove you can control clean, concave, convex, and regular polygons.',
        badge: 'Polygon Peak Climber',
        missions: missionKeys.measureMountain.map(makeMission),
        taskPool: ['plotPentagon', 'plotHexagon', 'plotHeptagon', 'plotOctagon', 'fixPentagon', 'fixHexagon', 'fixHeptagon', 'fixOctagon', 'makeConvexPentagon', 'makeConvexHexagon', 'makeConcavePentagon', 'makeConcaveHexagon', 'fixRegularPentagon', 'fixRegularHexagon', 'fixRegularOctagon']
    },
    {
        id: 'master-mix',
        title: 'Master Mix',
        theme: 'Proof Stage',
        copy: 'Mix exact names, tricky fixes, and hard polygon builds in one final world.',
        badge: 'Polygon Pro',
        missions: missionKeys.masterMix.map(makeMission),
        taskPool: ['makeRectangleNotSquare', 'makeParallelogramNotRectangle', 'makeRhombusNotSquare', 'plotIsoscelesRightTriangle', 'plotObtuseScaleneTriangle', 'turnAcuteToRight', 'makeIsoscelesTrap', 'makeKite', 'makeConcavePentagon', 'fixRegularPentagon', 'fixRegularHexagon', 'fixRegularOctagon', 'plotHexagon', 'plotHeptagon', 'plotOctagon', 'squareToRhombus', 'trapezoidToIsoscelesTrap', 'turnObtuseToRight']
    }
];

export function getShapeChoices() {
    return shapeChoices.slice();
}

export function getWorldById(worldId) {
    return WORLDS.find((world) => world.id === worldId) || null;
}

export function getMissionById(worldId, missionId) {
    return getWorldById(worldId)?.missions.find((mission) => mission.id === missionId) || null;
}

function cloneTasks(tasks) {
    if (typeof globalThis.structuredClone === 'function') {
        return globalThis.structuredClone(tasks);
    }
    return JSON.parse(JSON.stringify(tasks));
}

export function buildMissionTasks(worldEntry, missionEntry, replay = false) {
    if (!replay) {
        return cloneTasks(missionEntry.tasks);
    }

    const sample = worldEntry.taskPool
        .map((key) => ({ key, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .slice(0, 3)
        .map((entry) => factories[entry.key]());

    return cloneTasks(sample);
}
