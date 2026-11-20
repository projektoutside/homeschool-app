/**
 * Draws from the least-played vocabulary while rotating themed tracks.
 */
class WordGenerator {
    constructor() {
        this.wordBanks = Object.fromEntries(
            WORD_LIBRARY_DIFFICULTY_ORDER.map((difficulty) => [difficulty, []])
        );
        for (const entry of WORD_LIBRARY_INDEX) {
            this.wordBanks[entry.difficulty].push(entry);
        }

        this.wordHistoryStorageKey = this.resolveStorageKey('wordPuzzleRecentWordsV4');
        this.categoryHistoryStorageKey = this.resolveStorageKey('wordPuzzleRecentCategoriesV3');
        this.trackHistoryStorageKey = this.resolveStorageKey('wordPuzzleRecentTracksV3');
        this.trackStateStorageKey = this.resolveStorageKey('wordPuzzleTrackStateV3');

        const savedWords = this.readStorage(this.wordHistoryStorageKey);
        const legacyWords = this.readStorage(this.resolveStorageKey('wordPuzzleRecentWordsV3'));
        const wordIds = Array.isArray(savedWords) ? savedWords : Array.isArray(legacyWords)
            ? legacyWords.map((id) => WORD_LIBRARY_LEGACY_WORDS[String(id).replace(/^word-puzzle-/, '')])
            : [];
        const playableWords = new Set(WORD_LIBRARY_INDEX.map((entry) => entry.id));
        // Keep the latest occurrence if a previous history contains duplicates.
        this.recentWordIds = [...new Set(wordIds.filter((id) => playableWords.has(id)).reverse())].reverse();

        const categories = this.readStorage(this.categoryHistoryStorageKey);
        this.recentCategories = Array.isArray(categories) ? categories.slice(-12) : [];
        const tracks = this.readStorage(this.trackHistoryStorageKey);
        this.recentTrackIds = Array.isArray(tracks) ? tracks.slice(-3) : [];
        const trackState = this.readStorage(this.trackStateStorageKey);
        this.trackState = Number.isInteger(trackState?.remainingRounds) ? trackState : null;
    }

    resolveStorageKey(baseKey) {
        return typeof window !== 'undefined' && window.getWordPuzzleStorageKey
            ? window.getWordPuzzleStorageKey(baseKey) || baseKey
            : baseKey;
    }

    readStorage(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch (_error) {
            return null;
        }
    }

    writeStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (_error) {
            // Keep round history in memory when persistence is unavailable.
        }
    }

    getCandidates(difficulty) {
        const entries = this.wordBanks[difficulty];
        const seen = new Set(this.recentWordIds);
        const fresh = entries.filter((entry) => !seen.has(entry.id));
        if (fresh.length) return fresh;

        // After the first full pass, randomize among the oldest fifth of this bank.
        const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
        const oldest = this.recentWordIds.filter((id) => entriesById.has(id));
        return oldest.slice(0, Math.max(1, Math.floor(entries.length / 5))).map((id) => entriesById.get(id));
    }

    selectWordEntry(difficulty, preferredLength = null) {
        const candidates = this.getCandidates(difficulty);
        if (difficulty === 'phonics') {
            const preferred = candidates.filter(({ length }) => length === preferredLength);
            return { entry: this.pickOne(preferred.length ? preferred : candidates) };
        }
        const eligibleTracks = WORD_LIBRARY_TRACKS.filter((track) =>
            candidates.some((entry) => entry.tracks.includes(track.id))
        );
        let track = eligibleTracks.find(({ id }) => id === this.trackState?.id);
        if (!track || this.trackState.remainingRounds <= 0) {
            const freshTracks = eligibleTracks.filter(({ id }) => !this.recentTrackIds.includes(id));
            const otherTracks = eligibleTracks.filter(({ id }) => id !== this.trackState?.id);
            track = this.pickOne(freshTracks.length ? freshTracks : otherTracks.length ? otherTracks : eligibleTracks);
            if (track) {
                const trackLengths = { easy: 8, medium: 10, hard: 12, extreme: 14 };
                this.trackState = { id: track.id, remainingRounds: trackLengths[difficulty] };
                this.recentTrackIds = [...this.recentTrackIds, track.id].slice(-3);
                this.writeStorage(this.trackHistoryStorageKey, this.recentTrackIds);
            }
        }

        const trackCandidates = track ? candidates.filter((entry) => entry.tracks.includes(track.id)) : candidates;
        const varied = trackCandidates.filter((entry) => !this.recentCategories.includes(entry.category));
        return { entry: this.pickOne(varied.length ? varied : trackCandidates), track };
    }

    pickOne(items) {
        return items[Math.floor(Math.random() * items.length)];
    }

    generate(level, preferredLength = null) {
        const difficulty = WORD_LIBRARY_DIFFICULTY_ORDER[level - 1] || 'easy';
        const { entry, track } = this.selectWordEntry(difficulty, preferredLength);
        const letters = entry.word.split('');
        const scrambledLetters = this.shuffleUntilDifferent(letters);

        this.recentWordIds = this.recentWordIds.filter((id) => id !== entry.id);
        this.recentWordIds.push(entry.id);
        this.writeStorage(this.wordHistoryStorageKey, this.recentWordIds);
        if (difficulty !== 'phonics') {
            this.recentCategories = [...this.recentCategories, entry.category].slice(-12);
            this.writeStorage(this.categoryHistoryStorageKey, this.recentCategories);
        }
        if (track) {
            this.trackState.remainingRounds -= 1;
            this.writeStorage(this.trackStateStorageKey, this.trackState);
        }

        return {
            type: 'word_unscramble',
            word: entry.word,
            wordId: entry.id,
            letters,
            scrambledLetters,
            clue: entry.clue,
            category: entry.category,
            trackId: track?.id || null,
            trackTitle: track?.title || null,
            difficulty,
            sourceDifficulty: entry.difficulty,
            gradeBandLabel: entry.gradeBandLabel,
            complexityScore: entry.complexityScore,
            display: `Unscramble ${letters.length} letters`
        };
    }

    canCreateDistinctScramble(value) {
        const letters = Array.isArray(value)
            ? value.map((letter) => String(letter))
            : String(value || '').trim().toUpperCase().split('');

        if (letters.length < 2) return false;
        return new Set(letters).size > 1;
    }

    buildGuaranteedDifferentArrangement(letters) {
        const original = [...letters];

        for (let left = 0; left < original.length - 1; left += 1) {
            for (let right = left + 1; right < original.length; right += 1) {
                if (original[left] === original[right]) continue;

                const swapped = [...original];
                [swapped[left], swapped[right]] = [swapped[right], swapped[left]];

                if (!this.areArraysEqual(swapped, original)) {
                    return swapped;
                }
            }
        }

        const rotated = [...original.slice(1), original[0]];
        return this.areArraysEqual(rotated, original) ? null : rotated;
    }

    shuffleUntilDifferent(letters) {
        const original = [...letters];
        if (!this.canCreateDistinctScramble(original)) {
            throw new Error('Word cannot be scrambled safely.');
        }

        for (let attempt = 0; attempt < 24; attempt += 1) {
            const shuffled = [...letters];
            this.shuffleArray(shuffled);
            if (!this.areArraysEqual(shuffled, original)) {
                return shuffled;
            }
        }

        const guaranteedArrangement = this.buildGuaranteedDifferentArrangement(original);
        if (guaranteedArrangement) {
            return guaranteedArrangement;
        }

        throw new Error('Unable to generate a safe scrambled word.');
    }

    areArraysEqual(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i += 1) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
}
