import type { CarKingSpeechState, SpeechSessionOptions } from './speechBridge';

export type SpeechEngineKind = 'native' | 'web-speech' | 'moonshine' | 'unsupported';

export interface SpeechTranscriptSnapshot {
    matches: string[];
    text: string;
    isFinal: boolean;
    forced?: boolean;
}

export interface SpeechEngineEvents {
    onStateChange: (state: CarKingSpeechState, reason?: string) => void;
    onPartial: (snapshot: SpeechTranscriptSnapshot) => void;
    onFinal: (snapshot: SpeechTranscriptSnapshot) => void;
    onError: (code: string, message: string) => void;
    onLevel?: (level: number) => void;
}

export interface SpeechEngineAvailability {
    available: boolean;
    kind: SpeechEngineKind;
    onDevice?: boolean;
    processLocally?: boolean;
    message?: string;
}

export interface SpeechEngineController {
    readonly kind: SpeechEngineKind;
    availability: SpeechEngineAvailability;
    initialize(): Promise<SpeechEngineAvailability>;
    startSession(options: SpeechSessionOptions, events: SpeechEngineEvents): Promise<void>;
    stopSession(): Promise<void>;
    abortSession(): Promise<void>;
    dispose(): Promise<void>;
}

export const uniqueSpeechPhrases = (phrases: Array<string | null | undefined>) => {
    const seen = new Set<string>();
    const normalized: string[] = [];

    phrases.forEach((phrase) => {
        const trimmed = `${phrase || ''}`.trim();
        if (!trimmed) {
            return;
        }

        const key = trimmed.toLowerCase();
        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        normalized.push(trimmed);
    });

    return normalized;
};

export const createTranscriptSnapshot = (
    matches: Array<string | null | undefined>,
    text = '',
    isFinal = false,
    forced = false,
): SpeechTranscriptSnapshot => {
    const dedupedMatches = uniqueSpeechPhrases([text, ...matches]);

    return {
        matches: dedupedMatches,
        text: dedupedMatches[0] || `${text || ''}`.trim(),
        isFinal,
        forced,
    };
};

export const isLikelyDesktopDevice = () => {
    if (typeof navigator === 'undefined') {
        return false;
    }

    const touchPoints = navigator.maxTouchPoints || 0;
    const ua = navigator.userAgent || '';
    const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

    return !mobileUa && touchPoints < 2;
};
