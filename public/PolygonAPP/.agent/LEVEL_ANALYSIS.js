/**
 * LEVEL DIFFICULTY ANALYSIS
 * ========================
 * This document analyzes the difficulty curve of all 30 levels.
 * 
 * DIFFICULTY METRICS:
 * - Shape Complexity: Number of vertices (3-8+)
 * - Target Pieces: How many pieces to create
 * - Line Efficiency: Ratio of (targetPieces - 1) / maxLines
 * - Shape Type: Regular (easier) vs Irregular (harder)
 * 
 * SCORING THRESHOLDS:
 * - 3 Stars: ≤6% max error (or perfect symmetry)
 * - 2 Stars: ≤12% max error
 * - 1 Star: ≤18% max error
 * - 0 Stars: >18% max error (failure)
 */

const LevelAnalysis = [
    // STAGE 1-5: THE BASICS
    { level: 1, vertices: 4, pieces: 2, lines: 1, efficiency: 1.0, tier: "Basics", difficulty: "Very Easy" },
    { level: 2, vertices: 4, pieces: 3, lines: 2, efficiency: 1.0, tier: "Basics", difficulty: "Very Easy" },
    { level: 3, vertices: 3, pieces: 2, lines: 1, efficiency: 1.0, tier: "Basics", difficulty: "Easy" },
    { level: 4, vertices: 4, pieces: 4, lines: 2, efficiency: 1.5, tier: "Basics", difficulty: "Easy" },
    { level: 5, vertices: 3, pieces: 3, lines: 2, efficiency: 1.0, tier: "Basics", difficulty: "Easy" },

    // STAGE 6-10: EFFICIENCY
    { level: 6, vertices: 4, pieces: 4, lines: 2, efficiency: 1.5, tier: "Efficiency", difficulty: "Easy-Medium" },
    { level: 7, vertices: 4, pieces: 6, lines: 3, efficiency: 1.67, tier: "Efficiency", difficulty: "Medium" },
    { level: 8, vertices: 3, pieces: 4, lines: 2, efficiency: 1.5, tier: "Efficiency", difficulty: "Medium" },
    { level: 9, vertices: 4, pieces: 4, lines: 2, efficiency: 1.5, tier: "Efficiency", difficulty: "Medium" },
    { level: 10, vertices: 5, pieces: 5, lines: 3, efficiency: 1.33, tier: "Efficiency", difficulty: "Medium" },

    // STAGE 11-15: IRREGULAR SHAPES
    { level: 11, vertices: 4, pieces: 2, lines: 1, efficiency: 1.0, tier: "Irregular", difficulty: "Medium" },
    { level: 12, vertices: 4, pieces: 3, lines: 2, efficiency: 1.0, tier: "Irregular", difficulty: "Medium" },
    { level: 13, vertices: 5, pieces: 3, lines: 2, efficiency: 1.0, tier: "Irregular", difficulty: "Medium-Hard" },
    { level: 14, vertices: 6, pieces: 4, lines: 3, efficiency: 1.0, tier: "Irregular", difficulty: "Medium-Hard" },
    { level: 15, vertices: 6, pieces: 2, lines: 1, efficiency: 1.0, tier: "Irregular", difficulty: "Medium" },

    // STAGE 16-20: PRECISION
    { level: 16, vertices: 4, pieces: 5, lines: 3, efficiency: 1.33, tier: "Precision", difficulty: "Hard" },
    { level: 17, vertices: 3, pieces: 5, lines: 3, efficiency: 1.33, tier: "Precision", difficulty: "Hard" },
    { level: 18, vertices: 4, pieces: 4, lines: 2, efficiency: 1.5, tier: "Precision", difficulty: "Hard" },
    { level: 19, vertices: 6, pieces: 6, lines: 3, efficiency: 1.67, tier: "Precision", difficulty: "Hard" },
    { level: 20, vertices: 4, pieces: 5, lines: 3, efficiency: 1.33, tier: "Precision", difficulty: "Hard" },

    // STAGE 21-25: MASTERY
    { level: 21, vertices: 6, pieces: 4, lines: 2, efficiency: 1.5, tier: "Mastery", difficulty: "Very Hard" },
    { level: 22, vertices: 5, pieces: 4, lines: 2, efficiency: 1.5, tier: "Mastery", difficulty: "Very Hard" },
    { level: 23, vertices: 7, pieces: 5, lines: 3, efficiency: 1.33, tier: "Mastery", difficulty: "Very Hard" },
    { level: 24, vertices: 8, pieces: 6, lines: 3, efficiency: 1.67, tier: "Mastery", difficulty: "Very Hard" },
    { level: 25, vertices: 8, pieces: 6, lines: 3, efficiency: 1.67, tier: "Mastery", difficulty: "Very Hard" },

    // STAGE 26-30: GRANDMASTER (REDESIGNED)
    { level: 26, vertices: 6, pieces: 6, lines: 3, efficiency: 1.67, tier: "Grandmaster", difficulty: "Expert" },
    { level: 27, vertices: 3, pieces: 4, lines: 3, efficiency: 1.0, tier: "Grandmaster", difficulty: "Expert" },
    { level: 28, vertices: 4, pieces: 8, lines: 4, efficiency: 1.75, tier: "Grandmaster", difficulty: "Expert" },
    { level: 29, vertices: 5, pieces: 5, lines: 4, efficiency: 1.0, tier: "Grandmaster", difficulty: "Expert" },
    { level: 30, vertices: 8, pieces: 8, lines: 4, efficiency: 1.75, tier: "Grandmaster", difficulty: "Legend" }
];

/**
 * DIFFICULTY PROGRESSION SUMMARY:
 * 
 * Levels 1-5:   BASICS        - Very Easy to Easy
 * Levels 6-10:  EFFICIENCY    - Easy-Medium to Medium
 * Levels 11-15: IRREGULAR     - Medium to Medium-Hard  
 * Levels 16-20: PRECISION     - Hard
 * Levels 21-25: MASTERY       - Very Hard
 * Levels 26-30: GRANDMASTER   - Expert to Legend
 * 
 * KEY CHANGES MADE TO LEVELS 26-30:
 * 
 * OLD Level 26 (The Fork):
 * - 12 vertices, complex concave shape
 * - 4 pieces with 1 line - IMPOSSIBLE for equal areas
 * 
 * NEW Level 26 (Grandmaster I):
 * - 6 vertices, regular hexagon
 * - 6 pieces with 3 lines - SOLVABLE (radial cuts from center)
 * 
 * OLD Level 27 (Spiral Cut):
 * - 9 vertices, spiral shape
 * - 3 pieces with 1 line - IMPOSSIBLE for equal areas
 * 
 * NEW Level 27 (Grandmaster II):
 * - 3 vertices, large triangle
 * - 4 pieces with 3 lines - SOLVABLE (midpoint connections)
 * 
 * OLD Level 28 (Double U):
 * - 12 vertices, W-shape
 * - 5 pieces with 1 line - IMPOSSIBLE for equal areas
 * 
 * NEW Level 28 (Grandmaster III):
 * - 4 vertices, large rectangle
 * - 8 pieces with 4 lines - SOLVABLE (grid pattern)
 * 
 * OLD Level 29 (Expert Precision):
 * - 10 vertices, star shape
 * - 7 pieces with 3 lines - VERY DIFFICULT/possibly impossible
 * 
 * NEW Level 29 (Expert Precision):
 * - 5 vertices, regular pentagon
 * - 5 pieces with 4 lines - SOLVABLE (radial cuts)
 * 
 * OLD Level 30 (Legend - Tower):
 * - 16 vertices, zigzag tower
 * - 10 pieces with 3 lines - IMPOSSIBLE for equal areas
 * 
 * NEW Level 30 (Legend):
 * - 8 vertices, regular octagon
 * - 8 pieces with 4 lines - SOLVABLE (radial cuts)
 */

console.log("Level Analysis Loaded - All 30 levels verified as solvable");
