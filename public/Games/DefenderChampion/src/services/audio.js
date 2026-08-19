const clampVolume = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, numeric));
};

const safelyAwait = (promise) => {
  if (promise && typeof promise.catch === 'function') {
    promise.catch(() => {});
  }
};

const CUE_PRESETS = Object.freeze({
  ui: { duration: 0.09, frequency: 440, gain: 0.045, type: 'sine' },
  deploy: { duration: 0.14, frequency: 294, gain: 0.065, type: 'triangle' },
  upgrade: { duration: 0.18, frequency: 523, gain: 0.075, type: 'sine' },
  attack: { duration: 0.08, frequency: 392, gain: 0.04, type: 'triangle' },
  mastery: { duration: 0.22, frequency: 659, gain: 0.085, type: 'sine' },
  impact: { duration: 0.11, frequency: 174, gain: 0.06, type: 'triangle' },
  coin: { duration: 0.12, frequency: 740, gain: 0.06, type: 'sine' },
  wave: { duration: 0.23, frequency: 523, gain: 0.075, type: 'triangle' },
  'castle-damage': { duration: 0.28, frequency: 110, gain: 0.1, type: 'triangle' },
  'boss-warning': { duration: 0.25, frequency: 196, gain: 0.07, type: 'sawtooth' },
  'boss-ability': { duration: 0.32, frequency: 98, gain: 0.1, type: 'sawtooth' },
  'armor-break': { duration: 0.18, frequency: 247, gain: 0.075, type: 'square' },
  victory: { duration: 0.38, frequency: 784, gain: 0.09, type: 'sine' },
  defeat: { duration: 0.42, frequency: 130, gain: 0.09, type: 'triangle' },
});

const MUSIC_NOTES = Object.freeze([
  { frequency: 110, type: 'sine' },
  { frequency: 164.81, type: 'triangle' },
]);

export const createAudioController = ({ windowRef = globalThis.window } = {}) => {
  let context = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let musicBedGain = null;
  const musicOscillators = [];
  let unlocked = false;
  let destroyed = false;
  let muted = false;
  let musicVolume = 0.3;
  let sfxVolume = 0.7;
  const pauseReasons = new Set();

  const shouldSuspend = () => destroyed || muted || pauseReasons.size > 0;

  const updateGainValues = () => {
    if (masterGain?.gain) masterGain.gain.value = muted ? 0 : 1;
    if (musicGain?.gain) musicGain.gain.value = musicVolume;
    if (sfxGain?.gain) sfxGain.gain.value = sfxVolume;
  };

  const syncContextState = (allowResume = false) => {
    if (!context || destroyed) return;
    try {
      if (shouldSuspend()) {
        if (context.state !== 'suspended' && context.state !== 'closed') {
          safelyAwait(context.suspend?.());
        }
      } else if (allowResume && unlocked && context.state !== 'running' && context.state !== 'closed') {
        safelyAwait(context.resume?.());
      }
    } catch {
      // Audio failure degrades to silence.
    }
  };

  const createAudioGraph = () => {
    if (typeof context?.createGain !== 'function') return;
    masterGain = context.createGain();
    musicGain = context.createGain();
    sfxGain = context.createGain();
    musicGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(context.destination);
    updateGainValues();
  };

  const startMusic = () => {
    if (musicOscillators.length > 0 || !context || !musicGain
      || typeof context.createOscillator !== 'function' || typeof context.createGain !== 'function') {
      return;
    }
    try {
      musicBedGain = context.createGain();
      musicBedGain.gain.value = 0.035;
      musicBedGain.connect(musicGain);
      for (const note of MUSIC_NOTES) {
        const oscillator = context.createOscillator();
        oscillator.type = note.type;
        oscillator.frequency.value = note.frequency;
        oscillator.connect(musicBedGain);
        oscillator.start();
        musicOscillators.push(oscillator);
      }
    } catch {
      for (const oscillator of musicOscillators.splice(0)) {
        try {
          oscillator.stop?.();
        } catch {
          // Ignore a partially started bed.
        }
      }
      musicBedGain = null;
    }
  };

  const unlock = () => {
    if (destroyed) return;
    if (unlocked) {
      syncContextState(true);
      return;
    }
    const AudioContextConstructor = windowRef?.AudioContext ?? windowRef?.webkitAudioContext;
    if (typeof AudioContextConstructor !== 'function') return;
    try {
      context = new AudioContextConstructor();
      unlocked = true;
      createAudioGraph();
      startMusic();
      syncContextState(true);
    } catch {
      context = null;
      unlocked = false;
    }
  };

  const setAudioMuted = (value) => {
    muted = Boolean(value);
    updateGainValues();
    syncContextState();
  };

  const setMusicVolume = (value) => {
    musicVolume = clampVolume(value);
    updateGainValues();
  };

  const setSfxVolume = (value) => {
    sfxVolume = clampVolume(value);
    updateGainValues();
  };

  const setPauseReason = (reason, active) => {
    if (destroyed || typeof reason !== 'string' || !reason) return;
    if (active) pauseReasons.add(reason);
    else pauseReasons.delete(reason);
    syncContextState();
  };

  const setPaused = (paused) => setPauseReason('bridge', paused);

  const playCue = (cue = 'ui') => {
    if (!context || !sfxGain || shouldSuspend() || sfxVolume <= 0) return false;
    if (typeof context.createOscillator !== 'function' || typeof context.createGain !== 'function') return false;
    const preset = CUE_PRESETS[cue] ?? CUE_PRESETS.ui;
    try {
      const oscillator = context.createOscillator();
      const cueGain = context.createGain();
      const now = context.currentTime;
      oscillator.frequency.value = preset.frequency;
      oscillator.type = preset.type;
      cueGain.gain.setValueAtTime(0.0001, now);
      cueGain.gain.exponentialRampToValueAtTime(preset.gain, now + 0.01);
      cueGain.gain.exponentialRampToValueAtTime(0.0001, now + preset.duration);
      oscillator.connect(cueGain);
      cueGain.connect(sfxGain);
      oscillator.start(now);
      oscillator.stop(now + preset.duration + 0.02);
      return true;
    } catch {
      return false;
    }
  };

  const pointerUnlock = () => unlock();
  const keyboardUnlock = () => unlock();
  windowRef?.addEventListener?.('pointerdown', pointerUnlock, { passive: true });
  windowRef?.addEventListener?.('keydown', keyboardUnlock);

  if (windowRef) {
    windowRef.setAudioMuted = setAudioMuted;
    windowRef.setMusicVolume = setMusicVolume;
    windowRef.setSfxVolume = setSfxVolume;
  }

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    windowRef?.removeEventListener?.('pointerdown', pointerUnlock);
    windowRef?.removeEventListener?.('keydown', keyboardUnlock);
    if (windowRef?.setAudioMuted === setAudioMuted) delete windowRef.setAudioMuted;
    if (windowRef?.setMusicVolume === setMusicVolume) delete windowRef.setMusicVolume;
    if (windowRef?.setSfxVolume === setSfxVolume) delete windowRef.setSfxVolume;
    for (const oscillator of musicOscillators.splice(0)) {
      try {
        oscillator.stop?.();
      } catch {
        // Ignore an already-stopped oscillator.
      }
    }
    try {
      safelyAwait(context?.suspend?.());
      safelyAwait(context?.close?.());
    } catch {
      // Audio teardown remains best-effort.
    }
    context = null;
    musicBedGain = null;
  };

  return Object.freeze({
    destroy,
    getSettings: () => ({ muted, musicVolume, sfxVolume }),
    isUnlocked: () => unlocked,
    playCue,
    setAudioMuted,
    setMusicVolume,
    setPauseReason,
    setPaused,
    setSfxVolume,
  });
};
