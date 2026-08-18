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

export const createAudioController = ({ windowRef = globalThis.window } = {}) => {
  let context = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let musicOscillator = null;
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

  const syncContextState = () => {
    if (!context || destroyed) return;
    try {
      if (shouldSuspend()) {
        if (context.state !== 'suspended' && context.state !== 'closed') {
          safelyAwait(context.suspend?.());
        }
      } else if (unlocked && context.state !== 'running' && context.state !== 'closed') {
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
    if (musicOscillator || !context || !musicGain || typeof context.createOscillator !== 'function') {
      return;
    }
    try {
      musicOscillator = context.createOscillator();
      musicOscillator.type = 'sine';
      musicOscillator.frequency.value = 110;
      musicOscillator.connect(musicGain);
      musicOscillator.start();
    } catch {
      musicOscillator = null;
    }
  };

  const unlock = () => {
    if (destroyed) return;
    if (unlocked) {
      syncContextState();
      return;
    }
    const AudioContextConstructor = windowRef?.AudioContext ?? windowRef?.webkitAudioContext;
    if (typeof AudioContextConstructor !== 'function') return;
    try {
      context = new AudioContextConstructor();
      unlocked = true;
      createAudioGraph();
      startMusic();
      syncContextState();
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
    const frequencies = { ui: 440, deploy: 330, upgrade: 520, impact: 180, coin: 660, victory: 784, defeat: 146 };
    try {
      const oscillator = context.createOscillator();
      const cueGain = context.createGain();
      const now = context.currentTime;
      oscillator.frequency.value = frequencies[cue] ?? frequencies.ui;
      oscillator.type = cue === 'impact' || cue === 'defeat' ? 'triangle' : 'sine';
      cueGain.gain.setValueAtTime(0.0001, now);
      cueGain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      cueGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      oscillator.connect(cueGain);
      cueGain.connect(sfxGain);
      oscillator.start(now);
      oscillator.stop(now + 0.18);
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
    try {
      musicOscillator?.stop?.();
    } catch {
      // Ignore an already-stopped oscillator.
    }
    try {
      safelyAwait(context?.suspend?.());
      safelyAwait(context?.close?.());
    } catch {
      // Audio teardown remains best-effort.
    }
    context = null;
    musicOscillator = null;
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
