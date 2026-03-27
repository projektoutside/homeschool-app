(() => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const BASE_MASTER_VOLUME = 0.48;
  const ATTACK_SECONDS = 0.01;
  const RELEASE_FLOOR = 0.0001;
  const MIN_AUDIBLE_GAIN = 0.0005;
  const PRIME_EVENTS = ["pointerdown", "keydown", "touchstart"];
  const PLAYBACK_LOOKAHEAD_SECONDS = 0.02;

  let audioContext = null;
  let masterGain = null;
  let resumePromise = null;
  let primeListenersBound = false;
  let audioMuted = false;
  let sfxVolume = 0.75;
  let warmupCompleted = false;

  function clampUnit(value, fallback = 1) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return fallback;
    }

    return Math.max(0, Math.min(1, numericValue));
  }

  function getEffectiveMasterVolume() {
    if (audioMuted) {
      return 0;
    }

    return BASE_MASTER_VOLUME * clampUnit(sfxVolume, 0.75);
  }

  function syncMasterGain(context = audioContext) {
    if (!masterGain || !context || masterGain.context !== context) {
      return;
    }

    const nextVolume = getEffectiveMasterVolume();

    try {
      masterGain.gain.cancelScheduledValues(context.currentTime);
      masterGain.gain.setTargetAtTime(nextVolume, context.currentTime, 0.012);
    } catch {
      masterGain.gain.value = nextVolume;
    }
  }

  function clearPrimeListeners() {
    if (!primeListenersBound) {
      return;
    }

    primeListenersBound = false;
    PRIME_EVENTS.forEach((eventName) => {
      window.removeEventListener(eventName, handlePrimeEvent, true);
    });
  }

  function getAudioContext() {
    if (!AudioContextClass) {
      return null;
    }

    if (!audioContext || audioContext.state === "closed") {
      try {
        audioContext = new AudioContextClass();
      } catch {
        audioContext = null;
        return null;
      }
    }

    return audioContext;
  }

  function getMasterGain(context) {
    if (!masterGain || masterGain.context !== context) {
      masterGain = context.createGain();
      masterGain.gain.value = getEffectiveMasterVolume();
      masterGain.connect(context.destination);
    }

    syncMasterGain(context);
    return masterGain;
  }

  function warmUpContext(context) {
    if (!context || warmupCompleted) {
      return;
    }

    try {
      const master = getMasterGain(context);
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const startAt = context.currentTime;

      oscillator.type = "sine";
      oscillator.frequency.value = 1;
      gainNode.gain.value = RELEASE_FLOOR;

      oscillator.connect(gainNode);
      gainNode.connect(master);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.001);
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
      warmupCompleted = true;
    } catch {
      // Ignore unlock failures; normal playback can still succeed.
    }
  }

  function resumeContext(context) {
    if (context.state === "running") {
      warmUpContext(context);
      clearPrimeListeners();
      return Promise.resolve(context);
    }

    if (!resumePromise) {
      resumePromise = context
        .resume()
        .catch(() => null)
        .then(() => {
          resumePromise = null;
          if (context.state === "running") {
            warmUpContext(context);
            clearPrimeListeners();
            return context;
          }
          return null;
        });
    }

    return resumePromise;
  }

  function ensureRunning() {
    const context = getAudioContext();

    if (!context) {
      return Promise.resolve(null);
    }

    return resumeContext(context);
  }

  function scheduleTone(context, master, baseStartAt, note) {
    const startAt = baseStartAt + Math.max(0, note.start ?? 0);
    const duration = Math.max(0.05, note.duration ?? 0.18);
    const stopAt = startAt + duration;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const peakVolume = Math.max(RELEASE_FLOOR, note.volume ?? 0.22);
    const attackAt = Math.min(stopAt, startAt + Math.min(ATTACK_SECONDS, duration / 3));

    oscillator.type = note.type ?? "sine";
    oscillator.frequency.setValueAtTime(note.frequency, startAt);

    if (Number.isFinite(note.endFrequency) && note.endFrequency !== note.frequency) {
      oscillator.frequency.linearRampToValueAtTime(note.endFrequency, stopAt);
    }

    gainNode.gain.setValueAtTime(RELEASE_FLOOR, startAt);
    gainNode.gain.linearRampToValueAtTime(peakVolume, attackAt);
    gainNode.gain.exponentialRampToValueAtTime(RELEASE_FLOOR, stopAt);

    oscillator.connect(gainNode);
    gainNode.connect(master);

    oscillator.start(startAt);
    oscillator.stop(stopAt + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
  }

  function playPattern(notes) {
    const context = getAudioContext();

    if (!context || getEffectiveMasterVolume() <= MIN_AUDIBLE_GAIN) {
      return Promise.resolve(false);
    }

    const master = getMasterGain(context);
    const baseStartAt = context.currentTime + PLAYBACK_LOOKAHEAD_SECONDS;

    notes.forEach((note) => scheduleTone(context, master, baseStartAt, note));
    return resumeContext(context)
      .then((runningContext) => Boolean(runningContext && runningContext.state === "running"))
      .catch(() => false);
  }

  function playCorrect() {
    return playPattern([
      { start: 0, duration: 0.16, frequency: 523.25, endFrequency: 587.33, type: "triangle", volume: 0.34 },
      { start: 0.09, duration: 0.2, frequency: 659.25, endFrequency: 739.99, type: "triangle", volume: 0.3 },
      { start: 0.18, duration: 0.3, frequency: 783.99, endFrequency: 987.77, type: "sine", volume: 0.28 },
    ]);
  }

  function playWrong() {
    return playPattern([
      { start: 0, duration: 0.26, frequency: 246.94, endFrequency: 155.56, type: "sawtooth", volume: 0.4 },
      { start: 0.03, duration: 0.34, frequency: 185, endFrequency: 110, type: "square", volume: 0.3 },
      { start: 0.08, duration: 0.26, frequency: 146.83, endFrequency: 82.41, type: "sawtooth", volume: 0.24 },
    ]);
  }

  function handlePrimeEvent() {
    ensureRunning();
  }

  function bindPrimeListeners() {
    if (primeListenersBound || !AudioContextClass) {
      return;
    }

    primeListenersBound = true;
    PRIME_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handlePrimeEvent, true);
    });
  }

  function setAudioMuted(muted) {
    audioMuted = Boolean(muted);
    syncMasterGain();
  }

  function setSfxVolume(volume) {
    sfxVolume = clampUnit(volume, sfxVolume);
    syncMasterGain();
  }

  function handleIncomingSoundSettings(event) {
    const payload = event?.data?.type === "APP_SOUND_SETTINGS_UPDATE" ? event.data.payload : null;

    if (!payload || typeof payload !== "object") {
      return;
    }

    if ("muted" in payload) {
      setAudioMuted(payload.muted);
    }

    if ("sfxVolume" in payload) {
      setSfxVolume(payload.sfxVolume);
    }
  }

  bindPrimeListeners();
  window.addEventListener("message", handleIncomingSoundSettings);
  window.setAudioMuted = setAudioMuted;
  window.setSfxVolume = setSfxVolume;

  window.StatesChampionSoundEffects = Object.freeze({
    prime: ensureRunning,
    playCorrect,
    playWrong,
  });
})();
