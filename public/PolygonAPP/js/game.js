
// Game State Management
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    LEVEL_COMPLETE: 'level_complete',
    GAME_OVER: 'game_over'
};

function normalizePercentagesToHundred(values, decimals = 1) {
    const safeValues = Array.isArray(values)
        ? values.map(v => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0))
        : [];
    if (!safeValues.length) return [];

    const total = safeValues.reduce((sum, v) => sum + v, 0);
    if (!(total > 0)) {
        const even = 100 / safeValues.length;
        return safeValues.map(() => even);
    }

    const scale = Math.max(1, Math.pow(10, Math.max(0, Math.floor(decimals))));
    const targetUnits = 100 * scale;
    const rawUnits = safeValues.map(v => (v / total) * targetUnits);
    const floored = rawUnits.map(v => Math.floor(v));
    let remainder = targetUnits - floored.reduce((sum, v) => sum + v, 0);

    const order = rawUnits
        .map((v, i) => ({ i, frac: v - floored[i] }))
        .sort((a, b) => b.frac - a.frac);

    let cursor = 0;
    while (remainder > 0 && order.length) {
        const idx = order[cursor % order.length].i;
        floored[idx] += 1;
        remainder -= 1;
        cursor += 1;
    }

    return floored.map(v => v / scale);
}

class Game {
    constructor(app) {
        this.app = app; // Reference to PolygonFunApp instance
        this.state = GameState.MENU;
        this.currentMode = null;
        this.currentLevel = 0;
        this.score = 0;
        this.levels = []; // Loaded from levels.js
        this.baseLevels = [];
        this.levelStorageNamespaceVersion = 'v2';
        this.levelDataSignature = 'default';
        this.levelOverrideStorageKey = this.buildScopedStorageKey('polygonFunLevelOverrides');
        this.hardcoreLevelStorageKey = this.buildScopedStorageKey('polygonFunHardcoreLevels');
        this.officialLevelNamesStorageKey = this.buildScopedStorageKey('polygonFunOfficialLevelNames');
        this.devManager = new DevManager(this); // Initialize DevManager
    }

    buildScopedStorageKey(baseKey) {
        const signature = this.levelDataSignature || 'default';
        return `${baseKey}:${this.levelStorageNamespaceVersion}:${signature}`;
    }

    setLevelStorageNamespace(signature) {
        const safeSignature = (typeof signature === 'string' && signature.trim())
            ? signature.trim()
            : 'default';
        this.levelDataSignature = safeSignature;
        this.levelOverrideStorageKey = this.buildScopedStorageKey('polygonFunLevelOverrides');
        this.hardcoreLevelStorageKey = this.buildScopedStorageKey('polygonFunHardcoreLevels');
        this.officialLevelNamesStorageKey = this.buildScopedStorageKey('polygonFunOfficialLevelNames');
    }

    computeLevelsSignature(levels) {
        const source = Array.isArray(levels) ? levels : [];
        const payload = source.map(level => ({
            id: Number(level?.id),
            name: typeof level?.name === 'string' ? level.name : '',
            targetPieces: Number(level?.targetPieces),
            maxLines: Number(level?.maxLines),
            starThresholds: this.normalizeStarThresholds(level?.starThresholds),
            startShapeVertices: Array.isArray(level?.startShapeVertices)
                ? level.startShapeVertices.map(v => ({ x: Number(v?.x), y: Number(v?.y) }))
                : []
        }));
        const json = JSON.stringify(payload);

        // Deterministic lightweight hash (djb2 variant) for storage namespacing.
        let hash = 5381;
        for (let i = 0; i < json.length; i++) {
            hash = ((hash << 5) + hash) ^ json.charCodeAt(i);
        }
        const normalized = (hash >>> 0).toString(16);
        return `sig_${normalized}`;
    }

    init() {
        // Initialize game systems
        console.log('Game system initialized');
        // Hook into app events if needed
    }

    startMode(modeName) {
        if (modeName === 'beginner') {
            this.currentMode = new BeginnerMode(this);
            // Switch UI to Game Mode
            this.toggleUI(true);
            this.currentMode.start();
        }
        this.state = GameState.PLAYING;
        // Hide Main Menu
        if (MainMenu) MainMenu.hide();

        // Ensure canvas/layout are fully recalculated after mode switch.
        // This fixes initial off-center rendering that only corrected after a manual resize (e.g. F12 toggle).
        this.stabilizeCanvasLayout();
    }

    stop() {
        this.state = GameState.MENU;
        this.currentMode = null;
        this.toggleUI(false);
        if (typeof window.stopGameplayMusic === 'function') {
            window.stopGameplayMusic({ fadeOutMs: 500 }).catch(() => { });
        }
        // Guard against accidental tap/click-through immediately after closing overlays.
        window.__mainMenuReturnCooldownUntil = Date.now() + 900;
        if (this.app) {
            this.app.gridSnap = true;
        }
        if (MainMenu) MainMenu.show();

        // Ensure any tutorial overlay is fully dismissed when returning to main menu.
        if (window.tutorial && typeof window.tutorial.reset === 'function') {
            try {
                window.tutorial.reset();
            } catch (e) {
                console.warn('Failed to reset tutorial on game stop:', e);
            }
        }
        window.__allowTutorialToStartGame = false;

        // Remove HUD
        const hud = document.getElementById('gameHUD');
        if (hud) hud.remove();

        const controls = document.getElementById('gameControls');
        if (controls) controls.style.display = 'none';

        const results = document.getElementById('gameResultsOverlay');
        if (results) results.style.display = 'none';

        const boxScore = document.getElementById('boxScoreOverlay');
        if (boxScore) {
            boxScore.style.display = 'none';
            boxScore.setAttribute('aria-hidden', 'true');
        }

        const saveLoad = document.getElementById('saveLoadOverlay');
        if (saveLoad) {
            saveLoad.style.display = 'none';
            saveLoad.setAttribute('aria-hidden', 'true');
        }

        const options = document.getElementById('gameOptionsOverlay');
        if (options) {
            options.style.display = 'none';
            options.setAttribute('aria-hidden', 'true');
        }

        // Hide Dev Panel if open
        if (this.devManager) this.devManager.hide();

        // Re-sync canvas after restoring non-game UI panels.
        this.stabilizeCanvasLayout();
    }

    stabilizeCanvasLayout() {
        if (!this.app) return;

        const runResizeSync = () => {
            if (!this.app) return;
            this.app.resizeCanvas();
            this.app.render(true);
        };

        // Run several passes because flex/layout changes can settle over multiple frames
        // on some Windows/browser DPI combinations.
        runResizeSync();
        requestAnimationFrame(() => {
            runResizeSync();
            requestAnimationFrame(runResizeSync);
        });
        setTimeout(runResizeSync, 120);
        setTimeout(runResizeSync, 260);
    }

    toggleUI(active) {
        // Elements to hide during game mode
        const selectorsToHide = [
            // '.sidebar',               // Layers (left) - REMOVED
            // '.sidebar-right',         // Visualizers (right) - REMOVED
            '.toolbar',               // Left Toolbar
            '.top-tools-bar',         // Top Bar (Fullscreen toggle)
            '.mobile-menu-toggle',    // Mobile toggles if any
            '.coord-display'          // Coordinate display
        ];

        selectorsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (active) {
                    el.classList.add('game-hidden');
                    el.style.display = 'none'; // Force hide
                } else {
                    el.classList.remove('game-hidden');
                    el.style.display = ''; // Restore default
                }
            });
        });



        const controls = document.getElementById('gameControls');
        if (controls) {
            controls.style.display = active ? 'flex' : 'none';
        }

        // Force a full canvas/layout sync whenever major panels are shown/hidden.
        // This prevents the viewport from starting shifted until a manual resize occurs.
        this.stabilizeCanvasLayout();
    }

    loadLevels(levels) {
        this.baseLevels = [];
        // SAFE LEVEL VALIDATION
        levels.forEach((lvl, idx) => {
            const sanitized = this.sanitizeLevel(lvl, idx);
            if (!sanitized) return;
            this.baseLevels.push(sanitized);
        });

        // IMPORTANT: Scope any local overrides/hardcore saves by the current
        // shipped level signature. This guarantees that when js/levels.js is
        // updated in GitHub/deployment, stale local override payloads from old
        // versions cannot mask the new official levels.
        const signature = this.computeLevelsSignature(this.baseLevels);
        this.setLevelStorageNamespace(signature);

        // Preserve official shipped level names once so Hardcore Save can always
        // restore naming back to original built-in labels.
        const savedOfficialNames = this.getOfficialLevelNames();
        if (!savedOfficialNames.length && this.baseLevels.length) {
            this.saveOfficialLevelNames(this.baseLevels.map(level => level.name));
        }

        // Runtime "hardcore" baseline: if present and valid, it becomes the new
        // built-in level data source across refresh/restart.
        const hardcoreLevels = this.getHardcoreLevels(this.baseLevels.length);
        if (hardcoreLevels && hardcoreLevels.length === this.baseLevels.length) {
            console.info('[HardcoreSave] Loaded committed hardcore baseline levels.');
            this.baseLevels = this.restoreOfficialLevelNames(hardcoreLevels);
        } else {
            this.baseLevels = this.restoreOfficialLevelNames(this.baseLevels);
        }

        this.levels = this.applyLevelOverrides(this.baseLevels);

        // Refresh dev manager list if it exists
        if (this.devManager && this.devManager.panel) {
            this.devManager.populateList();
        }
    }

    getStorageAdapter() {
        if (window.SafeStorage && typeof window.SafeStorage.getItem === 'function') {
            return window.SafeStorage;
        }
        return window.localStorage;
    }

    storageGetItem(key) {
        try {
            return this.getStorageAdapter().getItem(key);
        } catch (error) {
            console.warn('Level override storage read failed:', error);
            return null;
        }
    }

    storageSetItem(key, value) {
        try {
            this.getStorageAdapter().setItem(key, value);
            return true;
        } catch (error) {
            console.warn('Level override storage write failed:', error);
            return false;
        }
    }

    safeParseJSON(raw, label) {
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (error) {
            console.warn(`Failed to parse ${label}`, error);
            return null;
        }
    }

    getOfficialLevelNames() {
        const raw = this.storageGetItem(this.officialLevelNamesStorageKey);
        if (!raw) return [];
        const parsed = this.safeParseJSON(raw, 'official level names');
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map(name => (typeof name === 'string' ? name.trim() : ''))
            .filter(Boolean);
    }

    saveOfficialLevelNames(names) {
        const sanitized = Array.isArray(names)
            ? names.map(name => (typeof name === 'string' ? name.trim() : '')).filter(Boolean)
            : [];
        if (!sanitized.length) return false;
        return this.storageSetItem(this.officialLevelNamesStorageKey, JSON.stringify(sanitized));
    }

    restoreOfficialLevelNames(levels) {
        const source = Array.isArray(levels) ? levels : [];
        const officialNames = this.getOfficialLevelNames();
        if (!officialNames.length) {
            return source.map(level => ({ ...level }));
        }
        return source.map((level, index) => ({
            ...level,
            name: officialNames[index] || level.name
        }));
    }

    normalizeStarThresholds(input) {
        const fallback = { one: 0.18, two: 0.12, three: 0.06 };
        if (!input || typeof input !== 'object') return fallback;
        const one = Number(input.one);
        const two = Number(input.two);
        const three = Number(input.three);
        const normalized = {
            one: Number.isFinite(one) && one > 0 ? Math.min(1, one) : fallback.one,
            two: Number.isFinite(two) && two > 0 ? Math.min(1, two) : fallback.two,
            three: Number.isFinite(three) && three > 0 ? Math.min(1, three) : fallback.three
        };
        if (normalized.three > normalized.two) normalized.three = normalized.two;
        if (normalized.two > normalized.one) normalized.two = normalized.one;
        return normalized;
    }

    sanitizeVertices(vertices) {
        if (!Array.isArray(vertices)) return null;
        const out = vertices
            .map(v => ({ x: Number(v?.x), y: Number(v?.y) }))
            .filter(v => Number.isFinite(v.x) && Number.isFinite(v.y));
        return out.length >= 3 ? out : null;
    }

    sanitizeLevel(level, index = 0) {
        if (!level || typeof level !== 'object') return null;
        const startShapeVertices = this.sanitizeVertices(level.startShapeVertices);
        if (!startShapeVertices) {
            console.warn(`Skipping invalid level ${index}: Invalid vertices.`);
            return null;
        }
        const targetPieces = Number(level.targetPieces);
        if (!Number.isFinite(targetPieces) || targetPieces < 2) {
            console.warn(`Skipping invalid level ${index}: Invalid target pieces.`);
            return null;
        }
        const maxLines = Number(level.maxLines);
        return {
            id: Number.isFinite(Number(level.id)) ? Number(level.id) : (index + 1),
            name: typeof level.name === 'string' && level.name.trim() ? level.name.trim() : `Level ${index + 1}`,
            focus: typeof level.focus === 'string' ? level.focus : 'Custom',
            instruction: typeof level.instruction === 'string' ? level.instruction : 'Split the shape evenly.',
            color: typeof level.color === 'string' && level.color ? level.color : '#667eea',
            startShapeVertices,
            targetPieces: Math.max(2, Math.floor(targetPieces)),
            maxLines: Number.isFinite(maxLines) ? Math.max(1, Math.floor(maxLines)) : 3,
            starThresholds: this.normalizeStarThresholds(level.starThresholds)
        };
    }

    validateLevelCollection(levels, label = 'levels') {
        const source = Array.isArray(levels) ? levels : [];
        if (!source.length) {
            return { ok: false, levels: [], error: `${label}: empty dataset.` };
        }
        const sanitized = [];
        for (let i = 0; i < source.length; i++) {
            const level = this.sanitizeLevel(source[i], i);
            if (!level) {
                return { ok: false, levels: [], error: `${label}: invalid level at index ${i}.` };
            }
            sanitized.push(level);
        }
        return { ok: true, levels: sanitized, error: '' };
    }

    getHardcorePayload() {
        const raw = this.storageGetItem(this.hardcoreLevelStorageKey);
        if (!raw) return null;
        const parsed = this.safeParseJSON(raw, 'hardcore baseline levels');
        if (!parsed) return null;
        if (Array.isArray(parsed)) {
            return { version: 1, savedAt: null, levels: parsed };
        }
        if (typeof parsed === 'object' && parsed && Array.isArray(parsed.levels)) {
            return {
                version: Number.isFinite(Number(parsed.version)) ? Number(parsed.version) : 1,
                savedAt: Number.isFinite(Number(parsed.savedAt)) ? Number(parsed.savedAt) : null,
                levels: parsed.levels
            };
        }
        return null;
    }

    getHardcoreLevels(expectedCount = null) {
        const payload = this.getHardcorePayload();
        if (!payload || !Array.isArray(payload.levels)) return null;
        if (Number.isFinite(expectedCount) && payload.levels.length !== expectedCount) {
            console.warn('[HardcoreSave] Ignoring committed baseline due to level count mismatch.', {
                expected: expectedCount,
                actual: payload.levels.length
            });
            return null;
        }
        const validation = this.validateLevelCollection(payload.levels, 'hardcore baseline');
        if (!validation.ok) {
            console.warn('[HardcoreSave] Ignoring invalid committed baseline:', validation.error);
            return null;
        }
        return validation.levels;
    }

    saveHardcoreLevels(levels) {
        const payload = {
            version: 1,
            savedAt: Date.now(),
            levels
        };
        return this.storageSetItem(this.hardcoreLevelStorageKey, JSON.stringify(payload));
    }

    buildHardcoreSnapshotFromCurrentLevels() {
        const source = Array.isArray(this.levels) ? this.levels : [];
        if (!source.length) return null;

        const snapshot = source.map((level, index) => {
            const sanitized = this.sanitizeLevel(level, index);
            if (!sanitized) return null;
            return sanitized;
        });

        if (snapshot.some(level => !level)) return null;
        return snapshot;
    }

    escapeJsString(value) {
        const text = typeof value === 'string' ? value : '';
        return text
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n');
    }

    formatLevelNumber(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return '0';
        if (Math.abs(n) < 1e-12) return '0';
        if (Number.isInteger(n)) return `${n}`;
        return `${n.toFixed(6).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')}`;
    }

    formatLevelVertices(vertices) {
        const safeVertices = Array.isArray(vertices) ? vertices : [];
        const chunks = safeVertices.map(v => {
            const x = this.formatLevelNumber(v?.x);
            const y = this.formatLevelNumber(v?.y);
            return `{ x: ${x}, y: ${y} }`;
        });
        return `[${chunks.join(', ')}]`;
    }

    buildHardcoreLevelsSource(levels) {
        const safeLevels = Array.isArray(levels) ? levels : [];
        const blocks = safeLevels.map((level, index) => {
            const starThresholds = this.normalizeStarThresholds(level?.starThresholds);
            const id = Number.isFinite(Number(level?.id)) ? Number(level.id) : (index + 1);
            const name = this.escapeJsString(level?.name || `Stage ${index + 1}`);
            const focus = this.escapeJsString(level?.focus || 'Custom');
            const instruction = this.escapeJsString(level?.instruction || 'Split the shape evenly.');
            const color = this.escapeJsString(level?.color || '#667eea');
            const targetPieces = Math.max(2, Math.floor(Number(level?.targetPieces) || 2));
            const maxLines = Math.max(1, Math.floor(Number(level?.maxLines) || 1));
            const vertices = this.formatLevelVertices(level?.startShapeVertices);

            let tierHeader = '';
            if (index === 0) {
                tierHeader = [
                    '    // =====================================================',
                    '    // TIER 1: EASY (Stages 1-5) - Learning the Basics',
                    '    // Difficulty Range: 35-60',
                    '    // Focus: Simple shapes, intuitive divisions',
                    '    // =====================================================',
                    ''
                ].join('\n');
            } else if (index === 5) {
                tierHeader = [
                    '',
                    '    // =====================================================',
                    '    // TIER 2: EASY-MEDIUM (Stages 6-10) - Building Efficiency',
                    '    // Difficulty Range: 55-90',
                    '    // Focus: Efficiency, more pieces, new shapes',
                    '    // =====================================================',
                    ''
                ].join('\n');
            } else if (index === 10) {
                tierHeader = [
                    '',
                    '    // =====================================================',
                    '    // TIER 3: MEDIUM (Stages 11-15) - Tight Constraints',
                    '    // Difficulty Range: 85-105',
                    '    // Focus: High efficiency ratios, irregular shapes',
                    '    // =====================================================',
                    ''
                ].join('\n');
            } else if (index === 15) {
                tierHeader = [
                    '',
                    '    // =====================================================',
                    '    // TIER 4: MEDIUM-HARD (Stages 16-20) - Precision Required',
                    '    // Difficulty Range: 100-135',
                    '    // Focus: Very tight constraints, complex shapes',
                    '    // =====================================================',
                    ''
                ].join('\n');
            } else if (index === 20) {
                tierHeader = [
                    '',
                    '    // =====================================================',
                    '    // TIER 5: HARD (Stages 21-25) - Expert Challenges',
                    '    // Difficulty Range: 140-170',
                    '    // Focus: Double-digit pieces, extreme constraints',
                    '    // =====================================================',
                    ''
                ].join('\n');
            } else if (index === 25) {
                tierHeader = [
                    '',
                    '    // =====================================================',
                    '    // TIER 6: EXPERT (Stages 26-30) - Legendary Challenges',
                    '    // Difficulty Range: 180-240',
                    '    // Focus: Extreme piece counts, near-impossible constraints',
                    '    // =====================================================',
                    ''
                ].join('\n');
            }

            const codeBlock = [
                '    {',
                `        id: ${id}, name: "${name}", focus: "${focus}", instruction: "${instruction}",`,
                `        startShapeVertices: ${vertices},`,
                `        color: '${color}', targetPieces: ${targetPieces}, maxLines: ${maxLines},`,
                `        starThresholds: { one: ${this.formatLevelNumber(starThresholds.one)}, two: ${this.formatLevelNumber(starThresholds.two)}, three: ${this.formatLevelNumber(starThresholds.three)} }`,
                '    }'
            ].join('\n');

            return tierHeader + codeBlock;
        });

        return [
            'const GameLevels = [',
            blocks.join(',\n'),
            '];',
            '',
            '// Export for use in game',
            "if (typeof module !== 'undefined' && module.exports) {",
            '    module.exports = GameLevels;',
            '}'
        ].join('\n');
    }

    downloadHardcoreLevelsSource(sourceCode) {
        try {
            if (!sourceCode || typeof document === 'undefined' || typeof URL === 'undefined') {
                return { ok: false, error: 'Download API unavailable.' };
            }
            const blob = new Blob([sourceCode], { type: 'text/javascript;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'levels.js';
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            return { ok: true, error: '' };
        } catch (error) {
            return { ok: false, error: error?.message || 'Failed to download generated levels source.' };
        }
    }

    commitHardcoreLevelsFromCurrentConfig() {
        const expectedLevelCount = Array.isArray(this.baseLevels) ? this.baseLevels.length : 0;
        console.groupCollapsed('[HardcoreSave] Commit started');
        try {
            const snapshot = this.buildHardcoreSnapshotFromCurrentLevels();
            const precheck = this.validateLevelCollection(snapshot, 'pre-commit snapshot');
            if (!precheck.ok) {
                console.error('[HardcoreSave] Pre-commit validation failed:', precheck.error);
                return { ok: false, error: precheck.error };
            }
            if (expectedLevelCount > 0 && precheck.levels.length !== expectedLevelCount) {
                const countError = `Level count mismatch: expected ${expectedLevelCount}, got ${precheck.levels.length}.`;
                console.error('[HardcoreSave] Pre-commit validation failed:', countError);
                return { ok: false, error: countError };
            }

            console.info('[HardcoreSave] Pre-commit validation passed.', {
                levels: precheck.levels.length
            });

            // Update official names first so they persist across reloads
            const newNames = precheck.levels.map(l => l.name);
            if (!this.saveOfficialLevelNames(newNames)) {
                console.warn('[HardcoreSave] Failed to update official level names storage.');
            }

            const writeOk = this.saveHardcoreLevels(precheck.levels);
            if (!writeOk) {
                console.error('[HardcoreSave] Failed to write committed baseline to storage.');
                return { ok: false, error: 'Storage write failed while saving hardcore baseline.' };
            }

            const readback = this.getHardcoreLevels(precheck.levels.length);
            const postcheck = this.validateLevelCollection(readback, 'post-commit readback');
            if (!postcheck.ok) {
                console.error('[HardcoreSave] Post-commit validation failed:', postcheck.error);
                return { ok: false, error: postcheck.error };
            }

            // Clear temporary overrides so the UI no longer labels levels as custom.
            if (!this.saveLevelOverrides({})) {
                console.error('[HardcoreSave] Failed to clear temporary override storage.');
                return { ok: false, error: 'Committed baseline saved, but failed to clear temporary overrides.' };
            }

            this.baseLevels = this.restoreOfficialLevelNames(postcheck.levels);
            this.refreshLevelsFromOverrides();

            // Post-commit gameplay verification hook: reload current stage definition.
            if (this.currentMode && typeof this.currentMode.loadLevel === 'function') {
                const currentIndex = Number(this.currentMode.currentLevelIndex);
                const safeIndex = Number.isFinite(currentIndex)
                    ? Math.max(0, Math.min(this.levels.length - 1, currentIndex))
                    : 0;
                this.currentMode.loadLevel(safeIndex);
                console.info('[HardcoreSave] Reloaded current stage after commit for integrity check.', {
                    stage: safeIndex + 1
                });
            }

            if (this.devManager && this.devManager.panel) {
                this.devManager.populateList();
            }

            const generatedSource = this.buildHardcoreLevelsSource(this.baseLevels);
            const exportResult = this.downloadHardcoreLevelsSource(generatedSource);
            window.__hardcoreLevelsSourceCode = generatedSource;
            if (!exportResult.ok) {
                console.warn('[HardcoreSave] Generated levels source, but download was not triggered:', exportResult.error);
            }

            console.info('[HardcoreSave] Commit completed successfully.', {
                levels: this.baseLevels.length
            });
            return {
                ok: true,
                levelsCommitted: this.baseLevels.length,
                generatedSource,
                export: exportResult
            };
        } catch (error) {
            console.error('[HardcoreSave] Commit failed with unexpected error:', error);
            return { ok: false, error: error?.message || 'Unknown Hardcore Save error.' };
        } finally {
            console.groupEnd();
        }
    }

    getLevelOverrides() {
        const raw = this.storageGetItem(this.levelOverrideStorageKey);
        if (!raw) return {};
        try {
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return {};
            return parsed;
        } catch (error) {
            console.warn('Failed to parse level overrides.', error);
            return {};
        }
    }

    saveLevelOverrides(overrides) {
        return this.storageSetItem(this.levelOverrideStorageKey, JSON.stringify(overrides || {}));
    }

    applyLevelOverrides(baseLevels) {
        const source = Array.isArray(baseLevels) ? baseLevels : [];
        const overrides = this.getLevelOverrides();
        return source.map((baseLevel, index) => {
            const override = overrides[index];
            if (!override) return { ...baseLevel, __isOverride: false };
            const sanitizedOverride = this.sanitizeLevel({ ...baseLevel, ...override }, index);
            if (!sanitizedOverride) return { ...baseLevel, __isOverride: false };
            return { ...sanitizedOverride, __isOverride: true };
        });
    }

    refreshLevelsFromOverrides() {
        this.levels = this.applyLevelOverrides(this.baseLevels);
        if (this.devManager && this.devManager.panel) {
            this.devManager.populateList();
        }
    }

    upsertLevelOverride(index, levelData) {
        const normalizedIndex = Number(index);
        if (!Number.isFinite(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= this.baseLevels.length) {
            return false;
        }
        const sanitized = this.sanitizeLevel(levelData, normalizedIndex);
        if (!sanitized) return false;
        const overrides = this.getLevelOverrides();
        overrides[normalizedIndex] = sanitized;
        if (!this.saveLevelOverrides(overrides)) return false;
        this.refreshLevelsFromOverrides();
        return true;
    }

    removeLevelOverride(index) {
        const normalizedIndex = Number(index);
        if (!Number.isFinite(normalizedIndex) || normalizedIndex < 0) return false;
        const overrides = this.getLevelOverrides();
        if (!Object.prototype.hasOwnProperty.call(overrides, normalizedIndex)) return true;
        delete overrides[normalizedIndex];
        if (!this.saveLevelOverrides(overrides)) return false;
        this.refreshLevelsFromOverrides();
        return true;
    }

    getLevelStarThresholds(levelData) {
        return this.normalizeStarThresholds(levelData?.starThresholds);
    }
}

class BeginnerMode {
    constructor(game) {
        this.game = game;
        this.app = game.app;
        this.currentLevelIndex = 0;
        this.movesRemaining = 0;
        this.targetPieces = 0;
        this.levelData = null;
        this.linesUsed = 0;
        this.maxLines = 0;
        this.lineHistory = [];
        this.redoLineHistory = [];
        this.controlsBound = false;
        this.lastResult = null;
        this.modeType = 'fun';
        this.levelFailCount = 0; // Safety Feature: Track frustration
        this.audioCtx = null;
        // Default gameplay to Grid Snap ON (grid lock enabled by default).
        this.gridFreeMode = false;
        this.gridToggleBound = false;
        this.optionsMenuReady = false;
        this.saveSlotCount = 3;
        this.activeSaveSlot = 1;
        this.starRatings = [];
        this.boxScoreReady = false;
        this.didAutoResume = false;
        this.autosaveTimer = null;
    }

    start() {
        console.log('[BeginnerMode] Starting Beginner Mode');
        this.bindGameControls();
        this.setupBoxScoreUI();

        if (!Array.isArray(this.game.levels) || this.game.levels.length === 0) {
            this.showMessage(
                'Level Data Missing',
                'No game levels were loaded. Please refresh the app and try again.',
                'Back to Menu',
                () => {
                    this.game.stop();
                }
            );
            return;
        }

        const resumed = this.tryAutoResume();
        if (!resumed) {
            this.loadLevel(0);
        }

        // NOTE: Tutorial is now shown by menu-fix.js for New Game flow
        // This code path handles auto-resume and direct calls to startMode('beginner')
        // Only show tutorial if:
        // 1. We're NOT resuming a saved game
        // 2. tutorial_seen flag is not set
        // 3. window.tutorial exists
        // 4. no explicit suppression flag is set by the caller (used by menu transition flow)
        const tutorialSeen = !!localStorage.getItem('tutorial_seen');
        const shouldShowTutorial = !resumed && window.tutorial && !tutorialSeen && !window.__suppressGameTutorialFallback;
        const shouldDeferGameplayMusicForExternalTutorial = !resumed && !tutorialSeen && !!window.__suppressGameTutorialFallback;
        if (shouldShowTutorial) {
            console.log('[BeginnerMode] Showing tutorial for new user (from game.js fallback)');
            // Use a longer delay to ensure DOM is ready on mobile
            setTimeout(() => {
                try {
                    if (window.tutorial && typeof window.tutorial.show === 'function') {
                        window.__allowTutorialToStartGame = true;
                        window.tutorial.show();
                        console.log('[BeginnerMode] Tutorial.show() called successfully');
                    }
                } catch (e) {
                    console.error('[BeginnerMode] Tutorial show failed:', e);
                }
            }, 250);
        } else if (!shouldDeferGameplayMusicForExternalTutorial && typeof window.startGameplayMusic === 'function') {
            window.startGameplayMusic({ fadeInMs: 2000 }).catch(() => { });
        }
    }

    isFunModeActive() {
        return this.game && this.game.currentMode === this && this.game.state === GameState.PLAYING;
    }

    getStorageAdapter() {
        if (window.SafeStorage && typeof window.SafeStorage.getItem === 'function') {
            return window.SafeStorage;
        }
        return window.localStorage;
    }

    storageGetItem(key) {
        try {
            return this.getStorageAdapter().getItem(key);
        } catch (error) {
            console.warn('Storage read failed for key:', key, error);
            return null;
        }
    }

    storageSetItem(key, value) {
        try {
            this.getStorageAdapter().setItem(key, value);
            return true;
        } catch (error) {
            console.warn('Storage write failed for key:', key, error);
            return false;
        }
    }

    storageRemoveItem(key) {
        try {
            this.getStorageAdapter().removeItem(key);
            return true;
        } catch (error) {
            console.warn('Storage remove failed for key:', key, error);
            return false;
        }
    }

    safeParseJSON(raw, label) {
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (error) {
            console.warn(`Failed to parse ${label}`, error);
            return null;
        }
    }

    sanitizeAppState(state) {
        if (!state || typeof state !== 'object') return null;
        const polygons = Array.isArray(state.polygons)
            ? state.polygons.map(poly => {
                const rawVertices = Array.isArray(poly?.vertices) ? poly.vertices : [];
                const vertices = rawVertices
                    .map(v => ({ x: Number(v?.x), y: Number(v?.y) }))
                    .filter(v => Number.isFinite(v.x) && Number.isFinite(v.y));
                if (vertices.length < 3) return null;
                return {
                    vertices,
                    color: typeof poly?.color === 'string' && poly.color ? poly.color : '#667eea',
                    name: typeof poly?.name === 'string' && poly.name ? poly.name : 'Polygon',
                    visible: poly?.visible !== false
                };
            }).filter(Boolean)
            : [];

        if (polygons.length === 0) return null;

        const pan = state.pan && Number.isFinite(Number(state.pan.x)) && Number.isFinite(Number(state.pan.y))
            ? { x: Number(state.pan.x), y: Number(state.pan.y) }
            : { x: 0, y: 0 };
        const zoom = Number(state.zoom);

        return {
            polygons,
            history: Array.isArray(state.history) ? [...state.history] : [],
            historyIndex: Number.isFinite(Number(state.historyIndex)) ? Number(state.historyIndex) : null,
            pan,
            zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 1
        };
    }

    sanitizeSlotData(slotData) {
        if (!slotData || typeof slotData !== 'object') return null;
        const appState = this.sanitizeAppState(slotData.appState);
        if (!appState) return null;
        const levelIndex = Number(slotData.levelIndex);
        const linesUsed = Number(slotData.linesUsed);

        return {
            version: Number.isFinite(Number(slotData.version)) ? Number(slotData.version) : 1,
            savedAt: Number.isFinite(Number(slotData.savedAt)) ? Number(slotData.savedAt) : null,
            autoSavedAt: Number.isFinite(Number(slotData.autoSavedAt)) ? Number(slotData.autoSavedAt) : null,
            levelIndex: Number.isFinite(levelIndex) ? Math.max(0, Math.floor(levelIndex)) : 0,
            linesUsed: Number.isFinite(linesUsed) ? Math.max(0, Math.floor(linesUsed)) : 0,
            lineHistory: Array.isArray(slotData.lineHistory) ? [...slotData.lineHistory] : [],
            redoLineHistory: Array.isArray(slotData.redoLineHistory) ? [...slotData.redoLineHistory] : [],
            gridFreeMode: !!slotData.gridFreeMode,
            stars: this.normalizeStars(slotData.stars),
            appState,
            lastResult: slotData.lastResult || null
        };
    }

    getSlotKey(slot) {
        return `polygonFunSaveSlot${slot}`;
    }

    getStarKey(slot) {
        return `polygonFunStarsSlot${slot}`;
    }

    getActiveSaveSlot() {
        const stored = parseInt(this.storageGetItem('polygonFunActiveSlot'), 10);
        if (!Number.isFinite(stored) || stored < 1 || stored > this.saveSlotCount) {
            return 1;
        }
        return stored;
    }

    setActiveSaveSlot(slot) {
        const normalized = Math.min(this.saveSlotCount, Math.max(1, slot));
        this.activeSaveSlot = normalized;
        this.storageSetItem('polygonFunActiveSlot', `${normalized}`);
        this.starRatings = this.getSlotStars(normalized);
        this.refreshBoxScoreUI();
    }

    createEmptyStars() {
        const length = this.game && Array.isArray(this.game.levels)
            ? this.game.levels.length
            : 30;
        return Array.from({ length }, () => 0);
    }

    getSlotMeta(slot) {
        const slotData = this.getSlotData(slot);
        const stars = this.getSlotStars(slot);
        const totalStars = stars.reduce((sum, value) => sum + value, 0);
        const maxStars = stars.length * 3;
        const completion = maxStars > 0 ? Math.min(100, Math.round((totalStars / maxStars) * 100)) : 0;
        const hasSave = !!slotData?.appState;
        const savedAt = slotData?.savedAt ? new Date(slotData.savedAt) : null;
        const levelIndex = Number.isFinite(slotData?.levelIndex) ? slotData.levelIndex : -1;
        const lastPlayedLabel = levelIndex >= 0 ? `Level ${levelIndex + 1}` : '—';
        const autoSaveTime = slotData?.autoSavedAt ? new Date(slotData.autoSavedAt) : null;
        return {
            slotData,
            stars,
            totalStars,
            maxStars,
            completion,
            hasSave,
            savedAt,
            autoSaveTime,
            lastPlayedLabel,
            levelIndex
        };
    }

    formatRelativeTime(dateValue) {
        if (!dateValue) return '—';
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
        if (!Number.isFinite(date.getTime())) return '—';
        const diff = Date.now() - date.getTime();
        if (diff < 60000) return 'just now';
        const minutes = Math.round(diff / 60000);
        if (minutes < 60) return `${minutes} min ago`;
        const hours = Math.round(minutes / 60);
        if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
        const days = Math.round(hours / 24);
        if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
        return date.toLocaleDateString();
    }

    getSaveStatusForSlot(slot) {
        const meta = this.getSlotMeta(slot);
        if (!meta.hasSave) {
            return {
                label: 'Empty',
                detail: 'No save yet',
                tone: 'empty'
            };
        }
        if (slot === this.activeSaveSlot) {
            const autosaveLabel = meta.autoSaveTime ? this.formatRelativeTime(meta.autoSaveTime) : 'Autosave ready';
            return {
                label: 'Active',
                detail: `Autosave ${autosaveLabel}`,
                tone: 'active'
            };
        }
        return {
            label: 'Saved',
            detail: meta.savedAt ? `Manual save ${this.formatRelativeTime(meta.savedAt)}` : 'Manual save ready',
            tone: 'saved'
        };
    }

    normalizeStars(stars) {
        const normalized = Array.isArray(stars) ? [...stars] : [];
        const targetLength = this.game && Array.isArray(this.game.levels)
            ? this.game.levels.length
            : 30;
        while (normalized.length < targetLength) {
            normalized.push(0);
        }
        return normalized.slice(0, targetLength).map(value => {
            if (!Number.isFinite(value)) return 0;
            return Math.max(0, Math.min(3, Math.round(value)));
        });
    }

    getSlotData(slot) {
        const key = this.getSlotKey(slot);
        const raw = this.storageGetItem(key);
        if (!raw) return null;
        const parsed = this.safeParseJSON(raw, `save slot ${slot}`);
        const sanitized = this.sanitizeSlotData(parsed);
        if (!sanitized) {
            console.warn(`Discarding invalid/corrupt save slot ${slot}`);
            return null;
        }
        return sanitized;
    }

    getStoredStars(slot) {
        const key = this.getStarKey(slot);
        const raw = this.storageGetItem(key);
        if (!raw) return null;
        const parsed = this.safeParseJSON(raw, `stars slot ${slot}`);
        return Array.isArray(parsed) ? parsed : null;
    }

    getSlotStars(slot) {
        const slotData = this.getSlotData(slot);
        const slotStars = Array.isArray(slotData?.stars) ? slotData.stars : null;
        const storedStars = this.getStoredStars(slot);
        const sources = [storedStars, slotStars].filter(Boolean).map(stars => this.normalizeStars(stars));
        if (sources.length === 0) {
            return this.createEmptyStars();
        }
        const merged = [...sources[0]];
        for (let i = 1; i < sources.length; i++) {
            sources[i].forEach((value, index) => {
                merged[index] = Math.max(merged[index] || 0, value || 0);
            });
        }
        return this.normalizeStars(merged);
    }

    saveSlotData(slot, data) {
        const key = this.getSlotKey(slot);
        return this.storageSetItem(key, JSON.stringify(data));
    }

    saveStars(slot, stars) {
        const key = this.getStarKey(slot);
        return this.storageSetItem(key, JSON.stringify(this.normalizeStars(stars)));
    }

    captureAppState() {
        if (!this.app) return null;
        return {
            polygons: this.app.polygons.map(p => ({
                vertices: p.vertices.map(v => ({ x: v.x, y: v.y })),
                color: p.color,
                name: p.name,
                visible: p.visible
            })),
            history: Array.isArray(this.app.history) ? [...this.app.history] : [],
            historyIndex: this.app.historyIndex,
            pan: this.app.pan ? { ...this.app.pan } : { x: 0, y: 0 },
            zoom: this.app.zoom || 1
        };
    }

    applyAppState(state) {
        if (!this.app || !state) return false;
        const safeState = this.sanitizeAppState(state);
        if (!safeState) {
            return false;
        }

        this.app.polygons = safeState.polygons.map(p => {
            const poly = new Polygon(p.vertices || [], p.color || '#667eea');
            poly.name = p.name || 'Polygon';
            poly.visible = p.visible !== false;
            return poly;
        }).filter(p => p.vertices.length >= 3);

        this.app.history = Array.isArray(safeState.history) ? [...safeState.history] : [];
        if (Number.isFinite(safeState.historyIndex)) {
            this.app.historyIndex = Math.max(-1, Math.min(this.app.history.length - 1, safeState.historyIndex));
        } else {
            this.app.historyIndex = this.app.history.length - 1;
        }

        if (safeState.pan && Number.isFinite(safeState.pan.x) && Number.isFinite(safeState.pan.y)) {
            this.app.pan = { x: safeState.pan.x, y: safeState.pan.y };
        }
        if (Number.isFinite(safeState.zoom)) {
            this.app.zoom = safeState.zoom;
        }

        this.app.selectedPolygon = null;
        this.app.selectedVertex = null;
        this.app.updateLayers();
        this.app.render(true);
        return true;
    }

    tryAutoResume() {
        this.setActiveSaveSlot(this.getActiveSaveSlot());
        const slotData = this.getSlotData(this.activeSaveSlot);

        if (slotData && slotData.appState && Number.isFinite(slotData.levelIndex)) {
            const restored = this.restoreFromSlotData(slotData);
            if (restored) {
                this.didAutoResume = true;
                if (this.app && typeof this.app.showToast === 'function') {
                    this.app.showToast(`Loaded Save Slot ${this.activeSaveSlot}`);
                }
                return true;
            }
        }
        return false;
    }

    shouldConfirmLoad(slot) {
        if (!this.isFunModeActive()) return false;
        const currentSlotData = this.getSlotData(this.activeSaveSlot);
        if (!currentSlotData?.appState) return false;
        return slot !== this.activeSaveSlot;
    }

    shouldConfirmOverwrite(slot) {
        if (!this.isFunModeActive()) return false;
        const slotData = this.getSlotData(slot);
        return !!slotData?.appState;
    }

    updateBoxScoreHeaderMeta() {
        const activeSlotEl = document.getElementById('boxScoreActiveSlot');
        const saveTypeEl = document.getElementById('boxScoreSaveType');
        const lastSaveEl = document.getElementById('boxScoreLastSave');
        if (!activeSlotEl || !saveTypeEl || !lastSaveEl) return;
        const meta = this.getSlotMeta(this.activeSaveSlot);
        activeSlotEl.textContent = `Active Slot: ${this.activeSaveSlot}`;
        if (meta.hasSave) {
            const autosaveLabel = meta.autoSaveTime ? this.formatRelativeTime(meta.autoSaveTime) : 'Autosave ready';
            saveTypeEl.textContent = meta.autoSaveTime ? 'Autosaved' : 'Manual Save';
            lastSaveEl.textContent = meta.savedAt
                ? `Last save: ${this.formatRelativeTime(meta.savedAt)}`
                : `Autosave: ${autosaveLabel}`;
        } else {
            saveTypeEl.textContent = 'Empty Slot';
            lastSaveEl.textContent = 'Last save: --';
        }
    }

    restoreFromSlotData(slotData) {
        const safeSlotData = this.sanitizeSlotData(slotData);
        if (!safeSlotData || !this.game || !Array.isArray(this.game.levels)) {
            return false;
        }

        const levelIndex = Math.min(
            this.game.levels.length - 1,
            Math.max(0, Number(safeSlotData.levelIndex || 0))
        );

        this.currentLevelIndex = levelIndex;
        this.levelData = this.game.levels[levelIndex];
        if (!this.levelData) {
            return false;
        }

        this.linesUsed = Number(safeSlotData.linesUsed || 0);
        this.lineHistory = Array.isArray(safeSlotData.lineHistory) ? [...safeSlotData.lineHistory] : [];
        this.redoLineHistory = Array.isArray(safeSlotData.redoLineHistory) ? [...safeSlotData.redoLineHistory] : [];
        this.maxLines = this.levelData.maxLines || 99;
        this.targetPieces = this.levelData.targetPieces;
        this.lastResult = null;
        this.hideResultsOverlay();
        this.hideSkipButton();

        this.gridFreeMode = !!safeSlotData.gridFreeMode;
        this.app.gridSnap = !this.gridFreeMode;

        const restored = this.applyAppState(safeSlotData.appState);
        if (!restored) {
            this.setupLevel();
        }

        this.app.setTool('split');
        this.app.splitMode = true;
        this.app.splitStep = 1;
        this.app.splitLineStart = null;
        this.app.splitLineEnd = null;

        this.updateHUD();
        this.updateGameControlButtons();
        return true;
    }

    saveSlot(slot, silent = false, starsOverride = null) {
        if (!this.app || !this.isFunModeActive()) return;
        const normalizedSlot = Math.min(this.saveSlotCount, Math.max(1, slot));
        const existing = this.getSlotData(normalizedSlot) || {};
        const storedStars = this.getSlotStars(normalizedSlot);
        const sourceStars = Array.isArray(starsOverride) ? starsOverride : this.starRatings;
        const currentStars = this.normalizeStars(sourceStars.length ? sourceStars : storedStars);
        const mergedStars = currentStars.map((value, index) => {
            const stored = storedStars[index] || 0;
            return Math.max(value, stored);
        });
        const payload = {
            version: 1,
            savedAt: Date.now(),
            autoSavedAt: existing.autoSavedAt || null,
            levelIndex: this.currentLevelIndex,
            linesUsed: this.linesUsed,
            lineHistory: Array.isArray(this.lineHistory) ? [...this.lineHistory] : [],
            redoLineHistory: Array.isArray(this.redoLineHistory) ? [...this.redoLineHistory] : [],
            gridFreeMode: this.gridFreeMode,
            stars: mergedStars,
            appState: this.captureAppState(),
            lastResult: existing.lastResult || null
        };
        const saveOk = this.saveSlotData(normalizedSlot, payload);
        const starsOk = this.saveStars(normalizedSlot, mergedStars);
        if (!saveOk || !starsOk) {
            if (this.app && typeof this.app.showToast === 'function') {
                this.app.showToast('Save failed. Storage may be unavailable.', true);
            }
            return;
        }
        this.starRatings = mergedStars;
        if (!silent && this.app && typeof this.app.showToast === 'function') {
            this.app.showToast(`Saved to Slot ${normalizedSlot}`);
        }
        this.refreshBoxScoreUI();
    }

    autoSaveSlot(slot) {
        if (!this.app || !this.isFunModeActive()) return;
        const normalizedSlot = Math.min(this.saveSlotCount, Math.max(1, slot));
        const existing = this.getSlotData(normalizedSlot) || {};
        const storedStars = this.getSlotStars(normalizedSlot);
        const sourceStars = this.starRatings.length ? this.starRatings : storedStars;
        const mergedStars = this.normalizeStars(sourceStars).map((value, index) => {
            const stored = storedStars[index] || 0;
            return Math.max(value, stored);
        });
        const payload = {
            version: 1,
            savedAt: existing.savedAt || null,
            autoSavedAt: Date.now(),
            levelIndex: this.currentLevelIndex,
            linesUsed: this.linesUsed,
            lineHistory: Array.isArray(this.lineHistory) ? [...this.lineHistory] : [],
            redoLineHistory: Array.isArray(this.redoLineHistory) ? [...this.redoLineHistory] : [],
            gridFreeMode: this.gridFreeMode,
            stars: mergedStars,
            appState: this.captureAppState(),
            lastResult: existing.lastResult || null
        };
        const saveOk = this.saveSlotData(normalizedSlot, payload);
        const starsOk = this.saveStars(normalizedSlot, mergedStars);
        if (!saveOk || !starsOk) {
            return;
        }
        this.starRatings = mergedStars;
        this.refreshBoxScoreUI();
        this.updateHUD();
    }

    async loadSlot(slot) {
        const normalizedSlot = Math.min(this.saveSlotCount, Math.max(1, slot));
        const slotData = this.getSlotData(normalizedSlot);
        if (!slotData) {
            if (this.app && typeof this.app.showToast === 'function') {
                this.app.showToast(`Slot ${normalizedSlot} is empty.`, true);
            }
            return;
        }

        if (this.shouldConfirmLoad(normalizedSlot)) {
            const confirmMessage = `Load Slot ${normalizedSlot}? Your current session will be replaced.`;
            if (!(await window.appConfirm(confirmMessage, { title: 'Load Game', confirmText: 'Load' }))) {
                return;
            }
        }

        if (this.game.state !== GameState.PLAYING) {
            this.game.startMode('beginner');
        }

        this.setActiveSaveSlot(normalizedSlot);
        this.starRatings = this.getSlotStars(normalizedSlot);
        const restored = this.restoreFromSlotData(slotData);
        if (!restored) {
            if (this.app && typeof this.app.showToast === 'function') {
                this.app.showToast(`Slot ${normalizedSlot} is invalid or corrupted.`, true);
            }
            return;
        }

        if (this.app && typeof this.app.showToast === 'function') {
            this.app.showToast(`Loaded Slot ${normalizedSlot}`);
        }
        if (typeof window.startGameplayMusic === 'function') {
            window.startGameplayMusic({ fadeInMs: 1100 }).catch(() => { });
        }
        this.refreshBoxScoreUI();
    }

    clearSlot(slot) {
        const normalizedSlot = Math.min(this.saveSlotCount, Math.max(1, slot));
        this.storageRemoveItem(this.getSlotKey(normalizedSlot));
        this.storageRemoveItem(this.getStarKey(normalizedSlot));
        this.storageRemoveItem(this.getSolutionKey(normalizedSlot));
        if (normalizedSlot === this.activeSaveSlot) {
            this.starRatings = this.getSlotStars(normalizedSlot);
        }
        if (this.app && typeof this.app.showToast === 'function') {
            this.app.showToast(`Cleared Slot ${normalizedSlot}`);
        }
        this.refreshBoxScoreUI();
    }

    autosaveProgress() {
        if (!this.isFunModeActive()) return;
        if (this.starRatings.length === 0) {
            this.starRatings = this.getSlotStars(this.activeSaveSlot);
        }

        // Debounce localStorage writes to reduce micro-stutter during rapid actions.
        if (this.autosaveTimer) {
            clearTimeout(this.autosaveTimer);
        }
        this.autosaveTimer = setTimeout(() => {
            this.autosaveTimer = null;
            if (!this.isFunModeActive()) return;
            this.autoSaveSlot(this.activeSaveSlot);
        }, 120);
    }

    getSolutionKey(slot) {
        return `polygonFunSolutionsSlot${slot}`;
    }

    sanitizeSolutionEntry(solution) {
        if (!solution || typeof solution !== 'object') return null;

        const pieces = Array.isArray(solution.pieces)
            ? solution.pieces.map(piece => {
                const vertices = Array.isArray(piece?.vertices)
                    ? piece.vertices
                        .map(v => ({ x: Number(v?.x), y: Number(v?.y) }))
                        .filter(v => Number.isFinite(v.x) && Number.isFinite(v.y))
                    : [];

                if (vertices.length < 3) return null;

                return {
                    vertices,
                    color: (typeof piece?.color === 'string' && piece.color) ? piece.color : '#667eea'
                };
            }).filter(Boolean)
            : [];

        if (!pieces.length) return null;

        const rawPercents = Array.isArray(solution.percents) ? solution.percents : [];
        const percents = rawPercents
            .map(value => Number(value))
            .filter(value => Number.isFinite(value));

        const bestStars = Number(solution.bestStars);

        return {
            pieces,
            percents,
            coins: Number.isFinite(Number(solution.coins)) ? Math.max(0, Number(solution.coins)) : 0,
            bestStars: Number.isFinite(bestStars) ? Math.max(0, Math.min(3, Math.floor(bestStars))) : 0,
            timestamp: Number.isFinite(Number(solution.timestamp)) ? Number(solution.timestamp) : Date.now()
        };
    }

    saveLevelResult(slot, levelIndex, result, stars = 0) {
        if (!result || !result.pieces) return;

        const normalizedStars = Math.max(0, Math.min(3, Number(stars) || 0));

        // Serialize minimal data needed for preview
        const serializablePieces = result.pieces.map(p => ({
            vertices: p.vertices.map(v => ({ x: v.x, y: v.y })), // Ensure plain objects
            color: p.color
        }));

        const data = {
            pieces: serializablePieces,
            percents: result.piecePercents || [],
            coins: result.coins || 0,
            bestStars: normalizedStars,
            timestamp: Date.now()
        };

        const key = this.getSolutionKey(slot);
        let allSolutions = {};
        const raw = this.storageGetItem(key);
        const parsed = this.safeParseJSON(raw, `solutions slot ${slot}`);
        if (parsed && typeof parsed === 'object') {
            allSolutions = parsed;
        }

        const existing = this.sanitizeSolutionEntry(allSolutions[levelIndex]);

        // Never overwrite a stored preview with a lower score.
        if (existing && existing.bestStars > normalizedStars) {
            return;
        }

        // If stars tie, keep existing to preserve the originally-earned best preview.
        if (existing && existing.bestStars === normalizedStars) {
            return;
        }

        allSolutions[levelIndex] = data;
        this.storageSetItem(key, JSON.stringify(allSolutions));
    }

    getLevelSolution(slot, levelIndex) {
        const key = this.getSolutionKey(slot);
        const raw = this.storageGetItem(key);
        const all = this.safeParseJSON(raw, `solutions slot ${slot}`);
        if (!all || typeof all !== 'object') return null;

        const sanitized = this.sanitizeSolutionEntry(all[levelIndex]);
        if (!sanitized) return null;

        return sanitized;
    }

    recordStarRating(stars, resultData = null) {
        const normalizedStars = Math.max(0, Math.min(3, Number(stars) || 0));
        const levelIndex = this.currentLevelIndex;
        if (!Number.isFinite(levelIndex)) return;

        if (this.starRatings.length === 0) {
            this.starRatings = this.createEmptyStars();
        }

        const previous = this.starRatings[levelIndex] || 0;

        // Save stars if better
        if (normalizedStars > previous) {
            this.starRatings[levelIndex] = normalizedStars;
            this.saveStars(this.activeSaveSlot, this.starRatings);
        }

        // Save preview only when the score is strictly better than previous best.
        // This guarantees each level keeps the highest-score preview image only.
        if (resultData && normalizedStars > 0 && normalizedStars > previous) {
            this.saveLevelResult(this.activeSaveSlot, levelIndex, resultData, normalizedStars);
        }

        this.refreshBoxScoreUI();
        this.updateHUD();
    }

    setupBoxScoreUI() {
        if (this.boxScoreReady) return;
        const overlay = document.getElementById('boxScoreOverlay');
        const closeBtn = document.getElementById('boxScoreClose');

        if (!overlay || !closeBtn) return;

        closeBtn.addEventListener('click', () => this.closeBoxScore());
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                this.closeBoxScore();
            }
        });

        // Setup Save/Load UI as well
        this.setupSaveLoadUI();

        this.boxScoreReady = true;
    }

    setupSaveLoadUI() {
        // Create the overlay if it doesn't exist
        if (!document.getElementById('saveLoadOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'saveLoadOverlay';
            overlay.className = 'overlay';
            overlay.setAttribute('aria-hidden', 'true');
            overlay.style.cssText = `
                display: none;
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(4, 8, 20, 0.85); backdrop-filter: blur(8px);
                z-index: 9999; justify-content: center; align-items: center;
            `;

            overlay.innerHTML = `
                <div class="panel-container" style="background: #0e1a35; border-radius: 20px; width: 95%; max-width: 500px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid rgba(100,140,255,0.18);">
                    <div class="panel-header" style="padding: 20px 24px; border-bottom: 1px solid rgba(100,140,255,0.12); display: flex; justify-content: space-between; align-items: center; background: rgba(15,25,50,0.9); color: #e0e8ff;">
                        <h2 style="margin: 0; font-size: 20px; font-weight: 700; font-family: 'Inter', sans-serif;">Save / Load Game</h2>
                        <button id="saveLoadClose" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #7b8bb5; padding: 4px;">&times;</button>
                    </div>
                    
                    <div class="panel-content" style="padding: 24px; overflow-y: auto;">
                        <div class="panel-meta" style="margin-bottom: 20px; text-align: center; color: #7b8bb5; background: rgba(20,35,70,0.5); padding: 12px; border-radius: 12px; font-size: 14px; border: 1px solid rgba(100,140,255,0.1);">
                            <div id="saveLoadActiveSlot" style="font-weight: 600; color: #b0c4ff; margin-bottom: 4px;">Active Slot: --</div>
                            <div id="saveLoadLastSave">Last save: --</div>
                        </div>

                        <div id="saveLoadSlots" style="display: flex; flex-direction: column; gap: 12px;">
                            <!-- Slots injected here -->
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            // CSS for slots (reused logic from box score but scoped)
            const style = document.createElement('style');
            style.textContent = `
                .sl-slot {
                    border: 2px solid rgba(100,140,255,0.18); border-radius: 12px; padding: 16px;
                    transition: all 0.2s; cursor: pointer; position: relative;
                    background: rgba(15,25,50,0.5);
                }
                .sl-slot:hover { border-color: rgba(100,140,255,0.3); transform: translateY(-1px); }
                .sl-slot.active { border-color: #4a7cff; background: rgba(25,45,90,0.6); }
                .sl-slot.active::before {
                    content: 'Active'; position: absolute; top: -10px; right: 10px;
                    background: #4a7cff; color: white; font-size: 10px; font-weight: 700;
                    padding: 2px 8px; border-radius: 10px;
                }
                .sl-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
                .sl-title { font-weight: 700; color: #e0e8ff; }
                .sl-status { font-size: 12px; font-weight: 600; }
                .sl-details { font-size: 13px; color: #7b8bb5; margin-bottom: 12px; display: flex; gap: 10px; }
                .sl-actions { display: flex; gap: 8px; margin-top: 12px; }
                .sl-actions button {
                    flex: 1; padding: 8px; border-radius: 8px; border: 1px solid rgba(100,140,255,0.18);
                    background: rgba(20,35,70,0.7); font-weight: 600; font-size: 13px; cursor: pointer;
                    transition: all 0.2s; color: #b0c4ff;
                }
                .sl-actions button:hover:not(:disabled) { background: rgba(30,50,90,0.8); }
                .sl-actions button:disabled { opacity: 0.3; cursor: not-allowed; }
                .sl-actions button.primary { background: linear-gradient(135deg, #2244aa, #1a3388); color: white; border-color: rgba(74,124,255,0.3); }
                .sl-actions button.primary:hover:not(:disabled) { background: linear-gradient(135deg, #2a55cc, #203e99); }
                .sl-actions button.danger { color: #f87171; border-color: rgba(248,113,113,0.2); }
                .sl-actions button.danger:hover:not(:disabled) { background: rgba(40,15,15,0.5); }
            `;
            document.head.appendChild(style);
        }

        const overlay = document.getElementById('saveLoadOverlay');
        const closeBtn = document.getElementById('saveLoadClose');

        if (closeBtn) {
            closeBtn.onclick = () => this.closeSaveLoadPanel();
        }
        if (overlay) {
            overlay.onclick = (e) => {
                if (e.target === overlay) this.closeSaveLoadPanel();
            };
        }
    }

    setupOptionsMenuUI() {
        if (this.optionsMenuReady) return;

        let overlay = document.getElementById('gameOptionsOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'gameOptionsOverlay';
            overlay.className = 'overlay';
            overlay.setAttribute('aria-hidden', 'true');
            overlay.style.cssText = `
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(4, 8, 20, 0.75);
                backdrop-filter: blur(6px);
                z-index: 9998;
                justify-content: center;
                align-items: center;
            `;

            overlay.innerHTML = `
                <div style="background: #0e1a35; border-radius: 20px; width: min(92vw, 360px); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); overflow: hidden; border: 1px solid rgba(100,140,255,0.18);">
                    <div style="padding: 18px 20px; border-bottom: 1px solid rgba(100,140,255,0.12); display: flex; align-items: center; justify-content: space-between;">
                        <h3 style="margin: 0; font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 700; color: #e0e8ff;">Options</h3>
                        <button id="gameOptionsClose" style="background: none; border: none; color: #7b8bb5; font-size: 24px; cursor: pointer; line-height: 1;">&times;</button>
                    </div>
                    <div style="padding: 16px; display: grid; gap: 10px;">
                        <button id="gameOptionsMenuBtn" style="padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(100,140,255,0.18); background: rgba(20,35,70,0.7); color: #e0e8ff; font-weight: 700; font-family: 'Inter', sans-serif; cursor: pointer; text-align: left;">🏠 Menu</button>
                        <button id="gameOptionsSaveLoadBtn" style="padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(100,140,255,0.18); background: rgba(20,35,70,0.7); color: #e0e8ff; font-weight: 700; font-family: 'Inter', sans-serif; cursor: pointer; text-align: left;">💾 Save / Load</button>
                        <button id="gameOptionsSettingsBtn" style="padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(100,140,255,0.18); background: rgba(20,35,70,0.7); color: #e0e8ff; font-weight: 700; font-family: 'Inter', sans-serif; cursor: pointer; text-align: left;">⚙️ Settings</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
        }

        const closeBtn = document.getElementById('gameOptionsClose');
        const menuBtn = document.getElementById('gameOptionsMenuBtn');
        const saveLoadBtn = document.getElementById('gameOptionsSaveLoadBtn');
        const settingsBtn = document.getElementById('gameOptionsSettingsBtn');

        if (closeBtn) {
            closeBtn.onclick = () => this.closeOptionsMenu();
        }

        if (overlay) {
            overlay.onclick = (event) => {
                if (event.target === overlay) {
                    this.closeOptionsMenu();
                }
            };
        }

        if (menuBtn) {
            menuBtn.onclick = async () => {
                this.closeOptionsMenu();
                if (await window.appConfirm('Return to Main Menu? Progress will be lost.', { title: 'Exit Game', confirmText: 'Exit' })) {
                    this.game.stop();
                }
            };
        }

        if (saveLoadBtn) {
            saveLoadBtn.onclick = () => {
                this.closeOptionsMenu();
                this.openSaveLoadPanel();
            };
        }

        if (settingsBtn) {
            settingsBtn.onclick = () => {
                this.closeOptionsMenu();
                this.openSettingsPanel();
            };
        }

        this.optionsMenuReady = true;
    }

    setupSettingsUI() {
        if (document.getElementById('gameSettingsOverlay')) return;

        // Inject Styles for Custom Sliders
        if (!document.getElementById('settings-slider-style')) {
            const style = document.createElement('style');
            style.id = 'settings-slider-style';
            style.textContent = `
                .aaa-slider-container {
                    position: relative;
                    width: 100%;
                    height: 24px;
                    display: flex;
                    align-items: center;
                }
                .aaa-slider {
                    -webkit-appearance: none;
                    width: 100%;
                    height: 6px;
                    border-radius: 3px;
                    background: rgba(30, 45, 80, 0.8);
                    outline: none;
                    margin: 0;
                    cursor: pointer;
                    position: relative;
                    z-index: 2;
                }
                .aaa-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #4a7cff;
                    box-shadow: 0 2px 6px rgba(74,124,255,0.4);
                    cursor: pointer;
                    transition: transform 0.1s;
                    margin-top: -7px; /* (6px - 20px) / 2 */
                }
                .aaa-slider::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                }
                .aaa-slider::-webkit-slider-thumb:active {
                    transform: scale(0.95);
                    background: #3b6ef5;
                }
                /* Fill Track Hack for WebKit */
                .aaa-slider-fill {
                    position: absolute;
                    top: 50%;
                    left: 0;
                    height: 6px;
                    background: #4a7cff;
                    border-radius: 3px;
                    transform: translateY(-50%);
                    pointer-events: none;
                    z-index: 1;
                }
            `;
            document.head.appendChild(style);
        }

        const overlay = document.createElement('div');
        overlay.id = 'gameSettingsOverlay';
        overlay.className = 'overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.style.cssText = `
            display: none;
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(4, 8, 20, 0.85); backdrop-filter: blur(8px);
            z-index: 10000; justify-content: center; align-items: center;
        `;

        overlay.innerHTML = `
            <div style="background: #0e1a35; border-radius: 24px; width: 90%; max-width: 400px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); overflow: hidden; transform: scale(0.95); transition: transform 0.2s; border: 1px solid rgba(100,140,255,0.18);">
                <div style="padding: 20px 24px; border-bottom: 1px solid rgba(100,140,255,0.12); display: flex; justify-content: space-between; align-items: center; background: rgba(15,25,50,0.9);">
                    <h3 style="margin: 0; font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 700; color: #e0e8ff;">Settings</h3>
                    <button id="gameSettingsClose" style="background: rgba(25,40,70,0.8); border: none; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; color: #7b8bb5; display: flex; align-items: center; justify-content: center; transition: background 0.2s;">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <div style="padding: 24px; display: grid; gap: 24px;">
                    <!-- Music Control -->
                    <div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center;">
                            <span style="font-weight: 600; color: #b0c4ff; font-size: 15px;">Music</span>
                            <span id="gameSettingsMusicVal" style="font-weight: 700; color: #4a7cff; font-size: 14px;">70%</span>
                        </div>
                        <div class="aaa-slider-container">
                            <div id="gameSettingsMusicFill" class="aaa-slider-fill" style="width: 70%"></div>
                            <input id="gameSettingsMusic" class="aaa-slider" type="range" min="0" max="100" step="1" />
                        </div>
                    </div>

                    <!-- SFX Control -->
                    <div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center;">
                            <span style="font-weight: 600; color: #b0c4ff; font-size: 15px;">Sound Effects</span>
                            <span id="gameSettingsSfxVal" style="font-weight: 700; color: #4a7cff; font-size: 14px;">75%</span>
                        </div>
                        <div class="aaa-slider-container">
                            <div id="gameSettingsSfxFill" class="aaa-slider-fill" style="width: 75%"></div>
                            <input id="gameSettingsSfx" class="aaa-slider" type="range" min="0" max="100" step="1" />
                        </div>
                    </div>

                    <!-- Mute Toggle -->
                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(20,35,70,0.7); border-radius: 12px; cursor: pointer; user-select: none; border: 1px solid rgba(100,140,255,0.12);">
                        <span style="font-weight: 600; color: #b0c4ff; font-size: 15px; display: flex; align-items: center; gap: 10px;">
                            <span id="muteAudioIcon" style="font-size: 18px;">🔊</span> Mute Audio
                        </span>
                        <div style="position: relative; width: 44px; height: 24px;">
                            <input id="gameSettingsMute" type="checkbox" style="opacity: 0; width: 0; height: 0;" />
                            <span class="mute-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(40,55,90,0.8); transition: .4s; border-radius: 24px;"></span>
                            <span class="mute-knob" style="position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: #b0c4ff; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                        </div>
                        <style>
                            input:checked + .mute-slider { background-color: #4a7cff; }
                            input:checked + .mute-slider + .mute-knob { transform: translateX(20px); }
                        </style>
                    </label>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Bind Events
        const closeBtn = document.getElementById('gameSettingsClose');
        const musicInput = document.getElementById('gameSettingsMusic');
        const sfxInput = document.getElementById('gameSettingsSfx');
        const muteInput = document.getElementById('gameSettingsMute');

        const closePanel = () => {
            overlay.style.display = 'none';
            overlay.setAttribute('aria-hidden', 'true');
        };

        closeBtn.onclick = closePanel;
        overlay.onclick = (e) => {
            if (e.target === overlay) closePanel();
        };

        // Real-time Music
        musicInput.addEventListener('input', () => {
            const val = Number(musicInput.value);
            document.getElementById('gameSettingsMusicVal').textContent = `${val}%`;
            document.getElementById('gameSettingsMusicFill').style.width = `${val}%`;
            if (window.setMusicVolume) window.setMusicVolume(val / 100);
        });

        // Real-time SFX
        sfxInput.addEventListener('input', () => {
            const val = Number(sfxInput.value);
            document.getElementById('gameSettingsSfxVal').textContent = `${val}%`;
            document.getElementById('gameSettingsSfxFill').style.width = `${val}%`;
            if (window.setSfxVolume) window.setSfxVolume(val / 100);
        });

        // Preview SFX on change
        sfxInput.addEventListener('change', () => {
            // Play a test blip when releasing the slider if not muted
            if (!muteInput.checked && window.playSfx) {
                // Try to find a click or interact sound
                // window.playSfx('...', { volume: 1 });
            }
        });

        // Mute
        muteInput.addEventListener('change', () => {
            const muted = muteInput.checked;
            if (window.setAudioMuted) window.setAudioMuted(muted);

            // Update mute icon based on state
            const muteIcon = document.getElementById('muteAudioIcon');
            if (muteIcon) {
                muteIcon.textContent = muted ? '🔇' : '🔊';
            }

            // Visual feedback immediate
            musicInput.disabled = muted;
            sfxInput.disabled = muted;
            overlay.style.filter = muted ? 'grayscale(0.1)' : 'none';
        });

        // Listen for external updates (e.g. storage load)
        window.addEventListener('audio-settings-changed', (e) => {
            this.syncSettingsUI();
        });
    }

    syncSettingsUI() {
        if (!document.getElementById('gameSettingsOverlay')) return;

        const settings = (typeof window.getAudioSettings === 'function')
            ? window.getAudioSettings()
            : { musicVolume: 0.7, sfxVolume: 0.75, muted: false };

        const musicInput = document.getElementById('gameSettingsMusic');
        const sfxInput = document.getElementById('gameSettingsSfx');
        const muteInput = document.getElementById('gameSettingsMute');

        if (!musicInput || !sfxInput || !muteInput) return;

        // Music
        const musicVal = Math.round(settings.musicVolume * 100);
        if (document.activeElement !== musicInput) {
            musicInput.value = musicVal;
            document.getElementById('gameSettingsMusicVal').textContent = `${musicVal}%`;
            document.getElementById('gameSettingsMusicFill').style.width = `${musicVal}%`;
        }

        // SFX
        const sfxVal = Math.round(settings.sfxVolume * 100);
        if (document.activeElement !== sfxInput) {
            sfxInput.value = sfxVal;
            document.getElementById('gameSettingsSfxVal').textContent = `${sfxVal}%`;
            document.getElementById('gameSettingsSfxFill').style.width = `${sfxVal}%`;
        }

        // Mute
        muteInput.checked = !!settings.muted;
        musicInput.disabled = !!settings.muted;
        sfxInput.disabled = !!settings.muted;

        // Update mute icon based on state
        const muteIcon = document.getElementById('muteAudioIcon');
        if (muteIcon) {
            muteIcon.textContent = settings.muted ? '🔇' : '🔊';
        }
    }

    openSettingsPanel() {
        this.setupSettingsUI();
        this.syncSettingsUI();
        const overlay = document.getElementById('gameSettingsOverlay');
        if (!overlay) return;
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
    }

    closeSettingsPanel() {
        const overlay = document.getElementById('gameSettingsOverlay');
        if (!overlay) return;
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    }

    openOptionsMenu() {
        this.setupOptionsMenuUI();
        const overlay = document.getElementById('gameOptionsOverlay');
        if (!overlay) return;
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
    }

    closeOptionsMenu() {
        const overlay = document.getElementById('gameOptionsOverlay');
        if (!overlay) return;
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    }

    openSaveLoadPanel() {
        const overlay = document.getElementById('saveLoadOverlay');
        if (!overlay) return;
        this.refreshSaveLoadUI();
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
    }

    closeSaveLoadPanel() {
        const overlay = document.getElementById('saveLoadOverlay');
        if (!overlay) return;
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    }

    refreshSaveLoadUI() {
        const activeSlotEl = document.getElementById('saveLoadActiveSlot');
        const lastSaveEl = document.getElementById('saveLoadLastSave');
        const slotContainer = document.getElementById('saveLoadSlots');

        if (!activeSlotEl || !lastSaveEl || !slotContainer) return;

        const meta = this.getSlotMeta(this.activeSaveSlot);
        activeSlotEl.textContent = `Active Slot: ${this.activeSaveSlot}`;
        if (meta.hasSave) {
            const autosaveLabel = meta.autoSaveTime ? this.formatRelativeTime(meta.autoSaveTime) : 'Autosave ready';
            lastSaveEl.textContent = meta.savedAt
                ? `Last save: ${this.formatRelativeTime(meta.savedAt)}`
                : `Autosave: ${autosaveLabel}`;
        } else {
            lastSaveEl.textContent = 'Last save: --';
        }

        this.renderSaveLoadSlots(slotContainer);
    }

    openBoxScore() {
        const overlay = document.getElementById('boxScoreOverlay');
        if (!overlay) return;
        this.refreshBoxScoreUI();
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
    }

    closeBoxScore() {
        const overlay = document.getElementById('boxScoreOverlay');
        if (!overlay) return;
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    }

    refreshBoxScoreUI() {
        const totalEl = document.getElementById('boxScoreTotal');
        const gridContainer = document.getElementById('boxScoreGrid');

        // Hide Slot Container in Box Score if it exists
        const slotContainer = document.getElementById('boxScoreSlots');
        if (slotContainer) slotContainer.style.display = 'none';

        const headerMeta = document.querySelector('.box-score-header-meta');
        if (headerMeta) headerMeta.style.display = 'none'; // Hide slot info in box score

        if (!totalEl || !gridContainer) return;

        const storedStars = this.getSlotStars(this.activeSaveSlot);
        const currentStars = this.normalizeStars(this.starRatings.length ? this.starRatings : storedStars);
        const normalizedStars = currentStars.map((value, index) => Math.max(value, storedStars[index] || 0));
        this.starRatings = normalizedStars;

        const slotData = this.getSlotData(this.activeSaveSlot);
        const slotLevelIndex = Number.isFinite(slotData?.levelIndex) ? slotData.levelIndex : 0;
        const lastStarIndex = normalizedStars.reduce((acc, value, index) => (value > 0 ? index : acc), -1);
        const unlockedIndex = Math.max(slotLevelIndex, lastStarIndex);

        const totalStars = normalizedStars.reduce((sum, value) => sum + value, 0);
        const maxStars = normalizedStars.length * 3;
        totalEl.textContent = `${totalStars} / ${maxStars}`;

        // Removed updateBoxScoreHeaderMeta() call

        // Removed renderBoxScoreSlots(slotContainer) call
        this.renderBoxScoreGrid(gridContainer, normalizedStars, unlockedIndex);
    }

    renderSaveLoadSlots(container) {
        container.innerHTML = '';
        for (let slot = 1; slot <= this.saveSlotCount; slot++) {
            const meta = this.getSlotMeta(slot);
            const status = this.getSaveStatusForSlot(slot);

            const card = document.createElement('div');
            card.className = `sl-slot${slot === this.activeSaveSlot ? ' active' : ''}`;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('data-slot-select', `${slot}`);

            const stats = `⭐ ${meta.totalStars} / ${meta.maxStars} • ${meta.completion}%`;

            card.innerHTML = `
                <div class="sl-header">
                    <span class="sl-title">Slot ${slot}</span>
                    <span class="sl-status" style="color: ${meta.hasSave ? '#10b981' : '#94a3b8'}">${status.label}</span>
                </div>
                <div class="sl-details">
                    <span>${stats}</span>
                    <span>•</span>
                    <span>${status.detail}</span>
                </div>
                <div class="sl-actions">
                    <button data-slot-action="load" data-slot="${slot}" ${meta.hasSave ? '' : 'disabled'}>Load</button>
                    <button data-slot-action="save" data-slot="${slot}" class="primary">Save</button>
                    <button data-slot-action="clear" data-slot="${slot}" class="danger" ${meta.hasSave ? '' : 'disabled'}>Clear</button>
                </div>
            `;
            container.appendChild(card);
        }

        container.querySelectorAll('[data-slot-select]').forEach(card => {
            const slot = parseInt(card.dataset.slotSelect, 10);
            if (!Number.isFinite(slot)) return;

            const handleSelect = (event) => {
                // Ignore clicks on buttons inside
                if (event.target && event.target.closest('button')) return;
                this.setActiveSaveSlot(slot);
                this.refreshSaveLoadUI(); // Refresh UI to update active state
            };

            card.addEventListener('click', handleSelect);
        });

        container.querySelectorAll('button[data-slot-action]').forEach(btn => {
            btn.addEventListener('click', async (event) => {
                event.stopPropagation(); // Stop card selection
                const action = event.currentTarget.dataset.slotAction;
                const slot = parseInt(event.currentTarget.dataset.slot, 10);
                if (!Number.isFinite(slot)) return;

                if (action === 'load') {
                    if (this.shouldConfirmLoad(slot)) {
                        const confirmMessage = `Load Slot ${slot}? Unsaved progress will be lost.`;
                        if (!(await window.appConfirm(confirmMessage, { title: 'Load Slot' }))) return;
                    }
                    this.loadSlot(slot);
                    this.closeSaveLoadPanel(); // Close panel on load
                } else if (action === 'save') {
                    if (this.shouldConfirmOverwrite(slot)) {
                        const confirmMessage = `Overwrite Slot ${slot}? This will replace the existing save.`;
                        if (!(await window.appConfirm(confirmMessage, { title: 'Overwrite Save', confirmText: 'Overwrite', cancelText: 'Cancel' }))) return;
                    }
                    // Save logic
                    // Explicitly get stars from the *current* active slot storage to ensure accuracy
                    // Stars are autosaved immediately on level completion, so storage is the source of truth
                    const currentSlot = this.activeSaveSlot;
                    const sessionStars = this.getSlotStars(currentSlot);

                    // Switch to target slot
                    this.setActiveSaveSlot(slot);

                    // Save using the captured stars
                    this.saveSlot(slot, false, sessionStars);

                    // Force a delay to ensure localStorage write completes before UI refresh (rare edge case but safe)
                    setTimeout(() => {
                        this.refreshSaveLoadUI();
                    }, 50);
                } else if (action === 'clear') {
                    if (await window.appConfirm(`Clear Slot ${slot}? This cannot be undone.`, { title: 'Clear Slot', confirmText: 'Clear', cancelText: 'Cancel' })) {
                        this.clearSlot(slot);
                        this.refreshSaveLoadUI();
                    }
                }
            });
        });
    }

    renderBoxScoreGrid(container, stars, unlockedIndex = -1) {
        container.innerHTML = '';
        const levels = Array.isArray(this.game.levels) ? this.game.levels : [];
        const normalizedCurrentIndex = Number.isFinite(this.currentLevelIndex) ? this.currentLevelIndex : 0;
        const currentLevelStars = stars[normalizedCurrentIndex] || 0;
        let maxSelectableIndex = Math.max(-1, unlockedIndex);
        // Progression rule: next stage is only unlocked after earning at least 1 star
        // on the current stage.
        if (currentLevelStars > 0) {
            maxSelectableIndex = Math.max(maxSelectableIndex, normalizedCurrentIndex + 1);
        }
        maxSelectableIndex = Math.min(levels.length - 1, maxSelectableIndex);

        stars.forEach((value, index) => {
            const levelLabel = levels[index]
                ? `${levels[index].name || `Level ${index + 1}`}`
                : `Level ${index + 1}`;
            const row = document.createElement('div');
            const isCurrent = index === this.currentLevelIndex;
            const isSelectable = index <= maxSelectableIndex;
            row.className = `box-score-level${isSelectable ? ' selectable' : ' locked'}${isCurrent ? ' current' : ''}`;
            if (isSelectable) {
                row.setAttribute('role', 'button');
                row.setAttribute('tabindex', '0');
                row.setAttribute('data-level-index', `${index}`);
            } else {
                row.setAttribute('aria-disabled', 'true');
            }
            const starIcons = Array.from({ length: 3 }).map((_, idx) => {
                const filled = idx < value;
                return `<span class="box-score-star${filled ? '' : ' empty'}">★</span>`;
            }).join('');
            const statusText = isCurrent
                ? 'Current'
                : isSelectable
                    ? 'Replay'
                    : 'Locked';
            row.innerHTML = `
                <span class="box-score-level-title">
                    <span>${levelLabel}</span>
                    <span class="box-score-level-status">${statusText}</span>
                </span>
                <div class="box-score-stars">${starIcons}</div>
            `;
            if (isSelectable) {
                const handleSelect = () => {
                    // Current level should never trigger replay/loading from Select Level.
                    // Click only updates preview to show shape-only view.
                    if (isCurrent) {
                        this.renderLevelPreview(index, { forceCurrentShapeOnly: true });
                        return;
                    }
                    this.loadLevelFromBoxScore(index);
                };
                row.addEventListener('click', handleSelect);
                row.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelect();
                    }
                });

                // Preview on hover
                row.addEventListener('mouseenter', () => {
                    this.renderLevelPreview(index);
                });
            }
            container.appendChild(row);
        });

        // Initialize preview with current level or first unlocked
        const initialPreviewIndex = (Number.isFinite(this.currentLevelIndex)) ? this.currentLevelIndex : 0;
        this.renderLevelPreview(initialPreviewIndex);
    }

    renderLevelPreview(index, options = {}) {
        const canvas = document.getElementById('levelPreviewCanvas');
        const titleEl = document.getElementById('levelPreviewTitle');
        if (!canvas || !titleEl) return;

        const level = this.game.levels[index];
        if (!level) return;

        const isCurrentLevel = index === this.currentLevelIndex;
        const forceCurrentShapeOnly = !!options.forceCurrentShapeOnly;
        const levelStars = (Array.isArray(this.starRatings) ? (this.starRatings[index] || 0) : 0);
        const isLevelSolved = levelStars > 0;

        // Check for saved solution
        const savedSolution = this.getLevelSolution(this.activeSaveSlot, index);
        const hasSavedSolution = savedSolution && savedSolution.pieces && savedSolution.pieces.length > 0;
        const shouldShowSolvedPreview = !!(hasSavedSolution && isLevelSolved);

        titleEl.textContent = shouldShowSolvedPreview
            ? `Level ${index + 1} Last Success`
            : `Level ${index + 1} Preview`;

        const ctx = canvas.getContext('2d');
        const width = canvas.clientWidth || 300;
        const height = canvas.clientHeight || 300;

        // Ensure high DPI rendering
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        ctx.clearRect(0, 0, width, height);

        // Explicit current-level click behavior: show only the shape silhouette,
        // with no grid, no outlines, no vertices, and no percentage labels.
        if (isCurrentLevel && forceCurrentShapeOnly) {
            titleEl.textContent = `Level ${index + 1} Current Shape`;

            const shapeVertices = Array.isArray(level.startShapeVertices) ? level.startShapeVertices : [];
            if (shapeVertices.length < 3) {
                return;
            }

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            shapeVertices.forEach(v => {
                minX = Math.min(minX, v.x);
                minY = Math.min(minY, v.y);
                maxX = Math.max(maxX, v.x);
                maxY = Math.max(maxY, v.y);
            });

            const polyWidth = maxX - minX;
            const polyHeight = maxY - minY;
            const scaleX = (width * 0.72) / (polyWidth || 1);
            const scaleY = (height * 0.72) / (polyHeight || 1);
            const scale = Math.min(scaleX, scaleY);

            const centerX = width / 2;
            const centerY = height / 2;
            const polyCenterX = (minX + maxX) / 2;
            const polyCenterY = (minY + maxY) / 2;

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.scale(scale, scale);
            ctx.translate(-polyCenterX, -polyCenterY);

            ctx.beginPath();
            ctx.moveTo(shapeVertices[0].x, shapeVertices[0].y);
            for (let i = 1; i < shapeVertices.length; i++) {
                ctx.lineTo(shapeVertices[i].x, shapeVertices[i].y);
            }
            ctx.closePath();
            ctx.fillStyle = level.color || '#667eea';
            ctx.fill();

            ctx.restore();
            return;
        }

        // IMPORTANT: In Select Level, only show the player's saved last-success image.
        // Do NOT show level preview / target shape when no saved success exists.
        if (!shouldShowSolvedPreview) {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, width, height);

            // Keep current unsolved level blank (do not reveal target/correct answer).
            if (isCurrentLevel && !isLevelSolved) {
                return;
            }

            ctx.fillStyle = '#64748b';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '600 14px "Inter", sans-serif';
            ctx.fillText('No saved success image yet', width / 2, height / 2 - 10);
            ctx.font = '500 12px "Inter", sans-serif';
            ctx.fillText('Complete this level to store your result', width / 2, height / 2 + 14);
            return;
        }

        // Draw Grid Background
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        const gridSize = 20;
        ctx.beginPath();
        for (let x = 0; x <= width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        let verticesCollection = [];
        let labels = [];

        if (shouldShowSolvedPreview) {
            const storedPercents = Array.isArray(savedSolution.percents) ? savedSolution.percents : [];
            let fallbackPercents = [];
            if (!storedPercents.length || storedPercents.length !== savedSolution.pieces.length) {
                const pieceAreas = savedSolution.pieces.map(piece => Math.abs(Geometry.getArea(piece.vertices)));
                const totalArea = pieceAreas.reduce((sum, area) => sum + area, 0);
                fallbackPercents = totalArea > 0
                    ? pieceAreas.map(area => (area / totalArea) * 100)
                    : pieceAreas.map(() => 0);
            }

            savedSolution.pieces.forEach((p, idx) => {
                verticesCollection.push({
                    vertices: p.vertices,
                    color: p.color
                });
                const percentValue = Number.isFinite(storedPercents[idx])
                    ? storedPercents[idx]
                    : fallbackPercents[idx];
                if (Number.isFinite(percentValue)) {
                    labels.push({
                        text: `${percentValue.toFixed(1)}%`,
                        vertices: p.vertices
                    });
                }
            });
        }

        if (verticesCollection.length === 0) return;

        // Calculate bounds to center and zoom
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        verticesCollection.forEach(item => {
            item.vertices.forEach(v => {
                minX = Math.min(minX, v.x);
                minY = Math.min(minY, v.y);
                maxX = Math.max(maxX, v.x);
                maxY = Math.max(maxY, v.y);
            });
        });

        const polyWidth = maxX - minX;
        const polyHeight = maxY - minY;
        const scaleX = (width * 0.6) / (polyWidth || 1);
        const scaleY = (height * 0.6) / (polyHeight || 1);
        const scale = Math.min(scaleX, scaleY);

        const centerX = width / 2;
        const centerY = height / 2;
        const polyCenterX = (minX + maxX) / 2;
        const polyCenterY = (minY + maxY) / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-polyCenterX, -polyCenterY);

        // Draw Polygons
        verticesCollection.forEach(item => {
            ctx.fillStyle = item.color;
            ctx.strokeStyle = '#1e3a8a';
            ctx.lineWidth = 2 / scale;

            ctx.beginPath();
            ctx.moveTo(item.vertices[0].x, item.vertices[0].y);
            for (let i = 1; i < item.vertices.length; i++) {
                ctx.lineTo(item.vertices[i].x, item.vertices[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        // Draw Vertices
        ctx.fillStyle = '#fff';
        const pointSize = 4 / scale;
        verticesCollection.forEach(item => {
            item.vertices.forEach(v => {
                ctx.beginPath();
                ctx.arc(v.x, v.y, pointSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
        });

        // Draw Text Labels (Percentages)
        if (labels.length > 0) {
            const drawRoundedRect = (x, y, width, height, radius) => {
                const r = Math.min(radius, width / 2, height / 2);
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + width - r, y);
                ctx.quadraticCurveTo(x + width, y, x + width, y + r);
                ctx.lineTo(x + width, y + height - r);
                ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
                ctx.lineTo(x + r, y + height);
                ctx.quadraticCurveTo(x, y + height, x, y + height - r);
                ctx.lineTo(x, y + r);
                ctx.quadraticCurveTo(x, y, x + r, y);
                ctx.closePath();
            };

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            labels.forEach(lbl => {
                let center = { x: 0, y: 0 };
                if (typeof Geometry !== 'undefined' && Geometry.getPolygonCenter) {
                    center = Geometry.getPolygonCenter(lbl.vertices);
                } else {
                    let sumX = 0, sumY = 0;
                    lbl.vertices.forEach(v => { sumX += v.x; sumY += v.y; });
                    center = { x: sumX / lbl.vertices.length, y: sumY / lbl.vertices.length };
                }

                let pieceMinX = Infinity;
                let pieceMinY = Infinity;
                let pieceMaxX = -Infinity;
                let pieceMaxY = -Infinity;
                lbl.vertices.forEach(v => {
                    pieceMinX = Math.min(pieceMinX, v.x);
                    pieceMinY = Math.min(pieceMinY, v.y);
                    pieceMaxX = Math.max(pieceMaxX, v.x);
                    pieceMaxY = Math.max(pieceMaxY, v.y);
                });

                const pieceWidth = Math.max(1e-6, pieceMaxX - pieceMinX);
                const pieceHeight = Math.max(1e-6, pieceMaxY - pieceMinY);
                const pieceMinDimension = Math.max(1e-6, Math.min(pieceWidth, pieceHeight));

                let fontSize = 16 / scale;
                const minFont = 9 / scale;
                const maxFontByPiece = pieceMinDimension * 0.38;
                fontSize = Math.max(minFont, Math.min(fontSize, maxFontByPiece));
                if (!Number.isFinite(fontSize) || fontSize <= 0) return;

                // If the shape is too small to hold readable text, skip label.
                if (fontSize < 7 / scale) return;

                ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
                ctx.lineWidth = 1.8 / scale;

                const metrics = ctx.measureText(lbl.text);
                const paddingX = 6 / scale;
                const paddingY = 4 / scale;
                const boxWidth = metrics.width + paddingX * 2;
                const boxHeight = fontSize + paddingY * 2;
                const boxX = center.x - boxWidth / 2;
                const boxY = center.y - boxHeight / 2;

                ctx.save();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
                ctx.strokeStyle = 'rgba(15, 23, 42, 0.32)';
                drawRoundedRect(boxX, boxY, boxWidth, boxHeight, 7 / scale);
                ctx.fill();
                ctx.stroke();
                ctx.restore();

                ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
                ctx.strokeText(lbl.text, center.x, center.y);
                ctx.fillStyle = '#0f172a';
                ctx.fillText(lbl.text, center.x, center.y);
            });
        }

        ctx.restore();
    }

    showSafetyPopup(message, onConfirm) {
        // Remove existing if any
        const existing = document.getElementById('safetyPopup');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'safetyPopup';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(4, 8, 20, 0.75);
            backdrop-filter: blur(8px); z-index: 2147483647;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Inter', system-ui, sans-serif;
            animation: fadeIn 0.2s ease-out;
        `;

        const card = document.createElement('div');
        card.style.cssText = `
            background: #0e1a35; width: 90%; max-width: 400px;
            border-radius: 20px; padding: 24px;
            position: relative; z-index: 2147483647;
            border: 1px solid rgba(100, 140, 255, 0.18);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04);
            text-align: center;
        `;

        const title = document.createElement('h3');
        title.textContent = "Replay Level?";
        title.style.cssText = `
            margin: 0 0 12px 0; color: #e0e8ff; font-size: 20px; font-weight: 700;
        `;

        const text = document.createElement('p');
        text.textContent = message;
        text.style.cssText = `
            margin: 0 0 24px 0; color: #7b8bb5; font-size: 15px; line-height: 1.5;
        `;

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = `display: flex; gap: 12px; justify-content: center;`;

        const btnBase = `
            padding: 10px 20px; border-radius: 10px; border: none; font-weight: 600; cursor: pointer; transition: transform 0.1s; font-size: 14px;
        `;

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = "Cancel";
        cancelBtn.style.cssText = btnBase + `background: rgba(25, 40, 70, 0.8); color: #7b8bb5; border: 1px solid rgba(100, 140, 255, 0.15);`;
        cancelBtn.onmouseenter = () => cancelBtn.style.background = 'rgba(35, 55, 90, 0.9)';
        cancelBtn.onmouseleave = () => cancelBtn.style.background = 'rgba(25, 40, 70, 0.8)';
        cancelBtn.onclick = () => overlay.remove();

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = "Replay";
        confirmBtn.style.cssText = btnBase + `background: linear-gradient(135deg, #2244aa, #1a3388); color: white; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);`;
        confirmBtn.onmouseenter = () => confirmBtn.style.background = 'linear-gradient(135deg, #2a55cc, #203e99)';
        confirmBtn.onmouseleave = () => confirmBtn.style.background = 'linear-gradient(135deg, #2244aa, #1a3388)';
        confirmBtn.onclick = () => {
            overlay.remove();
            if (onConfirm) onConfirm();
        };

        btnGroup.appendChild(cancelBtn);
        btnGroup.appendChild(confirmBtn);

        card.appendChild(title);
        card.appendChild(text);
        card.appendChild(btnGroup);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        card.animate([
            { transform: 'scale(0.9)', opacity: 0 },
            { transform: 'scale(1)', opacity: 1 }
        ], { duration: 200, easing: 'ease-out' });
    }

    loadLevelFromBoxScore(index) {
        const levelCount = Array.isArray(this.game?.levels) ? this.game.levels.length : 0;
        const normalizedIndex = Number.isFinite(Number(index)) ? Math.floor(Number(index)) : -1;
        if (normalizedIndex < 0 || normalizedIndex >= levelCount) return;

        const stars = this.normalizeStars(this.starRatings.length ? this.starRatings : this.getSlotStars(this.activeSaveSlot));
        const currentIndex = Number.isFinite(this.currentLevelIndex) ? this.currentLevelIndex : 0;
        const currentStars = stars[currentIndex] || 0;
        const slotData = this.getSlotData(this.activeSaveSlot);
        const slotLevelIndex = Number.isFinite(slotData?.levelIndex) ? slotData.levelIndex : 0;
        const lastStarIndex = stars.reduce((acc, value, idx) => (value > 0 ? idx : acc), -1);
        let maxSelectableIndex = Math.max(slotLevelIndex, lastStarIndex);
        if (currentStars > 0) {
            maxSelectableIndex = Math.max(maxSelectableIndex, currentIndex + 1);
        }
        maxSelectableIndex = Math.min(levelCount - 1, maxSelectableIndex);

        if (normalizedIndex > maxSelectableIndex) {
            if (this.app && typeof this.app.showToast === 'function') {
                this.app.showToast('Beat the current level with at least 1 star to unlock the next stage.', true);
            }
            return;
        }

        // Never allow Select Level to replay/load the currently active level.
        // Keep action to preview-only behavior handled by the grid click handler.
        if (normalizedIndex === this.currentLevelIndex) {
            return;
        }

        const proceed = () => {
            if (this.game.state !== GameState.PLAYING) {
                this.game.startMode('beginner');
            }
            if (normalizedIndex < 0 || normalizedIndex >= this.game.levels.length) return;
            this.closeBoxScore();
            this.loadLevel(normalizedIndex);
            if (this.app && typeof this.app.showToast === 'function') {
                this.app.showToast(`Replaying Level ${normalizedIndex + 1}`);
            }
        };

        // Always confirm level switching from Select Level for safety/intentional replay.
        this.showSafetyPopup(
            `Do you want to replay Level ${normalizedIndex + 1}?`,
            proceed
        );
    }

    loadLevel(index) {
        if (!Array.isArray(this.game.levels) || this.game.levels.length === 0) {
            this.showMessage('Level Data Missing', 'No game levels are available to play.', 'Back to Menu', () => {
                this.game.stop();
            });
            return;
        }

        if (index >= this.game.levels.length) {
            this.showMessage('Game Completed!', 'Congratulations! You have finished all levels.', 'Back to Menu', () => {
                this.game.stop();
            });
            return;
        }

        // Reset fail count if advancing to a new level
        if (index !== this.currentLevelIndex) {
            this.levelFailCount = 0;
        }

        this.currentLevelIndex = index;
        this.levelData = this.game.levels[index];
        this.linesUsed = 0; // Track actual lines drawn
        this.maxLines = this.levelData.maxLines || 99; // Default if not set
        this.targetPieces = this.levelData.targetPieces;
        this.lineHistory = [];
        this.redoLineHistory = [];
        this.lastResult = null;
        this.hideResultsOverlay();
        this.hideSkipButton(); // Reset UI

        // Setup the game canvas for the level
        this.setupLevel();

        // Show Level Info & Update HUD
        this.updateHUD();
        this.updateGameControlButtons();

        // If user was stuck before (reloading same level), maybe show skip immediately?
        // No, let them try fresh.
        if (this.levelFailCount >= 3) {
            this.showSkipButton();
        }

        this.autosaveProgress();
    }

    setupLevel() {
        // Clear existing polygons
        this.app.polygons = [];
        this.app.history = [];
        this.app.historyIndex = -1;
        this.app.selectedPolygon = null;
        this.app.selectedVertex = null;

        // Create the starting shape
        const startShape = new Polygon(this.levelData.startShapeVertices, this.levelData.color);
        startShape.name = 'Target Shape';
        this.app.polygons.push(startShape);
        this.app.saveHistory();

        if (typeof this.app.fitViewToPolygon === 'function') {
            this.app.fitViewToPolygon(startShape, 0.3);
        } else {
            const center = Geometry.getPolygonCenter(startShape.vertices);
            if (center) {
                this.app.centerViewOn(center.x, center.y);
            }
        }

        // Set tool to split and configure split mode
        this.app.setTool('split');
        this.app.splitMode = true;
        this.app.splitStep = 1;
        this.app.splitLineStart = null;
        this.app.splitLineEnd = null;


        this.app.gridSnap = !this.gridFreeMode;

        this.updateGameControlButtons();


    }

    handleSlice(newPolygons) {
        this.linesUsed++;
        this.lineHistory.push({
            linesUsed: this.linesUsed,
            timestamp: Date.now()
        });
        this.redoLineHistory = [];
        this.updateHUD();
        this.updateGameControlButtons();
        this.autosaveProgress();
    }

    // Safety Feature: Skip Button Management
    showSkipButton() {
        let skipBtn = document.getElementById('gameSkipBtn');
        if (!skipBtn) {
            const leftSide = document.querySelector('#gameHUD > div'); // First div is left side
            if (leftSide) {
                skipBtn = document.createElement('button');
                skipBtn.id = 'gameSkipBtn';
                skipBtn.innerHTML = '<span style="font-size: 16px;">⏭️</span> Skip';
                skipBtn.style.cssText = `
                    background: rgba(25, 40, 70, 0.8);
                    border: 1px solid rgba(100, 140, 255, 0.18);
                    padding: 8px 16px;
                    border-radius: 12px;
                    font-family: 'Inter', sans-serif;
                    font-weight: 600;
                    font-size: 14px;
                    color: #7b8bb5;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    animation: fadeIn 0.5s;
                `;
                skipBtn.onclick = async () => {
                    if (await window.appConfirm("Skip this level?", { title: 'Skip Level', confirmText: 'Skip' })) {
                        this.levelComplete(); // Treat as complete but maybe 0 score?
                    }
                };
                leftSide.appendChild(skipBtn);
            }
        }
    }

    hideSkipButton() {
        const skipBtn = document.getElementById('gameSkipBtn');
        if (skipBtn) skipBtn.remove();
    }

    updateHUD() {
        let hud = document.getElementById('gameHUD');

        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'gameHUD';
            // Full width container at top
            hud.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                padding: 16px 24px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                z-index: 1200;
                pointer-events: none;
                box-sizing: border-box;
            `;

            // Left Side: Buttons
            const leftSide = document.createElement('div');
            leftSide.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: auto;
            `;

            const buttonRow = document.createElement('div');
            buttonRow.style.cssText = `
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                align-items: center;
            `;

            // Helper for button style
            // We use a dedicated class for hover effects
            if (!document.getElementById('hud-btn-styles')) {
                const style = document.createElement('style');
                style.id = 'hud-btn-styles';
                style.textContent = `
                    .game-hud-btn {
                        background: linear-gradient(135deg, #2244aa 0%, #1a3388 100%) !important;
                        border: 1px solid rgba(74, 124, 255, 0.3) !important;
                        padding: 8px 16px;
                        border-radius: 12px;
                        font-family: 'Inter', sans-serif;
                        font-weight: 600;
                        font-size: 14px;
                        color: white !important;
                        cursor: pointer;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 8px rgba(74, 124, 255, 0.15);
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .game-hud-btn:hover {
                        transform: scale(1.1);
                        background: linear-gradient(135deg, #2a55cc 0%, #203e99 100%) !important;
                        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4), 0 0 16px rgba(74, 124, 255, 0.3);
                        z-index: 10;
                    }
                    .game-hud-btn:active {
                        transform: scale(0.95);
                    }
                `;
                document.head.appendChild(style);
            }

            const btnClass = 'game-hud-btn';

            // Options Button (replaces Main Menu + Save/Load + Settings)
            const optionsBtn = document.createElement('button');
            optionsBtn.innerHTML = '<span style="font-size: 16px;">☰</span> Options';
            optionsBtn.className = btnClass;
            optionsBtn.onclick = () => {
                this.openOptionsMenu();
            };
            buttonRow.appendChild(optionsBtn);



            const totalStars = this.starRatings ? this.starRatings.reduce((a, b) => a + b, 0) : 0;
            const boxScoreBtn = document.createElement('button');
            boxScoreBtn.id = 'gameBoxScoreBtn';
            // "★ [Stars] Select Level" - Updated colors for white background
            boxScoreBtn.innerHTML = `<span style="font-size: 16px; color: #facc15;">★</span> <span style="font-weight: 800; color: white;">${totalStars}</span> &nbsp;Select Level`;
            boxScoreBtn.className = btnClass;
            // Add specific min-width
            boxScoreBtn.style.minWidth = '120px';
            boxScoreBtn.style.justifyContent = 'center';

            boxScoreBtn.onclick = () => {
                this.openBoxScore();
            };
            buttonRow.appendChild(boxScoreBtn);

            leftSide.appendChild(buttonRow);
            // Grid Lock removed (now integrated in Viewport Controls)

            hud.appendChild(leftSide);

            // Right Side: Stats Container
            const rightSide = document.createElement('div');
            rightSide.id = 'gameHUD_Stats';
            rightSide.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: auto;
                min-width: 170px;
            `;
            hud.appendChild(rightSide);

            document.querySelector('.canvas-container').appendChild(hud);
        }

        // Filter out ghost pieces for accurate HUD count
        const rawPieces = this.app.polygons.filter(p => p.visible);
        const totalArea = rawPieces.reduce((sum, p) => sum + Math.abs(Geometry.getArea(p.vertices)), 0);
        const validPieces = rawPieces.filter(p => Math.abs(Geometry.getArea(p.vertices)) > (totalArea * 0.005));
        const piecesCount = validPieces.length;

        // --- Update Right Stats Content ---
        const rightSide = document.getElementById('gameHUD_Stats');
        if (rightSide) {
            rightSide.innerHTML = `
                <div style="
                    background: rgba(12, 20, 42, 0.88);
                    backdrop-filter: blur(14px);
                    padding: 16px 20px;
                    border-radius: 16px;
                    border: 1px solid rgba(100, 140, 255, 0.18);
                    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.04);
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 24px; font-family: 'Inter', sans-serif;">
                        <span style="font-size: 11px; color: #7b8bb5; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Lines</span>
                        <span style="font-size: 16px; font-weight: 800; color: ${this.linesUsed > this.maxLines ? '#f87171' : '#e0e8ff'}">${this.linesUsed} <span style="color: #4a5f8a; font-weight: 600;">/</span> ${this.maxLines}</span>
                    </div>
                    <div style="width: 100%; height: 1px; background: rgba(100, 140, 255, 0.12);"></div>
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 24px; font-family: 'Inter', sans-serif;">
                        <span style="font-size: 11px; color: #7b8bb5; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Pieces</span>
                        <span style="font-size: 16px; font-weight: 800; color: ${piecesCount !== this.targetPieces ? '#e0e8ff' : '#4ade80'}">${piecesCount} <span style="color: #4a5f8a; font-weight: 600;">/</span> ${this.targetPieces}</span>
                    </div>
                </div>

                <div style="
                    background: rgba(12, 20, 42, 0.88);
                    backdrop-filter: blur(14px);
                    padding: 12px 16px;
                    border-radius: 14px;
                    border: 1px solid rgba(100, 140, 255, 0.18);
                    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                    font-family: 'Inter', sans-serif;
                ">
                    <span style="font-size: 11px; color: #7b8bb5; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Grid Snap</span>
                    <label style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
                        <input type="checkbox" id="gameGridSnapToggle" style="width: 16px; height: 16px; cursor: pointer; accent-color: #4a7cff;">
                        <span id="gameGridSnapLabel" style="font-size: 13px; font-weight: 700; color: #e0e8ff; min-width: 24px; text-align: right;">On</span>
                    </label>
                </div>
            `;
        }

        // Update Select Level Button Text (formerly Box Score)
        const boxScoreBtn = document.getElementById('gameBoxScoreBtn');
        if (boxScoreBtn) {
            const totalStars = this.starRatings ? this.starRatings.reduce((a, b) => a + b, 0) : 0;
            boxScoreBtn.innerHTML = `<span style="font-size: 16px; color: #facc15;">★</span> <span style="font-weight: 800; color: white;">${totalStars}</span> &nbsp;Select Level`;
        }

        const gridToggle = document.getElementById('gameGridSnapToggle');
        if (gridToggle) {
            gridToggle.checked = !this.gridFreeMode;
        }

        this.updateGridLockLabel();
        this.gridToggleBound = false;
        this.bindGridLockToggle();
    }

    updateGridLockLabel() {
        const gridLockText = document.getElementById('gameGridSnapLabel');
        if (!gridLockText) return;
        gridLockText.textContent = this.gridFreeMode ? 'Off' : 'On';
    }

    bindGridLockToggle() {
        const gridToggle = document.getElementById('gameGridSnapToggle');
        if (!gridToggle) return;

        if (gridToggle.dataset.bound === 'true') {
            gridToggle.checked = !this.gridFreeMode;
            this.updateGridLockLabel();
            return;
        }

        gridToggle.checked = !this.gridFreeMode;
        gridToggle.addEventListener('change', () => {
            this.gridFreeMode = !gridToggle.checked;
            this.app.gridSnap = !this.gridFreeMode;
            this.updateGridLockLabel();
        });
        gridToggle.dataset.bound = 'true';
        this.updateGridLockLabel();
        this.gridToggleBound = true;
    }

    bindGameControls() {
        if (this.controlsBound) return;
        const undoBtn = document.getElementById('gameUndoBtn');
        const redoBtn = document.getElementById('gameRedoBtn');
        const submitBtn = document.getElementById('gameSubmitBtn');

        if (undoBtn) undoBtn.addEventListener('click', () => this.handleUndo());
        if (redoBtn) redoBtn.addEventListener('click', () => this.handleRedo());
        if (submitBtn) submitBtn.addEventListener('click', () => this.submitSolution());

        const retryBtn = document.getElementById('gameResultsRetry');
        const nextBtn = document.getElementById('gameResultsNext');
        const menuBtn = document.getElementById('gameResultsMenu');

        if (retryBtn) retryBtn.addEventListener('click', () => {
            this.hideResultsOverlay();
            this.loadLevel(this.currentLevelIndex);
        });
        if (nextBtn) nextBtn.addEventListener('click', () => {
            if (this.lastResult && this.lastResult.coins > 0) {
                this.hideResultsOverlay();
                this.loadLevel(this.currentLevelIndex + 1);
            }
        });
        if (menuBtn) menuBtn.addEventListener('click', () => {
            this.hideResultsOverlay();
            this.game.stop();

            const menuOverlay = document.getElementById('mainMenuOverlay');
            if (menuOverlay) {
                menuOverlay.style.display = 'flex';
                menuOverlay.classList.remove('hidden');
            }

            if (typeof window.restartBackgroundMusic === 'function') {
                window.restartBackgroundMusic();
            } else if (typeof window.playBackgroundMusic === 'function') {
                window.playBackgroundMusic();
            }
        });

        this.controlsBound = true;
    }

    updateGameControlButtons() {
        const undoBtn = document.getElementById('gameUndoBtn');
        const redoBtn = document.getElementById('gameRedoBtn');
        const submitBtn = document.getElementById('gameSubmitBtn');

        const appHistory = Array.isArray(this.app?.history) ? this.app.history : [];
        const appHistoryIndex = Number.isFinite(this.app?.historyIndex) ? this.app.historyIndex : -1;
        const canUndo = appHistoryIndex > 0;
        const canRedo = appHistoryIndex >= 0 && appHistoryIndex < appHistory.length - 1;

        if (undoBtn) undoBtn.disabled = !canUndo;
        if (redoBtn) redoBtn.disabled = !canRedo;

        if (submitBtn) {
            const linesRequirementMet = this.linesUsed >= this.maxLines;
            submitBtn.disabled = !linesRequirementMet;

            if (linesRequirementMet) {
                submitBtn.classList.add('submit-ready');
                submitBtn.style.cursor = 'pointer';
                submitBtn.title = "Submit Solution!";
            } else {
                submitBtn.classList.remove('submit-ready');
                submitBtn.style.cursor = 'not-allowed';
                submitBtn.title = `Use ${this.maxLines - this.linesUsed} more lines to submit`;
            }
        }
    }

    handleUndo() {
        const canUndo = Number.isFinite(this.app?.historyIndex) && this.app.historyIndex > 0;
        if (!canUndo) return;

        const previousIndex = this.app.historyIndex;
        this.app.undo();

        if (this.app.historyIndex < previousIndex) {
            const movedLine = this.lineHistory.pop() || {
                linesUsed: Math.max(0, this.linesUsed - 1),
                timestamp: Date.now(),
                synthetic: true
            };
            this.redoLineHistory.push(movedLine);
            this.linesUsed = Math.max(0, this.linesUsed - 1);
            this.updateHUD();
            this.updateGameControlButtons();
            this.autosaveProgress();
        }
    }

    handleRedo() {
        const appHistory = Array.isArray(this.app?.history) ? this.app.history : [];
        const canRedo = Number.isFinite(this.app?.historyIndex) && this.app.historyIndex < appHistory.length - 1;
        if (!canRedo) return;

        const previousIndex = this.app.historyIndex;
        this.app.redo();

        if (this.app.historyIndex > previousIndex) {
            const restoredLine = this.redoLineHistory.pop() || {
                linesUsed: this.linesUsed + 1,
                timestamp: Date.now(),
                synthetic: true
            };
            this.lineHistory.push(restoredLine);
            this.linesUsed = this.linesUsed + 1;
            this.updateHUD();
            this.updateGameControlButtons();
            this.autosaveProgress();
        }
    }

    levelComplete() {
        this.showMessage('Level Complete!', 'Great job! You made a perfect split.', 'Next Level', () => {
            this.game.score += 100;
            this.loadLevel(this.currentLevelIndex + 1);
        });
    }

    levelFailed() {
        this.levelFailCount++; // Safety Count
        this.showMessage('Level Failed', 'That split didn\'t quite work. Try again!', 'Retry', () => {
            this.loadLevel(this.currentLevelIndex);
        });
    }

    submitSolution() {
        const evaluation = this.evaluateSolution();
        this.lastResult = evaluation;
        this.showResultsOverlay(evaluation);
    }

    ensureAudioContext() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    playResultSound(isVictory) {
        const soundFile = isVictory ? 'Music/victory.mp3' : 'Music/failed.mp3';
        if (typeof window.playSfx === 'function') {
            window.playSfx(soundFile, { volume: 0.6 });
            return;
        }
        const audio = new Audio(soundFile);
        audio.volume = 0.6;
        audio.play().catch(e => console.warn('Audio playback failed:', e));
    }

    evaluateSolution() {
        const rawPieces = this.app.polygons.filter(p => p.visible);
        const rawTotalArea = rawPieces.reduce((sum, poly) => sum + Math.abs(Geometry.getArea(poly.vertices)), 0);

        // Sanitize each piece first so grading isn't affected by micro-edges/invalid rings.
        const pieceCandidates = rawPieces
            .map(p => {
                const cleanVertices = Geometry.sanitizePolygon(p.vertices, {
                    minAbsArea: 1e-8,
                    collinearEps: 1e-6
                });
                if (!cleanVertices || cleanVertices.length < 3) return null;
                const area = Math.abs(Geometry.getArea(cleanVertices));
                if (!(area > 0)) return null;
                return {
                    ...p,
                    vertices: cleanVertices,
                    __area: area
                };
            })
            .filter(Boolean);

        const candidateAreaTotal = pieceCandidates.reduce((sum, p) => sum + p.__area, 0);
        const minMeaningfulArea = candidateAreaTotal * 0.005; // Ignore tiny sliver artifacts.
        const pieces = pieceCandidates
            .filter(p => p.__area > minMeaningfulArea)
            .map(({ __area, ...piece }) => piece);

        // Use the sanitized, meaningful pieces total so displayed percentages align with grading.
        const pieceAreas = pieceCandidates
            .filter(p => p.__area > minMeaningfulArea)
            .map(p => p.__area);
        const totalArea = pieceAreas.reduce((sum, area) => sum + area, 0);
        const targetArea = totalArea / this.targetPieces;
        const rawPercents = totalArea > 0
            ? pieceAreas.map(a => (a / totalArea) * 100)
            : pieceAreas.map(() => 0);
        const piecePercents = normalizePercentagesToHundred(rawPercents, 1);
        const maxArea = pieceAreas.length > 0 ? Math.max(...pieceAreas) : 0;
        const minArea = pieceAreas.length > 0 ? Math.min(...pieceAreas) : 0;
        const maxPercentRaw = rawPercents.length ? Math.max(...rawPercents) : 0;
        const minPercentRaw = rawPercents.length ? Math.min(...rawPercents) : 0;
        // Differential rule: use the percentage-point gap between
        // largest and smallest pieces (e.g. 17.5% - 15.8% = 1.7%).
        const differentialPercent = Math.max(0, maxPercentRaw - minPercentRaw);
        const differentialRatio = differentialPercent / 100;
        // Keep maxError for backwards compatibility with existing result consumers.
        const maxError = differentialRatio;
        const cutLimitExceeded = this.linesUsed > this.maxLines;
        const wrongPieceCount = pieces.length !== this.targetPieces;
        const thresholds = this.game.getLevelStarThresholds(this.levelData);

        let coins = 0;
        let isPerfectSymmetry = false;

        if (!cutLimitExceeded && !wrongPieceCount) {
            if (differentialRatio <= thresholds.three) {
                coins = 3;
            } else if (differentialRatio <= thresholds.two) {
                coins = 2;
            } else if (differentialRatio <= thresholds.one) {
                coins = 1;
            }
        }

        let failureReason = '';
        if (cutLimitExceeded) {
            failureReason = 'Exceeded allowed number of cuts.';
        } else if (wrongPieceCount) {
            failureReason = `Needed ${this.targetPieces} pieces, but you created ${pieces.length}.`;
        } else if (coins === 0) {
            const maxPercent = piecePercents.length ? Math.max(...piecePercents) : 0;
            const minPercent = piecePercents.length ? Math.min(...piecePercents) : 0;
            failureReason = Number.isFinite(differentialPercent)
                ? `Largest piece is ${maxPercent.toFixed(1)}% and smallest is ${minPercent.toFixed(1)}% (gap ${differentialPercent.toFixed(2)}%), exceeding the 1★ limit of ${(thresholds.one * 100).toFixed(2)}%.`
                : 'Pieces are too uneven in area.';
        }

        return {
            pieces,
            piecePercents,
            coins,
            maxError,
            differentialRatio,
            differentialPercent,
            cutLimitExceeded,
            wrongPieceCount,
            failureReason,
            isPerfectSymmetry
        };
    }

    showResultsOverlay(result) {
        const overlay = document.getElementById('gameResultsOverlay');
        if (!overlay) return;

        const panel = document.getElementById('gameResultsPanel');
        const title = document.getElementById('gameResultsTitle');
        const subtitle = document.getElementById('gameResultsSubtitle');
        const badges = document.getElementById('gameResultsBadges');
        const coin = document.getElementById('gameResultsCoin');
        const reason = document.getElementById('gameResultsReason');
        const list = document.getElementById('gameResultsPieces');
        const nextBtn = document.getElementById('gameResultsNext');
        const menuBtn = document.getElementById('gameResultsMenu');
        const sticker = document.getElementById('gameResultsSticker');

        const isVictory = result.coins > 0;
        if (isVictory) {
            this.recordStarRating(result.coins, result);
        }
        if (panel) {
            panel.classList.toggle('victory', isVictory);
            panel.classList.toggle('failed', !isVictory);
        }
        if (title) title.innerHTML = isVictory ? '<span>Victory!</span>' : '<span>Failed</span>';
        if (subtitle) {
            subtitle.textContent = isVictory
                ? 'You nailed it! Great split skills!'
                : 'Almost there — give it another try!';
        }
        if (sticker) {
            sticker.textContent = isVictory ? '🎉 Awesome!' : '💪 You got this!';
        }
        if (badges) {
            if (isVictory) {
                badges.innerHTML = '';
                badges.style.display = 'none';
            } else {
                badges.innerHTML = '<span class="game-results-badge">🧩 Practice Time</span><span class="game-results-badge">🌈 Keep Trying</span>';
                badges.style.display = 'flex';
            }
        }




        const starContainer = document.getElementById('gameResultsStars');
        if (starContainer) {
            starContainer.innerHTML = '';
            if (isVictory) {
                const starCount = result.coins || 0;
                for (let i = 1; i <= 3; i++) {
                    const star = document.createElement('span');
                    star.textContent = '★';
                    if (i > starCount) {
                        star.style.opacity = '0.2';
                        star.style.color = '#cbd5e1'; // Slate-300 for empty
                    }
                    starContainer.appendChild(star);
                }
                starContainer.style.display = 'flex';

                // Show Total Stars as well
                const totalStars = this.starRatings.reduce((a, b) => a + b, 0);
                const totalText = document.createElement('div');
                totalText.style.cssText = `
                    width: 100%; text-align: center; font-size: 14px; 
                    color: #7b8bb5; font-weight: 600; margin-top: 4px;
                `;
                totalText.innerHTML = `Total Score: <span style="color: #f59e0b;">★ ${totalStars}</span>`;
                starContainer.appendChild(totalText);
                starContainer.style.flexWrap = 'wrap';

                // Update box score button in background immediately
                this.updateHUD();
            } else {
                starContainer.style.display = 'none';
            }
        }

        if (coin) {
            // User requested to remove diamond/text and use visual stars instead
            coin.style.display = 'none';
            coin.innerHTML = '';
        }

        if (reason) {
            reason.textContent = result.failureReason || '';
            reason.style.display = isVictory ? 'none' : 'block';
        }

        if (list) {
            list.innerHTML = '';
            if (isVictory) {
                const thresholds = this.game.getLevelStarThresholds(this.levelData);
                const piecePercents = Array.isArray(result.piecePercents) ? result.piecePercents : [];
                const diffPctRaw = Number(result.differentialPercent);
                const diffPct = Number.isFinite(diffPctRaw) ? diffPctRaw : 0;
                const tThree = (thresholds.three || 0) * 100;
                const tTwo = (thresholds.two || 0) * 100;
                const tOne = (thresholds.one || 0) * 100;

                const didPassThree = diffPct <= tThree;
                const didPassTwo = diffPct <= tTwo;
                const didPassOne = diffPct <= tOne;
                const achievedStars = Math.max(0, Math.min(3, Number(result.coins) || 0));
                const achievedLabel = `${achievedStars}★`;

                const piecesHtml = piecePercents.length
                    ? piecePercents
                        .map((p, idx) => {
                            const safe = Number.isFinite(Number(p)) ? Number(p).toFixed(1) : '0.0';
                            return `<span style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(20,35,70,0.7);border:1px solid rgba(100,140,255,0.18);color:#b0c4ff;font-weight:700;font-size:12px;">P${idx + 1}: ${safe}%</span>`;
                        })
                        .join('')
                    : '<span style="color:#7b8bb5;font-size:12px;">No piece percentages detected.</span>';

                const starRuleRow = (label, limit, passed) => {
                    const tone = passed ? '#4ade80' : '#f87171';
                    const bg = passed ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)';
                    const icon = passed ? '✓' : '✕';
                    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-radius:8px;background:${bg};font-size:12px;">
                        <span style="font-weight:700;color:#b0c4ff;">${label}</span>
                        <span style="font-weight:700;color:${tone};">${icon} ≤ ${limit.toFixed(2)}%</span>
                    </div>`;
                };

                list.innerHTML = `
                    <div style="margin-top:10px;padding:12px;border-radius:12px;background:rgba(12,20,42,0.88);border:1px solid rgba(100,140,255,0.15);display:flex;flex-direction:column;gap:10px;">
                        <div style="font-weight:800;color:#e0e8ff;font-size:14px;">Score Breakdown</div>

                        <div style="display:flex;flex-wrap:wrap;gap:8px;">
                            ${piecesHtml}
                        </div>

                        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:8px;background:rgba(15,25,50,0.7);border:1px solid rgba(100,140,255,0.12);">
                            <span style="font-size:12px;color:#7b8bb5;font-weight:700;">Differential</span>
                            <span style="font-size:13px;color:#e0e8ff;font-weight:800;">${diffPct.toFixed(2)}%</span>
                        </div>

                        <div style="display:flex;flex-direction:column;gap:6px;">
                            ${starRuleRow('3★ Rating', tThree, didPassThree)}
                            ${starRuleRow('2★ Rating', tTwo, didPassTwo)}
                            ${starRuleRow('1★ Rating', tOne, didPassOne)}
                        </div>

                        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:8px;background:rgba(40,30,10,0.6);border:1px solid rgba(251,191,36,0.2);">
                            <span style="font-size:12px;color:#f59e0b;font-weight:700;">Achieved</span>
                            <span style="font-size:13px;color:#fbbf24;font-weight:900;">${achievedLabel}</span>
                        </div>
                    </div>
                `;
                list.style.display = 'block';
            } else {
                list.style.display = 'none';
            }
        }

        if (nextBtn) {
            nextBtn.style.display = isVictory ? 'inline-flex' : 'none';
            nextBtn.disabled = !isVictory;
        }
        if (menuBtn) {
            menuBtn.style.display = isVictory ? 'none' : 'inline-flex';
        }

        overlay.style.display = 'flex';
        this.renderResultsCanvas(result);
        this.playResultSound(isVictory);
        this.autosaveProgress();
    }

    hideResultsOverlay() {
        const overlay = document.getElementById('gameResultsOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    renderResultsCanvas(result) {
        const pieces = result.pieces;
        const percents = result.piecePercents;

        const canvas = document.getElementById('gameResultsCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, rect.width, rect.height);
        if (!pieces || pieces.length === 0) return;

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        pieces.forEach(poly => {
            poly.vertices.forEach(v => {
                minX = Math.min(minX, v.x);
                maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y);
                maxY = Math.max(maxY, v.y);
            });
        });

        const padding = 20;
        const width = maxX - minX || 1;
        const height = maxY - minY || 1;
        const scale = Math.min((rect.width - padding * 2) / width, (rect.height - padding * 2) / height);

        ctx.save();
        ctx.translate(rect.width / 2, rect.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-(minX + maxX) / 2, -(minY + maxY) / 2);

        pieces.forEach((poly, index) => {
            const verts = poly.vertices;
            if (verts.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(verts[0].x, verts[0].y);
            for (let i = 1; i < verts.length; i++) {
                ctx.lineTo(verts[i].x, verts[i].y);
            }
            ctx.closePath();
            ctx.fillStyle = `${poly.color}55`;
            ctx.fill();
            ctx.strokeStyle = poly.color;
            ctx.lineWidth = 2 / scale;
            ctx.stroke();

            if (percents && percents[index] !== undefined) {
                const center = Geometry.getPolygonCenter(verts);
                ctx.save();
                ctx.fillStyle = '#1e293b';
                ctx.font = `bold ${16 / scale}px 'Inter', sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.lineWidth = 3 / scale;
                const p = Number(percents[index]);
                const text = Number.isFinite(p) ? `${p.toFixed(1)}%` : '0.0%';
                ctx.strokeText(text, center.x, center.y);
                ctx.fillText(text, center.x, center.y);
                ctx.restore();
            }
        });

        ctx.restore();
    }

    async showMessage(title, body, btnText, callback) {
        await window.appAlert(body, { title, confirmText: btnText || 'OK' });
        if (callback) callback();
    }
}

// --- HIDDEN DEVELOPER MANAGER ---
class DevManager {
    constructor(game) {
        this.game = game;
        this.isVisible = false;
        this.panel = null;
        this.headerEl = null;
        this.levelList = null;
        this.creatorCanvas = null;
        this.creatorInfo = null;
        this.debugConsoleModalEl = null;
        this.debugConsoleOriginalParent = null;
        this.debugConsoleOriginalNextSibling = null;
        this.debugConsoleOriginalStyleText = null;
        this.boundCreatorPointerRelease = null;
        this.creatorView = { scale: 1, offsetX: 0, offsetY: 0 };
        this.creatorViewDirty = true;
        this.creatorState = this.createDefaultCreatorState();
        this.isDraggingPanel = false;
        this.dragState = null;
        this.isResizingPanel = false;
        this.resizeState = null;
        this.creatorHistory = [];
        this.creatorRedoHistory = [];
        this.pendingDragSnapshot = null;
        this.creatorHotkeysBound = false;
        this.creatorGlobalPointerBound = false;
        this.creatorRenderTickRequested = false;
        this.setupListener();
    }

    createDefaultCreatorState() {
        return {
            vertices: [],
            lines: [],
            solverPreviewLines: [],
            isSolving: false,
            solveRunId: 0,
            gridSize: 20,
            gridLock: true,
            drawingLineStart: null,
            draggingVertexIndex: -1,
            hoverVertexIndex: -1,
            selectedLevelIndex: 0,
            vertexCount: 8,
            symmetryEnabled: false,
            autoMaximize: true,
            strictMode: false,
            drawCustomMode: false,
            searchEffort: 5,
            seed: 12345,
            maxDifferentialPercent: 5,
            customMouseWorld: null,
            customDrawError: '',
            lastSolveMeta: null,
            lastSolveDiagnostics: null,
            solveSession: null,
            targetPieces: 4,
            maxLines: 3,
            starPercent: { one: 18, two: 12, three: 6 },
            zoomLevelDefault: 1,
            zoomLevel: 1,
            minZoomLevel: 0.6,
            maxZoomLevel: 2.4,
            zoomStep: 0.15,
            drawBoundary: null,
            boundaryPadding: 36
        };
    }

    getGameplayGridSize() {
        const appGrid = Number(this.game?.app?.gridSize);
        return Math.max(8, Number.isFinite(appGrid) ? appGrid : 20);
    }

    getGameplayViewportAspect() {
        const canvas = this.game?.app?.canvas;
        if (canvas && typeof canvas.getBoundingClientRect === 'function') {
            const rect = canvas.getBoundingClientRect();
            const w = Math.max(1, Number(rect.width) || 1);
            const h = Math.max(1, Number(rect.height) || 1);
            return w / h;
        }
        return 16 / 9;
    }

    getCreatorGameplayViewportScreenRect(width, height) {
        const w = Math.max(1, Number(width) || 1);
        const h = Math.max(1, Number(height) || 1);
        const aspect = Math.max(0.1, this.getGameplayViewportAspect());
        const outerPad = 16;
        const maxW = Math.max(1, w - outerPad * 2);
        const maxH = Math.max(1, h - outerPad * 2);

        let rectW = maxW;
        let rectH = rectW / aspect;
        if (rectH > maxH) {
            rectH = maxH;
            rectW = rectH * aspect;
        }

        return {
            x: (w - rectW) / 2,
            y: (h - rectH) / 2,
            width: rectW,
            height: rectH
        };
    }

    snapshotCreatorGeometry() {
        return {
            vertices: (this.creatorState.vertices || []).map(v => ({ x: v.x, y: v.y })),
            lines: (this.creatorState.lines || []).map(l => ({
                start: { x: l.start.x, y: l.start.y },
                end: { x: l.end.x, y: l.end.y }
            })),
            drawCustomMode: !!this.creatorState.drawCustomMode
        };
    }

    applyCreatorSnapshot(snapshot) {
        if (!snapshot) return;
        this.creatorState.vertices = (snapshot.vertices || []).map(v => ({ x: v.x, y: v.y }));
        this.creatorState.lines = (snapshot.lines || []).map(l => ({
            start: { x: l.start.x, y: l.start.y },
            end: { x: l.end.x, y: l.end.y }
        }));
        this.creatorState.drawCustomMode = !!snapshot.drawCustomMode;
        this.creatorState.customMouseWorld = null;
        this.creatorState.drawingLineStart = null;
        this.creatorState.draggingVertexIndex = -1;
        this.creatorState.hoverVertexIndex = -1;
        this.creatorState.customDrawError = '';
        this.computeAndStoreCreatorBoundary(this.creatorState.vertices);
        this.creatorViewDirty = true;
    }

    pushCreatorHistory(snapshotBeforeChange) {
        if (!snapshotBeforeChange) return;
        this.creatorHistory.push(snapshotBeforeChange);
        if (this.creatorHistory.length > 200) this.creatorHistory.shift();
        this.creatorRedoHistory = [];
    }

    updateCreatorUndoRedoButtons() {
        if (!this.panel) return;
        const undoBtn = this.panel.querySelector('#devCanvasUndoBtn');
        const redoBtn = this.panel.querySelector('#devCanvasRedoBtn');
        if (undoBtn) undoBtn.disabled = this.creatorHistory.length === 0;
        if (redoBtn) redoBtn.disabled = this.creatorRedoHistory.length === 0;
        this.updateCreatorCanvasToolButtons();
    }

    updateCreatorCanvasToolButtons() {
        if (!this.panel) return;
        const zoomInBtn = this.panel.querySelector('#devCanvasZoomInBtn');
        const zoomOutBtn = this.panel.querySelector('#devCanvasZoomOutBtn');
        const minZoom = Number(this.creatorState.minZoomLevel) || 0.6;
        const maxZoom = Number(this.creatorState.maxZoomLevel) || 2.4;
        const zoom = Number(this.creatorState.zoomLevel) || 1;
        if (zoomInBtn) zoomInBtn.disabled = zoom >= maxZoom - 1e-6;
        if (zoomOutBtn) zoomOutBtn.disabled = zoom <= minZoom + 1e-6;
    }

    resetCreatorInteractionState() {
        this.pendingDragSnapshot = null;
        this.creatorState.draggingVertexIndex = -1;
        this.creatorState.hoverVertexIndex = -1;
        this.creatorState.customMouseWorld = null;
        this.creatorState.drawingLineStart = null;
    }

    stopSolver() {
        this.creatorState.isSolving = false;
        // Increment run ID to invalidate any pending async loops
        this.creatorState.solveRunId = (this.creatorState.solveRunId || 0) + 1;
        this.creatorState.solverPreviewLines = [];
        this.creatorState.solveSession = null;
        this.creatorRenderTickRequested = false;
        this.updateCreatorInfo();
        this.renderCreatorCanvas();
    }

    undoCreatorEdit() {
        if (!this.creatorHistory.length) return;
        this.stopSolver(); // Ensure solver doesn't conflict with undo
        const prev = this.creatorHistory.pop();
        this.creatorRedoHistory.push(this.snapshotCreatorGeometry());
        this.applyCreatorSnapshot(prev);
        this.syncCreatorControlText();
        this.updateCreatorInfo();
        this.renderCreatorCanvas();
        this.updateCreatorUndoRedoButtons();
    }

    redoCreatorEdit() {
        if (!this.creatorRedoHistory.length) return;
        this.stopSolver(); // Ensure solver doesn't conflict with redo
        const next = this.creatorRedoHistory.pop();
        this.creatorHistory.push(this.snapshotCreatorGeometry());
        this.applyCreatorSnapshot(next);
        this.syncCreatorControlText();
        this.updateCreatorInfo();
        this.renderCreatorCanvas();
        this.updateCreatorUndoRedoButtons();
    }

    zoomCreatorIn() {
        const current = Number(this.creatorState.zoomLevel) || 1;
        const step = Number(this.creatorState.zoomStep) || 0.15;
        const max = Number(this.creatorState.maxZoomLevel) || 2.4;
        const next = this.clampValue(current + step, Number(this.creatorState.minZoomLevel) || 0.6, max);

        this.creatorState.zoomLevel = next;
        this.creatorViewDirty = true;
        this.updateCreatorInfo();
        this.renderCreatorCanvas();
        this.updateCreatorCanvasToolButtons();
    }

    zoomCreatorOut() {
        const current = Number(this.creatorState.zoomLevel) || 1;
        const step = Number(this.creatorState.zoomStep) || 0.15;
        const min = Number(this.creatorState.minZoomLevel) || 0.6;
        const next = this.clampValue(current - step, min, Number(this.creatorState.maxZoomLevel) || 2.4);

        this.creatorState.zoomLevel = next;
        this.creatorViewDirty = true;
        this.updateCreatorInfo();
        this.renderCreatorCanvas();
        this.updateCreatorCanvasToolButtons();
    }

    orientation(a, b, c) {
        return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    }

    onSegment(a, b, c) {
        return (
            Math.min(a.x, c.x) <= b.x + 1e-9 && b.x <= Math.max(a.x, c.x) + 1e-9 &&
            Math.min(a.y, c.y) <= b.y + 1e-9 && b.y <= Math.max(a.y, c.y) + 1e-9
        );
    }

    segmentsIntersect(a1, a2, b1, b2) {
        const o1 = this.orientation(a1, a2, b1);
        const o2 = this.orientation(a1, a2, b2);
        const o3 = this.orientation(b1, b2, a1);
        const o4 = this.orientation(b1, b2, a2);

        if (o1 * o2 < 0 && o3 * o4 < 0) return true;
        if (Math.abs(o1) < 1e-9 && this.onSegment(a1, b1, a2)) return true;
        if (Math.abs(o2) < 1e-9 && this.onSegment(a1, b2, a2)) return true;
        if (Math.abs(o3) < 1e-9 && this.onSegment(b1, a1, b2)) return true;
        if (Math.abs(o4) < 1e-9 && this.onSegment(b1, a2, b2)) return true;
        return false;
    }

    wouldSelfIntersectOnAdd(vertices, candidate) {
        const n = vertices.length;
        if (n < 2) return false;
        const last = vertices[n - 1];
        for (let i = 0; i < n - 2; i++) {
            if (this.segmentsIntersect(last, candidate, vertices[i], vertices[i + 1])) {
                return true;
            }
        }
        return false;
    }

    wouldSelfIntersectOnClose(vertices) {
        const n = vertices.length;
        if (n < 4) return false;
        const last = vertices[n - 1];
        const first = vertices[0];
        for (let i = 1; i < n - 2; i++) {
            if (this.segmentsIntersect(last, first, vertices[i], vertices[i + 1])) {
                return true;
            }
        }
        return false;
    }

    getCreatorMaxDifferentialPercent() {
        const raw = Number(this.creatorState?.maxDifferentialPercent);
        return Math.max(0.1, Math.min(100, Number.isFinite(raw) ? raw : 5));
    }

    getLiveCreatorLinesForStats() {
        const previewLines = Array.isArray(this.creatorState?.solverPreviewLines)
            ? this.creatorState.solverPreviewLines
            : [];
        if (this.creatorState?.isSolving && previewLines.length) {
            const activeCount = Math.max(
                0,
                Math.min(previewLines.length, Number(this.creatorState?.solveSession?.activeLineCount) || 0)
            );
            return previewLines.slice(0, activeCount);
        }
        return Array.isArray(this.creatorState?.lines) ? this.creatorState.lines : [];
    }

    getValidationLinesForLiveDiff() {
        const previewLines = Array.isArray(this.creatorState?.solverPreviewLines)
            ? this.creatorState.solverPreviewLines
            : [];
        // During solving, Diff must reflect the currently scanned candidate
        // (largest vs smallest piece of the full preview solution), not just
        // the subset of lines currently animated on screen.
        if (this.creatorState?.isSolving && previewLines.length) {
            return previewLines;
        }
        return Array.isArray(this.creatorState?.lines) ? this.creatorState.lines : [];
    }

    setupListener() {
        // Toggle with Ctrl + Shift + D
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
                e.preventDefault();
                this.toggle();
            }
        });
        // Console access
        window.enableDevMode = () => this.toggle();
    }

    toggle() {
        this.isVisible = !this.isVisible;
        if (this.isVisible) {
            this.render();
            // Toast - Moved to bottom center to avoid top-right UI (HUD, etc)
            const toast = document.createElement('div');
            toast.textContent = "💻 Developer Mode Enabled";
            toast.style.cssText = `
                position: fixed; 
                bottom: 30px; 
                left: 50%; 
                transform: translateX(-50%);
                background: rgba(16, 185, 129, 0.95); 
                color: white; 
                padding: 10px 24px; 
                border-radius: 50px; 
                z-index: 20000; 
                font-family: 'Inter', sans-serif; 
                font-weight: 600;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: fadeOut 2s forwards 2s;
                pointer-events: none;
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4100);
        } else {
            this.hide();
        }
    }

    hide() {
        this.closeDebugConsoleModal();
        this.resetCreatorInteractionState();
        if (this.panel) this.panel.style.display = 'none';
        this.isVisible = false;
    }

    render() {
        if (!this.panel) {
            this.createPanel();
        }
        this.populateList();
        // Always open with Stage 1 as the baseline reference shape.
        this.hydrateCreatorFromCurrentLevel(true, 0);
        this.resetCreatorInteractionState();
        this.creatorState.zoomLevel = this.clampValue(
            Number(this.creatorState.zoomLevelDefault) || 0.82,
            Number(this.creatorState.minZoomLevel) || 0.6,
            Number(this.creatorState.maxZoomLevel) || 2.4
        );
        this.creatorViewDirty = true;
        this.syncCreatorControls();
        this.syncCreatorControlText();
        this.updateCreatorInfo();
        this.renderCreatorCanvas();
        this.updateCreatorUndoRedoButtons();
        this.panel.style.display = 'flex';
    }

    createPanel() {
        this.ensureStyles();
        this.panel = document.createElement('div');
        this.panel.id = 'devManagerPanel';
        this.panel.style.cssText = `
            position: fixed;
            top: 70px;
            right: 18px;
            width: min(1120px, calc(100vw - 36px));
            height: min(84vh, 860px);
            background: rgba(15, 23, 42, 0.96);
            backdrop-filter: blur(12px);
            border: 1px solid #334155;
            border-radius: 16px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            box-shadow: 0 18px 52px rgba(0,0,0,0.45);
            font-family: 'Inter', sans-serif;
            color: white;
            overflow: hidden;
        `;

        const header = document.createElement('div');
        header.className = 'dev-header';
        header.innerHTML = `
            <div class="dev-top-row">
                <h3 style="margin:0; font-size:19px; color:#38bdf8; white-space:nowrap;">Dev Manager</h3>
                <div class="dev-top-actions">
                    <button data-dev-action="standard-polygons" type="button">Standard Polygons</button>
                    <button data-dev-action="random-polygon" type="button">Random Polygon</button>
                    <button data-dev-action="toggle-draw-custom" id="devDrawCustomBtn" type="button">Draw Custom</button>
                    <button data-dev-action="clear-all" type="button">Clear</button>
                    <button data-dev-action="hardcore-save" type="button" class="accent">Hardcore Save</button>
                    <button data-dev-action="open-debug-console" type="button">Debug Console</button>
                </div>
                <button id="devCloseBtn" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:20px;">×</button>
            </div>
        `;
        this.headerEl = header;
        this.panel.appendChild(header);

        const body = document.createElement('div');
        body.className = 'dev-body';

        const leftCol = document.createElement('div');
        leftCol.className = 'dev-left';
        leftCol.innerHTML = `
            <div class="dev-left-title-row">
                <div class="dev-left-title">Level Creator Controls</div>
            </div>

            <div class="lc-control-group">
                <label class="lc-label" for="devLevelDropdown">Levels</label>
                <select id="devLevelDropdown" class="dev-level-select"></select>
                <div class="dev-level-actions">
                    <button id="devLevelLoadBtn" type="button">Load</button>
                    <button id="devLevelEditBtn" type="button">Edit</button>
                </div>
            </div>

            <div class="lc-control-group">
                <label class="lc-label" for="devVerticesRange">Vertices:</label>
                <select id="devVerticesRange"></select>
            </div>

            <div class="lc-control-group">
                <label class="lc-toggle-row">
                    <input id="devSymmetryToggle" type="checkbox">
                    <span>Perfect Symmetry</span>
                </label>
                <div class="lc-status off" id="devSymmetryStatus">OFF - Random Shape</div>
            </div>

            <div class="lc-control-group">
                <label class="lc-label" for="devSolveLines">Number of Lines:</label>
                <select id="devSolveLines"></select>
            </div>

            <div class="lc-control-group">
                <div class="lc-label-row">
                    <label class="lc-label">Target Pieces</label>
                    <button data-dev-action="solve-creator" type="button" class="misty-green">Solve</button>
                </div>
                <input id="devTargetPieces" type="number" min="2" max="16" step="1" value="4">
                <label class="lc-toggle-row" style="margin-top:8px;">
                    <input id="devAutoMaximizeToggle" type="checkbox" checked>
                    <span>Auto Maximize</span>
                </label>
                <div class="lc-status on" id="devAutoModeStatus">ON - Find max valid</div>
                <div class="lc-meta">Max Possible Pieces: <b id="devMaxPiecesValue">7</b></div>
            </div>

            <div class="lc-control-group">
                <label class="lc-label" for="devEffortRange">Effort:</label>
                <select id="devEffortRange"></select>
                <label class="lc-toggle-row" style="margin-top:8px;">
                    <input id="devStrictModeToggle" type="checkbox">
                    <span>Strict Mode (deeper search)</span>
                </label>
            </div>

            <div class="lc-control-group">
                <label class="lc-label" for="devMaxDiffAllowed">Max Diff. % allowed:</label>
                <input id="devMaxDiffAllowed" type="number" min="0.1" max="100" step="0.1" value="5">
            </div>

            <div class="lc-control-group">
                <label class="lc-label">Grid</label>
                <div class="lc-inline">
                    <input id="devGridSize" type="number" min="8" max="80" step="1" value="24">
                    <label class="lc-toggle-row compact"><input id="devGridLock" type="checkbox" checked><span>Lock on Grid <b id="devGridLockLabel">ON</b></span></label>
                </div>
            </div>

        `;
        this.levelList = leftCol.querySelector('#devLevelDropdown');

        const rightCol = document.createElement('div');
        rightCol.className = 'dev-right';
        rightCol.innerHTML = `
            <div class="dev-canvas-wrap">
                <canvas id="devCreatorCanvas" width="820" height="470"></canvas>
                <div class="dev-canvas-tools">
                    <button id="devCanvasUndoBtn" type="button" title="Undo (Ctrl+Z)">↶</button>
                    <button id="devCanvasRedoBtn" type="button" title="Redo (Ctrl+Y)">↷</button>
                    <button id="devCanvasZoomInBtn" type="button" title="Zoom in">+</button>
                    <button id="devCanvasZoomOutBtn" type="button" title="Zoom out">−</button>
                </div>
            </div>
            <div id="devCreatorInfo" class="dev-info"></div>
        `;

        body.appendChild(leftCol);
        body.appendChild(rightCol);
        this.panel.appendChild(body);

        document.body.appendChild(this.panel);

        document.getElementById('devCloseBtn').onclick = () => this.hide();
        this.creatorCanvas = document.getElementById('devCreatorCanvas');
        this.creatorInfo = document.getElementById('devCreatorInfo');
        this.bindPanelControls();
        this.makePanelDraggable();
        this.makePanelResizable();
    }

    ensureStyles() {
        if (document.getElementById('dev-manager-styles')) return;
        const style = document.createElement('style');
        style.id = 'dev-manager-styles';
        style.textContent = `
            #devManagerPanel ::-webkit-scrollbar { width: 8px; }
            #devManagerPanel ::-webkit-scrollbar-track { background: #111827; }
            #devManagerPanel ::-webkit-scrollbar-thumb { background: #334155; border-radius: 5px; }
            #devManagerPanel .dev-header{ padding:12px 14px; border-bottom:1px solid #334155; }
            #devManagerPanel .dev-top-row{ display:flex; align-items:center; gap:10px; }
            #devManagerPanel .dev-top-actions{ flex:1; min-width:0; display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:4px; }
            #devManagerPanel .dev-top-actions button{ width:100%; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding:7px 2px; font-size:11px; }
            #devManagerPanel .dev-body{ display:grid; grid-template-columns:340px 1fr; min-height:0; flex:1; }
            #devManagerPanel .dev-left{ border-right:1px solid #334155; padding:12px; min-height:0; overflow:auto; display:flex; flex-direction:column; gap:10px; }
            #devManagerPanel .dev-left-title-row{ display:flex; align-items:center; justify-content:space-between; }
            #devManagerPanel .dev-left-title{ font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:#94a3b8; }
            #devManagerPanel .dev-level-select{ width:100%; background:#0f172a; color:#e2e8f0; border:1px solid #334155; border-radius:8px; padding:8px; font-size:12px; }
            #devManagerPanel .dev-level-actions{ display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px; }
            #devManagerPanel .dev-level-actions button,
            #devManagerPanel .dev-top-actions button,
            #devManagerPanel .lc-btn-grid button,
            #devManagerPanel .lc-inline button{ background:#1e293b; border:1px solid #334155; color:#dbeafe; border-radius:8px; padding:7px 10px; cursor:pointer; font-weight:600; font-size:12px; }
            #devManagerPanel .dev-top-actions button{ background:#6d59b8; border-color:#8d78de; color:#f8f4ff; padding:7px 2px; font-size:11px; }
            #devManagerPanel .dev-top-actions button:hover{ background:#7c67c9; border-color:#a18cf0; }
            #devManagerPanel .dev-top-actions button:active{ background:#5d4ca4; }
            #devManagerPanel .lc-btn-grid button.accent,
            #devManagerPanel .dev-top-actions button.accent{ background:#0ea5e9; border-color:#38bdf8; color:#fff; }
            #devManagerPanel .dev-top-actions button.misty-green,
            #devManagerPanel .misty-green{
                background: linear-gradient(180deg, #c8f7df 0%, #a9efcc 100%);
                border: 1px solid #67c89a;
                color: #0f5132;
                box-shadow: 0 2px 8px rgba(22, 163, 74, 0.22);
                font-weight: 800;
            }
            #devManagerPanel .dev-top-actions button.misty-green:hover,
            #devManagerPanel .misty-green:hover{
                background: linear-gradient(180deg, #d8fae8 0%, #baf3d6 100%);
                border-color: #57b785;
                transform: translateY(-1px);
            }
            #devManagerPanel .dev-top-actions button.misty-green:active,
            #devManagerPanel .misty-green:active{
                transform: translateY(0);
                background: linear-gradient(180deg, #9fecc4 0%, #8fe2b5 100%);
                box-shadow: 0 1px 4px rgba(22, 163, 74, 0.24);
            }
            #devManagerPanel .dev-right{ padding:6px 10px 10px 10px; display:flex; flex-direction:column; gap:8px; min-height:0; }
            #devManagerPanel .dev-canvas-wrap{ position:relative; min-height:0; flex:1; }
            #devManagerPanel .dev-canvas-tools{ position:absolute; top:10px; left:10px; display:flex; gap:10px; z-index:3; pointer-events:auto; }
            #devManagerPanel .dev-canvas-tools button{ width:42px; height:34px; display:flex; align-items:center; justify-content:center; background:rgba(12,20,42,0.85); border:1px solid rgba(100,140,255,0.2); color:#b0c4ff; border-radius:14px; padding:0; font-size:20px; font-weight:800; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.3); backdrop-filter:blur(8px); }
            #devManagerPanel .dev-canvas-tools button:disabled{ opacity:.45; cursor:not-allowed; }
            #devManagerPanel .lc-control-group{ background:#111c33; border:1px solid #334155; border-radius:10px; padding:8px; display:flex; flex-direction:column; gap:6px; }
            #devManagerPanel .lc-label{ font-size:12px; color:#cbd5e1; }
            #devManagerPanel .lc-label-row{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
            #devManagerPanel .lc-label-row .misty-green{ padding:5px 11px; border-radius:8px; font-size:12px; line-height:1.1; cursor:pointer; }
            #devManagerPanel .lc-inline{ display:flex; gap:8px; align-items:center; }
            #devManagerPanel .lc-inline input[type='number'],
            #devManagerPanel .lc-control-group input[type='number']{ width:90px; background:#0f172a; color:#e2e8f0; border:1px solid #334155; border-radius:6px; padding:4px 6px; }
            #devManagerPanel .lc-control-group select{ width:100%; background:#0f172a; color:#e2e8f0; border:1px solid #334155; border-radius:6px; padding:6px 8px; }
            #devManagerPanel .lc-toggle-row{ display:flex; align-items:center; gap:8px; font-size:12px; color:#cbd5e1; }
            #devManagerPanel .lc-toggle-row.compact{ font-size:11px; }
            #devManagerPanel .lc-status{ font-size:11px; font-weight:600; }
            #devManagerPanel .lc-status.on{ color:#22c55e; }
            #devManagerPanel .lc-status.off{ color:#94a3b8; }
            #devManagerPanel .lc-meta{ font-size:11px; color:#cbd5e1; }
            #devManagerPanel .lc-btn-grid{ display:grid; grid-template-columns:1fr 1fr; gap:8px; }
            #devManagerPanel .lc-btn-grid.single{ grid-template-columns:1fr 1fr; }
            #devCreatorCanvas{ width:100%; min-height:0; flex:1; border:1px solid #cbd5e1; border-radius:10px; background:#f8fafc; cursor:crosshair; }
            #devManagerPanel .dev-info{ font-size:12px; color:#cbd5e1; background:#0f172a; border:1px solid #334155; border-radius:8px; padding:8px; }
            #devManagerPanel .dev-header{ cursor:move; user-select:none; }
            #devManagerPanel .dev-header button{ cursor:pointer; }
            #devManagerPanel .dev-resize-handle{ position:absolute; width:16px; height:16px; right:4px; bottom:4px; cursor:nwse-resize; background:linear-gradient(135deg, transparent 45%, #64748b 45%, #64748b 58%, transparent 58%, transparent 70%, #64748b 70%, #64748b 83%, transparent 83%); opacity:.85; }
        `;
        document.head.appendChild(style);
    }

    openDebugConsoleModal() {
        if (!window.MobileDebug || !window.MobileDebug.overlay) {
            if (typeof window.appAlert === 'function') {
                window.appAlert('Debug console is not available in this build.', {
                    title: 'Debug Console',
                    confirmText: 'OK'
                });
            }
            return;
        }

        const debugOverlay = window.MobileDebug.overlay;
        if (!this.debugConsoleOriginalParent) {
            this.debugConsoleOriginalParent = debugOverlay.parentElement || document.body;
            this.debugConsoleOriginalNextSibling = debugOverlay.nextSibling;
            this.debugConsoleOriginalStyleText = debugOverlay.getAttribute('style') || '';
        }

        if (this.debugConsoleModalEl && this.debugConsoleModalEl.isConnected) {
            this.debugConsoleModalEl.style.display = 'flex';
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'devDebugConsoleModal';
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 12050;
            background: rgba(2, 6, 23, 0.72);
            backdrop-filter: blur(3px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 22px;
        `;

        const card = document.createElement('div');
        card.style.cssText = `
            width: min(1300px, calc(100vw - 28px));
            height: min(82vh, 860px);
            background: #020617;
            border: 1px solid #334155;
            border-radius: 14px;
            box-shadow: 0 20px 70px rgba(0,0,0,.55);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid #334155;background:#0f172a;color:#e2e8f0;font:700 13px Inter, sans-serif;';
        header.innerHTML = '<span>Debug Console</span>';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', 'Close Debug Console');
        closeBtn.style.cssText = 'background:none;border:none;color:#94a3b8;cursor:pointer;font-size:22px;line-height:1;padding:2px 6px;';
        closeBtn.onclick = () => this.closeDebugConsoleModal();
        header.appendChild(closeBtn);

        const content = document.createElement('div');
        content.style.cssText = 'position:relative;flex:1;min-height:0;overflow:hidden;background:#020617;';
        card.appendChild(header);
        card.appendChild(content);
        modal.appendChild(card);

        modal.addEventListener('click', (event) => {
            if (event.target === modal) this.closeDebugConsoleModal();
        });

        document.body.appendChild(modal);
        this.debugConsoleModalEl = modal;

        content.appendChild(debugOverlay);
        debugOverlay.style.cssText = `
            position:absolute;
            inset:0;
            margin:0;
            width:100%;
            height:100%;
            max-height:none;
            border-radius:0;
            border-width:0;
            display:block;
            z-index:1;
        `;

        const logDiv = debugOverlay.querySelector('#mobileDebugLog');
        if (logDiv) {
            logDiv.style.maxHeight = '100%';
            logDiv.style.height = '100%';
            logDiv.style.overflowY = 'auto';
        }

        if (typeof window.MobileDebug.render === 'function') {
            window.MobileDebug.render();
        }
    }

    closeDebugConsoleModal() {
        const debugOverlay = window.MobileDebug && window.MobileDebug.overlay ? window.MobileDebug.overlay : null;

        if (debugOverlay) {
            const parent = this.debugConsoleOriginalParent || document.body;
            if (parent && parent.isConnected) {
                if (
                    this.debugConsoleOriginalNextSibling &&
                    this.debugConsoleOriginalNextSibling.parentNode === parent
                ) {
                    parent.insertBefore(debugOverlay, this.debugConsoleOriginalNextSibling);
                } else {
                    parent.appendChild(debugOverlay);
                }
            } else if (document.body) {
                document.body.appendChild(debugOverlay);
            }

            if (this.debugConsoleOriginalStyleText === null) {
                debugOverlay.removeAttribute('style');
            } else if (this.debugConsoleOriginalStyleText) {
                debugOverlay.setAttribute('style', this.debugConsoleOriginalStyleText);
            } else {
                debugOverlay.removeAttribute('style');
            }

            if (typeof window.MobileDebug.render === 'function') {
                window.MobileDebug.render();
            }
        }

        if (this.debugConsoleModalEl && this.debugConsoleModalEl.parentElement) {
            this.debugConsoleModalEl.remove();
        }
        this.debugConsoleModalEl = null;
    }

    makePanelDraggable() {
        if (!this.panel || !this.headerEl) return;
        this.headerEl.addEventListener('pointerdown', (event) => {
            if (event.target && event.target.closest('button')) return;
            const rect = this.panel.getBoundingClientRect();
            this.isDraggingPanel = true;
            this.dragState = {
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top
            };
            this.panel.style.right = 'auto';
            this.panel.style.bottom = 'auto';
            this.headerEl.setPointerCapture(event.pointerId);
        });

        this.headerEl.addEventListener('pointermove', (event) => {
            if (!this.isDraggingPanel || !this.dragState) return;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const rect = this.panel.getBoundingClientRect();
            const maxLeft = Math.max(0, vw - rect.width);
            const maxTop = Math.max(0, vh - 40);
            const left = Math.min(maxLeft, Math.max(0, event.clientX - this.dragState.offsetX));
            const top = Math.min(maxTop, Math.max(0, event.clientY - this.dragState.offsetY));
            this.panel.style.left = `${left}px`;
            this.panel.style.top = `${top}px`;
        });

        const stopDrag = (event) => {
            if (!this.isDraggingPanel) return;
            this.isDraggingPanel = false;
            this.dragState = null;
            try {
                this.headerEl.releasePointerCapture(event.pointerId);
            } catch (_) { }
        };
        this.headerEl.addEventListener('pointerup', stopDrag);
        this.headerEl.addEventListener('pointercancel', stopDrag);
    }

    makePanelResizable() {
        if (!this.panel) return;
        const handle = document.createElement('div');
        handle.className = 'dev-resize-handle';
        this.panel.appendChild(handle);

        handle.addEventListener('pointerdown', (event) => {
            const rect = this.panel.getBoundingClientRect();
            this.isResizingPanel = true;
            this.resizeState = {
                startX: event.clientX,
                startY: event.clientY,
                width: rect.width,
                height: rect.height
            };
            handle.setPointerCapture(event.pointerId);
            event.preventDefault();
            event.stopPropagation();
        });

        handle.addEventListener('pointermove', (event) => {
            if (!this.isResizingPanel || !this.resizeState) return;
            const dx = event.clientX - this.resizeState.startX;
            const dy = event.clientY - this.resizeState.startY;
            const minW = 760;
            const minH = 500;
            const maxW = window.innerWidth - 16;
            const maxH = window.innerHeight - 16;
            const nextW = Math.min(maxW, Math.max(minW, this.resizeState.width + dx));
            const nextH = Math.min(maxH, Math.max(minH, this.resizeState.height + dy));
            this.panel.style.width = `${nextW}px`;
            this.panel.style.height = `${nextH}px`;
            this.renderCreatorCanvas();
        });

        const stopResize = (event) => {
            if (!this.isResizingPanel) return;
            this.isResizingPanel = false;
            this.resizeState = null;
            try {
                handle.releasePointerCapture(event.pointerId);
            } catch (_) { }
        };
        handle.addEventListener('pointerup', stopResize);
        handle.addEventListener('pointercancel', stopResize);
    }

    bindPanelControls() {
        if (!this.panel) return;
        this.panel.querySelectorAll('[data-dev-action]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.devAction;
                if (action === 'random-polygon') this.createRandomShape();
                if (action === 'standard-polygons') this.openStandardPolygonsModal();
                if (action === 'regen-seed') this.createRandomShape(false);
                if (action === 'clear-all') this.clearCreator();
                if (action === 'toggle-draw-custom') this.toggleDrawCustomMode();
                if (action === 'solve-creator') this.solveToTarget();
                if (action === 'hardcore-save') this.runHardcoreSaveFlow();
                if (action === 'open-debug-console') this.openDebugConsoleModal();
            });
        });

        const gridInput = this.panel.querySelector('#devGridSize');
        const lockInput = this.panel.querySelector('#devGridLock');
        const tpInput = this.panel.querySelector('#devTargetPieces');
        const mlInput = this.panel.querySelector('#devMaxLines');
        const vertsRange = this.panel.querySelector('#devVerticesRange');
        const symmetryToggle = this.panel.querySelector('#devSymmetryToggle');
        const solveLines = this.panel.querySelector('#devSolveLines');
        const effortRange = this.panel.querySelector('#devEffortRange');
        const maxDiffAllowedInput = this.panel.querySelector('#devMaxDiffAllowed');
        const strictModeToggle = this.panel.querySelector('#devStrictModeToggle');
        const autoMaximizeToggle = this.panel.querySelector('#devAutoMaximizeToggle');
        const seedInput = this.panel.querySelector('#devSeedInput');
        const levelDropdown = this.panel.querySelector('#devLevelDropdown');
        const levelLoadBtn = this.panel.querySelector('#devLevelLoadBtn');
        const levelEditBtn = this.panel.querySelector('#devLevelEditBtn');
        const undoBtn = this.panel.querySelector('#devCanvasUndoBtn');
        const redoBtn = this.panel.querySelector('#devCanvasRedoBtn');
        const zoomInBtn = this.panel.querySelector('#devCanvasZoomInBtn');
        const zoomOutBtn = this.panel.querySelector('#devCanvasZoomOutBtn');
        const populateNumericSelect = (selectEl, min, max, step = 1) => {
            if (!selectEl || selectEl.tagName !== 'SELECT') return;
            if (selectEl.options.length) return;
            for (let v = min; v <= max; v += step) {
                const opt = document.createElement('option');
                opt.value = `${v}`;
                opt.textContent = `${v}`;
                selectEl.appendChild(opt);
            }
        };
        populateNumericSelect(vertsRange, 3, 18, 1);
        populateNumericSelect(solveLines, 1, 12, 1);
        populateNumericSelect(effortRange, 1, 10, 1);

        if (gridInput) gridInput.addEventListener('input', () => { this.creatorState.gridSize = Math.max(8, Math.min(80, Number(gridInput.value) || 24)); this.renderCreatorCanvas(); });
        if (lockInput) lockInput.addEventListener('change', () => { this.creatorState.gridLock = !!lockInput.checked; this.syncCreatorControlText(); this.renderCreatorCanvas(); });
        if (tpInput) tpInput.addEventListener('input', () => {
            this.creatorState.targetPieces = Math.max(2, Math.min(16, Number(tpInput.value) || 4));
            this.syncCreatorControlText();
            this.updateCreatorInfo();
        });
        if (mlInput) mlInput.addEventListener('input', () => {
            this.creatorState.maxLines = Math.max(1, Math.min(12, Number(mlInput.value) || 3));
            this.syncCreatorControlText();
            this.updateCreatorInfo();
        });
        if (vertsRange) vertsRange.addEventListener('input', () => {
            this.creatorState.vertexCount = Math.max(3, Math.min(18, Number(vertsRange.value) || 8));
            this.syncCreatorControlText();
        });
        if (symmetryToggle) symmetryToggle.addEventListener('change', () => {
            this.creatorState.symmetryEnabled = !!symmetryToggle.checked;
            this.createRandomShape();
        });
        if (solveLines) solveLines.addEventListener('input', () => {
            this.creatorState.maxLines = Math.max(1, Math.min(12, Number(solveLines.value) || 3));
            if (mlInput) mlInput.value = `${this.creatorState.maxLines}`;
            this.syncCreatorControlText();
            this.updateCreatorInfo();
        });
        if (effortRange) effortRange.addEventListener('input', () => {
            this.creatorState.searchEffort = Math.max(1, Math.min(10, Number(effortRange.value) || 5));
            this.syncCreatorControlText();
        });
        if (maxDiffAllowedInput) maxDiffAllowedInput.addEventListener('input', () => {
            this.creatorState.maxDifferentialPercent = Math.max(0.1, Math.min(100, Number(maxDiffAllowedInput.value) || 5));
            this.syncCreatorControlText();
            this.updateCreatorInfo();
            this.renderCreatorCanvas();
        });
        if (strictModeToggle) strictModeToggle.addEventListener('change', () => {
            this.creatorState.strictMode = !!strictModeToggle.checked;
            this.syncCreatorControlText();
            this.updateCreatorInfo();
        });
        if (autoMaximizeToggle) autoMaximizeToggle.addEventListener('change', () => {
            this.creatorState.autoMaximize = !!autoMaximizeToggle.checked;
            this.syncCreatorControlText();
            this.updateCreatorInfo();
        });
        if (seedInput) seedInput.addEventListener('input', () => {
            this.creatorState.seed = Math.max(1, Number(seedInput.value) || 12345);
        });
        if (levelDropdown) levelDropdown.addEventListener('change', () => {
            this.creatorState.selectedLevelIndex = Math.max(0, Number(levelDropdown.value) || 0);
            this.hydrateCreatorFromCurrentLevel(true, this.creatorState.selectedLevelIndex);
            this.syncCreatorControls();
            this.syncCreatorControlText();
            this.updateCreatorInfo();
            this.renderCreatorCanvas();
        });
        if (levelLoadBtn) levelLoadBtn.addEventListener('click', () => {
            this.loadLevel(this.creatorState.selectedLevelIndex || 0);
            this.populateList();
        });
        if (levelEditBtn) levelEditBtn.addEventListener('click', async () => {
            await this.openLevelEditModal(this.creatorState.selectedLevelIndex || 0);
            this.populateList();
        });
        if (undoBtn) undoBtn.addEventListener('click', () => this.undoCreatorEdit());
        if (redoBtn) redoBtn.addEventListener('click', () => this.redoCreatorEdit());
        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomCreatorIn());
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomCreatorOut());

        if (!this.creatorHotkeysBound) {
            window.addEventListener('keydown', (e) => {
                if (!this.isVisible || !this.panel || this.panel.style.display === 'none') return;
                const isZ = (e.key === 'z' || e.key === 'Z');
                const isY = (e.key === 'y' || e.key === 'Y');
                if (e.ctrlKey && isZ && !e.shiftKey) {
                    e.preventDefault();
                    this.undoCreatorEdit();
                } else if (e.ctrlKey && (isY || (isZ && e.shiftKey))) {
                    e.preventDefault();
                    this.redoCreatorEdit();
                }
            });
            this.creatorHotkeysBound = true;
        }

        if (!this.creatorGlobalPointerBound) {
            this.boundCreatorPointerRelease = () => this.onCanvasPointerUp();
            window.addEventListener('mouseup', this.boundCreatorPointerRelease, true);
            window.addEventListener('pointerup', this.boundCreatorPointerRelease, true);
            window.addEventListener('pointercancel', this.boundCreatorPointerRelease, true);
            window.addEventListener('blur', this.boundCreatorPointerRelease);
            this.creatorGlobalPointerBound = true;
        }

        this.syncCreatorControls();
        this.syncCreatorControlText();
        this.updateCreatorUndoRedoButtons();

        if (this.creatorCanvas) {
            this.creatorCanvas.addEventListener('mousedown', (e) => this.onCanvasPointerDown(e));
            this.creatorCanvas.addEventListener('mousemove', (e) => this.onCanvasPointerMove(e));
            this.creatorCanvas.addEventListener('mouseup', () => this.onCanvasPointerUp());
            this.creatorCanvas.addEventListener('mouseleave', () => this.onCanvasPointerUp());
            this.creatorCanvas.addEventListener('dblclick', (e) => this.onCanvasDoubleClick(e));
        }
    }

    openStandardPolygonsModal() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,.72);z-index:12000;display:flex;align-items:center;justify-content:center;';
            const card = document.createElement('div');
            card.style.cssText = 'background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:12px;padding:20px;width:min(800px, 90vw);max-height:80vh;display:flex;flex-direction:column;gap:16px;';

            card.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <h3 style="margin:0;font-size:18px;color:#38bdf8;">Standard Polygons</h3>
                    <button data-act="close" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:24px;">&times;</button>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(120px, 1fr));gap:16px;overflow-y:auto;padding-right:8px;" id="stdPolyGrid"></div>
            `;

            const shapes = [
                { name: 'Triangle', vertices: 3 },
                { name: 'Quadrilateral', vertices: 4 },
                { name: 'Pentagon', vertices: 5 },
                { name: 'Hexagon', vertices: 6 },
                { name: 'Heptagon', vertices: 7 },
                { name: 'Octagon', vertices: 8 },
                { name: 'Nonagon', vertices: 9 },
                { name: 'Decagon', vertices: 10 }
            ];

            const grid = card.querySelector('#stdPolyGrid');

            shapes.forEach(shape => {
                const item = document.createElement('div');
                item.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;padding:10px;border-radius:8px;background:#1e293b;border:1px solid #334155;transition:all 0.2s;';
                item.onmouseenter = () => { item.style.background = '#334155'; item.style.borderColor = '#64748b'; };
                item.onmouseleave = () => { item.style.background = '#1e293b'; item.style.borderColor = '#334155'; };

                const cvs = document.createElement('canvas');
                cvs.width = 80;
                cvs.height = 80;
                const ctx = cvs.getContext('2d');

                const cx = 40;
                const cy = 40;
                const radius = 30;

                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.beginPath();

                for (let i = 0; i < shape.vertices; i++) {
                    const angle = (i * 2 * Math.PI / shape.vertices) - Math.PI / 2;
                    const x = cx + radius * Math.cos(angle);
                    const y = cy + radius * Math.sin(angle);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();
                ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
                ctx.fill();

                const label = document.createElement('div');
                label.textContent = shape.name;
                label.style.fontSize = '12px';
                label.style.textAlign = 'center';

                item.appendChild(cvs);
                item.appendChild(label);

                item.onclick = () => {
                    this.createStandardPolygon(shape.vertices);
                    overlay.remove();
                    resolve();
                };

                grid.appendChild(item);
            });

            overlay.appendChild(card);
            document.body.appendChild(overlay);

            const close = () => { overlay.remove(); resolve(); };
            card.querySelector('[data-act="close"]').onclick = close;
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        });
    }

    createStandardPolygon(sides) {
        if (this.solverState && this.solverState.running) this.stopSolver();
        this.pushCreatorHistory(this.snapshotCreatorGeometry());

        const cx = 0;
        const cy = 0;
        const radius = 120;

        const out = [];
        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
            out.push({
                x: cx + Math.cos(angle) * radius,
                y: cy + Math.sin(angle) * radius
            });
        }

        this.creatorState.vertices = out;
        this.creatorState.vertexCount = sides;
        this.creatorState.lines = [];
        this.creatorState.drawCustomMode = false;
        this.creatorState.customMouseWorld = null;
        this.creatorState.customDrawError = '';
        this.computeAndStoreCreatorBoundary(this.creatorState.vertices);

        const vertsRange = this.panel ? this.panel.querySelector('#devVerticesRange') : null;
        if (vertsRange) vertsRange.value = sides;

        this.creatorViewDirty = true;
        this.syncCreatorControls();
        this.syncCreatorControlText();
        this.updateCreatorInfo();
        this.renderCreatorCanvas();
        this.updateCreatorUndoRedoButtons();
    }

    syncCreatorControls() {
        if (!this.panel) return;
        const map = {
            '#devGridSize': this.creatorState.gridSize,
            '#devGridLock': this.creatorState.gridLock,
            '#devTargetPieces': this.creatorState.targetPieces,
            '#devMaxLines': this.creatorState.maxLines,
            '#devVerticesRange': this.creatorState.vertexCount,
            '#devSymmetryToggle': this.creatorState.symmetryEnabled,
            '#devSolveLines': this.creatorState.maxLines,
            '#devEffortRange': this.creatorState.searchEffort,
            '#devMaxDiffAllowed': this.getCreatorMaxDifferentialPercent(),
            '#devStrictModeToggle': this.creatorState.strictMode,
            '#devAutoMaximizeToggle': this.creatorState.autoMaximize,
            '#devSeedInput': this.creatorState.seed
        };
        Object.entries(map).forEach(([selector, value]) => {
            const el = this.panel.querySelector(selector);
            if (!el) return;
            if (el.type === 'checkbox') el.checked = !!value;
            else el.value = `${value}`;
        });
    }

    syncCreatorControlText() {
        if (!this.panel) return;
        const drawBtn = this.panel.querySelector('#devDrawCustomBtn');
        const gridLockLabel = this.panel.querySelector('#devGridLockLabel');
        const symStatus = this.panel.querySelector('#devSymmetryStatus');
        const autoStatus = this.panel.querySelector('#devAutoModeStatus');
        const maxPiecesValue = this.panel.querySelector('#devMaxPiecesValue');
        const maxPiecesSummary = this.getShapeAwareMaxPiecesSummary(this.creatorState.maxLines, this.creatorState.vertices);
        if (maxPiecesValue) {
            maxPiecesValue.textContent = `${maxPiecesSummary.adjusted} (shape) / ${maxPiecesSummary.theoretical}`;
            maxPiecesValue.title = `Shape-aware estimate: ${maxPiecesSummary.adjusted}, theoretical line-only cap: ${maxPiecesSummary.theoretical}, shape factor: ${(maxPiecesSummary.shapeFactor * 100).toFixed(1)}%`;
        }
        if (symStatus) {
            symStatus.textContent = this.creatorState.symmetryEnabled ? 'ON - Perfect Symmetry' : 'OFF - Random Shape';
            symStatus.classList.toggle('on', this.creatorState.symmetryEnabled);
            symStatus.classList.toggle('off', !this.creatorState.symmetryEnabled);
        }
        if (autoStatus) {
            const strictSuffix = this.creatorState.strictMode ? ' • Strict ON' : ' • Strict OFF';
            const shapeSuffix = ` • Shape ${(maxPiecesSummary.shapeFactor * 100).toFixed(0)}%`;
            autoStatus.textContent = (this.creatorState.autoMaximize ? 'ON - Find max valid' : `OFF - Target ${this.creatorState.targetPieces}`) + strictSuffix + shapeSuffix;
            autoStatus.classList.toggle('on', this.creatorState.autoMaximize);
            autoStatus.classList.toggle('off', !this.creatorState.autoMaximize);
        }
        if (gridLockLabel) gridLockLabel.textContent = this.creatorState.gridLock ? 'ON' : 'OFF';
        if (drawBtn) {
            drawBtn.textContent = this.creatorState.drawCustomMode ? 'Drawing...' : 'Draw Custom';
            drawBtn.style.background = this.creatorState.drawCustomMode ? '#8670d4' : '#6d59b8';
            drawBtn.style.borderColor = this.creatorState.drawCustomMode ? '#b29eff' : '#8d78de';
            drawBtn.style.color = '#f8f4ff';
        }
    }

    getCanvasPoint(evt) {
        const rect = this.creatorCanvas.getBoundingClientRect();
        let sx = evt.clientX - rect.left;
        let sy = evt.clientY - rect.top;
        const g = this.creatorState.gridSize;
        const world = this.screenToWorldPoint(sx, sy);
        if (this.creatorState.gridLock) {
            world.x = Math.round(world.x / g) * g;
            world.y = Math.round(world.y / g) * g;
        }
        return world;
    }

    screenToWorldPoint(sx, sy) {
        const view = this.creatorView || { scale: 1, offsetX: 0, offsetY: 0 };
        const scale = Math.max(0.0001, view.scale || 1);
        return {
            x: (sx - (view.offsetX || 0)) / scale,
            y: (sy - (view.offsetY || 0)) / scale
        };
    }

    syncCreatorCanvasSize() {
        if (!this.creatorCanvas) return null;
        const rect = this.creatorCanvas.getBoundingClientRect();
        const width = Math.max(320, Math.floor(rect.width || 820));
        const height = Math.max(220, Math.floor(rect.height || 470));
        const dpr = window.devicePixelRatio || 1;
        const targetW = Math.floor(width * dpr);
        const targetH = Math.floor(height * dpr);
        if (this.creatorCanvas.width !== targetW || this.creatorCanvas.height !== targetH) {
            this.creatorCanvas.width = targetW;
            this.creatorCanvas.height = targetH;
        }
        return { width, height, dpr };
    }

    computeCreatorView(width, height) {
        const verts = this.creatorState.vertices || [];
        const viewport = this.getCreatorGameplayViewportScreenRect(width, height);
        if (verts.length < 1) {
            return {
                scale: 1,
                offsetX: viewport.x + viewport.width / 2,
                offsetY: viewport.y + viewport.height / 2
            };
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        verts.forEach(v => {
            minX = Math.min(minX, v.x);
            minY = Math.min(minY, v.y);
            maxX = Math.max(maxX, v.x);
            maxY = Math.max(maxY, v.y);
        });

        const boundsW = Math.max(1e-6, maxX - minX);
        const boundsH = Math.max(1e-6, maxY - minY);
        // Match gameplay fit padding contract used by BeginnerMode.setupLevel -> fitViewToPolygon(..., 0.3)
        const fitPadding = 0.3;
        const availableW = Math.max(1, viewport.width * (1 - fitPadding * 2));
        const availableH = Math.max(1, viewport.height * (1 - fitPadding * 2));
        const fitScale = Math.min(availableW / boundsW, availableH / boundsH);
        const baseScale = Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 1;
        const userZoom = this.clampValue(
            Number(this.creatorState.zoomLevel) || 1,
            Number(this.creatorState.minZoomLevel) || 0.6,
            Number(this.creatorState.maxZoomLevel) || 2.4
        );
        const scale = baseScale * userZoom;

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        return {
            scale,
            offsetX: viewport.x + viewport.width / 2 - centerX * scale,
            offsetY: viewport.y + viewport.height / 2 - centerY * scale
        };
    }

    hitVertex(pt) {
        const verts = this.creatorState.vertices;
        for (let i = 0; i < verts.length; i++) {
            const v = verts[i];
            const d2 = (v.x - pt.x) ** 2 + (v.y - pt.y) ** 2;
            if (d2 <= 100) return i;
        }
        return -1;
    }

    worldDistance(a, b) {
        if (!a || !b) return Infinity;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.hypot(dx, dy);
    }

    createSeededRng(seed) {
        let s = (Number(seed) || 1) >>> 0;
        return {
            next: () => {
                s = (1664525 * s + 1013904223) >>> 0;
                return s / 4294967296;
            },
            range: (min, max) => min + (max - min) * ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296)
        };
    }

    getVerticesBounds(vertices = this.creatorState.vertices) {
        if (!vertices || vertices.length < 1) return null;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        vertices.forEach(v => {
            minX = Math.min(minX, v.x);
            minY = Math.min(minY, v.y);
            maxX = Math.max(maxX, v.x);
            maxY = Math.max(maxY, v.y);
        });
        return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    }

    computeAndStoreCreatorBoundary(sourceVertices = this.creatorState.vertices) {
        if (!this.creatorCanvas) {
            const fallback = { x: -180, y: -100, width: 360, height: 200 };
            this.creatorState.drawBoundary = fallback;
            return fallback;
        }

        const size = this.syncCreatorCanvasSize() || { width: 820, height: 470 };
        const viewport = this.getCreatorGameplayViewportScreenRect(size.width, size.height);
        const topLeft = this.screenToWorldPoint(viewport.x, viewport.y);
        const bottomRight = this.screenToWorldPoint(viewport.x + viewport.width, viewport.y + viewport.height);
        const grid = this.getGameplayGridSize();

        let boundary = {
            x: Math.min(topLeft.x, bottomRight.x),
            y: Math.min(topLeft.y, bottomRight.y),
            width: Math.abs(bottomRight.x - topLeft.x),
            height: Math.abs(bottomRight.y - topLeft.y)
        };

        if (this.creatorState.gridLock) {
            const x1 = Math.round(boundary.x / grid) * grid;
            const y1 = Math.round(boundary.y / grid) * grid;
            const x2 = Math.round((boundary.x + boundary.width) / grid) * grid;
            const y2 = Math.round((boundary.y + boundary.height) / grid) * grid;
            boundary = {
                x: Math.min(x1, x2),
                y: Math.min(y1, y2),
                width: Math.max(grid * 6, Math.abs(x2 - x1)),
                height: Math.max(grid * 4, Math.abs(y2 - y1))
            };
        }

        this.creatorState.drawBoundary = boundary;
        return boundary;
    }

    getCreatorBoundary() {
        if (!this.creatorState.drawBoundary) {
            return this.computeAndStoreCreatorBoundary();
        }
        return this.creatorState.drawBoundary;
    }

    isPointInsideCreatorBoundary(point, margin = 0) {
        const b = this.getCreatorBoundary();
        if (!b || !point) return true;
        return (
            point.x >= b.x + margin &&
            point.x <= b.x + b.width - margin &&
            point.y >= b.y + margin &&
            point.y <= b.y + b.height - margin
        );
    }

    constrainPointToCreatorBoundary(point) {
        const b = this.getCreatorBoundary();
        if (!b || !point) return point;
        return {
            x: this.clampValue(point.x, b.x, b.x + b.width),
            y: this.clampValue(point.y, b.y, b.y + b.height)
        };
    }

    clipPolygonToRect(vertices, rect) {
        if (!Array.isArray(vertices) || vertices.length < 3 || !rect) return [];

        const edges = [
            {
                inside: (p) => p.x >= rect.x,
                intersect: (a, b) => {
                    const dx = b.x - a.x;
                    if (Math.abs(dx) < 1e-9) return { x: rect.x, y: a.y };
                    const t = (rect.x - a.x) / dx;
                    return { x: rect.x, y: a.y + (b.y - a.y) * t };
                }
            },
            {
                inside: (p) => p.x <= rect.x + rect.width,
                intersect: (a, b) => {
                    const xMax = rect.x + rect.width;
                    const dx = b.x - a.x;
                    if (Math.abs(dx) < 1e-9) return { x: xMax, y: a.y };
                    const t = (xMax - a.x) / dx;
                    return { x: xMax, y: a.y + (b.y - a.y) * t };
                }
            },
            {
                inside: (p) => p.y >= rect.y,
                intersect: (a, b) => {
                    const dy = b.y - a.y;
                    if (Math.abs(dy) < 1e-9) return { x: a.x, y: rect.y };
                    const t = (rect.y - a.y) / dy;
                    return { x: a.x + (b.x - a.x) * t, y: rect.y };
                }
            },
            {
                inside: (p) => p.y <= rect.y + rect.height,
                intersect: (a, b) => {
                    const yMax = rect.y + rect.height;
                    const dy = b.y - a.y;
                    if (Math.abs(dy) < 1e-9) return { x: a.x, y: yMax };
                    const t = (yMax - a.y) / dy;
                    return { x: a.x + (b.x - a.x) * t, y: yMax };
                }
            }
        ];

        let output = vertices.map(v => ({ x: Number(v.x), y: Number(v.y) }));
        for (const edge of edges) {
            const input = output;
            output = [];
            if (!input.length) break;

            let prev = input[input.length - 1];
            for (const curr of input) {
                const currInside = edge.inside(curr);
                const prevInside = edge.inside(prev);

                if (currInside) {
                    if (!prevInside) output.push(edge.intersect(prev, curr));
                    output.push(curr);
                } else if (prevInside) {
                    output.push(edge.intersect(prev, curr));
                }
                prev = curr;
            }
        }
        return output;
    }

    getClippedCreatorVerticesForSave() {
        const boundary = this.getCreatorBoundary();
        const source = (this.creatorState.vertices || []).map(v => ({ x: v.x, y: v.y }));
        if (!boundary || source.length < 3) return [];

        const clipped = this.clipPolygonToRect(source, boundary);
        if (!clipped || clipped.length < 3) return [];

        const sanitized = (typeof Geometry !== 'undefined' && typeof Geometry.sanitizePolygon === 'function')
            ? Geometry.sanitizePolygon(clipped, { minAbsArea: 1e-8, collinearEps: 1e-6 })
            : clipped;

        return Array.isArray(sanitized) && sanitized.length >= 3
            ? sanitized.map(v => ({ x: Number(v.x), y: Number(v.y) }))
            : [];
    }

    getTheoreticalMaxPiecesForLines(numLines) {
        const n = Math.max(1, Number(numLines) || 1);
        return (n * (n + 1)) / 2 + 1;
    }

    // Backward-compatible alias: theoretical (line-count only) bound.
    getMaxPiecesForLines(numLines) {
        return this.getTheoreticalMaxPiecesForLines(numLines);
    }

    computeConvexHull(vertices) {
        if (!Array.isArray(vertices) || vertices.length < 3) return [];
        const points = vertices
            .map(v => ({ x: Number(v?.x), y: Number(v?.y) }))
            .filter(v => Number.isFinite(v.x) && Number.isFinite(v.y));
        if (points.length < 3) return [];

        // Deduplicate first
        const dedup = [];
        const seen = new Set();
        points.forEach(p => {
            const key = `${Math.round(p.x * 1e6)}:${Math.round(p.y * 1e6)}`;
            if (seen.has(key)) return;
            seen.add(key);
            dedup.push(p);
        });
        if (dedup.length < 3) return [];

        const sorted = dedup.sort((a, b) => (a.x - b.x) || (a.y - b.y));
        const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

        const lower = [];
        sorted.forEach(p => {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
                lower.pop();
            }
            lower.push(p);
        });

        const upper = [];
        for (let i = sorted.length - 1; i >= 0; i--) {
            const p = sorted[i];
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
                upper.pop();
            }
            upper.push(p);
        }

        upper.pop();
        lower.pop();
        const hull = lower.concat(upper);
        return hull.length >= 3 ? hull : [];
    }

    countReflexVertices(vertices) {
        if (!Array.isArray(vertices) || vertices.length < 4) return 0;
        const n = vertices.length;
        const area = Number(Geometry.getArea(vertices)) || 0;
        const orientation = area >= 0 ? 1 : -1;
        let reflex = 0;

        for (let i = 0; i < n; i++) {
            const prev = vertices[(i - 1 + n) % n];
            const curr = vertices[i];
            const next = vertices[(i + 1) % n];
            const e1x = curr.x - prev.x;
            const e1y = curr.y - prev.y;
            const e2x = next.x - curr.x;
            const e2y = next.y - curr.y;
            const c = e1x * e2y - e1y * e2x;
            const isReflex = orientation > 0 ? c < -1e-6 : c > 1e-6;
            if (isReflex) reflex += 1;
        }

        return reflex;
    }

    getShapeFactor(vertices) {
        if (!Array.isArray(vertices) || vertices.length < 3) return 1;

        const area = Math.abs(Number(Geometry.getArea(vertices)) || 0);
        const perimeter = Math.max(1e-9, Number(Geometry.getPerimeter(vertices)) || 0);
        if (!(area > 0)) return 1;

        const hull = this.computeConvexHull(vertices);
        const hullArea = hull.length >= 3 ? Math.abs(Number(Geometry.getArea(hull)) || 0) : area;
        const convexity = this.clampValue(area / Math.max(area, hullArea || area), 0, 1);

        // Isoperimetric compactness in [0, 1], higher is more circle/compact-like.
        const compactnessRaw = (4 * Math.PI * area) / Math.max(1e-9, perimeter * perimeter);
        const compactness = this.clampValue(compactnessRaw, 0, 1);

        const reflexCount = this.countReflexVertices(vertices);
        const reflexRatio = this.clampValue(reflexCount / Math.max(1, vertices.length), 0, 1);

        // Weighted robust factor: convexity + compactness + concavity penalty.
        const raw = (0.45 * convexity) + (0.35 * compactness) + (0.20 * (1 - reflexRatio));
        return this.clampValue(raw, 0.55, 1.0);
    }

    getShapeAdjustedMaxPiecesForLines(numLines, vertices = this.creatorState.vertices) {
        const theoretical = this.getTheoreticalMaxPiecesForLines(numLines);
        if (!Array.isArray(vertices) || vertices.length < 3) return theoretical;

        const shapeFactor = this.getShapeFactor(vertices);
        const estimate = Math.round(2 + Math.max(0, (theoretical - 2)) * shapeFactor);
        return this.clampValue(estimate, 2, theoretical);
    }

    getShapeAwareMaxPiecesSummary(numLines, vertices = this.creatorState.vertices) {
        const theoretical = this.getTheoreticalMaxPiecesForLines(numLines);
        if (!Array.isArray(vertices) || vertices.length < 3) {
            return {
                theoretical,
                adjusted: theoretical,
                shapeFactor: 1
            };
        }
        const shapeFactor = this.getShapeFactor(vertices);
        const adjusted = this.getShapeAdjustedMaxPiecesForLines(numLines, vertices);
        return { theoretical, adjusted, shapeFactor };
    }

    onCanvasPointerDown(evt) {
        if (!this.creatorCanvas) return;
        this.stopSolver();
        const rawPoint = this.getCanvasPoint(evt);
        let pt = this.constrainPointToCreatorBoundary(rawPoint);
        if (this.creatorState.gridLock) {
            const g = Math.max(8, Number(this.creatorState.gridSize) || 24);
            pt = {
                x: Math.round(pt.x / g) * g,
                y: Math.round(pt.y / g) * g
            };
            pt = this.constrainPointToCreatorBoundary(pt);
        }
        const outOfBounds = !this.isPointInsideCreatorBoundary(rawPoint, 0);

        if (this.creatorState.drawCustomMode) {
            if (outOfBounds) {
                this.creatorState.customDrawError = 'Point clamped to drawing boundary.';
            }
            if (this.creatorState.vertices.length >= 3) {
                const first = this.creatorState.vertices[0];
                const closeDistance = 14 / Math.max(0.001, this.creatorView.scale || 1);
                if (this.worldDistance(pt, first) <= closeDistance) {
                    if (this.wouldSelfIntersectOnClose(this.creatorState.vertices)) {
                        this.creatorState.customDrawError = 'Cannot close shape: edge would self-intersect.';
                        this.updateCreatorInfo();
                        this.renderCreatorCanvas();
                        return;
                    }
                    this.creatorState.drawCustomMode = false;
                    this.creatorState.customDrawError = '';
                    this.syncCreatorControlText();
                    this.updateCreatorInfo();
                    this.renderCreatorCanvas();
                    this.updateCreatorUndoRedoButtons();
                    return;
                }
            }
            const last = this.creatorState.vertices[this.creatorState.vertices.length - 1];
            if (last && this.worldDistance(pt, last) < 0.0001) {
                return;
            }
            if (this.wouldSelfIntersectOnAdd(this.creatorState.vertices, pt)) {
                this.creatorState.customDrawError = 'Segment blocked: would self-intersect existing edge.';
                this.updateCreatorInfo();
                this.renderCreatorCanvas();
                return;
            }
            this.pushCreatorHistory(this.snapshotCreatorGeometry());
            this.creatorState.vertices.push(pt);
            this.creatorState.lines = [];
            this.creatorState.customMouseWorld = null;
            this.creatorState.customDrawError = '';
            this.updateCreatorInfo();
            this.renderCreatorCanvas();
            this.updateCreatorUndoRedoButtons();
            return;
        }

        const hit = this.hitVertex(pt);
        if (hit >= 0) {
            this.creatorState.draggingVertexIndex = hit;
            this.pendingDragSnapshot = this.snapshotCreatorGeometry();
            return;
        }
        if (!this.creatorState.drawingLineStart) {
            this.creatorState.drawingLineStart = pt;
        } else {
            const start = this.creatorState.drawingLineStart;
            const line = { start, end: pt };
            if (((start.x - pt.x) ** 2 + (start.y - pt.y) ** 2) > 16) {
                this.pushCreatorHistory(this.snapshotCreatorGeometry());
                this.creatorState.lines.push(line);
                this.updateCreatorUndoRedoButtons();
            }
            this.creatorState.drawingLineStart = null;
        }
        this.updateCreatorInfo();
        this.renderCreatorCanvas();
    }

    onCanvasPointerMove(evt) {
        if (!this.creatorCanvas) return;
        const pt = this.constrainPointToCreatorBoundary(this.getCanvasPoint(evt));
        if (this.creatorState.drawCustomMode) {
            this.creatorState.customMouseWorld = pt;
            this.renderCreatorCanvas();
            return;
        }
        if (this.creatorState.draggingVertexIndex >= 0) {
            this.creatorState.vertices[this.creatorState.draggingVertexIndex] = pt;
            this.renderCreatorCanvas();
            return;
        }
        this.creatorState.hoverVertexIndex = this.hitVertex(pt);
    }

    onCanvasPointerUp() {
        if (this.pendingDragSnapshot && this.creatorState.draggingVertexIndex >= 0) {
            const before = JSON.stringify(this.pendingDragSnapshot.vertices || []);
            const after = JSON.stringify(this.creatorState.vertices || []);
            if (before !== after) {
                this.pushCreatorHistory(this.pendingDragSnapshot);
            }
        }
        this.pendingDragSnapshot = null;
        this.creatorState.draggingVertexIndex = -1;
        this.creatorState.hoverVertexIndex = -1;
        this.creatorState.customMouseWorld = null;
        this.syncCreatorControlText();
        this.updateCreatorInfo();
        this.renderCreatorCanvas();
        this.updateCreatorUndoRedoButtons();
    }

    onCanvasDoubleClick(evt) {
        if (this.creatorState.drawCustomMode) return;
        const pt = this.constrainPointToCreatorBoundary(this.getCanvasPoint(evt));
        const hit = this.hitVertex(pt);
        this.pushCreatorHistory(this.snapshotCreatorGeometry());
        if (hit >= 0 && this.creatorState.vertices.length > 3) {
            this.creatorState.vertices.splice(hit, 1);
        } else {
            this.creatorState.vertices.push(pt);
        }
        this.creatorState.customDrawError = '';
        this.syncCreatorControlText();
        this.updateCreatorInfo();
        this.renderCreatorCanvas();
        this.updateCreatorUndoRedoButtons();
    }

    hydrateCreatorFromCurrentLevel(force = false, preferredIndex = null) {
        this.stopSolver();
        const modeIndex = this.game.currentMode ? this.game.currentMode.currentLevelIndex : 0;
        if (!force && this.creatorState.vertices.length > 2) return;
        let idx;
        if (Number.isFinite(Number(preferredIndex))) {
            idx = Number(preferredIndex);
        } else if (force && Number.isFinite(Number(this.creatorState.selectedLevelIndex))) {
            idx = Number(this.creatorState.selectedLevelIndex);
        } else {
            idx = Number.isFinite(modeIndex) ? modeIndex : 0;
        }
        idx = Math.max(0, Math.min(this.game.levels.length - 1, idx));
        const level = this.game.levels[idx] || this.game.levels[0];
        if (!level) return;
        this.creatorState.selectedLevelIndex = idx;
        this.creatorState.vertices = (level.startShapeVertices || []).map(v => ({ x: v.x, y: v.y }));
        this.creatorState.lines = [];
        this.creatorState.drawCustomMode = false;
        this.creatorState.customMouseWorld = null;
        this.creatorState.targetPieces = level.targetPieces || 4;
        this.creatorState.maxLines = level.maxLines || 3;
        const stars = this.game.getLevelStarThresholds(level);
        this.creatorState.starPercent = {
            one: Math.round(stars.one * 100),
            two: Math.round(stars.two * 100),
            three: Math.round(stars.three * 100)
        };
        this.computeAndStoreCreatorBoundary(this.creatorState.vertices);
        this.creatorViewDirty = true;
    }

    createRandomShape(incrementSeed = true) {
        this.stopSolver();
        this.pushCreatorHistory(this.snapshotCreatorGeometry());
        const cx = 0;
        const cy = 0;
        const rng = this.createSeededRng(this.creatorState.seed || 12345);
        const verts = Math.max(3, Math.min(18, Number(this.creatorState.vertexCount) || 8));
        const out = [];

        if (this.creatorState.symmetryEnabled) {
            const half = Math.floor(verts / 2);
            const axisX = cx;
            const right = [];
            for (let i = 0; i < half; i++) {
                const t = rng.range(-Math.PI * 0.45, Math.PI * 0.45);
                const r = rng.range(90, 180);
                right.push({ x: axisX + Math.abs(Math.cos(t) * r), y: cy + Math.sin(t) * r });
            }
            const left = right.map(p => ({ x: axisX - (p.x - axisX), y: p.y }));
            let points = [...right, ...left];
            if (verts % 2 === 1) points.push({ x: axisX, y: cy - rng.range(90, 170) });
            points.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
            points.forEach(p => out.push({ x: p.x, y: p.y }));
        } else {
            for (let i = 0; i < verts; i++) {
                const t = (i / verts) * Math.PI * 2 + rng.range(-0.18, 0.18);
                const r = rng.range(90, 190);
                out.push({ x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r });
            }
        }

        if (incrementSeed) this.creatorState.seed = (this.creatorState.seed || 12345) + 1;
        this.creatorState.vertices = out;
        this.creatorState.lines = [];
        this.creatorState.drawCustomMode = false;
        this.creatorState.customMouseWorld = null;
        this.creatorState.customDrawError = '';
        this.computeAndStoreCreatorBoundary(this.creatorState.vertices);
        this.creatorViewDirty = true;
        this.syncCreatorControls();
        this.syncCreatorControlText();
        this.updateCreatorInfo();
        this.renderCreatorCanvas();
        this.updateCreatorUndoRedoButtons();
    }

    exportCreatorJson() {
        const stats = this.computePieceStats();
        const payload = {
            createdAt: new Date().toISOString(),
            settings: {
                seed: this.creatorState.seed,
                vertices: this.creatorState.vertexCount,
                maxLines: this.creatorState.maxLines,
                targetPieces: this.creatorState.targetPieces,
                effort: this.creatorState.searchEffort,
                autoMaximize: this.creatorState.autoMaximize,
                gridSize: this.creatorState.gridSize,
                gridLock: this.creatorState.gridLock,
                symmetryEnabled: this.creatorState.symmetryEnabled
            },
            polygon: this.creatorState.vertices.map(v => ({ x: v.x, y: v.y })),
            lines: (this.creatorState.lines || []).map(l => ({
                start: { x: l.start.x, y: l.start.y },
                end: { x: l.end.x, y: l.end.y }
            })),
            result: {
                pieces: stats.pieces.length,
                differentialPercent: Number(stats.diffPct.toFixed(4)),
                valid: stats.diffPct <= this.getCreatorMaxDifferentialPercent(),
                allLinesCross: !!stats.allLinesCross
            }
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dev-level-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    clearCreator() {
        this.stopSolver(); // Force-stop any running solver
        this.pushCreatorHistory(this.snapshotCreatorGeometry());
        this.creatorState.vertices = [];
        this.creatorState.lines = [];
        this.creatorState.solverPreviewLines = [];
        this.creatorState.drawCustomMode = false;
        this.creatorState.customMouseWorld = null;
        this.creatorState.customDrawError = '';
        this.creatorState.lastSolveMeta = null;
        this.creatorState.lastSolveDiagnostics = null;

        // Reset View
        this.creatorState.zoomLevel = this.creatorState.zoomLevelDefault || 1;
        this.creatorView = { scale: 1, offsetX: 0, offsetY: 0 };
        this.creatorViewDirty = true;

        this.computeAndStoreCreatorBoundary(this.creatorState.vertices);
        this.syncCreatorControlText();
        this.updateCreatorInfo();
        this.renderCreatorCanvas();
        this.updateCreatorUndoRedoButtons();
    }

    clearCreatorLinesOnly(pushHistory = false) {
        if (pushHistory) {
            this.pushCreatorHistory(this.snapshotCreatorGeometry());
        }
        this.creatorState.lines = [];
        this.creatorState.solverPreviewLines = [];
        this.creatorState.solveSession = null;
        this.creatorRenderTickRequested = false;
        this.creatorState.drawingLineStart = null;
        this.creatorState.lastSolveMeta = null;
        this.updateCreatorInfo();
        this.renderCreatorCanvas();
        this.updateCreatorUndoRedoButtons();
    }

    async showImpossibilityModal(targetPieces, maxLines) {
        const title = 'Impossible Setup';
        const message = `No valid ${targetPieces}-piece solution was found with ${maxLines} line${maxLines === 1 ? '' : 's'} under the ≤ ${this.getCreatorMaxDifferentialPercent().toFixed(1)}% rule. The previous cuts were cleared so you can start fresh.`;
        if (typeof window.appAlert === 'function') {
            await window.appAlert(message, { title, confirmText: 'OK' });
        } else {
            window.alert(`${title}\n\n${message}`);
        }
    }

    toggleDrawCustomMode() {
        this.stopSolver();
        this.pushCreatorHistory(this.snapshotCreatorGeometry());
        this.creatorState.drawCustomMode = !this.creatorState.drawCustomMode;
        if (this.creatorState.drawCustomMode) {
            this.creatorState.vertices = [];
            this.creatorState.lines = [];
            this.creatorState.drawingLineStart = null;
            this.creatorState.draggingVertexIndex = -1;
            this.creatorState.hoverVertexIndex = -1;
            this.creatorState.customMouseWorld = null;
            this.creatorViewDirty = true;
        }
        this.creatorState.customDrawError = '';
        this.computeAndStoreCreatorBoundary(this.creatorState.vertices);
        this.syncCreatorControlText();
        this.updateCreatorInfo();
        this.renderCreatorCanvas();
        this.updateCreatorUndoRedoButtons();
    }

    getAppliedPieces() {
        if (!this.creatorState.vertices || this.creatorState.vertices.length < 3) return [];
        let pieces = [{ vertices: this.creatorState.vertices.map(v => ({ x: v.x, y: v.y })) }];
        this.creatorState.lines.forEach(line => {
            const next = [];
            pieces.forEach(piece => {
                const split = Geometry.split(piece, line.start, line.end);
                if (split && split.length >= 2) {
                    split.forEach(verts => {
                        if (Array.isArray(verts) && verts.length >= 3) next.push({ vertices: verts });
                    });
                } else {
                    next.push(piece);
                }
            });
            pieces = next;
        });
        return pieces;
    }

    applyCutsDetailed(vertices, lines) {
        if (!vertices || vertices.length < 3) {
            return { pieces: [], allLinesCross: false, splitCount: 0 };
        }
        let pieces = [{ vertices: vertices.map(v => ({ x: v.x, y: v.y })) }];
        let splitCount = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const next = [];
            let didSplit = false;
            pieces.forEach(piece => {
                const split = Geometry.split(piece, line.start, line.end);
                if (split && split.length >= 2) {
                    didSplit = true;
                    split.forEach(verts => {
                        if (Array.isArray(verts) && verts.length >= 3) next.push({ vertices: verts });
                    });
                } else {
                    next.push(piece);
                }
            });
            pieces = next;
            if (!didSplit) {
                return { pieces, allLinesCross: false, splitCount, failedLineIndex: i };
            }
            splitCount++;
        }
        return { pieces, allLinesCross: true, splitCount };
    }

    computePieceStats() {
        return this.computePieceStatsForLines(this.creatorState.lines || [], this.creatorState.vertices);
    }

    computePieceStatsForLines(lines = [], sourceVertices = null) {
        const vertices = Array.isArray(sourceVertices) ? sourceVertices : this.creatorState.vertices;
        const strictMode = !!this.creatorState.strictMode;
        const sanitizedVertices = (typeof Geometry !== 'undefined' && typeof Geometry.sanitizePolygon === 'function')
            ? Geometry.sanitizePolygon(vertices, {
                minAbsArea: strictMode ? 1e-7 : 1e-8,
                collinearEps: strictMode ? 8e-7 : 1e-6
            })
            : vertices;

        if (!Array.isArray(sanitizedVertices) || sanitizedVertices.length < 3) {
            return {
                pieces: [],
                areas: [],
                total: 0,
                minA: 0,
                maxA: 0,
                diffPct: Infinity,
                threshold: this.getCreatorMaxDifferentialPercent(),
                piecePercents: [],
                idealPct: 0,
                pieceDeviationFromIdeal: [],
                pieceDiffFromLargest: [],
                allWithinThreshold: false,
                valid: false,
                maxError: 1,
                allLinesCross: false,
                stdPct: Infinity,
                madPct: Infinity,
                sliverCount: 0,
                topologyPenalty: 0
            };
        }

        const applied = this.applyCutsDetailed(sanitizedVertices, lines || []);
        const rawPieces = applied.pieces || [];
        const rawCount = rawPieces.length;
        const baseTotal = Math.abs(Geometry.getArea(sanitizedVertices));
        const pieces = (typeof Geometry !== 'undefined' && typeof Geometry.sanitizePieces === 'function')
            ? Geometry.sanitizePieces(rawPieces, baseTotal, {
                minAreaRatio: strictMode ? 0.0012 : 0.0008,
                minAbsArea: strictMode ? 1e-7 : 1e-8,
                collinearEps: strictMode ? 8e-7 : 1e-6
            })
            : rawPieces;

        const areas = pieces.map(p => Math.abs(Geometry.getArea(p.vertices))).filter(a => Number.isFinite(a) && a > 0);
        const total = areas.reduce((a, b) => a + b, 0);
        const minA = areas.length ? Math.min(...areas) : 0;
        const maxA = areas.length ? Math.max(...areas) : 0;
        const diffPct = maxA > 0 ? ((maxA - minA) / maxA) * 100 : Infinity;
        const threshold = this.getCreatorMaxDifferentialPercent();
        const thresholdUsed = threshold;
        const rawPiecePercents = total > 0 ? areas.map(a => (a / total) * 100) : areas.map(() => 0);
        const piecePercents = normalizePercentagesToHundred(rawPiecePercents, 1);
        const idealPct = areas.length > 0 ? (100 / areas.length) : 0;
        const pieceDeviationFromIdeal = piecePercents.map(p => Math.abs(p - idealPct));
        const pieceDiffFromLargest = maxA > 0 ? areas.map(a => ((maxA - a) / maxA) * 100) : areas.map(() => 0);
        const allWithinThreshold = Number.isFinite(diffPct) && diffPct <= thresholdUsed + 1e-6;

        const idealArea = areas.length > 0 ? total / areas.length : 0;
        let varSum = 0;
        let absSum = 0;
        let sliverCount = 0;
        const sliverThreshold = idealArea > 0 ? idealArea * (strictMode ? 0.18 : 0.12) : 0;
        areas.forEach(a => {
            const dev = idealArea > 0 ? Math.abs(a - idealArea) / idealArea : 1;
            absSum += dev;
            varSum += dev * dev;
            if (sliverThreshold > 0 && a < sliverThreshold) sliverCount += 1;
        });
        const stdPct = areas.length ? Math.sqrt(varSum / areas.length) * 100 : Infinity;
        const madPct = areas.length ? (absSum / areas.length) * 100 : Infinity;
        const topologyPenalty = Math.max(0, rawCount - areas.length);

        const valid = !!applied.allLinesCross
            && allWithinThreshold
            && Number.isFinite(diffPct)
            && topologyPenalty === 0
            && (!strictMode || sliverCount === 0);

        return {
            pieces,
            areas,
            total,
            minA,
            maxA,
            diffPct,
            threshold: thresholdUsed,
            piecePercents,
            idealPct,
            pieceDeviationFromIdeal,
            pieceDiffFromLargest,
            allWithinThreshold,
            valid,
            maxError: Number.isFinite(diffPct) ? (diffPct / 100) : 1,
            allLinesCross: applied.allLinesCross,
            stdPct,
            madPct,
            sliverCount,
            topologyPenalty
        };
    }

    getCreatorPieceVisualStyle(piece, index = 0, pieceMetric = null) {
        const threshold = this.getCreatorMaxDifferentialPercent();
        const diffFromLargest = Number.isFinite(pieceMetric?.diffFromLargest) ? pieceMetric.diffFromLargest : null;
        if (diffFromLargest != null) {
            const goodThreshold = Math.max(1, Math.min(3, threshold * 0.55));
            if (diffFromLargest <= goodThreshold) {
                return {
                    fill: 'rgba(34,197,94,0.33)',
                    stroke: 'rgba(21,128,61,0.95)'
                };
            }
            if (diffFromLargest <= threshold) {
                return {
                    fill: 'rgba(251,191,36,0.30)',
                    stroke: 'rgba(180,83,9,0.95)'
                };
            }
            return {
                fill: 'rgba(239,68,68,0.30)',
                stroke: 'rgba(185,28,28,0.98)'
            };
        }

        const verts = Array.isArray(piece?.vertices) ? piece.vertices : [];
        let hash = ((this.creatorState.seed || 1) * 2654435761) >>> 0;
        verts.forEach((v, i) => {
            const x = Math.round((Number(v?.x) || 0) * 10);
            const y = Math.round((Number(v?.y) || 0) * 10);
            hash = (hash + (((x * 31) ^ (y * 17) ^ (i * 13)) >>> 0)) >>> 0;
            hash = (hash ^ (hash << 13)) >>> 0;
            hash = (hash ^ (hash >>> 17)) >>> 0;
            hash = (hash ^ (hash << 5)) >>> 0;
        });
        hash = (hash + ((index + 1) * 374761393)) >>> 0;

        const hue = hash % 360;
        const saturation = 50 + (hash % 16);   // 50..65
        const lightness = 64 + ((hash >>> 5) % 12); // 64..75

        return {
            fill: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.58)`,
            stroke: `hsla(${hue}, ${Math.min(88, saturation + 18)}%, ${Math.max(36, lightness - 30)}%, 0.95)`
        };
    }

    updateCreatorInfo() {
        if (!this.creatorInfo) return;
        const maxPiecesSummary = this.getShapeAwareMaxPiecesSummary(this.creatorState.maxLines, this.creatorState.vertices);
        const activeLines = this.getLiveCreatorLinesForStats();
        const validationLines = this.getValidationLinesForLiveDiff();
        const s = this.computePieceStatsForLines(validationLines, this.creatorState.vertices);
        const diff = isFinite(s.diffPct) ? s.diffPct.toFixed(2) : '?';
        const threshold = this.getCreatorMaxDifferentialPercent();
        const autoMode = this.creatorState.autoMaximize
            ? `Auto Maximize ON (shape ${maxPiecesSummary.adjusted}/${maxPiecesSummary.theoretical})`
            : `Target ${this.creatorState.targetPieces}`;
        const scanStatus = s.valid ? 'Valid' : 'Failed';
        const session = this.creatorState.solveSession;
        const progress = Number.isFinite(session?.progressPct) ? `${session.progressPct.toFixed(0)}%` : null;
        const attemptText = (session && Number.isFinite(session.attempt) && Number.isFinite(session.attempts))
            ? ` • Attempt <b>${session.attempt}/${session.attempts}</b>`
            : '';
        const phaseText = session?.phase ? ` • Phase: <b>${session.phase}</b>` : '';
        const progressText = progress ? ` • Progress: <b>${progress}</b>` : '';
        const lineActivationText = session
            ? ` • Live lines: <b>${session.activeLineCount || 0}/${session.previewLineCount || activeLines.length || 0}</b>`
            : '';
        const solving = this.creatorState.isSolving ? ' • <b style="color:#22d3ee;">Solving...</b>' : '';
        const solveMeta = this.creatorState.lastSolveMeta
            ? ` • Solve: <b>${this.creatorState.lastSolveMeta}</b>`
            : '';
        const customError = this.creatorState.customDrawError
            ? ` • <b style="color:#f87171;">${this.creatorState.customDrawError}</b>`
            : '';
        this.creatorInfo.innerHTML = `Vertices: <b>${this.creatorState.vertices.length}</b> • Number of Lines: <b>${this.creatorState.maxLines}</b> • Pieces: <b>${s.pieces.length}</b> • Diff: <b>${diff}%</b> • Rule: <b>≤ ${threshold.toFixed(1)}%</b> • Status: <b style="color:${s.valid ? '#4caf50' : '#f44336'}">${scanStatus}</b> • ${autoMode}${solving}${phaseText}${attemptText}${progressText}${lineActivationText}${solveMeta}${customError}`;
    }

    scheduleCreatorRenderTick() {
        if (this.creatorRenderTickRequested) return;
        this.creatorRenderTickRequested = true;

        const step = () => {
            if (!this.creatorRenderTickRequested) return;
            if (!this.creatorState.isSolving) {
                this.creatorRenderTickRequested = false;
                return;
            }

            const session = this.creatorState.solveSession;
            const previewLines = this.creatorState.solverPreviewLines || [];
            if (session) {
                const now = (typeof performance !== 'undefined' && typeof performance.now === 'function')
                    ? performance.now()
                    : Date.now();
                const dt = Math.max(0, now - (session.lastTickTs || now));
                session.lastTickTs = now;
                const speedMs = Math.max(80, Number(session.activationSpeedMs) || 190);
                const count = previewLines.length;
                if (count <= 0) {
                    session.activeLineCount = 0;
                    session.lineActivationProgress = 0;
                } else {
                    const prevCount = Number.isFinite(session.activeLineCount) ? session.activeLineCount : 0;
                    const clampedCount = Math.max(0, Math.min(count, prevCount));
                    session.activeLineCount = clampedCount;
                    session.lineActivationProgress = Number.isFinite(session.lineActivationProgress) ? session.lineActivationProgress : 0;
                    session.lineActivationProgress += dt / speedMs;
                    while (session.lineActivationProgress >= 1 && session.activeLineCount < count) {
                        session.activeLineCount += 1;
                        session.lineActivationProgress -= 1;
                    }
                    if (session.activeLineCount >= count) {
                        session.activeLineCount = count;
                        session.lineActivationProgress = 1;
                    }
                }
                session.previewLineCount = previewLines.length;
            }

            this.updateCreatorInfo();
            this.renderCreatorCanvas();
            requestAnimationFrame(step);
        };

        requestAnimationFrame(step);
    }

    renderCreatorCanvas() {
        if (!this.creatorCanvas) return;
        const size = this.syncCreatorCanvasSize();
        if (!size) return;
        const ctx = this.creatorCanvas.getContext('2d');
        const w = size.width;
        const h = size.height;
        const dpr = size.dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        // Galaxy theme: deep space background
        const spaceBg = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.5, w * 0.85);
        spaceBg.addColorStop(0, '#111d3a');
        spaceBg.addColorStop(0.35, '#0b1228');
        spaceBg.addColorStop(0.7, '#070e20');
        spaceBg.addColorStop(1, '#040810');
        ctx.fillStyle = spaceBg;
        ctx.fillRect(0, 0, w, h);

        // Galaxy stars & nebula for DevManager canvas (lazy init)
        if (!this._devGalaxyStars || this._devGalaxyW !== w || this._devGalaxyH !== h) {
            this._devGalaxyW = w;
            this._devGalaxyH = h;
            const dcx = w * 0.5, dcy = h * 0.5;
            const dmaxR = Math.sqrt(dcx * dcx + dcy * dcy) * 1.3;
            const ddeadR = Math.min(w, h) * 0.22;
            const starCount = Math.min(300, Math.max(100, Math.floor(w * h / 3500)));
            this._devGalaxyStars = [];
            for (let i = 0; i < starCount; i++) {
                const br = Math.random();
                const isLarge = br > 0.85;
                const r = isLarge ? (0.9 + Math.random() * 1.2) : (0.3 + Math.random() * 0.7);
                let dist = r > 1.0 ? (ddeadR + Math.random() * (dmaxR - ddeadR)) : Math.random() * dmaxR;
                this._devGalaxyStars.push({
                    dist: dist, angle: Math.random() * Math.PI * 2,
                    r: r, spikes: isLarge ? 4 : 4,
                    brightness: 0.3 + br * 0.7,
                    twinkleSpeed: 0.5 + Math.random() * 2.5,
                    twinkleOffset: Math.random() * Math.PI * 2,
                    spikeRatio: 0.3 + Math.random() * 0.25,
                    color: br > 0.9 ? [180, 210, 255] : br > 0.7 ? [200, 220, 255] : [255, 255, 255]
                });
            }
            this._devGalaxyNebulae = [];
            const nebColors = [[30, 50, 120], [50, 30, 100], [20, 60, 130]];
            for (let i = 0; i < 3; i++) {
                const c = nebColors[i];
                const ndist = Math.min(w, h) * (0.2 + Math.random() * 0.5);
                this._devGalaxyNebulae.push({
                    dist: ndist, angle: Math.random() * Math.PI * 2,
                    rx: w * (0.12 + Math.random() * 0.2), ry: h * (0.1 + Math.random() * 0.15),
                    color: c, alpha: 0.04 + Math.random() * 0.05,
                    localRotation: Math.random() * Math.PI
                });
            }
        }

        // Rotation
        const devTime = performance.now() * 0.001;
        const devSkyRot = devTime * 0.002; // Gentle drift matching main canvas
        const devCx = w * 0.5, devCy = h * 0.5;

        // Compute polygon screen-space bounds for dimming
        let polyScreenBounds = null;
        if (this.creatorState.vertices && this.creatorState.vertices.length > 0) {
            const view = this.creatorView || { scale: 1, offsetX: 0, offsetY: 0 };
            let minSX = Infinity, maxSX = -Infinity, minSY = Infinity, maxSY = -Infinity;
            const halfW = w * 0.5, halfH = h * 0.5;
            // Vertices are centered at (0,0) in world space typically, view applies offset/scale
            for (const v of this.creatorState.vertices) {
                const screenX = halfW + view.offsetX + v.x * view.scale;
                const screenY = halfH + view.offsetY + v.y * view.scale;
                if (screenX < minSX) minSX = screenX;
                if (screenX > maxSX) maxSX = screenX;
                if (screenY < minSY) minSY = screenY;
                if (screenY > maxSY) maxSY = screenY;
            }
            if (isFinite(minSX)) {
                const margin = Math.min(w, h) * 0.08;
                polyScreenBounds = {
                    cx: (minSX + maxSX) * 0.5,
                    cy: (minSY + maxSY) * 0.5,
                    halfW: (maxSX - minSX) * 0.5 + margin,
                    halfH: (maxSY - minSY) * 0.5 + margin
                };
            }
        }

        // Helper: get dimming factor
        const getDevDimFactor = (sx, sy) => {
            if (!polyScreenBounds) return 1.0;
            const pb = polyScreenBounds;
            const dx = Math.abs(sx - pb.cx) / Math.max(1, pb.halfW);
            const dy = Math.abs(sy - pb.cy) / Math.max(1, pb.halfH);
            const dist = Math.max(dx, dy);
            if (dist > 1.5) return 1.0;
            if (dist < 0.8) return 0.12;
            return 0.12 + (dist - 0.8) / 0.7 * 0.88;
        };

        // Draw nebulae (rotating) with dimming
        this._devGalaxyNebulae.forEach(neb => {
            const nx = devCx + Math.cos(neb.angle + devSkyRot) * neb.dist;
            const ny = devCy + Math.sin(neb.angle + devSkyRot) * neb.dist;
            ctx.save();
            ctx.translate(nx, ny);
            ctx.rotate(neb.localRotation + devSkyRot);
            const ng = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(neb.rx, neb.ry));
            const [cr, cg, cb] = neb.color;
            const nebDim = getDevDimFactor(nx, ny);
            ng.addColorStop(0, `rgba(${cr},${cg},${cb},${neb.alpha * 1.5 * nebDim})`);
            ng.addColorStop(0.5, `rgba(${cr},${cg},${cb},${neb.alpha * 0.5 * nebDim})`);
            ng.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
            ctx.fillStyle = ng;
            ctx.scale(1, neb.ry / Math.max(1, neb.rx));
            ctx.beginPath();
            ctx.arc(0, 0, neb.rx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Draw stars — realistic star shapes with rotation & dimming
        this._devGalaxyStars.forEach(star => {
            const sx = devCx + Math.cos(star.angle + devSkyRot) * star.dist;
            const sy = devCy + Math.sin(star.angle + devSkyRot) * star.dist;
            if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) return;
            const tw = 0.5 + 0.5 * Math.sin(devTime * star.twinkleSpeed + star.twinkleOffset);
            const dimFactor = getDevDimFactor(sx, sy);
            const a = star.brightness * (0.6 + 0.4 * tw) * dimFactor;
            const [scr, scg, scb] = star.color;
            const cs = `rgba(${scr},${scg},${scb},`;
            if (star.r < 0.7) {
                ctx.fillStyle = cs + a.toFixed(2) + ')';
                ctx.beginPath();
                ctx.arc(sx, sy, star.r, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.save();
                ctx.translate(sx, sy);
                const gr = star.r * 3.5;
                const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, gr);
                gg.addColorStop(0, cs + (a * 0.35).toFixed(3) + ')');
                gg.addColorStop(0.5, cs + (a * 0.08).toFixed(3) + ')');
                gg.addColorStop(1, cs + '0)');
                ctx.fillStyle = gg;
                ctx.beginPath(); ctx.arc(0, 0, gr, 0, Math.PI * 2); ctx.fill();
                const sp = star.spikes, oR = star.r * 2.2, iR = star.r * star.spikeRatio;
                ctx.beginPath();
                for (let s = 0; s < sp * 2; s++) {
                    const ang = (s * Math.PI) / sp - Math.PI / 2;
                    const rad = s % 2 === 0 ? oR : iR;
                    if (s === 0) ctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
                    else ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
                }
                ctx.closePath();
                ctx.fillStyle = cs + a.toFixed(2) + ')';
                ctx.fill();
                ctx.beginPath(); ctx.arc(0, 0, star.r * 0.45, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${(a * 0.95).toFixed(2)})`;
                ctx.fill();
                ctx.restore();
            }
        });

        if (this.creatorState.vertices.length < 1) {
            this.creatorView = { scale: 1, offsetX: 0, offsetY: 0 };
            this.creatorViewDirty = false;
        } else if (this.creatorViewDirty) {
            this.creatorView = this.computeCreatorView(w, h);
            this.creatorViewDirty = false;
        }

        // Keep boundary in sync with latest gameplay-parity view transform.
        this.computeAndStoreCreatorBoundary(this.creatorState.vertices);
        const boundary = this.getCreatorBoundary();

        const g = this.getGameplayGridSize();
        const viewScale = Math.max(0.0001, this.creatorView.scale || 1);
        const minWorldX = (0 - (this.creatorView.offsetX || 0)) / viewScale;
        const maxWorldX = (w - (this.creatorView.offsetX || 0)) / viewScale;
        const minWorldY = (0 - (this.creatorView.offsetY || 0)) / viewScale;
        const maxWorldY = (h - (this.creatorView.offsetY || 0)) / viewScale;

        ctx.save();
        ctx.translate(this.creatorView.offsetX, this.creatorView.offsetY);
        ctx.scale(this.creatorView.scale, this.creatorView.scale);

        // Galaxy-themed grid lines
        ctx.strokeStyle = 'rgba(80, 120, 200, 0.15)';
        ctx.lineWidth = 1 / viewScale;
        const startX = Math.floor(minWorldX / g) * g;
        const endX = Math.ceil(maxWorldX / g) * g;
        const startY = Math.floor(minWorldY / g) * g;
        const endY = Math.ceil(maxWorldY / g) * g;
        for (let x = startX; x <= endX; x += g) {
            ctx.beginPath();
            ctx.moveTo(x, minWorldY);
            ctx.lineTo(x, maxWorldY);
            ctx.stroke();
        }
        for (let y = startY; y <= endY; y += g) {
            ctx.beginPath();
            ctx.moveTo(minWorldX, y);
            ctx.lineTo(maxWorldX, y);
            ctx.stroke();
        }

        if (boundary) {
            ctx.save();
            // Galaxy-themed boundary highlight
            ctx.fillStyle = 'rgba(74,124,255,0.08)';
            ctx.strokeStyle = 'rgba(74,124,255,0.5)';
            ctx.lineWidth = 1.3 / Math.max(0.001, this.creatorView.scale);
            ctx.setLineDash([]);
            ctx.fillRect(boundary.x, boundary.y, boundary.width, boundary.height);
            ctx.strokeRect(boundary.x, boundary.y, boundary.width, boundary.height);
            ctx.restore();
        }

        const activeLines = this.getLiveCreatorLinesForStats();
        const validationLines = this.getValidationLinesForLiveDiff();
        const stats = this.computePieceStatsForLines(validationLines, this.creatorState.vertices);
        const pieces = stats.pieces || [];
        const totalArea = stats.total || 0;
        const idealPct = 100 / Math.max(1, pieces.length || 1);

        pieces.forEach((piece, i) => {
            const verts = piece.vertices || [];
            if (verts.length < 3) return;
            const area = Math.abs(Geometry.getArea(verts));
            const areaPct = (area / (totalArea + 1e-9)) * 100;
            const dev = Math.abs(areaPct - idealPct);
            const visualStyle = this.getCreatorPieceVisualStyle(piece, i, {
                percent: Number.isFinite(stats.piecePercents?.[i]) ? stats.piecePercents[i] : 0,
                deviationFromIdeal: Number.isFinite(stats.pieceDeviationFromIdeal?.[i]) ? stats.pieceDeviationFromIdeal[i] : Infinity,
                diffFromLargest: Number.isFinite(stats.pieceDiffFromLargest?.[i]) ? stats.pieceDiffFromLargest[i] : Infinity,
                threshold: this.getCreatorMaxDifferentialPercent()
            });

            ctx.beginPath();
            ctx.moveTo(verts[0].x, verts[0].y);
            for (let k = 1; k < verts.length; k++) ctx.lineTo(verts[k].x, verts[k].y);
            ctx.closePath();
            ctx.fillStyle = visualStyle.fill;
            ctx.strokeStyle = visualStyle.stroke;
            ctx.lineWidth = 2 / Math.max(0.001, this.creatorView.scale);
            ctx.fill();
            ctx.stroke();
        });

        const drawRoundedRect = (x, y, width, height, radius) => {
            const r = Math.min(radius, width / 2, height / 2);
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + width - r, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + r);
            ctx.lineTo(x + width, y + height - r);
            ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
            ctx.lineTo(x + r, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        };

        pieces.forEach((piece, i) => {
            const verts = piece.vertices || [];
            if (verts.length < 3) return;
            const pct = Number.isFinite(stats.piecePercents?.[i]) ? stats.piecePercents[i] : 0;
            const diffFromLargest = Number.isFinite(stats.pieceDiffFromLargest?.[i]) ? stats.pieceDiffFromLargest[i] : Infinity;
            const warnThreshold = 3;
            const failThreshold = this.getCreatorMaxDifferentialPercent();
            const marker = diffFromLargest <= warnThreshold ? 'OK' : diffFromLargest <= failThreshold ? '~' : '!';
            const markerColor = diffFromLargest <= warnThreshold ? '#4caf50' : diffFromLargest <= failThreshold ? '#ffb300' : '#f44336';

            let center;
            if (typeof Geometry !== 'undefined' && typeof Geometry.getPolygonCenter === 'function') {
                center = Geometry.getPolygonCenter(verts);
            }
            if (!center || !Number.isFinite(center.x) || !Number.isFinite(center.y)) {
                let sx = 0;
                let sy = 0;
                verts.forEach(v => { sx += v.x; sy += v.y; });
                center = { x: sx / verts.length, y: sy / verts.length };
            }

            let pieceMinX = Infinity;
            let pieceMinY = Infinity;
            let pieceMaxX = -Infinity;
            let pieceMaxY = -Infinity;
            verts.forEach(v => {
                pieceMinX = Math.min(pieceMinX, v.x);
                pieceMinY = Math.min(pieceMinY, v.y);
                pieceMaxX = Math.max(pieceMaxX, v.x);
                pieceMaxY = Math.max(pieceMaxY, v.y);
            });
            const pieceMinDimension = Math.max(1e-6, Math.min(pieceMaxX - pieceMinX, pieceMaxY - pieceMinY));

            let fontSize = 12 / Math.max(0.001, this.creatorView.scale);
            const minFont = 7 / Math.max(0.001, this.creatorView.scale);
            const maxFontByPiece = pieceMinDimension * 0.36;
            fontSize = Math.max(minFont, Math.min(fontSize, maxFontByPiece));
            if (!Number.isFinite(fontSize) || fontSize < 6 / Math.max(0.001, this.creatorView.scale)) return;

            const text = `${pct.toFixed(1)}%`;
            ctx.font = `700 ${fontSize}px Inter, sans-serif`;
            const metrics = ctx.measureText(text);
            const paddingX = 7 / Math.max(0.001, this.creatorView.scale);
            const paddingY = 4 / Math.max(0.001, this.creatorView.scale);
            const boxW = metrics.width + paddingX * 2;
            const boxH = fontSize + paddingY * 2;
            const boxX = center.x - boxW / 2;
            const boxY = center.y - boxH / 2;

            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            drawRoundedRect(boxX, boxY, boxW, boxH, 4 / Math.max(0.001, this.creatorView.scale));
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, center.x, center.y);

            ctx.fillStyle = markerColor;
            ctx.font = `${Math.max(8 / Math.max(0.001, this.creatorView.scale), fontSize * 0.65)}px monospace`;
            ctx.fillText(marker, center.x, center.y - (fontSize * 0.72));
        });

        ctx.setLineDash([8 / Math.max(0.001, this.creatorView.scale), 4 / Math.max(0.001, this.creatorView.scale)]);
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
        ctx.lineWidth = 2 / Math.max(0.001, this.creatorView.scale);
        this.creatorState.lines.forEach(line => {
            ctx.beginPath();
            ctx.moveTo(line.start.x, line.start.y);
            ctx.lineTo(line.end.x, line.end.y);
            ctx.stroke();
        });
        ctx.setLineDash([]);

        if (this.creatorState.solverPreviewLines && this.creatorState.solverPreviewLines.length) {
            const session = this.creatorState.solveSession || {};
            const activeCount = Math.max(0, Math.min(this.creatorState.solverPreviewLines.length, Number(session.activeLineCount) || 0));
            const activationProgress = Math.max(0, Math.min(1, Number(session.lineActivationProgress) || 0));
            ctx.save();
            ctx.lineWidth = 2.4 / Math.max(0.001, this.creatorView.scale);
            this.creatorState.solverPreviewLines.forEach((line, idx) => {
                const isActive = idx < activeCount;
                const isCurrent = idx === activeCount && activeCount < this.creatorState.solverPreviewLines.length;
                const drawT = isCurrent ? activationProgress : 1;
                const endX = line.start.x + (line.end.x - line.start.x) * drawT;
                const endY = line.start.y + (line.end.y - line.start.y) * drawT;
                if (isActive) {
                    ctx.setLineDash([]);
                    ctx.strokeStyle = 'rgba(34,197,94,0.95)';
                } else if (isCurrent) {
                    ctx.setLineDash([]);
                    ctx.strokeStyle = 'rgba(34,211,238,0.95)';
                } else {
                    ctx.setLineDash([8 / Math.max(0.001, this.creatorView.scale), 6 / Math.max(0.001, this.creatorView.scale)]);
                    ctx.strokeStyle = 'rgba(56,189,248,0.44)';
                }
                ctx.beginPath();
                ctx.moveTo(line.start.x, line.start.y);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            });
            ctx.restore();
        }

        const verts = this.creatorState.vertices;
        if (this.creatorState.drawCustomMode && verts.length > 0) {
            ctx.beginPath();
            ctx.moveTo(verts[0].x, verts[0].y);
            for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
            ctx.strokeStyle = 'rgba(160, 200, 255, 0.9)';
            ctx.lineWidth = 2.2 / Math.max(0.001, this.creatorView.scale);
            ctx.stroke();

            const last = verts[verts.length - 1];
            const mouse = this.creatorState.customMouseWorld;
            if (mouse) {
                ctx.beginPath();
                ctx.moveTo(last.x, last.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.strokeStyle = 'rgba(160, 200, 255, 0.5)';
                ctx.lineWidth = 2 / Math.max(0.001, this.creatorView.scale);
                ctx.stroke();
            }
        }
        verts.forEach((v, i) => {
            const sz = (this.creatorState.hoverVertexIndex === i ? 7 : 5) / Math.max(0.001, this.creatorView.scale);
            ctx.save();
            ctx.translate(v.x, v.y);

            // 1) Wide soft outer glow halo
            const outerGlowR = sz * 6;
            const outerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, outerGlowR);
            outerGlow.addColorStop(0, 'rgba(160, 200, 255, 0.35)');
            outerGlow.addColorStop(0.15, 'rgba(130, 180, 255, 0.18)');
            outerGlow.addColorStop(0.4, 'rgba(100, 150, 255, 0.06)');
            outerGlow.addColorStop(1, 'rgba(80, 130, 255, 0)');
            ctx.fillStyle = outerGlow;
            ctx.beginPath();
            ctx.arc(0, 0, outerGlowR, 0, Math.PI * 2);
            ctx.fill();

            // 2) Inner bright glow
            const innerGlowR = sz * 2.5;
            const innerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, innerGlowR);
            innerGlow.addColorStop(0, 'rgba(200, 225, 255, 0.7)');
            innerGlow.addColorStop(0.3, 'rgba(170, 200, 255, 0.3)');
            innerGlow.addColorStop(1, 'rgba(140, 180, 255, 0)');
            ctx.fillStyle = innerGlow;
            ctx.beginPath();
            ctx.arc(0, 0, innerGlowR, 0, Math.PI * 2);
            ctx.fill();

            // 3) Primary 4-point long diffraction spikes
            const longSpikeR = sz * 6;
            const longSpikeW = sz * 0.12;
            ctx.shadowColor = 'rgba(180, 220, 255, 0.6)';
            ctx.shadowBlur = 8 / Math.max(0.001, this.creatorView.scale);
            ctx.fillStyle = 'rgba(210, 230, 255, 0.85)';
            for (let s = 0; s < 4; s++) {
                const angle = s * Math.PI / 2;
                ctx.save();
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.moveTo(0, -longSpikeW);
                ctx.lineTo(longSpikeR, 0);
                ctx.lineTo(0, longSpikeW);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // 4) Secondary shorter spikes at 45°
            const shortSpikeR = sz * 3;
            const shortSpikeW = sz * 0.08;
            ctx.fillStyle = 'rgba(200, 225, 255, 0.45)';
            for (let s = 0; s < 4; s++) {
                const angle = s * Math.PI / 2 + Math.PI / 4;
                ctx.save();
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.moveTo(0, -shortSpikeW);
                ctx.lineTo(shortSpikeR, 0);
                ctx.lineTo(0, shortSpikeW);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // 5) Blazing white-hot core
            ctx.shadowColor = 'rgba(220, 240, 255, 1)';
            ctx.shadowBlur = 12 / Math.max(0.001, this.creatorView.scale);
            ctx.beginPath();
            ctx.arc(0, 0, sz * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(240, 248, 255, 0.95)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, sz * 0.25, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            ctx.fill();

            ctx.restore();
        });

        if (this.creatorState.drawCustomMode && this.creatorState.vertices.length > 0) {
            if (this.creatorState.vertices.length >= 3) {
                const first = this.creatorState.vertices[0];
                ctx.beginPath();
                ctx.arc(first.x, first.y, 8 / Math.max(0.001, this.creatorView.scale), 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(34,197,94,.9)';
                ctx.lineWidth = 1.5 / Math.max(0.001, this.creatorView.scale);
                ctx.stroke();
            }
        }
        ctx.restore();

        if (this.creatorState.isSolving) {
            ctx.fillStyle = 'rgba(0,0,0,.65)';
            ctx.fillRect(10, h - 44, 420, 30);
            ctx.fillStyle = '#67e8f9';
            ctx.font = '12px Inter, sans-serif';
            ctx.fillText(`SOLVER LIVE FEED: testing crossing lines in real time...`, 16, h - 24);
        }

        const pass = !!stats.valid;
        const threshold = this.getCreatorMaxDifferentialPercent();
        const diffPct = stats.diffPct ?? Infinity;

        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.fillRect(w - 460, 10, 230, 92);
        ctx.fillStyle = '#4a90e2';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`VALID RULE: ≤ ${threshold.toFixed(1)}%`, w - 452, 28);
        ctx.font = '11px sans-serif';
        ctx.fillStyle = pass ? '#4caf50' : '#f44336';
        ctx.fillText(`Diff: ${isFinite(diffPct) ? diffPct.toFixed(2) : '?'}%`, w - 452, 50);
        ctx.fillText(pass ? 'STATUS: Valid' : 'STATUS: Failed', w - 452, 68);
        ctx.fillStyle = '#ccc';
        ctx.fillText(`Pieces: ${pieces.length}`, w - 452, 86);

        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.fillRect(w - 220, 10, 210, 84);
        ctx.fillStyle = '#4a90e2';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('SOLUTION INFO', w - 212, 26);
        ctx.fillStyle = 'white';
        ctx.font = '11px sans-serif';
        ctx.fillText(`Lines: ${this.creatorState.lines ? this.creatorState.lines.length : '-'}`, w - 212, 44);
        ctx.fillText(`Pieces: ${pieces.length}`, w - 212, 60);
        ctx.fillText(`Ideal: ${idealPct.toFixed(2)}%`, w - 212, 76);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
    }

    makeRandomLine() {
        const bounds = this.getVerticesBounds();
        if (!bounds) return { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
        const cx = (bounds.minX + bounds.maxX) / 2;
        const cy = (bounds.minY + bounds.maxY) / 2;
        const w = Math.max(1, bounds.width);
        const h = Math.max(1, bounds.height);
        const theta = Math.random() * Math.PI;
        const nx = Math.cos(theta + Math.PI / 2);
        const ny = Math.sin(theta + Math.PI / 2);
        const offset = (Math.random() - 0.5) * Math.min(w, h) * 0.9;
        const ox = cx + nx * offset;
        const oy = cy + ny * offset;
        const dx = Math.cos(theta);
        const dy = Math.sin(theta);
        const len = Math.max(w, h) * 1.5;
        return {
            start: { x: ox - dx * len, y: oy - dy * len },
            end: { x: ox + dx * len, y: oy + dy * len }
        };
    }

    clampValue(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    wrapPI(theta) {
        const pi = Math.PI;
        let t = theta % pi;
        if (t < 0) t += pi;
        return t;
    }

    getProjectionRange(vertices, theta) {
        const nx = Math.cos(theta);
        const ny = Math.sin(theta);
        let min = Infinity;
        let max = -Infinity;
        vertices.forEach(v => {
            const d = v.x * nx + v.y * ny;
            min = Math.min(min, d);
            max = Math.max(max, d);
        });
        return { min, max };
    }

    lineFromThetaD(theta, d, bounds) {
        const b = bounds || this.getVerticesBounds();
        const diag = b ? Math.hypot(Math.max(1, b.width), Math.max(1, b.height)) : 600;
        const len = Math.max(300, diag * 2.2);
        const nx = Math.cos(theta);
        const ny = Math.sin(theta);
        const tx = -Math.sin(theta);
        const ty = Math.cos(theta);
        const px = nx * d;
        const py = ny * d;
        return {
            start: { x: px - tx * len, y: py - ty * len },
            end: { x: px + tx * len, y: py + ty * len }
        };
    }

    cloneGenome(g) {
        return (g || []).map(x => ({ theta: x.theta, d: x.d }));
    }

    makeStrategicGenome(numLines, rng, vertices) {
        const lines = [];
        for (let i = 0; i < numLines; i++) {
            const base = (i / numLines) * Math.PI;
            const theta = this.wrapPI(base + rng.range(-0.25, 0.25));
            const range = this.getProjectionRange(vertices, theta);
            const span = Math.max(0.0001, range.max - range.min);
            const pos = (i + 0.5) / numLines;
            const jitter = this.clampValue(pos + rng.range(-0.15, 0.15), 0.05, 0.95);
            const d = range.min + span * jitter;
            lines.push({ theta, d });
        }
        return lines;
    }

    makeRandomGenome(numLines, rng, vertices) {
        const lines = [];
        for (let i = 0; i < numLines; i++) {
            const theta = rng.range(0, Math.PI);
            const range = this.getProjectionRange(vertices, theta);
            const span = Math.max(0.0001, range.max - range.min);
            const d = rng.range(range.min + span * 0.05, range.max - span * 0.05);
            lines.push({ theta, d });
        }
        return lines;
    }

    getCentroidFromVertices(vertices) {
        if (!Array.isArray(vertices) || vertices.length < 3) return { x: 0, y: 0 };
        if (typeof Geometry !== 'undefined' && typeof Geometry.getPolygonCenter === 'function') {
            const c = Geometry.getPolygonCenter(vertices);
            if (c && Number.isFinite(c.x) && Number.isFinite(c.y)) return c;
        }
        let sx = 0;
        let sy = 0;
        vertices.forEach(v => { sx += v.x; sy += v.y; });
        return { x: sx / vertices.length, y: sy / vertices.length };
    }

    getConcavityHintAngles(vertices) {
        if (!Array.isArray(vertices) || vertices.length < 4) return [];
        const n = vertices.length;
        const area = Number(Geometry.getArea(vertices)) || 0;
        const orientation = area >= 0 ? 1 : -1;
        const hints = [];

        for (let i = 0; i < n; i++) {
            const prev = vertices[(i - 1 + n) % n];
            const curr = vertices[i];
            const next = vertices[(i + 1) % n];
            const e1x = curr.x - prev.x;
            const e1y = curr.y - prev.y;
            const e2x = next.x - curr.x;
            const e2y = next.y - curr.y;
            const cross = e1x * e2y - e1y * e2x;
            const isReflex = orientation > 0 ? cross < -1e-6 : cross > 1e-6;
            if (!isReflex) continue;

            const inAngle = Math.atan2(e1y, e1x);
            const outAngle = Math.atan2(e2y, e2x);
            const bisector = this.wrapPI((inAngle + outAngle) * 0.5);
            hints.push(bisector);
            hints.push(this.wrapPI(bisector + Math.PI / 2));
        }
        return hints;
    }

    makeGuidedGenomeFamilies(numLines, rng, vertices) {
        const bounds = this.getVerticesBounds(vertices);
        if (!bounds || !Array.isArray(vertices) || vertices.length < 3) return [];

        const centroid = this.getCentroidFromVertices(vertices);
        const centerBasedD = (theta) => centroid.x * Math.cos(theta) + centroid.y * Math.sin(theta);
        const families = [];
        const quantiles = [0.18, 0.33, 0.5, 0.67, 0.82];

        const buildFromAngles = (angles, jitter = 0.08) => {
            if (!Array.isArray(angles) || angles.length < 1) return;
            const genome = [];
            for (let i = 0; i < numLines; i++) {
                const rawTheta = angles[i % angles.length];
                const theta = this.wrapPI(rawTheta + rng.range(-jitter, jitter));
                const range = this.getProjectionRange(vertices, theta);
                const span = Math.max(0.0001, range.max - range.min);
                const q = quantiles[(i + Math.floor(rng.range(0, quantiles.length))) % quantiles.length];
                const d = this.clampValue(range.min + span * q, range.min + span * 0.02, range.max - span * 0.02);
                genome.push({ theta, d });
            }
            families.push(genome);
        };

        // Centroid fan families
        const fanA = [];
        const fanB = [];
        for (let i = 0; i < numLines; i++) {
            fanA.push(this.wrapPI((i / numLines) * Math.PI));
            fanB.push(this.wrapPI(((i + 0.5) / numLines) * Math.PI));
        }
        buildFromAngles(fanA, 0.05);
        buildFromAngles(fanB, 0.05);

        // Orthogonal pair families
        const orthoBase = this.wrapPI(rng.range(0, Math.PI));
        const orthoAngles = [];
        for (let i = 0; i < numLines; i++) {
            orthoAngles.push(this.wrapPI(orthoBase + (i % 2) * (Math.PI / 2)));
        }
        buildFromAngles(orthoAngles, 0.09);

        // Concavity-driven families
        const concavityAngles = this.getConcavityHintAngles(vertices);
        if (concavityAngles.length) {
            buildFromAngles(concavityAngles, 0.06);
            buildFromAngles(concavityAngles.map(a => this.wrapPI(a + Math.PI / 4)), 0.06);
        }

        // Center-biased family to promote crossing through interior
        const centerFamily = [];
        for (let i = 0; i < numLines; i++) {
            const theta = this.wrapPI(((i / Math.max(1, numLines)) * Math.PI) + rng.range(-0.1, 0.1));
            const range = this.getProjectionRange(vertices, theta);
            const span = Math.max(0.0001, range.max - range.min);
            const d0 = centerBasedD(theta);
            const d = this.clampValue(d0 + rng.range(-span * 0.18, span * 0.18), range.min + span * 0.02, range.max - span * 0.02);
            centerFamily.push({ theta, d });
        }
        families.push(centerFamily);

        return families;
    }

    mutateGenome(genome, step, hard, rng, vertices) {
        const out = this.cloneGenome(genome);
        const k = hard ? out.length : (rng.next() < 0.8 ? 1 : 2);
        for (let j = 0; j < k; j++) {
            const idx = Math.floor(rng.next() * out.length);
            if (rng.next() < 0.7) out[idx].theta = this.wrapPI(out[idx].theta + rng.range(-step, step));
            const range = this.getProjectionRange(vertices, out[idx].theta);
            const span = Math.max(0.0001, range.max - range.min);
            if (rng.next() < 0.9) out[idx].d = out[idx].d + rng.range(-span * step, span * step);
            const margin = Math.max(1e-6, span * 0.001);
            out[idx].d = this.clampValue(out[idx].d, range.min + margin, range.max - margin);
        }
        return out;
    }

    isBetterFrontierCandidate(candidate, best) {
        if (!candidate) return false;
        if (!best) return true;
        return this.compareDetailedCandidate(candidate, best, 'frontier') < 0;
    }

    compareDetailedCandidate(a, b, mode = 'target') {
        if (!a && !b) return 0;
        if (!a) return 1;
        if (!b) return -1;

        const aCross = a.allLinesCross ? 1 : 0;
        const bCross = b.allLinesCross ? 1 : 0;
        if (aCross !== bCross) return bCross - aCross;

        const aCount = Number.isFinite(a.count) ? a.count : 0;
        const bCount = Number.isFinite(b.count) ? b.count : 0;
        if (mode === 'frontier' && aCount !== bCount) return bCount - aCount;

        const aCountDelta = Number.isFinite(a.countDelta) ? a.countDelta : Infinity;
        const bCountDelta = Number.isFinite(b.countDelta) ? b.countDelta : Infinity;
        if (mode !== 'frontier' && aCountDelta !== bCountDelta) return aCountDelta - bCountDelta;

        const aWithin = a.allWithinThreshold ? 1 : 0;
        const bWithin = b.allWithinThreshold ? 1 : 0;
        if (aWithin !== bWithin) return bWithin - aWithin;

        const aTopo = Number.isFinite(a.topologyPenalty) ? a.topologyPenalty : Infinity;
        const bTopo = Number.isFinite(b.topologyPenalty) ? b.topologyPenalty : Infinity;
        if (aTopo !== bTopo) return aTopo - bTopo;

        const aDiff = Number.isFinite(a.diffPct) ? a.diffPct : Infinity;
        const bDiff = Number.isFinite(b.diffPct) ? b.diffPct : Infinity;
        if (aDiff !== bDiff) return aDiff - bDiff;

        const aStd = Number.isFinite(a.stdPct) ? a.stdPct : Infinity;
        const bStd = Number.isFinite(b.stdPct) ? b.stdPct : Infinity;
        if (aStd !== bStd) return aStd - bStd;

        const aMad = Number.isFinite(a.madPct) ? a.madPct : Infinity;
        const bMad = Number.isFinite(b.madPct) ? b.madPct : Infinity;
        if (aMad !== bMad) return aMad - bMad;

        const aSliver = Number.isFinite(a.sliverPenalty) ? a.sliverPenalty : Infinity;
        const bSliver = Number.isFinite(b.sliverPenalty) ? b.sliverPenalty : Infinity;
        if (aSliver !== bSliver) return aSliver - bSliver;

        const aScore = Number.isFinite(a.score) ? a.score : Infinity;
        const bScore = Number.isFinite(b.score) ? b.score : Infinity;
        if (aScore !== bScore) return aScore - bScore;
        return 0;
    }

    scoreSolutionDetailed(pieces, targetPieces, totalArea, thresholdPct, allLinesCross) {
        const strictMode = !!this.creatorState.strictMode;
        const rawPieces = Array.isArray(pieces) ? pieces : [];
        const rawCount = rawPieces.length;
        const target = Math.max(2, Number(targetPieces) || 2);
        const baseThreshold = Number.isFinite(Number(thresholdPct))
            ? Number(thresholdPct)
            : this.getCreatorMaxDifferentialPercent();
        // In strict mode, we tighten the effective threshold to force better solutions
        const thresholdUsed = baseThreshold;

        const sanitizedPieces = (typeof Geometry !== 'undefined' && typeof Geometry.sanitizePieces === 'function')
            ? Geometry.sanitizePieces(rawPieces, totalArea, {
                minAreaRatio: strictMode ? 0.002 : 0.001, // Stricter area requirement
                minAbsArea: strictMode ? 1e-6 : 1e-7,
                collinearEps: strictMode ? 5e-7 : 1e-6
            })
            : rawPieces;

        const areas = sanitizedPieces
            .map(p => Math.abs(Geometry.getArea(p.vertices)))
            .filter(a => Number.isFinite(a) && a > 0);

        const count = areas.length;
        const countDelta = Math.abs(count - target);
        const topologyPenalty = Math.max(0, rawCount - count);

        if (count < 1) {
            return {
                score: 1e14,
                count,
                countDelta,
                valid: false,
                allLinesCross: !!allLinesCross,
                diffPct: Infinity,
                stdPct: Infinity,
                madPct: Infinity,
                minA: 0,
                maxA: 0,
                sliverPenalty: 0,
                topologyPenalty,
                pieceDiffFromLargest: [],
                allWithinThreshold: false,
                thresholdUsed,
                confidence: 0,
                pieces: sanitizedPieces
            };
        }

        const minA = Math.min(...areas);
        const maxA = Math.max(...areas);
        const diffPct = maxA > 0 ? ((maxA - minA) / maxA) * 100 : Infinity;
        const pieceDiffFromLargest = maxA > 0
            ? areas.map(a => ((maxA - a) / maxA) * 100)
            : areas.map(() => 0);

        // Tolerance check: stricter in strict mode
        const toleranceEps = strictMode ? 1e-4 : 1e-2;
        const allWithinThreshold = Number.isFinite(diffPct) && diffPct <= thresholdUsed + toleranceEps;

        const ideal = count > 0 ? (totalArea / count) : 0;
        let varSum = 0;
        let absSum = 0;
        let worst = 0;
        let sliverPenalty = 0;

        // Dynamic sliver threshold based on ideal area
        const sliverThreshold = ideal * (strictMode ? 0.15 : 0.08);

        areas.forEach(a => {
            const dev = ideal > 0 ? Math.abs(a - ideal) / ideal : 1;
            absSum += dev;
            varSum += dev * dev;
            if (dev > worst) worst = dev;
            if (sliverThreshold > 0 && a < sliverThreshold) sliverPenalty += 1;
        });

        const stdPct = Math.sqrt(varSum / Math.max(1, areas.length)) * 100;
        const madPct = (absSum / Math.max(1, areas.length)) * 100;

        const valid = !!allLinesCross
            && countDelta === 0
            && allWithinThreshold
            && Number.isFinite(diffPct)
            && topologyPenalty === 0
            && sliverPenalty === 0; // Slivers are never valid in robust mode

        let score = 0;

        // Primary: Must satisfy line crossing constraint
        if (!allLinesCross) score += 1e14;

        // Primary: Must match target piece count
        score += countDelta * 1e12;

        // Secondary: Topology cleanliness (no ghost pieces)
        score += topologyPenalty * 1e10;

        // Secondary: Sliver avoidance
        score += sliverPenalty * 1e9;

        // Tertiary: Equality (diffPct)
        // If we are not within threshold, penalize heavily based on how far off we are
        if (!allWithinThreshold && Number.isFinite(diffPct)) {
            score += Math.max(0, diffPct - thresholdUsed) * 1e7;
        }

        // Minimize the diffPct itself
        score += (Number.isFinite(diffPct) ? diffPct : 1e6) * 1e5;

        // Minimize variance (Standard Deviation)
        score += stdPct * 1e3;

        // Minimize worst outlier
        score += worst * 1e4;

        const confidenceBase = Math.max(0, 1 - (Number.isFinite(diffPct) ? (diffPct / Math.max(1, thresholdUsed * 1.5)) : 1));
        const confidence = Math.max(0, Math.min(1,
            confidenceBase
            * (allLinesCross ? 1 : 0.1)
            * (countDelta === 0 ? 1 : 0.1)
            * (1 / (1 + sliverPenalty + topologyPenalty))
        ));

        return {
            score,
            count,
            countDelta,
            valid,
            allLinesCross: !!allLinesCross,
            diffPct,
            stdPct,
            madPct,
            minA,
            maxA,
            worst,
            sliverPenalty,
            topologyPenalty,
            pieceDiffFromLargest,
            allWithinThreshold,
            thresholdUsed,
            confidence,
            pieces: sanitizedPieces
        };
    }

    evaluateGenome(genome, vertices, targetPieces, thresholdPct, totalArea, bounds) {
        const lines = genome.map(g => this.lineFromThetaD(g.theta, g.d, bounds));
        const applied = this.applyCutsDetailed(vertices, lines);
        const scored = this.scoreSolutionDetailed(applied.pieces, targetPieces, totalArea, thresholdPct, applied.allLinesCross);
        return { ...scored, lines, allLinesCross: applied.allLinesCross };
    }

    solveForTargetPiecesAsync({ vertices, numLines, targetPieces, effort, seed, thresholdPct, runId, onUpdate, objective = 'target', minPieceTarget = 2 }) {
        return new Promise((resolve) => {
            const rng = this.createSeededRng((seed >>> 0) + 1337);
            const totalArea = Math.abs(Geometry.getArea(vertices));
            const objectiveIsFrontier = objective === 'frontier';
            const strictMode = !!this.creatorState.strictMode;

            // Increased iteration counts for better exhaustion
            const baseIter = objectiveIsFrontier ? 2000 : 1200;
            const effortScale = objectiveIsFrontier ? 600 : 450;
            const strictBoost = strictMode ? 2.5 : 1;
            let maxIter = Math.max(baseIter, Math.floor(effort * effortScale * strictBoost));

            // Larger batch and elite sizes
            const batchSize = strictMode ? 100 : 75;
            const eliteSize = strictMode ? 25 : 16;

            const bounds = this.getVerticesBounds(vertices);
            const elite = [];
            const diagnostics = {
                objective,
                targetPieces,
                numLines,
                seed: (seed >>> 0),
                strictMode,
                maxIter,
                batchSize,
                evaluations: 0,
                improvements: 0,
                plateauStreak: 0,
                maxPlateauStreak: 0,
                testedPieceCounts: {},
                validCount: 0,
                crossingCount: 0,
                bestScoreHistory: [],
                startedAt: Date.now(),
                finishedAt: null,
                elapsedMs: 0
            };

            const compareMode = objectiveIsFrontier ? 'frontier' : 'target';
            const isBetter = (a, b) => this.compareDetailedCandidate(a, b, compareMode) < 0;

            const pushElite = (candidate) => {
                // Diversity check: Don't add if very similar to existing elite (simple score check for speed)
                // This prevents the elite pool from becoming homogenous
                if (elite.length >= eliteSize) {
                    const worst = elite[elite.length - 1];
                    if (!isBetter(candidate, worst)) return;
                }

                elite.push(candidate);
                elite.sort((a, b) => this.compareDetailedCandidate(a, b, compareMode));
                if (elite.length > eliteSize) elite.length = eliteSize;
            };

            // Seed initial population with smart guesses
            const guidedFamilies = this.makeGuidedGenomeFamilies(numLines, rng, vertices);
            guidedFamilies.forEach(g => {
                if (Array.isArray(g) && g.length === numLines) {
                    pushElite(this.evaluateGenome(g, vertices, targetPieces, thresholdPct, totalArea, bounds));
                }
            });

            // Fill rest of elite with randoms if needed, or just diversity
            for (let i = 0; i < 20; i++) {
                const g = (i % 3 === 0)
                    ? this.makeStrategicGenome(numLines, rng, vertices)
                    : this.makeRandomGenome(numLines, rng, vertices);
                pushElite(this.evaluateGenome(g, vertices, targetPieces, thresholdPct, totalArea, bounds));
            }

            let best = elite[0] || null;
            let iter = 0;
            let refinementPhase = false;

            if (best) {
                diagnostics.bestScoreHistory.push({
                    iter,
                    count: best.count,
                    diffPct: best.diffPct,
                    score: best.score,
                    valid: !!best.valid,
                    confidence: Number(best.confidence) || 0
                });
            }

            const loop = () => {
                if (this.creatorState.solveRunId !== runId) {
                    resolve(null);
                    return;
                }

                // If we found a valid solution in target mode, we can switch to refinement early
                // but keep searching for better quality (lower diffPct)

                const currentBatch = refinementPhase ? (batchSize / 2) : batchSize;

                for (let b = 0; b < currentBatch; b++) {
                    iter++;
                    const prog = Math.min(1, iter / maxIter);

                    // Adaptive mutation rate
                    let step = Math.max(0.005, (objectiveIsFrontier ? 0.45 : 0.35) * (1 - prog));

                    // Stagnation breaker
                    if (diagnostics.plateauStreak > (strictMode ? 500 : 300)) {
                        step = 0.5; // Big jump
                    }

                    // Selection: Bias towards top of elite
                    let parent = best;
                    if (elite.length > 0 && rng.next() < 0.85) {
                        // Skewed random selection
                        const idx = Math.floor(Math.pow(rng.next(), 2.5) * elite.length);
                        parent = elite[idx] || best;
                    }
                    if (!parent) continue;

                    let childGenome;

                    // Crossover / Mutation Logic
                    if (iter % 300 === 0 && rng.next() < 0.3 && guidedFamilies.length > 0) {
                        // Injection from guided families
                        childGenome = this.cloneGenome(guidedFamilies[Math.floor(rng.next() * guidedFamilies.length)]);
                    } else if (rng.next() < 0.05) {
                        // Total random injection
                        childGenome = this.makeRandomGenome(numLines, rng, vertices);
                    } else {
                        // Mutation
                        // In refinement, we use very small steps
                        const effectiveStep = refinementPhase ? 0.005 : step;
                        const hardMutate = !refinementPhase && rng.next() < (best.valid ? 0.15 : 0.35);

                        childGenome = this.mutateGenome(parent.lines.map(line => {
                            // Reconstruct genome from lines (theta, d)
                            // Note: evaluateGenome converts genome -> lines, we need lines -> genome here or store genome in candidate
                            // The candidate 'lines' property are segment objects {start, end}.
                            // We need to recover theta/d or store them.
                            // Currently `evaluateGenome` returns lines but not the source genome parameters explicitly in `lines`.
                            // However, we can re-calculate or better yet, let's look at `mutateGenome`.
                            // `mutateGenome` takes a genome (array of {theta, d}).
                            // Ah, `best` object currently DOES NOT store the genome {theta, d}, only the resulting lines.
                            // We must fix `evaluateGenome` to return the genome as well, or re-calculate it.
                            // Re-calculating from segment is easy:
                            const dx = line.end.x - line.start.x;
                            const dy = line.end.y - line.start.y;
                            // Normal angle
                            const theta = this.wrapPI(Math.atan2(dy, dx) + Math.PI / 2);
                            // Distance from origin to line
                            const d = line.start.x * Math.cos(theta) + line.start.y * Math.sin(theta);
                            return { theta, d };
                        }), effectiveStep, hardMutate, rng, vertices);
                    }

                    const result = this.evaluateGenome(childGenome, vertices, targetPieces, thresholdPct, totalArea, bounds);

                    diagnostics.evaluations++;
                    if (result.allLinesCross) diagnostics.crossingCount++;
                    if (result.valid) diagnostics.validCount++;
                    const countKey = `${Math.max(0, Number(result.count) || 0)}`;
                    diagnostics.testedPieceCounts[countKey] = (diagnostics.testedPieceCounts[countKey] || 0) + 1;

                    // Filter useless results to save CPU
                    if (objectiveIsFrontier) {
                        if (result.count < Math.max(2, minPieceTarget - 3) && rng.next() < 0.9) continue;
                    } else {
                        // In target mode, if piece count is way off, discard mostly
                        if (Math.abs(result.count - targetPieces) > 2 && rng.next() < 0.9) continue;
                    }

                    const better = !best || isBetter(result, best);

                    if (better) {
                        best = result;
                        pushElite(result);
                        diagnostics.improvements++;
                        diagnostics.plateauStreak = 0;
                        diagnostics.bestScoreHistory.push({
                            iter,
                            count: result.count,
                            diffPct: result.diffPct,
                            score: result.score,
                            valid: !!result.valid,
                            confidence: Number(result.confidence) || 0
                        });
                    } else if (
                        elite.length < eliteSize ||
                        isBetter(result, elite[elite.length - 1])
                    ) {
                        pushElite(result);
                        diagnostics.plateauStreak++;
                    } else {
                        diagnostics.plateauStreak++;
                    }

                    if (diagnostics.plateauStreak > diagnostics.maxPlateauStreak) {
                        diagnostics.maxPlateauStreak = diagnostics.plateauStreak;
                    }
                }

                // UI Updates
                if (iter % (strictMode ? 60 : 40) === 0 && onUpdate && best) {
                    onUpdate({
                        best,
                        iter,
                        maxIter,
                        targetPieces,
                        diagnostics: { ...diagnostics, testedPieceCounts: { ...diagnostics.testedPieceCounts } }
                    });
                }

                if (iter < maxIter) {
                    requestAnimationFrame(loop);
                } else if (!refinementPhase && strictMode && best && best.valid) {
                    // Enter Refinement Phase
                    refinementPhase = true;
                    iter = 0;
                    // Short, focused refinement
                    maxIter = 400;
                    // Reset elite to just the best one to focus search
                    elite.length = 0;
                    pushElite(best);
                    requestAnimationFrame(loop);
                } else {
                    diagnostics.finishedAt = Date.now();
                    diagnostics.elapsedMs = Math.max(0, diagnostics.finishedAt - diagnostics.startedAt);
                    if (best) {
                        best.solverDiagnostics = diagnostics;
                    }
                    resolve(best);
                }
            };

            loop();
        });
    }

    async solveToTarget() {
        // Allow active interruption: Cancel any running solver first
        if (this.creatorState.isSolving) {
            this.creatorState.isSolving = false;
            // Increment run ID to invalidate the previous async loop immediately
            this.creatorState.solveRunId = (this.creatorState.solveRunId || 0) + 1;
        }

        if (!this.creatorState.vertices || this.creatorState.vertices.length < 3) return;

        const maxLines = Math.max(1, this.creatorState.maxLines);
        const effort = Math.max(1, this.creatorState.searchEffort || 5);
        const autoEffort = 10;
        const threshold = this.getCreatorMaxDifferentialPercent();
        const theoreticalMax = this.getTheoreticalMaxPiecesForLines(maxLines);
        const vertices = this.creatorState.vertices.map(v => ({ x: v.x, y: v.y }));
        const shapeAdjustedMax = this.getShapeAdjustedMaxPiecesForLines(maxLines, vertices);
        const scanStartPieces = Math.min(theoreticalMax, Math.max(2, shapeAdjustedMax + 1));
        const runId = Date.now();

        // Always start from a clean line state before each solve run.
        // This ensures the grid is cleared of previous solutions.
        this.clearCreatorLinesOnly(false);

        this.creatorState.solveRunId = runId;
        this.creatorState.isSolving = true;
        this.creatorState.lastSolveDiagnostics = null;
        this.creatorState.solverPreviewLines = [];
        this.creatorState.solveSession = {
            phase: this.creatorState.autoMaximize ? 'auto-max' : 'target',
            targetPieces: this.creatorState.targetPieces,
            maxLines,
            attempt: 0,
            attempts: this.creatorState.autoMaximize ? Math.max(1, scanStartPieces - 1) : 5,
            progressPct: 0,
            activeLineCount: 0,
            previewLineCount: 0,
            lineActivationProgress: 0,
            activationSpeedMs: 170,
            lastTickTs: (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now()
        };
        this.creatorState.lastSolveMeta = 'Solving...';

        const solveDiagnostics = {
            runId,
            startedAt: new Date().toISOString(),
            mode: this.creatorState.autoMaximize ? 'auto-maximize' : 'target',
            strictMode: !!this.creatorState.strictMode,
            maxLines,
            thresholdPct: threshold,
            requestedEffort: effort,
            attempts: [],
            testedPieceCounts: {},
            totalEvaluations: 0,
            totalImprovements: 0,
            maxPlateauStreak: 0,
            bestCandidateSummary: null,
            finishedAt: null,
            elapsedMs: 0,
            selectionRationale: ''
        };

        const mergeAttemptDiagnostics = (stage, target, attempt, result) => {
            if (!result || !result.solverDiagnostics) return;
            const d = result.solverDiagnostics;
            const testedPieceCounts = d.testedPieceCounts || {};
            Object.keys(testedPieceCounts).forEach(k => {
                solveDiagnostics.testedPieceCounts[k] = (solveDiagnostics.testedPieceCounts[k] || 0) + (testedPieceCounts[k] || 0);
            });
            solveDiagnostics.totalEvaluations += Number(d.evaluations) || 0;
            solveDiagnostics.totalImprovements += Number(d.improvements) || 0;
            solveDiagnostics.maxPlateauStreak = Math.max(solveDiagnostics.maxPlateauStreak, Number(d.maxPlateauStreak) || 0);
            solveDiagnostics.attempts.push({
                stage,
                targetPieces: target,
                attempt,
                objective: d.objective,
                maxIter: d.maxIter,
                evaluations: d.evaluations,
                improvements: d.improvements,
                maxPlateauStreak: d.maxPlateauStreak,
                validCount: d.validCount,
                crossingCount: d.crossingCount,
                best: {
                    count: result.count,
                    countDelta: result.countDelta,
                    valid: !!result.valid,
                    allLinesCross: !!result.allLinesCross,
                    diffPct: Number.isFinite(result.diffPct) ? Number(result.diffPct.toFixed(4)) : null,
                    stdPct: Number.isFinite(result.stdPct) ? Number(result.stdPct.toFixed(4)) : null,
                    madPct: Number.isFinite(result.madPct) ? Number(result.madPct.toFixed(4)) : null,
                    topologyPenalty: Number(result.topologyPenalty) || 0,
                    sliverPenalty: Number(result.sliverPenalty) || 0,
                    confidence: Number.isFinite(result.confidence) ? Number(result.confidence.toFixed(4)) : 0,
                    score: Number.isFinite(result.score) ? Number(result.score.toFixed(4)) : null
                }
            });
        };

        this.scheduleCreatorRenderTick();
        this.updateCreatorInfo();
        this.renderCreatorCanvas();

        let chosen = null;
        let foundValid = false;
        let chosenMeta = 'No solution';

        try {
            if (this.creatorState.autoMaximize) {
                // Phase 1: maximize structural piece frontier with exact required line count.
                // Auto Maximize always runs at max effort (10), independent of slider value.
                const frontierEffort = autoEffort;
                const frontierResult = await this.solveForTargetPiecesAsync({
                    vertices,
                    numLines: maxLines,
                    targetPieces: scanStartPieces,
                    effort: frontierEffort,
                    seed: this.creatorState.seed,
                    thresholdPct: threshold,
                    runId,
                    objective: 'frontier',
                    minPieceTarget: Math.max(2, this.creatorState.targetPieces || 2),
                    onUpdate: ({ best, iter, maxIter }) => {
                        const previewLines = best?.lines || [];
                        this.creatorState.solverPreviewLines = previewLines;
                        if (this.creatorState.solveSession) {
                            const session = this.creatorState.solveSession;
                            session.phase = 'frontier-max';
                            session.targetPieces = scanStartPieces;
                            session.attempt = 1;
                            session.attempts = 2;
                            session.progressPct = maxIter > 0 ? Math.max(0, Math.min(100, (iter / maxIter) * 100)) : 0;
                            session.previewLineCount = previewLines.length;
                            session.activeLineCount = Math.min(session.activeLineCount || 0, previewLines.length);
                        }
                        this.creatorState.lastSolveMeta = `Frontier: ${best?.allLinesCross ? 'crossing' : 'non-crossing'} • ${best?.count ?? '?'} pcs • diff ${isFinite(best?.diffPct) ? best.diffPct.toFixed(2) : '?'}%`;
                        this.updateCreatorInfo();
                        this.renderCreatorCanvas();
                    }
                });
                if (!frontierResult || this.creatorState.solveRunId !== runId) return;
                mergeAttemptDiagnostics('frontier', scanStartPieces, 1, frontierResult);

                const bestStructuralPieces = Math.min(
                    theoreticalMax,
                    Math.max(2, scanStartPieces, Number(frontierResult?.count) || 2)
                );
                let bestAttempt = null;

                // Phase 2: refine equality for highest feasible piece count first, then fallback downward.
                for (let target = bestStructuralPieces; target >= 2; target--) {
                    // Significantly increased attempts for robust detection
                    // Strict mode: 12 attempts per target level to ensure we don't miss a valid configuration
                    // Normal mode: 7 attempts
                    const attemptsForTarget = this.creatorState.strictMode ? 12 : 7;
                    let bestForTarget = null;

                    for (let attempt = 1; attempt <= attemptsForTarget; attempt++) {
                        const result = await this.solveForTargetPiecesAsync({
                            vertices,
                            numLines: maxLines,
                            targetPieces: target,
                            effort: autoEffort,
                            // Diversify seeds more aggressively
                            seed: ((this.creatorState.seed || 1) + target * 7919 + attempt * 104729) >>> 0,
                            thresholdPct: threshold,
                            runId,
                            objective: 'target',
                            onUpdate: ({ best, iter, maxIter }) => {
                                const previewLines = best?.lines || [];
                                this.creatorState.solverPreviewLines = previewLines;
                                if (this.creatorState.solveSession) {
                                    const session = this.creatorState.solveSession;
                                    session.phase = 'equalize-refine';
                                    session.targetPieces = target;
                                    session.attempt = attempt;
                                    session.attempts = attemptsForTarget;
                                    session.progressPct = maxIter > 0 ? Math.max(0, Math.min(100, (iter / maxIter) * 100)) : 0;
                                    session.previewLineCount = previewLines.length;
                                    session.activeLineCount = Math.min(session.activeLineCount || 0, previewLines.length);
                                }
                                this.creatorState.lastSolveMeta = `Refine ${target} pcs (Try ${attempt}/${attemptsForTarget}) • Found ${best?.count ?? '?'} • Diff ${isFinite(best?.diffPct) ? best.diffPct.toFixed(2) : '?'}% • ${best?.valid ? 'VALID' : 'INVALID'}`;
                                this.updateCreatorInfo();
                                this.renderCreatorCanvas();
                            }
                        });
                        if (!result || this.creatorState.solveRunId !== runId) return;
                        mergeAttemptDiagnostics('auto-target-scan', target, attempt, result);
                        if (!bestAttempt || this.compareDetailedCandidate(result, bestAttempt, 'target') < 0) bestAttempt = result;

                        // Keep the best valid result for this target count
                        if (!bestForTarget || this.compareDetailedCandidate(result, bestForTarget, 'target') < 0) {
                            bestForTarget = result;
                        }
                    }

                    if (bestForTarget && bestForTarget.valid) {
                        chosen = bestForTarget.lines;
                        foundValid = true;
                        chosenMeta = `MAX VALID ${target} pcs @ ${bestForTarget.diffPct.toFixed(2)}% (conf ${(Math.max(0, Math.min(1, bestForTarget.confidence || 0)) * 100).toFixed(1)}%)`;
                        solveDiagnostics.selectionRationale = `Selected highest solved piece-count (${target}) after exhaustive attempts for that count.`;
                        solveDiagnostics.bestCandidateSummary = {
                            count: bestForTarget.count,
                            diffPct: Number.isFinite(bestForTarget.diffPct) ? Number(bestForTarget.diffPct.toFixed(4)) : null,
                            confidence: Number.isFinite(bestForTarget.confidence) ? Number(bestForTarget.confidence.toFixed(4)) : 0,
                            valid: !!bestForTarget.valid
                        };
                        break;
                    }
                }

                if (!chosen) {
                    chosenMeta = `NO VALID solution • frontier ${bestStructuralPieces} pcs • best diff ${bestAttempt && isFinite(bestAttempt.diffPct) ? bestAttempt.diffPct.toFixed(2) : '?'}%`;
                    solveDiagnostics.selectionRationale = 'No valid candidate found within threshold after all tested targets/attempts.';
                    solveDiagnostics.bestCandidateSummary = bestAttempt
                        ? {
                            count: bestAttempt.count,
                            diffPct: Number.isFinite(bestAttempt.diffPct) ? Number(bestAttempt.diffPct.toFixed(4)) : null,
                            confidence: Number.isFinite(bestAttempt.confidence) ? Number(bestAttempt.confidence.toFixed(4)) : 0,
                            valid: !!bestAttempt.valid
                        }
                        : null;
                    await this.showImpossibilityModal(bestStructuralPieces, maxLines);
                }
            } else {
                const target = Math.max(2, this.creatorState.targetPieces || 2);
                if (target > theoreticalMax) {
                    chosenMeta = `Target ${target} exceeds theoretical max ${theoreticalMax}.`;
                    await this.showImpossibilityModal(target, maxLines);
                    return;
                }
                const attempts = this.creatorState.strictMode ? 10 : 5;
                let bestAttempt = null;
                for (let attempt = 1; attempt <= attempts; attempt++) {
                    const result = await this.solveForTargetPiecesAsync({
                        vertices,
                        numLines: maxLines,
                        targetPieces: target,
                        effort: effort * 1.5,
                        seed: ((this.creatorState.seed || 1) + attempt * 9999 + target * 7) >>> 0,
                        thresholdPct: threshold,
                        runId,
                        objective: 'target',
                        onUpdate: ({ best, iter, maxIter }) => {
                            const previewLines = best?.lines || [];
                            this.creatorState.solverPreviewLines = previewLines;
                            if (this.creatorState.solveSession) {
                                const session = this.creatorState.solveSession;
                                session.phase = 'target';
                                session.targetPieces = target;
                                session.attempt = attempt;
                                session.attempts = attempts;
                                session.progressPct = maxIter > 0 ? Math.max(0, Math.min(100, (iter / maxIter) * 100)) : 0;
                                session.previewLineCount = previewLines.length;
                                session.activeLineCount = Math.min(session.activeLineCount || 0, previewLines.length);
                            }
                            this.creatorState.lastSolveMeta = `Targeting ${target} pcs (Attempt ${attempt}/${attempts}) • Found ${best?.count ?? '?'} • Diff ${isFinite(best?.diffPct) ? best.diffPct.toFixed(2) : '?'}% • ${best?.valid ? 'VALID' : 'INVALID'}`;
                            this.updateCreatorInfo();
                            this.renderCreatorCanvas();
                        }
                    });
                    if (!result || this.creatorState.solveRunId !== runId) return;
                    mergeAttemptDiagnostics('target', target, attempt, result);
                    if (!bestAttempt || this.compareDetailedCandidate(result, bestAttempt, 'target') < 0) bestAttempt = result;
                }
                if (bestAttempt && bestAttempt.valid) {
                    chosen = bestAttempt.lines;
                    foundValid = true;
                    chosenMeta = `VALID ${target} pcs @ ${bestAttempt.diffPct.toFixed(2)}% (conf ${(Math.max(0, Math.min(1, bestAttempt.confidence || 0)) * 100).toFixed(1)}%)`;
                    solveDiagnostics.selectionRationale = `Selected best lexicographic candidate across ${attempts} attempts for target ${target}.`;
                    solveDiagnostics.bestCandidateSummary = {
                        count: bestAttempt.count,
                        diffPct: Number.isFinite(bestAttempt.diffPct) ? Number(bestAttempt.diffPct.toFixed(4)) : null,
                        confidence: Number.isFinite(bestAttempt.confidence) ? Number(bestAttempt.confidence.toFixed(4)) : 0,
                        valid: !!bestAttempt.valid
                    };
                } else {
                    chosenMeta = `FAILED target ${target} • best diff ${bestAttempt && isFinite(bestAttempt.diffPct) ? bestAttempt.diffPct.toFixed(2) : '?'}%`;
                    solveDiagnostics.selectionRationale = `No valid target-${target} candidate found after ${attempts} attempts.`;
                    solveDiagnostics.bestCandidateSummary = bestAttempt
                        ? {
                            count: bestAttempt.count,
                            diffPct: Number.isFinite(bestAttempt.diffPct) ? Number(bestAttempt.diffPct.toFixed(4)) : null,
                            confidence: Number.isFinite(bestAttempt.confidence) ? Number(bestAttempt.confidence.toFixed(4)) : 0,
                            valid: !!bestAttempt.valid
                        }
                        : null;
                    await this.showImpossibilityModal(target, maxLines);
                }
            }
        } finally {
            if (this.creatorState.solveRunId !== runId) return;
            this.creatorState.isSolving = false;
            this.creatorRenderTickRequested = false;
            this.creatorState.solverPreviewLines = [];
            if (foundValid && chosen && Array.isArray(chosen)) this.creatorState.lines = chosen;
            this.creatorState.solveSession = null;
            this.creatorState.lastSolveMeta = chosenMeta;
            solveDiagnostics.finishedAt = new Date().toISOString();
            solveDiagnostics.elapsedMs = Math.max(0, Date.now() - runId);
            this.creatorState.lastSolveDiagnostics = solveDiagnostics;
            this.updateCreatorInfo();
            this.renderCreatorCanvas();
        }
    }

    async openAddToLevelModal(prefillIndex = null) {
        const levelCount = this.game.levels.length;
        const idx = Number.isFinite(prefillIndex) ? prefillIndex : this.creatorState.selectedLevelIndex;
        const current = this.game.levels[idx] || this.game.levels[0];
        const stars = this.game.getLevelStarThresholds(current || {});
        const levelVal = await this.openFormModal({
            title: 'Add to Level',
            fields: [
                { key: 'level', label: 'Target Level', type: 'number', min: 1, max: levelCount, value: (idx + 1) },
                { key: 'lines', label: 'Max Lines', type: 'number', min: 1, max: 12, value: this.creatorState.maxLines },
                { key: 'pieces', label: 'Target Pieces', type: 'number', min: 2, max: 16, value: this.creatorState.targetPieces },
                { key: 'one', label: '1 Star differential %', type: 'number', min: 1, max: 100, value: this.creatorState.starPercent.one || Math.round(stars.one * 100) },
                { key: 'two', label: '2 Star differential %', type: 'number', min: 1, max: 100, value: this.creatorState.starPercent.two || Math.round(stars.two * 100) },
                { key: 'three', label: '3 Star differential %', type: 'number', min: 1, max: 100, value: this.creatorState.starPercent.three || Math.round(stars.three * 100) }
            ]
        });
        if (!levelVal) return;

        const levelIndex = Math.max(0, Math.min(levelCount - 1, Number(levelVal.level) - 1));
        const lines = Math.max(1, Number(levelVal.lines) || 3);
        const pieces = Math.max(2, Number(levelVal.pieces) || 2);
        let one = Math.max(1, Number(levelVal.one) || 18);
        let two = Math.max(1, Number(levelVal.two) || 12);
        let three = Math.max(1, Number(levelVal.three) || 6);
        if (two > one) two = one;
        if (three > two) three = two;

        const confirmed = await window.appConfirm(
            `Confirm update Level ${levelIndex + 1}?\nLines: ${lines}\nPieces: ${pieces}\nThresholds: 1★ ${one}% / 2★ ${two}% / 3★ ${three}%`,
            { title: 'Confirm Add to Level', confirmText: 'Confirm', cancelText: 'Cancel' }
        );
        if (!confirmed) return;

        const clippedVertices = this.getClippedCreatorVerticesForSave();
        if (!clippedVertices.length) {
            await window.appAlert(
                'No valid shape remains inside the highlighted gameplay area. Draw at least 3 vertices inside the blue region.',
                { title: 'Cannot Save Level', confirmText: 'OK' }
            );
            return;
        }

        const base = this.game.baseLevels[levelIndex] || this.game.levels[levelIndex];
        const ok = this.game.upsertLevelOverride(levelIndex, {
            ...base,
            startShapeVertices: clippedVertices,
            targetPieces: pieces,
            maxLines: lines,
            starThresholds: { one: one / 100, two: two / 100, three: three / 100 }
        });

        if (ok) {
            this.creatorState.selectedLevelIndex = levelIndex;
            this.creatorState.targetPieces = pieces;
            this.creatorState.maxLines = lines;
            this.creatorState.starPercent = { one, two, three };
            this.populateList();
            if (this.game.currentMode) this.game.currentMode.loadLevel(levelIndex);
        }
    }

    async runHardcoreSaveFlow() {
        const confirmationMessage = 'This will save all current level settings permanently into the application. Click Confirm to proceed.';
        const confirmed = await window.appConfirm(confirmationMessage, {
            title: 'Hardcore Save',
            confirmText: 'Confirm',
            cancelText: 'Cancel'
        });

        if (!confirmed) {
            return;
        }

        const result = this.game.commitHardcoreLevelsFromCurrentConfig();
        if (!result?.ok) {
            const message = result?.error || 'Hardcore Save failed during validation or storage write.';
            if (typeof window.appAlert === 'function') {
                await window.appAlert(message, { title: 'Hardcore Save Failed', confirmText: 'OK' });
            } else {
                window.alert(message);
            }
            return;
        }

        this.populateList();
        this.hydrateCreatorFromCurrentLevel(true, this.creatorState.selectedLevelIndex || 0);
        this.syncCreatorControls();
        this.syncCreatorControlText();
        this.updateCreatorInfo();
        this.renderCreatorCanvas();

        let summary = `Hardcore Save complete (${result.levelsCommitted} levels committed).`;
        if (result?.export?.ok) {
            summary += ' Generated levels.js download started — replace js/levels.js with that file, then commit to GitHub.';
        } else {
            summary += ' Generated source is available in window.__hardcoreLevelsSourceCode (download failed in this browser).';
        }

        if (this.game?.app && typeof this.game.app.showToast === 'function') {
            this.game.app.showToast('Hardcore Save complete.');
        }

        if (typeof window.appAlert === 'function') {
            await window.appAlert(summary, {
                title: 'Hardcore Save Complete',
                confirmText: 'OK'
            });
        }
    }

    async openFormModal(config) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,.72);z-index:12000;display:flex;align-items:center;justify-content:center;';
            const card = document.createElement('div');
            card.style.cssText = 'background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:12px;padding:14px;min-width:320px;max-width:420px;';
            const fieldsHtml = config.fields.map(f => `<label style="display:flex;justify-content:space-between;gap:8px;font-size:12px;margin-bottom:8px;align-items:center;">${f.label}<input data-key="${f.key}" type="${f.type || 'text'}" min="${f.min ?? ''}" max="${f.max ?? ''}" value="${f.value ?? ''}" style="width:110px;background:#020617;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:4px 6px;"></label>`).join('');
            card.innerHTML = `
                <div style="font-weight:700;margin-bottom:10px;">${config.title || 'Edit'}</div>
                ${fieldsHtml}
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
                    <button data-act="cancel" style="background:#1e293b;border:1px solid #334155;color:#e2e8f0;border-radius:8px;padding:6px 10px;">Cancel</button>
                    <button data-act="ok" style="background:#0ea5e9;border:1px solid #38bdf8;color:white;border-radius:8px;padding:6px 10px;">OK</button>
                </div>`;
            overlay.appendChild(card);
            document.body.appendChild(overlay);
            const close = (data) => { overlay.remove(); resolve(data); };
            card.querySelector('[data-act="cancel"]').onclick = () => close(null);
            card.querySelector('[data-act="ok"]').onclick = () => {
                const out = {};
                config.fields.forEach(f => {
                    const el = card.querySelector(`[data-key="${f.key}"]`);
                    out[f.key] = el ? el.value : '';
                });
                close(out);
            };
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
        });
    }

    populateList() {
        if (!this.levelList) return;
        const selected = Math.max(0, Number(this.creatorState.selectedLevelIndex) || 0);
        this.levelList.innerHTML = '';
        this.game.levels.forEach((level, index) => {
            const option = document.createElement('option');
            option.value = `${index}`;
            option.textContent = `#${level.id} ${level.name} • ${level.targetPieces} pcs • ${level.maxLines} lines${level.__isOverride ? ' • custom' : ''}`;
            this.levelList.appendChild(option);
        });
        this.levelList.value = `${Math.min(this.game.levels.length - 1, selected)}`;
    }

    async openLevelEditModal(index) {
        const level = this.game.levels[index];
        if (!level) return;
        const stars = this.game.getLevelStarThresholds(level);
        const values = await this.openFormModal({
            title: `Edit Level ${index + 1}`,
            fields: [
                { key: 'name', label: 'Name', type: 'text', value: level.name || `Level ${index + 1}` },
                { key: 'lines', label: 'Max Lines', type: 'number', min: 1, max: 12, value: level.maxLines || 3 },
                { key: 'pieces', label: 'Target Pieces', type: 'number', min: 2, max: 16, value: level.targetPieces || 4 },
                { key: 'one', label: '1 Star differential %', type: 'number', min: 1, max: 100, value: Math.round(stars.one * 100) },
                { key: 'two', label: '2 Star differential %', type: 'number', min: 1, max: 100, value: Math.round(stars.two * 100) },
                { key: 'three', label: '3 Star differential %', type: 'number', min: 1, max: 100, value: Math.round(stars.three * 100) }
            ]
        });
        if (!values) return;

        const shouldDelete = await window.appConfirm('Delete custom override for this level instead?', {
            title: 'Delete Override',
            confirmText: 'Delete',
            cancelText: 'Keep / Save'
        });
        if (shouldDelete) {
            this.game.removeLevelOverride(index);
            this.populateList();
            return;
        }

        let one = Math.max(1, Number(values.one) || 18);
        let two = Math.max(1, Number(values.two) || 12);
        let three = Math.max(1, Number(values.three) || 6);
        if (two > one) two = one;
        if (three > two) three = two;

        this.game.upsertLevelOverride(index, {
            ...level,
            name: values.name || level.name,
            maxLines: Math.max(1, Number(values.lines) || level.maxLines),
            targetPieces: Math.max(2, Number(values.pieces) || level.targetPieces),
            startShapeVertices: this.creatorState.vertices && this.creatorState.vertices.length >= 3
                ? this.creatorState.vertices.map(v => ({ x: v.x, y: v.y }))
                : level.startShapeVertices,
            starThresholds: { one: one / 100, two: two / 100, three: three / 100 }
        });
        this.populateList();
    }

    loadLevel(index) {
        if (this.game.state !== GameState.PLAYING) {
            this.game.startMode('beginner');
        }
        if (this.game.currentMode) {
            this.game.currentMode.loadLevel(index);
            // Close panel on mobile, keep open on desktop
            if (window.innerWidth < 768) this.hide();
        }
    }
}
