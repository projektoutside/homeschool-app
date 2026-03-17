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
    hexagon: "#5d7cff",
    heptagon: "#5f90ff",
    octagon: "#ff8c42",
    kite: "#ff5f8f"
  };
  var shapeChoices = [
    { type: "triangle", title: "Triangle", copy: "3 sides" },
    { type: "square", title: "Square", copy: "4 same sides" },
    { type: "rectangle", title: "Rectangle", copy: "4 square corners" },
    { type: "parallelogram", title: "Parallelogram", copy: "2 side pairs match" },
    { type: "trapezoid", title: "Trapezoid", copy: "1 side pair matches" },
    { type: "rhombus", title: "Rhombus", copy: "4 same sides" },
    { type: "pentagon", title: "Pentagon", copy: "5 sides" },
    { type: "hexagon", title: "Hexagon", copy: "6 sides" },
    { type: "heptagon", title: "Heptagon", copy: "7 sides" },
    { type: "octagon", title: "Octagon", copy: "8 sides" }
  ];
  function def(shapeType, extra = {}) {
    return {
      shapeType,
      color: palette[shapeType] || "#4f8cff",
      name: extra.name || shapeType,
      ...extra
    };
  }
  function custom(vertices, extra = {}) {
    return {
      vertices,
      color: extra.color || "#4f8cff",
      name: extra.name || "Shape",
      ...extra
    };
  }
  var ISOSCELES_TRAPEZOID_GUIDE = custom([
    { x: -72, y: 42 },
    { x: 72, y: 42 },
    { x: 42, y: -42 },
    { x: -42, y: -42 }
  ], { name: "Isosceles Trapezoid", color: palette.trapezoid });
  var KITE_GUIDE = custom([
    { x: 0, y: -72 },
    { x: 48, y: -12 },
    { x: 0, y: 72 },
    { x: -72, y: -12 }
  ], { name: "Kite", color: palette.kite });
  var RHOMBUS_GUIDE = custom([
    { x: 0, y: -48 },
    { x: 72, y: 0 },
    { x: 0, y: 48 },
    { x: -72, y: 0 }
  ], { name: "Rhombus", color: palette.rhombus });
  var CONCAVE_PENTAGON_GUIDE = custom([
    { x: 0, y: -72 },
    { x: 72, y: -24 },
    { x: 24, y: 0 },
    { x: 48, y: 72 },
    { x: -72, y: 48 }
  ], { name: "Concave Pentagon", color: palette.pentagon });
  var CONCAVE_HEXAGON_GUIDE = custom([
    { x: -72, y: -48 },
    { x: 24, y: -48 },
    { x: 24, y: -12 },
    { x: 72, y: 0 },
    { x: 24, y: 48 },
    { x: -72, y: 48 }
  ], { name: "Concave Hexagon", color: palette.hexagon });
  var ISOSCELES_TRIANGLE_GUIDE = custom([
    { x: -48, y: 48 },
    { x: 48, y: 48 },
    { x: 0, y: -48 }
  ], { name: "Isosceles Triangle", color: palette.triangle });
  var SCALENE_TRIANGLE_GUIDE = custom([
    { x: -72, y: 48 },
    { x: 48, y: 48 },
    { x: -24, y: -36 }
  ], { name: "Scalene Triangle", color: palette.triangle });
  var ISOSCELES_RIGHT_TRIANGLE_GUIDE = custom([
    { x: -48, y: 48 },
    { x: 48, y: 48 },
    { x: -48, y: -48 }
  ], { name: "Isosceles Right Triangle", color: palette["right-triangle"] });
  var OBTUSE_SCALENE_TRIANGLE_GUIDE = custom([
    { x: -72, y: 48 },
    { x: 72, y: 48 },
    { x: -48, y: 0 }
  ], { name: "Obtuse Scalene Triangle", color: palette["obtuse-triangle"] });
  var REGULAR_PENTAGON_STARTER = custom([
    { x: 0, y: -72 },
    { x: 48, y: -24 },
    { x: 24, y: 48 },
    { x: -24, y: 48 },
    { x: -48, y: -24 }
  ], { name: "Starter", color: palette.pentagon });
  var REGULAR_HEXAGON_STARTER = custom([
    { x: 0, y: -72 },
    { x: 48, y: -24 },
    { x: 72, y: 24 },
    { x: 0, y: 48 },
    { x: -48, y: 24 },
    { x: -48, y: -24 }
  ], { name: "Starter", color: palette.hexagon });
  var REGULAR_OCTAGON_STARTER = custom([
    { x: 0, y: -72 },
    { x: 24, y: -24 },
    { x: 72, y: 0 },
    { x: 24, y: 24 },
    { x: 0, y: 48 },
    { x: -24, y: 24 },
    { x: -48, y: 0 },
    { x: -24, y: -24 }
  ], { name: "Starter", color: palette.octagon });
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
  function guessVertexCount(target = {}, extra = {}) {
    var _a2, _b;
    if (Number.isFinite(extra.points)) return extra.points;
    if (Array.isArray(extra.guideDefinitions) && ((_b = (_a2 = extra.guideDefinitions[0]) == null ? void 0 : _a2.vertices) == null ? void 0 : _b.length)) {
      return extra.guideDefinitions[0].vertices.length;
    }
    const label = String(target.exact || target.primary || target.family || extra.guideShape || "").toLowerCase();
    if (label.includes("triangle")) return 3;
    if (label.includes("quadrilateral") || label.includes("square") || label.includes("rectangle") || label.includes("trapezoid") || label.includes("rhombus") || label.includes("kite") || label.includes("parallelogram")) return 4;
    if (label.includes("pentagon")) return 5;
    if (label.includes("hexagon")) return 6;
    if (label.includes("heptagon")) return 7;
    if (label.includes("octagon")) return 8;
    return 4;
  }
  function buildShapeTask(id, prompt, target, extra = {}) {
    const helperBadges = extra.helperBadges || [];
    return {
      id,
      type: extra.fix ? "fix-shape" : extra.type || "make-shape",
      modeTitle: extra.modeTitle || (extra.fix ? "Fix" : "Make"),
      answerMode: "board",
      prompt,
      shortHelp: extra.shortHelp || "Drag corners until the polygon matches.",
      boardNote: extra.boardNote || "Move a corner point or plot a new shape on the grid.",
      celebrationText: extra.celebrationText || "Nice polygon!",
      hintLadder: extra.hintLadder || [
        extra.fix ? "Start by checking the side count and corner rules." : "Think about the side count and shape rules first.",
        extra.fix ? "The helper guide is on the board now." : "The helper outline is on the board now.",
        extra.teachText || "Use the polygon rules, not just the name."
      ],
      visualNote: extra.visualNote || "The yellow guide shows what to aim for when help is on.",
      board: {
        editable: true,
        starterDefinitions: extra.starterDefinitions || [],
        guideShape: extra.guideShape || target.shapeType || null,
        guideDefinitions: extra.guideDefinitions || [],
        guideCenter: extra.guideCenter || null,
        guideScale: extra.guideScale,
        allowDraw: extra.allowDraw !== false,
        allowShapePicker: extra.allowShapePicker !== false,
        preferredTool: extra.preferredTool || (extra.requireDrawnShape ? "draw" : "move"),
        helperBadges
      },
      success: {
        type: "shape-match",
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
      type: "plot-shape",
      modeTitle: extra.modeTitle || "Plot",
      allowShapePicker: false,
      allowDraw: true,
      preferredTool: "draw",
      requireDrawnShape: true,
      minPlacedVertices: points,
      shortHelp: extra.shortHelp || `Plot ${points} corner points, then tap the first point again to close the polygon.`,
      boardNote: extra.boardNote || "Use Plot to place corner points on the grid. Tap the first point again when you are ready to close the shape.",
      helperBadges: extra.helperBadges || [`Plot ${points} points`, "Tap first point to close"],
      celebrationText: extra.celebrationText || "You drew the polygon!"
    });
  }
  function moveTask(id, prompt, target, extra = {}) {
    var _a2, _b, _c;
    return buildShapeTask(id, prompt, target, {
      ...extra,
      modeTitle: extra.modeTitle || (extra.fix ? "Fix" : "Move"),
      allowShapePicker: (_a2 = extra.allowShapePicker) != null ? _a2 : false,
      allowDraw: (_b = extra.allowDraw) != null ? _b : false,
      preferredTool: "move",
      minVertexMoves: (_c = extra.minVertexMoves) != null ? _c : 1,
      shortHelp: extra.shortHelp || "Move one or more corner points until the polygon matches.",
      boardNote: extra.boardNote || "Drag the corner points on the grid.",
      helperBadges: extra.helperBadges || ["Move corner points", "Use the grid to line it up"]
    });
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
        showLiveMetric: extra.showLiveMetric || null,
        allowDraw: false,
        allowShapePicker: false,
        preferredTool: "move",
        helperBadges: extra.helperBadges || []
      },
      options: ensureFourOptions(options, extra.fallbackOptions),
      success: { type: "choice", answer },
      proof: {}
    };
  }
  var factories = {
    countTriangle: () => choiceTask("count-triangle", "How many sides does this shape have?", [def("triangle", { locked: true })], ["3", "4", "5", "6"], "3", { type: "count-sides", modeTitle: "Count", teachText: "A triangle has 3 sides." }),
    countSquare: () => choiceTask("count-square", "How many sides does this shape have?", [def("square", { locked: true })], ["3", "4", "5", "6"], "4", { type: "count-sides", modeTitle: "Count", teachText: "A square has 4 sides." }),
    countPentagon: () => choiceTask("count-pentagon", "How many sides does this shape have?", [def("pentagon", { locked: true })], ["4", "5", "6", "8"], "5", { type: "count-sides", modeTitle: "Count", teachText: "A pentagon has 5 sides." }),
    pickSquare: () => choiceTask("pick-square", "What is the best name for this shape?", [def("square", { locked: true })], ["Square", "Rectangle", "Rhombus", "Parallelogram"], "Square", { teachText: "Square is the most exact true name." }),
    pickRectangle: () => choiceTask("pick-rectangle", "What is the best name for this shape?", [def("rectangle", { locked: true })], ["Square", "Rectangle", "Trapezoid", "Rhombus"], "Rectangle", { teachText: "A rectangle has 4 right corners." }),
    pickPentagon: () => choiceTask("pick-pentagon", "What is the best name for this shape?", [def("pentagon", { locked: true })], ["Pentagon", "Hexagon", "Square", "Polygon"], "Pentagon", { teachText: "A pentagon is a 5-sided polygon." }),
    pickTriangleTypeRight: () => choiceTask("pick-triangle-right", "What kind of triangle is this?", [def("right-triangle", { locked: true })], ["Acute Triangle", "Right Triangle", "Obtuse Triangle", "Scalene Triangle"], "Right Triangle", { teachText: "A right triangle has one square corner." }),
    pickTriangleTypeAcute: () => choiceTask("pick-triangle-acute", "What kind of triangle is this?", [def("acute-triangle", { locked: true })], ["Acute Triangle", "Right Triangle", "Obtuse Triangle", "Scalene Triangle"], "Acute Triangle", { teachText: "An acute triangle has all angles smaller than a right angle." }),
    pickTriangleTypeObtuse: () => choiceTask("pick-triangle-obtuse", "What kind of triangle is this?", [def("obtuse-triangle", { locked: true })], ["Acute Triangle", "Right Triangle", "Obtuse Triangle", "Isosceles Triangle"], "Obtuse Triangle", { teachText: "An obtuse triangle has one angle bigger than a right angle." }),
    pickParallelogram: () => choiceTask("pick-parallelogram", "What is the best name for this shape?", [def("parallelogram", { locked: true })], ["Parallelogram", "Rectangle", "Trapezoid", "Kite"], "Parallelogram", { teachText: "A parallelogram has 2 opposite side pairs that stay parallel." }),
    pickRhombus: () => choiceTask("pick-rhombus", "What is the best name for this shape?", [def("rhombus", { locked: true })], ["Rhombus", "Square", "Trapezoid", "Rectangle"], "Rhombus", { teachText: "A rhombus has 4 equal sides." }),
    pickTrapezoid: () => choiceTask("pick-trapezoid", "What is the best name for this shape?", [def("trapezoid", { locked: true })], ["Trapezoid", "Parallelogram", "Rectangle", "Rhombus"], "Trapezoid", { teachText: "A trapezoid has one matching pair of opposite sides here." }),
    plotTriangle: () => plotTask("plot-triangle", "Plot 3 corner points to draw a triangle.", { family: "Triangle" }, { guideShape: "triangle", helperBadges: ["Plot 3 points", "Any triangle works"] }),
    plotSquare: () => plotTask("plot-square", "Plot 4 corner points to draw a square.", { primary: "Square" }, { guideShape: "square", helperBadges: ["Plot 4 points", "4 equal sides"] }),
    plotRectangle: () => plotTask("plot-rectangle", "Plot 4 corner points to draw a rectangle.", { primary: "Rectangle" }, { guideShape: "rectangle", helperBadges: ["Plot 4 points", "4 right corners"] }),
    plotPentagon: () => plotTask("plot-pentagon", "Plot 5 corner points to draw a pentagon.", { family: "Pentagon" }, { guideShape: "pentagon" }),
    plotHexagon: () => plotTask("plot-hexagon", "Plot 6 corner points to draw a hexagon.", { family: "Hexagon" }, { guideShape: "hexagon" }),
    plotHeptagon: () => plotTask("plot-heptagon", "Plot 7 corner points to draw a heptagon.", { family: "Heptagon" }, { guideShape: "heptagon" }),
    plotOctagon: () => plotTask("plot-octagon", "Plot 8 corner points to draw an octagon.", { family: "Octagon" }, { guideShape: "octagon" }),
    fixSquare: () => moveTask("fix-square", "Fix this shape so it becomes a square.", { primary: "Square" }, {
      fix: true,
      starterDefinitions: [custom([{ x: -48, y: -36 }, { x: 48, y: -24 }, { x: 60, y: 48 }, { x: -60, y: 36 }], { name: "Starter", color: palette.square })],
      guideShape: "square",
      shortHelp: "Make all 4 sides the same and all 4 corners square."
    }),
    fixRectangle: () => moveTask("fix-rectangle", "Fix this shape so it becomes a rectangle.", { primary: "Rectangle" }, {
      fix: true,
      starterDefinitions: [custom([{ x: -72, y: -48 }, { x: 72, y: -48 }, { x: 96, y: 48 }, { x: -48, y: 48 }], { name: "Starter", color: palette.rectangle })],
      guideShape: "rectangle",
      shortHelp: "Make 4 square corners. Opposite sides should match."
    }),
    fixPentagon: () => moveTask("fix-pentagon", "Fix this shape so it becomes a clean pentagon.", { family: "Pentagon", requireTraits: ["Convex"], rejectTraits: ["Complex Polygon", "Degenerate"] }, {
      fix: true,
      starterDefinitions: [custom([{ x: 0, y: -72 }, { x: 72, y: 24 }, { x: -72, y: -24 }, { x: 72, y: -24 }, { x: -24, y: 72 }], { name: "Starter", color: palette.pentagon })],
      guideShape: "pentagon",
      shortHelp: "Make 5 sides that do not cross each other.",
      moveMessage: "Move the corner points until the pentagon is clean and convex."
    }),
    fixHexagon: () => moveTask("fix-hexagon", "Fix this shape so it becomes a clean hexagon.", { family: "Hexagon", requireTraits: ["Convex"], rejectTraits: ["Complex Polygon", "Degenerate"] }, {
      fix: true,
      starterDefinitions: [custom([{ x: -72, y: -48 }, { x: 0, y: 72 }, { x: 72, y: -48 }, { x: -24, y: 0 }, { x: 72, y: 48 }, { x: -72, y: 48 }], { name: "Starter", color: palette.hexagon })],
      guideShape: "hexagon",
      shortHelp: "Keep 6 corners, but stop the sides from crossing.",
      moveMessage: "Move the corner points until the hexagon is clean and convex."
    }),
    fixHeptagon: () => moveTask("fix-heptagon", "Fix this shape so it becomes a clean heptagon.", { family: "Heptagon", requireTraits: ["Convex"], rejectTraits: ["Complex Polygon", "Degenerate"] }, {
      fix: true,
      starterDefinitions: [custom([{ x: 0, y: -72 }, { x: 48, y: -48 }, { x: 72, y: 0 }, { x: 24, y: 0 }, { x: 72, y: 72 }, { x: -48, y: 72 }, { x: -72, y: -24 }], { name: "Starter", color: palette.heptagon })],
      guideShape: "heptagon",
      shortHelp: "A heptagon needs 7 clean sides.",
      moveMessage: "Move the corner points until the heptagon is clean and convex."
    }),
    fixOctagon: () => moveTask("fix-octagon", "Fix this shape so it becomes a clean octagon.", { family: "Octagon", requireTraits: ["Convex"], rejectTraits: ["Complex Polygon", "Degenerate"] }, {
      fix: true,
      starterDefinitions: [custom([{ x: 0, y: -72 }, { x: 48, y: -48 }, { x: 72, y: 0 }, { x: 24, y: 0 }, { x: 48, y: 72 }, { x: 0, y: 48 }, { x: -48, y: 72 }, { x: -72, y: -24 }], { name: "Starter", color: palette.octagon })],
      guideShape: "octagon",
      shortHelp: "An octagon needs 8 clean sides.",
      moveMessage: "Move the corner points until the octagon is clean and convex."
    }),
    moveSquareIntoRectangle: () => moveTask("move-square-into-rectangle", "Move points so this square becomes a rectangle, not a square.", { primary: "Rectangle" }, {
      starterDefinitions: [def("square")],
      guideShape: "rectangle",
      shortHelp: "Stretch one side pair so not all 4 sides stay equal."
    }),
    rectangleToSquare: () => moveTask("rectangle-to-square", "Move points so this rectangle becomes a square.", { primary: "Square" }, {
      starterDefinitions: [def("rectangle")],
      guideShape: "square",
      shortHelp: "Make all 4 sides the same and keep all 4 right corners."
    }),
    plotRightTriangle: () => plotTask("plot-right-triangle", "Plot 3 points to draw a right triangle.", { exact: "Right Triangle" }, {
      guideShape: "right-triangle",
      helperBadges: ["Plot 3 points", "Make one square corner"]
    }),
    plotAcuteTriangle: () => plotTask("plot-acute-triangle", "Plot 3 points to draw an acute triangle.", { exact: "Acute Triangle" }, {
      guideShape: "acute-triangle",
      helperBadges: ["Plot 3 points", "All angles smaller than 90\xB0"]
    }),
    plotObtuseTriangle: () => plotTask("plot-obtuse-triangle", "Plot 3 points to draw an obtuse triangle.", { exact: "Obtuse Triangle" }, {
      guideShape: "obtuse-triangle",
      helperBadges: ["Plot 3 points", "One angle bigger than 90\xB0"]
    }),
    fixRightTriangle: () => moveTask("fix-right-triangle", "Fix this so it becomes a right triangle.", { exact: "Right Triangle" }, {
      fix: true,
      starterDefinitions: [custom([{ x: -72, y: 48 }, { x: 72, y: 48 }, { x: 48, y: -48 }], { name: "Starter", color: palette["right-triangle"] })],
      guideShape: "right-triangle",
      shortHelp: "Move one corner until you make a square corner."
    }),
    fixAcuteTriangle: () => moveTask("fix-acute-triangle", "Fix this so it becomes an acute triangle.", { exact: "Acute Triangle" }, {
      fix: true,
      starterDefinitions: [custom([{ x: -72, y: 48 }, { x: 72, y: 48 }, { x: 0, y: 0 }], { name: "Starter", color: palette["acute-triangle"] })],
      guideShape: "acute-triangle",
      shortHelp: "All 3 angles should end up smaller than a right angle."
    }),
    fixObtuseTriangle: () => moveTask("fix-obtuse-triangle", "Fix this so it becomes an obtuse triangle.", { exact: "Obtuse Triangle" }, {
      fix: true,
      starterDefinitions: [def("triangle")],
      guideShape: "obtuse-triangle",
      shortHelp: "One angle needs to open wide."
    }),
    plotScaleneTriangle: () => plotTask("plot-scalene-triangle", "Plot 3 points to draw a scalene triangle.", { exact: "Scalene Triangle" }, {
      guideDefinitions: [SCALENE_TRIANGLE_GUIDE],
      shortHelp: "All 3 sides should end up different lengths.",
      helperBadges: ["Plot 3 points", "All sides different"]
    }),
    plotIsoscelesTriangle: () => plotTask("plot-isosceles-triangle", "Plot 3 points to draw an isosceles triangle.", { exact: "Isosceles Triangle", rejectExact: ["Equilateral Triangle"] }, {
      guideDefinitions: [ISOSCELES_TRIANGLE_GUIDE],
      shortHelp: "Exactly 2 sides should match.",
      helperBadges: ["Plot 3 points", "2 equal sides"]
    }),
    plotAcuteIsoscelesTriangle: () => plotTask("plot-acute-isosceles-triangle", "Plot 3 points to draw an acute isosceles triangle.", { exactAll: ["Acute Triangle", "Isosceles Triangle"], rejectExact: ["Equilateral Triangle"] }, {
      guideDefinitions: [ISOSCELES_TRIANGLE_GUIDE],
      shortHelp: "Make 2 equal sides and keep all 3 angles smaller than 90\xB0.",
      helperBadges: ["Plot 3 points", "Acute + 2 equal sides"]
    }),
    turnRightToAcute: () => moveTask("turn-right-to-acute", "Move points so this right triangle becomes an acute triangle.", { exact: "Acute Triangle" }, {
      starterDefinitions: [def("right-triangle")],
      guideShape: "acute-triangle",
      shortHelp: "Remove the square corner so all 3 angles are smaller than 90\xB0."
    }),
    turnAcuteToObtuse: () => moveTask("turn-acute-to-obtuse", "Move points so this acute triangle becomes an obtuse triangle.", { exact: "Obtuse Triangle" }, {
      starterDefinitions: [def("acute-triangle")],
      guideShape: "obtuse-triangle",
      shortHelp: "Open one angle wider than 90\xB0."
    }),
    turnObtuseToRight: () => moveTask("turn-obtuse-to-right", "Move points so this obtuse triangle becomes a right triangle.", { exact: "Right Triangle" }, {
      starterDefinitions: [def("obtuse-triangle")],
      guideShape: "right-triangle",
      shortHelp: "Close the wide angle until one corner becomes a square corner."
    }),
    turnAcuteToRight: () => moveTask("turn-acute-to-right", "Move points so this acute triangle becomes a right triangle.", { exact: "Right Triangle" }, {
      starterDefinitions: [def("acute-triangle")],
      guideShape: "right-triangle",
      shortHelp: "Make exactly one square corner."
    }),
    fixScaleneTriangle: () => moveTask("fix-scalene-triangle", "Move points so this triangle becomes scalene.", { exact: "Scalene Triangle" }, {
      starterDefinitions: [def("triangle")],
      guideDefinitions: [SCALENE_TRIANGLE_GUIDE],
      shortHelp: "All 3 side lengths should end up different."
    }),
    plotIsoscelesRightTriangle: () => plotTask("plot-isosceles-right-triangle", "Plot 3 points to draw an isosceles right triangle.", { exactAll: ["Right Triangle", "Isosceles Triangle"] }, {
      guideDefinitions: [ISOSCELES_RIGHT_TRIANGLE_GUIDE],
      shortHelp: "Make one square corner and 2 equal sides.",
      helperBadges: ["Plot 3 points", "Right angle + 2 equal sides"]
    }),
    plotObtuseScaleneTriangle: () => plotTask("plot-obtuse-scalene-triangle", "Plot 3 points to draw an obtuse scalene triangle.", { exactAll: ["Obtuse Triangle", "Scalene Triangle"] }, {
      guideDefinitions: [OBTUSE_SCALENE_TRIANGLE_GUIDE],
      shortHelp: "Make one wide angle and keep all 3 side lengths different.",
      helperBadges: ["Plot 3 points", "Obtuse + all sides different"]
    }),
    plotParallelogram: () => plotTask("plot-parallelogram", "Plot 4 points to draw a parallelogram.", { primary: "Parallelogram" }, {
      guideShape: "parallelogram",
      helperBadges: ["Plot 4 points", "2 opposite side pairs stay parallel"]
    }),
    plotTrapezoid: () => plotTask("plot-trapezoid", "Plot 4 points to draw a trapezoid.", { exactAny: ["Trapezoid", "Isosceles Trapezoid"] }, {
      guideShape: "trapezoid",
      helperBadges: ["Plot 4 points", "Only 1 side pair stays parallel"]
    }),
    plotRhombus: () => plotTask("plot-rhombus", "Plot 4 points to draw a rhombus.", { primary: "Rhombus" }, {
      guideDefinitions: [RHOMBUS_GUIDE],
      helperBadges: ["Plot 4 points", "4 equal sides"]
    }),
    fixParallelogram: () => moveTask("fix-parallelogram", "Fix this so it becomes a parallelogram.", { primary: "Parallelogram", rejectPrimary: ["Square", "Rectangle"] }, {
      fix: true,
      starterDefinitions: [custom([{ x: -72, y: -48 }, { x: 48, y: -48 }, { x: 96, y: 48 }, { x: -48, y: 24 }], { name: "Starter", color: palette.parallelogram })],
      guideShape: "parallelogram",
      shortHelp: "Make both opposite side pairs stay parallel."
    }),
    fixTrapezoid: () => moveTask("fix-trapezoid", "Fix this so it becomes a trapezoid.", { exactAny: ["Trapezoid", "Isosceles Trapezoid"] }, {
      fix: true,
      starterDefinitions: [def("rectangle")],
      guideShape: "trapezoid",
      shortHelp: "Keep only one pair of opposite sides parallel."
    }),
    fixRhombus: () => moveTask("fix-rhombus", "Fix this so it becomes a rhombus.", { primary: "Rhombus" }, {
      fix: true,
      starterDefinitions: [custom([{ x: 0, y: -72 }, { x: 60, y: -12 }, { x: 0, y: 72 }, { x: -48, y: 12 }], { name: "Starter", color: palette.rhombus })],
      guideDefinitions: [RHOMBUS_GUIDE],
      shortHelp: "Make all 4 sides the same length."
    }),
    makeRectangleNotSquare: () => plotTask("make-rectangle-not-square", "Plot 4 points to make a rectangle, not a square.", { primary: "Rectangle" }, {
      guideShape: "rectangle",
      shortHelp: "Keep 4 square corners, but do not make all 4 sides equal.",
      helperBadges: ["Plot 4 points", "Rectangle, not square"]
    }),
    makeParallelogramNotRectangle: () => plotTask("make-parallelogram-not-rectangle", "Plot 4 points to make a parallelogram, not a rectangle.", { primary: "Parallelogram" }, {
      guideShape: "parallelogram",
      shortHelp: "Both opposite side pairs stay parallel, but no full set of square corners.",
      helperBadges: ["Plot 4 points", "Parallelogram, not rectangle"]
    }),
    makeRhombusNotSquare: () => plotTask("make-rhombus-not-square", "Plot 4 points to make a rhombus, not a square.", { primary: "Rhombus" }, {
      guideDefinitions: [RHOMBUS_GUIDE],
      shortHelp: "All 4 sides should match, but do not make all 4 right corners.",
      helperBadges: ["Plot 4 points", "Rhombus, not square"]
    }),
    makeIsoscelesTrap: () => plotTask("make-isosceles-trap", "Plot 4 points to make an isosceles trapezoid.", { exact: "Isosceles Trapezoid" }, {
      guideDefinitions: [ISOSCELES_TRAPEZOID_GUIDE],
      shortHelp: "Keep one pair of opposite sides parallel and make the legs match.",
      helperBadges: ["Plot 4 points", "1 parallel pair + matching legs"]
    }),
    makeKite: () => plotTask("make-kite", "Plot 4 points to make a kite.", { exact: "Kite" }, {
      guideDefinitions: [KITE_GUIDE],
      shortHelp: "Make 2 matching side pairs that meet at the corners.",
      helperBadges: ["Plot 4 points", "2 adjacent side pairs match"]
    }),
    squareToRhombus: () => moveTask("square-to-rhombus", "Move points so this square becomes a rhombus, not a square.", { primary: "Rhombus" }, {
      starterDefinitions: [def("square")],
      guideDefinitions: [RHOMBUS_GUIDE],
      shortHelp: "Keep all 4 sides equal, but lose the full set of right corners."
    }),
    trapezoidToIsoscelesTrap: () => moveTask("trapezoid-to-isosceles-trap", "Move points so this trapezoid becomes an isosceles trapezoid.", { exact: "Isosceles Trapezoid" }, {
      starterDefinitions: [def("trapezoid")],
      guideDefinitions: [ISOSCELES_TRAPEZOID_GUIDE],
      shortHelp: "Keep the parallel side pair and make the legs match."
    }),
    parallelogramToRectangle: () => moveTask("parallelogram-to-rectangle", "Move points so this parallelogram becomes a rectangle.", { primary: "Rectangle" }, {
      starterDefinitions: [def("parallelogram")],
      guideShape: "rectangle",
      shortHelp: "Make all 4 corners square."
    }),
    makeConvexPentagon: () => plotTask("make-convex-pentagon", "Plot 5 points to draw a convex pentagon.", { family: "Pentagon", requireTraits: ["Convex"], rejectTraits: ["Complex Polygon", "Degenerate"] }, {
      guideShape: "pentagon",
      shortHelp: "Keep all corners pointing outward with no crossings.",
      helperBadges: ["Plot 5 points", "Convex shape"]
    }),
    makeConvexHexagon: () => plotTask("make-convex-hexagon", "Plot 6 points to draw a convex hexagon.", { family: "Hexagon", requireTraits: ["Convex"], rejectTraits: ["Complex Polygon", "Degenerate"] }, {
      guideShape: "hexagon",
      shortHelp: "Keep all corners pointing outward with no crossings.",
      helperBadges: ["Plot 6 points", "Convex shape"]
    }),
    makeConcavePentagon: () => plotTask("make-concave-pentagon", "Plot 5 points to draw a concave pentagon.", { family: "Pentagon", requireTraits: ["Concave"], rejectTraits: ["Complex Polygon", "Degenerate"] }, {
      guideDefinitions: [CONCAVE_PENTAGON_GUIDE],
      shortHelp: "Push one corner inward so the pentagon caves in.",
      helperBadges: ["Plot 5 points", "One corner points inward"]
    }),
    makeConcaveHexagon: () => plotTask("make-concave-hexagon", "Plot 6 points to draw a concave hexagon.", { family: "Hexagon", requireTraits: ["Concave"], rejectTraits: ["Complex Polygon", "Degenerate"] }, {
      guideDefinitions: [CONCAVE_HEXAGON_GUIDE],
      shortHelp: "Push one corner inward so the hexagon caves in.",
      helperBadges: ["Plot 6 points", "One corner points inward"]
    }),
    fixRegularPentagon: () => moveTask("fix-regular-pentagon", "Move points so this pentagon becomes a clean convex pentagon.", { family: "Pentagon", requireTraits: ["Convex"], rejectTraits: ["Complex Polygon", "Degenerate"] }, {
      starterDefinitions: [REGULAR_PENTAGON_STARTER],
      guideShape: "pentagon",
      shortHelp: "Keep 5 sides, stop crossings, and make the corners point outward."
    }),
    fixRegularHexagon: () => moveTask("fix-regular-hexagon", "Move points so this hexagon becomes a clean convex hexagon.", { family: "Hexagon", requireTraits: ["Convex"], rejectTraits: ["Complex Polygon", "Degenerate"] }, {
      starterDefinitions: [REGULAR_HEXAGON_STARTER],
      guideShape: "hexagon",
      shortHelp: "Keep 6 sides, stop crossings, and make the corners point outward."
    }),
    fixRegularOctagon: () => moveTask("fix-regular-octagon", "Move points so this octagon becomes a clean convex octagon.", { family: "Octagon", requireTraits: ["Convex"], rejectTraits: ["Complex Polygon", "Degenerate"] }, {
      starterDefinitions: [REGULAR_OCTAGON_STARTER],
      guideShape: "octagon",
      shortHelp: "Keep 8 sides, stop crossings, and make the corners point outward."
    })
  };
  var missionKeys = {
    shapeStart: [
      ["shape-1", "Count the Sides", "Start with the basic side counts.", "Count easy polygons.", ["countTriangle", "countSquare", "countPentagon"]],
      ["shape-2", "Plot the First Shapes", "Now draw the easy polygons yourself.", "Plot simple polygons.", ["plotTriangle", "plotSquare", "plotRectangle"]],
      ["shape-3", "More Sides", "Add more corners and keep your lines clean.", "Plot 5- and 6-sided polygons.", ["plotPentagon", "plotHexagon", "pickPentagon"]],
      ["shape-4", "Fix the Shape", "Move the corner points until each polygon is right.", "Fix basic polygons.", ["fixSquare", "fixRectangle", "fixPentagon"]],
      ["shape-5", "Best Name", "Name the polygons after you build them.", "Pick exact names.", ["pickSquare", "pickRectangle", "moveSquareIntoRectangle"]],
      ["shape-6", "Stretch and Snap", "Turn one polygon into another by moving points.", "Transform easy polygons.", ["rectangleToSquare", "fixHexagon", "plotHexagon"]],
      ["shape-boss", "Shape Start Boss", "Mix drawing and fixing in one run.", "Boss mix.", ["plotSquare", "fixRectangle", "plotPentagon"], true]
    ],
    triangleTrail: [
      ["triangle-1", "Triangle Types", "Read the angles first.", "Name triangle kinds.", ["pickTriangleTypeRight", "pickTriangleTypeAcute", "pickTriangleTypeObtuse"]],
      ["triangle-2", "Plot Triangle Types", "Draw each kind of triangle yourself.", "Plot triangle kinds.", ["plotRightTriangle", "plotAcuteTriangle", "plotObtuseTriangle"]],
      ["triangle-3", "Fix the Corners", "Move one corner and watch the angle type change.", "Fix triangle kinds.", ["fixRightTriangle", "fixAcuteTriangle", "fixObtuseTriangle"]],
      ["triangle-4", "Side Clues", "Now prove triangle names with side lengths too.", "Plot side-based triangles.", ["plotScaleneTriangle", "plotIsoscelesTriangle", "plotAcuteIsoscelesTriangle"]],
      ["triangle-5", "Turn One Into Another", "Move points to remake each triangle type.", "Transform triangle kinds.", ["turnRightToAcute", "turnAcuteToObtuse", "turnObtuseToRight"]],
      ["triangle-6", "Hard Triangle Builds", "Mix angle and side clues in the same drawing.", "Hard triangle build.", ["plotIsoscelesRightTriangle", "fixScaleneTriangle", "turnAcuteToRight"]],
      ["triangle-boss", "Triangle Trail Boss", "One more triangle proof run.", "Boss mix.", ["plotAcuteIsoscelesTriangle", "plotIsoscelesRightTriangle", "turnObtuseToRight"], true]
    ],
    quadQuest: [
      ["quad-1", "Name the Quad", "Read the side clues and choose the best name.", "Name quad shapes.", ["pickParallelogram", "pickRhombus", "pickTrapezoid"]],
      ["quad-2", "Plot the Quads", "Draw each 4-sided polygon yourself.", "Plot quad shapes.", ["plotParallelogram", "plotTrapezoid", "plotRhombus"]],
      ["quad-3", "Fix the Quads", "Move the corner points until the quad is right.", "Fix quad shapes.", ["fixParallelogram", "fixTrapezoid", "fixRhombus"]],
      ["quad-4", "Exact Quads", "Make the more exact polygon, not just any 4-sided shape.", "Build exact quads.", ["makeRectangleNotSquare", "makeParallelogramNotRectangle", "makeRhombusNotSquare"]],
      ["quad-5", "Special Quads", "These need more than one clue at once.", "Build special quads.", ["makeIsoscelesTrap", "makeKite", "rectangleToSquare"]],
      ["quad-6", "Quad Transform Lab", "Start with one quad and move points into a new one.", "Transform quads.", ["squareToRhombus", "trapezoidToIsoscelesTrap", "parallelogramToRectangle"]],
      ["quad-boss", "Quad Quest Boss", "A final mixed quad challenge.", "Boss mix.", ["makeIsoscelesTrap", "makeKite", "squareToRhombus"], true]
    ],
    measureMountain: [
      ["measure-1", "Polygon Peaks", "Now climb into polygons with many sides.", "Plot 5- to 7-sided polygons.", ["plotPentagon", "plotHexagon", "plotHeptagon"]],
      ["measure-2", "More Corners", "Eight sides is waiting now.", "Plot and fix many-sided polygons.", ["plotOctagon", "fixPentagon", "fixHexagon"]],
      ["measure-3", "Clean the Shape", "Keep the side count, but clean up the polygon.", "Fix higher polygons.", ["fixHeptagon", "fixOctagon", "makeConvexHexagon"]],
      ["measure-4", "Concave or Convex", "Now prove you can control which way a polygon bends.", "Concave and convex practice.", ["makeConcavePentagon", "makeConcaveHexagon", "makeConvexPentagon"]],
      ["measure-5", "Clean Polygon Challenge", "These polygons need careful point moves to stay clean and convex.", "Fix many-sided polygons.", ["fixRegularPentagon", "fixRegularHexagon", "fixRegularOctagon"]],
      ["measure-6", "Many-Side Mix", "Switch between clean, regular, and side-count ideas.", "Mixed polygon climb.", ["plotOctagon", "fixHeptagon", "makeConcaveHexagon"]],
      ["measure-boss", "Polygon Peaks Boss", "One more many-sided proof run.", "Boss mix.", ["makeConcaveHexagon", "fixRegularHexagon", "fixRegularOctagon"], true]
    ],
    masterMix: [
      ["master-1", "Exact Builder", "Make the strongest true name each time.", "Exact polygon mix.", ["makeRectangleNotSquare", "makeParallelogramNotRectangle", "makeRhombusNotSquare"]],
      ["master-2", "Angles and Sides", "Now mix angle clues with side clues.", "Triangle mastery mix.", ["plotIsoscelesRightTriangle", "plotObtuseScaleneTriangle", "turnAcuteToRight"]],
      ["master-3", "Special Polygon Lab", "These shapes need careful point moves.", "Special polygon mix.", ["makeIsoscelesTrap", "makeKite", "makeConcavePentagon"]],
      ["master-4", "Clean Repair", "Fix the many-sided polygons until they are clean and convex.", "Many-sided repair mix.", ["fixRegularPentagon", "fixRegularHexagon", "fixRegularOctagon"]],
      ["master-5", "Corner Sprint", "Draw bigger polygons quickly and cleanly.", "Many-side sprint.", ["plotHexagon", "plotHeptagon", "plotOctagon"]],
      ["master-6", "Prove It by Moving Points", "Start with one shape and move it into another.", "Hard transform mix.", ["squareToRhombus", "trapezoidToIsoscelesTrap", "turnObtuseToRight"]],
      ["master-boss", "Master Mix Boss", "Your final polygon proof test.", "Boss mix.", ["makeKite", "plotIsoscelesRightTriangle", "fixRegularHexagon"], true]
    ]
  };
  function makeMission([id, title, intro, short, keys, boss = false]) {
    return { id, title, intro, short, tasks: keys.map((key) => factories[key]()), boss };
  }
  var WORLDS = [
    {
      id: "shape-start",
      title: "Shape Start",
      theme: "Warm Up",
      copy: "Count sides, draw your first polygons, and fix simple shapes by moving points.",
      badge: "Shape Starter",
      missions: missionKeys.shapeStart.map(makeMission),
      taskPool: ["countTriangle", "countSquare", "countPentagon", "plotTriangle", "plotSquare", "plotRectangle", "plotPentagon", "plotHexagon", "fixSquare", "fixRectangle", "fixPentagon", "moveSquareIntoRectangle", "rectangleToSquare"]
    },
    {
      id: "triangle-trail",
      title: "Triangle Trail",
      theme: "Angle Path",
      copy: "Build triangle types, fix near-misses, and prove angle-plus-side triangle names.",
      badge: "Triangle Tracker",
      missions: missionKeys.triangleTrail.map(makeMission),
      taskPool: ["pickTriangleTypeRight", "pickTriangleTypeAcute", "pickTriangleTypeObtuse", "plotRightTriangle", "plotAcuteTriangle", "plotObtuseTriangle", "fixRightTriangle", "fixAcuteTriangle", "fixObtuseTriangle", "plotScaleneTriangle", "plotIsoscelesTriangle", "plotAcuteIsoscelesTriangle", "turnRightToAcute", "turnAcuteToObtuse", "turnObtuseToRight", "turnAcuteToRight", "plotIsoscelesRightTriangle", "plotObtuseScaleneTriangle"]
    },
    {
      id: "quad-quest",
      title: "Quad Quest",
      theme: "Quad Lab",
      copy: "Draw, fix, and transform quadrilaterals until the exact name is true.",
      badge: "Quad Quest Hero",
      missions: missionKeys.quadQuest.map(makeMission),
      taskPool: ["pickParallelogram", "pickRhombus", "pickTrapezoid", "plotParallelogram", "plotTrapezoid", "plotRhombus", "fixParallelogram", "fixTrapezoid", "fixRhombus", "makeRectangleNotSquare", "makeParallelogramNotRectangle", "makeRhombusNotSquare", "makeIsoscelesTrap", "makeKite", "rectangleToSquare", "squareToRhombus", "trapezoidToIsoscelesTrap", "parallelogramToRectangle"]
    },
    {
      id: "measure-mountain",
      title: "Polygon Peaks",
      theme: "Many Sides",
      copy: "Climb from pentagons to octagons and prove you can control clean, concave, convex, and regular polygons.",
      badge: "Polygon Peak Climber",
      missions: missionKeys.measureMountain.map(makeMission),
      taskPool: ["plotPentagon", "plotHexagon", "plotHeptagon", "plotOctagon", "fixPentagon", "fixHexagon", "fixHeptagon", "fixOctagon", "makeConvexPentagon", "makeConvexHexagon", "makeConcavePentagon", "makeConcaveHexagon", "fixRegularPentagon", "fixRegularHexagon", "fixRegularOctagon"]
    },
    {
      id: "master-mix",
      title: "Master Mix",
      theme: "Proof Stage",
      copy: "Mix exact names, tricky fixes, and hard polygon builds in one final world.",
      badge: "Polygon Pro",
      missions: missionKeys.masterMix.map(makeMission),
      taskPool: ["makeRectangleNotSquare", "makeParallelogramNotRectangle", "makeRhombusNotSquare", "plotIsoscelesRightTriangle", "plotObtuseScaleneTriangle", "turnAcuteToRight", "makeIsoscelesTrap", "makeKite", "makeConcavePentagon", "fixRegularPentagon", "fixRegularHexagon", "fixRegularOctagon", "plotHexagon", "plotHeptagon", "plotOctagon", "squareToRhombus", "trapezoidToIsoscelesTrap", "turnObtuseToRight"]
    }
  ];
  function getShapeChoices() {
    return shapeChoices.slice();
  }
  function getWorldById(worldId) {
    return WORLDS.find((world) => world.id === worldId) || null;
  }
  function getMissionById(worldId, missionId) {
    var _a2;
    return ((_a2 = getWorldById(worldId)) == null ? void 0 : _a2.missions.find((mission) => mission.id === missionId)) || null;
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
  function createEmptyActionStats() {
    return {
      shapeCreates: 0,
      plottedPoints: 0,
      drawnPolygons: 0,
      vertexMoves: 0,
      shapeMoves: 0
    };
  }
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
      this.activePointerType = "mouse";
      this.pendingDragPoint = null;
      this.dragFrame = 0;
      this.resizeObserver = null;
      this.draftVertices = [];
      this.actionStats = createEmptyActionStats();
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
      var _a2;
      this.canvas.removeEventListener("pointerdown", this.boundHandlePointerDown);
      window.removeEventListener("pointermove", this.boundHandlePointerMove);
      window.removeEventListener("pointerup", this.boundHandlePointerUp);
      window.removeEventListener("pointercancel", this.boundHandlePointerUp);
      window.removeEventListener("resize", this.boundHandleResize);
      if (this.dragFrame) {
        window.cancelAnimationFrame(this.dragFrame);
        this.dragFrame = 0;
      }
      (_a2 = this.resizeObserver) == null ? void 0 : _a2.disconnect();
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
      if (mode === "draw") {
        this.selectedVertexIndex = -1;
      }
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
        showLiveMetric: taskBoard.showLiveMetric || null,
        allowDraw: taskBoard.allowDraw !== false,
        allowShapePicker: taskBoard.allowShapePicker !== false,
        preferredTool: taskBoard.preferredTool || "move"
      };
      const starterDefinitions = (taskBoard.starterDefinitions || []).map(cloneDefinition);
      this.initialDefinitions = starterDefinitions.map(cloneDefinition);
      this.setDefinitions(starterDefinitions, {
        preserveHistory: false,
        clearDraft: true,
        resetActions: true
      });
      this.setReadonly(taskBoard.editable === false ? true : false);
      this.setMode(taskBoard.editable === false ? "move" : this.taskGuide.preferredTool || "move");
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
      if (options.clearDraft === true) {
        this.draftVertices = [];
      }
      if (options.resetActions === true) {
        this.resetActionStats();
      }
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
      this.draftVertices = [];
      this.actionStats.shapeCreates += 1;
      this.saveHistory();
      this.notifyChange();
    }
    reset() {
      this.setDefinitions(this.initialDefinitions.map(cloneDefinition), {
        preserveHistory: false,
        clearDraft: true,
        resetActions: true
      });
    }
    undo() {
      if (this.draftVertices.length) {
        this.draftVertices = this.draftVertices.slice(0, -1);
        this.notifyChange();
        return;
      }
      if (this.historyIndex <= 0) return;
      this.historyIndex -= 1;
      this.restoreHistoryState(this.history[this.historyIndex]);
    }
    resetActionStats() {
      this.actionStats = createEmptyActionStats();
    }
    getActionStats() {
      return { ...this.actionStats };
    }
    clearDraft(options = {}) {
      if (!this.draftVertices.length) return;
      this.draftVertices = [];
      if (options.notify !== false) {
        this.notifyChange();
      }
    }
    finishDraft() {
      if (this.draftVertices.length < 3) {
        return false;
      }
      const freshPolygon = new Polygon(this.draftVertices, {
        color: DEFAULT_COLORS[0],
        name: "Drawn Polygon",
        role: "main"
      });
      const lockedPolygons = this.polygons.filter((polygon) => polygon.locked).map((polygon) => polygon.clone());
      this.polygons = [freshPolygon, ...lockedPolygons];
      this.selectedPolygon = freshPolygon;
      this.selectedVertexIndex = -1;
      this.draftVertices = [];
      this.actionStats.drawnPolygons += 1;
      this.mode = "move";
      this.saveHistory();
      this.notifyChange();
      return true;
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
      var _a2;
      return {
        readonly: this.readonly,
        mode: this.mode,
        polygonCount: this.polygons.length,
        selectedName: ((_a2 = this.selectedPolygon) == null ? void 0 : _a2.name) || null,
        draftVertexCount: this.draftVertices.length,
        actionStats: this.getActionStats(),
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
    getVertexHitThreshold(pointerType = this.activePointerType) {
      if (pointerType === "touch") {
        return Math.max(20, this.gridSize * 0.92);
      }
      if (pointerType === "pen") {
        return Math.max(16, this.gridSize * 0.72);
      }
      return Math.max(14, this.gridSize * 0.55);
    }
    getDraftCloseThreshold(pointerType = this.activePointerType) {
      if (pointerType === "touch") {
        return Math.max(20, this.gridSize * 0.95);
      }
      if (pointerType === "pen") {
        return Math.max(16, this.gridSize * 0.78);
      }
      return Math.max(14, this.gridSize * 0.7);
    }
    snapPolygonToGrid(polygon) {
      polygon.vertices = polygon.vertices.map((vertex) => snapPointToGrid(vertex, this.gridSize));
    }
    hitVertex(worldPoint, pointerType = this.activePointerType) {
      const threshold = this.getVertexHitThreshold(pointerType);
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
      var _a2, _b, _c, _d;
      if (this.readonly) return;
      if (event.button !== 0 && event.pointerType !== "touch") return;
      if (event.cancelable) {
        event.preventDefault();
      }
      this.activePointerType = event.pointerType || "mouse";
      const worldPoint = this.screenToWorld(event.clientX, event.clientY);
      if (this.mode === "draw") {
        this.handleDrawPointerDown(worldPoint, this.activePointerType);
        return;
      }
      const hitVertex = this.hitVertex(worldPoint, this.activePointerType);
      if (hitVertex) {
        const anchor = hitVertex.polygon.vertices[hitVertex.vertexIndex];
        this.selectedPolygon = hitVertex.polygon;
        this.selectedVertexIndex = hitVertex.vertexIndex;
        this.drag = {
          type: "vertex",
          polygon: hitVertex.polygon,
          vertexIndex: hitVertex.vertexIndex,
          moved: false,
          pointerType: this.activePointerType,
          offset: {
            x: anchor.x - worldPoint.x,
            y: anchor.y - worldPoint.y
          }
        };
        this.pointerId = event.pointerId;
        (_b = (_a2 = this.canvas).setPointerCapture) == null ? void 0 : _b.call(_a2, event.pointerId);
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
          start: worldPoint,
          moved: false,
          pointerType: this.activePointerType
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
    handleDrawPointerDown(worldPoint, pointerType = this.activePointerType) {
      const snappedPoint = snapPointToGrid(worldPoint, this.gridSize);
      const closeThreshold = this.getDraftCloseThreshold(pointerType);
      if (this.draftVertices.length >= 3 && distance(snappedPoint, this.draftVertices[0]) <= closeThreshold) {
        this.finishDraft();
        return;
      }
      const lastPoint = this.draftVertices[this.draftVertices.length - 1];
      if (lastPoint && distance(snappedPoint, lastPoint) <= 1) {
        return;
      }
      this.draftVertices = [...this.draftVertices, snappedPoint];
      this.actionStats.plottedPoints += 1;
      this.notifyChange();
    }
    flushPendingDrag() {
      var _a2, _b;
      if (!this.drag || !this.pendingDragPoint) return;
      const worldPoint = this.pendingDragPoint;
      this.pendingDragPoint = null;
      if (this.drag.type === "vertex") {
        const adjustedPoint = {
          x: worldPoint.x + (((_a2 = this.drag.offset) == null ? void 0 : _a2.x) || 0),
          y: worldPoint.y + (((_b = this.drag.offset) == null ? void 0 : _b.y) || 0)
        };
        const nextPoint = this.drag.pointerType === "touch" ? adjustedPoint : snapPointToGrid(adjustedPoint, this.gridSize);
        const currentPoint = this.drag.polygon.vertices[this.drag.vertexIndex];
        if (distance(currentPoint, nextPoint) <= 0.25) {
          return;
        }
        this.drag.polygon.vertices[this.drag.vertexIndex] = nextPoint;
        this.drag.moved = true;
        this.notifyChange();
        return;
      }
      if (this.drag.type === "shape") {
        const nextPoint = this.drag.pointerType === "touch" ? worldPoint : snapPointToGrid(worldPoint, this.gridSize);
        const deltaX = nextPoint.x - this.drag.start.x;
        const deltaY = nextPoint.y - this.drag.start.y;
        if (Math.abs(deltaX) < 0.25 && Math.abs(deltaY) < 0.25) {
          return;
        }
        this.drag.polygon.move(deltaX, deltaY);
        this.drag.start = nextPoint;
        this.drag.moved = true;
        this.notifyChange();
      }
    }
    handlePointerMove(event) {
      if (!this.drag) return;
      if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
      if (event.cancelable) {
        event.preventDefault();
      }
      this.pendingDragPoint = this.screenToWorld(event.clientX, event.clientY);
      if (!this.dragFrame) {
        this.dragFrame = window.requestAnimationFrame(() => {
          this.dragFrame = 0;
          this.flushPendingDrag();
        });
      }
    }
    handlePointerUp(event) {
      var _a2, _b;
      if (!this.drag) return;
      if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
      if (event.cancelable) {
        event.preventDefault();
      }
      if (this.dragFrame) {
        window.cancelAnimationFrame(this.dragFrame);
        this.dragFrame = 0;
      }
      this.flushPendingDrag();
      if (this.drag.pointerType === "touch") {
        if (this.drag.type === "vertex") {
          const currentPoint = this.drag.polygon.vertices[this.drag.vertexIndex];
          this.drag.polygon.vertices[this.drag.vertexIndex] = snapPointToGrid(currentPoint, this.gridSize);
        } else if (this.drag.type === "shape") {
          this.snapPolygonToGrid(this.drag.polygon);
        }
      }
      if (this.drag.moved) {
        if (this.drag.type === "vertex") {
          this.actionStats.vertexMoves += 1;
        } else if (this.drag.type === "shape") {
          this.actionStats.shapeMoves += 1;
        }
      }
      this.pendingDragPoint = null;
      this.pointerId = null;
      this.drag = null;
      (_b = (_a2 = this.canvas).releasePointerCapture) == null ? void 0 : _b.call(_a2, event.pointerId);
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
    drawDraftShape() {
      if (!this.draftVertices.length) return;
      const screenVertices = this.draftVertices.map((vertex) => this.worldToScreen(vertex));
      this.ctx.save();
      this.ctx.setLineDash([8, 6]);
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeStyle = "rgba(15, 103, 184, 0.92)";
      this.ctx.beginPath();
      this.ctx.moveTo(screenVertices[0].x, screenVertices[0].y);
      for (let i = 1; i < screenVertices.length; i += 1) {
        this.ctx.lineTo(screenVertices[i].x, screenVertices[i].y);
      }
      if (screenVertices.length >= 3) {
        this.ctx.closePath();
        this.ctx.fillStyle = "rgba(15, 103, 184, 0.12)";
        this.ctx.fill();
      }
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      screenVertices.forEach((point, index) => {
        const isFirst = index === 0 && screenVertices.length >= 3;
        this.ctx.beginPath();
        this.ctx.fillStyle = "#ffffff";
        this.ctx.strokeStyle = isFirst ? "#ff7c3c" : "#0f67b8";
        this.ctx.lineWidth = isFirst ? 3 : 2;
        this.ctx.arc(point.x, point.y, isFirst ? 7 : 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      });
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
      var _a2;
      if (this.hintStage < 2 || !((_a2 = this.taskGuide) == null ? void 0 : _a2.showLiveMetric)) return;
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
      this.drawDraftShape();
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
    var _a2, _b;
    try {
      return (_b = (_a2 = globalThis.localStorage) == null ? void 0 : _a2.getItem(key)) != null ? _b : null;
    } catch (error) {
      return null;
    }
  }
  function safeSetItem(key, value) {
    var _a2;
    try {
      (_a2 = globalThis.localStorage) == null ? void 0 : _a2.setItem(key, value);
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
  function renderMissionStatePills(mission) {
    var _a2;
    if (!((_a2 = mission.statuses) == null ? void 0 : _a2.length)) {
      return "";
    }
    return `
        <span class="mission-state-row">
            ${mission.statuses.map((status) => `
                <span class="mission-state mission-state-${escapeHtml(status.tone)}">${escapeHtml(status.label)}</span>
            `).join("")}
        </span>
    `;
  }
  function renderWorldSwitchChip(world, isFocused = false) {
    const tag = world.canFocus ? "button" : "section";
    const attributes = world.canFocus ? `type="button" class="map-world-chip ${isFocused ? "is-focused" : ""} ${world.isCurrentPath ? "is-current-path" : ""}" data-focus-world="${escapeHtml(world.id)}" title="${escapeHtml(world.note)}"` : `class="map-world-chip is-locked" title="${escapeHtml(world.note)}"`;
    return `
        <${tag} ${attributes}>
            <span class="map-world-chip-top">
                <strong>${escapeHtml(world.title)}</strong>
                <span class="map-world-chip-stars">${world.completedStars}/${world.totalStars} \u2605</span>
            </span>
            <span class="map-world-chip-meta">
                <span>${world.completedMissions}/${world.totalMissions} missions</span>
                ${world.locked ? '<span class="mission-state mission-state-locked">Locked</span>' : isFocused ? '<span class="mission-state mission-state-next">Showing</span>' : world.isCurrentPath ? '<span class="mission-state mission-state-next">Current path</span>' : '<span class="mission-state mission-state-done">Open</span>'}
            </span>
        </${tag}>
    `;
  }
  function renderMapMissionCard(worldId, mission, variant = "ready") {
    const tag = mission.locked ? "section" : "button";
    const attrs = mission.locked ? `class="map-mission-card ${variant === "next" ? "is-next" : ""} is-locked"` : `type="button" class="map-mission-card ${variant === "next" ? "is-next" : ""}" data-start-mission="${escapeHtml(worldId)}:${escapeHtml(mission.id)}"`;
    return `
        <${tag} ${attrs}>
            <span class="map-mission-card-top">
                <span class="focus-mission-order">${mission.order}</span>
                ${renderMissionStatePills(mission)}
            </span>
            <strong>${escapeHtml(mission.title)}</strong>
            <small>${escapeHtml(mission.short)}</small>
            <span class="map-mission-card-bottom">${renderStars(mission.stars)}</span>
        </${tag}>
    `;
  }
  function renderMissionReplayChip(worldId, mission) {
    return `
        <button type="button" class="map-mission-chip" data-start-mission="${escapeHtml(worldId)}:${escapeHtml(mission.id)}">
            <span class="map-mission-chip-title">${mission.order}. ${escapeHtml(mission.title)}</span>
            <span class="map-mission-chip-stars">${renderStars(mission.stars)}</span>
        </button>
    `;
  }
  function renderMissionRoadmapChip(mission) {
    return `
        <div class="map-roadmap-chip ${mission.isNext ? "is-next" : ""} ${mission.locked ? "is-locked" : ""}">
            <span class="map-roadmap-order">${mission.order}</span>
            <span class="map-roadmap-copy">
                <strong>${escapeHtml(mission.title)}</strong>
                <small>${escapeHtml(mission.short)}</small>
            </span>
        </div>
    `;
  }
  function renderLiveShapeContent({ summary, draftCount }) {
    if (summary) {
      return `
            <div class="live-metrics">
                <div class="live-metric">
                    <strong>Name</strong>
                    <span>${escapeHtml(summary.analysis.primaryLabel)}</span>
                </div>
                <div class="live-metric">
                    <strong>Sides</strong>
                    <span>${summary.vertices}</span>
                </div>
                <div class="live-metric">
                    <strong>Area</strong>
                    <span>${summary.area.toFixed(summary.area % 1 === 0 ? 0 : 1)}</span>
                </div>
                <div class="live-metric">
                    <strong>Around</strong>
                    <span>${summary.perimeter.toFixed(summary.perimeter % 1 === 0 ? 0 : 1)}</span>
                </div>
            </div>
        `;
    }
    if (draftCount) {
      return `<div class="empty-note">${draftCount} point${draftCount === 1 ? "" : "s"} placed. Tap the first point again when you are ready to close the polygon.</div>`;
    }
    return '<div class="empty-note">This task starts with an empty board. Use Plot or Make Shape when you are ready.</div>';
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
                        <span class="brand-sub">Mission game for drawing, fixing, and naming polygons.</span>
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
                        <p class="menu-subtitle">Each mission is short, clear, and hands-on. Plot corner points, fix near-miss polygons, and earn points while your map keeps best-star progress.</p>
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
                        <strong>Points</strong>
                        <span>Clean clears can award up to 150 points.</span>
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
    const focusWorld = state.mapFocusWorld;
    const otherWorlds = state.mapOtherWorlds || [];
    const focusMissions = (focusWorld == null ? void 0 : focusWorld.missions) || [];
    const nextMission = focusMissions.find((mission) => mission.isNext) || focusMissions.find((mission) => !mission.locked && !mission.cleared) || focusMissions[0] || null;
    const readyMissions = focusMissions.filter((mission) => !mission.locked && !mission.cleared && mission.id !== (nextMission == null ? void 0 : nextMission.id));
    const clearedMissions = focusMissions.filter((mission) => mission.cleared);
    const lockedMissions = focusMissions.filter((mission) => mission.locked && mission.id !== (nextMission == null ? void 0 : nextMission.id));
    const worldSwitcher = focusWorld ? [focusWorld, ...otherWorlds] : otherWorlds;
    return `
        <div class="app-shell screen-map">
            <div class="top-strip">
                <div class="brand">
                    <button class="icon-btn" type="button" data-nav="menu" aria-label="Back to menu">\u2190</button>
                    <div>
                        <div class="brand-title">My Map</div>
                        <span class="brand-sub">Follow the path, replay old wins, and see what unlocks next.</span>
                    </div>
                </div>
                <div class="top-stats">
                    <span class="stat-chip">Streak ${state.mapSummary.currentStreak}</span>
                    <span class="stat-chip">${state.mapSummary.badgeCount} badge${state.mapSummary.badgeCount === 1 ? "" : "s"}</span>
                    <button class="ghost-btn" type="button" data-open-modal="settings">Settings</button>
                </div>
            </div>

            <section class="screen-card map-panel">
                <section class="map-progress-strip">
                    <div class="map-progress-copy">
                        <div class="eyebrow">Next Mission</div>
                        <h2 class="map-progress-title">${escapeHtml(state.mapSummary.nextMissionLabel)}</h2>
                        <p class="map-progress-note">${escapeHtml(state.mapSummary.nextMissionCopy)}</p>
                    </div>
                    <div class="map-progress-stats">
                        <div class="map-stat-card">
                            <strong>Stars</strong>
                            <span>${state.mapSummary.earnedStars}/${state.mapSummary.totalStars}</span>
                        </div>
                        <div class="map-stat-card">
                            <strong>Missions</strong>
                            <span>${state.mapSummary.missionsCleared}/${state.mapSummary.totalMissions}</span>
                        </div>
                        <div class="map-stat-card">
                            <strong>Worlds</strong>
                            <span>${state.mapSummary.worldsCleared}/${state.mapSummary.worldCount}</span>
                        </div>
                    </div>
                </section>

                <div class="map-summary-row">
                    ${state.mapSummary.badges.length ? state.mapSummary.badges.map((badge) => `<span class="badge-pill">${escapeHtml(badge)}</span>`).join("") : '<span class="empty-note map-empty-note">Clear a boss mission to win your first badge.</span>'}
                </div>

                <div class="map-content">
                    ${focusWorld ? `
                        <section class="map-focus-world">
                            <div class="map-focus-head">
                                <div class="map-focus-copy-block">
                                    <div class="eyebrow">${escapeHtml(focusWorld.theme)}</div>
                                    <h2 class="map-focus-title">${escapeHtml(focusWorld.title)}</h2>
                                </div>
                                <div class="map-focus-meta">
                                    <span class="world-badge">${focusWorld.completedStars}/${focusWorld.totalStars} \u2605</span>
                                    <span class="map-focus-count">${focusWorld.completedMissions}/${focusWorld.totalMissions} missions</span>
                                </div>
                            </div>

                            <div class="map-focus-hero">
                                <div class="map-focus-hero-copy">
                                    <span class="eyebrow">${escapeHtml(focusWorld.calloutTitle)}</span>
                                    <strong>${escapeHtml((nextMission == null ? void 0 : nextMission.title) || focusWorld.title)}</strong>
                                    <span>${escapeHtml((nextMission == null ? void 0 : nextMission.short) || focusWorld.calloutCopy)}</span>
                                </div>
                                ${nextMission && !nextMission.locked ? `<button type="button" class="primary-btn map-focus-play" data-start-mission="${escapeHtml(focusWorld.id)}:${escapeHtml(nextMission.id)}">${nextMission.cleared ? "Replay Mission" : "Play Next"}</button>` : '<span class="map-focus-lock">World clear. Replay any mission below.</span>'}
                            </div>

                            ${readyMissions.length ? `
                                <div class="map-section-block">
                                    <div class="map-section-head">
                                        <strong>Keep Going</strong>
                                        <span>${readyMissions.length} mission${readyMissions.length === 1 ? "" : "s"} ready</span>
                                    </div>
                                    <div class="map-mission-grid">
                                        ${readyMissions.map((mission) => renderMapMissionCard(focusWorld.id, mission, "ready")).join("")}
                                    </div>
                                </div>
                            ` : ""}

                            ${clearedMissions.length ? `
                                <div class="map-section-block">
                                    <div class="map-section-head">
                                        <strong>Replay Wins</strong>
                                        <span>${clearedMissions.length} cleared</span>
                                    </div>
                                    <div class="map-chip-row">
                                        ${clearedMissions.map((mission) => renderMissionReplayChip(focusWorld.id, mission)).join("")}
                                    </div>
                                </div>
                            ` : ""}

                            ${lockedMissions.length ? `
                                <div class="map-section-block">
                                    <div class="map-section-head">
                                        <strong>Coming Later</strong>
                                        <span>Clear the path to unlock these</span>
                                    </div>
                                    <div class="map-roadmap-row">
                                        ${lockedMissions.map((mission) => renderMissionRoadmapChip(mission)).join("")}
                                    </div>
                                </div>
                            ` : ""}
                        </section>

                        <section class="map-world-switcher">
                            <div class="map-section-head">
                                <strong>Worlds</strong>
                                <span>Tap an open world to switch the view.</span>
                            </div>
                            <div class="map-world-chip-row">
                                ${worldSwitcher.map((world) => renderWorldSwitchChip(world, world.id === focusWorld.id)).join("")}
                            </div>
                        </section>
                    ` : '<div class="empty-note map-empty-note">Your map is getting ready. Start a mission and come back to see the path.</div>'}
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
    var _a2, _b;
    if (task.answerMode === "choice") {
      return renderChoiceControls(task, state);
    }
    if (task.answerMode === "number") {
      return renderNumberControls(task, state);
    }
    const boardInstruction = ((_a2 = task.proof) == null ? void 0 : _a2.requireDrawnShape) ? "Use Plot to place each corner. Tap the first point again to close your polygon." : ((_b = task.board) == null ? void 0 : _b.allowShapePicker) === false ? "Drag the existing corner points until the polygon matches." : "Make or move a shape on the board until it matches.";
    return `
        <div class="number-row">
            <div class="empty-note" style="flex: 1 1 180px;">${escapeHtml(boardInstruction)}</div>
            <button class="primary-btn" type="button" data-check-board="true">Try</button>
        </div>
    `;
  }
  function renderMissionScreen(state) {
    var _a2, _b, _c, _d, _e;
    const world = state.activeWorld;
    const mission = state.activeMission;
    const task = state.activeTask;
    const canEditBoard = ((_a2 = task.board) == null ? void 0 : _a2.editable) !== false;
    const allowShapePicker = canEditBoard && ((_b = task.board) == null ? void 0 : _b.allowShapePicker) !== false;
    const allowDraw = canEditBoard && ((_c = task.board) == null ? void 0 : _c.allowDraw) !== false;
    const taskCount = mission.tasks.length;
    const helperBadges = ((_d = task.board) == null ? void 0 : _d.helperBadges) || [];
    const answerModeClass = task.answerMode ? `answer-${task.answerMode}` : "";
    const currentHintText = state.currentHintText || ((_e = task.hintLadder) == null ? void 0 : _e[0]) || "Tap Help for a clue.";
    const feedbackClass = state.feedback.kind === "good" ? "good" : state.feedback.kind === "try" ? "try" : "";
    const primarySummary = state.boardSummary;
    return `
        <div class="app-shell screen-mission ${answerModeClass}">
            <div class="mission-layout">
                <section class="board-panel">
                    <div class="board-stage">
                        <div id="boardCanvasSlot" class="board-canvas"></div>
                        <div class="board-overlay">
                            ${state.boardGuideOpen ? `
                                <div class="board-guide-panel">
                                    <div class="board-guide-head">
                                        <strong>Guide</strong>
                                        <button class="board-guide-close" type="button" data-board-guide-toggle="hide" aria-label="Hide guide">\u2212</button>
                                    </div>
                                    <div class="board-note-stack">
                                        <div class="board-note">${escapeHtml(task.boardNote || "Move the shape on the grid.")}</div>
                                        ${state.hintStage >= 2 && task.visualNote ? `<div class="board-note">${escapeHtml(task.visualNote)}</div>` : ""}
                                    </div>
                                </div>
                            ` : ""}
                            <div class="board-note-stack">
                                <div class="board-note board-note-mode">${escapeHtml(task.modeTitle)}</div>
                            </div>
                        </div>
                    </div>

                    <div class="tool-dock">
                        <button class="tool-btn" type="button" data-open-modal="shape-picker" ${allowShapePicker ? "" : "disabled"}>
                            <span>\u2B20</span><small>Make</small>
                        </button>
                        <button class="tool-btn ${state.boardMode === "draw" ? "active" : ""}" type="button" data-board-tool="draw" ${allowDraw ? "" : "disabled"}>
                            <span>\u270E</span><small>Plot</small>
                        </button>
                        <button class="tool-btn ${state.boardMode !== "draw" ? "active" : ""}" type="button" data-board-tool="move" ${canEditBoard ? "" : "disabled"}>
                            <span>\u270B</span><small>Move</small>
                        </button>
                        <button class="tool-btn" type="button" data-board-action="undo" ${canEditBoard ? "" : "disabled"}>
                            <span>\u21B6</span><small>Undo</small>
                        </button>
                        <button class="tool-btn" type="button" data-board-action="reset" ${canEditBoard ? "" : "disabled"}>
                            <span>\u21BA</span><small>Reset</small>
                        </button>
                        <button class="tool-btn" type="button" data-board-action="clear-draft" ${allowDraw ? "" : "disabled"}>
                            <span>\u232B</span><small>Clear</small>
                        </button>
                        <button
                            class="tool-btn ${state.helpPanelOpen ? "active" : ""}"
                            type="button"
                            data-use-help="true"
                            aria-pressed="${state.helpPanelOpen ? "true" : "false"}"
                        >
                            <span>\u{1F4A1}</span><small>${state.helpPanelOpen ? "Hide" : "Help"}</small>
                        </button>
                    </div>
                </section>

                <aside class="mission-card">
                    <div class="mission-toolbar">
                        <div class="mission-toolbar-main">
                            <button class="icon-btn mission-toolbar-back" type="button" data-nav="map" aria-label="Back to map">\u2190</button>
                            <div class="mission-toolbar-copy">
                                <strong>${escapeHtml(world.title)}</strong>
                            </div>
                            <div class="task-dots">
                                ${Array.from({ length: taskCount }, (_, index) => `
                                    <span class="task-dot ${index < state.taskIndex ? "done" : index === state.taskIndex ? "live" : ""}"></span>
                                `).join("")}
                            </div>
                        </div>
                        <div class="mission-toolbar-actions">
                            <span class="stat-chip">Task ${state.taskIndex + 1}/${taskCount}</span>
                            <button class="ghost-btn mission-toolbar-settings" type="button" data-open-modal="settings">Settings</button>
                        </div>
                    </div>

                    <section class="task-card">
                        <div class="task-copy">
                            <h2 class="task-prompt">${escapeHtml(task.prompt)}</h2>
                            <p class="task-help">${escapeHtml(task.shortHelp)}</p>
                            ${helperBadges.length ? `
                                <div class="task-tag-row">
                                    ${helperBadges.map((badge) => `<span class="task-tag">${escapeHtml(badge)}</span>`).join("")}
                                </div>
                            ` : ""}
                        </div>

                        ${renderTaskControls(task, state)}

                        ${state.helpPanelOpen && state.hintStage > 0 ? `
                            <div class="task-hint-panel">
                                <div class="task-hint-head">
                                    <strong>Help</strong>
                                    ${state.hintStage < 3 ? '<button class="task-hint-btn" type="button" data-more-help="true">More Help</button>' : '<span class="task-hint-cap">Top clue</span>'}
                                </div>
                                <p class="task-help">${escapeHtml(currentHintText)}</p>
                            </div>
                        ` : ""}

                        ${state.feedback.message ? `
                            <div class="task-feedback ${feedbackClass}">
                                ${escapeHtml(state.feedback.message)}
                            </div>
                        ` : ""}

                        <div class="task-side-box">
                            <strong>Live Shape</strong>
                            <div data-live-shape>
                                ${renderLiveShapeContent({
      summary: primarySummary,
      draftCount: state.boardDraftCount
    })}
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
                        <strong>Points</strong>
                        <span>${state.pointsAwarded}</span>
                    </div>
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
  var QUIZ_IT_POLYGON_POINTS_BY_STARS = {
    1: 50,
    2: 100,
    3: 150
  };
  var _a;
  (_a = window.LAHSPointsBridge) == null ? void 0 : _a.init({ gameId: "math-quiz-it-polygon" });
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
      this.mapFocusWorldId = null;
      this.shapeChoices = getShapeChoices();
      document.body.classList.toggle("big-text", this.profile.settings.bigText);
      this.render();
    }
    getState() {
      var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r;
      const route = this.router.getState();
      const worlds = this.getWorldViewModels();
      const mapState = this.getMapScreenState(worlds);
      const boardState = ((_a2 = this.board) == null ? void 0 : _a2.getDebugState()) || null;
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
        mapSummary: mapState.summary,
        mapFocusWorld: mapState.focusWorld,
        mapOtherWorlds: mapState.otherWorlds,
        activeWorld,
        activeMission,
        activeTask: this.activeRun ? this.activeRun.tasks[this.activeRun.taskIndex] : null,
        taskIndex: ((_b = this.activeRun) == null ? void 0 : _b.taskIndex) || 0,
        hintStage: ((_c = this.activeRun) == null ? void 0 : _c.hintStage) || 0,
        currentHintText: this.getCurrentHintText(),
        maxHintStageUsed: (_g = (_f = (_d = this.activeRun) == null ? void 0 : _d.maxHintStageUsed) != null ? _f : (_e = this.resultState) == null ? void 0 : _e.maxHintStageUsed) != null ? _g : 0,
        mistakes: (_k = (_j = (_h = this.activeRun) == null ? void 0 : _h.mistakes) != null ? _j : (_i = this.resultState) == null ? void 0 : _i.mistakes) != null ? _k : 0,
        helpPanelOpen: (_m = (_l = this.activeRun) == null ? void 0 : _l.helpPanelOpen) != null ? _m : false,
        boardGuideOpen: (_o = (_n = this.activeRun) == null ? void 0 : _n.boardGuideOpen) != null ? _o : true,
        answerValue: this.answerValue,
        lastWrongChoice: this.lastWrongChoice,
        feedback: this.feedback,
        boardSummary: this.boardSummary,
        boardMode: (boardState == null ? void 0 : boardState.mode) || "move",
        boardDraftCount: (boardState == null ? void 0 : boardState.draftVertexCount) || 0,
        resultMessage: ((_p = this.resultState) == null ? void 0 : _p.message) || "",
        stars: ((_q = this.resultState) == null ? void 0 : _q.stars) || 0,
        pointsAwarded: ((_r = this.resultState) == null ? void 0 : _r.pointsAwarded) || 0,
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
      this.syncMissionToolState();
      this.syncMusicLoop();
    }
    bindEvents() {
      this.root.onclick = (event) => {
        var _a2, _b, _c, _d, _e;
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
        if (target.dataset.focusWorld) {
          this.focusMapWorld(target.dataset.focusWorld);
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
          this.toggleHelpPanel();
          return;
        }
        if (target.dataset.moreHelp) {
          this.advanceHelpStage();
          return;
        }
        if (target.dataset.boardGuideToggle) {
          this.setBoardGuideOpen(target.dataset.boardGuideToggle === "show");
          return;
        }
        if (target.dataset.boardAction === "undo") {
          (_a2 = this.board) == null ? void 0 : _a2.undo();
          return;
        }
        if (target.dataset.boardAction === "reset") {
          (_b = this.board) == null ? void 0 : _b.reset();
          return;
        }
        if (target.dataset.boardAction === "clear-draft") {
          (_c = this.board) == null ? void 0 : _c.clearDraft();
          return;
        }
        if (target.dataset.boardTool === "draw") {
          (_d = this.board) == null ? void 0 : _d.setMode("draw");
          this.render();
          return;
        }
        if (target.dataset.boardTool === "move") {
          (_e = this.board) == null ? void 0 : _e.setMode("move");
          this.render();
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
        this.activeRun.needsBoardLoad = false;
        this.board.loadTaskBoard(this.activeRun.tasks[this.activeRun.taskIndex].board);
        this.board.setHintStage(this.activeRun.hintStage || 0);
        this.boardSummary = this.board.getPrimarySummary();
      }
    }
    refreshLiveMissionBits() {
      if (this.router.screen !== "mission") return;
      const state = this.getState();
      const summaryBox = this.root.querySelector("[data-live-shape]");
      if (summaryBox) {
        summaryBox.innerHTML = renderLiveShapeContent({
          summary: state.boardSummary,
          draftCount: state.boardDraftCount
        });
      }
    }
    syncMissionToolState() {
      var _a2, _b;
      if (this.router.screen !== "mission") return;
      const mode = ((_b = (_a2 = this.board) == null ? void 0 : _a2.getDebugState()) == null ? void 0 : _b.mode) || "move";
      const drawButton = this.root.querySelector('[data-board-tool="draw"]');
      const moveButton = this.root.querySelector('[data-board-tool="move"]');
      drawButton == null ? void 0 : drawButton.classList.toggle("active", mode === "draw");
      moveButton == null ? void 0 : moveButton.classList.toggle("active", mode !== "draw");
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
      this.mapFocusWorldId = null;
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
        return `${this.resultState.message}. You earned ${this.resultState.pointsAwarded || 0} points and ${this.resultState.stars} stars.`;
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
        const previousWorld = worldIndex > 0 ? WORLDS[worldIndex - 1] : null;
        const missions = world.missions.map((mission) => {
          const record = getMissionRecord(this.profile, mission.id);
          const missionLocked = worldLocked || mission.boss && !regularCleared;
          return {
            ...mission,
            stars: record.stars,
            cleared: record.cleared,
            worldId: world.id,
            locked: missionLocked
          };
        });
        return {
          ...world,
          locked: worldLocked,
          completedMissions: missions.filter((mission) => mission.cleared).length,
          completedStars: missions.reduce((sum, mission) => sum + mission.stars, 0),
          totalStars: missions.length * 3,
          totalMissions: missions.length,
          lockCopy: worldLocked && previousWorld ? `Clear ${previousWorld.title} Boss to unlock this world.` : "This world is locked.",
          missions
        };
      });
    }
    getCurrentTargetMission(worlds = this.getWorldViewModels()) {
      const flat = worlds.flatMap((world) => world.missions.map((mission) => ({
        worldId: world.id,
        worldTitle: world.title,
        missionId: mission.id,
        title: mission.title,
        short: mission.short,
        locked: world.locked || mission.locked,
        cleared: mission.cleared
      })));
      return flat.find((entry) => !entry.locked && !entry.cleared) || null;
    }
    resolveMapFocusWorldId(worlds, currentTargetMission) {
      var _a2, _b;
      const selectableWorlds = worlds.filter((world) => !world.locked);
      if (this.mapFocusWorldId && selectableWorlds.some((world) => world.id === this.mapFocusWorldId)) {
        return this.mapFocusWorldId;
      }
      if ((currentTargetMission == null ? void 0 : currentTargetMission.worldId) && selectableWorlds.some((world) => world.id === currentTargetMission.worldId)) {
        return currentTargetMission.worldId;
      }
      return ((_a2 = selectableWorlds[selectableWorlds.length - 1]) == null ? void 0 : _a2.id) || ((_b = worlds[0]) == null ? void 0 : _b.id) || null;
    }
    buildMapMissionStatuses(mission, currentTargetMission) {
      const isNext = Boolean(
        currentTargetMission && currentTargetMission.worldId === mission.worldId && currentTargetMission.missionId === mission.id
      );
      const statuses = [];
      if (isNext) {
        statuses.push({ label: "Next", tone: "next" });
      }
      if (mission.cleared) {
        statuses.push({ label: "Done", tone: "done" });
      }
      if (mission.locked) {
        statuses.push({ label: "Locked", tone: "locked" });
      }
      if (mission.boss) {
        statuses.push({ label: "Boss", tone: "boss" });
      }
      return { isNext, statuses };
    }
    buildMapFocusWorld(world, currentTargetMission) {
      const missions = world.missions.map((mission, index) => {
        const { isNext, statuses } = this.buildMapMissionStatuses(mission, currentTargetMission);
        return {
          ...mission,
          order: index + 1,
          isNext,
          statuses
        };
      });
      const focusedNextMission = missions.find((mission) => mission.isNext) || null;
      const calloutTitle = focusedNextMission ? `Next up: ${focusedNextMission.title}` : currentTargetMission ? `${currentTargetMission.worldTitle} is your active path` : "Every mission is clear";
      const calloutCopy = focusedNextMission ? focusedNextMission.short : currentTargetMission ? `Replay here any time. The next new mission is in ${currentTargetMission.worldTitle}.` : "Replay any mission you want. Your stars and badges stay saved.";
      return {
        ...world,
        missions,
        calloutTitle,
        calloutCopy
      };
    }
    buildMapOtherWorld(world, currentTargetMission) {
      const nextOpenMission = world.missions.find((mission) => !mission.locked && !mission.cleared) || null;
      const isCurrentPath = (currentTargetMission == null ? void 0 : currentTargetMission.worldId) === world.id;
      let note = world.lockCopy;
      if (!world.locked) {
        if (isCurrentPath && nextOpenMission) {
          note = `Current path: ${nextOpenMission.title}`;
        } else if (nextOpenMission) {
          note = `${nextOpenMission.title} is ready to play.`;
        } else {
          note = "All missions here are clear. Replay for practice.";
        }
      }
      return {
        ...world,
        canFocus: !world.locked,
        isCurrentPath,
        note
      };
    }
    getMapScreenState(worlds = this.getWorldViewModels()) {
      const currentTargetMission = this.getCurrentTargetMission(worlds);
      const focusWorldId = this.resolveMapFocusWorldId(worlds, currentTargetMission);
      const focusWorldSource = worlds.find((world) => world.id === focusWorldId) || worlds[0] || null;
      this.mapFocusWorldId = focusWorldId;
      const totalStars = worlds.reduce((sum, world) => sum + world.totalStars, 0);
      const earnedStars = worlds.reduce((sum, world) => sum + world.completedStars, 0);
      const totalMissions = worlds.reduce((sum, world) => sum + world.totalMissions, 0);
      const missionsCleared = worlds.reduce((sum, world) => sum + world.completedMissions, 0);
      const worldsCleared = worlds.filter((world) => world.completedMissions === world.totalMissions).length;
      return {
        summary: {
          earnedStars,
          totalStars,
          totalMissions,
          missionsCleared,
          worldCount: worlds.length,
          worldsCleared,
          badgeCount: this.profile.badges.length,
          currentStreak: this.profile.currentStreak,
          badges: [...this.profile.badges],
          nextMissionLabel: currentTargetMission ? `${currentTargetMission.worldTitle}: ${currentTargetMission.title}` : "All missions cleared. Pick any mission to replay.",
          nextMissionCopy: currentTargetMission ? currentTargetMission.short : "Your full path is complete, so this map is now a replay board."
        },
        focusWorld: focusWorldSource ? this.buildMapFocusWorld(focusWorldSource, currentTargetMission) : null,
        otherWorlds: worlds.filter((world) => world.id !== focusWorldId).map((world) => this.buildMapOtherWorld(world, currentTargetMission))
      };
    }
    focusMapWorld(worldId) {
      const world = this.getWorldViewModels().find((entry) => entry.id === worldId);
      if (!world || world.locked) {
        return;
      }
      this.mapFocusWorldId = worldId;
      this.render();
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
        helpPanelOpen: false,
        boardGuideOpen: true,
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
      this.mapFocusWorldId = worldId;
      this.prepareTask();
      this.router.go("mission", { worldId, missionId });
    }
    prepareTask() {
      var _a2;
      if (!this.activeRun) return;
      this.activeRun.hintStage = 0;
      this.activeRun.helpPanelOpen = false;
      this.activeRun.boardGuideOpen = true;
      this.answerValue = "";
      this.lastWrongChoice = "";
      this.feedback = { kind: "", message: "" };
      this.activeRun.needsBoardLoad = true;
      (_a2 = this.board) == null ? void 0 : _a2.setHintStage(0);
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
      var _a2;
      this.boardSummary = ((_a2 = this.board) == null ? void 0 : _a2.getPrimarySummary()) || null;
      this.refreshLiveMissionBits();
      this.syncMissionToolState();
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
      var _a2, _b, _c, _d;
      const summaries = ((_a2 = this.board) == null ? void 0 : _a2.getSummaries()) || [];
      const editableSummaries = summaries.filter((summary) => !summary.polygon.locked);
      if (!editableSummaries.length) {
        if ((_c = (_b = this.board) == null ? void 0 : _b.getDebugState()) == null ? void 0 : _c.draftVertexCount) {
          return { correct: false, message: "Close your polygon by tapping the first point again." };
        }
        return {
          correct: false,
          message: ((_d = task.proof) == null ? void 0 : _d.requireDrawnShape) ? "Use Plot to draw the polygon first." : "Make or move a shape first."
        };
      }
      const matched = editableSummaries.find((summary) => {
        return this.matchesBoardTarget(summary, task.success);
      });
      if (!matched) {
        return { correct: false, message: "That shape does not match yet." };
      }
      const proofResult = this.validateBoardProof(task);
      if (!proofResult.correct) {
        return proofResult;
      }
      return {
        correct: true,
        message: task.celebrationText || `Nice! You made ${matched.analysis.primaryLabel}.`
      };
    }
    matchesBoardTarget(summary, success = {}) {
      var _a2, _b, _c, _d, _e, _f;
      const primary = summary.analysis.primaryLabel;
      const exactMatches = summary.analysis.exactMatches || [];
      const families = summary.analysis.familyLabels || [];
      const traits = summary.analysis.traits || [];
      const includesExact = (label) => exactMatches.includes(label) || primary === label;
      if ((_a2 = success.rejectPrimary) == null ? void 0 : _a2.includes(primary)) return false;
      if ((_b = success.rejectExact) == null ? void 0 : _b.some((label) => includesExact(label))) return false;
      if ((_c = success.rejectTraits) == null ? void 0 : _c.some((label) => traits.includes(label))) return false;
      if (success.primary && primary !== success.primary) return false;
      if (success.exact && !includesExact(success.exact)) return false;
      if (((_d = success.exactAny) == null ? void 0 : _d.length) && !success.exactAny.some((label) => includesExact(label))) return false;
      if ((_e = success.exactAll) == null ? void 0 : _e.some((label) => !includesExact(label))) return false;
      if (success.family && !families.includes(success.family)) return false;
      if ((_f = success.requireTraits) == null ? void 0 : _f.some((label) => !traits.includes(label))) return false;
      return true;
    }
    validateBoardProof(task) {
      var _a2;
      const proof = task.proof || {};
      const actionStats = ((_a2 = this.board) == null ? void 0 : _a2.getActionStats()) || {};
      if (proof.requireDrawnShape && (actionStats.drawnPolygons || 0) < 1) {
        return { correct: false, message: proof.drawMessage || "Use Plot to draw this polygon yourself." };
      }
      if ((proof.requireShapeCreate || 0) && (actionStats.shapeCreates || 0) < 1) {
        return { correct: false, message: proof.createMessage || "Use Make Shape before you check." };
      }
      if ((proof.minPlacedVertices || 0) > (actionStats.plottedPoints || 0)) {
        return { correct: false, message: proof.plotMessage || `Plot ${proof.minPlacedVertices} points before you check.` };
      }
      if ((proof.minVertexMoves || 0) > (actionStats.vertexMoves || 0)) {
        return { correct: false, message: proof.moveMessage || "Move at least one corner point to prove the shape rule." };
      }
      if ((proof.minShapeMoves || 0) > (actionStats.shapeMoves || 0)) {
        return { correct: false, message: proof.shapeMoveMessage || "Slide the whole shape before you check." };
      }
      return { correct: true };
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
      var _a2;
      if (!this.activeRun) return;
      const task = this.activeRun.tasks[this.activeRun.taskIndex];
      if (task.answerMode !== "number") return;
      const value = Number.parseFloat(this.answerValue);
      if (!Number.isFinite(value)) {
        if (manual) this.registerMistake("Type a number first.");
        return;
      }
      const summary = this.boardSummary || ((_a2 = this.board) == null ? void 0 : _a2.getPrimarySummary());
      const target = summary ? summary[task.success.metric] : Number.NaN;
      const correct = Number.isFinite(target) && Math.abs(value - target) <= task.success.tolerance;
      if (correct) {
        this.completeTask(task.celebrationText || "You measured it!");
      } else if (manual) {
        this.registerMistake(`Try again. Check the ${task.success.metric === "area" ? "inside space" : "outside path"} one more time.`);
      }
    }
    getCurrentHintText() {
      var _a2;
      if (!this.activeRun) return "";
      const task = this.activeRun.tasks[this.activeRun.taskIndex];
      if (!((_a2 = task == null ? void 0 : task.hintLadder) == null ? void 0 : _a2.length)) {
        return "";
      }
      const safeIndex = Math.max(0, Math.min(task.hintLadder.length - 1, (this.activeRun.hintStage || 1) - 1));
      return task.hintLadder[safeIndex] || "";
    }
    toggleHelpPanel() {
      if (!this.activeRun) return;
      if (this.activeRun.helpPanelOpen) {
        this.activeRun.helpPanelOpen = false;
        this.render();
        return;
      }
      if (this.activeRun.hintStage === 0) {
        this.advanceHelpStage();
        return;
      }
      this.activeRun.helpPanelOpen = true;
      this.activeRun.boardGuideOpen = true;
      const hintText = this.getCurrentHintText();
      if (this.profile.settings.readAloud && hintText) {
        this.speak(hintText);
      }
      this.render();
    }
    advanceHelpStage() {
      var _a2;
      if (!this.activeRun) return;
      this.activeRun.hintStage = Math.min(3, this.activeRun.hintStage + 1);
      this.activeRun.helpPanelOpen = true;
      this.activeRun.boardGuideOpen = true;
      this.activeRun.maxHintStageUsed = Math.max(this.activeRun.maxHintStageUsed, this.activeRun.hintStage);
      (_a2 = this.board) == null ? void 0 : _a2.setHintStage(this.activeRun.hintStage);
      const hintText = this.getCurrentHintText();
      if (this.profile.settings.readAloud && hintText) {
        this.speak(hintText);
      }
      this.render();
    }
    setBoardGuideOpen(open) {
      if (!this.activeRun) return;
      this.activeRun.boardGuideOpen = open;
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
      var _a2;
      if (!this.activeRun) return;
      const { worldId, missionId, mistakes, maxHintStageUsed } = this.activeRun;
      const world = getWorldById(worldId);
      const mission = getMissionById(worldId, missionId);
      const previousRecord = getMissionRecord(this.profile, missionId);
      const stars = this.calculateStars(mistakes, maxHintStageUsed);
      const pointsAwarded = QUIZ_IT_POLYGON_POINTS_BY_STARS[stars] || QUIZ_IT_POLYGON_POINTS_BY_STARS[1];
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
      (_a2 = window.LAHSPointsBridge) == null ? void 0 : _a2.awardPoints(pointsAwarded, {
        label: "Mission Clear",
        meta: {
          worldId,
          missionId,
          stars
        }
      });
      this.resultState = {
        worldId,
        missionId,
        stars,
        pointsAwarded,
        mistakes,
        maxHintStageUsed,
        message: stars === 3 ? `Star job! You cleared that mission with a clean run and earned ${pointsAwarded} points.` : stars === 2 ? `Nice work! You earned ${pointsAwarded} points.` : `Good job! You finished the mission and earned ${pointsAwarded} points.`
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
      var _a2, _b;
      const task = this.activeRun ? this.activeRun.tasks[this.activeRun.taskIndex] : null;
      if (((_a2 = task == null ? void 0 : task.board) == null ? void 0 : _a2.allowShapePicker) === false) {
        return;
      }
      (_b = this.board) == null ? void 0 : _b.createOrReplaceShape(shapeType);
      this.showShapePicker = false;
      this.render();
    }
  };
  var app = new QuizItPolygonApp(document.getElementById("app"));
  window.quizItPolygonApp = app;
  window.render_game_to_text = () => {
    var _a2, _b, _c, _d, _e, _f, _g;
    return JSON.stringify({
      screen: app.router.screen,
      world: ((_a2 = app.activeRun) == null ? void 0 : _a2.worldId) || ((_b = app.resultState) == null ? void 0 : _b.worldId) || null,
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
