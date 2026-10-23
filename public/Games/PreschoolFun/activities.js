(function () {
    'use strict';
    const tokens = [
        { value: '⭐', label: 'gold star', color: '#ffd34e', ink: '#9b6318', shape: '<path d="m48 12 10 22 24 3-18 17 5 24-21-12-21 12 5-24-18-17 24-3Z"/>' },
        { value: '🟣', label: 'purple dot', color: '#ad83ef', ink: '#68409b', shape: '<circle cx="48" cy="45" r="31"/>' },
        { value: '🟩', label: 'green square', color: '#8bd574', ink: '#397544', shape: '<rect x="18" y="15" width="60" height="60" rx="13"/>' },
        { value: '❤️', label: 'red heart', color: '#fa7d8c', ink: '#ad3b57', shape: '<path d="M48 76 20 50C-2 27 27 4 48 27 69 4 98 27 76 50Z"/>' },
        { value: '🔺', label: 'red triangle', color: '#f98a73', ink: '#a94b36', shape: '<path d="M43 16q5-9 10 0l29 51q5 9-6 9H20q-11 0-6-9Z"/>' },
        { value: '🟦', label: 'blue square', color: '#79c6f4', ink: '#356d9f', shape: '<rect x="18" y="15" width="60" height="60" rx="13"/>' },
        { value: '☀️', label: 'sun', color: '#ffd34e', ink: '#a76e1d', shape: '<path d="m48 7 9 13 16-2 2 16 13 9-13 10-2 16-16-2-9 13-10-13-16 2-2-16-13-10 13-9 2-16 16 2Z"/><circle cx="48" cy="44" r="20" fill="#ffe79a"/>' },
        { value: '🌙', label: 'moon', color: '#a7a9ed', ink: '#585b9b', shape: '<path d="M65 15C25 27 45 72 78 64 49 100 5 62 24 30 33 17 48 12 65 15Z"/>' }
    ];
    const types = ['alphabet', 'counting', 'pattern', 'quantity', 'matching', 'odd'];
    const rules = [[0, 1], [0, 0, 1], [0, 1, 1], [0, 1, 2], [0, 0, 1, 1]];
    function shuffled(items, randomInt) {
        const result = [...items];
        for (let i = result.length - 1; i > 0; i--) { const j = randomInt(i + 1); [result[i], result[j]] = [result[j], result[i]]; }
        return result;
    }
    function deck(randomInt, previous, initialNewSkills = false) {
        const result = shuffled(initialNewSkills ? types.slice(3) : types, randomInt);
        if (result[0] === previous) [result[0], result[1]] = [result[1], result[0]];
        return result;
    }
    function symbol(value) {
        const token = tokens.find(item => item.value === value);
        if (!token) return '';
        const shines = { '⭐': 'M38 36 45 21', '❤️': 'M27 39q-3-12 9-12', '🔺': 'M33 53 46 29', '☀️': 'M37 41q0-10 10-11', '🌙': 'M28 45q-2-14 10-19' };
        return `<svg class="learning-symbol" viewBox="0 0 96 96" aria-hidden="true" focusable="false"><ellipse cx="48" cy="84" rx="27" ry="5" fill="#244467" opacity=".14"/><g fill="${token.color}" stroke="${token.ink}" stroke-width="3" stroke-linejoin="round">${token.shape}</g><path d="${shines[value] || 'M29 35q3-10 12-12'}" fill="none" stroke="white" opacity=".65" stroke-width="5" stroke-linecap="round"/></svg>`;
    }
    function pattern(randomInt, difficulty, variant) {
        const available = difficulty < 2 ? 1 : difficulty < 5 ? 3 : rules.length;
        const unit = rules[variant % available], palette = shuffled(tokens, randomInt);
        const length = unit.length === 2 ? 5 : 6;
        const missingIndex = unit.length + randomInt(length - unit.length);
        const sequence = Array.from({ length }, (_, index) => ({ ...palette[unit[index % unit.length]], missing: index === missingIndex }));
        const answer = sequence[missingIndex];
        return { sequence, answer, distractors: shuffled(tokens.filter(item => item.value !== answer.value), randomInt).slice(0, 3), rule: unit.map(i => 'ABC'[i]).join('') };
    }
    function visual(type, randomInt, difficulty) {
        const palette = shuffled(tokens, randomInt);
        if (type === 'quantity') {
            const count = 1 + randomInt(Math.min(8, 4 + Math.floor(difficulty / 2)));
            const answer = { value: String(count), label: String(count) };
            const otherNumbers = shuffled(Array.from({ length: 8 }, (_, i) => i + 1).filter(n => n !== count), randomInt);
            return { sequence: [{ ...answer, missing: true }], answer, answerKind: 'counting', display: Array.from({ length: count }, () => palette[0]), distractors: otherNumbers.slice(0, 3).map(n => ({ value: String(n), label: String(n) })) };
        }
        const answer = palette[0];
        if (type === 'matching') return {
            sequence: [{ ...answer, missing: false }, { ...answer, missing: true }], answer, answerKind: 'picture', distractors: palette.slice(1, 4)
        };
        return { sequence: [{ ...answer, missing: true }], answer, answerKind: 'picture',
            display: shuffled([palette[1], palette[1], palette[1], answer], randomInt), distractors: palette.slice(1, 4) };
    }
    const feather = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 20 17 8m-9 9C-1 7 12 0 19 4c5 10-3 17-11 13Zm3-3 6 1M11 8l1 5" fill="#ffe09b" stroke="#99652e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    window.PreschoolActivities = { tokens, types, deck, symbol, pattern, visual, feather };
})();
