/**
 * Math Generator
 * Professional-grade math problem generation logic.
 * Ensures pedagogical consistency, "clean" numbers, and smart difficulty scaling.
 */
class MathGenerator {
    constructor() {
        this.difficultyMap = {
            1: 'easy',
            2: 'medium',
            3: 'hard',
            4: 'extreme'
        };
    }

    generate(level) {
        const difficulty = this.difficultyMap[level] || 'easy';
        return this[`generate${this.capitalize(difficulty)}`]();
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ==========================================
    // LEVEL 1: EASY (Foundations)
    // Focus: Number bonds, simple addition/subtraction within 20, basic comparison
    // ==========================================
    generateEasy() {
        const type = this.weightedRandom([
            { item: 'addition', weight: 0.35 },
            { item: 'subtraction', weight: 0.35 },
            { item: 'comparison', weight: 0.15 },
            { item: 'ordering', weight: 0.15 }
        ]);

        switch (type) {
            case 'addition': return this.getSmartAddition(1, 20);
            case 'subtraction': return this.getSmartSubtraction(1, 20);
            case 'comparison': return this.getSmartComparison(1, 20);
            case 'ordering': return this.getSmartOrdering(1, 20);
            default: return this.getSmartAddition(1, 20);
        }
    }

    // ==========================================
    // LEVEL 2: MEDIUM (Operations)
    // Focus: Multiplication tables (2-12), clean division, mixed add/sub within 100
    // ==========================================
    generateMedium() {
        const type = this.weightedRandom([
            { item: 'multiplication', weight: 0.25 },
            { item: 'division', weight: 0.25 },
            { item: 'mixed_add', weight: 0.2 },
            { item: 'mixed_sub', weight: 0.2 },
            { item: 'ordering', weight: 0.1 }
        ]);

        switch (type) {
            case 'multiplication': return this.getSmartMultiplication(2, 12);
            case 'division': return this.getSmartDivision(2, 12); // Divisors 2-12
            case 'mixed_add': return this.getSmartAddition(10, 100); // 2-digit addition
            case 'mixed_sub': return this.getSmartSubtraction(10, 100);
            case 'ordering': return this.getSmartOrdering(10, 100);
            default: return this.getSmartMultiplication(2, 10);
        }
    }

    // ==========================================
    // LEVEL 3: HARD (Logic & Order)
    // Focus: Order of Operations, Multi-step, larger numbers
    // ==========================================
    generateHard() {
        const type = this.weightedRandom([
            { item: 'order_ops', weight: 0.4 },
            { item: 'multi_step', weight: 0.3 },
            { item: 'mixed_hard', weight: 0.3 }
        ]);

        switch (type) {
            case 'order_ops': return this.getOrderOfOperations(); // a + b x c
            case 'multi_step': return this.getMultiStep(); // (a + b) x c
            case 'mixed_hard': return this.getMixedHard(); // a x b + c
            default: return this.getOrderOfOperations();
        }
    }

    // ==========================================
    // LEVEL 4: EXTREME (Abstract & Application)
    // Focus: Algebra, Geometry, Fractions, Percentages with integer results
    // ==========================================
    generateExtreme() {
        const type = this.weightedRandom([
            { item: 'algebra', weight: 0.35 },
            { item: 'geometry', weight: 0.3 },
            { item: 'fractions', weight: 0.2 },
            { item: 'percentage', weight: 0.15 }
        ]);

        switch (type) {
            case 'algebra': return this.getAlgebra();
            case 'geometry': return this.getGeometry();
            case 'fractions': return this.getFractions();
            case 'percentage': return this.getPercentage();
            default: return this.getAlgebra();
        }
    }

    // ----------------------------------------------------------------
    // CORE GENERATORS (The "Smart" Logic)
    // ----------------------------------------------------------------

    getSmartAddition(min, max) {
        // Generates A + B = C
        const result = this.randomInt(Math.max(min + 1, 5), max); // Result is bounded
        const num1 = this.randomInt(1, result - 1);
        const num2 = result - num1;

        return {
            type: 'basic_operation',
            num1, num2, result,
            operator: '+',
            display: `${num1} + ${num2} = ${result}`
        };
    }

    getSmartSubtraction(min, max) {
        // Generates A - B = C
        const num1 = this.randomInt(min, max);
        const num2 = this.randomInt(1, num1 - 1); // Ensure positive result
        const result = num1 - num2;

        return {
            type: 'basic_operation',
            num1, num2, result,
            operator: '−',
            display: `${num1} − ${num2} = ${result}`
        };
    }

    getSmartMultiplication(minFactor, maxFactor) {
        // Generates A x B = C
        const num1 = this.randomInt(minFactor, maxFactor);
        const num2 = this.randomInt(minFactor, maxFactor);
        const result = num1 * num2;

        return {
            type: 'basic_operation',
            num1, num2, result,
            operator: '✕',
            display: `${num1} ✕ ${num2} = ${result}`
        };
    }

    getSmartDivision(minDivisor, maxDivisor) {
        // Generates C / A = B (Derived from A x B = C)
        // Ensures integer results without remainders
        const divisor = this.randomInt(minDivisor, maxDivisor);
        const quotient = this.randomInt(2, 12); // Keep answers reasonable
        const dividend = divisor * quotient;

        return {
            type: 'basic_operation',
            num1: dividend,
            num2: divisor,
            result: quotient,
            operator: '➗',
            display: `${dividend} ➗ ${divisor} = ${quotient}`
        };
    }

    getSmartComparison(min, max) {
        const num1 = this.randomInt(min, max);
        let num2 = this.randomInt(min, max);

        // Reduce chance of equality to 10%
        if (num1 === num2 && Math.random() > 0.1) {
            num2 = num1 + (Math.random() > 0.5 ? 1 : -1);
        }

        let operator;
        if (num1 > num2) operator = '>';
        else if (num1 < num2) operator = '<';
        else operator = '=';

        return {
            type: 'comparison',
            num1, num2, operator,
            result: operator,
            display: `${num1} ${operator} ${num2}`
        };
    }

    getOrderOfOperations() {
        // Pattern: a + b x c = result
        // We ensure b x c is calculated first
        const b = this.randomInt(2, 6);
        const c = this.randomInt(2, 6);
        const product = b * c;
        const a = this.randomInt(1, 20);
        const result = a + product;

        return {
            type: 'order_operations',
            num1: a, num2: b, num3: c,
            result,
            display: `${a} + ${b} ✕ ${c} = ${result}`
        };
    }

    getMultiStep() {
        // Pattern: (a + b) x c = result
        const c = this.randomInt(2, 6);
        const sum = this.randomInt(2, 10);
        const a = this.randomInt(1, sum - 1);
        const b = sum - a;
        const result = sum * c;

        return {
            type: 'multi_step',
            steps: [a, b, c, result], // Changed 'sum' to 'result' for easier slot filling
            result,
            display: `(${a} + ${b}) ✕ ${c} = ${result}`
        };
    }

    getSmartOrdering(min, max) {
        let nums = [];
        while (nums.length < 3) {
            let n = this.randomInt(min, max);
            if (!nums.includes(n)) nums.push(n);
        }

        const sorted = [...nums].sort((a, b) => a - b);

        return {
            type: 'ordering',
            numbers: nums,
            sorted: sorted,
            display: sorted.join(' < ')
        };
    }

    getMixedHard() {
        // Pattern: (a * b) / c = result  OR  a * b + c
        // Let's do: Divide first then add -> a / b + c
        // To ensure a/b is int: construct from bottom up
        const b = this.randomInt(2, 8); // divisor
        const quotient = this.randomInt(2, 9);
        const a = b * quotient; // dividend
        const c = this.randomInt(1, 20);
        const result = quotient + c;

        return {
            type: 'mixed_operations',
            num1: a, num2: b, num3: c,
            result,
            display: `${a} ➗ ${b} + ${c} = ${result}`
        };
    }

    getAlgebra() {
        // Pattern: ax + b = c
        const x = this.randomInt(2, 12); // The answer
        const a = this.randomInt(2, 9);  // Coefficient
        const b = this.randomInt(1, 20); // Constant
        const c = (a * x) + b;           // Result value

        return {
            type: 'algebra',
            coefficient: a,
            constant: b,
            result_value: c,
            x: x,
            display: `${a}x + ${b} = ${c}`,
            question: 'Solve for x'
        };
    }

    getGeometry() {
        if (Math.random() > 0.5) {
            // Rectangle Area
            const width = this.randomInt(3, 12);
            const length = this.randomInt(width + 1, 15);
            const area = width * length;
            return {
                type: 'geometry', shape: 'rectangle',
                length, width, result: area,
                display: `Rectangle: Length ${length}, Width ${width}`,
                question: 'Find the Area'
            };
        } else {
            // Circle Area (Approximate)
            // Area = 3.14 * r^2. We round to integer for simplicity in this game format
            const r = this.randomInt(2, 8);
            const area = Math.round(3.14 * r * r);
            return {
                type: 'geometry', shape: 'circle',
                radius: r, result: area,
                display: `Circle: Radius ${r}`,
                question: 'Find Area (π ≈ 3.14)'
            };
        }
    }

    getFractions() {
        // Pattern: n1/d + n2/d = ?
        // Ensure common denominator
        const d = this.randomInt(3, 12);
        const n1 = this.randomInt(1, d - 1);
        // Ensure result is not > 1 for simplicity (optional, can be improved)
        // Let's allow sum > 1 but keep denominators same
        const n2 = this.randomInt(1, d);
        const resultNum = n1 + n2;

        return {
            type: 'fractions',
            num1: n1, den1: d,
            num2: n2, den2: d,
            resultNum, resultDen: d,
            display: `${n1}/${d} + ${n2}/${d}`,
            question: 'Add the fractions'
        };
    }

    getPercentage() {
        // Pattern: P% of W = ?
        // We want clean integers. 
        // 10% -> W is multiple of 10
        // 20% -> W is multiple of 5
        // 25% -> W is multiple of 4
        // 50% -> W is multiple of 2

        const percentages = [10, 20, 25, 50];
        const p = percentages[Math.floor(Math.random() * percentages.length)];

        let multiplier;
        switch (p) {
            case 10: multiplier = 10; break;
            case 20: multiplier = 5; break;
            case 25: multiplier = 4; break;
            case 50: multiplier = 2; break;
            default: multiplier = 10;
        }

        const base = this.randomInt(1, 10);
        const w = base * multiplier;
        const result = (p / 100) * w;

        return {
            type: 'percentage',
            whole: w, percentage: p, result,
            display: `${p}% of ${w}`,
            question: 'Calculate'
        };
    }

    // ----------------------------------------------------------------
    // UTILITIES
    // ----------------------------------------------------------------

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    weightedRandom(options) {
        let totalWeight = 0;
        options.forEach(o => totalWeight += o.weight);

        let random = Math.random() * totalWeight;
        for (const option of options) {
            if (random < option.weight) return option.item;
            random -= option.weight;
        }
        return options[0].item;
    }
}
