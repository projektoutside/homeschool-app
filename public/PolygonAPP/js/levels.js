const GameLevels = [
    // =====================================================
    // TIER 1: EASY (Stages 1-5) - Learning the Basics
    // Difficulty Range: 35-60
    // Focus: Simple shapes, intuitive divisions
    // =====================================================
    {
        id: 1, name: "Stage 1", focus: "First Cut", instruction: "Draw a line to split the rectangle into 2 equal parts.",
        startShapeVertices: [{ x: -120, y: -80 }, { x: 120, y: -80 }, { x: 120, y: 80 }, { x: -120, y: 80 }],
        color: '#90cdf4', targetPieces: 2, maxLines: 1
        // Difficulty: 38 - Pure introduction
    },
    {
        id: 2, name: "Stage 2", focus: "Triangle Basics", instruction: "Split the triangle into 2 equal parts.",
        startShapeVertices: [{ x: 0, y: -120 }, { x: 120, y: 80 }, { x: -120, y: 80 }],
        color: '#a3bffa', targetPieces: 2, maxLines: 1
        // Difficulty: 36 - Same complexity, different shape
    },
    {
        id: 3, name: "Stage 3", focus: "Thirds", instruction: "Split the rectangle into 3 equal parts.",
        startShapeVertices: [{ x: -150, y: -60 }, { x: 150, y: -60 }, { x: 150, y: 60 }, { x: -150, y: 60 }],
        color: '#b794f4', targetPieces: 3, maxLines: 2
        // Difficulty: 45.5 - Introducing multiple lines
    },
    {
        id: 4, name: "Stage 4", focus: "Quarters", instruction: "Split the square into 4 equal parts.",
        startShapeVertices: [{ x: -100, y: -100 }, { x: 100, y: -100 }, { x: 100, y: 100 }, { x: -100, y: 100 }],
        color: '#81e6d9', targetPieces: 4, maxLines: 2
        // Difficulty: 58 - Grid thinking introduced
    },
    {
        id: 5, name: "Stage 5", focus: "Triangle Thirds", instruction: "Split the triangle into 3 equal parts.",
        startShapeVertices: [{ x: 0, y: -130 }, { x: 130, y: 80 }, { x: -130, y: 80 }],
        color: '#fbb6ce', targetPieces: 4, maxLines: 2
        // Difficulty: 56 - Triangle mastery (increased from 3p to 4p for better curve)
    },

    // =====================================================
    // TIER 2: EASY-MEDIUM (Stages 6-10) - Building Efficiency
    // Difficulty Range: 55-90
    // Focus: Efficiency, more pieces, new shapes
    // =====================================================
    {
        id: 6, name: "Stage 6", focus: "Efficiency I", instruction: "Create 4 pieces with only 2 lines.",
        startShapeVertices: [{ x: -120, y: -80 }, { x: 120, y: -80 }, { x: 120, y: 80 }, { x: -120, y: 80 }],
        color: '#9ae6b4', targetPieces: 4, maxLines: 2
        // Difficulty: 58 - Efficiency concept
    },
    {
        id: 7, name: "Stage 7", focus: "Efficiency II", instruction: "Create 6 pieces with 3 lines.",
        startShapeVertices: [{ x: -140, y: -100 }, { x: 140, y: -100 }, { x: 140, y: 100 }, { x: -140, y: 100 }],
        color: '#90cdf4', targetPieces: 6, maxLines: 3
        // Difficulty: 78 - More pieces
    },
    {
        id: 8, name: "Stage 8", focus: "Triangle Planning", instruction: "Create 5 pieces with 2 lines.",
        startShapeVertices: [{ x: 0, y: -140 }, { x: 140, y: 80 }, { x: -140, y: 80 }],
        color: '#fbd38d', targetPieces: 5, maxLines: 2
        // Difficulty: 73.5 - Tight constraint on triangle (5/2 = 2.5 ratio!)
    },
    {
        id: 9, name: "Stage 9", focus: "Pentagon Entry", instruction: "Split the pentagon into 5 equal parts.",
        startShapeVertices: [
            { x: 0, y: -130 }, { x: 120, y: -40 }, { x: 75, y: 100 },
            { x: -75, y: 100 }, { x: -120, y: -40 }
        ],
        color: '#feb2b2', targetPieces: 5, maxLines: 3
        // Difficulty: 68.3 - New shape type
    },
    {
        id: 10, name: "Stage 10", focus: "Skewed Shape", instruction: "Split the trapezoid into 6 equal parts.",
        startShapeVertices: [{ x: -120, y: -80 }, { x: 80, y: -100 }, { x: 120, y: 60 }, { x: -100, y: 80 }],
        color: '#c4b5fd', targetPieces: 6, maxLines: 3
        // Difficulty: 88 - Irregular shape + more pieces
    },

    // =====================================================
    // TIER 3: MEDIUM (Stages 11-15) - Tight Constraints
    // Difficulty Range: 85-105
    // Focus: High efficiency ratios, irregular shapes
    // =====================================================
    {
        id: 11, name: "Stage 11", focus: "High Constraint", instruction: "Create 5 pieces with only 2 lines!",
        startShapeVertices: [{ x: -120, y: -80 }, { x: 120, y: -80 }, { x: 120, y: 80 }, { x: -120, y: 80 }],
        color: '#81e6d9', targetPieces: 5, maxLines: 2
        // Difficulty: 70.5 - TIGHT! 5/2 = 2.5 ratio (was too easy before)
    },
    {
        id: 12, name: "Stage 12", focus: "Parallelogram", instruction: "Split the parallelogram into 6 equal parts.",
        startShapeVertices: [{ x: -100, y: -60 }, { x: 100, y: -60 }, { x: 140, y: 60 }, { x: -60, y: 60 }],
        color: '#a3bffa', targetPieces: 6, maxLines: 3
        // Difficulty: 88 - Skewed shape
    },
    {
        id: 13, name: "Stage 13", focus: "Irregular Hexagon", instruction: "Split into 5 equal parts with 2 lines!",
        startShapeVertices: [
            { x: -100, y: -100 }, { x: 30, y: -120 }, { x: 120, y: -20 },
            { x: 80, y: 100 }, { x: -30, y: 120 }, { x: -120, y: 20 }
        ],
        color: '#fbd38d', targetPieces: 5, maxLines: 2
        // Difficulty: 84.5 - Irregular + tight constraint (was 4p/2l, now 5p/2l)
    },
    {
        id: 14, name: "Stage 14", focus: "Irregular Pentagon", instruction: "Split the pentagon into 6 equal parts.",
        startShapeVertices: [
            { x: 0, y: -120 }, { x: 110, y: -30 }, { x: 80, y: 100 },
            { x: -50, y: 90 }, { x: -110, y: -20 }
        ],
        color: '#9ae6b4', targetPieces: 6, maxLines: 3
        // Difficulty: 90 - Irregular + pieces
    },
    {
        id: 15, name: "Stage 15", focus: "Double Digits", instruction: "Create 8 pieces with 4 strategic lines.",
        startShapeVertices: [{ x: -120, y: -80 }, { x: 120, y: -80 }, { x: 120, y: 80 }, { x: -120, y: 80 }],
        color: '#b794f4', targetPieces: 8, maxLines: 4
        // Difficulty: 98 - Double digit pieces! (was 2p/1l, way too easy)
    },

    // =====================================================
    // TIER 4: MEDIUM-HARD (Stages 16-20) - Precision Required
    // Difficulty Range: 100-135
    // Focus: Very tight constraints, complex shapes
    // =====================================================
    {
        id: 16, name: "Stage 16", focus: "Tight Square", instruction: "Create 8 pieces with only 3 lines!",
        startShapeVertices: [{ x: -100, y: -100 }, { x: 100, y: -100 }, { x: 100, y: 100 }, { x: -100, y: 100 }],
        color: '#90cdf4', targetPieces: 8, maxLines: 3
        // Difficulty: 101.3 - 8/3 = 2.67 ratio (was 5p/3l rect, too easy)
    },
    {
        id: 17, name: "Stage 17", focus: "Precision", instruction: "Create 8 pieces with 3 lines.",
        startShapeVertices: [{ x: -150, y: -80 }, { x: 150, y: -80 }, { x: 150, y: 80 }, { x: -150, y: 80 }],
        color: '#fbb6ce', targetPieces: 8, maxLines: 3
        // Difficulty: 101.3 - Tight on large rectangle
    },
    {
        id: 18, name: "Stage 18", focus: "Octagon Challenge", instruction: "Split the octagon into 8 pieces with 3 lines!",
        startShapeVertices: [
            { x: 0, y: -140 }, { x: 100, y: -100 }, { x: 140, y: 0 },
            { x: 100, y: 100 }, { x: 0, y: 140 }, { x: -100, y: 100 },
            { x: -140, y: 0 }, { x: -100, y: -100 }
        ],
        color: '#81e6d9', targetPieces: 8, maxLines: 3
        // Difficulty: 109.3 - Complex shape + tight constraint (was 6p/3l)
    },
    {
        id: 19, name: "Stage 19", focus: "Nine Pieces", instruction: "Split the trapezoid into 9 equal parts.",
        startShapeVertices: [{ x: -160, y: -70 }, { x: 160, y: -70 }, { x: 110, y: 90 }, { x: -110, y: 90 }],
        color: '#c4b5fd', targetPieces: 9, maxLines: 4
        // Difficulty: 119.25 - Many pieces on irregular shape
    },
    {
        id: 20, name: "Stage 20", focus: "Hexagon Mastery", instruction: "Split the hexagon into 8 pieces with 3 lines!",
        startShapeVertices: [
            { x: 0, y: -130 }, { x: 115, y: -65 }, { x: 115, y: 65 },
            { x: 0, y: 130 }, { x: -115, y: 65 }, { x: -115, y: -65 }
        ],
        color: '#feb2b2', targetPieces: 8, maxLines: 3
        // Difficulty: 105.3 - Tight constraint on hexagon (was 5p/3l, too easy)
    },

    // =====================================================
    // TIER 5: HARD (Stages 21-25) - Expert Challenges
    // Difficulty Range: 140-170
    // Focus: Double-digit pieces, extreme constraints
    // =====================================================
    {
        id: 21, name: "Stage 21", focus: "Dozen Pieces", instruction: "Create 12 pieces with 4 lines!",
        startShapeVertices: [{ x: -140, y: -90 }, { x: 140, y: -90 }, { x: 140, y: 90 }, { x: -140, y: 90 }],
        color: '#9ae6b4', targetPieces: 12, maxLines: 4
        // Difficulty: 143 - Double digits! (was 4p/2l, way too easy)
    },
    {
        id: 22, name: "Stage 22", focus: "Octagon Pressure", instruction: "Split the octagon into 10 pieces with 3 lines!",
        startShapeVertices: [
            { x: 0, y: -160 }, { x: 120, y: -120 }, { x: 160, y: 0 },
            { x: 120, y: 120 }, { x: 0, y: 160 }, { x: -120, y: 120 },
            { x: -160, y: 0 }, { x: -120, y: -120 }
        ],
        color: '#a3bffa', targetPieces: 10, maxLines: 3
        // Difficulty: 132.7 - 10/3 = 3.33 ratio! Extreme! (was 4p/2l)
    },
    {
        id: 23, name: "Stage 23", focus: "Grid Master", instruction: "Create 12 pieces with 4 lines on the square.",
        startShapeVertices: [{ x: -120, y: -120 }, { x: 120, y: -120 }, { x: 120, y: 120 }, { x: -120, y: 120 }],
        color: '#fbd38d', targetPieces: 12, maxLines: 4
        // Difficulty: 143 - Grid challenge (was 4p/3l, way too easy)
    },
    {
        id: 24, name: "Stage 24", focus: "Dodecagon", instruction: "Split the dodecagon into 12 equal parts.",
        startShapeVertices: [
            { x: 0, y: -140 }, { x: 70, y: -121 }, { x: 121, y: -70 },
            { x: 140, y: 0 }, { x: 121, y: 70 }, { x: 70, y: 121 },
            { x: 0, y: 140 }, { x: -70, y: 121 }, { x: -121, y: 70 },
            { x: -140, y: 0 }, { x: -121, y: -70 }, { x: -70, y: -121 }
        ],
        color: '#b794f4', targetPieces: 12, maxLines: 5
        // Difficulty: 156 - Many vertices + pieces (kept similar, boosted pieces)
    },
    {
        id: 25, name: "Stage 25", focus: "Irregular Master", instruction: "Split irregular hexagon into 12 pieces with 4 lines!",
        startShapeVertices: [
            { x: -120, y: -100 }, { x: 30, y: -120 }, { x: 120, y: -30 },
            { x: 80, y: 110 }, { x: -30, y: 130 }, { x: -130, y: 20 }
        ],
        color: '#90cdf4', targetPieces: 12, maxLines: 4
        // Difficulty: 157 - Irregular + many pieces (was 4p/2l, way too easy)
    },

    // =====================================================
    // TIER 6: EXPERT (Stages 26-30) - Legendary Challenges
    // Difficulty Range: 180-240
    // Focus: Extreme piece counts, near-impossible constraints
    // =====================================================
    {
        id: 26, name: "Stage 26", focus: "Octagon Expert", instruction: "Create 15 pieces with 4 lines on the octagon!",
        startShapeVertices: [
            { x: 0, y: -160 }, { x: 120, y: -120 }, { x: 160, y: 0 },
            { x: 120, y: 120 }, { x: 0, y: 160 }, { x: -120, y: 120 },
            { x: -160, y: 0 }, { x: -120, y: -120 }
        ],
        color: '#ff6b6b', targetPieces: 15, maxLines: 4
        // Difficulty: 184.75 - 15/4 = 3.75 ratio! (was 8p/4l, too easy)
    },
    {
        id: 27, name: "Stage 27", focus: "Grid Legend", instruction: "Split the square into 16 pieces with 5 lines!",
        startShapeVertices: [{ x: -120, y: -120 }, { x: 120, y: -120 }, { x: 120, y: 120 }, { x: -120, y: 120 }],
        color: '#f6ad55', targetPieces: 16, maxLines: 5
        // Difficulty: 184 - 4×4 grid mastery (was 9p/4l)
    },
    {
        id: 28, name: "Stage 28", focus: "Hexagon Legend", instruction: "Split the hexagon into 16 pieces with 5 lines!",
        startShapeVertices: [
            { x: 0, y: -180 }, { x: 156, y: -90 }, { x: 156, y: 90 },
            { x: 0, y: 180 }, { x: -156, y: 90 }, { x: -156, y: -90 }
        ],
        color: '#63b3ed', targetPieces: 16, maxLines: 5
        // Difficulty: 188 - 16 pieces on hexagon! (was 8p/4l, way too easy)
    },
    {
        id: 29, name: "Stage 29", focus: "Decagon Pressure", instruction: "Split the decagon into 15 pieces with 4 lines!",
        startShapeVertices: [
            { x: 0, y: -160 }, { x: 94, y: -129 }, { x: 152, y: -49 },
            { x: 152, y: 49 }, { x: 94, y: 129 }, { x: 0, y: 160 },
            { x: -94, y: 129 }, { x: -152, y: 49 }, { x: -152, y: -49 },
            { x: -94, y: -129 }
        ],
        color: '#d53f8c', targetPieces: 15, maxLines: 4
        // Difficulty: 188.75 - 15/4 = 3.75 ratio on decagon!
    },
    {
        id: 30, name: "Stage 30", focus: "THE LEGEND", instruction: "ULTIMATE: Split the decagon into 20 pieces with 5 lines!",
        startShapeVertices: [
            { x: 0, y: -180 }, { x: 106, y: -145 }, { x: 171, y: -55 },
            { x: 171, y: 55 }, { x: 106, y: 145 }, { x: 0, y: 180 },
            { x: -106, y: 145 }, { x: -171, y: 55 }, { x: -171, y: -55 },
            { x: -106, y: -145 }
        ],
        color: '#805ad5', targetPieces: 20, maxLines: 5
        // Difficulty: 240 - 20 PIECES! 4.0 ratio! LEGENDARY!
        // This is 6.3× harder than Stage 1!
    }
];

// Export for use in game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameLevels;
}
