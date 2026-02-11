const GameLevels = [
    // =====================================================
    // TIER 1: EASY (Stages 1-5) - Learning the Basics
    // Difficulty Range: 35-60
    // Focus: Simple shapes, intuitive divisions
    // =====================================================
    {
        id: 1, name: "Stage 1", focus: "First Cut", instruction: "Draw a line to split the rectangle into 2 equal parts.",
        startShapeVertices: [{ x: -120, y: -80 }, { x: 120, y: -80 }, { x: 120, y: 80 }, { x: -120, y: 80 }],
        color: '#90cdf4', targetPieces: 2, maxLines: 1,
        starThresholds: { one: 0.05, two: 0.03, three: 0.01 }
    },
    {
        id: 2, name: "Stage 2", focus: "Triangle Basics", instruction: "Split the triangle into 2 equal parts.",
        startShapeVertices: [{ x: 0, y: -120 }, { x: 120, y: 80 }, { x: -120, y: 80 }],
        color: '#a3bffa', targetPieces: 2, maxLines: 1,
        starThresholds: { one: 0.05, two: 0.03, three: 0.01 }
    },
    {
        id: 3, name: "Stage 3", focus: "Thirds", instruction: "Split the rectangle into 3 equal parts.",
        startShapeVertices: [{ x: -150, y: -60 }, { x: 150, y: -60 }, { x: 150, y: 60 }, { x: -150, y: 60 }],
        color: '#b794f4', targetPieces: 3, maxLines: 2,
        starThresholds: { one: 0.05, two: 0.03, three: 0.01 }
    },
    {
        id: 4, name: "Stage 4", focus: "Quarters", instruction: "Split the square into 4 equal parts.",
        startShapeVertices: [{ x: 0, y: -120 }, { x: 103.923048, y: 60 }, { x: -103.923048, y: 60 }],
        color: '#81e6d9', targetPieces: 3, maxLines: 2,
        starThresholds: { one: 0.06, two: 0.04, three: 0.02 }
    },
    {
        id: 5, name: "Stage 5", focus: "Triangle Thirds", instruction: "Split the triangle into 3 equal parts.",
        startShapeVertices: [{ x: 0, y: -120 }, { x: 120, y: 0 }, { x: 0, y: 120 }, { x: -120, y: 0 }],
        color: '#fbb6ce', targetPieces: 3, maxLines: 2,
        starThresholds: { one: 0.06, two: 0.04, three: 0.02 }
    },

    // =====================================================
    // TIER 2: EASY-MEDIUM (Stages 6-10) - Building Efficiency
    // Difficulty Range: 55-90
    // Focus: Efficiency, more pieces, new shapes
    // =====================================================
    {
        id: 6, name: "Stage 6", focus: "Efficiency I", instruction: "Create 4 pieces with only 2 lines.",
        startShapeVertices: [{ x: 0, y: -120 }, { x: 114.126782, y: -37.082039 }, { x: 70.53423, y: 97.082039 }, { x: -70.53423, y: 97.082039 }, { x: -114.126782, y: -37.082039 }],
        color: '#9ae6b4', targetPieces: 6, maxLines: 3,
        starThresholds: { one: 0.06, two: 0.04, three: 0.02 }
    },
    {
        id: 7, name: "Stage 7", focus: "Efficiency II", instruction: "Create 6 pieces with 3 lines.",
        startShapeVertices: [{ x: 0, y: -120 }, { x: 120, y: 0 }, { x: 0, y: 120 }, { x: -120, y: 0 }],
        color: '#90cdf4', targetPieces: 6, maxLines: 3,
        starThresholds: { one: 0.06, two: 0.04, three: 0.02 }
    },
    {
        id: 8, name: "Stage 8", focus: "Triangle Planning", instruction: "Create 5 pieces with 2 lines.",
        startShapeVertices: [{ x: 0, y: -140 }, { x: 140, y: 80 }, { x: -140, y: 80 }],
        color: '#fbd38d', targetPieces: 5, maxLines: 3,
        starThresholds: { one: 0.06, two: 0.04, three: 0.02 }
    },
    {
        id: 9, name: "Stage 9", focus: "Pentagon Entry", instruction: "Split the pentagon into 5 equal parts.",
        startShapeVertices: [{ x: 0, y: -130 }, { x: 120, y: -40 }, { x: 75, y: 100 }, { x: -75, y: 100 }, { x: -120, y: -40 }],
        color: '#feb2b2', targetPieces: 5, maxLines: 3,
        starThresholds: { one: 0.06, two: 0.04, three: 0.02 }
    },
    {
        id: 10, name: "Stage 10", focus: "Skewed Shape", instruction: "Split the trapezoid into 6 equal parts.",
        startShapeVertices: [{ x: -120, y: -80 }, { x: 80, y: -100 }, { x: 120, y: 60 }, { x: -100, y: 80 }],
        color: '#c4b5fd', targetPieces: 6, maxLines: 3,
        starThresholds: { one: 0.06, two: 0.04, three: 0.02 }
    },

    // =====================================================
    // TIER 3: MEDIUM (Stages 11-15) - Tight Constraints
    // Difficulty Range: 85-105
    // Focus: High efficiency ratios, irregular shapes
    // =====================================================
    {
        id: 11, name: "Stage 11", focus: "High Constraint", instruction: "Create 5 pieces with only 2 lines!",
        startShapeVertices: [{ x: -120, y: -80 }, { x: 120, y: -80 }, { x: 120, y: 80 }, { x: -120, y: 80 }],
        color: '#81e6d9', targetPieces: 5, maxLines: 3,
        starThresholds: { one: 0.07, two: 0.045, three: 0.025 }
    },
    {
        id: 12, name: "Stage 12", focus: "Parallelogram", instruction: "Split the parallelogram into 6 equal parts.",
        startShapeVertices: [{ x: -100, y: -60 }, { x: 100, y: -60 }, { x: 140, y: 60 }, { x: -60, y: 60 }],
        color: '#a3bffa', targetPieces: 9, maxLines: 4,
        starThresholds: { one: 0.06, two: 0.04, three: 0.02 }
    },
    {
        id: 13, name: "Stage 13", focus: "Irregular Hexagon", instruction: "Split into 5 equal parts with 2 lines!",
        startShapeVertices: [{ x: 0, y: -120 }, { x: 103.923048, y: -60 }, { x: 103.923048, y: 60 }, { x: 0, y: 120 }, { x: -103.923048, y: 60 }, { x: -103.923048, y: -60 }],
        color: '#fbd38d', targetPieces: 5, maxLines: 4,
        starThresholds: { one: 0.07, two: 0.045, three: 0.03 }
    },
    {
        id: 14, name: "Stage 14", focus: "Irregular Pentagon", instruction: "Split the pentagon into 6 equal parts.",
        startShapeVertices: [{ x: 400, y: 360 }, { x: 400, y: 480 }, { x: 440, y: 480 }, { x: 440, y: 360 }, { x: 480, y: 360 }, { x: 480, y: 240 }, { x: 440, y: 240 }, { x: 440, y: 340 }, { x: 400, y: 340 }],
        color: '#9ae6b4', targetPieces: 3, maxLines: 2,
        starThresholds: { one: 0.06, two: 0.04, three: 0.02 }
    },
    {
        id: 15, name: "Stage 15", focus: "Double Digits", instruction: "Create 8 pieces with 4 strategic lines.",
        startShapeVertices: [{ x: -120, y: -80 }, { x: 120, y: -80 }, { x: 120, y: 80 }, { x: -120, y: 80 }],
        color: '#b794f4', targetPieces: 8, maxLines: 4,
        starThresholds: { one: 0.18, two: 0.12, three: 0.06 }
    },

    // =====================================================
    // TIER 4: MEDIUM-HARD (Stages 16-20) - Precision Required
    // Difficulty Range: 100-135
    // Focus: Very tight constraints, complex shapes
    // =====================================================
    {
        id: 16, name: "Stage 16", focus: "Tight Square", instruction: "Create 8 pieces with only 3 lines!",
        startShapeVertices: [{ x: -100, y: -100 }, { x: 100, y: -100 }, { x: 100, y: 100 }, { x: -100, y: 100 }],
        color: '#90cdf4', targetPieces: 8, maxLines: 3,
        starThresholds: { one: 0.18, two: 0.12, three: 0.06 }
    },
    {
        id: 17, name: "Stage 17", focus: "Precision", instruction: "Create 8 pieces with 3 lines.",
        startShapeVertices: [{ x: -150, y: -80 }, { x: 150, y: -80 }, { x: 150, y: 80 }, { x: -150, y: 80 }],
        color: '#fbb6ce', targetPieces: 8, maxLines: 3,
        starThresholds: { one: 0.18, two: 0.12, three: 0.06 }
    },
    {
        id: 18, name: "Stage 18", focus: "Octagon Challenge", instruction: "Split the octagon into 8 pieces with 3 lines!",
        startShapeVertices: [{ x: 0, y: -140 }, { x: 100, y: -100 }, { x: 140, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 140 }, { x: -100, y: 100 }, { x: -140, y: 0 }, { x: -100, y: -100 }],
        color: '#81e6d9', targetPieces: 8, maxLines: 3,
        starThresholds: { one: 0.18, two: 0.12, three: 0.06 }
    },
    {
        id: 19, name: "Stage 19", focus: "Nine Pieces", instruction: "Split the trapezoid into 9 equal parts.",
        startShapeVertices: [{ x: -160, y: -70 }, { x: 160, y: -70 }, { x: 110, y: 90 }, { x: -110, y: 90 }],
        color: '#c4b5fd', targetPieces: 9, maxLines: 4,
        starThresholds: { one: 0.18, two: 0.12, three: 0.06 }
    },
    {
        id: 20, name: "Stage 20", focus: "Hexagon Mastery", instruction: "Split the hexagon into 8 pieces with 3 lines!",
        startShapeVertices: [{ x: 0, y: -130 }, { x: 115, y: -65 }, { x: 115, y: 65 }, { x: 0, y: 130 }, { x: -115, y: 65 }, { x: -115, y: -65 }],
        color: '#feb2b2', targetPieces: 8, maxLines: 3,
        starThresholds: { one: 0.18, two: 0.12, three: 0.06 }
    },

    // =====================================================
    // TIER 5: HARD (Stages 21-25) - Expert Challenges
    // Difficulty Range: 140-170
    // Focus: Double-digit pieces, extreme constraints
    // =====================================================
    {
        id: 21, name: "Stage 21", focus: "Dozen Pieces", instruction: "Create 12 pieces with 4 lines!",
        startShapeVertices: [{ x: -140, y: -90 }, { x: 140, y: -90 }, { x: 140, y: 90 }, { x: -140, y: 90 }],
        color: '#9ae6b4', targetPieces: 12, maxLines: 4,
        starThresholds: { one: 0.18, two: 0.12, three: 0.06 }
    },
    {
        id: 22, name: "Stage 22", focus: "Octagon Pressure", instruction: "Split the octagon into 10 pieces with 3 lines!",
        startShapeVertices: [{ x: 0, y: -160 }, { x: 120, y: -120 }, { x: 160, y: 0 }, { x: 120, y: 120 }, { x: 0, y: 160 }, { x: -120, y: 120 }, { x: -160, y: 0 }, { x: -120, y: -120 }],
        color: '#a3bffa', targetPieces: 10, maxLines: 3,
        starThresholds: { one: 0.18, two: 0.12, three: 0.06 }
    },
    {
        id: 23, name: "Stage 23", focus: "Grid Master", instruction: "Create 12 pieces with 4 lines on the square.",
        startShapeVertices: [{ x: -120, y: -120 }, { x: 120, y: -120 }, { x: 120, y: 120 }, { x: -120, y: 120 }],
        color: '#fbd38d', targetPieces: 12, maxLines: 4,
        starThresholds: { one: 0.18, two: 0.12, three: 0.06 }
    },
    {
        id: 24, name: "Stage 24", focus: "Dodecagon", instruction: "Split the dodecagon into 12 equal parts.",
        startShapeVertices: [{ x: 0, y: -140 }, { x: 70, y: -121 }, { x: 121, y: -70 }, { x: 140, y: 0 }, { x: 121, y: 70 }, { x: 70, y: 121 }, { x: 0, y: 140 }, { x: -70, y: 121 }, { x: -121, y: 70 }, { x: -140, y: 0 }, { x: -121, y: -70 }, { x: -70, y: -121 }],
        color: '#b794f4', targetPieces: 12, maxLines: 5,
        starThresholds: { one: 0.18, two: 0.12, three: 0.06 }
    },
    {
        id: 25, name: "Stage 25", focus: "Irregular Master", instruction: "Split irregular hexagon into 12 pieces with 4 lines!",
        startShapeVertices: [{ x: -120, y: -100 }, { x: 30, y: -120 }, { x: 120, y: -30 }, { x: 80, y: 110 }, { x: -30, y: 130 }, { x: -130, y: 20 }],
        color: '#90cdf4', targetPieces: 12, maxLines: 4,
        starThresholds: { one: 0.18, two: 0.12, three: 0.06 }
    },

    // =====================================================
    // TIER 6: EXPERT (Stages 26-30) - Legendary Challenges
    // Difficulty Range: 180-240
    // Focus: Extreme piece counts, near-impossible constraints
    // =====================================================
    {
        id: 26, name: "Stage 26", focus: "Octagon Expert", instruction: "Create 15 pieces with 4 lines on the octagon!",
        startShapeVertices: [{ x: 0, y: -160 }, { x: 120, y: -120 }, { x: 160, y: 0 }, { x: 120, y: 120 }, { x: 0, y: 160 }, { x: -120, y: 120 }, { x: -160, y: 0 }, { x: -120, y: -120 }],
        color: '#ff6b6b', targetPieces: 15, maxLines: 4,
        starThresholds: { one: 0.18, two: 0.12, three: 0.06 }
    },
    {
        id: 27, name: "Stage 27", focus: "Grid Legend", instruction: "Split the square into 16 pieces with 5 lines!",
        startShapeVertices: [{ x: -120, y: -120 }, { x: 120, y: -120 }, { x: 120, y: 120 }, { x: -120, y: 120 }],
        color: '#f6ad55', targetPieces: 16, maxLines: 5,
        starThresholds: { one: 0.18, two: 0.12, three: 0.06 }
    },
    {
        id: 28, name: "Stage 28", focus: "Hexagon Legend", instruction: "Split the hexagon into 16 pieces with 5 lines!",
        startShapeVertices: [{ x: 0, y: -180 }, { x: 156, y: -90 }, { x: 156, y: 90 }, { x: 0, y: 180 }, { x: -156, y: 90 }, { x: -156, y: -90 }],
        color: '#63b3ed', targetPieces: 16, maxLines: 5,
        starThresholds: { one: 0.18, two: 0.12, three: 0.06 }
    },
    {
        id: 29, name: "Stage 29", focus: "Decagon Pressure", instruction: "Split the decagon into 15 pieces with 4 lines!",
        startShapeVertices: [{ x: 0, y: -160 }, { x: 94, y: -129 }, { x: 152, y: -49 }, { x: 152, y: 49 }, { x: 94, y: 129 }, { x: 0, y: 160 }, { x: -94, y: 129 }, { x: -152, y: 49 }, { x: -152, y: -49 }, { x: -94, y: -129 }],
        color: '#d53f8c', targetPieces: 15, maxLines: 4,
        starThresholds: { one: 0.18, two: 0.12, three: 0.06 }
    },
    {
        id: 30, name: "Stage 30", focus: "THE LEGEND", instruction: "ULTIMATE: Split the decagon into 20 pieces with 5 lines!",
        startShapeVertices: [{ x: 0, y: -180 }, { x: 106, y: -145 }, { x: 171, y: -55 }, { x: 171, y: 55 }, { x: 106, y: 145 }, { x: 0, y: 180 }, { x: -106, y: 145 }, { x: -171, y: 55 }, { x: -171, y: -55 }, { x: -106, y: -145 }],
        color: '#805ad5', targetPieces: 20, maxLines: 5,
        starThresholds: { one: 0.18, two: 0.12, three: 0.06 }
    }
];

// Export for use in game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameLevels;
}