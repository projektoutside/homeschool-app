(function () {
    'use strict';
    const storageKey = 'lahs.preschool.challenge.v1';
    const names = ['First Flight', 'Garden Glide', 'Breezy Wings', 'Sky Explorer', 'Swift Thinker', 'Storm Rider', 'Lightning Wings', 'Ultimate Master'];
    const rates = [.012, .019, .029, .042, .058, .078, .102, .135];
    const goals = [4, 4, 5, 5, 6, 6, 7, 8];
    const flaps = [1, 1.08, 1.17, 1.28, 1.4, 1.55, 1.7, 1.9];
    const levels = names.map((name, index) => Object.freeze({ index, name, rate: rates[index], goal: goals[index], flapRate: flaps[index], speed: +(rates[index] / rates[0]).toFixed(2) }));
    function readProgress(storage) {
        try {
            const value = JSON.parse(storage.getItem(storageKey));
            return Number.isInteger(value?.completed) && value.completed >= 0 && value.completed <= levels.length ? value.completed : 0;
        } catch (_) { return 0; }
    }
    function writeProgress(storage, completed) {
        if (!Number.isInteger(completed) || completed < 0 || completed > levels.length) return false;
        try { storage.setItem(storageKey, JSON.stringify({ completed: Math.max(readProgress(storage), completed) })); return true; }
        catch (_) { return false; }
    }
    function createRun(index) {
        const level = levels[index];
        if (!level) throw new RangeError('Unknown challenge stage');
        let danger = .32, visualDanger = .32, graceMs = 1500, correct = 0;
        const describe = () => ({ level: index, danger, visualDanger, graceMs, correct, won: correct >= level.goal, caught: danger >= 1 && visualDanger >= .995 });
        return {
            describe,
            answer(isCorrect) {
                if (describe().won || describe().caught) return describe();
                if (isCorrect) { correct++; danger = Math.max(.06, danger - .24); graceMs = 1500; }
                else danger = Math.min(1, danger + .18);
                return describe();
            },
            advance(ms, racing = true) {
                const elapsed = Number.isFinite(ms) ? Math.max(0, ms) : 0;
                if (racing && !describe().won && !describe().caught) {
                    const movingMs = Math.max(0, elapsed - graceMs);
                    graceMs = Math.max(0, graceMs - elapsed);
                    danger = Math.min(1, danger + level.rate * movingMs / 1000);
                }
                visualDanger += (danger - visualDanger) * (1 - Math.exp(-elapsed / 130));
                return describe();
            }
        };
    }
    const crown = '<svg viewBox="0 0 48 40" aria-hidden="true" focusable="false"><path d="m5 10 9 9L24 4l10 15 9-9-5 23H10Z" fill="#ffd46b" stroke="#946126" stroke-width="3" stroke-linejoin="round"/><path d="M12 28h24" stroke="#fff3bd" stroke-width="3"/><circle cx="24" cy="23" r="3" fill="#66bdb0"/></svg>';
    window.PreschoolChallenge = { levels, storageKey, readProgress, writeProgress, createRun, crown };
})();
