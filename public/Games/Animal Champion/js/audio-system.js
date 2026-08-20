import { VOICE_LIBRARY } from './voice-manifest.js';

const SOUND_STORAGE_KEY = 'animalChampionSoundEnabled';
const CLIP_WATCHDOG_MS = 12_000;
const QUICK_ANSWER_REMAINING_MS = 10_000;

const readSoundPreference = (storage) => {
  try {
    return storage?.getItem(SOUND_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
};

const writeSoundPreference = (storage, enabled) => {
  try {
    storage?.setItem(SOUND_STORAGE_KEY, String(enabled));
  } catch {
    // Denied or unavailable storage must never affect gameplay.
  }
};

export class RecentClipSelector {
  constructor({ random = Math.random, historySize = 8 } = {}) {
    if (typeof random !== 'function') throw new TypeError('random must be a function');
    if (!Number.isInteger(historySize) || historySize < 1) {
      throw new TypeError('historySize must be a positive integer');
    }
    this.random = random;
    this.historySize = historySize;
    this.historyByPool = new Map();
  }

  pick(poolName, clips) {
    if (!Array.isArray(clips) || clips.length === 0) return null;
    const history = this.historyByPool.get(poolName) ?? [];
    let available = clips.filter(({ id }) => !history.includes(id));
    if (available.length === 0) {
      history.length = 0;
      available = clips;
    }
    const rawIndex = Math.floor(this.random() * available.length);
    const index = Number.isFinite(rawIndex) ? Math.max(0, Math.min(available.length - 1, rawIndex)) : 0;
    const selected = available[index];
    history.push(selected.id);
    const maximumHistory = Math.min(this.historySize, Math.max(1, clips.length - 1));
    while (history.length > maximumHistory) history.shift();
    this.historyByPool.set(poolName, history);
    return selected;
  }

  clear() {
    this.historyByPool.clear();
  }
}

export const selectCorrectPool = ({ streak = 0, remainingMs = 0 } = {}) => {
  if (streak === 10) return VOICE_LIBRARY.correct.streak10;
  if (streak === 5) return VOICE_LIBRARY.correct.streak5;
  if (streak === 3) return VOICE_LIBRARY.correct.streak3;
  if (remainingMs >= QUICK_ANSWER_REMAINING_MS) return VOICE_LIBRARY.correct.quick;
  return VOICE_LIBRARY.correct.normal;
};

export const selectGameOverPool = (score) => {
  if (score >= 100) return VOICE_LIBRARY.gameOver.high;
  if (score >= 40) return VOICE_LIBRARY.gameOver.mid;
  return VOICE_LIBRARY.gameOver.low;
};

export class AnimalChampionAudio {
  constructor({ window, random = Math.random } = {}) {
    if (!window) throw new TypeError('Animal Champion audio requires window.');
    this.window = window;
    this.storage = window.localStorage;
    this.enabled = readSoundPreference(this.storage);
    this.selector = new RecentClipSelector({ random, historySize: 10 });
    this.currentAudio = null;
    this.currentFinish = null;
    this.currentSuspendWatchdog = null;
    this.currentResumeWatchdog = null;
    this.playbackToken = 0;
    this.pausedForVisibility = false;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    writeSoundPreference(this.storage, this.enabled);
    if (!this.enabled) this.cancel();
    return this.enabled;
  }

  toggle() {
    return this.setEnabled(!this.enabled);
  }

  cancel() {
    this.playbackToken += 1;
    const audio = this.currentAudio;
    const finish = this.currentFinish;
    const suspendWatchdog = this.currentSuspendWatchdog;
    this.currentAudio = null;
    this.currentFinish = null;
    this.currentSuspendWatchdog = null;
    this.currentResumeWatchdog = null;
    this.pausedForVisibility = false;
    suspendWatchdog?.();
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // A partially initialized media element is safe to abandon.
      }
    }
    finish?.(false);
  }

  setVisibilityHidden(hidden) {
    if (!this.currentAudio) return;
    if (hidden && !this.currentAudio.paused) {
      this.pausedForVisibility = true;
      try {
        this.currentAudio.pause();
        this.currentSuspendWatchdog?.();
      } catch {
        this.pausedForVisibility = false;
      }
      return;
    }
    if (!hidden && this.pausedForVisibility && this.enabled) {
      this.pausedForVisibility = false;
      this.currentResumeWatchdog?.();
      Promise.resolve(this.currentAudio.play?.()).catch(() => this.cancel());
    }
  }

  async playPool(poolName, clips) {
    const selected = this.selector.pick(poolName, clips);
    return this.playSequence(selected ? [selected] : []);
  }

  async playMenu() {
    return this.playPool('menu', VOICE_LIBRARY.menu);
  }

  async playStart() {
    return this.playPool('start', VOICE_LIBRARY.start);
  }

  async playPrompt() {
    return this.playPool('prompt', VOICE_LIBRARY.prompt);
  }

  async playFeedback({ outcome, animalId, streak = 0, remainingMs = 0 }) {
    const animal = VOICE_LIBRARY.animals[animalId];
    let pool = VOICE_LIBRARY.wrong;
    let poolName = 'wrong';
    if (outcome === 'correct') {
      pool = selectCorrectPool({ streak, remainingMs });
      poolName = pool[0]?.id.replace(/-\d+$/, '') ?? 'correct';
    } else if (outcome === 'timeout') {
      pool = VOICE_LIBRARY.timeout;
      poolName = 'timeout';
    }
    const response = this.selector.pick(poolName, pool);
    return this.playSequence([response, animal].filter(Boolean));
  }

  async playGameOver(score) {
    const pool = selectGameOverPool(score);
    const level = score >= 100 ? 'high' : score >= 40 ? 'mid' : 'low';
    return this.playPool(`game-over-${level}`, pool);
  }

  async playSequence(clips) {
    if (!this.enabled || clips.length === 0 || typeof this.window.Audio !== 'function') return false;
    this.cancel();
    const token = this.playbackToken;
    for (const voice of clips) {
      if (!this.enabled || token !== this.playbackToken) return false;
      const completed = await this.playOne(voice, token);
      if (!completed) return false;
    }
    return true;
  }

  playOne(voice, token) {
    return new Promise((resolve) => {
      let settled = false;
      let watchdog = null;
      const clearWatchdog = () => {
        if (watchdog !== null) this.window.clearTimeout?.(watchdog);
        watchdog = null;
      };
      const armWatchdog = () => {
        if (settled || this.currentAudio !== audio) return;
        clearWatchdog();
        watchdog = this.window.setTimeout?.(() => finish(false), CLIP_WATCHDOG_MS) ?? null;
      };
      const finish = (completed) => {
        if (settled) return;
        settled = true;
        clearWatchdog();
        if (this.currentAudio === audio) {
          this.currentAudio = null;
          this.currentFinish = null;
          this.currentSuspendWatchdog = null;
          this.currentResumeWatchdog = null;
          this.pausedForVisibility = false;
        }
        audio.onended = null;
        audio.onerror = null;
        resolve(completed && token === this.playbackToken);
      };

      let audio;
      try {
        audio = new this.window.Audio(voice.path);
        audio.preload = 'auto';
        audio.playsInline = true;
      } catch {
        resolve(false);
        return;
      }

      this.currentAudio = audio;
      this.currentFinish = finish;
      this.currentSuspendWatchdog = clearWatchdog;
      this.currentResumeWatchdog = armWatchdog;
      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      armWatchdog();
      try {
        const playback = audio.play();
        playback?.catch?.(() => finish(false));
      } catch {
        finish(false);
      }
    });
  }
}
