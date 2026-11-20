class PhonicsNarrator {
    constructor(music) {
        this.music = music;
        this.audio = new Audio();
        this.audio.preload = 'auto';
        this.gain = music?.connectAudio(this.audio);
        this.instructions = document.getElementById('phonicsInstructions');
        this.controls = document.getElementById('phonicsAudioControls');
        this.prompt = document.getElementById('phonicsPrompt');
        this.writtenWord = document.getElementById('phonicsWrittenWord');
        this.wordButton = document.getElementById('hearPhonicsWord');
        this.soundsButton = document.getElementById('hearPhonicsSounds');
        this.word = null;
        this.sequence = null;
        this.resumeAfterTap = null;
        this.playingSound = null;
        this.replayRequest = null;

        this.wordButton.addEventListener('click', () => this.replay('word'));
        this.soundsButton.addEventListener('click', () => this.replay('sounds'));
        window.addEventListener('wordPuzzleSoundChanged', () => this.updateVolume());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.stop();
        });
        window.addEventListener('pagehide', () => this.stop());
    }

    startSession() {
        this.stop();
        this.welcomePending = true;
    }

    startRound(word, { retry = false } = {}) {
        this.word = word;
        this.failed = false;
        this.controls.hidden = false;
        this.instructions.hidden = false;
        const guide = retry ? 'try-again' : this.welcomePending ? 'welcome' : null;
        this.welcomePending = false;
        this.read('round', guide);
    }

    async replay(part) {
        if (!this.word) return;
        this.music?.resumeAudio();
        const request = {};
        this.replayRequest = request;
        if (this.playingSound) await this.playingSound;
        if (this.replayRequest !== request) return;
        this.failed = false;
        this.read(part);
    }

    waitForCurrentSound() {
        this.replayRequest = null;
        if (this.playingSound) {
            this.wordButton.disabled = true;
            this.soundsButton.disabled = true;
        }
        return this.playingSound;
    }

    letterPlaced() {
        this.resumeAfterTap?.();
        if (!this.sequence && this.word && !this.failed) this.read('sounds');
    }

    restartSound() {
        if (this.word && !this.failed) this.replay('sounds');
    }

    async read(part, guide = null) {
        this.stop();
        this.updateVolume();
        const word = this.word;
        if (!word || !this.getVolume() || document.hidden) return;

        const sequence = new AbortController();
        this.sequence = sequence;
        const { signal } = sequence;
        const wordClip = `words/${word.toLowerCase()}`;
        const steps = [];
        if (guide) steps.push({ clip: `guides/${guide}`, gap: 400 });
        if (part !== 'sounds') steps.push({ clip: wordClip, cue: 'Listen to the word.', gap: 950 });
        if (part === 'round') steps.push({ clip: 'guides/sounds', cue: 'Listen to each sound.', gap: 500 });

        this.music?.setClueDucking(true);
        for (const step of steps) {
            if (signal.aborted) break;
            if (step.cue) this.prompt.textContent = step.cue;
            if (!await this.playClip(step.clip, signal)) {
                if (!signal.aborted) this.failed = true;
                break;
            }
            await this.waitBetweenSounds(step.gap, signal);
        }

        if (!this.failed && !signal.aborted) {
            await this.guideLetterPlacement(word, signal);
        }

        if (this.sequence === sequence) {
            this.stop();
            this.updateVolume();
        }
    }

    async guideLetterPlacement(word, signal) {
        while (!signal.aborted) {
            const slot = document.querySelector('#equationDisplay .equation-slot:not(.filled)');
            if (!slot) return;
            const index = Number(slot.dataset.position);
            const sound = PHONICS_SOUND_BY_LETTER[word[index]];
            this.highlightSlot(index);
            this.prompt.textContent = 'Listen to this sound.';
            if (!await this.playClip(`sounds/${sound}`, signal)) {
                if (!signal.aborted) this.failed = true;
                return;
            }
            if (signal.aborted) return;
            this.prompt.textContent = 'Tap a letter for this sound.';
            await this.waitBetweenSounds(1000, signal);
            await this.waitForPlacement(slot, signal);
        }
    }

    waitForPlacement(slot, signal) {
        if (signal.aborted || slot.classList.contains('filled')) return;
        return new Promise((resolve) => {
            const finish = () => {
                this.resumeAfterTap = null;
                signal.removeEventListener('abort', finish);
                resolve();
            };
            this.resumeAfterTap = finish;
            signal.addEventListener('abort', finish, { once: true });
        });
    }

    async playClip(clip, signal) {
        const playback = new Promise((resolve) => {
            const finish = (played) => {
                clearTimeout(timeout);
                this.audio.removeEventListener('ended', ended);
                this.audio.removeEventListener('error', failed);
                signal.removeEventListener('abort', failed);
                resolve(played);
            };
            const ended = () => finish(true);
            const failed = () => finish(false);
            const timeout = setTimeout(failed, 12000);
            this.audio.addEventListener('ended', ended);
            this.audio.addEventListener('error', failed);
            signal.addEventListener('abort', failed, { once: true });
            this.audio.src = `Voice/Phonics/${clip}.mp3`;
            this.audio.play().catch(failed);
        });
        if (clip.startsWith('sounds/') || clip.startsWith('words/')) this.playingSound = playback;

        const played = await playback;
        if (this.playingSound === playback) this.playingSound = null;
        return played;
    }

    waitBetweenSounds(milliseconds, signal) {
        if (signal.aborted) return;
        return new Promise((resolve) => {
            const finish = () => {
                clearTimeout(timeout);
                signal.removeEventListener('abort', finish);
                resolve();
            };
            const timeout = setTimeout(finish, milliseconds);
            signal.addEventListener('abort', finish, { once: true });
        });
    }

    highlightSlot(index) {
        document.querySelectorAll('#equationDisplay .equation-slot').forEach((slot, position) => {
            slot.classList.toggle('phonics-sound-slot', position === index);
        });
    }

    stop() {
        this.replayRequest = null;
        const sequence = this.sequence;
        if (!sequence) return;
        this.sequence = null;
        sequence.abort();
        this.audio.pause();
        this.music?.setClueDucking(false);
        this.highlightSlot(-1);
        this.prompt.textContent = 'Tap the letters in order.';
    }

    endRound(hideControls = false) {
        this.stop();
        this.word = null;
        this.controls.hidden = hideControls;
        this.instructions.hidden = hideControls;
        this.updateVolume();
    }

    getVolume() {
        return this.music?.getSfxVolume() ?? 0.8;
    }

    updateVolume() {
        const volume = this.getVolume();
        if (this.gain) this.gain.gain.value = volume;
        else this.audio.volume = volume;
        if (!volume) this.stop();
        this.wordButton.disabled = !this.word || !volume;
        this.soundsButton.disabled = !this.word || !volume;
        this.writtenWord.hidden = !this.word || (volume > 0 && !this.failed);
        this.writtenWord.textContent = this.writtenWord.hidden ? '' : this.word;
    }
}
