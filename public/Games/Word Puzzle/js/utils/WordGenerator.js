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
        this.strictDifficultySafety = true;

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
        if (WORD_LIBRARY_DIFFICULTY_ORDER.includes(targetDifficulty)) {
            return [[targetDifficulty]];
        }

        return [['easy']];
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

    isEntryDifficultySafe(entry, targetDifficulty) {
        if (!entry || typeof entry !== 'object') return false;
        if (!this.strictDifficultySafety) return true;

        if (!this.canCreateDistinctScramble(entry.word)) {
            return false;
        }

        if (targetDifficulty === 'easy') {
            return entry.difficulty === 'easy' && entry.isEarlyReaderSafe === true;
        }

        if (targetDifficulty === 'medium') {
            return entry.difficulty === 'medium' && entry.isMediumReaderSafe === true;
        }

        if (targetDifficulty === 'hard') {
            return entry.difficulty === 'hard' && entry.isHardReaderSafe === true;
        }

        if (targetDifficulty === 'extreme') {
            return entry.difficulty === 'extreme' && entry.isExtremeReaderSafe === true;
        }

        return entry.difficulty === targetDifficulty;
    }

    selectEntryFromBanks(banks, targetDifficulty, recentWordIds) {
        if (!banks) return null;

        for (const difficultyGroup of this.getDifficultySearchOrder(targetDifficulty)) {
            const freshCandidates = difficultyGroup
                .flatMap((difficulty) => banks[difficulty] || [])
                .filter((entry) => {
                    return this.isEntryDifficultySafe(entry, targetDifficulty) && !recentWordIds.has(entry.id);
                });

            const selectedEntry = this.chooseDiversifiedCandidate(freshCandidates);
            if (selectedEntry) {
                return selectedEntry;
            }
        }

        return null;
    }

    getSafeDifficultyFallback(banks, targetDifficulty) {
        const exactDifficultyEntries = Array.isArray(banks?.[targetDifficulty]) ? banks[targetDifficulty] : [];
        return this.chooseDiversifiedCandidate(
            exactDifficultyEntries.filter((entry) => this.isEntryDifficultySafe(entry, targetDifficulty))
        );
    }

    hasSafeDifficultyEntries(banks, targetDifficulty) {
        const exactDifficultyEntries = Array.isArray(banks?.[targetDifficulty]) ? banks[targetDifficulty] : [];
        return exactDifficultyEntries.some((entry) => this.isEntryDifficultySafe(entry, targetDifficulty));
    }

    resolveTrackIdForEntry(entry, preferredTrackId = null) {
        const entryTrackIds = Array.isArray(entry?.tracks)
            ? entry.tracks.filter((trackId) => this.trackDefinitionsById[trackId])
            : [];

        if (preferredTrackId && entryTrackIds.includes(preferredTrackId)) {
            return preferredTrackId;
        }

        return entryTrackIds[0] || null;
    }

    buildSelection(entry, preferredTrackId = null) {
        if (!entry) return null;

        return {
            entry,
            trackId: this.resolveTrackIdForEntry(entry, preferredTrackId)
        };
    }

    ensureSafeSelection(selection, targetDifficulty) {
        if (!selection || !selection.entry) return null;
        return this.isEntryDifficultySafe(selection.entry, targetDifficulty) ? selection : null;
    }

    trackHasCandidates(trackId, targetDifficulty) {
        return this.hasSafeDifficultyEntries(this.trackBanks[trackId], targetDifficulty);
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
                return this.ensureSafeSelection(this.buildSelection(trackEntry, activeTrackId), targetDifficulty);
            }

            const replacementTrack = this.chooseNextTrack(targetDifficulty, activeTrackId);
            activeTrackId = this.activateTrack(replacementTrack, targetDifficulty);
            if (activeTrackId) {
                const replacementEntry = this.selectEntryFromBanks(this.trackBanks[activeTrackId], targetDifficulty, recentWordIds);
                if (replacementEntry) {
                    return this.ensureSafeSelection(this.buildSelection(replacementEntry, activeTrackId), targetDifficulty);
                }
            }
        }

        const globalFreshEntry = this.selectEntryFromBanks(this.wordBanks, targetDifficulty, recentWordIds);
        if (globalFreshEntry) {
            return this.ensureSafeSelection(this.buildSelection(globalFreshEntry, activeTrackId), targetDifficulty);
        }

        if (activeTrackId) {
            const trackFallbackEntry = this.getSafeDifficultyFallback(this.trackBanks[activeTrackId], targetDifficulty);
            if (trackFallbackEntry) {
                return this.ensureSafeSelection(this.buildSelection(trackFallbackEntry, activeTrackId), targetDifficulty);
            }
        }

        const fallbackEntry = this.getSafeDifficultyFallback(this.wordBanks, targetDifficulty);
        return fallbackEntry
            ? this.ensureSafeSelection(this.buildSelection(fallbackEntry, activeTrackId), targetDifficulty)
            : null;
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

    escapeRegExp(value) {
        return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    sanitizeClueText(rawClue, answer) {
        let clue = typeof rawClue === 'string' ? rawClue.trim() : '';
        if (!clue) return '';

        const normalizedAnswer = String(answer || '').trim();
        if (normalizedAnswer) {
            const answerPattern = new RegExp(`\\b${this.escapeRegExp(normalizedAnswer)}\\b`, 'gi');
            clue = clue.replace(answerPattern, 'this word');
        }

        const bannedHintPatterns = [
            /\bthe first letter is\b[^.?!]*[.?!]?/gi,
            /\bthe last letter is\b[^.?!]*[.?!]?/gi,
            /\bit starts with\b[^.?!]*[.?!]?/gi,
            /\bit ends with\b[^.?!]*[.?!]?/gi,
            /\bit has \d+ letters?\b[.?!]?/gi,
            /\b\d+ letters?\b[.?!]?/gi,
            /\bletter count\b[^.?!]*[.?!]?/gi
        ];

        bannedHintPatterns.forEach((pattern) => {
            clue = clue.replace(pattern, ' ');
        });

        return clue
            .replace(/\s+/g, ' ')
            .replace(/\s+([.?!,])/g, '$1')
            .trim();
    }

    isClueTooCloseToAnswer(clue, answer) {
        const normalizedAnswer = String(answer || '').trim().toUpperCase();
        if (!clue || !normalizedAnswer) return false;

        const answerTokenPattern = new RegExp(`\\b${this.escapeRegExp(normalizedAnswer)}\\b`, 'i');
        if (answerTokenPattern.test(clue)) {
            return true;
        }

        const clueTokens = clue
            .toUpperCase()
            .match(/[A-Z]+/g) || [];

        return clueTokens.some((token) => {
            if (token === normalizedAnswer) return true;
            if (token.startsWith(normalizedAnswer) && token.length <= normalizedAnswer.length + 2) return true;
            if (normalizedAnswer.startsWith(token) && normalizedAnswer.length <= token.length + 2) return true;
            return false;
        });
    }

    buildFallbackClue() {
        return 'Use the category to help you guess.';
    }

    buildAdaptiveClue(selectedEntry) {
        const safeClue = this.sanitizeClueText(selectedEntry?.clue, selectedEntry?.word);
        if (!safeClue || this.isClueTooCloseToAnswer(safeClue, selectedEntry?.word)) {
            return this.buildFallbackClue();
        }

        return safeClue;
    }

    generate(level) {
        const requestedDifficulty = this.difficultyMap[level] || 'easy';
        const selection = this.selectWordEntry(requestedDifficulty);

        if (!selection || !selection.entry) {
            throw new Error(`Word library does not contain safe ${requestedDifficulty} words.`);
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
            clue: this.buildAdaptiveClue(selectedEntry),
            category: selectedEntry.category,
            trackId: activeTrack ? activeTrack.id : null,
            trackTitle: activeTrack ? activeTrack.title : null,
            difficulty: requestedDifficulty,
            sourceDifficulty: selectedEntry.difficulty,
            gradeBandLabel: selectedEntry.gradeBandLabel || null,
            complexityScore: Number.isFinite(selectedEntry.complexityScore) ? selectedEntry.complexityScore : null,
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

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
