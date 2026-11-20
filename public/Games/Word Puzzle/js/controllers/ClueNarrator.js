class ClueNarrator {
    constructor(music) {
        this.music = music;
        this.audio = new Audio();
        this.audio.preload = 'auto';
        this.gain = music?.connectEasyAudio(this.audio);
        this.controls = document.getElementById('clueAudioControls');
        this.button = document.getElementById('hearClue');
        this.toggle = document.getElementById('toggleClueVoice');
        this.toggleState = this.toggle.querySelector('span');
        this.requestId = 0;
        this.word = null;
        this.clip = null;

        this.toggle.addEventListener('click', () => {
            this.enabled = !this.enabled;
            try {
                localStorage.setItem(this.preferenceKey, this.enabled ? 'on' : 'off');
            } catch (_error) {
                // The current session still honors the choice without storage.
            }
            if (!this.enabled) this.stop();
            else if (this.word) {
                this.music?.resumeEasyAudio();
                this.play(this.word);
            }
            this.updateButton();
        });
        this.button.addEventListener('click', () => {
            if (this.clip === this.word) this.stop();
            else if (this.word) {
                this.music?.resumeEasyAudio();
                this.play(this.word);
            }
        });
        this.audio.addEventListener('ended', () => this.finish());
        this.audio.addEventListener('error', () => this.finish());
        window.addEventListener('wordPuzzleSoundChanged', () => this.updateVolume());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.stop();
        });
        window.addEventListener('pagehide', () => this.stop());
    }

    startSession(withGuide) {
        this.preferenceKey = this.music?.getStorageKey('wordPuzzleClueVoice') || 'wordPuzzleClueVoice';
        try {
            this.enabled = localStorage.getItem(this.preferenceKey) !== 'off';
        } catch (_error) {
            this.enabled ??= true;
        }
        if (withGuide) this.play('guide');
    }

    startRound(word) {
        this.word = word;
        this.controls.hidden = false;
        this.updateVolume();
        // Let the one-time instructions finish before automatically reading the first clue.
        if (this.clip !== 'guide') this.play(word);
    }

    play(clip) {
        if (!this.enabled || !this.getVolume() || document.hidden) return;
        const requestId = ++this.requestId;
        this.clip = clip;
        this.updateVolume();
        this.music?.setClueDucking(true);
        this.audio.src = `Voice/Easy/${clip.toLowerCase()}.mp3`;
        clearTimeout(this.loadTimeout);
        this.loadTimeout = setTimeout(() => {
            if (requestId === this.requestId) this.finish();
        }, 8000);
        this.audio.play().then(() => {
            if (requestId === this.requestId) clearTimeout(this.loadTimeout);
        }).catch(() => {
            if (requestId === this.requestId) this.finish();
        });
    }

    finish() {
        const pendingWord = this.clip === 'guide' ? this.word : null;
        this.stop();
        if (pendingWord) this.play(pendingWord);
    }

    stop() {
        if (!this.clip) return;
        this.requestId += 1;
        clearTimeout(this.loadTimeout);
        this.clip = null;
        this.audio.pause();
        this.music?.setClueDucking(false);
        this.updateButton();
    }

    endRound(hideControls = false) {
        this.word = null;
        this.stop();
        this.controls.hidden = hideControls;
        this.updateButton();
    }

    getVolume() {
        return this.music?.getSfxVolume() ?? 0.8;
    }

    updateVolume() {
        const volume = this.getVolume();
        if (this.gain) this.gain.gain.value = volume;
        else this.audio.volume = volume;
        if (!volume) this.stop();
        this.updateButton();
    }

    updateButton() {
        this.toggle.setAttribute('aria-pressed', String(this.enabled));
        this.toggleState.textContent = this.enabled ? 'On' : 'Off';
        this.button.hidden = !this.enabled;
        const muted = !this.getVolume();
        this.button.disabled = muted || !this.word;
        this.button.textContent = muted ? 'Clue Muted'
            : this.clip && this.clip === this.word ? 'Stop Clue' : 'Hear Clue';
    }
}
