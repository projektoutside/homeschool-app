(() => {
  // public/Games/Quiz it Polygon!/js/data/mission-data.js
  var palette = {
    triangle: "#4f8cff",
    "right-triangle": "#4f8cff",
    "acute-triangle": "#4f8cff",
    "obtuse-triangle": "#4f8cff",
    square: "#ffb03a",
    rectangle: "#ff8a5b",
    parallelogram: "#27b07d",
    rhombus: "#8c63ff",
    trapezoid: "#ff6d8f",
    pentagon: "#00a5a7",
    hexagon: "#5d7cff"
  };
  var shapeChoices = [
    { type: "triangle", title: "Triangle", copy: "3 sides" },
    { type: "square", title: "Square", copy: "4 same sides" },
    { type: "rectangle", title: "Rectangle", copy: "4 corners" },
    { type: "parallelogram", title: "Slant Box", copy: "2 side pairs match" },
    { type: "trapezoid", title: "Trapezoid", copy: "1 side pair matches" },
    { type: "pentagon", title: "Pentagon", copy: "5 sides" },
    { type: "hexagon", title: "Hexagon", copy: "6 sides" },
    { type: "rhombus", title: "Rhombus", copy: "4 same sides" }
  ];
  var def = (shapeType, extra = {}) => ({
    shapeType,
    color: palette[shapeType] || "#4f8cff",
    name: extra.name || shapeType,
    ...extra
  });
  var custom = (vertices, extra = {}) => ({
    vertices,
    color: extra.color || "#4f8cff",
    name: extra.name || "Shape",
    ...extra
  });
  var pair = (left, right) => [
    def(left.shapeType, { ...left, center: left.center || { x: -120, y: 0 }, label: "A", locked: true }),
    def(right.shapeType, { ...right, center: right.center || { x: 120, y: 0 }, label: "B", locked: true })
  ];
  function buildShapeTask(id, prompt, target, extra = {}) {
    return {
      id,
      type: extra.fix ? "fix-shape" : "make-shape",
      modeTitle: extra.fix ? "Fix" : "Make",
      answerMode: "board",
      prompt,
      shortHelp: extra.shortHelp || "Drag corners until it looks right.",
      boardNote: extra.boardNote || "Move a corner or make a new shape.",
      celebrationText: extra.celebrationText || "Nice shape!",
      hintLadder: extra.hintLadder || [
        extra.fix ? "Look at the side lengths first." : "Think about sides and corners.",
        extra.fix ? "The helper shape is on the board now." : "The helper outline is on the board now.",
        extra.fix ? "Use equal sides, square corners, or parallel sides to fix it." : "Use the shape rules to match the helper."
      ],
      visualNote: extra.visualNote || "The yellow guide shows what to aim for.",
      board: {
        editable: true,
        starterDefinitions: extra.starterDefinitions || [],
        guideShape: extra.guideShape || target.shapeType || null,
        guideDefinitions: extra.guideDefinitions || []
      },
      success: {
        type: "shape-match",
        primary: target.primary || null,
        exact: target.exact || null,
        family: target.family || null,
        rejectPrimary: target.rejectPrimary || []
      }
    };
  }
  function ensureFourOptions(options = [], fallbackOptions = []) {
    const next = [];
    const seen = /* @__PURE__ */ new Set();
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
      type: extra.type || "pick-name",
      modeTitle: extra.modeTitle || "Pick",
      answerMode: "choice",
      prompt,
      shortHelp: extra.shortHelp || "Tap the best answer.",
      boardNote: extra.boardNote || "Study the shape on the board.",
      celebrationText: extra.celebrationText || "You picked the best answer!",
      hintLadder: extra.hintLadder || [
        "Look at the sides and corners.",
        "The board now shows a helper clue.",
        extra.teachText || "Pick the most exact true name."
      ],
      visualNote: extra.visualNote || "Use the clue on the board to help.",
      board: {
        editable: false,
        starterDefinitions: boardDefinitions,
        showLiveMetric: extra.showLiveMetric || null
      },
      options: ensureFourOptions(options, extra.fallbackOptions),
      success: { type: "choice", answer }
    };
  }
  function measureTask(id, prompt, boardDefinitions, metric, extra = {}) {
    return {
      id,
      type: "measure",
      modeTitle: "Measure",
      answerMode: "number",
      prompt,
      shortHelp: extra.shortHelp || `Type the ${metric}.`,
      boardNote: extra.boardNote || "Use the grid to count carefully.",
      celebrationText: extra.celebrationText || "You measured it!",
      placeholder: extra.placeholder || `Type the ${metric}`,
      hintLadder: extra.hintLadder || [
        metric === "area" ? "Count inside space." : "Go all the way around the outside.",
        metric === "area" ? "The live area clue is on the board now." : "The live around clue is on the board now.",
        extra.teachText || (metric === "area" ? "Area means inside space." : "Perimeter means the outside path.")
      ],
      visualNote: extra.visualNote || (metric === "area" ? "The board now shows a live area clue." : "The board now shows a live around clue."),
      board: {
        editable: false,
        starterDefinitions: boardDefinitions,
        showLiveMetric: metric
      },
      success: { type: "measure", metric, tolerance: extra.tolerance || 0.1 }
    };
  }
  function compareTask(id, prompt, boardDefinitions, answer, extra = {}) {
    return {
      id,
      type: "compare",
      modeTitle: "Compare",
      answerMode: "choice",
      prompt,
      shortHelp: extra.shortHelp || "Pick A, B, Same, or None.",
      boardNote: extra.boardNote || "Look at both shapes.",
      celebrationText: extra.celebrationText || "You compared them right!",
      hintLadder: extra.hintLadder || [
        "Check the sides first.",
        "The board helper is on now.",
        extra.teachText || "Compare only what the question asks for."
      ],
      visualNote: extra.visualNote || "A and B labels are there to help.",
      board: { editable: false, starterDefinitions: boardDefinitions },
      options: ensureFourOptions(extra.options || ["A", "B", "Same"], extra.fallbackOptions || ["None"]),
      success: { type: "choice", answer }
    };
  }
  var factories = {
    countTriangle: () => choiceTask("count-triangle", "How many sides does this shape have?", [def("triangle", { locked: true })], ["3", "4", "5", "6"], "3", { type: "count-sides", modeTitle: "Count", teachText: "A triangle has 3 sides." }),
    countSquare: () => choiceTask("count-square", "How many sides does this shape have?", [def("square", { locked: true })], ["3", "4", "5", "6"], "4", { type: "count-sides", modeTitle: "Count", teachText: "A square has 4 sides." }),
    countPentagon: () => choiceTask("count-pentagon", "How many sides does this shape have?", [def("pentagon", { locked: true })], ["4", "5", "6", "8"], "5", { type: "count-sides", modeTitle: "Count", teachText: "A pentagon has 5 sides." }),
    makeTriangle: () => buildShapeTask("make-triangle", "Make a triangle.", { family: "Triangle" }, { shortHelp: "Any 3-sided shape works.", boardNote: "Use Make Shape if the board is empty." }),
    makeSquare: () => buildShapeTask("make-square", "Make a square.", { primary: "Square" }, { shortHelp: "4 same sides. 4 square corners.", hintLadder: ["Try 4 equal sides.", "The square guide is on the board now.", "A square has 4 equal sides and 4 right corners."] }),
    makePentagon: () => buildShapeTask("make-pentagon", "Make a pentagon.", { primary: "Pentagon" }, { shortHelp: "This one needs 5 sides.", boardNote: "Pick Pentagon in Make Shape." }),
    pickSquare: () => choiceTask("pick-square", "What is the best name for this shape?", [def("square", { locked: true })], ["Square", "Rectangle", "Rhombus", "Parallelogram"], "Square", { teachText: "Square is the most exact true name." }),
    pickRectangle: () => choiceTask("pick-rectangle", "What is the best name for this shape?", [def("rectangle", { locked: true })], ["Square", "Rectangle", "Trapezoid", "Rhombus"], "Rectangle", { teachText: "A rectangle has 4 right corners." }),
    pickPentagon: () => choiceTask("pick-pentagon", "What is the best name for this shape?", [def("pentagon", { locked: true })], ["Pentagon", "Hexagon", "Square", "Polygon"], "Pentagon", { teachText: "A pentagon is a 5-sided polygon." }),
    fixSquare: () => buildShapeTask("fix-square", "Fix this shape so it becomes a square.", { primary: "Square" }, { fix: true, starterDefinitions: [custom([{ x: -48, y: -36 }, { x: 48, y: -24 }, { x: 60, y: 48 }, { x: -60, y: 36 }], { name: "Starter", color: palette.square })], guideShape: "square", shortHelp: "Make all 4 sides the same. Make all 4 corners square." }),
    fixRectangle: () => buildShapeTask("fix-rectangle", "Fix this shape so it becomes a rectangle.", { primary: "Rectangle" }, { fix: true, starterDefinitions: [custom([{ x: -72, y: -48 }, { x: 72, y: -48 }, { x: 96, y: 48 }, { x: -48, y: 48 }], { name: "Starter", color: palette.rectangle })], guideShape: "rectangle", shortHelp: "Make 4 square corners. Opposite sides should match." }),
    compareMoreSides: () => compareTask("compare-more-sides", "Which shape has more sides?", pair({ shapeType: "triangle" }, { shapeType: "pentagon" }), "B", { teachText: "A pentagon has more sides than a triangle." }),
    compareBiggerArea: () => compareTask("compare-bigger-area", "Which shape has more inside space?", pair({ shapeType: "square", scale: 1 }, { shapeType: "square", scale: 1.35 }), "B", { teachText: "More area means more inside space." }),
    squareArea: () => measureTask("square-area", "What is the area of this square?", [def("square", { locked: true })], "area", { shortHelp: "Count inside squares.", placeholder: "Type area" }),
    squareAround: () => measureTask("square-around", "What is the perimeter of this square?", [def("square", { locked: true })], "perimeter", { shortHelp: "Add all 4 sides around the square.", placeholder: "Type perimeter" }),
    rectangleArea: () => measureTask("rectangle-area", "What is the area of this rectangle?", [def("rectangle", { locked: true })], "area", { shortHelp: "Area means the inside space.", placeholder: "Type area" }),
    rectangleAround: () => measureTask("rectangle-around", "What is the perimeter of this rectangle?", [def("rectangle", { locked: true })], "perimeter", { shortHelp: "Go all the way around.", placeholder: "Type perimeter" }),
    pickTriangleTypeRight: () => choiceTask("pick-triangle-right", "What kind of triangle is this?", [def("right-triangle", { locked: true })], ["Acute Triangle", "Right Triangle", "Obtuse Triangle", "Scalene Triangle"], "Right Triangle", { teachText: "A right triangle has one square corner." }),
    pickTriangleTypeAcute: () => choiceTask("pick-triangle-acute", "What kind of triangle is this?", [def("acute-triangle", { locked: true })], ["Acute Triangle", "Right Triangle", "Obtuse Triangle", "Scalene Triangle"], "Acute Triangle", { teachText: "An acute triangle has all angles smaller than a right angle." }),
    pickTriangleTypeObtuse: () => choiceTask("pick-triangle-obtuse", "What kind of triangle is this?", [def("obtuse-triangle", { locked: true })], ["Acute Triangle", "Right Triangle", "Obtuse Triangle", "Isosceles Triangle"], "Obtuse Triangle", { teachText: "An obtuse triangle has one angle bigger than a right angle." }),
    makeRightTriangle: () => buildShapeTask("make-right-triangle", "Make a right triangle.", { exact: "Right Triangle", family: "Triangle" }, { shortHelp: "Make one square corner.", guideShape: "right-triangle" }),
    makeAcuteTriangle: () => buildShapeTask("make-acute-triangle", "Make an acute triangle.", { exact: "Acute Triangle", family: "Triangle" }, { shortHelp: "All corners must stay smaller than a right corner.", guideShape: "acute-triangle" }),
    makeObtuseTriangle: () => buildShapeTask("make-obtuse-triangle", "Make an obtuse triangle.", { exact: "Obtuse Triangle", family: "Triangle" }, { shortHelp: "One corner should open wider than a right corner.", guideShape: "obtuse-triangle" }),
    fixObtuseTriangle: () => buildShapeTask("fix-obtuse-triangle", "Fix this so it becomes an obtuse triangle.", { exact: "Obtuse Triangle", family: "Triangle" }, { fix: true, starterDefinitions: [def("triangle")], guideShape: "obtuse-triangle", shortHelp: "One angle needs to open wide." }),
    fixRightTriangle: () => buildShapeTask("fix-right-triangle", "Fix this so it becomes a right triangle.", { exact: "Right Triangle", family: "Triangle" }, { fix: true, starterDefinitions: [custom([{ x: -72, y: 48 }, { x: 72, y: 48 }, { x: 48, y: -48 }], { name: "Starter", color: palette["right-triangle"] })], guideShape: "right-triangle", shortHelp: "Move one corner until you make a square corner." }),
    fixAcuteTriangle: () => buildShapeTask("fix-acute-triangle", "Fix this so it becomes an acute triangle.", { exact: "Acute Triangle", family: "Triangle" }, { fix: true, starterDefinitions: [custom([{ x: -72, y: 48 }, { x: 72, y: 48 }, { x: 0, y: 0 }], { name: "Starter", color: palette["acute-triangle"] })], guideShape: "acute-triangle", shortHelp: "All 3 angles should end up smaller than a right angle." }),
    triangleArea: () => measureTask("triangle-area", "What is the area of this right triangle?", [def("right-triangle", { locked: true })], "area", { shortHelp: "Half of base times height.", placeholder: "Type area" }),
    triangleAround: () => measureTask("triangle-around", "What is the perimeter of this right triangle?", [def("right-triangle", { locked: true })], "perimeter", { shortHelp: "Add all 3 sides.", placeholder: "Type perimeter" }),
    acuteTriangleArea: () => measureTask("acute-triangle-area", "What is the area of this acute triangle?", [def("acute-triangle", { locked: true })], "area", { shortHelp: "Count the inside space in square units.", placeholder: "Type area" }),
    acuteTriangleAround: () => measureTask("acute-triangle-around", "What is the perimeter of this acute triangle?", [def("acute-triangle", { locked: true })], "perimeter", { shortHelp: "Add all 3 side lengths.", placeholder: "Type perimeter" }),
    compareTriangleType: () => compareTask("compare-triangle-type", "Which triangle has the bigger angle?", pair({ shapeType: "acute-triangle" }, { shapeType: "obtuse-triangle" }), "B", { teachText: "An obtuse triangle has the bigger angle." }),
    compareTriangleArea: () => compareTask("compare-triangle-area", "Which triangle has more inside space?", pair({ shapeType: "acute-triangle", scale: 0.85 }, { shapeType: "right-triangle", scale: 1.2 }), "B", { teachText: "Compare the inside space, not just the side count." }),
    compareTriangleAround: () => compareTask("compare-triangle-around", "Which triangle has the longer outside path?", pair({ shapeType: "acute-triangle", scale: 0.85 }, { shapeType: "right-triangle", scale: 1.2 }), "B", { teachText: "A longer perimeter means a longer outside path." }),
    pickParallelogram: () => choiceTask("pick-parallelogram", "What is the best name for this shape?", [def("parallelogram", { locked: true })], ["Parallelogram", "Rectangle", "Trapezoid", "Kite"], "Parallelogram", { teachText: "A parallelogram has 2 opposite side pairs that stay parallel." }),
    pickRhombus: () => choiceTask("pick-rhombus", "What is the best name for this shape?", [def("rhombus", { locked: true })], ["Rhombus", "Square", "Trapezoid", "Rectangle"], "Rhombus", { teachText: "A rhombus has 4 equal sides." }),
    pickTrapezoid: () => choiceTask("pick-trapezoid", "What is the best name for this shape?", [def("trapezoid", { locked: true })], ["Trapezoid", "Parallelogram", "Rectangle", "Rhombus"], "Trapezoid", { teachText: "A trapezoid has one matching pair of opposite sides here." }),
    makeParallelogram: () => buildShapeTask("make-parallelogram", "Make a slant box.", { primary: "Parallelogram", rejectPrimary: ["Square", "Rectangle"] }, { shortHelp: "Make both opposite side pairs stay parallel.", guideShape: "parallelogram" }),
    makeTrapezoid: () => buildShapeTask("make-trapezoid", "Make a trapezoid.", { exact: "Trapezoid", family: "Quadrilateral" }, { shortHelp: "Make one pair of opposite sides stay parallel.", boardNote: "Pick Trapezoid in Make Shape.", guideShape: "trapezoid" }),
    fixTrapezoid: () => buildShapeTask("fix-trapezoid", "Fix this so it becomes a trapezoid.", { primary: "Trapezoid" }, { fix: true, starterDefinitions: [def("rectangle")], guideShape: "trapezoid", shortHelp: "Keep only one pair of opposite sides parallel." }),
    makeRhombus: () => buildShapeTask("make-rhombus", "Make a rhombus, not a square.", { primary: "Rhombus", rejectPrimary: ["Square"] }, { shortHelp: "All 4 sides the same. Corners should not all be square.", guideShape: "rhombus" }),
    fixParallelogram: () => buildShapeTask("fix-parallelogram", "Fix this so it becomes a slant box.", { primary: "Parallelogram", rejectPrimary: ["Square", "Rectangle"] }, { fix: true, starterDefinitions: [custom([{ x: -72, y: -48 }, { x: 48, y: -48 }, { x: 96, y: 48 }, { x: -48, y: 24 }], { name: "Starter", color: palette.parallelogram })], guideShape: "parallelogram", shortHelp: "Make both opposite side pairs stay parallel." }),
    fixRhombus: () => buildShapeTask("fix-rhombus", "Fix this so it becomes a rhombus.", { primary: "Rhombus" }, { fix: true, starterDefinitions: [custom([{ x: 0, y: -72 }, { x: 48, y: -24 }, { x: 24, y: 72 }, { x: -48, y: 24 }], { name: "Starter", color: palette.rhombus })], guideShape: "rhombus", shortHelp: "Make all 4 sides the same length." }),
    moreExactSquare: () => choiceTask("more-exact-square", "Which name is more exact?", [def("square", { locked: true })], ["Square", "Rectangle", "Quadrilateral", "Polygon"], "Square", { type: "more-exact", teachText: "The more exact true name tells the most." }),
    moreExactRhombus: () => choiceTask("more-exact-rhombus", "Which name is more exact?", [def("rhombus", { locked: true })], ["Rhombus", "Quadrilateral", "Polygon", "Rectangle"], "Rhombus", { type: "more-exact", teachText: "Pick the strongest true name." }),
    parallelogramArea: () => measureTask("parallelogram-area", "What is the area of this slant box?", [def("parallelogram", { locked: true })], "area", { shortHelp: "Base times height.", placeholder: "Type area" }),
    rhombusArea: () => measureTask("rhombus-area", "What is the area of this rhombus?", [def("rhombus", { locked: true })], "area", { shortHelp: "Use the inside space or diagonals.", placeholder: "Type area" }),
    compareAround: () => compareTask("compare-around", "Which shape has a longer outside path?", pair({ shapeType: "square", scale: 1 }, { shapeType: "rectangle", scale: 1.2 }), "B", { teachText: "Longer perimeter means a longer outside path." }),
    compareSameSides: () => compareTask("compare-same-sides", "Do these shapes have the same number of sides?", pair({ shapeType: "square" }, { shapeType: "rectangle" }), "Same", { teachText: "Both have 4 sides." }),
    compareQuadArea: () => compareTask("compare-quad-area", "Which box shape has more inside space?", pair({ shapeType: "parallelogram", scale: 0.9 }, { shapeType: "trapezoid", scale: 1.2 }), "B", { teachText: "Compare the inside space, not just the side names." }),
    pickIsoscelesTrap: () => choiceTask("pick-isosceles-trap", "What is the best name for this shape?", [custom([{ x: -72, y: 42 }, { x: 72, y: 42 }, { x: 42, y: -42 }, { x: -42, y: -42 }], { locked: true, color: palette.trapezoid, name: "Isosceles Trapezoid" })], ["Isosceles Trapezoid", "Trapezoid", "Parallelogram", "Kite"], "Isosceles Trapezoid", { teachText: "This trapezoid has matching legs, so it has a more exact name." })
  };
  var missionKeys = {
    shapeStart: [
      ["shape-1", "Count the Sides", "Let\u2019s start with side counting.", "Count easy shapes.", ["countTriangle", "countSquare", "countPentagon"]],
      ["shape-2", "Make New Shapes", "Use Make Shape and the board.", "Build easy shapes.", ["makeTriangle", "makeSquare", "makePentagon"]],
      ["shape-3", "Pick the Name", "Read the board and pick the best name.", "Name easy shapes.", ["pickSquare", "pickRectangle", "pickPentagon"]],
      ["shape-4", "Fix the Shape", "A few shapes need your help.", "Fix easy shapes.", ["fixSquare", "fixRectangle", "fixRightTriangle"]],
      ["shape-5", "Big or Small", "Now compare two shapes.", "Compare simple shapes.", ["compareMoreSides", "compareBiggerArea", "compareSameSides"]],
      ["shape-6", "Measure It", "Count inside space and outside path.", "Measure simple shapes.", ["squareArea", "squareAround", "rectangleArea"]],
      ["shape-boss", "Shape Start Boss", "Mix everything you learned.", "Boss mix.", ["makeSquare", "moreExactSquare", "countPentagon"], true]
    ],
    triangleTrail: [
      ["triangle-1", "Triangle Types", "Look at the angles.", "Name triangle kinds.", ["pickTriangleTypeRight", "pickTriangleTypeAcute", "pickTriangleTypeObtuse"]],
      ["triangle-2", "Make Triangle Kinds", "Build triangle kinds on the board.", "Make triangle kinds.", ["makeRightTriangle", "makeAcuteTriangle", "makeObtuseTriangle"]],
      ["triangle-3", "Fix the Corners", "These starters need new corners.", "Fix triangle kinds.", ["fixObtuseTriangle", "fixRightTriangle", "fixAcuteTriangle"]],
      ["triangle-4", "Count and Name", "Mix side counting and triangle naming.", "Mix triangle facts.", ["countTriangle", "pickTriangleTypeRight", "pickTriangleTypeObtuse"]],
      ["triangle-5", "Measure Triangles", "Use triangle rules now.", "Measure triangles.", ["triangleArea", "triangleAround", "acuteTriangleAround"]],
      ["triangle-6", "Compare Triangles", "Which triangle changes the most?", "Compare triangle facts.", ["compareTriangleType", "compareTriangleArea", "compareTriangleAround"]],
      ["triangle-boss", "Triangle Trail Boss", "One more mixed round.", "Boss mix.", ["makeRightTriangle", "pickTriangleTypeObtuse", "triangleArea"], true]
    ],
    quadQuest: [
      ["quad-1", "Name the Box", "Read the shape clues and choose the best name.", "Name box shapes.", ["pickParallelogram", "pickRhombus", "pickTrapezoid"]],
      ["quad-2", "Make a Slant Box", "Use the board to build quad shapes.", "Make quad shapes.", ["makeParallelogram", "makeTrapezoid", "makeRhombus"]],
      ["quad-3", "More Exact", "Pick the strongest true name.", "Choose exact names.", ["moreExactSquare", "moreExactRhombus", "pickParallelogram"]],
      ["quad-4", "Fix the Box", "Some box shapes need one more move.", "Fix quad shapes.", ["fixTrapezoid", "fixParallelogram", "fixRhombus"]],
      ["quad-5", "Measure the Box", "Find inside space and outside path.", "Measure quad shapes.", ["rectangleAround", "parallelogramArea", "rhombusArea"]],
      ["quad-6", "Compare the Box", "Use sides and size to compare.", "Compare quad shapes.", ["compareAround", "compareSameSides", "compareQuadArea"]],
      ["quad-boss", "Quad Quest Boss", "A mixed box challenge.", "Boss mix.", ["makeRhombus", "moreExactSquare", "parallelogramArea"], true]
    ],
    measureMountain: [
      ["measure-1", "Inside Space", "Area tells how much space is inside.", "Area tasks.", ["squareArea", "triangleArea", "parallelogramArea"]],
      ["measure-2", "Outside Path", "Perimeter goes all the way around.", "Perimeter tasks.", ["rectangleAround", "triangleAround", "compareAround"]],
      ["measure-3", "Area Mix", "Switch between different area rules.", "Mixed area.", ["squareArea", "rhombusArea", "compareBiggerArea"]],
      ["measure-4", "Perimeter Mix", "Switch between different perimeter checks.", "Mixed perimeter.", ["rectangleAround", "triangleAround", "compareAround"]],
      ["measure-5", "Compare the Size", "Pick the bigger one.", "Compare size.", ["compareBiggerArea", "compareAround", "compareMoreSides"]],
      ["measure-6", "Fast Number Mix", "Use the right rule fast.", "Fast mixed measure.", ["squareArea", "rectangleAround", "rhombusArea"]],
      ["measure-boss", "Measure Mountain Boss", "One more number climb.", "Boss mix.", ["triangleArea", "compareAround", "rhombusArea"], true]
    ],
    masterMix: [
      ["master-1", "Best Name Wins", "Choose the most exact true name.", "Exact name mix.", ["moreExactSquare", "moreExactRhombus", "pickIsoscelesTrap"]],
      ["master-2", "Shape Builder", "Make the strongest match you can.", "Build mix.", ["makeParallelogram", "makeRhombus", "makeRightTriangle"]],
      ["master-3", "Shape Doctor", "Fix shapes that are close but not right yet.", "Fix mix.", ["fixSquare", "fixTrapezoid", "fixObtuseTriangle"]],
      ["master-4", "Measure and Compare", "Use math and shape reading together.", "Measure mix.", ["rhombusArea", "compareBiggerArea", "compareAround"]],
      ["master-5", "Quick Brain", "Switch tasks fast.", "Fast mix.", ["countPentagon", "pickParallelogram", "squareArea"]],
      ["master-6", "Boss Practice", "One last warm-up.", "Practice mix.", ["triangleAround", "pickTriangleTypeRight", "makeSquare"]],
      ["master-boss", "Master Mix Boss", "Your final star test.", "Boss mix.", ["makeRhombus", "pickIsoscelesTrap", "rhombusArea"], true]
    ]
  };
  function makeMission([id, title, intro, short, keys, boss = false]) {
    return { id, title, intro, short, tasks: keys.map((key) => factories[key]()), boss };
  }
  var WORLDS = [
    { id: "shape-start", title: "Shape Start", theme: "Warm Up", copy: "Meet shapes, count sides, and win your first stars.", badge: "Shape Starter", missions: missionKeys.shapeStart.map(makeMission), taskPool: ["countTriangle", "countSquare", "countPentagon", "makeTriangle", "makeSquare", "makePentagon", "pickSquare", "pickRectangle", "pickPentagon", "fixSquare", "fixRectangle", "squareArea", "squareAround", "rectangleArea"] },
    { id: "triangle-trail", title: "Triangle Trail", theme: "Angle Path", copy: "Learn triangle kinds by fixing and making them.", badge: "Triangle Tracker", missions: missionKeys.triangleTrail.map(makeMission), taskPool: ["pickTriangleTypeRight", "pickTriangleTypeAcute", "pickTriangleTypeObtuse", "makeRightTriangle", "makeAcuteTriangle", "makeObtuseTriangle", "fixObtuseTriangle", "fixRightTriangle", "fixAcuteTriangle", "triangleArea", "triangleAround", "acuteTriangleArea", "acuteTriangleAround", "compareTriangleType"] },
    { id: "quad-quest", title: "Quad Quest", theme: "Box Trail", copy: "Meet slant boxes, rhombi, and trapezoids.", badge: "Quad Quest Hero", missions: missionKeys.quadQuest.map(makeMission), taskPool: ["pickParallelogram", "pickRhombus", "pickTrapezoid", "makeParallelogram", "makeTrapezoid", "makeRhombus", "fixTrapezoid", "fixParallelogram", "fixRhombus", "moreExactSquare", "moreExactRhombus", "parallelogramArea", "rhombusArea", "compareQuadArea"] },
    { id: "measure-mountain", title: "Measure Mountain", theme: "Number Climb", copy: "Use area and perimeter all the way up the mountain.", badge: "Measure Master", missions: missionKeys.measureMountain.map(makeMission), taskPool: ["squareArea", "rectangleAround", "triangleArea", "triangleAround", "parallelogramArea", "rhombusArea", "compareBiggerArea", "compareAround"] },
    { id: "master-mix", title: "Master Mix", theme: "Star Stage", copy: "Mix all of your best shape moves in one world.", badge: "Polygon Pro", missions: missionKeys.masterMix.map(makeMission), taskPool: ["moreExactSquare", "moreExactRhombus", "pickIsoscelesTrap", "makeParallelogram", "makeRhombus", "makeRightTriangle", "rhombusArea", "compareAround", "compareBiggerArea"] }
  ];
  function getShapeChoices() {
    return shapeChoices.slice();
  }
  function getWorldById(worldId) {
    return WORLDS.find((world) => world.id === worldId) || null;
  }
  function getMissionById(worldId, missionId) {
    var _a;
    return ((_a = getWorldById(worldId)) == null ? void 0 : _a.missions.find((mission) => mission.id === missionId)) || null;
  }
  function cloneTasks(tasks) {
    if (typeof globalThis.structuredClone === "function") {
      return globalThis.structuredClone(tasks);
    }
    return JSON.parse(JSON.stringify(tasks));
  }
  function buildMissionTasks(worldEntry, missionEntry, replay = false) {
    if (!replay) {
      return cloneTasks(missionEntry.tasks);
    }
    const sample = worldEntry.taskPool.map((key) => ({ key, sort: Math.random() })).sort((a, b) => a.sort - b.sort).slice(0, 3).map((entry) => factories[entry.key]());
    return cloneTasks(sample);
  }

  // public/Games/Quiz it Polygon!/js/engine/geometry.js
  var SHAPE_LABELS = {
    triangle: "Triangle",
    "right-triangle": "Right Triangle",
    "acute-triangle": "Acute Triangle",
    "obtuse-triangle": "Obtuse Triangle",
    square: "Square",
    rectangle: "Rectangle",
    parallelogram: "Parallelogram",
    rhombus: "Rhombus",
    trapezoid: "Trapezoid",
    pentagon: "Pentagon",
    hexagon: "Hexagon",
    heptagon: "Heptagon",
    octagon: "Octagon"
  };
  var EXACT_LABEL_PRIORITY = [
    "Square",
    "Equilateral Triangle",
    "Right Triangle",
    "Obtuse Triangle",
    "Acute Triangle",
    "Rectangle",
    "Rhombus",
    "Parallelogram",
    "Isosceles Trapezoid",
    "Trapezoid",
    "Kite",
    "Dart",
    "Isosceles Triangle",
    "Scalene Triangle"
  ];
  var Polygon = class _Polygon {
    constructor(vertices = [], options = {}) {
      this.vertices = vertices.map(clonePoint);
      this.color = options.color || "#4c8dff";
      this.name = options.name || "Polygon";
      this.role = options.role || "main";
      this.locked = options.locked === true;
      this.label = options.label || "";
    }
    clone() {
      return new _Polygon(this.vertices, {
        color: this.color,
        name: this.name,
        role: this.role,
        locked: this.locked,
        label: this.label
      });
    }
    containsPoint(point) {
      let inside = false;
      for (let i = 0, j = this.vertices.length - 1; i < this.vertices.length; j = i++) {
        const xi = this.vertices[i].x;
        const yi = this.vertices[i].y;
        const xj = this.vertices[j].x;
        const yj = this.vertices[j].y;
        const intersects = yi > point.y !== yj > point.y && point.x < (xj - xi) * (point.y - yi) / (yj - yi || 1e-6) + xi;
        if (intersects) inside = !inside;
      }
      return inside;
    }
    move(dx, dy) {
      this.vertices = this.vertices.map((vertex) => ({ x: vertex.x + dx, y: vertex.y + dy }));
    }
  };
  function clonePoint(point) {
    return { x: point.x, y: point.y };
  }
  function cloneDefinition(definition = {}) {
    return JSON.parse(JSON.stringify(definition));
  }
  function getShapeLabel(shapeType) {
    return SHAPE_LABELS[shapeType] || `${shapeType.charAt(0).toUpperCase()}${shapeType.slice(1)}`;
  }
  function createShapeVertices(shapeType, options = {}) {
    const center = options.center || { x: 0, y: 0 };
    const grid = options.grid || 24;
    const scale = Number.isFinite(options.scale) ? options.scale : 1;
    const withScale = (value) => Math.round(value * scale / grid) * grid;
    const centerX = center.x;
    const centerY = center.y;
    let vertices = [];
    switch (shapeType) {
      case "triangle": {
        const size = withScale(60);
        vertices = [
          { x: centerX, y: centerY - size * 0.577 },
          { x: centerX - size * 0.5, y: centerY + size * 0.289 },
          { x: centerX + size * 0.5, y: centerY + size * 0.289 }
        ];
        break;
      }
      case "right-triangle": {
        const width = withScale(96);
        const height = withScale(72);
        vertices = [
          { x: centerX - width / 2, y: centerY + height / 2 },
          { x: centerX + width / 2, y: centerY + height / 2 },
          { x: centerX - width / 2, y: centerY - height / 2 }
        ];
        break;
      }
      case "acute-triangle": {
        const width = withScale(88);
        const height = withScale(84);
        vertices = [
          { x: centerX, y: centerY - height / 2 },
          { x: centerX - width / 2, y: centerY + height / 2 },
          { x: centerX + width / 2, y: centerY + height / 2 }
        ];
        break;
      }
      case "obtuse-triangle": {
        const width = withScale(136);
        const height = withScale(66);
        vertices = [
          { x: centerX - width / 2, y: centerY + height / 2 },
          { x: centerX + width / 2, y: centerY + height / 2 },
          { x: centerX, y: centerY }
        ];
        break;
      }
      case "square": {
        const size = withScale(72);
        const half = size / 2;
        vertices = [
          { x: centerX - half, y: centerY - half },
          { x: centerX + half, y: centerY - half },
          { x: centerX + half, y: centerY + half },
          { x: centerX - half, y: centerY + half }
        ];
        break;
      }
      case "rectangle": {
        const width = withScale(96);
        const height = withScale(72);
        vertices = [
          { x: centerX - width / 2, y: centerY - height / 2 },
          { x: centerX + width / 2, y: centerY - height / 2 },
          { x: centerX + width / 2, y: centerY + height / 2 },
          { x: centerX - width / 2, y: centerY + height / 2 }
        ];
        break;
      }
      case "parallelogram": {
        const width = withScale(120);
        const height = withScale(84);
        const skew = withScale(42);
        vertices = [
          { x: centerX - width / 2, y: centerY - height / 2 },
          { x: centerX + width / 2, y: centerY - height / 2 },
          { x: centerX + width / 2 + skew, y: centerY + height / 2 },
          { x: centerX - width / 2 + skew, y: centerY + height / 2 }
        ];
        break;
      }
      case "rhombus": {
        const horizontal = withScale(72);
        const vertical = withScale(96);
        vertices = [
          { x: centerX, y: centerY - vertical / 2 },
          { x: centerX + horizontal / 2, y: centerY },
          { x: centerX, y: centerY + vertical / 2 },
          { x: centerX - horizontal / 2, y: centerY }
        ];
        break;
      }
      case "trapezoid": {
        const topWidth = withScale(84);
        const baseWidth = withScale(144);
        const height = withScale(84);
        vertices = [
          { x: centerX - topWidth / 2, y: centerY - height / 2 },
          { x: centerX + topWidth / 2, y: centerY - height / 2 },
          { x: centerX + baseWidth / 2, y: centerY + height / 2 },
          { x: centerX - baseWidth / 2, y: centerY + height / 2 }
        ];
        break;
      }
      case "pentagon":
        vertices = createRegularPolygon(5, withScale(56), centerX, centerY);
        break;
      case "hexagon":
        vertices = createRegularPolygon(6, withScale(48), centerX, centerY);
        break;
      case "heptagon":
        vertices = createRegularPolygon(7, withScale(42), centerX, centerY);
        break;
      case "octagon":
        vertices = createRegularPolygon(8, withScale(40), centerX, centerY);
        break;
      default:
        vertices = createShapeVertices("triangle", options);
        break;
    }
    return vertices.map((vertex) => snapPointToGrid(vertex, grid));
  }
  function createPolygonFromDefinition(definition = {}, options = {}) {
    const grid = options.grid || 24;
    const color = definition.color || options.color || "#4c8dff";
    const name = definition.name || getShapeLabel(definition.shapeType || "triangle");
    const vertices = Array.isArray(definition.vertices) ? definition.vertices.map((vertex) => snapPointToGrid(vertex, grid)) : createShapeVertices(definition.shapeType || "triangle", {
      center: definition.center || options.center || { x: 0, y: 0 },
      scale: definition.scale,
      grid
    });
    return new Polygon(vertices, {
      color,
      name,
      locked: definition.locked === true,
      role: definition.role || "main",
      label: definition.label || ""
    });
  }
  function snapPointToGrid(point, grid) {
    return {
      x: Math.round(point.x / grid) * grid,
      y: Math.round(point.y / grid) * grid
    };
  }
  function getPolygonSummary(polygon, grid) {
    if (!polygon) return null;
    const analysis = getPolygonAnalysis(polygon, grid);
    return {
      polygon,
      analysis,
      vertices: polygon.vertices.length,
      area: Math.abs(getSignedArea(polygon.vertices)) / (grid * grid),
      perimeter: getPerimeter(polygon.vertices) / grid
    };
  }
  function getPerimeter(vertices) {
    let total = 0;
    for (let i = 0; i < vertices.length; i += 1) {
      total += distance(vertices[i], vertices[(i + 1) % vertices.length]);
    }
    return total;
  }
  function distance(pointA, pointB) {
    return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
  }
  function getPolygonCenter(polygon) {
    const vertices = polygon.vertices;
    if (!vertices.length) return { x: 0, y: 0 };
    const total = vertices.reduce((acc, vertex) => ({
      x: acc.x + vertex.x,
      y: acc.y + vertex.y
    }), { x: 0, y: 0 });
    return {
      x: total.x / vertices.length,
      y: total.y / vertices.length
    };
  }
  function areValuesClose(a, b, tolerance) {
    return Math.abs(a - b) <= tolerance;
  }
  function createRegularPolygon(sides, radius, centerX, centerY) {
    const angleStep = Math.PI * 2 / sides;
    const startAngle = -Math.PI / 2;
    return Array.from({ length: sides }, (_, index) => ({
      x: centerX + Math.cos(startAngle + angleStep * index) * radius,
      y: centerY + Math.sin(startAngle + angleStep * index) * radius
    }));
  }
  function getSignedArea(vertices) {
    let area = 0;
    for (let i = 0; i < vertices.length; i += 1) {
      const next = vertices[(i + 1) % vertices.length];
      area += vertices[i].x * next.y;
      area -= next.x * vertices[i].y;
    }
    return area / 2;
  }
  function getPolygonFamilyName(sideCount) {
    const names = {
      3: "Triangle",
      4: "Quadrilateral",
      5: "Pentagon",
      6: "Hexagon",
      7: "Heptagon",
      8: "Octagon",
      9: "Nonagon",
      10: "Decagon"
    };
    return names[sideCount] || `${sideCount}-gon`;
  }
  function getLengthTolerance(lengths, grid) {
    const validLengths = lengths.filter((length) => Number.isFinite(length) && length > 0);
    if (!validLengths.length) {
      return Math.max(0.5, grid * 0.04);
    }
    const average = validLengths.reduce((sum, length) => sum + length, 0) / validLengths.length;
    return Math.max(0.5, grid * 0.04, average * 0.015);
  }
  function getSegmentOrientation(a, b, c, epsilon = 1e-6) {
    const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    if (Math.abs(value) <= epsilon) return 0;
    return value > 0 ? 1 : -1;
  }
  function isPointOnSegment(point, start, end, epsilon = 1e-6) {
    return point.x <= Math.max(start.x, end.x) + epsilon && point.x >= Math.min(start.x, end.x) - epsilon && point.y <= Math.max(start.y, end.y) + epsilon && point.y >= Math.min(start.y, end.y) - epsilon;
  }
  function segmentsIntersect(a, b, c, d, epsilon = 1e-6) {
    const o1 = getSegmentOrientation(a, b, c, epsilon);
    const o2 = getSegmentOrientation(a, b, d, epsilon);
    const o3 = getSegmentOrientation(c, d, a, epsilon);
    const o4 = getSegmentOrientation(c, d, b, epsilon);
    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && isPointOnSegment(c, a, b, epsilon)) return true;
    if (o2 === 0 && isPointOnSegment(d, a, b, epsilon)) return true;
    if (o3 === 0 && isPointOnSegment(a, c, d, epsilon)) return true;
    if (o4 === 0 && isPointOnSegment(b, c, d, epsilon)) return true;
    return false;
  }
  function isSelfIntersecting(vertices) {
    if (vertices.length < 4) return false;
    for (let i = 0; i < vertices.length; i += 1) {
      const nextI = (i + 1) % vertices.length;
      for (let j = i + 1; j < vertices.length; j += 1) {
        const nextJ = (j + 1) % vertices.length;
        const sharesEndpoint = i === j || i === nextJ || nextI === j;
        const closesLoop = i === 0 && nextJ === 0;
        if (sharesEndpoint || closesLoop) continue;
        if (segmentsIntersect(vertices[i], vertices[nextI], vertices[j], vertices[nextJ])) {
          return true;
        }
      }
    }
    return false;
  }
  function isParallel(vecA, vecB, tolerance = 0.035) {
    const lenA = Math.hypot(vecA.x, vecA.y);
    const lenB = Math.hypot(vecB.x, vecB.y);
    if (lenA === 0 || lenB === 0) return false;
    const cross = vecA.x * vecB.y - vecA.y * vecB.x;
    return Math.abs(cross / (lenA * lenB)) <= tolerance;
  }
  function getInteriorAngles(vertices) {
    const signedArea = getSignedArea(vertices);
    const orientationSign = signedArea >= 0 ? 1 : -1;
    const angles = [];
    for (let i = 0; i < vertices.length; i += 1) {
      const prev = vertices[(i - 1 + vertices.length) % vertices.length];
      const current = vertices[i];
      const next = vertices[(i + 1) % vertices.length];
      const toPrev = { x: prev.x - current.x, y: prev.y - current.y };
      const toNext = { x: next.x - current.x, y: next.y - current.y };
      const prevLength = Math.hypot(toPrev.x, toPrev.y);
      const nextLength = Math.hypot(toNext.x, toNext.y);
      if (prevLength === 0 || nextLength === 0) {
        angles.push(Number.NaN);
        continue;
      }
      const dot = toPrev.x * toNext.x + toPrev.y * toNext.y;
      const cross = toPrev.x * toNext.y - toPrev.y * toNext.x;
      const cosine = Math.min(1, Math.max(-1, dot / (prevLength * nextLength)));
      const baseAngle = Math.acos(cosine) * 180 / Math.PI;
      const isReflex = cross * orientationSign > 1e-6;
      angles.push(isReflex ? 360 - baseAngle : baseAngle);
    }
    return angles;
  }
  function getPolygonAnalysis(polygon, grid = 24) {
    const vertices = (polygon == null ? void 0 : polygon.vertices) || [];
    const sideCount = vertices.length;
    const familyName = getPolygonFamilyName(sideCount);
    const familyLabels = ["Polygon", familyName];
    const exactMatches = [];
    const traits = [];
    const notes = [];
    const sideLengths = vertices.map((vertex, index) => distance(vertex, vertices[(index + 1) % sideCount]));
    const lengthTolerance = getLengthTolerance(sideLengths, grid);
    const angleTolerance = 1.5;
    const areaMagnitude = Math.abs(getSignedArea(vertices));
    const areaTolerance = Math.max(1, grid * grid * 0.01);
    const hasZeroLengthSide = sideLengths.some((length) => length <= Math.max(0.5, lengthTolerance * 0.5));
    const isSimple = !isSelfIntersecting(vertices);
    const interiorAngles = isSimple ? getInteriorAngles(vertices) : [];
    const hasInvalidAngles = interiorAngles.some((angle) => !Number.isFinite(angle));
    const isDegenerate = areaMagnitude <= areaTolerance || hasZeroLengthSide || hasInvalidAngles;
    const isConvex = isSimple && !isDegenerate && interiorAngles.every((angle) => angle < 180 + angleTolerance);
    const isConcave = isSimple && !isDegenerate && !isConvex;
    const equilateral = sideLengths.length > 0 && sideLengths.every((length) => areValuesClose(length, sideLengths[0], lengthTolerance));
    const equiangular = interiorAngles.length === sideCount && interiorAngles.every((angle) => areValuesClose(angle, interiorAngles[0], angleTolerance));
    const isRegular = isSimple && !isDegenerate && isConvex && equilateral && equiangular;
    traits.push(isSimple ? isConcave ? "Concave" : "Convex" : "Complex Polygon");
    if (!isSimple) notes.push("Self-crossing shape");
    if (isDegenerate) {
      traits.push("Degenerate");
      notes.push("Move the corners so the shape holds area.");
    }
    if (equilateral && !isDegenerate) traits.push("Equal Sides");
    if (equiangular && !isDegenerate) traits.push("Equal Angles");
    traits.push(isRegular ? "Regular Polygon" : "Irregular Polygon");
    if (sideCount === 3 && isSimple && !isDegenerate) {
      const equalPairs = [
        areValuesClose(sideLengths[0], sideLengths[1], lengthTolerance),
        areValuesClose(sideLengths[1], sideLengths[2], lengthTolerance),
        areValuesClose(sideLengths[0], sideLengths[2], lengthTolerance)
      ];
      if (equilateral) {
        exactMatches.push("Equilateral Triangle", "Isosceles Triangle");
      } else if (equalPairs.some(Boolean)) {
        exactMatches.push("Isosceles Triangle");
      } else {
        exactMatches.push("Scalene Triangle");
      }
      if (interiorAngles.some((angle) => areValuesClose(angle, 90, angleTolerance))) {
        exactMatches.push("Right Triangle");
      } else if (interiorAngles.some((angle) => angle > 90 + angleTolerance)) {
        exactMatches.push("Obtuse Triangle");
      } else {
        exactMatches.push("Acute Triangle");
      }
    }
    if (sideCount === 4 && isSimple && !isDegenerate) {
      const edges = vertices.map((vertex, index) => ({
        x: vertices[(index + 1) % sideCount].x - vertex.x,
        y: vertices[(index + 1) % sideCount].y - vertex.y
      }));
      const oppositeParallelA = isParallel(edges[0], edges[2]);
      const oppositeParallelB = isParallel(edges[1], edges[3]);
      const parallelPairCount = Number(oppositeParallelA) + Number(oppositeParallelB);
      const rightAngleCount = interiorAngles.filter((angle) => areValuesClose(angle, 90, angleTolerance)).length;
      const rectangle = rightAngleCount === 4;
      const rhombus = equilateral;
      const parallelogram = oppositeParallelA && oppositeParallelB;
      const trapezoid = parallelPairCount === 1;
      const legLengths = oppositeParallelA ? [sideLengths[1], sideLengths[3]] : [sideLengths[0], sideLengths[2]];
      const isoscelesTrapezoid = trapezoid && areValuesClose(legLengths[0], legLengths[1], lengthTolerance);
      const adjacentPairPattern = areValuesClose(sideLengths[0], sideLengths[1], lengthTolerance) && areValuesClose(sideLengths[2], sideLengths[3], lengthTolerance) || areValuesClose(sideLengths[1], sideLengths[2], lengthTolerance) && areValuesClose(sideLengths[3], sideLengths[0], lengthTolerance);
      const kite = adjacentPairPattern && !equilateral && !parallelogram;
      if (rectangle && rhombus) exactMatches.push("Square");
      if (rectangle) exactMatches.push("Rectangle");
      if (rhombus) exactMatches.push("Rhombus");
      if (parallelogram) exactMatches.push("Parallelogram");
      if (isoscelesTrapezoid) exactMatches.push("Isosceles Trapezoid");
      if (trapezoid) exactMatches.push("Trapezoid");
      if (kite) exactMatches.push(isConvex ? "Kite" : "Dart");
    }
    if (sideCount >= 5 && isRegular) {
      exactMatches.push(`Regular ${familyName}`);
    }
    const prioritizedExactMatches = [...new Set(exactMatches.filter(Boolean))].sort((left, right) => {
      const leftIndex = EXACT_LABEL_PRIORITY.indexOf(left);
      const rightIndex = EXACT_LABEL_PRIORITY.indexOf(right);
      const leftRank = leftIndex === -1 ? EXACT_LABEL_PRIORITY.length : leftIndex;
      const rightRank = rightIndex === -1 ? EXACT_LABEL_PRIORITY.length : rightIndex;
      return leftRank - rightRank;
    });
    const primaryLabel = prioritizedExactMatches[0] || (isRegular ? `Regular ${familyName}` : familyName);
    return {
      primaryLabel,
      familyLabels: [...new Set(familyLabels.filter(Boolean))],
      exactMatches: prioritizedExactMatches,
      traits: [...new Set(traits.filter(Boolean))],
      notes: [...new Set(notes.filter(Boolean))]
    };
  }

  // public/Games/Quiz it Polygon!/js/engine/polygon-board.js
  var DEFAULT_COLORS = ["#4f8cff", "#ff8a5b", "#27b07d", "#8c63ff", "#ffbf47"];
  var PolygonBoard = class {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.onChange = typeof options.onChange === "function" ? options.onChange : () => {
      };
      this.gridSize = 24;
      this.polygons = [];
      this.selectedPolygon = null;
      this.selectedVertexIndex = -1;
      this.mode = "move";
      this.readonly = false;
      this.taskGuide = null;
      this.hintStage = 0;
      this.initialDefinitions = [];
      this.history = [];
      this.historyIndex = -1;
      this.drag = null;
      this.pointerId = null;
      this.resizeObserver = null;
      this.boundHandlePointerDown = this.handlePointerDown.bind(this);
      this.boundHandlePointerMove = this.handlePointerMove.bind(this);
      this.boundHandlePointerUp = this.handlePointerUp.bind(this);
      this.boundHandleResize = this.resize.bind(this);
      this.attach();
      this.resize();
      this.render();
    }
    attach() {
      this.canvas.addEventListener("pointerdown", this.boundHandlePointerDown);
      window.addEventListener("pointermove", this.boundHandlePointerMove);
      window.addEventListener("pointerup", this.boundHandlePointerUp);
      window.addEventListener("pointercancel", this.boundHandlePointerUp);
      window.addEventListener("resize", this.boundHandleResize);
      if ("ResizeObserver" in window) {
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.canvas);
      }
    }
    destroy() {
      var _a;
      this.canvas.removeEventListener("pointerdown", this.boundHandlePointerDown);
      window.removeEventListener("pointermove", this.boundHandlePointerMove);
      window.removeEventListener("pointerup", this.boundHandlePointerUp);
      window.removeEventListener("pointercancel", this.boundHandlePointerUp);
      window.removeEventListener("resize", this.boundHandleResize);
      (_a = this.resizeObserver) == null ? void 0 : _a.disconnect();
    }
    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
      this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.width = rect.width;
      this.height = rect.height;
      this.gridSize = this.width < 500 ? 20 : this.width < 900 ? 22 : 24;
      this.render();
    }
    worldToScreen(point) {
      return {
        x: this.width / 2 + point.x,
        y: this.height / 2 + point.y
      };
    }
    screenToWorld(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left - rect.width / 2,
        y: clientY - rect.top - rect.height / 2
      };
    }
    setMode(mode) {
      this.mode = mode;
      this.render();
    }
    setReadonly(readonly) {
      this.readonly = readonly;
      this.render();
    }
    setHintStage(stage) {
      this.hintStage = stage;
      this.render();
    }
    loadTaskBoard(taskBoard = {}) {
      this.taskGuide = {
        ...taskBoard,
        guideDefinitions: (taskBoard.guideDefinitions || []).map(cloneDefinition),
        helperBadges: Array.isArray(taskBoard.helperBadges) ? taskBoard.helperBadges.slice() : [],
        showLiveMetric: taskBoard.showLiveMetric || null
      };
      const starterDefinitions = (taskBoard.starterDefinitions || []).map(cloneDefinition);
      this.initialDefinitions = starterDefinitions.map(cloneDefinition);
      this.setDefinitions(starterDefinitions, { preserveHistory: false });
      this.setReadonly(taskBoard.editable === false ? true : false);
    }
    setDefinitions(definitions = [], options = {}) {
      this.polygons = definitions.map((definition, index) => createPolygonFromDefinition({
        ...definition,
        color: definition.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        role: definition.role || "main",
        label: definition.label || ""
      }, {
        grid: this.gridSize
      }));
      this.selectedPolygon = this.polygons.find((polygon) => !polygon.locked) || this.polygons[0] || null;
      this.selectedVertexIndex = -1;
      if (options.preserveHistory !== true) {
        this.history = [];
        this.historyIndex = -1;
        this.saveHistory();
      }
      this.notifyChange();
    }
    createOrReplaceShape(shapeType) {
      const definition = {
        shapeType,
        color: DEFAULT_COLORS[0],
        name: getShapeLabel(shapeType)
      };
      const freshPolygon = createPolygonFromDefinition(definition, { grid: this.gridSize });
      const lockedPolygons = this.polygons.filter((polygon) => polygon.locked).map((polygon) => polygon.clone());
      this.polygons = [freshPolygon, ...lockedPolygons];
      this.selectedPolygon = freshPolygon;
      this.selectedVertexIndex = -1;
      this.saveHistory();
      this.notifyChange();
    }
    reset() {
      this.setDefinitions(this.initialDefinitions.map(cloneDefinition), { preserveHistory: false });
    }
    undo() {
      if (this.historyIndex <= 0) return;
      this.historyIndex -= 1;
      this.restoreHistoryState(this.history[this.historyIndex]);
    }
    saveHistory() {
      const payload = JSON.stringify(this.polygons.map((polygon) => ({
        vertices: polygon.vertices,
        color: polygon.color,
        name: polygon.name,
        role: polygon.role,
        locked: polygon.locked,
        label: polygon.label
      })));
      if (this.historyIndex >= 0 && this.history[this.historyIndex] === payload) {
        return;
      }
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push(payload);
      this.historyIndex += 1;
      if (this.history.length > 40) {
        this.history.shift();
        this.historyIndex -= 1;
      }
    }
    restoreHistoryState(payload) {
      const data = JSON.parse(payload);
      this.polygons = data.map((definition) => new Polygon(definition.vertices, definition));
      this.selectedPolygon = this.polygons.find((polygon) => !polygon.locked) || this.polygons[0] || null;
      this.selectedVertexIndex = -1;
      this.notifyChange();
    }
    getSummaries() {
      return this.polygons.map((polygon) => getPolygonSummary(polygon, this.gridSize));
    }
    getPrimarySummary() {
      const editable = this.polygons.find((polygon) => !polygon.locked);
      return editable ? getPolygonSummary(editable, this.gridSize) : this.getSummaries()[0] || null;
    }
    getDebugState() {
      var _a;
      return {
        readonly: this.readonly,
        mode: this.mode,
        polygonCount: this.polygons.length,
        selectedName: ((_a = this.selectedPolygon) == null ? void 0 : _a.name) || null,
        summaries: this.getSummaries().map((summary) => ({
          name: summary.polygon.name,
          area: Number(summary.area.toFixed(2)),
          perimeter: Number(summary.perimeter.toFixed(2)),
          primaryLabel: summary.analysis.primaryLabel,
          exactMatches: summary.analysis.exactMatches
        })),
        hintStage: this.hintStage
      };
    }
    notifyChange() {
      this.render();
      this.onChange(this.getDebugState());
    }
    hitVertex(worldPoint) {
      const threshold = Math.max(14, this.gridSize * 0.55);
      for (let i = this.polygons.length - 1; i >= 0; i -= 1) {
        const polygon = this.polygons[i];
        if (polygon.locked) continue;
        for (let vertexIndex = polygon.vertices.length - 1; vertexIndex >= 0; vertexIndex -= 1) {
          if (distance(worldPoint, polygon.vertices[vertexIndex]) <= threshold) {
            return { polygon, vertexIndex };
          }
        }
      }
      return null;
    }
    hitPolygon(worldPoint) {
      for (let i = this.polygons.length - 1; i >= 0; i -= 1) {
        const polygon = this.polygons[i];
        if (polygon.locked) continue;
        if (polygon.containsPoint(worldPoint)) {
          return polygon;
        }
      }
      return null;
    }
    handlePointerDown(event) {
      var _a, _b, _c, _d;
      if (this.readonly) return;
      if (event.button !== 0 && event.pointerType !== "touch") return;
      const worldPoint = this.screenToWorld(event.clientX, event.clientY);
      const hitVertex = this.hitVertex(worldPoint);
      if (hitVertex) {
        this.selectedPolygon = hitVertex.polygon;
        this.selectedVertexIndex = hitVertex.vertexIndex;
        this.drag = {
          type: "vertex",
          polygon: hitVertex.polygon,
          vertexIndex: hitVertex.vertexIndex
        };
        this.pointerId = event.pointerId;
        (_b = (_a = this.canvas).setPointerCapture) == null ? void 0 : _b.call(_a, event.pointerId);
        this.render();
        return;
      }
      const polygon = this.hitPolygon(worldPoint);
      if (polygon) {
        this.selectedPolygon = polygon;
        this.selectedVertexIndex = -1;
        this.drag = {
          type: "shape",
          polygon,
          start: worldPoint
        };
        this.pointerId = event.pointerId;
        (_d = (_c = this.canvas).setPointerCapture) == null ? void 0 : _d.call(_c, event.pointerId);
        this.render();
        return;
      }
      this.selectedPolygon = this.polygons.find((entry) => !entry.locked) || null;
      this.selectedVertexIndex = -1;
      this.render();
    }
    handlePointerMove(event) {
      if (!this.drag) return;
      if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
      const worldPoint = snapPointToGrid(this.screenToWorld(event.clientX, event.clientY), this.gridSize);
      if (this.drag.type === "vertex") {
        this.drag.polygon.vertices[this.drag.vertexIndex] = worldPoint;
        this.notifyChange();
        return;
      }
      if (this.drag.type === "shape") {
        const deltaX = worldPoint.x - this.drag.start.x;
        const deltaY = worldPoint.y - this.drag.start.y;
        if (deltaX === 0 && deltaY === 0) return;
        this.drag.polygon.move(deltaX, deltaY);
        this.drag.start = worldPoint;
        this.notifyChange();
      }
    }
    handlePointerUp(event) {
      var _a, _b;
      if (!this.drag) return;
      if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.drag = null;
      (_b = (_a = this.canvas).releasePointerCapture) == null ? void 0 : _b.call(_a, event.pointerId);
      this.saveHistory();
      this.notifyChange();
    }
    drawGrid() {
      const cols = Math.ceil(this.width / this.gridSize) + 4;
      const rows = Math.ceil(this.height / this.gridSize) + 4;
      this.ctx.save();
      this.ctx.strokeStyle = "rgba(21, 74, 123, 0.11)";
      this.ctx.lineWidth = 1;
      for (let col = -cols; col <= cols; col += 1) {
        const x = this.width / 2 + col * this.gridSize;
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.height);
        this.ctx.stroke();
      }
      for (let row = -rows; row <= rows; row += 1) {
        const y = this.height / 2 + row * this.gridSize;
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.width, y);
        this.ctx.stroke();
      }
      this.ctx.strokeStyle = "rgba(15, 103, 184, 0.18)";
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(this.width / 2, 0);
      this.ctx.lineTo(this.width / 2, this.height);
      this.ctx.moveTo(0, this.height / 2);
      this.ctx.lineTo(this.width, this.height / 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
    drawGuide() {
      if (this.hintStage < 2 || !this.taskGuide) return;
      const guidePolygons = (this.taskGuide.guideDefinitions || []).map((definition) => createPolygonFromDefinition(definition, {
        grid: this.gridSize
      }));
      if (!guidePolygons.length && this.taskGuide.guideShape) {
        guidePolygons.push(new Polygon(createShapeVertices(this.taskGuide.guideShape, {
          grid: this.gridSize,
          center: this.taskGuide.guideCenter || { x: 0, y: 0 },
          scale: this.taskGuide.guideScale
        }), {
          color: "#ffbf47",
          name: getShapeLabel(this.taskGuide.guideShape),
          locked: true,
          role: "guide"
        }));
      }
      this.ctx.save();
      this.ctx.setLineDash([10, 7]);
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = "rgba(255, 174, 51, 0.9)";
      this.ctx.fillStyle = "rgba(255, 174, 51, 0.12)";
      guidePolygons.forEach((polygon) => this.drawPolygonShape(polygon, { fill: true, handles: false, dashedOnly: true }));
      this.ctx.restore();
    }
    drawPolygonShape(polygon, options = {}) {
      if (!polygon.vertices.length) return;
      const screenVertices = polygon.vertices.map((vertex) => this.worldToScreen(vertex));
      this.ctx.beginPath();
      this.ctx.moveTo(screenVertices[0].x, screenVertices[0].y);
      for (let i = 1; i < screenVertices.length; i += 1) {
        this.ctx.lineTo(screenVertices[i].x, screenVertices[i].y);
      }
      this.ctx.closePath();
      if (options.fill !== false) {
        this.ctx.fillStyle = options.fillStyle || `${polygon.color}33`;
        this.ctx.fill();
      }
      this.ctx.strokeStyle = options.strokeStyle || polygon.color;
      this.ctx.lineWidth = options.lineWidth || 2.5;
      this.ctx.stroke();
      if (options.handles === false) return;
      polygon.vertices.forEach((vertex, index) => {
        const point = this.worldToScreen(vertex);
        const isSelected = polygon === this.selectedPolygon && index === this.selectedVertexIndex;
        this.ctx.beginPath();
        this.ctx.fillStyle = "#ffffff";
        this.ctx.strokeStyle = isSelected ? "#16314d" : polygon.color;
        this.ctx.lineWidth = isSelected ? 3 : 2;
        this.ctx.arc(point.x, point.y, isSelected ? 7 : 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      });
    }
    drawPolygonLabels() {
      this.ctx.save();
      this.ctx.font = '800 14px "Trebuchet MS", sans-serif';
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.polygons.forEach((polygon) => {
        if (!polygon.label) return;
        const center = this.worldToScreen(getPolygonCenter(polygon));
        this.ctx.beginPath();
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
        this.ctx.strokeStyle = "rgba(22, 49, 77, 0.12)";
        this.ctx.arc(center.x, center.y - 10, 18, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = "#16314d";
        this.ctx.fillText(polygon.label, center.x, center.y - 10);
      });
      this.ctx.restore();
    }
    drawMetricBadge() {
      var _a;
      if (this.hintStage < 2 || !((_a = this.taskGuide) == null ? void 0 : _a.showLiveMetric)) return;
      const summary = this.getPrimarySummary();
      if (!summary) return;
      const label = this.taskGuide.showLiveMetric === "area" ? `Area ${summary.area.toFixed(summary.area % 1 === 0 ? 0 : 1)}` : `Around ${summary.perimeter.toFixed(summary.perimeter % 1 === 0 ? 0 : 1)}`;
      this.ctx.save();
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
      this.ctx.strokeStyle = "rgba(22, 49, 77, 0.12)";
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.roundedRect(16, 16, 118, 44, 16);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.fillStyle = "#16314d";
      this.ctx.font = '800 14px "Trebuchet MS", sans-serif';
      this.ctx.fillText(label, 28, 42);
      this.ctx.restore();
    }
    roundedRect(x, y, width, height, radius) {
      this.ctx.moveTo(x + radius, y);
      this.ctx.arcTo(x + width, y, x + width, y + height, radius);
      this.ctx.arcTo(x + width, y + height, x, y + height, radius);
      this.ctx.arcTo(x, y + height, x, y, radius);
      this.ctx.arcTo(x, y, x + width, y, radius);
    }
    render() {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.drawGrid();
      this.drawGuide();
      this.polygons.forEach((polygon) => {
        const isSelected = polygon === this.selectedPolygon && !this.readonly;
        this.drawPolygonShape(polygon, {
          strokeStyle: isSelected ? "#16314d" : polygon.color,
          fillStyle: polygon.locked ? `${polygon.color}20` : `${polygon.color}35`,
          lineWidth: isSelected ? 3 : 2.5,
          handles: !polygon.locked && !this.readonly
        });
      });
      this.drawPolygonLabels();
      this.drawMetricBadge();
    }
  };

  // public/Games/Quiz it Polygon!/js/storage/profile-store.js
  var PROFILE_STORAGE_KEY = "quizItPolygon.profile.v2";
  var LEGACY_SETTINGS_KEY = "quizItPolygon.settings.v1";
  var LEGACY_PROGRESS_KEY = "quizItPolygon.progress.v1";
  function safeGetItem(key) {
    var _a, _b;
    try {
      return (_b = (_a = globalThis.localStorage) == null ? void 0 : _a.getItem(key)) != null ? _b : null;
    } catch (error) {
      return null;
    }
  }
  function safeSetItem(key, value) {
    var _a;
    try {
      (_a = globalThis.localStorage) == null ? void 0 : _a.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }
  function createDefaultProfile() {
    return {
      version: 2,
      settings: {
        sound: true,
        music: true,
        readAloud: false,
        bigText: false
      },
      unlockedWorld: 0,
      currentStreak: 0,
      badges: [],
      missions: {},
      stats: {
        missionsCleared: 0,
        legacyBestScore: 0,
        legacyRoundsPlayed: 0
      }
    };
  }
  function loadProfile() {
    try {
      const raw = safeGetItem(PROFILE_STORAGE_KEY);
      if (!raw) {
        const migrated = migrateLegacyProfile();
        saveProfile(migrated);
        return migrated;
      }
      const parsed = JSON.parse(raw);
      return normalizeProfile(parsed);
    } catch (error) {
      const fallback = migrateLegacyProfile();
      saveProfile(fallback);
      return fallback;
    }
  }
  function saveProfile(profile) {
    safeSetItem(PROFILE_STORAGE_KEY, JSON.stringify(normalizeProfile(profile)));
  }
  function resetProfile() {
    const profile = migrateLegacyProfile();
    saveProfile(profile);
    return profile;
  }
  function getMissionRecord(profile, missionId) {
    return profile.missions[missionId] || {
      cleared: false,
      stars: 0,
      bestMistakes: null,
      bestHintStage: null,
      plays: 0
    };
  }
  function setMissionRecord(profile, missionId, record) {
    profile.missions[missionId] = {
      ...getMissionRecord(profile, missionId),
      ...record
    };
  }
  function normalizeProfile(profile) {
    const base = createDefaultProfile();
    return {
      ...base,
      ...profile,
      settings: {
        ...base.settings,
        ...(profile == null ? void 0 : profile.settings) || {}
      },
      badges: Array.isArray(profile == null ? void 0 : profile.badges) ? [...new Set(profile.badges)] : [],
      missions: typeof (profile == null ? void 0 : profile.missions) === "object" && profile.missions ? profile.missions : {},
      stats: {
        ...base.stats,
        ...(profile == null ? void 0 : profile.stats) || {}
      }
    };
  }
  function migrateLegacyProfile() {
    const profile = createDefaultProfile();
    try {
      const legacySettings = JSON.parse(safeGetItem(LEGACY_SETTINGS_KEY) || "{}");
      profile.settings.sound = legacySettings.soundEnabled !== false;
      profile.settings.music = legacySettings.musicEnabled !== false;
    } catch (error) {
    }
    try {
      const legacyProgress = JSON.parse(safeGetItem(LEGACY_PROGRESS_KEY) || "{}");
      profile.stats.legacyBestScore = Number.isFinite(legacyProgress.bestScore) ? legacyProgress.bestScore : 0;
      profile.stats.legacyRoundsPlayed = Number.isFinite(legacyProgress.roundsPlayed) ? legacyProgress.roundsPlayed : 0;
    } catch (error) {
    }
    return profile;
  }

  // public/Games/Quiz it Polygon!/js/router.js
  var GameRouter = class {
    constructor(onChange) {
      this.onChange = typeof onChange === "function" ? onChange : () => {
      };
      this.screen = "menu";
      this.params = {};
    }
    go(screen, params = {}) {
      this.screen = screen;
      this.params = { ...params };
      this.onChange(this.getState());
    }
    getState() {
      return {
        screen: this.screen,
        params: { ...this.params }
      };
    }
  };

  // public/Games/Quiz it Polygon!/js/ui/renderers.js
  function escapeHtml(value) {
    return String(value != null ? value : "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function renderStars(count) {
    return `
        <span class="stars" aria-label="${count} stars">
            ${[0, 1, 2].map((index) => `<span class="${index < count ? "filled" : ""}">\u2605</span>`).join("")}
        </span>
    `;
  }
  function renderSettingsModal(state) {
    if (!state.showSettings) return "";
    const settingCard = (key, title, copy, on) => `
        <button class="setting-card" type="button" data-setting-toggle="${key}">
            <span class="setting-copy">
                <strong>${escapeHtml(title)}</strong>
                <span>${escapeHtml(copy)}</span>
            </span>
            <span class="toggle ${on ? "on" : ""}" aria-hidden="true"></span>
        </button>
    `;
    return `
        <div class="modal" data-close-modal="settings">
            <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
                <div class="modal-head">
                    <div>
                        <div class="eyebrow">Settings</div>
                        <h2 class="modal-title" id="settingsTitle">Make it feel right</h2>
                    </div>
                    <button class="icon-btn" type="button" data-close-modal="settings" aria-label="Close settings">\u2715</button>
                </div>
                <div class="setting-grid">
                    ${settingCard("sound", "Sound", "Happy tones and try again tones.", state.profile.settings.sound)}
                    ${settingCard("music", "Music", "Soft menu music.", state.profile.settings.music)}
                    ${settingCard("readAloud", "Read Aloud", "The game reads each task out loud.", state.profile.settings.readAloud)}
                    ${settingCard("bigText", "Big Text", "Larger words on every screen.", state.profile.settings.bigText)}
                </div>
                <div class="menu-actions">
                    <button class="ghost-btn" type="button" data-reset-progress="true">Reset Progress</button>
                    <button class="primary-btn" type="button" data-close-modal="settings">Done</button>
                    <button class="secondary-btn" type="button" data-speak-now="true">Read This Page</button>
                </div>
            </div>
        </div>
    `;
  }
  function renderShapePickerModal(state) {
    if (!state.showShapePicker) return "";
    return `
        <div class="modal" data-close-modal="shape-picker">
            <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="shapePickerTitle">
                <div class="modal-head">
                    <div>
                        <div class="eyebrow">Make Shape</div>
                        <h2 class="modal-title" id="shapePickerTitle">Pick a shape</h2>
                    </div>
                    <button class="icon-btn" type="button" data-close-modal="shape-picker" aria-label="Close shape picker">\u2715</button>
                </div>
                <div class="shape-picker">
                    <div class="shape-grid">
                        ${state.shapeChoices.map((choice) => `
                            <button class="shape-btn" type="button" data-shape-choice="${escapeHtml(choice.type)}">
                                <strong>${escapeHtml(choice.title)}</strong>
                                <span>${escapeHtml(choice.copy)}</span>
                            </button>
                        `).join("")}
                    </div>
                </div>
            </div>
        </div>
    `;
  }
  function renderMenuScreen(state) {
    const nextMission = state.nextMission ? `${state.nextMission.worldTitle}: ${state.nextMission.title}` : "Your first mission is ready.";
    return `
        <div class="app-shell screen-menu">
            <div class="top-strip">
                <div class="brand">
                    <div class="brand-bubble">\u25C6</div>
                    <div>
                        <div class="brand-title">Quiz it Polygon!</div>
                        <span class="brand-sub">Mission game for shapes, area, and perimeter.</span>
                    </div>
                </div>
                <div class="top-stats">
                    <span class="stat-chip">World ${state.profile.unlockedWorld + 1} open</span>
                    <span class="stat-chip">${state.profile.stats.missionsCleared} missions done</span>
                    <span class="stat-chip">${state.profile.badges.length} badges</span>
                </div>
            </div>

            <section class="menu-panel">
                <div class="menu-hero">
                    <div>
                        <div class="eyebrow">Make. Fix. Pick. Count. Measure.</div>
                        <h1 class="menu-title">Learn polygons by playing.</h1>
                        <p class="menu-subtitle">Each mission is short, clear, and hands-on. Drag shapes, solve fast tasks, and win stars on your map.</p>
                    </div>
                    <div class="menu-art" aria-hidden="true">
                        <div class="menu-float-shape shape-a"></div>
                        <div class="menu-float-shape shape-b"></div>
                        <div class="menu-float-shape shape-c"></div>
                    </div>
                </div>

                <div class="menu-info-row">
                    <div class="menu-info">
                        <strong>Fast Tasks</strong>
                        <span>3 quick tasks per mission.</span>
                    </div>
                    <div class="menu-info">
                        <strong>Stars</strong>
                        <span>Finish clean to earn 3 stars.</span>
                    </div>
                    <div class="menu-info">
                        <strong>Next Up</strong>
                        <span>${escapeHtml(nextMission)}</span>
                    </div>
                </div>

                <div class="menu-actions">
                    <button class="primary-btn" type="button" data-nav="play">Play</button>
                    <button class="secondary-btn" type="button" data-nav="map">My Map</button>
                    <button class="ghost-btn" type="button" data-open-modal="settings">Settings</button>
                </div>

                <div class="menu-footer">
                    <span class="mini-chip">Touch, mouse, and keyboard ready</span>
                    <span class="mini-chip">One local player save</span>
                </div>
            </section>
            ${renderSettingsModal(state)}
        </div>
    `;
  }
  function renderMapScreen(state) {
    return `
        <div class="app-shell screen-map">
            <div class="top-strip">
                <div class="brand">
                    <button class="icon-btn" type="button" data-nav="menu" aria-label="Back to menu">\u2190</button>
                    <div>
                        <div class="brand-title">My Map</div>
                        <span class="brand-sub">Clear worlds. Win stars. Unlock badges.</span>
                    </div>
                </div>
                <div class="top-stats">
                    <span class="stat-chip">Streak ${state.profile.currentStreak}</span>
                    <span class="stat-chip">${state.profile.badges.length} badges</span>
                    <button class="ghost-btn" type="button" data-open-modal="settings">Settings</button>
                </div>
            </div>

            <section class="screen-card map-panel">
                <div class="badge-row">
                    ${state.profile.badges.length ? state.profile.badges.map((badge) => `<span class="badge-pill">${escapeHtml(badge)}</span>`).join("") : '<span class="empty-note">Clear a boss mission to win your first badge.</span>'}
                </div>

                <div class="map-grid">
                    ${state.worlds.map((world) => `
                        <section class="map-world ${world.locked ? "locked" : ""}">
                            <div class="map-world-header">
                                <div>
                                    <div class="eyebrow">${escapeHtml(world.theme)}</div>
                                    <h2 class="map-world-title">${escapeHtml(world.title)}</h2>
                                    <p class="map-world-copy">${escapeHtml(world.copy)}</p>
                                </div>
                                <span class="world-badge">${world.completedStars}/${world.totalStars} \u2605</span>
                            </div>

                            <div class="mission-list">
                                ${world.missions.map((mission, index) => `
                                    <button
                                        type="button"
                                        class="mission-link ${mission.locked ? "locked" : ""}"
                                        data-start-mission="${world.id}:${mission.id}"
                                        ${world.locked || mission.locked ? "disabled" : ""}
                                    >
                                        <span class="mission-link-text">
                                            <strong>${index + 1}. ${escapeHtml(mission.title)}</strong>
                                            <small>${escapeHtml(mission.boss ? "Boss mission" : mission.short)}</small>
                                        </span>
                                        ${renderStars(mission.stars)}
                                    </button>
                                `).join("")}
                            </div>
                        </section>
                    `).join("")}
                </div>
            </section>
            ${renderSettingsModal(state)}
        </div>
    `;
  }
  function renderChoiceControls(task, state) {
    return `
        <div class="choice-grid">
            ${task.options.map((option) => `
                <button class="choice-btn ${state.lastWrongChoice === option ? "is-wrong" : ""}" type="button" data-choice="${escapeHtml(option)}">
                    ${escapeHtml(option)}
                </button>
            `).join("")}
        </div>
    `;
  }
  function renderNumberControls(task, state) {
    return `
        <div class="number-row">
            <input
                class="number-input"
                id="answerInput"
                type="number"
                inputmode="decimal"
                step="any"
                value="${escapeHtml(state.answerValue || "")}"
                placeholder="${escapeHtml(task.placeholder || "Type your answer")}"
            >
            <button class="primary-btn" type="button" data-check-number="true">Try</button>
        </div>
    `;
  }
  function renderTaskControls(task, state) {
    if (task.answerMode === "choice") {
      return renderChoiceControls(task, state);
    }
    if (task.answerMode === "number") {
      return renderNumberControls(task, state);
    }
    return `
        <div class="number-row">
            <div class="empty-note" style="flex: 1 1 180px;">Drag the shape on the board until it matches.</div>
            <button class="primary-btn" type="button" data-check-board="true">Try</button>
        </div>
    `;
  }
  function renderMissionScreen(state) {
    var _a;
    const world = state.activeWorld;
    const mission = state.activeMission;
    const task = state.activeTask;
    const canEditBoard = ((_a = task.board) == null ? void 0 : _a.editable) !== false;
    const answerModeClass = task.answerMode ? `answer-${task.answerMode}` : "";
    const nextHintText = state.hintStage === 0 ? "Tap Help for a clue." : state.hintStage === 1 ? task.hintLadder[0] : state.hintStage === 2 ? task.hintLadder[1] : task.hintLadder[2];
    const feedbackClass = state.feedback.kind === "good" ? "good" : state.feedback.kind === "try" ? "try" : "";
    const primarySummary = state.boardSummary;
    return `
        <div class="app-shell screen-mission ${answerModeClass}">
            <div class="top-strip">
                <div class="brand">
                    <button class="icon-btn" type="button" data-nav="map" aria-label="Back to map">\u2190</button>
                    <div>
                        <div class="brand-title">${escapeHtml(world.title)}</div>
                        <span class="brand-sub">${escapeHtml(mission.title)}</span>
                    </div>
                </div>
                <div class="top-stats">
                    <span class="stat-chip">Task ${state.taskIndex + 1}/3</span>
                    <span class="stat-chip">Hints ${state.maxHintStageUsed}</span>
                    <span class="stat-chip">Tries ${state.mistakes}</span>
                    <button class="ghost-btn" type="button" data-open-modal="settings">Settings</button>
                </div>
            </div>

            <div class="mission-layout">
                <section class="board-panel">
                    <div class="board-stage">
                        <div id="boardCanvasSlot" class="board-canvas"></div>
                        <div class="board-overlay">
                            <div class="board-note-stack">
                                <div class="board-note">${escapeHtml(task.boardNote || "Move the shape on the grid.")}</div>
                                ${state.hintStage >= 2 && task.visualNote ? `<div class="board-note">${escapeHtml(task.visualNote)}</div>` : ""}
                            </div>
                            <div class="board-note-stack">
                                <div class="board-note">${escapeHtml(task.modeTitle)}</div>
                            </div>
                        </div>
                    </div>

                    <div class="tool-dock">
                        <button class="tool-btn" type="button" data-open-modal="shape-picker" ${canEditBoard ? "" : "disabled"}>
                            <span>\u2B20</span><small>Make Shape</small>
                        </button>
                        <button class="tool-btn active" type="button" data-board-tool="move" ${canEditBoard ? "" : "disabled"}>
                            <span>\u270B</span><small>Move</small>
                        </button>
                        <button class="tool-btn" type="button" data-board-action="undo" ${canEditBoard ? "" : "disabled"}>
                            <span>\u21B6</span><small>Undo</small>
                        </button>
                        <button class="tool-btn" type="button" data-board-action="reset" ${canEditBoard ? "" : "disabled"}>
                            <span>\u21BA</span><small>Reset</small>
                        </button>
                        <button class="tool-btn" type="button" data-use-help="true">
                            <span>\u{1F4A1}</span><small>Help</small>
                        </button>
                    </div>
                </section>

                <aside class="mission-card">
                    <div class="mission-head">
                        <div class="eyebrow">${escapeHtml(world.title)} \u2022 Mission ${state.missionIndex + 1}</div>
                        <h1 class="mission-title">${escapeHtml(mission.title)}</h1>
                        <p class="mission-copy">${escapeHtml(mission.intro)}</p>
                    </div>

                    <div class="mission-progress">
                        <div class="task-dots">
                            ${[0, 1, 2].map((index) => `
                                <span class="task-dot ${index < state.taskIndex ? "done" : index === state.taskIndex ? "live" : ""}"></span>
                            `).join("")}
                        </div>
                        <span class="task-tag">${escapeHtml(task.modeTitle)}</span>
                    </div>

                    <section class="task-card">
                        <div class="task-copy">
                            <h2 class="task-prompt">${escapeHtml(task.prompt)}</h2>
                            <p class="task-help">${escapeHtml(task.shortHelp)}</p>
                        </div>

                        ${renderTaskControls(task, state)}

                        <div class="task-hint-panel">
                            <strong>Help</strong>
                            <p class="task-help">${escapeHtml(nextHintText)}</p>
                        </div>

                        ${state.feedback.message ? `
                            <div class="task-feedback ${feedbackClass}">
                                ${escapeHtml(state.feedback.message)}
                            </div>
                        ` : ""}

                        <div class="task-side-box">
                            <strong>Live Shape</strong>
                            <div data-live-shape>
                            ${primarySummary ? `
                                <div class="live-metrics">
                                    <div class="live-metric">
                                        <strong>Name</strong>
                                        <span>${escapeHtml(primarySummary.analysis.primaryLabel)}</span>
                                    </div>
                                    <div class="live-metric">
                                        <strong>Sides</strong>
                                        <span>${primarySummary.vertices}</span>
                                    </div>
                                    <div class="live-metric">
                                        <strong>Area</strong>
                                        <span>${primarySummary.area.toFixed(primarySummary.area % 1 === 0 ? 0 : 1)}</span>
                                    </div>
                                    <div class="live-metric">
                                        <strong>Around</strong>
                                        <span>${primarySummary.perimeter.toFixed(primarySummary.perimeter % 1 === 0 ? 0 : 1)}</span>
                                    </div>
                                </div>
                            ` : '<div class="empty-note">This task starts with an empty board. Use Make Shape when you are ready.</div>'}
                            </div>
                        </div>
                    </section>
                </aside>
            </div>
            ${renderSettingsModal(state)}
            ${renderShapePickerModal(state)}
        </div>
    `;
  }
  function renderResultsScreen(state) {
    return `
        <div class="app-shell result-wrap">
            <section class="result-panel">
                <div class="eyebrow">Mission Clear</div>
                <h1 class="menu-title" style="font-size: clamp(2rem, 5vw, 3.3rem);">${escapeHtml(state.activeMission.title)}</h1>
                <p class="summary-copy">${escapeHtml(state.resultMessage)}</p>

                <div class="summary-stars" aria-label="${state.stars} stars won">
                    ${[0, 1, 2].map((index) => `<span class="summary-star ${index < state.stars ? "on" : ""}">\u2605</span>`).join("")}
                </div>

                <div class="summary-grid">
                    <div class="summary-box">
                        <strong>Stars</strong>
                        <span>${state.stars}</span>
                    </div>
                    <div class="summary-box">
                        <strong>Tries</strong>
                        <span>${state.mistakes}</span>
                    </div>
                    <div class="summary-box">
                        <strong>Help</strong>
                        <span>${state.maxHintStageUsed}</span>
                    </div>
                </div>

                <div class="menu-actions">
                    <button class="primary-btn" type="button" data-results-action="next">Play Next</button>
                    <button class="secondary-btn" type="button" data-results-action="replay">Play Again</button>
                    <button class="ghost-btn" type="button" data-results-action="map">My Map</button>
                </div>
            </section>
            ${renderSettingsModal(state)}
        </div>
    `;
  }

  // public/Games/Quiz it Polygon!/js/main.js
  var QuizItPolygonApp = class {
    constructor(root) {
      this.root = root;
      this.profile = loadProfile();
      this.router = new GameRouter(() => this.render());
      this.showSettings = false;
      this.showShapePicker = false;
      this.board = null;
      this.boardCanvas = null;
      this.boardSummary = null;
      this.boardCheckTimer = null;
      this.numberCheckTimer = null;
      this.advanceTimer = null;
      this.audioContext = null;
      this.musicTimer = null;
      this.didInteract = false;
      this.feedback = { kind: "", message: "" };
      this.answerValue = "";
      this.lastWrongChoice = "";
      this.activeRun = null;
      this.resultState = null;
      this.shapeChoices = getShapeChoices();
      document.body.classList.toggle("big-text", this.profile.settings.bigText);
      this.render();
    }
    getState() {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
      const route = this.router.getState();
      const worlds = this.getWorldViewModels();
      const activeWorld = this.activeRun ? getWorldById(this.activeRun.worldId) : this.resultState ? getWorldById(this.resultState.worldId) : null;
      const activeMission = this.activeRun ? getMissionById(this.activeRun.worldId, this.activeRun.missionId) : this.resultState ? getMissionById(this.resultState.worldId, this.resultState.missionId) : null;
      return {
        route,
        screen: route.screen,
        params: route.params,
        profile: this.profile,
        worlds,
        showSettings: this.showSettings,
        showShapePicker: this.showShapePicker,
        nextMission: this.findNextMission(),
        activeWorld,
        activeMission,
        activeTask: this.activeRun ? this.activeRun.tasks[this.activeRun.taskIndex] : null,
        missionIndex: this.activeRun ? getWorldById(this.activeRun.worldId).missions.findIndex((mission) => mission.id === this.activeRun.missionId) : -1,
        taskIndex: ((_a = this.activeRun) == null ? void 0 : _a.taskIndex) || 0,
        hintStage: ((_b = this.activeRun) == null ? void 0 : _b.hintStage) || 0,
        maxHintStageUsed: (_f = (_e = (_c = this.activeRun) == null ? void 0 : _c.maxHintStageUsed) != null ? _e : (_d = this.resultState) == null ? void 0 : _d.maxHintStageUsed) != null ? _f : 0,
        mistakes: (_j = (_i = (_g = this.activeRun) == null ? void 0 : _g.mistakes) != null ? _i : (_h = this.resultState) == null ? void 0 : _h.mistakes) != null ? _j : 0,
        answerValue: this.answerValue,
        lastWrongChoice: this.lastWrongChoice,
        feedback: this.feedback,
        boardSummary: this.boardSummary,
        resultMessage: ((_k = this.resultState) == null ? void 0 : _k.message) || "",
        stars: ((_l = this.resultState) == null ? void 0 : _l.stars) || 0,
        shapeChoices: this.shapeChoices
      };
    }
    render() {
      const state = this.getState();
      document.body.classList.toggle("big-text", this.profile.settings.bigText);
      if (state.screen === "menu") {
        this.root.innerHTML = renderMenuScreen(state);
      } else if (state.screen === "map") {
        this.root.innerHTML = renderMapScreen(state);
      } else if (state.screen === "mission") {
        this.root.innerHTML = renderMissionScreen(state);
      } else if (state.screen === "results") {
        this.root.innerHTML = renderResultsScreen(state);
      }
      this.bindEvents();
      this.mountBoardIfNeeded();
      this.refreshLiveMissionBits();
      this.syncMusicLoop();
    }
    bindEvents() {
      this.root.onclick = (event) => {
        var _a, _b, _c;
        const target = event.target.closest("button");
        if (!target) {
          const modal = event.target.closest("[data-close-modal]");
          if (modal && event.target === modal) {
            this.closeModal(modal.dataset.closeModal);
          }
          return;
        }
        this.noteInteraction();
        const nav = target.dataset.nav;
        if (nav === "menu") {
          this.router.go("menu");
          return;
        }
        if (nav === "map") {
          this.router.go("map");
          return;
        }
        if (nav === "play") {
          this.startNextMission();
          return;
        }
        const modalName = target.dataset.openModal;
        if (modalName) {
          this.openModal(modalName);
          return;
        }
        const closeModal = target.dataset.closeModal;
        if (closeModal) {
          this.closeModal(closeModal);
          return;
        }
        if (target.dataset.startMission) {
          const [worldId, missionId] = target.dataset.startMission.split(":");
          this.startMission(worldId, missionId);
          return;
        }
        if (target.dataset.choice) {
          this.handleChoice(target.dataset.choice);
          return;
        }
        if (target.dataset.checkNumber) {
          this.checkNumber(true);
          return;
        }
        if (target.dataset.checkBoard) {
          this.checkBoardManual();
          return;
        }
        if (target.dataset.useHelp) {
          this.useHelp();
          return;
        }
        if (target.dataset.boardAction === "undo") {
          (_a = this.board) == null ? void 0 : _a.undo();
          return;
        }
        if (target.dataset.boardAction === "reset") {
          (_b = this.board) == null ? void 0 : _b.reset();
          return;
        }
        if (target.dataset.boardTool === "move") {
          (_c = this.board) == null ? void 0 : _c.setMode("move");
          return;
        }
        if (target.dataset.settingToggle) {
          this.toggleSetting(target.dataset.settingToggle);
          return;
        }
        if (target.dataset.resetProgress) {
          this.handleResetProgress();
          return;
        }
        if (target.dataset.speakNow) {
          this.speak(this.getSpeakText());
          return;
        }
        if (target.dataset.shapeChoice) {
          this.pickShape(target.dataset.shapeChoice);
          return;
        }
        const resultAction = target.dataset.resultsAction;
        if (resultAction === "next") {
          this.handleResultNext();
          return;
        }
        if (resultAction === "replay") {
          if (this.resultState) {
            this.startMission(this.resultState.worldId, this.resultState.missionId, true);
          }
          return;
        }
        if (resultAction === "map") {
          this.router.go("map");
        }
      };
      this.root.oninput = (event) => {
        if (event.target.id === "answerInput") {
          this.answerValue = event.target.value;
          this.scheduleNumberAutoCheck();
        }
      };
      this.root.onkeydown = (event) => {
        if (event.target.id === "answerInput" && event.key === "Enter") {
          event.preventDefault();
          this.checkNumber(true);
        }
      };
    }
    mountBoardIfNeeded() {
      if (this.router.screen !== "mission" || !this.activeRun) {
        return;
      }
      const slot = this.root.querySelector("#boardCanvasSlot");
      if (!slot) return;
      if (!this.boardCanvas) {
        this.boardCanvas = document.createElement("canvas");
        this.boardCanvas.id = "boardCanvas";
        this.boardCanvas.className = "board-canvas";
      }
      slot.replaceChildren(this.boardCanvas);
      if (!this.board) {
        this.board = new PolygonBoard(this.boardCanvas, {
          onChange: () => this.handleBoardChange()
        });
      } else {
        this.board.resize();
      }
      if (this.activeRun.needsBoardLoad) {
        this.board.loadTaskBoard(this.activeRun.tasks[this.activeRun.taskIndex].board);
        this.board.setHintStage(this.activeRun.hintStage);
        this.boardSummary = this.board.getPrimarySummary();
        this.activeRun.needsBoardLoad = false;
      }
    }
    refreshLiveMissionBits() {
      if (this.router.screen !== "mission") return;
      const state = this.getState();
      const summaryBox = this.root.querySelector("[data-live-shape]");
      if (summaryBox) {
        const summary = state.boardSummary;
        summaryBox.innerHTML = summary ? `
                    <div class="live-metrics">
                        <div class="live-metric"><strong>Name</strong><span>${summary.analysis.primaryLabel}</span></div>
                        <div class="live-metric"><strong>Sides</strong><span>${summary.vertices}</span></div>
                        <div class="live-metric"><strong>Area</strong><span>${summary.area.toFixed(summary.area % 1 === 0 ? 0 : 1)}</span></div>
                        <div class="live-metric"><strong>Around</strong><span>${summary.perimeter.toFixed(summary.perimeter % 1 === 0 ? 0 : 1)}</span></div>
                    </div>
                ` : '<div class="empty-note">This task starts with an empty board. Use Make Shape when you are ready.</div>';
      }
    }
    openModal(name) {
      if (name === "settings") {
        this.showSettings = true;
      }
      if (name === "shape-picker" && this.router.screen === "mission") {
        this.showShapePicker = true;
      }
      this.render();
    }
    closeModal(name) {
      if (name === "settings") this.showSettings = false;
      if (name === "shape-picker") this.showShapePicker = false;
      this.render();
    }
    handleResetProgress() {
      if (!window.confirm("Reset your stars, badges, and saved path?")) {
        return;
      }
      this.profile = resetProfile();
      this.activeRun = null;
      this.resultState = null;
      this.showSettings = false;
      this.showShapePicker = false;
      this.feedback = { kind: "", message: "" };
      this.answerValue = "";
      this.lastWrongChoice = "";
      saveProfile(this.profile);
      this.router.go("menu");
    }
    toggleSetting(key) {
      this.profile.settings[key] = !this.profile.settings[key];
      saveProfile(this.profile);
      if (key === "bigText") {
        document.body.classList.toggle("big-text", this.profile.settings.bigText);
      }
      if (key === "music") {
        this.syncMusicLoop();
      }
      if (key === "readAloud") {
        this.speak(this.getSpeakText());
      }
      this.render();
    }
    getSpeakText() {
      if (this.router.screen === "mission" && this.activeRun) {
        const task = this.activeRun.tasks[this.activeRun.taskIndex];
        return `${this.activeRun.missionTitle}. ${task.prompt}`;
      }
      if (this.router.screen === "map") {
        return "This is your world map. Pick a mission to play.";
      }
      if (this.router.screen === "results" && this.resultState) {
        return `${this.resultState.message}. You won ${this.resultState.stars} stars.`;
      }
      return "Quiz it Polygon. Make shapes, fix shapes, count, and measure.";
    }
    speak(text) {
      if (!("speechSynthesis" in window)) return;
      if (!this.profile.settings.readAloud && text !== this.getSpeakText()) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.98;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    }
    noteInteraction() {
      this.didInteract = true;
      this.ensureAudioContext();
      this.syncMusicLoop();
    }
    ensureAudioContext() {
      if (this.audioContext) {
        if (this.audioContext.state === "suspended") {
          void this.audioContext.resume();
        }
        return this.audioContext;
      }
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return null;
      this.audioContext = new AudioContextCtor();
      return this.audioContext;
    }
    playTone(frequency, duration, type = "sine", gainValue = 0.018, delay = 0) {
      if (!this.profile.settings.sound) return;
      const ctx = this.ensureAudioContext();
      if (!ctx) return;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
      gain.gain.setValueAtTime(1e-4, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + delay + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime + delay);
      oscillator.stop(ctx.currentTime + delay + duration + 0.03);
    }
    playSuccessTone() {
      this.playTone(523.25, 0.18, "triangle", 0.024);
      this.playTone(659.25, 0.22, "sine", 0.018, 0.08);
    }
    playTryTone() {
      this.playTone(230, 0.22, "sawtooth", 0.018);
      this.playTone(180, 0.26, "triangle", 0.016, 0.08);
    }
    syncMusicLoop() {
      if (this.musicTimer) {
        clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
      const shouldPlay = this.didInteract && this.profile.settings.music && ["menu", "map", "results"].includes(this.router.screen);
      if (!shouldPlay) return;
      const pulse = () => {
        const ctx = this.ensureAudioContext();
        if (!ctx || !this.profile.settings.music) return;
        this.playTone(220, 0.28, "triangle", 0.012);
        this.playTone(294, 0.16, "sine", 8e-3, 0.12);
        this.playTone(262, 0.16, "sine", 8e-3, 0.3);
      };
      pulse();
      this.musicTimer = window.setInterval(pulse, 2400);
    }
    getWorldViewModels() {
      return WORLDS.map((world, worldIndex) => {
        const worldLocked = worldIndex > this.profile.unlockedWorld;
        const regularCleared = world.missions.filter((mission) => !mission.boss).every((mission) => getMissionRecord(this.profile, mission.id).cleared);
        const missions = world.missions.map((mission) => {
          const record = getMissionRecord(this.profile, mission.id);
          const missionLocked = worldLocked || mission.boss && !regularCleared;
          return {
            ...mission,
            stars: record.stars,
            locked: missionLocked
          };
        });
        return {
          ...world,
          locked: worldLocked,
          completedStars: missions.reduce((sum, mission) => sum + mission.stars, 0),
          totalStars: missions.length * 3,
          missions
        };
      });
    }
    findNextMission(fromWorldId = null, fromMissionId = null) {
      const worlds = this.getWorldViewModels();
      const flat = worlds.flatMap((world) => world.missions.map((mission) => ({
        worldId: world.id,
        worldTitle: world.title,
        title: mission.title,
        missionId: mission.id,
        locked: world.locked || mission.locked,
        cleared: getMissionRecord(this.profile, mission.id).cleared
      })));
      if (fromWorldId && fromMissionId) {
        const startIndex = flat.findIndex((entry) => entry.worldId === fromWorldId && entry.missionId === fromMissionId);
        for (let index = startIndex + 1; index < flat.length; index += 1) {
          if (!flat[index].locked) return flat[index];
        }
      }
      const firstUncleared = flat.find((entry) => !entry.locked && !entry.cleared);
      return firstUncleared || flat.find((entry) => !entry.locked) || null;
    }
    startNextMission() {
      const next = this.findNextMission();
      if (!next) return;
      this.startMission(next.worldId, next.missionId);
    }
    startMission(worldId, missionId, forceReplay = false) {
      const world = getWorldById(worldId);
      const mission = getMissionById(worldId, missionId);
      if (!world || !mission) return;
      const worldIndex = WORLDS.findIndex((entry) => entry.id === worldId);
      const regularCleared = world.missions.filter((entry) => !entry.boss).every((entry) => getMissionRecord(this.profile, entry.id).cleared);
      if (worldIndex > this.profile.unlockedWorld) return;
      if (mission.boss && !regularCleared) return;
      const replay = forceReplay || getMissionRecord(this.profile, missionId).cleared;
      this.activeRun = {
        worldId,
        missionId,
        missionTitle: mission.title,
        tasks: buildMissionTasks(world, mission, replay),
        taskIndex: 0,
        hintStage: 0,
        maxHintStageUsed: 0,
        mistakes: 0,
        replay
      };
      this.resultState = null;
      this.showShapePicker = false;
      this.showSettings = false;
      this.feedback = { kind: "", message: "" };
      this.answerValue = "";
      this.lastWrongChoice = "";
      this.prepareTask();
      this.router.go("mission", { worldId, missionId });
    }
    prepareTask() {
      if (!this.activeRun) return;
      this.activeRun.hintStage = 0;
      this.answerValue = "";
      this.lastWrongChoice = "";
      this.feedback = { kind: "", message: "" };
      this.activeRun.needsBoardLoad = true;
      this.clearTimers();
      this.render();
      if (this.profile.settings.readAloud) {
        const task = this.activeRun.tasks[this.activeRun.taskIndex];
        this.speak(task.prompt);
      }
    }
    clearTimers() {
      clearTimeout(this.boardCheckTimer);
      clearTimeout(this.numberCheckTimer);
      clearTimeout(this.advanceTimer);
      this.boardCheckTimer = null;
      this.numberCheckTimer = null;
      this.advanceTimer = null;
    }
    handleBoardChange() {
      var _a;
      this.boardSummary = ((_a = this.board) == null ? void 0 : _a.getPrimarySummary()) || null;
      this.refreshLiveMissionBits();
      if (!this.activeRun) return;
      const task = this.activeRun.tasks[this.activeRun.taskIndex];
      if (task.answerMode !== "board") return;
      clearTimeout(this.boardCheckTimer);
      this.boardCheckTimer = window.setTimeout(() => {
        const result = this.validateBoardTask(task);
        if (result.correct) {
          this.completeTask(result.message || task.celebrationText);
        }
      }, 240);
    }
    validateBoardTask(task) {
      var _a;
      const summaries = ((_a = this.board) == null ? void 0 : _a.getSummaries()) || [];
      const editableSummaries = summaries.filter((summary) => !summary.polygon.locked);
      if (!editableSummaries.length) {
        return { correct: false, message: "Make or move a shape first." };
      }
      const matched = editableSummaries.find((summary) => {
        var _a2;
        const primary = summary.analysis.primaryLabel;
        const exactMatches = summary.analysis.exactMatches || [];
        const families = summary.analysis.familyLabels || [];
        if ((_a2 = task.success.rejectPrimary) == null ? void 0 : _a2.includes(primary)) return false;
        if (task.success.primary && primary !== task.success.primary) return false;
        if (task.success.exact && !(exactMatches.includes(task.success.exact) || primary === task.success.exact)) return false;
        if (task.success.family && !families.includes(task.success.family)) return false;
        return true;
      });
      if (!matched) {
        return { correct: false, message: "That shape does not match yet." };
      }
      return {
        correct: true,
        message: task.celebrationText || `Nice! You made ${matched.analysis.primaryLabel}.`
      };
    }
    checkBoardManual() {
      if (!this.activeRun) return;
      const task = this.activeRun.tasks[this.activeRun.taskIndex];
      const result = this.validateBoardTask(task);
      if (result.correct) {
        this.completeTask(result.message);
      } else {
        this.registerMistake(result.message);
      }
    }
    handleChoice(option) {
      if (!this.activeRun) return;
      const task = this.activeRun.tasks[this.activeRun.taskIndex];
      if (task.answerMode !== "choice") return;
      if (option === task.success.answer) {
        this.completeTask(task.celebrationText || "Nice pick!");
        return;
      }
      this.lastWrongChoice = option;
      this.registerMistake("Try again. Look at the clue on the board.");
    }
    scheduleNumberAutoCheck() {
      if (!this.activeRun) return;
      const task = this.activeRun.tasks[this.activeRun.taskIndex];
      if (task.answerMode !== "number") return;
      clearTimeout(this.numberCheckTimer);
      this.numberCheckTimer = window.setTimeout(() => this.checkNumber(false), 220);
    }
    checkNumber(manual) {
      var _a;
      if (!this.activeRun) return;
      const task = this.activeRun.tasks[this.activeRun.taskIndex];
      if (task.answerMode !== "number") return;
      const value = Number.parseFloat(this.answerValue);
      if (!Number.isFinite(value)) {
        if (manual) this.registerMistake("Type a number first.");
        return;
      }
      const summary = this.boardSummary || ((_a = this.board) == null ? void 0 : _a.getPrimarySummary());
      const target = summary ? summary[task.success.metric] : Number.NaN;
      const correct = Number.isFinite(target) && Math.abs(value - target) <= task.success.tolerance;
      if (correct) {
        this.completeTask(task.celebrationText || "You measured it!");
      } else if (manual) {
        this.registerMistake(`Try again. Check the ${task.success.metric === "area" ? "inside space" : "outside path"} one more time.`);
      }
    }
    useHelp() {
      var _a;
      if (!this.activeRun) return;
      this.activeRun.hintStage = Math.min(3, this.activeRun.hintStage + 1);
      this.activeRun.maxHintStageUsed = Math.max(this.activeRun.maxHintStageUsed, this.activeRun.hintStage);
      (_a = this.board) == null ? void 0 : _a.setHintStage(this.activeRun.hintStage);
      const task = this.activeRun.tasks[this.activeRun.taskIndex];
      this.feedback = {
        kind: "try",
        message: task.hintLadder[Math.max(0, this.activeRun.hintStage - 1)]
      };
      if (this.profile.settings.readAloud) {
        this.speak(this.feedback.message);
      }
      this.render();
    }
    registerMistake(message) {
      if (!this.activeRun) return;
      this.activeRun.mistakes += 1;
      this.feedback = { kind: "try", message };
      this.playTryTone();
      this.render();
    }
    completeTask(message) {
      if (!this.activeRun) return;
      this.feedback = { kind: "good", message };
      this.playSuccessTone();
      this.render();
      this.advanceTimer = window.setTimeout(() => {
        if (!this.activeRun) return;
        if (this.activeRun.taskIndex < this.activeRun.tasks.length - 1) {
          this.activeRun.taskIndex += 1;
          this.prepareTask();
          return;
        }
        this.finishMission();
      }, 850);
    }
    finishMission() {
      if (!this.activeRun) return;
      const { worldId, missionId, mistakes, maxHintStageUsed } = this.activeRun;
      const world = getWorldById(worldId);
      const mission = getMissionById(worldId, missionId);
      const previousRecord = getMissionRecord(this.profile, missionId);
      const stars = this.calculateStars(mistakes, maxHintStageUsed);
      const firstClear = !previousRecord.cleared;
      setMissionRecord(this.profile, missionId, {
        cleared: true,
        plays: (previousRecord.plays || 0) + 1,
        stars: Math.max(previousRecord.stars || 0, stars),
        bestMistakes: previousRecord.bestMistakes === null ? mistakes : Math.min(previousRecord.bestMistakes, mistakes),
        bestHintStage: previousRecord.bestHintStage === null ? maxHintStageUsed : Math.min(previousRecord.bestHintStage, maxHintStageUsed)
      });
      if (firstClear) {
        this.profile.stats.missionsCleared += 1;
      }
      this.profile.currentStreak += 1;
      const worldIndex = WORLDS.findIndex((entry) => entry.id === worldId);
      if (mission.boss) {
        this.profile.unlockedWorld = Math.max(this.profile.unlockedWorld, Math.min(worldIndex + 1, WORLDS.length - 1));
        if (!this.profile.badges.includes(world.badge)) {
          this.profile.badges.push(world.badge);
        }
      }
      saveProfile(this.profile);
      this.resultState = {
        worldId,
        missionId,
        stars,
        mistakes,
        maxHintStageUsed,
        message: stars === 3 ? "Star job! You cleared that mission with a clean run." : stars === 2 ? "Nice work! You earned 2 stars." : "Good job! You finished the mission."
      };
      this.activeRun = null;
      this.feedback = { kind: "", message: "" };
      this.answerValue = "";
      this.lastWrongChoice = "";
      this.showShapePicker = false;
      this.router.go("results", { worldId, missionId });
    }
    calculateStars(mistakes, maxHintStageUsed) {
      if (mistakes === 0 && maxHintStageUsed <= 1) return 3;
      if (mistakes <= 1) return 2;
      return 1;
    }
    handleResultNext() {
      if (!this.resultState) return;
      const next = this.findNextMission(this.resultState.worldId, this.resultState.missionId);
      if (next) {
        this.startMission(next.worldId, next.missionId);
        return;
      }
      this.router.go("map");
    }
    pickShape(shapeType) {
      var _a;
      (_a = this.board) == null ? void 0 : _a.createOrReplaceShape(shapeType);
      this.showShapePicker = false;
      this.render();
    }
  };
  var app = new QuizItPolygonApp(document.getElementById("app"));
  window.quizItPolygonApp = app;
  window.render_game_to_text = () => {
    var _a, _b, _c, _d, _e, _f, _g;
    return JSON.stringify({
      screen: app.router.screen,
      world: ((_a = app.activeRun) == null ? void 0 : _a.worldId) || ((_b = app.resultState) == null ? void 0 : _b.worldId) || null,
      mission: ((_c = app.activeRun) == null ? void 0 : _c.missionId) || ((_d = app.resultState) == null ? void 0 : _d.missionId) || null,
      taskIndex: (_f = (_e = app.activeRun) == null ? void 0 : _e.taskIndex) != null ? _f : null,
      prompt: app.activeRun ? app.activeRun.tasks[app.activeRun.taskIndex].prompt : null,
      feedback: app.feedback,
      profile: {
        unlockedWorld: app.profile.unlockedWorld,
        missionsCleared: app.profile.stats.missionsCleared,
        badges: app.profile.badges
      },
      board: ((_g = app.board) == null ? void 0 : _g.getDebugState()) || null
    });
  };
  window.advanceTime = async (ms = 16) => new Promise((resolve) => window.setTimeout(resolve, ms));
})();
