import { WORLDS, buildMissionTasks, getMissionById, getShapeChoices, getWorldById } from './data/mission-data.js';
import { PolygonBoard } from './engine/polygon-board.js';
import { getMissionRecord, loadProfile, resetProfile, saveProfile, setMissionRecord } from './storage/profile-store.js';
import { GameRouter } from './router.js';
import { renderMapScreen, renderMenuScreen, renderMissionScreen, renderResultsScreen } from './ui/renderers.js';

const QUIZ_IT_POLYGON_POINTS_BY_STARS = {
    1: 50,
    2: 100,
    3: 150
};

window.LAHSPointsBridge?.init({ gameId: 'math-quiz-it-polygon' });

class QuizItPolygonApp {
    constructor(root) {
        this.root = root;
        this.profile = loadProfile();
        this.router = new GameRouter(() => this.render());
        this.showSettings = false;
        this.showShapePicker = false;
        this.board = null;
        this.boardCanvas = null;
        this.boardSummary = null;
        this.boardCheckTimer = null;
        this.numberCheckTimer = null;
        this.advanceTimer = null;
        this.audioContext = null;
        this.musicTimer = null;
        this.didInteract = false;
        this.feedback = { kind: '', message: '' };
        this.answerValue = '';
        this.lastWrongChoice = '';
        this.activeRun = null;
        this.resultState = null;
        this.shapeChoices = getShapeChoices();

        document.body.classList.toggle('big-text', this.profile.settings.bigText);
        this.render();
    }

    getState() {
        const route = this.router.getState();
        const worlds = this.getWorldViewModels();
        const activeWorld = this.activeRun
            ? getWorldById(this.activeRun.worldId)
            : this.resultState
                ? getWorldById(this.resultState.worldId)
                : null;
        const activeMission = this.activeRun
            ? getMissionById(this.activeRun.worldId, this.activeRun.missionId)
            : this.resultState
                ? getMissionById(this.resultState.worldId, this.resultState.missionId)
                : null;
        return {
            route,
            screen: route.screen,
            params: route.params,
            profile: this.profile,
            worlds,
            showSettings: this.showSettings,
            showShapePicker: this.showShapePicker,
            nextMission: this.findNextMission(),
            activeWorld,
            activeMission,
            activeTask: this.activeRun ? this.activeRun.tasks[this.activeRun.taskIndex] : null,
            missionIndex: this.activeRun ? getWorldById(this.activeRun.worldId).missions.findIndex((mission) => mission.id === this.activeRun.missionId) : -1,
            taskIndex: this.activeRun?.taskIndex || 0,
            hintStage: this.activeRun?.hintStage || 0,
            maxHintStageUsed: this.activeRun?.maxHintStageUsed ?? this.resultState?.maxHintStageUsed ?? 0,
            mistakes: this.activeRun?.mistakes ?? this.resultState?.mistakes ?? 0,
            answerValue: this.answerValue,
            lastWrongChoice: this.lastWrongChoice,
            feedback: this.feedback,
            boardSummary: this.boardSummary,
            resultMessage: this.resultState?.message || '',
            stars: this.resultState?.stars || 0,
            pointsAwarded: this.resultState?.pointsAwarded || 0,
            shapeChoices: this.shapeChoices
        };
    }

    render() {
        const state = this.getState();
        document.body.classList.toggle('big-text', this.profile.settings.bigText);

        if (state.screen === 'menu') {
            this.root.innerHTML = renderMenuScreen(state);
        } else if (state.screen === 'map') {
            this.root.innerHTML = renderMapScreen(state);
        } else if (state.screen === 'mission') {
            this.root.innerHTML = renderMissionScreen(state);
        } else if (state.screen === 'results') {
            this.root.innerHTML = renderResultsScreen(state);
        }

        this.bindEvents();
        this.mountBoardIfNeeded();
        this.refreshLiveMissionBits();
        this.syncMusicLoop();
    }

    bindEvents() {
        this.root.onclick = (event) => {
            const target = event.target.closest('button');
            if (!target) {
                const modal = event.target.closest('[data-close-modal]');
                if (modal && event.target === modal) {
                    this.closeModal(modal.dataset.closeModal);
                }
                return;
            }

            this.noteInteraction();

            const nav = target.dataset.nav;
            if (nav === 'menu') {
                this.router.go('menu');
                return;
            }
            if (nav === 'map') {
                this.router.go('map');
                return;
            }
            if (nav === 'play') {
                this.startNextMission();
                return;
            }

            const modalName = target.dataset.openModal;
            if (modalName) {
                this.openModal(modalName);
                return;
            }

            const closeModal = target.dataset.closeModal;
            if (closeModal) {
                this.closeModal(closeModal);
                return;
            }

            if (target.dataset.startMission) {
                const [worldId, missionId] = target.dataset.startMission.split(':');
                this.startMission(worldId, missionId);
                return;
            }

            if (target.dataset.choice) {
                this.handleChoice(target.dataset.choice);
                return;
            }

            if (target.dataset.checkNumber) {
                this.checkNumber(true);
                return;
            }

            if (target.dataset.checkBoard) {
                this.checkBoardManual();
                return;
            }

            if (target.dataset.useHelp) {
                this.useHelp();
                return;
            }

            if (target.dataset.boardAction === 'undo') {
                this.board?.undo();
                return;
            }

            if (target.dataset.boardAction === 'reset') {
                this.board?.reset();
                return;
            }

            if (target.dataset.boardTool === 'move') {
                this.board?.setMode('move');
                return;
            }

            if (target.dataset.settingToggle) {
                this.toggleSetting(target.dataset.settingToggle);
                return;
            }

            if (target.dataset.resetProgress) {
                this.handleResetProgress();
                return;
            }

            if (target.dataset.speakNow) {
                this.speak(this.getSpeakText());
                return;
            }

            if (target.dataset.shapeChoice) {
                this.pickShape(target.dataset.shapeChoice);
                return;
            }

            const resultAction = target.dataset.resultsAction;
            if (resultAction === 'next') {
                this.handleResultNext();
                return;
            }
            if (resultAction === 'replay') {
                if (this.resultState) {
                    this.startMission(this.resultState.worldId, this.resultState.missionId, true);
                }
                return;
            }
            if (resultAction === 'map') {
                this.router.go('map');
            }
        };

        this.root.oninput = (event) => {
            if (event.target.id === 'answerInput') {
                this.answerValue = event.target.value;
                this.scheduleNumberAutoCheck();
            }
        };

        this.root.onkeydown = (event) => {
            if (event.target.id === 'answerInput' && event.key === 'Enter') {
                event.preventDefault();
                this.checkNumber(true);
            }
        };
    }

    mountBoardIfNeeded() {
        if (this.router.screen !== 'mission' || !this.activeRun) {
            return;
        }

        const slot = this.root.querySelector('#boardCanvasSlot');
        if (!slot) return;

        if (!this.boardCanvas) {
            this.boardCanvas = document.createElement('canvas');
            this.boardCanvas.id = 'boardCanvas';
            this.boardCanvas.className = 'board-canvas';
        }

        slot.replaceChildren(this.boardCanvas);

        if (!this.board) {
            this.board = new PolygonBoard(this.boardCanvas, {
                onChange: () => this.handleBoardChange()
            });
        } else {
            this.board.resize();
        }

        if (this.activeRun.needsBoardLoad) {
            this.board.loadTaskBoard(this.activeRun.tasks[this.activeRun.taskIndex].board);
            this.board.setHintStage(this.activeRun.hintStage);
            this.boardSummary = this.board.getPrimarySummary();
            this.activeRun.needsBoardLoad = false;
        }
    }

    refreshLiveMissionBits() {
        if (this.router.screen !== 'mission') return;
        const state = this.getState();
        const summaryBox = this.root.querySelector('[data-live-shape]');
        if (summaryBox) {
            const summary = state.boardSummary;
            summaryBox.innerHTML = summary
                ? `
                    <div class="live-metrics">
                        <div class="live-metric"><strong>Name</strong><span>${summary.analysis.primaryLabel}</span></div>
                        <div class="live-metric"><strong>Sides</strong><span>${summary.vertices}</span></div>
                        <div class="live-metric"><strong>Area</strong><span>${summary.area.toFixed(summary.area % 1 === 0 ? 0 : 1)}</span></div>
                        <div class="live-metric"><strong>Around</strong><span>${summary.perimeter.toFixed(summary.perimeter % 1 === 0 ? 0 : 1)}</span></div>
                    </div>
                `
                : '<div class="empty-note">This task starts with an empty board. Use Make Shape when you are ready.</div>';
        }
    }

    openModal(name) {
        if (name === 'settings') {
            this.showSettings = true;
        }
        if (name === 'shape-picker' && this.router.screen === 'mission') {
            this.showShapePicker = true;
        }
        this.render();
    }

    closeModal(name) {
        if (name === 'settings') this.showSettings = false;
        if (name === 'shape-picker') this.showShapePicker = false;
        this.render();
    }

    handleResetProgress() {
        if (!window.confirm('Reset your stars, badges, and saved path?')) {
            return;
        }
        this.profile = resetProfile();
        this.activeRun = null;
        this.resultState = null;
        this.showSettings = false;
        this.showShapePicker = false;
        this.feedback = { kind: '', message: '' };
        this.answerValue = '';
        this.lastWrongChoice = '';
        saveProfile(this.profile);
        this.router.go('menu');
    }

    toggleSetting(key) {
        this.profile.settings[key] = !this.profile.settings[key];
        saveProfile(this.profile);
        if (key === 'bigText') {
            document.body.classList.toggle('big-text', this.profile.settings.bigText);
        }
        if (key === 'music') {
            this.syncMusicLoop();
        }
        if (key === 'readAloud') {
            this.speak(this.getSpeakText());
        }
        this.render();
    }

    getSpeakText() {
        if (this.router.screen === 'mission' && this.activeRun) {
            const task = this.activeRun.tasks[this.activeRun.taskIndex];
            return `${this.activeRun.missionTitle}. ${task.prompt}`;
        }
        if (this.router.screen === 'map') {
            return 'This is your world map. Pick a mission to play.';
        }
        if (this.router.screen === 'results' && this.resultState) {
            return `${this.resultState.message}. You earned ${this.resultState.pointsAwarded || 0} points and ${this.resultState.stars} stars.`;
        }
        return 'Quiz it Polygon. Make shapes, fix shapes, count, and measure.';
    }

    speak(text) {
        if (!('speechSynthesis' in window)) return;
        if (!this.profile.settings.readAloud && text !== this.getSpeakText()) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.98;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
    }

    noteInteraction() {
        this.didInteract = true;
        this.ensureAudioContext();
        this.syncMusicLoop();
    }

    ensureAudioContext() {
        if (this.audioContext) {
            if (this.audioContext.state === 'suspended') {
                void this.audioContext.resume();
            }
            return this.audioContext;
        }
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) return null;
        this.audioContext = new AudioContextCtor();
        return this.audioContext;
    }

    playTone(frequency, duration, type = 'sine', gainValue = 0.018, delay = 0) {
        if (!this.profile.settings.sound) return;
        const ctx = this.ensureAudioContext();
        if (!ctx) return;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + delay + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(ctx.currentTime + delay);
        oscillator.stop(ctx.currentTime + delay + duration + 0.03);
    }

    playSuccessTone() {
        this.playTone(523.25, 0.18, 'triangle', 0.024);
        this.playTone(659.25, 0.22, 'sine', 0.018, 0.08);
    }

    playTryTone() {
        this.playTone(230, 0.22, 'sawtooth', 0.018);
        this.playTone(180, 0.26, 'triangle', 0.016, 0.08);
    }

    syncMusicLoop() {
        if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }

        const shouldPlay = this.didInteract && this.profile.settings.music && ['menu', 'map', 'results'].includes(this.router.screen);
        if (!shouldPlay) return;

        const pulse = () => {
            const ctx = this.ensureAudioContext();
            if (!ctx || !this.profile.settings.music) return;
            this.playTone(220, 0.28, 'triangle', 0.012);
            this.playTone(294, 0.16, 'sine', 0.008, 0.12);
            this.playTone(262, 0.16, 'sine', 0.008, 0.3);
        };

        pulse();
        this.musicTimer = window.setInterval(pulse, 2400);
    }

    getWorldViewModels() {
        return WORLDS.map((world, worldIndex) => {
            const worldLocked = worldIndex > this.profile.unlockedWorld;
            const regularCleared = world.missions
                .filter((mission) => !mission.boss)
                .every((mission) => getMissionRecord(this.profile, mission.id).cleared);

            const missions = world.missions.map((mission) => {
                const record = getMissionRecord(this.profile, mission.id);
                const missionLocked = worldLocked || (mission.boss && !regularCleared);
                return {
                    ...mission,
                    stars: record.stars,
                    locked: missionLocked
                };
            });

            return {
                ...world,
                locked: worldLocked,
                completedStars: missions.reduce((sum, mission) => sum + mission.stars, 0),
                totalStars: missions.length * 3,
                missions
            };
        });
    }

    findNextMission(fromWorldId = null, fromMissionId = null) {
        const worlds = this.getWorldViewModels();
        const flat = worlds.flatMap((world) => world.missions.map((mission) => ({
            worldId: world.id,
            worldTitle: world.title,
            title: mission.title,
            missionId: mission.id,
            locked: world.locked || mission.locked,
            cleared: getMissionRecord(this.profile, mission.id).cleared
        })));

        if (fromWorldId && fromMissionId) {
            const startIndex = flat.findIndex((entry) => entry.worldId === fromWorldId && entry.missionId === fromMissionId);
            for (let index = startIndex + 1; index < flat.length; index += 1) {
                if (!flat[index].locked) return flat[index];
            }
        }

        const firstUncleared = flat.find((entry) => !entry.locked && !entry.cleared);
        return firstUncleared || flat.find((entry) => !entry.locked) || null;
    }

    startNextMission() {
        const next = this.findNextMission();
        if (!next) return;
        this.startMission(next.worldId, next.missionId);
    }

    startMission(worldId, missionId, forceReplay = false) {
        const world = getWorldById(worldId);
        const mission = getMissionById(worldId, missionId);
        if (!world || !mission) return;

        const worldIndex = WORLDS.findIndex((entry) => entry.id === worldId);
        const regularCleared = world.missions
            .filter((entry) => !entry.boss)
            .every((entry) => getMissionRecord(this.profile, entry.id).cleared);
        if (worldIndex > this.profile.unlockedWorld) return;
        if (mission.boss && !regularCleared) return;

        const replay = forceReplay || getMissionRecord(this.profile, missionId).cleared;
        this.activeRun = {
            worldId,
            missionId,
            missionTitle: mission.title,
            tasks: buildMissionTasks(world, mission, replay),
            taskIndex: 0,
            hintStage: 0,
            maxHintStageUsed: 0,
            mistakes: 0,
            replay
        };
        this.resultState = null;
        this.showShapePicker = false;
        this.showSettings = false;
        this.feedback = { kind: '', message: '' };
        this.answerValue = '';
        this.lastWrongChoice = '';
        this.prepareTask();
        this.router.go('mission', { worldId, missionId });
    }

    prepareTask() {
        if (!this.activeRun) return;
        this.activeRun.hintStage = 0;
        this.answerValue = '';
        this.lastWrongChoice = '';
        this.feedback = { kind: '', message: '' };
        this.activeRun.needsBoardLoad = true;
        this.clearTimers();
        this.render();
        if (this.profile.settings.readAloud) {
            const task = this.activeRun.tasks[this.activeRun.taskIndex];
            this.speak(task.prompt);
        }
    }

    clearTimers() {
        clearTimeout(this.boardCheckTimer);
        clearTimeout(this.numberCheckTimer);
        clearTimeout(this.advanceTimer);
        this.boardCheckTimer = null;
        this.numberCheckTimer = null;
        this.advanceTimer = null;
    }

    handleBoardChange() {
        this.boardSummary = this.board?.getPrimarySummary() || null;
        this.refreshLiveMissionBits();
        if (!this.activeRun) return;
        const task = this.activeRun.tasks[this.activeRun.taskIndex];
        if (task.answerMode !== 'board') return;

        clearTimeout(this.boardCheckTimer);
        this.boardCheckTimer = window.setTimeout(() => {
            const result = this.validateBoardTask(task);
            if (result.correct) {
                this.completeTask(result.message || task.celebrationText);
            }
        }, 240);
    }

    validateBoardTask(task) {
        const summaries = this.board?.getSummaries() || [];
        const editableSummaries = summaries.filter((summary) => !summary.polygon.locked);
        if (!editableSummaries.length) {
            return { correct: false, message: 'Make or move a shape first.' };
        }

        const matched = editableSummaries.find((summary) => {
            const primary = summary.analysis.primaryLabel;
            const exactMatches = summary.analysis.exactMatches || [];
            const families = summary.analysis.familyLabels || [];

            if (task.success.rejectPrimary?.includes(primary)) return false;
            if (task.success.primary && primary !== task.success.primary) return false;
            if (task.success.exact && !(exactMatches.includes(task.success.exact) || primary === task.success.exact)) return false;
            if (task.success.family && !families.includes(task.success.family)) return false;
            return true;
        });

        if (!matched) {
            return { correct: false, message: 'That shape does not match yet.' };
        }

        return {
            correct: true,
            message: task.celebrationText || `Nice! You made ${matched.analysis.primaryLabel}.`
        };
    }

    checkBoardManual() {
        if (!this.activeRun) return;
        const task = this.activeRun.tasks[this.activeRun.taskIndex];
        const result = this.validateBoardTask(task);
        if (result.correct) {
            this.completeTask(result.message);
        } else {
            this.registerMistake(result.message);
        }
    }

    handleChoice(option) {
        if (!this.activeRun) return;
        const task = this.activeRun.tasks[this.activeRun.taskIndex];
        if (task.answerMode !== 'choice') return;

        if (option === task.success.answer) {
            this.completeTask(task.celebrationText || 'Nice pick!');
            return;
        }

        this.lastWrongChoice = option;
        this.registerMistake('Try again. Look at the clue on the board.');
    }

    scheduleNumberAutoCheck() {
        if (!this.activeRun) return;
        const task = this.activeRun.tasks[this.activeRun.taskIndex];
        if (task.answerMode !== 'number') return;

        clearTimeout(this.numberCheckTimer);
        this.numberCheckTimer = window.setTimeout(() => this.checkNumber(false), 220);
    }

    checkNumber(manual) {
        if (!this.activeRun) return;
        const task = this.activeRun.tasks[this.activeRun.taskIndex];
        if (task.answerMode !== 'number') return;
        const value = Number.parseFloat(this.answerValue);
        if (!Number.isFinite(value)) {
            if (manual) this.registerMistake('Type a number first.');
            return;
        }

        const summary = this.boardSummary || this.board?.getPrimarySummary();
        const target = summary ? summary[task.success.metric] : Number.NaN;
        const correct = Number.isFinite(target) && Math.abs(value - target) <= task.success.tolerance;

        if (correct) {
            this.completeTask(task.celebrationText || 'You measured it!');
        } else if (manual) {
            this.registerMistake(`Try again. Check the ${task.success.metric === 'area' ? 'inside space' : 'outside path'} one more time.`);
        }
    }

    useHelp() {
        if (!this.activeRun) return;
        this.activeRun.hintStage = Math.min(3, this.activeRun.hintStage + 1);
        this.activeRun.maxHintStageUsed = Math.max(this.activeRun.maxHintStageUsed, this.activeRun.hintStage);
        this.board?.setHintStage(this.activeRun.hintStage);
        const task = this.activeRun.tasks[this.activeRun.taskIndex];
        this.feedback = {
            kind: 'try',
            message: task.hintLadder[Math.max(0, this.activeRun.hintStage - 1)]
        };
        if (this.profile.settings.readAloud) {
            this.speak(this.feedback.message);
        }
        this.render();
    }

    registerMistake(message) {
        if (!this.activeRun) return;
        this.activeRun.mistakes += 1;
        this.feedback = { kind: 'try', message };
        this.playTryTone();
        this.render();
    }

    completeTask(message) {
        if (!this.activeRun) return;
        this.feedback = { kind: 'good', message };
        this.playSuccessTone();
        this.render();
        this.advanceTimer = window.setTimeout(() => {
            if (!this.activeRun) return;
            if (this.activeRun.taskIndex < this.activeRun.tasks.length - 1) {
                this.activeRun.taskIndex += 1;
                this.prepareTask();
                return;
            }
            this.finishMission();
        }, 850);
    }

    finishMission() {
        if (!this.activeRun) return;
        const { worldId, missionId, mistakes, maxHintStageUsed } = this.activeRun;
        const world = getWorldById(worldId);
        const mission = getMissionById(worldId, missionId);
        const previousRecord = getMissionRecord(this.profile, missionId);
        const stars = this.calculateStars(mistakes, maxHintStageUsed);
        const pointsAwarded = QUIZ_IT_POLYGON_POINTS_BY_STARS[stars] || QUIZ_IT_POLYGON_POINTS_BY_STARS[1];
        const firstClear = !previousRecord.cleared;

        setMissionRecord(this.profile, missionId, {
            cleared: true,
            plays: (previousRecord.plays || 0) + 1,
            stars: Math.max(previousRecord.stars || 0, stars),
            bestMistakes: previousRecord.bestMistakes === null ? mistakes : Math.min(previousRecord.bestMistakes, mistakes),
            bestHintStage: previousRecord.bestHintStage === null ? maxHintStageUsed : Math.min(previousRecord.bestHintStage, maxHintStageUsed)
        });

        if (firstClear) {
            this.profile.stats.missionsCleared += 1;
        }
        this.profile.currentStreak += 1;

        const worldIndex = WORLDS.findIndex((entry) => entry.id === worldId);
        if (mission.boss) {
            this.profile.unlockedWorld = Math.max(this.profile.unlockedWorld, Math.min(worldIndex + 1, WORLDS.length - 1));
            if (!this.profile.badges.includes(world.badge)) {
                this.profile.badges.push(world.badge);
            }
        }

        saveProfile(this.profile);
        window.LAHSPointsBridge?.awardPoints(pointsAwarded, {
            label: 'Mission Clear',
            meta: {
                worldId,
                missionId,
                stars
            }
        });
        this.resultState = {
            worldId,
            missionId,
            stars,
            pointsAwarded,
            mistakes,
            maxHintStageUsed,
            message: stars === 3
                ? `Star job! You cleared that mission with a clean run and earned ${pointsAwarded} points.`
                : stars === 2
                    ? `Nice work! You earned ${pointsAwarded} points.`
                    : `Good job! You finished the mission and earned ${pointsAwarded} points.`
        };
        this.activeRun = null;
        this.feedback = { kind: '', message: '' };
        this.answerValue = '';
        this.lastWrongChoice = '';
        this.showShapePicker = false;
        this.router.go('results', { worldId, missionId });
    }

    calculateStars(mistakes, maxHintStageUsed) {
        if (mistakes === 0 && maxHintStageUsed <= 1) return 3;
        if (mistakes <= 1) return 2;
        return 1;
    }

    handleResultNext() {
        if (!this.resultState) return;
        const next = this.findNextMission(this.resultState.worldId, this.resultState.missionId);
        if (next) {
            this.startMission(next.worldId, next.missionId);
            return;
        }
        this.router.go('map');
    }

    pickShape(shapeType) {
        this.board?.createOrReplaceShape(shapeType);
        this.showShapePicker = false;
        this.render();
    }
}

const app = new QuizItPolygonApp(document.getElementById('app'));

window.quizItPolygonApp = app;
window.render_game_to_text = () => JSON.stringify({
    screen: app.router.screen,
    world: app.activeRun?.worldId || app.resultState?.worldId || null,
    mission: app.activeRun?.missionId || app.resultState?.missionId || null,
    taskIndex: app.activeRun?.taskIndex ?? null,
    prompt: app.activeRun ? app.activeRun.tasks[app.activeRun.taskIndex].prompt : null,
    feedback: app.feedback,
    profile: {
        unlockedWorld: app.profile.unlockedWorld,
        missionsCleared: app.profile.stats.missionsCleared,
        badges: app.profile.badges
    },
    board: app.board?.getDebugState() || null
});
window.advanceTime = async (ms = 16) => new Promise((resolve) => window.setTimeout(resolve, ms));
