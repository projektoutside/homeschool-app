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
    hexagon: '#5d7cff'
};

const shapeChoices = [
    { type: 'triangle', title: 'Triangle', copy: '3 sides' },
    { type: 'square', title: 'Square', copy: '4 same sides' },
    { type: 'rectangle', title: 'Rectangle', copy: '4 corners' },
    { type: 'parallelogram', title: 'Slant Box', copy: '2 side pairs match' },
    { type: 'trapezoid', title: 'Trapezoid', copy: '1 side pair matches' },
    { type: 'pentagon', title: 'Pentagon', copy: '5 sides' },
    { type: 'hexagon', title: 'Hexagon', copy: '6 sides' },
    { type: 'rhombus', title: 'Rhombus', copy: '4 same sides' }
];

const def = (shapeType, extra = {}) => ({
    shapeType,
    color: palette[shapeType] || '#4f8cff',
    name: extra.name || shapeType,
    ...extra
});

const custom = (vertices, extra = {}) => ({
    vertices,
    color: extra.color || '#4f8cff',
    name: extra.name || 'Shape',
    ...extra
});

const pair = (left, right) => ([
    def(left.shapeType, { ...left, center: left.center || { x: -120, y: 0 }, label: 'A', locked: true }),
    def(right.shapeType, { ...right, center: right.center || { x: 120, y: 0 }, label: 'B', locked: true })
]);

function buildShapeTask(id, prompt, target, extra = {}) {
    return {
        id,
        type: extra.fix ? 'fix-shape' : 'make-shape',
        modeTitle: extra.fix ? 'Fix' : 'Make',
        answerMode: 'board',
        prompt,
        shortHelp: extra.shortHelp || 'Drag corners until it looks right.',
        boardNote: extra.boardNote || 'Move a corner or make a new shape.',
        celebrationText: extra.celebrationText || 'Nice shape!',
        hintLadder: extra.hintLadder || [
            extra.fix ? 'Look at the side lengths first.' : 'Think about sides and corners.',
            extra.fix ? 'The helper shape is on the board now.' : 'The helper outline is on the board now.',
            extra.fix ? 'Use equal sides, square corners, or parallel sides to fix it.' : 'Use the shape rules to match the helper.'
        ],
        visualNote: extra.visualNote || 'The yellow guide shows what to aim for.',
        board: {
            editable: true,
            starterDefinitions: extra.starterDefinitions || [],
            guideShape: extra.guideShape || target.shapeType || null,
            guideDefinitions: extra.guideDefinitions || []
        },
        success: {
            type: 'shape-match',
            primary: target.primary || null,
            exact: target.exact || null,
            family: target.family || null,
            rejectPrimary: target.rejectPrimary || []
        }
    };
}

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
            showLiveMetric: extra.showLiveMetric || null
        },
        options: ensureFourOptions(options, extra.fallbackOptions),
        success: { type: 'choice', answer }
    };
}

function measureTask(id, prompt, boardDefinitions, metric, extra = {}) {
    return {
        id,
        type: 'measure',
        modeTitle: 'Measure',
        answerMode: 'number',
        prompt,
        shortHelp: extra.shortHelp || `Type the ${metric}.`,
        boardNote: extra.boardNote || 'Use the grid to count carefully.',
        celebrationText: extra.celebrationText || 'You measured it!',
        placeholder: extra.placeholder || `Type the ${metric}`,
        hintLadder: extra.hintLadder || [
            metric === 'area' ? 'Count inside space.' : 'Go all the way around the outside.',
            metric === 'area' ? 'The live area clue is on the board now.' : 'The live around clue is on the board now.',
            extra.teachText || (metric === 'area' ? 'Area means inside space.' : 'Perimeter means the outside path.')
        ],
        visualNote: extra.visualNote || (metric === 'area' ? 'The board now shows a live area clue.' : 'The board now shows a live around clue.'),
        board: {
            editable: false,
            starterDefinitions: boardDefinitions,
            showLiveMetric: metric
        },
        success: { type: 'measure', metric, tolerance: extra.tolerance || 0.1 }
    };
}

function compareTask(id, prompt, boardDefinitions, answer, extra = {}) {
    return {
        id,
        type: 'compare',
        modeTitle: 'Compare',
        answerMode: 'choice',
        prompt,
        shortHelp: extra.shortHelp || 'Pick A, B, Same, or None.',
        boardNote: extra.boardNote || 'Look at both shapes.',
        celebrationText: extra.celebrationText || 'You compared them right!',
        hintLadder: extra.hintLadder || [
            'Check the sides first.',
            'The board helper is on now.',
            extra.teachText || 'Compare only what the question asks for.'
        ],
        visualNote: extra.visualNote || 'A and B labels are there to help.',
        board: { editable: false, starterDefinitions: boardDefinitions },
        options: ensureFourOptions(extra.options || ['A', 'B', 'Same'], extra.fallbackOptions || ['None']),
        success: { type: 'choice', answer }
    };
}

const factories = {
    countTriangle: () => choiceTask('count-triangle', 'How many sides does this shape have?', [def('triangle', { locked: true })], ['3', '4', '5', '6'], '3', { type: 'count-sides', modeTitle: 'Count', teachText: 'A triangle has 3 sides.' }),
    countSquare: () => choiceTask('count-square', 'How many sides does this shape have?', [def('square', { locked: true })], ['3', '4', '5', '6'], '4', { type: 'count-sides', modeTitle: 'Count', teachText: 'A square has 4 sides.' }),
    countPentagon: () => choiceTask('count-pentagon', 'How many sides does this shape have?', [def('pentagon', { locked: true })], ['4', '5', '6', '8'], '5', { type: 'count-sides', modeTitle: 'Count', teachText: 'A pentagon has 5 sides.' }),
    makeTriangle: () => buildShapeTask('make-triangle', 'Make a triangle.', { family: 'Triangle' }, { shortHelp: 'Any 3-sided shape works.', boardNote: 'Use Make Shape if the board is empty.' }),
    makeSquare: () => buildShapeTask('make-square', 'Make a square.', { primary: 'Square' }, { shortHelp: '4 same sides. 4 square corners.', hintLadder: ['Try 4 equal sides.', 'The square guide is on the board now.', 'A square has 4 equal sides and 4 right corners.'] }),
    makePentagon: () => buildShapeTask('make-pentagon', 'Make a pentagon.', { primary: 'Pentagon' }, { shortHelp: 'This one needs 5 sides.', boardNote: 'Pick Pentagon in Make Shape.' }),
    pickSquare: () => choiceTask('pick-square', 'What is the best name for this shape?', [def('square', { locked: true })], ['Square', 'Rectangle', 'Rhombus', 'Parallelogram'], 'Square', { teachText: 'Square is the most exact true name.' }),
    pickRectangle: () => choiceTask('pick-rectangle', 'What is the best name for this shape?', [def('rectangle', { locked: true })], ['Square', 'Rectangle', 'Trapezoid', 'Rhombus'], 'Rectangle', { teachText: 'A rectangle has 4 right corners.' }),
    pickPentagon: () => choiceTask('pick-pentagon', 'What is the best name for this shape?', [def('pentagon', { locked: true })], ['Pentagon', 'Hexagon', 'Square', 'Polygon'], 'Pentagon', { teachText: 'A pentagon is a 5-sided polygon.' }),
    fixSquare: () => buildShapeTask('fix-square', 'Fix this shape so it becomes a square.', { primary: 'Square' }, { fix: true, starterDefinitions: [custom([{ x: -48, y: -36 }, { x: 48, y: -24 }, { x: 60, y: 48 }, { x: -60, y: 36 }], { name: 'Starter', color: palette.square })], guideShape: 'square', shortHelp: 'Make all 4 sides the same. Make all 4 corners square.' }),
    fixRectangle: () => buildShapeTask('fix-rectangle', 'Fix this shape so it becomes a rectangle.', { primary: 'Rectangle' }, { fix: true, starterDefinitions: [custom([{ x: -72, y: -48 }, { x: 72, y: -48 }, { x: 96, y: 48 }, { x: -48, y: 48 }], { name: 'Starter', color: palette.rectangle })], guideShape: 'rectangle', shortHelp: 'Make 4 square corners. Opposite sides should match.' }),
    compareMoreSides: () => compareTask('compare-more-sides', 'Which shape has more sides?', pair({ shapeType: 'triangle' }, { shapeType: 'pentagon' }), 'B', { teachText: 'A pentagon has more sides than a triangle.' }),
    compareBiggerArea: () => compareTask('compare-bigger-area', 'Which shape has more inside space?', pair({ shapeType: 'square', scale: 1 }, { shapeType: 'square', scale: 1.35 }), 'B', { teachText: 'More area means more inside space.' }),
    squareArea: () => measureTask('square-area', 'What is the area of this square?', [def('square', { locked: true })], 'area', { shortHelp: 'Count inside squares.', placeholder: 'Type area' }),
    squareAround: () => measureTask('square-around', 'What is the perimeter of this square?', [def('square', { locked: true })], 'perimeter', { shortHelp: 'Add all 4 sides around the square.', placeholder: 'Type perimeter' }),
    rectangleArea: () => measureTask('rectangle-area', 'What is the area of this rectangle?', [def('rectangle', { locked: true })], 'area', { shortHelp: 'Area means the inside space.', placeholder: 'Type area' }),
    rectangleAround: () => measureTask('rectangle-around', 'What is the perimeter of this rectangle?', [def('rectangle', { locked: true })], 'perimeter', { shortHelp: 'Go all the way around.', placeholder: 'Type perimeter' }),
    pickTriangleTypeRight: () => choiceTask('pick-triangle-right', 'What kind of triangle is this?', [def('right-triangle', { locked: true })], ['Acute Triangle', 'Right Triangle', 'Obtuse Triangle', 'Scalene Triangle'], 'Right Triangle', { teachText: 'A right triangle has one square corner.' }),
    pickTriangleTypeAcute: () => choiceTask('pick-triangle-acute', 'What kind of triangle is this?', [def('acute-triangle', { locked: true })], ['Acute Triangle', 'Right Triangle', 'Obtuse Triangle', 'Scalene Triangle'], 'Acute Triangle', { teachText: 'An acute triangle has all angles smaller than a right angle.' }),
    pickTriangleTypeObtuse: () => choiceTask('pick-triangle-obtuse', 'What kind of triangle is this?', [def('obtuse-triangle', { locked: true })], ['Acute Triangle', 'Right Triangle', 'Obtuse Triangle', 'Isosceles Triangle'], 'Obtuse Triangle', { teachText: 'An obtuse triangle has one angle bigger than a right angle.' }),
    makeRightTriangle: () => buildShapeTask('make-right-triangle', 'Make a right triangle.', { exact: 'Right Triangle', family: 'Triangle' }, { shortHelp: 'Make one square corner.', guideShape: 'right-triangle' }),
    makeAcuteTriangle: () => buildShapeTask('make-acute-triangle', 'Make an acute triangle.', { exact: 'Acute Triangle', family: 'Triangle' }, { shortHelp: 'All corners must stay smaller than a right corner.', guideShape: 'acute-triangle' }),
    makeObtuseTriangle: () => buildShapeTask('make-obtuse-triangle', 'Make an obtuse triangle.', { exact: 'Obtuse Triangle', family: 'Triangle' }, { shortHelp: 'One corner should open wider than a right corner.', guideShape: 'obtuse-triangle' }),
    fixObtuseTriangle: () => buildShapeTask('fix-obtuse-triangle', 'Fix this so it becomes an obtuse triangle.', { exact: 'Obtuse Triangle', family: 'Triangle' }, { fix: true, starterDefinitions: [def('triangle')], guideShape: 'obtuse-triangle', shortHelp: 'One angle needs to open wide.' }),
    fixRightTriangle: () => buildShapeTask('fix-right-triangle', 'Fix this so it becomes a right triangle.', { exact: 'Right Triangle', family: 'Triangle' }, { fix: true, starterDefinitions: [custom([{ x: -72, y: 48 }, { x: 72, y: 48 }, { x: 48, y: -48 }], { name: 'Starter', color: palette['right-triangle'] })], guideShape: 'right-triangle', shortHelp: 'Move one corner until you make a square corner.' }),
    fixAcuteTriangle: () => buildShapeTask('fix-acute-triangle', 'Fix this so it becomes an acute triangle.', { exact: 'Acute Triangle', family: 'Triangle' }, { fix: true, starterDefinitions: [custom([{ x: -72, y: 48 }, { x: 72, y: 48 }, { x: 0, y: 0 }], { name: 'Starter', color: palette['acute-triangle'] })], guideShape: 'acute-triangle', shortHelp: 'All 3 angles should end up smaller than a right angle.' }),
    triangleArea: () => measureTask('triangle-area', 'What is the area of this right triangle?', [def('right-triangle', { locked: true })], 'area', { shortHelp: 'Half of base times height.', placeholder: 'Type area' }),
    triangleAround: () => measureTask('triangle-around', 'What is the perimeter of this right triangle?', [def('right-triangle', { locked: true })], 'perimeter', { shortHelp: 'Add all 3 sides.', placeholder: 'Type perimeter' }),
    acuteTriangleArea: () => measureTask('acute-triangle-area', 'What is the area of this acute triangle?', [def('acute-triangle', { locked: true })], 'area', { shortHelp: 'Count the inside space in square units.', placeholder: 'Type area' }),
    acuteTriangleAround: () => measureTask('acute-triangle-around', 'What is the perimeter of this acute triangle?', [def('acute-triangle', { locked: true })], 'perimeter', { shortHelp: 'Add all 3 side lengths.', placeholder: 'Type perimeter' }),
    compareTriangleType: () => compareTask('compare-triangle-type', 'Which triangle has the bigger angle?', pair({ shapeType: 'acute-triangle' }, { shapeType: 'obtuse-triangle' }), 'B', { teachText: 'An obtuse triangle has the bigger angle.' }),
    compareTriangleArea: () => compareTask('compare-triangle-area', 'Which triangle has more inside space?', pair({ shapeType: 'acute-triangle', scale: 0.85 }, { shapeType: 'right-triangle', scale: 1.2 }), 'B', { teachText: 'Compare the inside space, not just the side count.' }),
    compareTriangleAround: () => compareTask('compare-triangle-around', 'Which triangle has the longer outside path?', pair({ shapeType: 'acute-triangle', scale: 0.85 }, { shapeType: 'right-triangle', scale: 1.2 }), 'B', { teachText: 'A longer perimeter means a longer outside path.' }),
    pickParallelogram: () => choiceTask('pick-parallelogram', 'What is the best name for this shape?', [def('parallelogram', { locked: true })], ['Parallelogram', 'Rectangle', 'Trapezoid', 'Kite'], 'Parallelogram', { teachText: 'A parallelogram has 2 opposite side pairs that stay parallel.' }),
    pickRhombus: () => choiceTask('pick-rhombus', 'What is the best name for this shape?', [def('rhombus', { locked: true })], ['Rhombus', 'Square', 'Trapezoid', 'Rectangle'], 'Rhombus', { teachText: 'A rhombus has 4 equal sides.' }),
    pickTrapezoid: () => choiceTask('pick-trapezoid', 'What is the best name for this shape?', [def('trapezoid', { locked: true })], ['Trapezoid', 'Parallelogram', 'Rectangle', 'Rhombus'], 'Trapezoid', { teachText: 'A trapezoid has one matching pair of opposite sides here.' }),
    makeParallelogram: () => buildShapeTask('make-parallelogram', 'Make a slant box.', { primary: 'Parallelogram', rejectPrimary: ['Square', 'Rectangle'] }, { shortHelp: 'Make both opposite side pairs stay parallel.', guideShape: 'parallelogram' }),
    makeTrapezoid: () => buildShapeTask('make-trapezoid', 'Make a trapezoid.', { exact: 'Trapezoid', family: 'Quadrilateral' }, { shortHelp: 'Make one pair of opposite sides stay parallel.', boardNote: 'Pick Trapezoid in Make Shape.', guideShape: 'trapezoid' }),
    fixTrapezoid: () => buildShapeTask('fix-trapezoid', 'Fix this so it becomes a trapezoid.', { primary: 'Trapezoid' }, { fix: true, starterDefinitions: [def('rectangle')], guideShape: 'trapezoid', shortHelp: 'Keep only one pair of opposite sides parallel.' }),
    makeRhombus: () => buildShapeTask('make-rhombus', 'Make a rhombus, not a square.', { primary: 'Rhombus', rejectPrimary: ['Square'] }, { shortHelp: 'All 4 sides the same. Corners should not all be square.', guideShape: 'rhombus' }),
    fixParallelogram: () => buildShapeTask('fix-parallelogram', 'Fix this so it becomes a slant box.', { primary: 'Parallelogram', rejectPrimary: ['Square', 'Rectangle'] }, { fix: true, starterDefinitions: [custom([{ x: -72, y: -48 }, { x: 48, y: -48 }, { x: 96, y: 48 }, { x: -48, y: 24 }], { name: 'Starter', color: palette.parallelogram })], guideShape: 'parallelogram', shortHelp: 'Make both opposite side pairs stay parallel.' }),
    fixRhombus: () => buildShapeTask('fix-rhombus', 'Fix this so it becomes a rhombus.', { primary: 'Rhombus' }, { fix: true, starterDefinitions: [custom([{ x: 0, y: -72 }, { x: 48, y: -24 }, { x: 24, y: 72 }, { x: -48, y: 24 }], { name: 'Starter', color: palette.rhombus })], guideShape: 'rhombus', shortHelp: 'Make all 4 sides the same length.' }),
    moreExactSquare: () => choiceTask('more-exact-square', 'Which name is more exact?', [def('square', { locked: true })], ['Square', 'Rectangle', 'Quadrilateral', 'Polygon'], 'Square', { type: 'more-exact', teachText: 'The more exact true name tells the most.' }),
    moreExactRhombus: () => choiceTask('more-exact-rhombus', 'Which name is more exact?', [def('rhombus', { locked: true })], ['Rhombus', 'Quadrilateral', 'Polygon', 'Rectangle'], 'Rhombus', { type: 'more-exact', teachText: 'Pick the strongest true name.' }),
    parallelogramArea: () => measureTask('parallelogram-area', 'What is the area of this slant box?', [def('parallelogram', { locked: true })], 'area', { shortHelp: 'Base times height.', placeholder: 'Type area' }),
    rhombusArea: () => measureTask('rhombus-area', 'What is the area of this rhombus?', [def('rhombus', { locked: true })], 'area', { shortHelp: 'Use the inside space or diagonals.', placeholder: 'Type area' }),
    compareAround: () => compareTask('compare-around', 'Which shape has a longer outside path?', pair({ shapeType: 'square', scale: 1 }, { shapeType: 'rectangle', scale: 1.2 }), 'B', { teachText: 'Longer perimeter means a longer outside path.' }),
    compareSameSides: () => compareTask('compare-same-sides', 'Do these shapes have the same number of sides?', pair({ shapeType: 'square' }, { shapeType: 'rectangle' }), 'Same', { teachText: 'Both have 4 sides.' }),
    compareQuadArea: () => compareTask('compare-quad-area', 'Which box shape has more inside space?', pair({ shapeType: 'parallelogram', scale: 0.9 }, { shapeType: 'trapezoid', scale: 1.2 }), 'B', { teachText: 'Compare the inside space, not just the side names.' }),
    pickIsoscelesTrap: () => choiceTask('pick-isosceles-trap', 'What is the best name for this shape?', [custom([{ x: -72, y: 42 }, { x: 72, y: 42 }, { x: 42, y: -42 }, { x: -42, y: -42 }], { locked: true, color: palette.trapezoid, name: 'Isosceles Trapezoid' })], ['Isosceles Trapezoid', 'Trapezoid', 'Parallelogram', 'Kite'], 'Isosceles Trapezoid', { teachText: 'This trapezoid has matching legs, so it has a more exact name.' })
};

const missionKeys = {
    shapeStart: [
        ['shape-1', 'Count the Sides', 'Let’s start with side counting.', 'Count easy shapes.', ['countTriangle', 'countSquare', 'countPentagon']],
        ['shape-2', 'Make New Shapes', 'Use Make Shape and the board.', 'Build easy shapes.', ['makeTriangle', 'makeSquare', 'makePentagon']],
        ['shape-3', 'Pick the Name', 'Read the board and pick the best name.', 'Name easy shapes.', ['pickSquare', 'pickRectangle', 'pickPentagon']],
        ['shape-4', 'Fix the Shape', 'A few shapes need your help.', 'Fix easy shapes.', ['fixSquare', 'fixRectangle', 'fixRightTriangle']],
        ['shape-5', 'Big or Small', 'Now compare two shapes.', 'Compare simple shapes.', ['compareMoreSides', 'compareBiggerArea', 'compareSameSides']],
        ['shape-6', 'Measure It', 'Count inside space and outside path.', 'Measure simple shapes.', ['squareArea', 'squareAround', 'rectangleArea']],
        ['shape-boss', 'Shape Start Boss', 'Mix everything you learned.', 'Boss mix.', ['makeSquare', 'moreExactSquare', 'countPentagon'], true]
    ],
    triangleTrail: [
        ['triangle-1', 'Triangle Types', 'Look at the angles.', 'Name triangle kinds.', ['pickTriangleTypeRight', 'pickTriangleTypeAcute', 'pickTriangleTypeObtuse']],
        ['triangle-2', 'Make Triangle Kinds', 'Build triangle kinds on the board.', 'Make triangle kinds.', ['makeRightTriangle', 'makeAcuteTriangle', 'makeObtuseTriangle']],
        ['triangle-3', 'Fix the Corners', 'These starters need new corners.', 'Fix triangle kinds.', ['fixObtuseTriangle', 'fixRightTriangle', 'fixAcuteTriangle']],
        ['triangle-4', 'Count and Name', 'Mix side counting and triangle naming.', 'Mix triangle facts.', ['countTriangle', 'pickTriangleTypeRight', 'pickTriangleTypeObtuse']],
        ['triangle-5', 'Measure Triangles', 'Use triangle rules now.', 'Measure triangles.', ['triangleArea', 'triangleAround', 'acuteTriangleAround']],
        ['triangle-6', 'Compare Triangles', 'Which triangle changes the most?', 'Compare triangle facts.', ['compareTriangleType', 'compareTriangleArea', 'compareTriangleAround']],
        ['triangle-boss', 'Triangle Trail Boss', 'One more mixed round.', 'Boss mix.', ['makeRightTriangle', 'pickTriangleTypeObtuse', 'triangleArea'], true]
    ],
    quadQuest: [
        ['quad-1', 'Name the Box', 'Read the shape clues and choose the best name.', 'Name box shapes.', ['pickParallelogram', 'pickRhombus', 'pickTrapezoid']],
        ['quad-2', 'Make a Slant Box', 'Use the board to build quad shapes.', 'Make quad shapes.', ['makeParallelogram', 'makeTrapezoid', 'makeRhombus']],
        ['quad-3', 'More Exact', 'Pick the strongest true name.', 'Choose exact names.', ['moreExactSquare', 'moreExactRhombus', 'pickParallelogram']],
        ['quad-4', 'Fix the Box', 'Some box shapes need one more move.', 'Fix quad shapes.', ['fixTrapezoid', 'fixParallelogram', 'fixRhombus']],
        ['quad-5', 'Measure the Box', 'Find inside space and outside path.', 'Measure quad shapes.', ['rectangleAround', 'parallelogramArea', 'rhombusArea']],
        ['quad-6', 'Compare the Box', 'Use sides and size to compare.', 'Compare quad shapes.', ['compareAround', 'compareSameSides', 'compareQuadArea']],
        ['quad-boss', 'Quad Quest Boss', 'A mixed box challenge.', 'Boss mix.', ['makeRhombus', 'moreExactSquare', 'parallelogramArea'], true]
    ],
    measureMountain: [
        ['measure-1', 'Inside Space', 'Area tells how much space is inside.', 'Area tasks.', ['squareArea', 'triangleArea', 'parallelogramArea']],
        ['measure-2', 'Outside Path', 'Perimeter goes all the way around.', 'Perimeter tasks.', ['rectangleAround', 'triangleAround', 'compareAround']],
        ['measure-3', 'Area Mix', 'Switch between different area rules.', 'Mixed area.', ['squareArea', 'rhombusArea', 'compareBiggerArea']],
        ['measure-4', 'Perimeter Mix', 'Switch between different perimeter checks.', 'Mixed perimeter.', ['rectangleAround', 'triangleAround', 'compareAround']],
        ['measure-5', 'Compare the Size', 'Pick the bigger one.', 'Compare size.', ['compareBiggerArea', 'compareAround', 'compareMoreSides']],
        ['measure-6', 'Fast Number Mix', 'Use the right rule fast.', 'Fast mixed measure.', ['squareArea', 'rectangleAround', 'rhombusArea']],
        ['measure-boss', 'Measure Mountain Boss', 'One more number climb.', 'Boss mix.', ['triangleArea', 'compareAround', 'rhombusArea'], true]
    ],
    masterMix: [
        ['master-1', 'Best Name Wins', 'Choose the most exact true name.', 'Exact name mix.', ['moreExactSquare', 'moreExactRhombus', 'pickIsoscelesTrap']],
        ['master-2', 'Shape Builder', 'Make the strongest match you can.', 'Build mix.', ['makeParallelogram', 'makeRhombus', 'makeRightTriangle']],
        ['master-3', 'Shape Doctor', 'Fix shapes that are close but not right yet.', 'Fix mix.', ['fixSquare', 'fixTrapezoid', 'fixObtuseTriangle']],
        ['master-4', 'Measure and Compare', 'Use math and shape reading together.', 'Measure mix.', ['rhombusArea', 'compareBiggerArea', 'compareAround']],
        ['master-5', 'Quick Brain', 'Switch tasks fast.', 'Fast mix.', ['countPentagon', 'pickParallelogram', 'squareArea']],
        ['master-6', 'Boss Practice', 'One last warm-up.', 'Practice mix.', ['triangleAround', 'pickTriangleTypeRight', 'makeSquare']],
        ['master-boss', 'Master Mix Boss', 'Your final star test.', 'Boss mix.', ['makeRhombus', 'pickIsoscelesTrap', 'rhombusArea'], true]
    ]
};

function makeMission([id, title, intro, short, keys, boss = false]) {
    return { id, title, intro, short, tasks: keys.map((key) => factories[key]()), boss };
}

export const WORLDS = [
    { id: 'shape-start', title: 'Shape Start', theme: 'Warm Up', copy: 'Meet shapes, count sides, and win your first stars.', badge: 'Shape Starter', missions: missionKeys.shapeStart.map(makeMission), taskPool: ['countTriangle', 'countSquare', 'countPentagon', 'makeTriangle', 'makeSquare', 'makePentagon', 'pickSquare', 'pickRectangle', 'pickPentagon', 'fixSquare', 'fixRectangle', 'squareArea', 'squareAround', 'rectangleArea'] },
    { id: 'triangle-trail', title: 'Triangle Trail', theme: 'Angle Path', copy: 'Learn triangle kinds by fixing and making them.', badge: 'Triangle Tracker', missions: missionKeys.triangleTrail.map(makeMission), taskPool: ['pickTriangleTypeRight', 'pickTriangleTypeAcute', 'pickTriangleTypeObtuse', 'makeRightTriangle', 'makeAcuteTriangle', 'makeObtuseTriangle', 'fixObtuseTriangle', 'fixRightTriangle', 'fixAcuteTriangle', 'triangleArea', 'triangleAround', 'acuteTriangleArea', 'acuteTriangleAround', 'compareTriangleType'] },
    { id: 'quad-quest', title: 'Quad Quest', theme: 'Box Trail', copy: 'Meet slant boxes, rhombi, and trapezoids.', badge: 'Quad Quest Hero', missions: missionKeys.quadQuest.map(makeMission), taskPool: ['pickParallelogram', 'pickRhombus', 'pickTrapezoid', 'makeParallelogram', 'makeTrapezoid', 'makeRhombus', 'fixTrapezoid', 'fixParallelogram', 'fixRhombus', 'moreExactSquare', 'moreExactRhombus', 'parallelogramArea', 'rhombusArea', 'compareQuadArea'] },
    { id: 'measure-mountain', title: 'Measure Mountain', theme: 'Number Climb', copy: 'Use area and perimeter all the way up the mountain.', badge: 'Measure Master', missions: missionKeys.measureMountain.map(makeMission), taskPool: ['squareArea', 'rectangleAround', 'triangleArea', 'triangleAround', 'parallelogramArea', 'rhombusArea', 'compareBiggerArea', 'compareAround'] },
    { id: 'master-mix', title: 'Master Mix', theme: 'Star Stage', copy: 'Mix all of your best shape moves in one world.', badge: 'Polygon Pro', missions: missionKeys.masterMix.map(makeMission), taskPool: ['moreExactSquare', 'moreExactRhombus', 'pickIsoscelesTrap', 'makeParallelogram', 'makeRhombus', 'makeRightTriangle', 'rhombusArea', 'compareAround', 'compareBiggerArea'] }
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
