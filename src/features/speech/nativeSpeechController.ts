import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';
import type { CarKingSpeechEventMessage, CarKingSpeechState, SpeechSessionOptions } from './speechBridge';
import {
    createTranscriptSnapshot,
    isLikelyDesktopDevice,
    type SpeechEngineAvailability,
    type SpeechEngineController,
    type SpeechEngineEvents,
    type SpeechEngineKind,
    type SpeechTranscriptSnapshot,
    uniqueSpeechPhrases,
} from './speechEngine';

type PostEvent = (message: Omit<CarKingSpeechEventMessage, 'type' | 'gameId'>) => void;

type WebSpeechPhrase = {
    phrase: string;
    boost: number;
};

type WebSpeechRecognitionConstructor = (new () => {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    phrases?: WebSpeechPhrase[];
    processLocally?: boolean;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((event: { error?: string; message?: string }) => void) | null;
    onresult: ((event: {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript?: string }> & { isFinal?: boolean }>;
    }) => void) | null;
    onaudiostart?: (() => void) | null;
    onaudioend?: (() => void) | null;
    onspeechstart?: (() => void) | null;
    onspeechend?: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
}) & {
    available?: (options: { langs: string[]; processLocally?: boolean }) => Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
    install?: (options: { langs: string[] }) => Promise<boolean>;
};

class UnsupportedSpeechEngine implements SpeechEngineController {
    readonly kind: SpeechEngineKind = 'unsupported';
    availability: SpeechEngineAvailability = {
        available: false,
        kind: 'unsupported',
        message: 'No host-owned speech engine is available on this device.',
    };

    async initialize() {
        return this.availability;
    }

    async startSession() {
        throw new Error(this.availability.message);
    }

    async stopSession() {
        return undefined;
    }

    async abortSession() {
        return undefined;
    }

    async dispose() {
        return undefined;
    }
}

class NativeSpeechEngine implements SpeechEngineController {
    readonly kind: SpeechEngineKind = 'native';
    availability: SpeechEngineAvailability = {
        available: false,
        kind: 'native',
        onDevice: false,
        message: 'Native speech recognition is unavailable.',
    };

    private listenerHandles: PluginListenerHandle[] = [];
    private events: SpeechEngineEvents | null = null;
    private lastSnapshot: SpeechTranscriptSnapshot | null = null;
    private initialized = false;
    private pendingStop = false;

    async initialize() {
        if (this.initialized) {
            return this.availability;
        }

        const permission = await SpeechRecognition.requestPermissions()
            .catch(() => SpeechRecognition.checkPermissions())
            .catch(() => null);
        const availability = await SpeechRecognition.available().catch(() => ({ available: false }));
        const onDeviceAvailability = await SpeechRecognition.isOnDeviceRecognitionAvailable({ language: 'en-US' })
            .catch(() => ({ available: false }));

        this.availability = {
            available: Boolean(availability.available),
            kind: 'native',
            onDevice: Boolean(onDeviceAvailability.available),
            message: permission?.speechRecognition === 'denied'
                ? 'Speech permission is blocked at the OS level.'
                : availability.available
                    ? 'Native speech recognition ready.'
                    : 'Native speech recognition service is unavailable.',
        };

        await this.attachListeners();
        this.initialized = true;
        return this.availability;
    }

    async startSession(options: SpeechSessionOptions, events: SpeechEngineEvents) {
        await this.initialize();
        if (!this.availability.available) {
            throw new Error(this.availability.message || 'Native speech recognition unavailable.');
        }

        this.events = events;
        this.lastSnapshot = null;
        this.pendingStop = false;

        const permission = await SpeechRecognition.requestPermissions()
            .catch(() => SpeechRecognition.checkPermissions())
            .catch(() => null);

        if (permission?.speechRecognition === 'denied') {
            events.onError('permission-denied', 'Microphone or speech permission is blocked in the native app settings.');
            throw new Error('permission-denied');
        }

        await SpeechRecognition.forceStop({ timeout: 450 }).catch(() => undefined);
        events.onStateChange('prewarming', 'native-prewarm');

        await SpeechRecognition.start({
            language: options.language || 'en-US',
            maxResults: 5,
            partialResults: options.partialResults ?? true,
            allowForSilence: Math.max(options.silenceMs ?? 1100, 300),
            useOnDeviceRecognition: Boolean(this.availability.onDevice),
            addPunctuation: true,
            continuousPTT: false,
            popup: false,
        });
    }

    async stopSession() {
        this.pendingStop = true;
        const snapshot = await SpeechRecognition.getLastPartialResult().catch(() => null);
        if (snapshot?.available) {
            const nextSnapshot = createTranscriptSnapshot(snapshot.matches || [], snapshot.text || '', true, false);
            this.lastSnapshot = nextSnapshot;
            this.events?.onFinal(nextSnapshot);
        }

        await SpeechRecognition.stop().catch(() => SpeechRecognition.forceStop({ timeout: 550 }).catch(() => undefined));
    }

    async abortSession() {
        this.pendingStop = true;
        await SpeechRecognition.forceStop({ timeout: 250 }).catch(() => undefined);
    }

    async dispose() {
        await this.abortSession();
        await SpeechRecognition.removeAllListeners().catch(() => undefined);
        this.listenerHandles = [];
        this.events = null;
        this.initialized = false;
    }

    private async attachListeners() {
        if (this.listenerHandles.length > 0) {
            return;
        }

        this.listenerHandles = await Promise.all([
            SpeechRecognition.addListener('partialResults', (event) => {
                const nextSnapshot = createTranscriptSnapshot(
                    [...(event.matches || []), event.accumulatedText || event.accumulated || ''],
                    event.accumulatedText || event.accumulated || event.matches?.[0] || '',
                    false,
                    Boolean(event.forced),
                );

                this.lastSnapshot = nextSnapshot;
                this.events?.onPartial(nextSnapshot);
                this.events?.onLevel?.(nextSnapshot.text ? 0.82 : 0.3);
            }),
            SpeechRecognition.addListener('segmentResults', (event) => {
                const nextSnapshot = createTranscriptSnapshot(event.matches || [], event.matches?.[0] || '', true, false);
                this.lastSnapshot = nextSnapshot;
                this.events?.onFinal(nextSnapshot);
                this.events?.onLevel?.(0.95);
            }),
            SpeechRecognition.addListener('listeningState', (event) => {
                const nextState = this.mapNativeState(event.state, event.status);
                if (!nextState) {
                    return;
                }

                const reason = event.reason || event.errorCode || 'native-state';
                this.events?.onStateChange(nextState, reason);
                if (nextState === 'idle' && this.pendingStop) {
                    this.pendingStop = false;
                    this.events?.onLevel?.(0);
                }
            }),
            SpeechRecognition.addListener('error', (event) => {
                this.events?.onError(event.code || 'native-error', event.message || 'Native speech recognition failed.');
                this.events?.onStateChange('error', event.code || 'native-error');
            }),
            SpeechRecognition.addListener('readyForNextSession', () => {
                this.events?.onStateChange('idle', 'native-ready');
                this.events?.onLevel?.(0);
            }),
            SpeechRecognition.addListener('endOfSegmentedSession', () => {
                if (this.lastSnapshot && !this.lastSnapshot.isFinal) {
                    this.events?.onFinal({ ...this.lastSnapshot, isFinal: true });
                }
                this.events?.onLevel?.(0);
            }),
        ]);
    }

    private mapNativeState(state?: string, status?: string): CarKingSpeechState | null {
        switch (state || status) {
            case 'startingListening':
                return 'prewarming';
            case 'started':
                return 'listening';
            case 'stoppingListening':
                return 'stopping';
            case 'stopped':
                return 'idle';
            default:
                return null;
        }
    }
}

class WebSpeechEngine implements SpeechEngineController {
    readonly kind: SpeechEngineKind = 'web-speech';
    availability: SpeechEngineAvailability = {
        available: false,
        kind: 'web-speech',
        onDevice: false,
        processLocally: false,
        message: 'Browser speech recognition is unavailable.',
    };

    private recognition: InstanceType<WebSpeechRecognitionConstructor> | null = null;
    private ctor: WebSpeechRecognitionConstructor | null = null;

    async initialize() {
        this.ctor = this.getConstructor();
        if (!this.ctor) {
            this.availability = {
                available: false,
                kind: 'web-speech',
                processLocally: false,
                message: 'Browser speech recognition is unavailable.',
            };
            return this.availability;
        }

        let processLocally = false;
        if (typeof this.ctor.available === 'function') {
            const localAvailability = await this.ctor.available({
                langs: ['en-US'],
                processLocally: true,
            }).catch(() => 'unavailable' as const);

            if (localAvailability === 'downloadable' && typeof this.ctor.install === 'function') {
                const installed = await this.ctor.install({ langs: ['en-US'] }).catch(() => false);
                processLocally = installed;
            } else {
                processLocally = localAvailability === 'available';
            }
        }

        this.availability = {
            available: true,
            kind: 'web-speech',
            processLocally,
            onDevice: processLocally,
            message: processLocally
                ? 'Browser speech recognition ready with local processing.'
                : 'Browser speech recognition ready.',
        };

        return this.availability;
    }

    async startSession(options: SpeechSessionOptions, events: SpeechEngineEvents) {
        await this.initialize();
        if (!this.ctor || !this.availability.available) {
            throw new Error(this.availability.message || 'Browser speech recognition unavailable.');
        }

        await this.abortSession();

        const recognition = new this.ctor();
        recognition.lang = options.language || 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 5;

        if (this.availability.processLocally && 'processLocally' in recognition) {
            recognition.processLocally = true;
        }

        if ('phrases' in recognition) {
            recognition.phrases = uniqueSpeechPhrases(options.contextualPhrases || []).slice(0, 24).map((phrase) => ({
                phrase,
                boost: 8,
            }));
        }

        recognition.onstart = () => {
            events.onStateChange('prewarming', 'web-speech-start');
        };

        recognition.onaudiostart = () => {
            events.onLevel?.(0.6);
        };

        recognition.onspeechstart = () => {
            events.onLevel?.(0.9);
        };

        recognition.onspeechend = () => {
            events.onLevel?.(0.25);
        };

        recognition.onaudioend = () => {
            events.onLevel?.(0);
        };

        recognition.onend = () => {
            events.onStateChange('idle', 'web-speech-ended');
            events.onLevel?.(0);
        };

        recognition.onerror = (event) => {
            const code = event.error || 'web-speech-error';
            events.onError(code, this.describeWebSpeechError(code));
            events.onStateChange('error', code);
        };

        recognition.onresult = (event) => {
            const snapshot = this.buildSnapshotFromResult(event);
            if (!snapshot) {
                return;
            }

            if (snapshot.isFinal) {
                events.onFinal(snapshot);
                events.onLevel?.(0.95);
                return;
            }

            events.onPartial(snapshot);
            events.onStateChange('listening', 'web-speech-interim');
        };

        this.recognition = recognition;
        recognition.start();
    }

    async stopSession() {
        if (!this.recognition) {
            return;
        }

        this.recognition.stop();
    }

    async abortSession() {
        if (!this.recognition) {
            return;
        }

        try {
            this.recognition.abort();
        } catch {
            // noop
        } finally {
            this.recognition = null;
        }
    }

    async dispose() {
        await this.abortSession();
    }

    private getConstructor() {
        if (typeof window === 'undefined') {
            return null;
        }

        const hostWindow = window as typeof window & {
            SpeechRecognition?: WebSpeechRecognitionConstructor;
            webkitSpeechRecognition?: WebSpeechRecognitionConstructor;
        };

        return hostWindow.SpeechRecognition || hostWindow.webkitSpeechRecognition || null;
    }

    private buildSnapshotFromResult(event: {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript?: string }> & { isFinal?: boolean }>;
    }) {
        const phrases: string[] = [];
        let displayText = '';
        let isFinal = false;

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const result = event.results[index];
            if (!result || result.length === 0) {
                continue;
            }

            isFinal = Boolean(result.isFinal) || isFinal;
            const topTranscript = `${result[0]?.transcript || ''}`.trim();
            if (topTranscript) {
                displayText = topTranscript;
                phrases.push(topTranscript);
            }

            const maxAlternatives = Math.min(result.length, 5);
            for (let altIndex = 0; altIndex < maxAlternatives; altIndex += 1) {
                const transcript = `${result[altIndex]?.transcript || ''}`.trim();
                if (transcript) {
                    phrases.push(transcript);
                }
            }
        }

        if (!phrases.length && !displayText) {
            return null;
        }

        return createTranscriptSnapshot(phrases, displayText, isFinal, false);
    }

    private describeWebSpeechError(code: string) {
        switch (code) {
            case 'not-allowed':
            case 'service-not-allowed':
                return 'Microphone permission is blocked in the browser.';
            case 'audio-capture':
                return 'No microphone audio was detected by the browser.';
            case 'network':
                return 'Browser speech recognition lost its network connection.';
            case 'no-speech':
                return 'No speech was detected yet. Try saying the car name again.';
            default:
                return 'Browser speech recognition ran into an error.';
        }
    }
}

class ExperimentalMoonshineEngine implements SpeechEngineController {
    readonly kind: SpeechEngineKind = 'moonshine';
    availability: SpeechEngineAvailability = {
        available: false,
        kind: 'moonshine',
        processLocally: false,
        onDevice: false,
        message: 'Experimental Moonshine fallback is not enabled for this session.',
    };

    async initialize() {
        const enabled = isLikelyDesktopDevice()
            && typeof navigator !== 'undefined'
            && 'gpu' in navigator
            && typeof window !== 'undefined'
            && window.localStorage.getItem('carKingMoonshineExperimental') === 'enabled';

        let message = 'Experimental Moonshine fallback is disabled by default.';
        if (enabled) {
            try {
                await import('@huggingface/transformers');
                message = 'Experimental Moonshine fallback is reserved for a future desktop-only rollout.';
            } catch {
                message = 'Experimental Moonshine fallback could not load the Transformers.js runtime.';
            }
        }

        this.availability = {
            available: false,
            kind: 'moonshine',
            processLocally: false,
            onDevice: false,
            message,
        };

        return this.availability;
    }

    async startSession() {
        throw new Error(this.availability.message);
    }

    async stopSession() {
        return undefined;
    }

    async abortSession() {
        return undefined;
    }

    async dispose() {
        return undefined;
    }
}

export class CarKingNativeFirstSpeechController {
    private readonly postEvent: PostEvent;
    private engine: SpeechEngineController = new UnsupportedSpeechEngine();
    private activeRoundId: string | null = null;
    private gateOpen = false;
    private bufferedSnapshots: SpeechTranscriptSnapshot[] = [];
    private currentState: CarKingSpeechState = 'idle';
    private currentAvailability: SpeechEngineAvailability = {
        available: false,
        kind: 'unsupported',
        message: 'Speech controller has not been initialized.',
    };
    private initialized = false;

    constructor(postEvent: PostEvent) {
        this.postEvent = postEvent;
    }

    async initialize() {
        if (this.initialized) {
            return this.currentAvailability;
        }

        const candidates: SpeechEngineController[] = [];
        if (Capacitor.isNativePlatform()) {
            candidates.push(new NativeSpeechEngine());
        }
        candidates.push(new WebSpeechEngine(), new ExperimentalMoonshineEngine());

        for (const candidate of candidates) {
            const availability = await candidate.initialize().catch((error) => ({
                available: false,
                kind: candidate.kind,
                message: error instanceof Error ? error.message : 'Speech engine initialization failed.',
            } satisfies SpeechEngineAvailability));

            if (availability.available) {
                this.engine = candidate;
                this.currentAvailability = availability;
                this.initialized = true;
                this.emitAvailability();
                return availability;
            }

            this.currentAvailability = availability;
        }

        this.engine = new UnsupportedSpeechEngine();
        this.currentAvailability = await this.engine.initialize();
        this.initialized = true;
        this.emitAvailability();
        return this.currentAvailability;
    }

    async syncAvailability() {
        if (!this.initialized) {
            await this.initialize();
            return;
        }

        this.emitAvailability();
    }

    async prewarm(options?: SpeechSessionOptions) {
        const sessionOptions = this.requireOptions(options);
        await this.ensureReady();

        if (!this.currentAvailability.available) {
            this.emitError('speech-unavailable', this.currentAvailability.message || 'Speech recognition is unavailable.');
            return false;
        }

        if (this.activeRoundId && this.activeRoundId !== sessionOptions.roundId) {
            await this.abort();
        }

        if (this.activeRoundId === sessionOptions.roundId && this.currentState !== 'idle' && this.currentState !== 'error') {
            return true;
        }

        this.activeRoundId = sessionOptions.roundId;
        this.gateOpen = false;
        this.bufferedSnapshots = [];
        this.setState('prewarming', 'prewarm');

        try {
            await this.engine.startSession(sessionOptions, this.createEngineEvents(sessionOptions.roundId));
            return true;
        } catch (error) {
            this.emitError('speech-prewarm-failed', error instanceof Error ? error.message : 'Speech prewarm failed.');
            this.setState('error', 'prewarm-failed');
            return false;
        }
    }

    async start(options?: SpeechSessionOptions) {
        const sessionOptions = this.requireOptions(options);
        await this.ensureReady();

        if (!this.currentAvailability.available) {
            this.emitError('speech-unavailable', this.currentAvailability.message || 'Speech recognition is unavailable.');
            return;
        }

        if (!this.activeRoundId || this.activeRoundId !== sessionOptions.roundId) {
            const warmed = await this.prewarm(sessionOptions);
            if (!warmed) {
                return;
            }
        }

        if (this.gateOpen && this.activeRoundId === sessionOptions.roundId) {
            return;
        }

        this.activeRoundId = sessionOptions.roundId;
        this.gateOpen = true;
        this.setState('listening', 'gate-open');
        this.flushBufferedSnapshots();
    }

    async stop() {
        if (!this.initialized || !this.activeRoundId) {
            return;
        }

        this.gateOpen = false;
        this.setState('stopping', 'user-stop');
        await this.engine.stopSession().catch((error) => {
            this.emitError('speech-stop-failed', error instanceof Error ? error.message : 'Speech stop failed.');
        });
        this.activeRoundId = null;
        this.bufferedSnapshots = [];
        this.setState('idle', 'user-stop');
    }

    async abort() {
        if (!this.initialized) {
            return;
        }

        this.gateOpen = false;
        this.bufferedSnapshots = [];
        await this.engine.abortSession().catch(() => undefined);
        this.activeRoundId = null;
        this.setState('idle', 'user-abort');
    }

    async dispose() {
        await this.abort();
        await this.engine.dispose().catch(() => undefined);
        this.initialized = false;
    }

    private requireOptions(options?: SpeechSessionOptions) {
        if (!options?.roundId) {
            throw new Error('Speech roundId is required for host-controlled speech.');
        }

        const contextualPhrases = uniqueSpeechPhrases(options.contextualPhrases || []);

        return {
            language: 'en-US',
            partialResults: true,
            silenceMs: 1100,
            prewarmLeadMs: 350,
            ...options,
            contextualPhrases,
        };
    }

    private async ensureReady() {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    private createEngineEvents(roundId: string): SpeechEngineEvents {
        return {
            onStateChange: (state, reason) => {
                if (roundId !== this.activeRoundId) {
                    return;
                }

                if (state === 'idle' && this.gateOpen) {
                    this.setState('idle', reason || 'engine-idle');
                    return;
                }

                if (state === 'prewarming' && this.gateOpen) {
                    this.setState('listening', reason || 'engine-ready');
                    return;
                }

                this.setState(state, reason || 'engine-state');
            },
            onPartial: (snapshot) => {
                if (roundId !== this.activeRoundId) {
                    return;
                }

                this.handleSnapshot(snapshot);
            },
            onFinal: (snapshot) => {
                if (roundId !== this.activeRoundId) {
                    return;
                }

                this.handleSnapshot({ ...snapshot, isFinal: true });
            },
            onError: (code, message) => {
                if (roundId !== this.activeRoundId) {
                    return;
                }

                this.emitError(code, message);
                this.setState('error', code);
            },
            onLevel: (level) => {
                if (roundId !== this.activeRoundId) {
                    return;
                }

                this.postEvent({
                    event: 'level',
                    engine: this.engine.kind,
                    roundId,
                    level,
                });
            },
        };
    }

    private handleSnapshot(snapshot: SpeechTranscriptSnapshot) {
        if (!this.gateOpen) {
            this.bufferedSnapshots.push(snapshot);
            return;
        }

        this.emitSnapshot(snapshot, false);
    }

    private flushBufferedSnapshots() {
        if (!this.gateOpen || !this.bufferedSnapshots.length) {
            return;
        }

        const pending = [...this.bufferedSnapshots];
        this.bufferedSnapshots = [];
        pending.forEach((snapshot) => {
            this.emitSnapshot(snapshot, true);
        });
    }

    private emitSnapshot(snapshot: SpeechTranscriptSnapshot, buffered: boolean) {
        this.postEvent({
            event: snapshot.isFinal ? 'final' : 'partial',
            engine: this.engine.kind,
            roundId: this.activeRoundId,
            matches: snapshot.matches,
            text: snapshot.text,
            buffered,
        });
    }

    private emitAvailability() {
        this.postEvent({
            event: 'availability',
            engine: this.currentAvailability.kind,
            available: this.currentAvailability.available,
            onDevice: this.currentAvailability.onDevice,
            processLocally: this.currentAvailability.processLocally,
            message: this.currentAvailability.message,
            roundId: this.activeRoundId,
        });
    }

    private emitError(code: string, message: string) {
        this.postEvent({
            event: 'error',
            engine: this.engine.kind,
            roundId: this.activeRoundId,
            code,
            message,
        });
    }

    private setState(state: CarKingSpeechState, reason: string) {
        if (this.currentState === state && reason !== 'gate-open') {
            return;
        }

        this.currentState = state;
        this.postEvent({
            event: 'state',
            engine: this.engine.kind,
            roundId: this.activeRoundId,
            state,
            reason,
            message: state === 'listening'
                ? 'Listening... say the car name.'
                : state === 'prewarming'
                    ? 'Get ready... the microphone is opening early.'
                    : state === 'stopping'
                        ? 'Wrapping up your answer.'
                        : state === 'error'
                            ? 'Microphone needs attention.'
                            : 'Microphone ready.',
        });
    }
}
