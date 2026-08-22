import { ANIMAL_DATABASE } from './animal-data.js';
import { AnimalChampionAudio } from './audio-system.js';
import { DIFFICULTIES, isValidDifficulty } from './difficulty.js';
import {
  buildSpeechCandidatesFromEvent,
  matchAnimalSpeech,
} from './animal-speech.js';
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
const MAX_FEEDBACK_NARRATION_MS = 18_000;
const SPEECH_RESTART_DELAY_MS = 350;
const ANIMAL_CHAMPION_SPEECH_CONTROL = 'LAHS_ANIMAL_CHAMPION_SPEECH_CONTROL';
const ANIMAL_CHAMPION_SPEECH_EVENT = 'LAHS_ANIMAL_CHAMPION_SPEECH_EVENT';
export const INPUT_MODES = Object.freeze({ VOICE: 'voice', CHOICE: 'choice' });
const DIFFICULTY_LABELS = Object.freeze({
  [DIFFICULTIES.EASY]: 'Easy',
  [DIFFICULTIES.HARD]: 'Hard',
  [DIFFICULTIES.EXPERT]: 'Expert',
});

const REQUIRED_ELEMENT_IDS = Object.freeze([
  'menuScreen',
  'menuReveal',
  'menuPanel',
  'modeChallenger',
  'modeContinuous',
  'difficultyEasy',
  'difficultyHard',
  'difficultyExpert',
  'inputVoice',
  'inputChoice',
  'startButton',
  'countdownScreen',
  'countdownValue',
  'gameScreen',
  'scoreValue',
  'streakValue',
  'questionEyebrow',
  'soundToggle',
  'newGameButton',
  'animalBackdrop',
  'animalImage',
  'timerBar',
  'timerRegion',
  'choiceGrid',
  'voiceAnswerPanel',
  'voiceTranscript',
  'micStatusText',
  'micButton',
  'useChoicesButton',
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
    this.audio = new AnimalChampionAudio({ window });
    this.selectedMode = MODES.CHALLENGER;
    this.selectedDifficulty = DIFFICULTIES.EASY;
    this.selectedInputMode = INPUT_MODES.VOICE;
    this.phase = 'menu-locked';
    this.deadline = null;
    this.countdownFrame = null;
    this.lastCountdownLabel = null;
    this.pendingTimeouts = new Set();
    this.runToken = 0;
    this.roundToken = 0;
    this.currentRound = null;
    this.listenerController = null;
    this.recognition = null;
    this.recognitionActive = false;
    this.recognitionStopIntentional = false;
    this.speechRestartTimer = null;
    this.hostSpeechAvailable = false;
    this.hostSpeechEngine = 'unsupported';
    this.hostSpeechRoundId = null;
    this.voicePreparation = null;
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
    this.elements.difficultyEasy.addEventListener(
      'click',
      () => this.selectDifficulty(DIFFICULTIES.EASY),
      listenerOptions,
    );
    this.elements.difficultyHard.addEventListener(
      'click',
      () => this.selectDifficulty(DIFFICULTIES.HARD),
      listenerOptions,
    );
    this.elements.difficultyExpert.addEventListener(
      'click',
      () => this.selectDifficulty(DIFFICULTIES.EXPERT),
      listenerOptions,
    );
    this.elements.inputVoice.addEventListener(
      'click',
      () => this.selectInputMode(INPUT_MODES.VOICE),
      listenerOptions,
    );
    this.elements.inputChoice.addEventListener(
      'click',
      () => this.selectInputMode(INPUT_MODES.CHOICE),
      listenerOptions,
    );
    this.elements.startButton.addEventListener('click', () => this.startRun(), listenerOptions);
    this.elements.soundToggle.addEventListener('click', () => this.toggleSound(), listenerOptions);
    this.elements.newGameButton.addEventListener('click', () => this.mainMenu(), listenerOptions);
    this.elements.playAgainButton.addEventListener('click', () => this.playAgain(), listenerOptions);
    this.elements.mainMenuButton.addEventListener('click', () => this.mainMenu(), listenerOptions);
    this.elements.retryButton.addEventListener('click', () => this.retry(), listenerOptions);
    this.elements.errorMenuButton.addEventListener('click', () => this.mainMenu(), listenerOptions);
    this.elements.micButton.addEventListener('click', () => this.startVoiceInput(), listenerOptions);
    this.elements.useChoicesButton.addEventListener(
      'click',
      () => this.switchToChoicesForRound(),
      listenerOptions,
    );
    this.window.addEventListener('message', (event) => this.handleSpeechMessage(event), listenerOptions);
    this.document.addEventListener('visibilitychange', () => {
      this.audio.setVisibilityHidden(this.document.hidden);
      if (this.document.hidden) {
        this.deadline?.pause();
        this.stopVoiceInput({ notifyHost: 'abort' });
      } else {
        this.deadline?.resume();
        if (this.phase === 'answering' && this.selectedInputMode === INPUT_MODES.VOICE) {
          this.startVoiceInput();
        }
      }
    }, listenerOptions);
    this.window.addEventListener('pagehide', (event) => {
      if (!event.persisted) this.teardown();
    }, listenerOptions);

    this.selectMode(this.selectedMode);
    this.selectDifficulty(this.selectedDifficulty);
    this.updateInputModeControls();
    this.createRecognition();
    this.phase = 'menu-locked';
    this.showScreen('menu');
    this.elements.menuPanel.hidden = true;
    this.elements.menuReveal.hidden = false;
    this.elements.menuReveal.setAttribute('aria-expanded', 'false');
    this.updateSoundControl();
    this.updateMicStatus('Get ready to say the animal name.');
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
    this.elements.modeChallenger.focus({ preventScroll: true });
    this.audio.playMenu();
  }

  selectMode(mode) {
    if (!Object.values(MODES).includes(mode)) throw new TypeError(`Invalid game mode: ${mode}`);
    this.selectedMode = mode;
    this.elements.modeChallenger.setAttribute('aria-pressed', String(mode === MODES.CHALLENGER));
    this.elements.modeContinuous.setAttribute('aria-pressed', String(mode === MODES.CONTINUOUS));
  }

  selectDifficulty(difficulty) {
    if (!isValidDifficulty(difficulty)) throw new TypeError(`Invalid difficulty: ${difficulty}`);
    this.selectedDifficulty = difficulty;
    this.elements.difficultyEasy.setAttribute(
      'aria-pressed',
      String(difficulty === DIFFICULTIES.EASY),
    );
    this.elements.difficultyHard.setAttribute(
      'aria-pressed',
      String(difficulty === DIFFICULTIES.HARD),
    );
    this.elements.difficultyExpert.setAttribute(
      'aria-pressed',
      String(difficulty === DIFFICULTIES.EXPERT),
    );
    this.elements.questionEyebrow.textContent = `${DIFFICULTY_LABELS[difficulty]} wildlife identification`;
  }

  selectInputMode(mode) {
    if (!Object.values(INPUT_MODES).includes(mode)) throw new TypeError(`Invalid input mode: ${mode}`);
    if (mode === this.selectedInputMode) {
      this.updateInputModeControls();
      return;
    }
    this.selectedInputMode = mode;
    this.updateInputModeControls();
    if (this.phase !== 'answering' || !this.currentRound) return;
    if (mode === INPUT_MODES.CHOICE) {
      this.switchToChoicesForRound();
      return;
    }
    this.renderAnswerControls(this.currentRound);
    this.startVoiceInput();
  }

  updateInputModeControls() {
    const voiceSelected = this.selectedInputMode === INPUT_MODES.VOICE;
    this.elements.inputVoice.setAttribute('aria-pressed', String(voiceSelected));
    this.elements.inputChoice.setAttribute('aria-pressed', String(!voiceSelected));
  }

  prepareVoicePermission() {
    if (this.selectedInputMode !== INPUT_MODES.VOICE || this.hostSpeechAvailable) {
      return null;
    }
    const SpeechRecognition = this.window.SpeechRecognition || this.window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const getUserMedia = this.window.navigator?.mediaDevices?.getUserMedia;
    if (typeof getUserMedia !== 'function') return null;

    this.updateMicStatus('Preparing microphone access...');
    return Promise.resolve(getUserMedia.call(this.window.navigator.mediaDevices, { audio: true }))
      .then((stream) => {
        stream?.getTracks?.().forEach((track) => track.stop());
        this.updateMicStatus('Microphone ready.');
        return true;
      })
      .catch((error) => {
        const denied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError';
        this.updateMicStatus(
          denied
            ? 'Microphone permission is blocked. Allow it in site settings or use Multiple Choice.'
            : 'The microphone could not start. Try again or use Multiple Choice.',
          true,
        );
        return false;
      });
  }

  createRecognition() {
    if (this.recognition) return this.recognition;
    const SpeechRecognition = this.window.SpeechRecognition || this.window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    const userAgent = `${this.window.navigator?.userAgent ?? ''}`;
    recognition.continuous = !/(?:iPhone|iPad|iPod)/i.test(userAgent);
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      this.recognitionActive = true;
      this.elements.voiceAnswerPanel.dataset.listening = 'true';
      this.updateMicStatus('Listening... say the animal name.');
    };
    recognition.onresult = (event) => {
      if (this.phase !== 'answering' || this.selectedInputMode !== INPUT_MODES.VOICE) return;
      const snapshot = buildSpeechCandidatesFromEvent(event);
      this.acceptSpeechCandidates(snapshot.candidates, snapshot.displayText);
    };
    recognition.onerror = (event) => {
      const error = event?.error ?? 'unknown';
      if (error === 'aborted' && this.recognitionStopIntentional) return;
      this.recognitionActive = false;
      this.elements.voiceAnswerPanel.dataset.listening = 'false';
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        this.recognitionStopIntentional = true;
        this.updateMicStatus('Microphone permission is blocked. Allow it or use Multiple Choice.', true);
        return;
      }
      if (error === 'audio-capture') {
        this.recognitionStopIntentional = true;
        this.updateMicStatus('No microphone was detected. Connect one or use Multiple Choice.', true);
        return;
      }
      this.updateMicStatus('I did not catch that. Keep trying.');
    };
    recognition.onend = () => {
      const intentional = this.recognitionStopIntentional;
      this.recognitionStopIntentional = false;
      this.recognitionActive = false;
      this.elements.voiceAnswerPanel.dataset.listening = 'false';
      if (
        !intentional
        && this.phase === 'answering'
        && this.selectedInputMode === INPUT_MODES.VOICE
        && !this.document.hidden
      ) {
        this.speechRestartTimer = this.window.setTimeout(() => {
          this.speechRestartTimer = null;
          this.startVoiceInput();
        }, SPEECH_RESTART_DELAY_MS);
      }
    };
    this.recognition = recognition;
    return recognition;
  }

  startVoiceInput() {
    if (
      this.phase !== 'answering'
      || this.selectedInputMode !== INPUT_MODES.VOICE
      || !this.currentRound
      || this.document.hidden
    ) return false;

    if (this.voicePreparation) {
      const preparation = this.voicePreparation;
      this.voicePreparation = null;
      Promise.resolve(preparation).then(() => {
        if (this.phase === 'answering' && this.selectedInputMode === INPUT_MODES.VOICE) {
          this.startVoiceInput();
        }
      });
      return true;
    }

    if (this.hostSpeechAvailable && this.window.parent && this.window.parent !== this.window) {
      if (this.hostSpeechRoundId === this.currentRound.roundId) return true;
      const animal = this.animalById.get(this.currentRound.correctAnimalId);
      this.window.parent.postMessage({
        type: ANIMAL_CHAMPION_SPEECH_CONTROL,
        gameId: 'animal-champion',
        command: 'start',
        options: {
          roundId: this.currentRound.roundId,
          language: 'en-US',
          partialResults: true,
          silenceMs: 1_800,
          continuousHotMic: this.hostSpeechEngine === 'native',
          contextualPhrases: [animal?.name, ...(animal?.speechAliases ?? [])].filter(Boolean),
        },
      }, this.window.location?.origin && this.window.location.origin !== 'null' ? this.window.location.origin : '*');
      this.hostSpeechRoundId = this.currentRound.roundId;
      this.elements.voiceAnswerPanel.dataset.listening = 'true';
      this.updateMicStatus('Listening... say the animal name.');
      return true;
    }

    const recognition = this.createRecognition();
    if (!recognition) {
      this.updateMicStatus('Voice answers are unavailable on this device. Use Multiple Choice below.', true);
      return false;
    }
    if (this.recognitionActive) return true;
    if (this.speechRestartTimer !== null) {
      this.window.clearTimeout(this.speechRestartTimer);
      this.speechRestartTimer = null;
    }
    this.recognitionStopIntentional = false;
    try {
      this.updateMicStatus('Starting microphone...');
      recognition.start();
      return true;
    } catch (error) {
      if (error?.name === 'InvalidStateError') return true;
      this.updateMicStatus('The microphone could not start. Tap Listen Again or use Multiple Choice.', true);
      return false;
    }
  }

  stopVoiceInput({ notifyHost = 'stop' } = {}) {
    if (this.speechRestartTimer !== null) {
      this.window.clearTimeout(this.speechRestartTimer);
      this.speechRestartTimer = null;
    }
    this.elements.voiceAnswerPanel.dataset.listening = 'false';
    if (this.hostSpeechAvailable && this.window.parent && this.window.parent !== this.window && this.currentRound) {
      this.window.parent.postMessage({
        type: ANIMAL_CHAMPION_SPEECH_CONTROL,
        gameId: 'animal-champion',
        command: notifyHost,
        options: { roundId: this.currentRound.roundId },
      }, this.window.location?.origin && this.window.location.origin !== 'null' ? this.window.location.origin : '*');
    }
    this.hostSpeechRoundId = null;
    if (this.recognition && (this.recognitionActive || this.phase === 'answering')) {
      this.recognitionStopIntentional = true;
      try {
        this.recognition.abort();
      } catch {
        this.recognitionStopIntentional = false;
      }
    }
    this.recognitionActive = false;
  }

  updateMicStatus(message, isError = false) {
    this.elements.micStatusText.textContent = message;
    this.elements.micStatusText.dataset.error = String(Boolean(isError));
  }

  handleSpeechMessage(event) {
    const message = event?.data;
    if (
      !message
      || message.type !== ANIMAL_CHAMPION_SPEECH_EVENT
      || message.gameId !== 'animal-champion'
      || event.source !== this.window.parent
    ) return;
    const expectedOrigin = this.window.location?.origin;
    if (expectedOrigin && expectedOrigin !== 'null' && event.origin !== expectedOrigin) return;

    if (message.event === 'availability') {
      this.hostSpeechAvailable = Boolean(message.available);
      this.hostSpeechEngine = typeof message.engine === 'string' ? message.engine : 'unsupported';
      if (
        this.hostSpeechAvailable
        && this.phase === 'answering'
        && this.selectedInputMode === INPUT_MODES.VOICE
      ) {
        if (this.recognitionActive && this.recognition) {
          this.recognitionStopIntentional = true;
          try {
            this.recognition.abort();
          } catch {
            this.recognitionStopIntentional = false;
          }
          this.recognitionActive = false;
        }
        this.startVoiceInput();
      }
      return;
    }
    if (message.roundId && message.roundId !== this.currentRound?.roundId) return;
    if (message.event === 'state' && message.message) {
      if (message.state === 'error') this.hostSpeechRoundId = null;
      this.updateMicStatus(message.message, message.state === 'error');
      return;
    }
    if (message.event === 'partial' || message.event === 'final') {
      this.acceptSpeechCandidates(message.matches ?? [message.text].filter(Boolean), message.text);
      return;
    }
    if (message.event === 'error') {
      this.hostSpeechRoundId = null;
      this.elements.voiceAnswerPanel.dataset.listening = 'false';
      this.updateMicStatus(message.message || 'The microphone needs attention. Try again or use Multiple Choice.', true);
    }
  }

  acceptSpeechCandidates(candidates, displayText = '') {
    if (this.phase !== 'answering' || this.selectedInputMode !== INPUT_MODES.VOICE || !this.currentRound) {
      return false;
    }
    const animal = this.animalById.get(this.currentRound.correctAnimalId);
    const heard = `${displayText || candidates?.[0] || ''}`.trim();
    if (heard) this.elements.voiceTranscript.textContent = `I heard “${heard}”.`;
    const match = matchAnimalSpeech(candidates, animal);
    if (!match.matched) {
      this.updateMicStatus('Not that animal yet — keep trying.');
      return false;
    }
    this.elements.voiceTranscript.textContent = `I heard “${animal.name}”.`;
    this.updateMicStatus('Animal identified!');
    this.acceptChoice(this.currentRound.roundId, this.currentRound.correctAnimalId);
    return true;
  }

  startRun() {
    this.invalidateRun();
    this.voicePreparation = this.prepareVoicePermission();
    this.beginFreshRun();
  }

  beginFreshRun() {
    this.engine.startRun(this.selectedMode, this.selectedDifficulty);
    this.phase = 'countdown';
    this.updateHud();
    this.resetRoundView();
    this.showScreen('countdown');
    this.elements.countdownScreen.focus({ preventScroll: true });
    this.audio.playStart();
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
    this.renderAnswerControls(round);
    this.updateHud();
    const promptPlayback = Promise.resolve(this.audio.playPrompt()).catch(() => false);
    if (this.selectedInputMode === INPUT_MODES.CHOICE) {
      this.startAnswerDeadline(runToken, roundToken);
      this.elements.choiceGrid.querySelectorAll('button')[0]?.focus({ preventScroll: true });
      return;
    }
    const permissionPreparation = this.voicePreparation
      ? Promise.resolve(this.voicePreparation).catch(() => false)
      : Promise.resolve(true);
    this.updateMicStatus(
      this.voicePreparation
        ? 'Listen to the prompt and finish microphone permission setup.'
        : 'Listen to the prompt, then say the animal name.',
    );
    Promise.all([promptPlayback, permissionPreparation]).then(() => {
      this.voicePreparation = null;
      if (!this.isCurrent(runToken, roundToken) || this.phase !== 'answering') return;
      if (this.selectedInputMode !== INPUT_MODES.VOICE) return;
      this.startVoiceInput();
      this.startAnswerDeadline(runToken, roundToken);
      this.elements.micButton.focus({ preventScroll: true });
    });
  }

  startAnswerDeadline(runToken = this.runToken, roundToken = this.roundToken) {
    if (!this.isCurrent(runToken, roundToken) || this.phase !== 'answering' || this.deadline) return;
    const roundId = this.currentRound?.roundId;
    if (!roundId) return;
    this.deadline = createPausableDeadline({
      durationMs: ANSWER_WINDOW_MS,
      now: () => this.window.performance.now(),
      requestFrame: (callback) => this.window.requestAnimationFrame(callback),
      cancelFrame: (frameId) => this.window.cancelAnimationFrame(frameId),
      onTick: (remainingMs, fraction) => {
        if (this.isCurrent(runToken, roundToken)) this.updateTimer(remainingMs, fraction);
      },
      onExpire: () => {
        if (this.isCurrent(runToken, roundToken)) this.handleTimeout(roundId);
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

  renderAnswerControls(round) {
    const useVoice = this.selectedInputMode === INPUT_MODES.VOICE;
    this.elements.choiceGrid.hidden = useVoice;
    this.elements.voiceAnswerPanel.hidden = !useVoice;
    if (useVoice) {
      this.elements.choiceGrid.replaceChildren();
      this.elements.voiceTranscript.textContent = 'Your answer will appear here.';
      this.updateMicStatus('Get ready to say the animal name.');
      return;
    }
    this.stopVoiceInput();
    this.renderChoices(round);
  }

  switchToChoicesForRound() {
    this.selectedInputMode = INPUT_MODES.CHOICE;
    this.updateInputModeControls();
    this.audio.cancel();
    this.stopVoiceInput();
    if (this.phase !== 'answering' || !this.currentRound) return;
    this.renderAnswerControls(this.currentRound);
    this.startAnswerDeadline();
    this.elements.choiceGrid.querySelectorAll('button')[0]?.focus({ preventScroll: true });
  }

  acceptChoice(roundId, choiceId) {
    const remainingMs = this.deadline?.getRemainingMs?.() ?? 0;
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
          meta: {
            animalName: correctAnimal.name,
            gameMode: this.engine.getState().mode,
            gameDifficulty: this.engine.getState().difficulty,
          },
        });
        platformAward?.catch?.(() => {});
      } catch {
        // Local play and progression never depend on the optional host bridge.
      }
    }

    this.scheduleFeedbackCompletion(result, remainingMs);
  }

  handleTimeout(roundId) {
    const result = this.engine.timeout(roundId);
    if (!result.accepted) return;
    this.phase = 'feedback';
    this.lockChoices();
    this.renderFeedback(result);
    this.scheduleFeedbackCompletion(result, 0);
  }

  scheduleFeedbackCompletion(result, remainingMs) {
    let minimumElapsed = false;
    let narrationSettled = false;
    let completed = false;
    const finishWhenReady = () => {
      if (completed || !minimumElapsed || !narrationSettled) return;
      completed = true;
      this.finishFeedback();
    };

    Promise.resolve(this.audio.playFeedback({
      outcome: result.outcome,
      animalId: result.correctAnimalId,
      streak: this.engine.getState().streak,
      remainingMs,
    })).catch(() => false).then(() => {
      narrationSettled = true;
      finishWhenReady();
    });
    this.delay(() => {
      minimumElapsed = true;
      finishWhenReady();
    }, FEEDBACK_DELAY_MS);
    this.delay(() => {
      narrationSettled = true;
      finishWhenReady();
    }, MAX_FEEDBACK_NARRATION_MS);
  }

  lockChoices() {
    this.deadline?.stop();
    this.deadline = null;
    this.stopVoiceInput();
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
    this.audio.playGameOver(state.score);
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
    this.elements.modeChallenger.focus({ preventScroll: true });
    this.audio.playMenu();
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
    this.stopVoiceInput({ notifyHost: 'stop' });
    this.audio.cancel();
    this.voicePreparation = null;
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
    this.elements.choiceGrid.hidden = true;
    this.elements.voiceAnswerPanel.hidden = true;
    this.elements.voiceAnswerPanel.dataset.listening = 'false';
    this.elements.voiceTranscript.textContent = 'Your answer will appear here.';
    this.updateMicStatus('Get ready to say the animal name.');
    this.elements.feedback.textContent = '';
    delete this.elements.feedback.dataset.result;
    this.elements.animalBackdrop.removeAttribute('src');
    this.elements.animalImage.removeAttribute('src');
    this.elements.animalImage.alt = '';
    this.updateTimer(ANSWER_WINDOW_MS, 1);
  }

  toggleSound() {
    this.audio.toggle();
    this.updateSoundControl();
  }

  updateSoundControl() {
    const enabled = this.audio.enabled;
    this.elements.soundToggle.setAttribute('aria-pressed', String(enabled));
    this.elements.soundToggle.setAttribute(
      'aria-label',
      enabled ? 'Mute Animal Champion voice' : 'Turn on Animal Champion voice',
    );
    const icon = this.document.getElementById('soundToggleIcon');
    const label = this.document.getElementById('soundToggleLabel');
    if (icon) icon.textContent = enabled ? '🔊' : '🔇';
    if (label) label.textContent = enabled ? 'Voice on' : 'Voice off';
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
