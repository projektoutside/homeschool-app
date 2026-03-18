export const PROBLEM_TYPES = {
    ADDITION_SINGLE_DIGIT: 'ADDITION_SINGLE_DIGIT',
    SUBTRACTION_SINGLE_DIGIT: 'SUBTRACTION_SINGLE_DIGIT',
    MULTIPLICATION_SINGLE_DIGIT: 'MULTIPLICATION_SINGLE_DIGIT',
    DIVISION_SINGLE_DIGIT_NO_REMAINDER: 'DIVISION_SINGLE_DIGIT_NO_REMAINDER',
    ADDITION_DOUBLE_DIGIT: 'ADDITION_DOUBLE_DIGIT',
    SUBTRACTION_DOUBLE_DIGIT: 'SUBTRACTION_DOUBLE_DIGIT',
    MULTIPLICATION_DOUBLE_BY_SINGLE: 'MULTIPLICATION_DOUBLE_BY_SINGLE',
    DIVISION_NO_REMAINDER: 'DIVISION_NO_REMAINDER',
    MULTIPLICATION_DOUBLE_DIGIT: 'MULTIPLICATION_DOUBLE_DIGIT',
    DIVISION_LONG_SINGLE_DIVISOR: 'DIVISION_LONG_SINGLE_DIVISOR',
    MULTI_STEP_ARITHMETIC_BASIC: 'MULTI_STEP_ARITHMETIC_BASIC',
    MONEY_OPERATIONS: 'MONEY_OPERATIONS',
    AREA_RECTANGLE: 'AREA_RECTANGLE',
    INTEGER_ADDITION: 'INTEGER_ADDITION',
    INTEGER_SUBTRACTION: 'INTEGER_SUBTRACTION',
    INTEGER_MULTIPLICATION: 'INTEGER_MULTIPLICATION',
    EQUATION_ONE_STEP: 'EQUATION_ONE_STEP',
    EQUATION_TWO_STEP: 'EQUATION_TWO_STEP',
    PROPORTION_SOLVE_X: 'PROPORTION_SOLVE_X',
    LINEAR_EQUATION_SIMPLE_SOLVE: 'LINEAR_EQUATION_SIMPLE_SOLVE',
    EXPONENTS_BASIC: 'EXPONENTS_BASIC',
    SQUARE_ROOTS_PERFECT: 'SQUARE_ROOTS_PERFECT',
    PEMDAS_SIMPLE: 'PEMDAS_SIMPLE',
};

export const levelProblemConfig = {
    1: {
        ep: 1,
        description: 'Level 1: Basic Single-Digit Operations',
        types: [
            PROBLEM_TYPES.ADDITION_SINGLE_DIGIT,
            PROBLEM_TYPES.SUBTRACTION_SINGLE_DIGIT,
            PROBLEM_TYPES.MULTIPLICATION_SINGLE_DIGIT,
            PROBLEM_TYPES.DIVISION_SINGLE_DIGIT_NO_REMAINDER,
        ],
        ranges: {
            singleDigit: [1, 9],
            smallSingle: [1, 9],
        },
    },
    2: {
        ep: 2,
        description: 'Level 2: Advanced Single-Digit Operations',
        types: [
            PROBLEM_TYPES.ADDITION_SINGLE_DIGIT,
            PROBLEM_TYPES.SUBTRACTION_SINGLE_DIGIT,
            PROBLEM_TYPES.MULTIPLICATION_SINGLE_DIGIT,
            PROBLEM_TYPES.DIVISION_SINGLE_DIGIT_NO_REMAINDER,
        ],
        ranges: {
            singleDigit: [5, 9],
            smallSingle: [2, 9],
        },
    },
    3: {
        ep: 3,
        description: 'Level 3: Money, Decimals, and Intro to Negatives',
        types: [
            PROBLEM_TYPES.MONEY_OPERATIONS,
            PROBLEM_TYPES.INTEGER_ADDITION,
            PROBLEM_TYPES.INTEGER_SUBTRACTION,
        ],
        ranges: {
            integerRange: [-5, 9],
            decimalPlaces: 2,
        },
    },
    4: {
        ep: 4,
        description: 'Level 4: Algebraic Substitution',
        types: [PROBLEM_TYPES.EQUATION_ONE_STEP],
        ranges: {
            equationVars: [1, 15],
            equationConst: [1, 12],
        },
    },
    5: {
        ep: 5,
        description: 'Level 5: Mixed Operations: Single Digits Only',
        types: [PROBLEM_TYPES.PEMDAS_SIMPLE],
        ranges: {
            singleDigit: [1, 9],
            pemdasNums: [1, 9],
        },
    },
    6: {
        ep: 6,
        description: 'Level 6: Double-Digit Core Operations',
        types: [
            PROBLEM_TYPES.ADDITION_DOUBLE_DIGIT,
            PROBLEM_TYPES.SUBTRACTION_DOUBLE_DIGIT,
            PROBLEM_TYPES.MULTIPLICATION_DOUBLE_DIGIT,
            PROBLEM_TYPES.DIVISION_NO_REMAINDER,
        ],
        ranges: {
            doubleDigit: [10, 99],
            singleDigit: [2, 9],
            factorsForDivision: [2, 12],
        },
    },
    7: {
        ep: 7,
        description: 'Level 7: Mixed Operations: Up to Two Digits',
        types: [PROBLEM_TYPES.MULTI_STEP_ARITHMETIC_BASIC],
        ranges: {
            doubleDigit: [10, 99],
            singleDigit: [1, 9],
        },
    },
    8: {
        ep: 8,
        description: 'Level 8: Two-Step Equations Challenge',
        types: [PROBLEM_TYPES.EQUATION_TWO_STEP],
        ranges: {
            equationVars: [1, 20],
            equationConst: [1, 50],
            equationCoeff: [1, 12],
        },
    },
};
