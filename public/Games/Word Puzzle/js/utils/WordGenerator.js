/**
 * Word Generator
 * Selects from a large indexed library, rotates themed tracks, and prevents repeats for long stretches.
 */
class WordGenerator {
    constructor() {
        this.difficultyMap = {
            1: 'easy',
            2: 'medium',
            3: 'hard',
            4: 'extreme'
        };

        this.repeatCooldown = 500;
        this.categoryCooldown = 12;
        this.trackCooldown = 3;
        this.wordHistoryStorageKey = this.resolveStorageKey('wordPuzzleRecentWordsV3');
        this.categoryHistoryStorageKey = this.resolveStorageKey('wordPuzzleRecentCategoriesV3');
        this.trackHistoryStorageKey = this.resolveStorageKey('wordPuzzleRecentTracksV3');
        this.trackStateStorageKey = this.resolveStorageKey('wordPuzzleTrackStateV3');

        this.libraryIndex = Array.isArray(WORD_LIBRARY_INDEX) ? WORD_LIBRARY_INDEX : [];
        this.trackDefinitions = Array.isArray(WORD_LIBRARY_TRACKS) ? WORD_LIBRARY_TRACKS : [];
        this.trackDefinitionsById = this.trackDefinitions.reduce((lookup, track) => {
            lookup[track.id] = track;
            return lookup;
        }, {});

        this.wordBanks = this.buildWordBanks(this.libraryIndex);
        this.trackBanks = this.buildTrackBanks(this.libraryIndex, this.trackDefinitions);

        this.recentWordIds = this.loadHistory(this.wordHistoryStorageKey);
        this.recentCategories = this.loadHistory(this.categoryHistoryStorageKey);
        this.recentTrackIds = this.loadHistory(this.trackHistoryStorageKey);
        this.trackState = this.loadTrackState();
    }

    resolveStorageKey(baseKey) {
        if (typeof window !== 'undefined' && typeof window.getWordPuzzleStorageKey === 'function') {
            const resolvedKey = window.getWordPuzzleStorageKey(baseKey);
            if (typeof resolvedKey === 'string' && resolvedKey) {
                return resolvedKey;
            }
        }

        return baseKey;
    }

    buildEmptyDifficultyBank() {
        return {
            easy: [],
            medium: [],
            hard: [],
            extreme: [],
            all: []
        };
    }

    buildWordBanks(libraryIndex) {
        return libraryIndex.reduce((banks, entry) => {
            if (!banks[entry.difficulty]) {
                banks[entry.difficulty] = [];
            }
            banks[entry.difficulty].push(entry);
            banks.all.push(entry);
            return banks;
        }, this.buildEmptyDifficultyBank());
    }

    buildTrackBanks(libraryIndex, trackDefinitions) {
        const banks = trackDefinitions.reduce((lookup, track) => {
            lookup[track.id] = this.buildEmptyDifficultyBank();
            return lookup;
        }, {});

        libraryIndex.forEach((entry) => {
            const trackIds = Array.isArray(entry.tracks) ? entry.tracks : [];
            trackIds.forEach((trackId) => {
                const bank = banks[trackId];
                if (!bank) return;
                bank[entry.difficulty].push(entry);
                bank.all.push(entry);
            });
        });

        return banks;
    }

    loadHistory(storageKey) {
        if (typeof localStorage === 'undefined') return [];

        try {
            const rawValue = localStorage.getItem(storageKey);
            if (!rawValue) return [];

            const parsed = JSON.parse(rawValue);
            return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
        } catch (_error) {
            return [];
        }
    }

    saveHistory(storageKey, values) {
        if (typeof localStorage === 'undefined') return;

        try {
            localStorage.setItem(storageKey, JSON.stringify(values));
        } catch (_error) {
            // Ignore storage quota or privacy-mode write failures.
        }
    }

    loadTrackState() {
        if (typeof localStorage === 'undefined') return null;

        try {
            const rawValue = localStorage.getItem(this.trackStateStorageKey);
            if (!rawValue) return null;

            const parsed = JSON.parse(rawValue);
            if (!parsed || typeof parsed !== 'object') return null;
            if (typeof parsed.id !== 'string') return null;
            if (!this.trackDefinitionsById[parsed.id]) return null;

            return {
                id: parsed.id,
                remainingRounds: Number.isFinite(parsed.remainingRounds) ? Math.max(0, parsed.remainingRounds) : 0
            };
        } catch (_error) {
            return null;
        }
    }

    saveTrackState() {
        if (typeof localStorage === 'undefined') return;

        try {
            if (!this.trackState) {
                localStorage.removeItem(this.trackStateStorageKey);
                return;
            }

            localStorage.setItem(this.trackStateStorageKey, JSON.stringify(this.trackState));
        } catch (_error) {
            // Ignore storage write failures.
        }
    }

    pushHistory(queue, value, limit) {
        queue.push(value);
        while (queue.length > limit) {
            queue.shift();
        }
    }

    getDifficultySearchOrder(targetDifficulty) {
        const targetIndex = WORD_LIBRARY_DIFFICULTY_ORDER.indexOf(targetDifficulty);
        if (targetIndex === -1) return [WORD_LIBRARY_DIFFICULTY_ORDER];

        const previousDifficulty = WORD_LIBRARY_DIFFICULTY_ORDER[targetIndex - 1];
        const nextDifficulty = WORD_LIBRARY_DIFFICULTY_ORDER[targetIndex + 1];
        const outerDifficulties = WORD_LIBRARY_DIFFICULTY_ORDER.filter((difficulty) => {
            return difficulty !== targetDifficulty && difficulty !== previousDifficulty && difficulty !== nextDifficulty;
        });

        return [
            [targetDifficulty],
            [previousDifficulty, nextDifficulty].filter(Boolean),
            outerDifficulties
        ];
    }

    getTrackRoundLength(targetDifficulty) {
        const lengths = {
            easy: 8,
            medium: 10,
            hard: 12,
            extreme: 14
        };
        return lengths[targetDifficulty] || 10;
    }

    chooseDiversifiedCandidate(candidates) {
        if (!Array.isArray(candidates) || candidates.length === 0) return null;

        const recentCategories = new Set(this.recentCategories);
        const diversifiedCandidates = candidates.filter((candidate) => !recentCategories.has(candidate.category));
        const candidatePool = diversifiedCandidates.length > 0 ? diversifiedCandidates : candidates;
        return candidatePool[this.randomInt(0, candidatePool.length - 1)];
    }

    selectEntryFromBanks(banks, targetDifficulty, recentWordIds) {
        if (!banks) return null;

        for (const difficultyGroup of this.getDifficultySearchOrder(targetDifficulty)) {
            const freshCandidates = difficultyGroup
                .flatMap((difficulty) => banks[difficulty] || [])
                .filter((entry) => !recentWordIds.has(entry.id));

            const selectedEntry = this.chooseDiversifiedCandidate(freshCandidates);
            if (selectedEntry) {
                return selectedEntry;
            }
        }

        return null;
    }

    trackHasCandidates(trackId, targetDifficulty) {
        return !!this.selectEntryFromBanks(this.trackBanks[trackId], targetDifficulty, new Set(this.recentWordIds));
    }

    chooseNextTrack(targetDifficulty, excludedTrackId = null) {
        const eligibleTracks = this.trackDefinitions.filter((track) => {
            return track.id !== excludedTrackId && this.trackHasCandidates(track.id, targetDifficulty);
        });

        if (eligibleTracks.length === 0) return null;

        const recentTrackIds = new Set(this.recentTrackIds);
        const freshTracks = eligibleTracks.filter((track) => !recentTrackIds.has(track.id));
        const trackPool = freshTracks.length > 0 ? freshTracks : eligibleTracks;
        return trackPool[this.randomInt(0, trackPool.length - 1)];
    }

    activateTrack(track, targetDifficulty) {
        if (!track) {
            this.trackState = null;
            this.saveTrackState();
            return null;
        }

        this.trackState = {
            id: track.id,
            remainingRounds: this.getTrackRoundLength(targetDifficulty)
        };
        this.pushHistory(this.recentTrackIds, track.id, this.trackCooldown);
        this.saveHistory(this.trackHistoryStorageKey, this.recentTrackIds);
        this.saveTrackState();
        return this.trackState.id;
    }

    getActiveTrackId(targetDifficulty) {
        if (
            this.trackState &&
            this.trackDefinitionsById[this.trackState.id] &&
            this.trackState.remainingRounds > 0 &&
            this.trackHasCandidates(this.trackState.id, targetDifficulty)
        ) {
            return this.trackState.id;
        }

        const nextTrack = this.chooseNextTrack(targetDifficulty);
        return this.activateTrack(nextTrack, targetDifficulty);
    }

    selectWordEntry(targetDifficulty) {
        const recentWordIds = new Set(this.recentWordIds);
        let activeTrackId = this.getActiveTrackId(targetDifficulty);

        if (activeTrackId) {
            const trackEntry = this.selectEntryFromBanks(this.trackBanks[activeTrackId], targetDifficulty, recentWordIds);
            if (trackEntry) {
                return { entry: trackEntry, trackId: activeTrackId };
            }

            const replacementTrack = this.chooseNextTrack(targetDifficulty, activeTrackId);
            activeTrackId = this.activateTrack(replacementTrack, targetDifficulty);
            if (activeTrackId) {
                const replacementEntry = this.selectEntryFromBanks(this.trackBanks[activeTrackId], targetDifficulty, recentWordIds);
                if (replacementEntry) {
                    return { entry: replacementEntry, trackId: activeTrackId };
                }
            }
        }

        const globalFreshEntry = this.selectEntryFromBanks(this.wordBanks, targetDifficulty, recentWordIds);
        if (globalFreshEntry) {
            return { entry: globalFreshEntry, trackId: activeTrackId };
        }

        const fallbackEntry = this.chooseDiversifiedCandidate(this.wordBanks[targetDifficulty] || this.libraryIndex);
        return fallbackEntry ? { entry: fallbackEntry, trackId: activeTrackId } : null;
    }

    rememberSelection(selection) {
        if (!selection || !selection.entry || !selection.entry.id) return;

        this.pushHistory(this.recentWordIds, selection.entry.id, this.repeatCooldown);
        this.pushHistory(this.recentCategories, selection.entry.category, this.categoryCooldown);
        this.saveHistory(this.wordHistoryStorageKey, this.recentWordIds);
        this.saveHistory(this.categoryHistoryStorageKey, this.recentCategories);

        if (selection.trackId && this.trackState && this.trackState.id === selection.trackId) {
            this.trackState.remainingRounds = Math.max(0, this.trackState.remainingRounds - 1);
            this.saveTrackState();
        }
    }

    buildAdaptiveClue(selectedEntry, requestedDifficulty) {
        const requestedIndex = WORD_LIBRARY_DIFFICULTY_ORDER.indexOf(requestedDifficulty);
        const sourceIndex = WORD_LIBRARY_DIFFICULTY_ORDER.indexOf(selectedEntry.difficulty);

        if (requestedIndex === -1 || sourceIndex === -1 || sourceIndex <= requestedIndex) {
            return selectedEntry.clue;
        }

        const firstLetter = selectedEntry.word.charAt(0);
        const lastLetter = selectedEntry.word.charAt(selectedEntry.word.length - 1);

        if (requestedDifficulty === 'easy') {
            return `${selectedEntry.clue} It starts with ${firstLetter} and ends with ${lastLetter}.`;
        }

        if (requestedDifficulty === 'medium') {
            return `${selectedEntry.clue} It starts with ${firstLetter}.`;
        }

        return selectedEntry.clue;
    }

    generate(level) {
        const requestedDifficulty = this.difficultyMap[level] || 'easy';
        const selection = this.selectWordEntry(requestedDifficulty);

        if (!selection || !selection.entry) {
            throw new Error('Word library index is empty.');
        }

        this.rememberSelection(selection);
        return this.generateWordScramble(selection.entry, requestedDifficulty, selection.trackId);
    }

    generateWordScramble(selectedEntry, requestedDifficulty, trackId = null) {
        const targetWord = selectedEntry.word.trim().toUpperCase();
        const letters = targetWord.split('');
        const scrambledLetters = this.shuffleUntilDifferent(letters);
        const activeTrack = trackId ? this.trackDefinitionsById[trackId] : null;

        return {
            type: 'word_unscramble',
            word: targetWord,
            wordId: selectedEntry.id,
            letters,
            scrambledLetters,
            clue: this.buildAdaptiveClue(selectedEntry, requestedDifficulty),
            category: selectedEntry.category,
            trackId: activeTrack ? activeTrack.id : null,
            trackTitle: activeTrack ? activeTrack.title : null,
            difficulty: requestedDifficulty,
            sourceDifficulty: selectedEntry.difficulty,
            display: `Unscramble: ${targetWord}`
        };
    }

    shuffleUntilDifferent(letters) {
        const original = [...letters];
        const shuffled = [...letters];

        for (let attempt = 0; attempt < 10; attempt += 1) {
            this.shuffleArray(shuffled);
            if (!this.areArraysEqual(shuffled, original)) {
                return [...shuffled];
            }
        }

        if (shuffled.length > 1) {
            const first = shuffled.shift();
            shuffled.push(first);
        }
        return shuffled;
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

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
