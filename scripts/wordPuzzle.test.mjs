import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const game = new URL('../public/Games/Word Puzzle/', import.meta.url);
const source = ['EasyWordClues', 'MediumWordClues', 'AdvancedWordClues', 'WordLibraryIndex', 'WordGenerator']
    .map((name) => readFileSync(new URL(`js/utils/${name}.js`, game), 'utf8'))
    .join('\n');

function createLibrary(storage = new Map()) {
    const localStorage = {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value)
    };
    return runInNewContext(`${source}\n;({ WordGenerator, WORD_LIBRARY_INDEX, WORD_LIBRARY_LEGACY_WORDS })`, {
        localStorage,
        window: { getWordPuzzleStorageKey: (key) => `${key}:test-player` }
    });
}

test('all four word banks have unique, answer-safe clues and Easy has an exact audio match', () => {
    const { WORD_LIBRARY_INDEX: entries } = createLibrary();
    assert.equal(new Set(entries.map(({ word }) => word)).size, entries.length);
    assert.equal(new Set(entries.map(({ clue }) => clue)).size, entries.length);
    const counts = Object.groupBy(entries, ({ difficulty }) => difficulty);
    const expected = { easy: [3, 3, 135], medium: [3, 4, 140], hard: [4, 6, 350], extreme: [5, 10, 150] };
    for (const [difficulty, [min, max, minimumWords]] of Object.entries(expected)) {
        const bank = counts[difficulty];
        assert.ok(bank.length >= minimumWords, difficulty);
        assert.equal(Math.min(...bank.map(({ length }) => length)), min, difficulty);
        assert.equal(Math.max(...bank.map(({ length }) => length)), max, difficulty);
    }
    for (const { word, clue, tracks } of entries) {
        assert.match(word, /^[A-Z]{3,10}$/);
        assert.ok(tracks.length);
        assert.ok(clue.length > 20 && clue.length <= 125, word);
        assert.doesNotMatch(clue, new RegExp(`\\b${word}(?:s|es|ed|ing)?\\b`, 'i'), word);
    }
    const audioFolder = new URL('Voice/Easy/', game);
    const expectedTracks = ['guide.mp3', ...counts.easy.map(({ word }) => {
        assert.match(word, /^[A-Z]{3}$/);
        return `${word.toLowerCase()}.mp3`;
    })].sort();
    assert.deepEqual(readdirSync(audioFolder).sort(), expectedTracks);
    for (const name of expectedTracks) assert.ok(statSync(new URL(name, audioFolder)).size > 1000, name);
    const correct = readFileSync(new URL('Sounds/correct.mp3', game));
    const incorrect = readFileSync(new URL('Sounds/incorrect.mp3', game));
    assert.ok(correct.length > 1000 && incorrect.length > 1000);
    assert.notDeepEqual(correct, incorrect);
});

test('each bank plays every word before repeating and keeps long gaps across reloads', () => {
    const storage = new Map();
    const { WordGenerator } = createLibrary(storage);
    let generator = new WordGenerator();
    for (const [index, difficulty] of ['easy', 'medium', 'hard', 'extreme'].entries()) {
        const level = index + 1;
        const size = generator.wordBanks[difficulty].length;
        const lastSeen = new Map();
        for (let round = 0; round < size * 3; round += 1) {
            if (round % 17 === 0) generator = new WordGenerator();
            const puzzle = generator.generate(level);
            assert.equal(puzzle.difficulty, difficulty);
            assert.notEqual(puzzle.scrambledLetters.join(''), puzzle.word);
            assert.equal([...puzzle.scrambledLetters].sort().join(''), [...puzzle.word].sort().join(''));
            if (round < size) assert.ok(!lastSeen.has(puzzle.word), puzzle.word);
            if (lastSeen.has(puzzle.word)) assert.ok(round - lastSeen.get(puzzle.word) > size - Math.floor(size / 5));
            lastSeen.set(puzzle.word, round);
        }
        assert.equal(lastSeen.size, size);
    }
});

test('migrates scoped legacy history without replaying previously seen words', () => {
    const storage = new Map([['wordPuzzleRecentWordsV3:test-player', '["word-puzzle-29","word-puzzle-99999"]']]);
    const { WordGenerator, WORD_LIBRARY_LEGACY_WORDS } = createLibrary(storage);
    const generator = new WordGenerator();
    assert.equal(WORD_LIBRARY_LEGACY_WORDS[29], 'EEL');
    assert.deepEqual([...generator.recentWordIds], ['EEL']);
    assert.notEqual(generator.generate(1).word, 'EEL');
    assert.equal(JSON.parse(storage.get('wordPuzzleRecentWordsV4:test-player'))[0], 'EEL');
});
