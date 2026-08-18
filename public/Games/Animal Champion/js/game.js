import { ANIMAL_DATABASE } from './animal-data.js';
import {
  ANSWER_WINDOW_MS,
  FEEDBACK_DELAY_MS,
  MODES,
  OUTCOMES,
  POINTS_PER_CORRECT,
  AnimalChampionEngine,
  createPausableDeadline,
  normalizeLeaderboard,
  recordLeaderboardScore,
} from './game-engine.js';

const LEADERBOARD_STORAGE_KEY = 'animalChampionLeaderboard';

const REQUIRED_ELEMENT_IDS = Object.freeze([
  'menuScreen',
  'menuReveal',
  'menuPanel',
  'modeChallenger',
  'modeContinuous',
  'startButton',
  'countdownScreen',
  'countdownValue',
  'gameScreen',
  'scoreValue',
  'streakValue',
  'newGameButton',
  'animalBackdrop',
  'animalImage',
  'timerBar',
  'timerRegion',
  'choiceGrid',
  'feedback',
  'gameOverScreen',
  'finalScore',
  'leaderboard',
  'playAgainButton',
  'mainMenuButton',
  'errorScreen',
  'errorMessage',
  'retryButton',
  'errorMenuButton',
]);

const requireElement = (documentRef, id) => {
  const element = documentRef.getElementById(id);
  if (!element) throw new Error(`Animal Champion could not start: missing #${id}.`);
  return element;
};

export const initializePointsBridge = (windowRef) => {
  try {
    const initialization = windowRef.LAHSPointsBridge?.init({ gameId: 'animal-champion' });
    if (initialization && typeof initialization.then === 'function') {
      Promise.resolve(initialization).catch(() => {});
    }
  } catch {
    // The optional host integration cannot prevent standalone play.
  }
};

export const showStartupFailure = (documentRef, error) => {
  const message = error instanceof Error ? error.message : 'Animal Champion could not start.';
  const errorScreen = documentRef.getElementById('errorScreen');
  const errorMessage = documentRef.getElementById('errorMessage');
  if (errorScreen && errorMessage) {
    errorMessage.textContent = message;
    documentRef.querySelectorAll('.screen').forEach((screen) => {
      screen.hidden = screen !== errorScreen;
    });
    errorScreen.hidden = false;
    return;
  }
  documentRef.body.textContent = message;
};

export class AnimalChampionController {
  constructor({ document, window }) {
    if (!document || !window) throw new TypeError('Animal Champion requires document and window.');
    this.document = document;
    this.window = window;
    this.elements = Object.fromEntries(
      REQUIRED_ELEMENT_IDS.map((id) => [id, requireElement(document, id)]),
    );
    this.animalById = new Map(ANIMAL_DATABASE.map((animal) => [animal.id, animal]));
    this.engine = new AnimalChampionEngine({ animals: ANIMAL_DATABASE });
    this.selectedMode = MODES.CHALLENGER;
    this.phase = 'menu-locked';
    this.deadline = null;
    this.countdownFrame = null;
    this.lastCountdownLabel = null;
    this.pendingTimeouts = new Set();
    this.runToken = 0;
    this.roundToken = 0;
    this.currentRound = null;
    this.listenerController = null;
    this.started = false;
  }

  start() {
    if (this.started) return this;
    this.started = true;
    this.listenerController = new this.window.AbortController();
    const listenerOptions = { signal: this.listenerController.signal };

    this.elements.menuReveal.addEventListener('click', () => this.revealMenu(), listenerOptions);
    this.elements.modeChallenger.addEventListener(
      'click',
      () => this.selectMode(MODES.CHALLENGER),
      listenerOptions,
    );
    this.elements.modeContinuous.addEventListener(
      'click',
      () => this.selectMode(MODES.CONTINUOUS),
      listenerOptions,
    );
    this.elements.startButton.addEventListener('click', () => this.startRun(), listenerOptions);
    this.elements.newGameButton.addEventListener('click', () => this.mainMenu(), listenerOptions);
    this.elements.playAgainButton.addEventListener('click', () => this.playAgain(), listenerOptions);
    this.elements.mainMenuButton.addEventListener('click', () => this.mainMenu(), listenerOptions);
    this.elements.retryButton.addEventListener('click', () => this.retry(), listenerOptions);
    this.elements.errorMenuButton.addEventListener('click', () => this.mainMenu(), listenerOptions);
    this.document.addEventListener('visibilitychange', () => {
      if (this.document.hidden) this.deadline?.pause();
      else this.deadline?.resume();
    }, listenerOptions);
    this.window.addEventListener('pagehide', (event) => {
      if (!event.persisted) this.teardown();
    }, listenerOptions);

    this.selectMode(this.selectedMode);
    this.phase = 'menu-locked';
    this.showScreen('menu');
    this.elements.menuPanel.hidden = true;
    this.elements.menuReveal.hidden = false;
    this.elements.menuReveal.setAttribute('aria-expanded', 'false');
    this.updateHud();
    return this;
  }

  showScreen(screenName) {
    const screens = {
      menu: this.elements.menuScreen,
      countdown: this.elements.countdownScreen,
      game: this.elements.gameScreen,
      gameOver: this.elements.gameOverScreen,
      error: this.elements.errorScreen,
    };
    if (!screens[screenName]) throw new Error(`Unknown Animal Champion screen: ${screenName}`);
    Object.values(screens).forEach((screen) => {
      screen.hidden = screen !== screens[screenName];
    });
  }

  revealMenu() {
    this.phase = 'menu-ready';
    this.elements.menuReveal.setAttribute('aria-expanded', 'true');
    this.elements.menuReveal.hidden = true;
    this.elements.menuPanel.hidden = false;
    this.elements.modeChallenger.focus();
  }

  selectMode(mode) {
    if (!Object.values(MODES).includes(mode)) throw new TypeError(`Invalid game mode: ${mode}`);
    this.selectedMode = mode;
    this.elements.modeChallenger.setAttribute('aria-pressed', String(mode === MODES.CHALLENGER));
    this.elements.modeContinuous.setAttribute('aria-pressed', String(mode === MODES.CONTINUOUS));
  }

  startRun() {
    this.invalidateRun();
    this.beginFreshRun();
  }

  beginFreshRun() {
    this.engine.startRun(this.selectedMode);
    this.phase = 'countdown';
    this.updateHud();
    this.resetRoundView();
    this.showScreen('countdown');
    this.elements.countdownScreen.focus({ preventScroll: true });
    this.startCountdown();
  }

  startCountdown() {
    const runToken = this.runToken;
    const roundToken = this.roundToken;
    const startedAt = this.window.performance.now();
    this.lastCountdownLabel = null;
    const announce = (label) => {
      if (label === this.lastCountdownLabel) return;
      this.lastCountdownLabel = label;
      this.elements.countdownValue.textContent = label;
    };
    announce('3');

    const drawCountdown = () => {
      if (!this.isCurrent(runToken, roundToken)) return;
      const elapsedMs = Math.max(0, this.window.performance.now() - startedAt);
      if (elapsedMs < 1_000) announce('3');
      else if (elapsedMs < 2_000) announce('2');
      else if (elapsedMs < 3_000) announce('1');
      else announce('GO');

      if (elapsedMs >= 4_500) {
        this.countdownFrame = null;
        this.beginRound(runToken).catch((error) => this.showFatalError(error));
        return;
      }
      this.countdownFrame = this.window.requestAnimationFrame(drawCountdown);
    };

    this.countdownFrame = this.window.requestAnimationFrame(drawCountdown);
  }

  async beginRound(runToken = this.runToken) {
    if (runToken !== this.runToken) return;
    this.phase = 'loading-round';
    const roundToken = ++this.roundToken;
    this.deadline?.stop();
    this.deadline = null;
    this.resetRoundView();
    this.showScreen('game');

    const round = this.engine.beginRound();
    if (!round) {
      this.showFatalError('No playable animal images remain. Try the expedition again.');
      return;
    }
    this.currentRound = round;

    let activeImagePath = null;
    for (const imagePath of round.imageOrder.slice(0, 2)) {
      activeImagePath = await this.loadImageCandidate(imagePath, runToken, roundToken);
      if (!this.isCurrent(runToken, roundToken)) return;
      if (activeImagePath) break;
    }

    if (!activeImagePath) {
      const discarded = this.engine.discardBrokenRound(round.roundId);
      if (!discarded.accepted || discarded.exhausted) {
        this.showFatalError('The animal images could not be loaded. Try again or return to the menu.');
        return;
      }
      this.beginRound(runToken).catch((error) => {
        if (runToken === this.runToken) this.showFatalError(error);
      });
      return;
    }

    const correctAnimal = this.animalById.get(round.correctAnimalId);
    if (!correctAnimal || !this.engine.activateRound(round.roundId, activeImagePath)) {
      this.showFatalError('The next animal round could not be prepared.');
      return;
    }

    this.elements.animalBackdrop.src = activeImagePath;
    this.elements.animalImage.src = activeImagePath;
    this.elements.animalImage.alt = correctAnimal.alt;
    this.phase = 'answering';
    this.renderChoices(round);
    this.elements.choiceGrid.querySelectorAll('button')[0]?.focus({ preventScroll: true });
    this.updateHud();
    this.deadline = createPausableDeadline({
      durationMs: ANSWER_WINDOW_MS,
      now: () => this.window.performance.now(),
      requestFrame: (callback) => this.window.requestAnimationFrame(callback),
      cancelFrame: (frameId) => this.window.cancelAnimationFrame(frameId),
      onTick: (remainingMs, fraction) => {
        if (this.isCurrent(runToken, roundToken)) this.updateTimer(remainingMs, fraction);
      },
      onExpire: () => {
        if (this.isCurrent(runToken, roundToken)) this.handleTimeout(round.roundId);
      },
    });
    this.deadline.start();
    if (this.document.hidden) this.deadline.pause();
  }

  async loadImageCandidate(imagePath, runToken, roundToken) {
    const image = new this.window.Image();
    try {
      if (typeof image.decode === 'function') {
        image.src = imagePath;
        await image.decode();
        if (!this.isCurrent(runToken, roundToken)) return null;
      } else {
        const loaded = new Promise((resolve, reject) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', reject, { once: true });
          image.src = imagePath;
        });
        await loaded;
        if (!this.isCurrent(runToken, roundToken)) return null;
      }
      return imagePath;
    } catch {
      if (!this.isCurrent(runToken, roundToken)) return null;
      return null;
    }
  }

  renderChoices(round) {
    this.elements.choiceGrid.replaceChildren();
    for (const animalId of round.choiceIds) {
      const animal = this.animalById.get(animalId);
      if (!animal) throw new Error(`Unknown animal choice: ${animalId}`);
      const button = this.document.createElement('button');
      button.type = 'button';
      button.dataset.animalId = animal.id;
      button.textContent = animal.name;
      button.setAttribute('aria-label', animal.name);
      button.addEventListener('click', () => this.acceptChoice(round.roundId, animal.id));
      this.elements.choiceGrid.append(button);
    }
  }

  acceptChoice(roundId, choiceId) {
    const result = this.engine.submitChoice(roundId, choiceId);
    if (!result.accepted) return;
    this.phase = 'feedback';
    this.lockChoices();
    this.renderFeedback(result);

    if (result.outcome === OUTCOMES.CORRECT) {
      const correctAnimal = this.animalById.get(result.correctAnimalId);
      try {
        const platformAward = this.window.LAHSPointsBridge?.awardPoints(POINTS_PER_CORRECT, {
          eventId: result.eventId,
          label: 'Correct animal identification',
          meta: { animalName: correctAnimal.name, gameMode: this.engine.getState().mode },
        });
        platformAward?.catch?.(() => {});
      } catch {
        // Local play and progression never depend on the optional host bridge.
      }
    }

    this.delay(() => this.finishFeedback(), FEEDBACK_DELAY_MS);
  }

  handleTimeout(roundId) {
    const result = this.engine.timeout(roundId);
    if (!result.accepted) return;
    this.phase = 'feedback';
    this.lockChoices();
    this.renderFeedback(result);
    this.delay(() => this.finishFeedback(), FEEDBACK_DELAY_MS);
  }

  lockChoices() {
    this.deadline?.stop();
    this.deadline = null;
    this.elements.choiceGrid.querySelectorAll('button').forEach((button) => {
      button.disabled = true;
    });
  }

  renderFeedback(result) {
    const correctAnimal = this.animalById.get(result.correctAnimalId);
    const buttons = this.elements.choiceGrid.querySelectorAll('button');
    buttons.forEach((button) => {
      if (button.dataset.animalId === result.correctAnimalId) button.dataset.result = 'correct';
      else if (button.dataset.animalId === result.selectedAnimalId) button.dataset.result = 'wrong';
    });

    if (result.outcome === OUTCOMES.CORRECT) {
      this.elements.feedback.dataset.result = 'correct';
      this.elements.feedback.textContent = `✓ Correct! That's a ${correctAnimal.name}.`;
    } else if (result.outcome === OUTCOMES.TIMEOUT) {
      this.elements.feedback.dataset.result = 'wrong';
      this.elements.feedback.textContent = `⌛ Time's up. The correct answer is ${correctAnimal.name}.`;
    } else {
      this.elements.feedback.dataset.result = 'wrong';
      this.elements.feedback.textContent = `✕ Not quite. The correct answer is ${correctAnimal.name}.`;
    }
    this.updateHud();
  }

  finishFeedback() {
    const runToken = this.runToken;
    const state = this.engine.finishFeedback();
    if (!state || runToken !== this.runToken) return;
    if (state.phase === 'game-over') {
      this.showGameOver();
      return;
    }
    this.beginRound(runToken).catch((error) => this.showFatalError(error));
  }

  updateHud() {
    const state = this.engine.getState();
    this.elements.scoreValue.textContent = String(state.score);
    this.elements.streakValue.textContent = String(state.streak);
  }

  updateTimer(remainingMs, fraction) {
    const safeFraction = Math.max(0, Math.min(1, fraction));
    const seconds = Math.max(0, Math.ceil(remainingMs / 1_000));
    this.elements.timerBar.style.transform = `scaleX(${safeFraction})`;
    this.elements.timerRegion.setAttribute('aria-valuenow', String(seconds));
    this.elements.timerRegion.setAttribute('aria-valuetext', `${seconds} seconds remaining`);
    this.elements.timerRegion.dataset.urgency = remainingMs <= 5_000 ? 'high' : 'normal';
  }

  readLeaderboard() {
    try {
      const raw = this.window.localStorage.getItem(LEADERBOARD_STORAGE_KEY);
      return normalizeLeaderboard(raw === null ? [] : JSON.parse(raw));
    } catch {
      return [];
    }
  }

  saveLeaderboard(score) {
    const entries = recordLeaderboardScore(this.readLeaderboard(), score, new Date().toISOString());
    try {
      this.window.localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Private mode and denied storage must not block the result screen.
    }
    return entries;
  }

  renderLeaderboard(entries) {
    this.elements.leaderboard.replaceChildren();
    const scores = normalizeLeaderboard(entries);
    if (scores.length === 0) {
      const empty = this.document.createElement('li');
      empty.textContent = 'No scores yet — set the first!';
      this.elements.leaderboard.append(empty);
      return;
    }
    scores.forEach((entry) => {
      const item = this.document.createElement('li');
      item.textContent = `${entry.score} points`;
      this.elements.leaderboard.append(item);
    });
  }

  showGameOver() {
    const state = this.engine.getState();
    this.phase = 'game-over';
    this.deadline?.stop();
    this.deadline = null;
    this.elements.finalScore.textContent = String(state.score);
    this.renderLeaderboard(this.saveLeaderboard(state.score));
    this.showScreen('gameOver');
    this.elements.playAgainButton.focus();
  }

  mainMenu() {
    this.invalidateRun();
    this.engine.reset();
    this.phase = 'menu-ready';
    this.updateHud();
    this.showScreen('menu');
    this.elements.menuReveal.hidden = true;
    this.elements.menuReveal.setAttribute('aria-expanded', 'true');
    this.elements.menuPanel.hidden = false;
    this.elements.modeChallenger.focus();
  }

  playAgain() {
    this.invalidateRun();
    this.beginFreshRun();
  }

  retry() {
    this.invalidateRun();
    this.beginFreshRun();
  }

  showFatalError(error) {
    this.invalidateRun();
    this.phase = 'error';
    const message = error instanceof Error
      ? 'The expedition hit an unexpected problem. Try again or return to the menu.'
      : String(error);
    this.elements.errorMessage.textContent = message;
    this.showScreen('error');
    this.elements.retryButton.focus();
  }

  invalidateRun() {
    this.runToken += 1;
    this.roundToken += 1;
    this.deadline?.stop();
    this.deadline = null;
    this.window.cancelAnimationFrame(this.countdownFrame);
    this.countdownFrame = null;
    this.pendingTimeouts.forEach((id) => this.window.clearTimeout(id));
    this.pendingTimeouts.clear();
    this.currentRound = null;
    this.resetRoundView();
  }

  delay(callback, delayMs, runToken = this.runToken, roundToken = this.roundToken) {
    const id = this.window.setTimeout(() => {
      this.pendingTimeouts.delete(id);
      if (runToken === this.runToken && roundToken === this.roundToken) callback();
    }, delayMs);
    this.pendingTimeouts.add(id);
  }

  isCurrent(runToken, roundToken) {
    return runToken === this.runToken && roundToken === this.roundToken;
  }

  resetRoundView() {
    this.elements.choiceGrid.replaceChildren();
    this.elements.feedback.textContent = '';
    delete this.elements.feedback.dataset.result;
    this.elements.animalBackdrop.removeAttribute('src');
    this.elements.animalImage.removeAttribute('src');
    this.elements.animalImage.alt = '';
    this.updateTimer(ANSWER_WINDOW_MS, 1);
  }

  teardown() {
    this.invalidateRun();
    this.listenerController?.abort();
    this.listenerController = null;
    this.started = false;
  }
}

export const bootAnimalChampion = ({ document, window }) => {
  initializePointsBridge(window);
  try {
    return new AnimalChampionController({ document, window }).start();
  } catch (error) {
    showStartupFailure(document, error);
    return null;
  }
};

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  bootAnimalChampion({ document, window });
}
