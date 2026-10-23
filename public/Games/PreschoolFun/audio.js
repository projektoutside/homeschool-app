(function () {
    'use strict';
    const clips = {
        tap: 'ui-tap', place: 'answer-place', correct: 'answer-correct', retry: 'try-again',
        boost: 'wing-boost', streak: 'streak-reward', win: 'escape-win', bump: 'bird-bump', garden: 'garden-ambience'
    };
    window.createPreschoolAudio = function ({ getSettings, canPlay, isPlaying, onVoiceChange = () => {} }) {
        let ctx, master, ambienceGain, voiceGain, ambience, loading, disposed = false;
        let voiceToken = 0, voiceState = 'idle', voiceKind = '', voiceQueue = [], lastRequest = [], voiceError = '';
        const voiceSources = new Set(), voiceBuffers = new Map(), voiceDownloads = new Map();
        let voiceCatalog;
        function getVoiceCatalog() {
            if (!voiceCatalog) voiceCatalog = fetch('audio/voice/manifest.json').then(response => {
                if (!response.ok) throw new Error('Voice unavailable');
                return response.json();
            }).catch(error => { voiceCatalog = null; throw error; });
            return voiceCatalog;
        }
        const buffers = new Map(), active = new Set(), failed = [], played = {};
        const raw = new Map(Object.entries(clips).map(([id, file]) => [id,
            fetch(`audio/${file}.mp3`).then(response => {
                if (!response.ok) throw new Error('Audio unavailable');
                return response.arrayBuffer();
            }).catch(() => { failed.push(id); return null; })
        ]));
        function stop(source) { try { source.stop(); } catch (_) { /* Already ended. */ } }
        function stopVoice() {
            voiceToken += 1; voiceSources.forEach(stop); voiceSources.clear();
            voiceState = 'idle'; voiceKind = ''; voiceQueue = []; onVoiceChange();
        }
        function stopAll() { stopVoice(); active.forEach(stop); active.clear(); if (ambience) stop(ambience); ambience = null; }
        function sync() {
            if (!ctx || disposed) return;
            const settings = getSettings(), audible = !settings.muted && canPlay();
            const talking = voiceState !== 'idle';
            const sfxVolume = Math.max(0, Math.min(1, settings.sfxVolume));
            master.gain.setTargetAtTime(audible ? sfxVolume * (talking ? .45 : 1) : 0, ctx.currentTime, .03);
            voiceGain.gain.setValueAtTime(audible ? sfxVolume : 0, ctx.currentTime);
            ambienceGain.gain.setTargetAtTime(audible ? Math.max(0, Math.min(1, settings.musicVolume)) * (talking ? .2 : 1) : 0, ctx.currentTime, .08);
            if (!sfxVolume && talking) stopVoice();
            if (!audible) {
                stopAll();
                if (!canPlay()) ctx.suspend().catch(() => {});
                return;
            }
            if (ctx.state === 'suspended') ctx.resume().catch(() => {});
            if ((!isPlaying() || !settings.musicVolume) && ambience) { stop(ambience); ambience = null; }
            if (isPlaying() && settings.musicVolume && !ambience && buffers.has('garden')) {
                ambience = ctx.createBufferSource(); ambience.buffer = buffers.get('garden'); ambience.loop = true;
                ambience.connect(ambienceGain); ambience.start();
                ambience.onended = () => { ambienceGain && sync(); };
            }
        }
        function ensure() {
            if (disposed) return null;
            try {
                if (!ctx) {
                    const AudioCtor = window.AudioContext || window.webkitAudioContext;
                    if (!AudioCtor) return null;
                    ctx = new AudioCtor(); master = ctx.createGain(); ambienceGain = ctx.createGain(); voiceGain = ctx.createGain();
                    const limiter = ctx.createDynamicsCompressor();
                    limiter.threshold.value = -8; limiter.ratio.value = 8; limiter.attack.value = .004; limiter.release.value = .12;
                    master.connect(limiter); ambienceGain.connect(limiter); voiceGain.connect(limiter); limiter.connect(ctx.destination);
                    loading = Promise.all([...raw].map(async ([id, promise]) => {
                        const data = await promise;
                        if (!data || disposed) return;
                        try { buffers.set(id, await ctx.decodeAudioData(data.slice(0))); }
                        catch (_) { failed.push(id); }
                    })).then(sync);
                }
                sync();
                return ctx;
            } catch (_) { return null; }
        }
        function play(id, volume = .7) {
            const settings = getSettings();
            if (!ctx || disposed || settings.muted || !canPlay() || !settings.sfxVolume || ctx.state !== 'running') return false;
            const buffer = buffers.get(id);
            if (!buffer) return false; // Late downloads never queue surprise sounds.
            while (active.size >= 4) { const oldest = active.values().next().value; stop(oldest); active.delete(oldest); }
            const source = ctx.createBufferSource(), gain = ctx.createGain();
            source.buffer = buffer; gain.gain.value = volume;
            source.connect(gain); gain.connect(master); active.add(source);
            source.onended = () => { active.delete(source); source.disconnect(); gain.disconnect(); };
            source.start(); played[id] = (played[id] || 0) + 1;
            return true;
        }
        async function loadVoice(id, catalog) {
            if (voiceBuffers.has(id)) return voiceBuffers.get(id);
            if (voiceDownloads.has(id)) return voiceDownloads.get(id);
            const clip = catalog?.clips?.[id];
            if (!clip) throw new Error('Voice clip unavailable');
            const promise = fetch(`audio/voice/${clip.file}`).then(response => {
                if (!response.ok) throw new Error('Voice clip unavailable');
                return response.arrayBuffer();
            }).then(data => ctx.decodeAudioData(data)).then(buffer => {
                if (!disposed) {
                    // Keep the mobile decoded cache bounded; MP3s remain in the browser cache.
                    if (voiceBuffers.size >= 24) voiceBuffers.delete(voiceBuffers.keys().next().value);
                    voiceBuffers.set(id, buffer);
                }
                return buffer;
            }).finally(() => voiceDownloads.delete(id));
            voiceDownloads.set(id, promise);
            return promise;
        }
        async function speak(ids, kind, isCurrent = () => true) {
            stopVoice(); voiceError = '';
            if (!ensure() || disposed || getSettings().muted || !getSettings().sfxVolume || !canPlay()) return false;
            const token = voiceToken;
            const valid = () => token === voiceToken && !disposed && canPlay() && !getSettings().muted && getSettings().sfxVolume > 0 && isCurrent();
            voiceState = 'loading'; voiceKind = kind; voiceQueue = [...ids]; lastRequest = [...ids]; onVoiceChange(); sync();
            try {
                const catalog = await getVoiceCatalog();
                if (!valid()) { if (token === voiceToken) { stopVoice(); sync(); } return false; }
                const decoded = await Promise.all(ids.map(id => loadVoice(id, catalog)));
                if (!valid()) { if (token === voiceToken) { stopVoice(); sync(); } return false; }
                if (ctx.state === 'suspended') await ctx.resume();
                if (!valid() || ctx.state !== 'running') throw new Error('Tap Listen to enable the voice');
                voiceState = 'speaking'; onVoiceChange();
                let at = ctx.currentTime + .025;
                decoded.forEach((buffer, index) => {
                    const source = ctx.createBufferSource(); source.buffer = buffer; source.connect(voiceGain); voiceSources.add(source);
                    source.onended = () => {
                        voiceSources.delete(source); source.disconnect();
                        if (index === decoded.length - 1 && token === voiceToken) { stopVoice(); sync(); }
                    };
                    source.start(at); at += buffer.duration + .09;
                });
                return true;
            } catch (_) {
                if (token === voiceToken) { stopVoice(); voiceError = 'Voice unavailable. Tap Listen to try again.'; onVoiceChange(); sync(); }
                return false;
            }
        }
        return {
            ensure, sync, speak, stopVoice: () => { stopVoice(); sync(); },
            boop: () => play('tap', .5), drop: () => play('place', .6),
            success: () => play('correct'), wrong: () => play('retry', .65),
            loss: () => play('bump', .7), boost: () => play('boost', .55),
            streak: () => play('streak', .7), win: () => play('win', .8), ambient: sync,
            ready: () => loading || Promise.resolve(),
            describe: () => ({ supported: Boolean(window.AudioContext || window.webkitAudioContext), context: ctx?.state || 'locked', loaded: [...buffers.keys()], failed: [...failed], played: { ...played }, active: active.size, ambience: Boolean(ambience), muted: getSettings().muted,
                voice: { state: voiceState, kind: voiceKind, queue: [...voiceQueue], lastRequest: [...lastRequest], active: voiceSources.size, loaded: [...voiceBuffers.keys()], error: voiceError } }),
            dispose() { disposed = true; stopAll(); ctx?.close().catch(() => {}); }
        };
    };
})();
