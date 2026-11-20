import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const game = new URL('../public/Games/Word Puzzle/', import.meta.url);
const source = ['EasyWordClues', 'MediumWordClues', 'AdvancedWordClues', 'PhonicsWords', 'WordLibraryIndex', 'WordGenerator']
    .map((name) => readFileSync(new URL(`js/utils/${name}.js`, game), 'utf8'))
    .join('\n');

function createLibrary(storage = new Map()) {
    const localStorage = {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value)
    };
    return runInNewContext(`${source}\n;({ WordGenerator, WORD_LIBRARY_INDEX, WORD_LIBRARY_LEGACY_WORDS, PHONICS_SOUND_BY_LETTER })`, {
        localStorage,
        window: { getWordPuzzleStorageKey: (key) => `${key}:test-player` }
    });
}

test('all four word banks have unique, answer-safe clues and Easy has an exact audio match', () => {
    const { WORD_LIBRARY_INDEX } = createLibrary();
    const entries = WORD_LIBRARY_INDEX.filter(({ difficulty }) => difficulty !== 'phonics');
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

test('Phonics has a recording for every word and grapheme in its beginner bank', () => {
    const { WORD_LIBRARY_INDEX, PHONICS_SOUND_BY_LETTER } = createLibrary();
    const entries = WORD_LIBRARY_INDEX.filter(({ difficulty }) => difficulty === 'phonics');
    assert.ok(entries.length >= 170);
    assert.equal(new Set(WORD_LIBRARY_INDEX.map(({ id }) => id)).size, WORD_LIBRARY_INDEX.length);
    const sounds = new Set();
    for (const { word, id, clue } of entries) {
        assert.equal(id, `phonics:${word}`);
        assert.equal(clue, undefined);
        assert.match(word, /^(?:[AEIOU][A-Z]|[B-DF-HJ-NP-TV-Z][AEIOU][B-DF-HJ-NP-TV-Z])$/);
        for (const letter of word) {
            assert.ok(PHONICS_SOUND_BY_LETTER[letter], `${word}: ${letter}`);
            sounds.add(PHONICS_SOUND_BY_LETTER[letter]);
        }
    }

    const expected = {
        guides: ['welcome', 'sounds', 'try-again'],
        sounds: [...sounds],
        words: Array.from(entries, ({ word }) => word.toLowerCase())
    };
    for (const [kind, ids] of Object.entries(expected)) {
        const folder = new URL(`Voice/Phonics/${kind}/`, game);
        const files = ids.map((id) => `${id}.mp3`).sort();
        assert.deepEqual(readdirSync(folder).sort(), files);
        for (const file of files) assert.ok(statSync(new URL(file, folder)).size > 500, file);
    }
});

test('Phonics draws warmups before longer words and keeps its own repeat history', () => {
    const storage = new Map([['wordPuzzleRecentWordsV4:test-player', '["CAT","phonics:IT"]']]);
    const { WordGenerator } = createLibrary(storage);
    let generator = new WordGenerator();
    const seen = new Set(['IT']);
    for (let round = 0; round < generator.wordBanks.phonics.length - 1; round += 1) {
        if (round % 17 === 0) generator = new WordGenerator();
        const word = generator.generate(5, round < 2 ? 2 : 3);
        assert.equal(word.difficulty, 'phonics');
        if (round < 2) assert.equal(word.letters.length, 2);
        if (round === 2) assert.equal(word.letters.length, 3);
        assert.notEqual(word.scrambledLetters.join(''), word.word);
        assert.equal([...word.scrambledLetters].sort().join(''), [...word.word].sort().join(''));
        assert.ok(!seen.has(word.word), word.word);
        seen.add(word.word);
    }
    assert.ok(seen.has('CAT'));
    assert.equal(storage.has('wordPuzzleRecentTracksV3:test-player'), false);
});

test('Phonics holds each sound for the child and never advances while a tap is pending', async () => {
    const narratorSource = readFileSync(new URL('js/controllers/PhonicsNarrator.js', game), 'utf8');
    const words = readFileSync(new URL('js/utils/PhonicsWords.js', game), 'utf8');
    const played = [];
    const timers = new Map();
    let timerId = 0;
    const elements = new Map();
    const slots = Array.from({ length: 3 }, (_, index) => ({
        dataset: { position: String(index) },
        filled: false,
        highlighted: false,
        classList: {
            contains() { return slots[index].filled; },
            toggle(_name, enabled) { slots[index].highlighted = enabled; }
        }
    }));
    class Audio extends EventTarget {
        play() { played.push(this.src); return Promise.resolve(); }
        pause() {}
    }
    const document = new EventTarget();
    document.getElementById = (id) => {
        if (!elements.has(id)) elements.set(id, new EventTarget());
        return elements.get(id);
    };
    document.querySelector = () => slots.find(({ filled }) => !filled);
    document.querySelectorAll = () => slots;
    const { PhonicsNarrator } = runInNewContext(words + '\n' + narratorSource + '\n;({ PhonicsNarrator })', {
        AbortController, Audio, document, window: new EventTarget(),
        setTimeout(callback, delay) {
            timers.set(++timerId, { callback, delay });
            return timerId;
        },
        clearTimeout(id) { timers.delete(id); }
    });
    const narration = new PhonicsNarrator();
    narration.word = 'CAT';
    const settle = () => new Promise(resolve => setImmediate(resolve));
    const finishSound = async () => {
        narration.audio.dispatchEvent(new Event('ended'));
        await settle();
        const pause = [...timers.values()].find(({ delay }) => delay === 1000);
        assert.ok(pause, 'Each sound gives at least a second to listen and find the letter');
        pause.callback();
        await settle();
    };
    const round = narration.read('sounds');
    assert.deepEqual(played, ['Voice/Phonics/sounds/k.mp3']);
    await finishSound();
    assert.equal(slots[0].highlighted, true);
    assert.equal(played.length, 1);
    slots[0].filled = true;
    narration.letterPlaced();
    await settle();
    assert.equal(played.at(-1), 'Voice/Phonics/sounds/a.mp3');
    slots[1].filled = true;
    narration.letterPlaced();
    await settle();
    assert.equal(played.length, 2);
    await finishSound();
    assert.equal(played.at(-1), 'Voice/Phonics/sounds/t.mp3');
    await finishSound();
    narration.endRound(true);
    await round;
    assert.equal(narration.resumeAfterTap, null);
    assert.equal(slots.some(({ highlighted }) => highlighted), false);
});

test('wrong feedback always shows the current word after an overlay reset', () => {
    const controller = readFileSync(new URL('js/controllers/GameController.js', game), 'utf8');
    const heading = readFileSync(new URL('index.html', game), 'utf8').match(/id="incorrectAnswerText">([^<]+)/)[1];
    const timers = new Map();
    let timerId = 0;
    const elements = new Map([
        ['incorrectAnswerFx', { style: { display: 'none' } }],
        ['incorrectAnswerWord', { style: {}, textContent: '' }],
        ['incorrectAnswerText', { style: {}, textContent: heading }]
    ]);
    const { GameController } = runInNewContext(controller + '\n;({ GameController })', {
        document: { getElementById: id => elements.get(id) },
        setTimeout(callback) {
            timers.set(++timerId, callback);
            return timerId;
        },
        clearTimeout(id) { timers.delete(id); }
    });
    const feedback = Object.create(GameController.prototype);
    const card = elements.get('incorrectAnswerFx');
    const answer = elements.get('incorrectAnswerWord');
    const label = elements.get('incorrectAnswerText');
    const miss = word => feedback.showFeedback('Incorrect', 'The word was', '❌', {
        incorrectAnswerFx: { word, durationMs: 1850 }
    });
    for (const word of ['IN', 'CAT', 'APPLE', 'HONEYCOMB']) {
        feedback.hideFeedback();
        assert.equal(answer.textContent, '');
        miss(word);
        assert.equal(card.style.display, 'flex');
        assert.equal(label.textContent, 'The word was');
        assert.equal(answer.textContent, word);
        assert.notEqual(answer.style.display, 'none');
        timers.get(feedback.incorrectAnswerFxTimeout)();
        assert.equal(card.style.display, 'none');
        assert.equal(answer.textContent, '');
    }
});
