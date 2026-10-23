import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const scope = { window: {} };
vm.runInNewContext(await readFile(new URL('../public/Games/PreschoolFun/activities.js', import.meta.url), 'utf8'), scope);
const activities = scope.window.PreschoolActivities;
const random = seed => n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
const validAnswer = puzzle => {
    assert.equal(puzzle.sequence.filter(item => item.missing).length, 1);
    assert.equal(puzzle.sequence.find(item => item.missing).value, puzzle.answer.value);
    const choices = [puzzle.answer, ...puzzle.distractors].map(item => item.value);
    assert.equal(new Set(choices).size, 4);
    assert.equal(choices.filter(value => value === puzzle.answer.value).length, 1);
};

test('every progressive repeating pattern has a complete visible teaching unit and one answer', () => {
    const rules = new Set();
    for (let seed = 1; seed <= 100; seed++) for (const difficulty of [0, 3, 7]) for (let variant = 0; variant < 5; variant++) {
        const puzzle = activities.pattern(random(seed), difficulty, variant);
        validAnswer(puzzle); rules.add(puzzle.rule);
        const unit = puzzle.sequence.slice(0, puzzle.rule.length);
        assert.ok(unit.every(item => !item.missing));
        puzzle.sequence.forEach((item, i) => assert.equal(item.value, unit[i % unit.length].value));
        assert.ok(puzzle.sequence.length <= 6);
    }
    assert.deepEqual([...rules].sort(), ['AAB', 'AABB', 'AB', 'ABB', 'ABC']);
});

test('counting, matching, and detective puzzles remain unambiguous across seeds and difficulties', () => {
    for (let seed = 1; seed <= 150; seed++) for (const difficulty of [0, 4, 10]) for (const type of ['quantity', 'matching', 'odd']) {
        const puzzle = activities.visual(type, random(seed), difficulty);
        validAnswer(puzzle);
        if (type === 'quantity') {
            assert.equal(puzzle.display.length, Number(puzzle.answer.value));
            assert.ok(puzzle.display.length >= 1 && puzzle.display.length <= 8);
            assert.equal(new Set(puzzle.display.map(item => item.value)).size, 1);
        } else if (type === 'matching') {
            assert.equal(puzzle.sequence[0].value, puzzle.answer.value);
            assert.equal(puzzle.sequence.length, 2);
        } else {
            assert.equal(puzzle.display.length, 4);
            assert.equal(puzzle.display.filter(item => item.value === puzzle.answer.value).length, 1);
            assert.equal(new Set(puzzle.display.filter(item => item.value !== puzzle.answer.value).map(item => item.value)).size, 1);
        }
    }
});

test('shuffled decks cover six skills and never repeat the preceding activity at their boundary', () => {
    const orders = new Set();
    for (let seed = 1; seed <= 100; seed++) for (const previous of activities.types) {
        const deck = activities.deck(random(seed), previous);
        assert.equal(deck.length, 6); assert.equal(new Set(deck).size, 6);
        assert.notEqual(deck[0], previous); orders.add(deck.join(','));
        const intro = activities.deck(random(seed), previous, true);
        assert.equal(intro.length, 3); assert.equal(new Set(intro).size, 3);
        assert.ok(intro.every(type => ['quantity', 'matching', 'odd'].includes(type)));
    }
    assert.ok(orders.size > 30, 'decks have meaningful variation');
});

test('every picture has consistent scalable artwork and a prerecorded spoken name', async () => {
    const manifest = JSON.parse(await readFile(new URL('../public/Games/PreschoolFun/audio/voice/manifest.json', import.meta.url), 'utf8'));
    for (const token of activities.tokens) {
        const svg = activities.symbol(token.value);
        assert.match(svg, /viewBox="0 0 96 96"/);
        assert.match(svg, /aria-hidden="true"/);
        assert.ok(!svg.includes('NaN') && !svg.includes('undefined'));
        assert.ok(manifest.clips[token.label.replaceAll(' ', '-')]);
    }
});
