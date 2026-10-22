(function (root) {
  'use strict';

  class WoodlandAudio {
    constructor() {
      this.context = null;
      this.master = null;
      this.buffers = new Map();
      this.sources = new Set();
      this.lastPlayed = new Map();
      this.muted = false;
      this.paused = false;
      this.volume = 0.75;
      this.ambience = null;
      this.loading = null;
    }

    unlock() {
      const AudioContext = root.AudioContext || root.webkitAudioContext;
      if (!AudioContext) return null;
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
        this.updateGain();
      }
      if (!this.paused && this.context.state === 'suspended') this.context.resume().catch(() => {});
      if (!this.loading) this.loading = this.load();
      return this.context;
    }

    async load() {
      try {
        const response = await fetch('./assets/audio/manifest.json');
        if (!response.ok) return;
        const manifest = await response.json();
        await Promise.allSettled(manifest.sounds.map(async (sound) => {
          const response = await fetch(`./assets/audio/${sound.file}`);
          if (!response.ok) return;
          const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
          if (this.context.state === 'closed') return;
          this.buffers.set(sound.id, buffer);
          if (sound.id === 'ambience') this.startAmbience();
        }));
      } catch {
        // The game and its lightweight tone fallback also work without downloaded audio.
      }
    }

    startAmbience() {
      if (this.ambience || !this.buffers.has('ambience') || this.context?.state === 'closed') return;
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = this.buffers.get('ambience');
      source.loop = true;
      gain.gain.value = 0.13;
      source.connect(gain).connect(this.master);
      source.start();
      this.ambience = source;
    }

    play(kind, pitch = 1) {
      if (this.muted || this.paused) return true;
      const buffer = this.buffers.get(kind);
      if (!buffer || this.context?.state !== 'running') return false;
      const now = this.context.currentTime;
      const minimumGap = kind === 'bounce' ? 0.1 : kind === 'draw' ? 0.22 : 0.035;
      if (now - (this.lastPlayed.get(kind) ?? -Infinity) < minimumGap || this.sources.size >= 12) return true;
      this.lastPlayed.set(kind, now);
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = buffer;
      gain.gain.value = kind === 'win' ? 0.65 : kind === 'draw' ? 0.24 : 0.48;
      if (kind === 'bird' || kind === 'bounce') source.playbackRate.value = (0.96 + Math.random() * 0.08) * Math.max(.8, Math.min(1.5, Number(pitch) || 1));
      source.connect(gain).connect(this.master);
      this.sources.add(source);
      source.onended = () => { this.sources.delete(source); source.disconnect(); gain.disconnect(); };
      source.start();
      return true;
    }

    updateGain() {
      if (!this.master) return;
      this.master.gain.setValueAtTime(this.muted ? 0 : this.volume, this.context.currentTime);
    }

    setMuted(muted) { this.muted = Boolean(muted); this.updateGain(); }
    setVolume(volume) { this.volume = Math.max(0, Math.min(1, Number(volume) || 0)); this.updateGain(); }
    setPaused(paused) {
      this.paused = Boolean(paused);
      if (!this.context || this.context.state === 'closed') return;
      if (this.paused) this.context.suspend().catch(() => {});
      else this.context.resume().catch(() => {});
    }

    dispose() {
      this.paused = true;
      for (const source of this.sources) { try { source.stop(); } catch { /* Already ended. */ } }
      this.sources.clear();
      try { this.ambience?.stop(); } catch { /* Already ended. */ }
      this.ambience = null;
      this.context?.close().catch(() => {});
    }
  }
  root.WoodlandAudio = WoodlandAudio;
})(globalThis);
