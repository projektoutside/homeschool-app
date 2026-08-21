export const CAR_KING_SPEECH_CONTROL = 'LAHS_CAR_KING_SPEECH_CONTROL';
export const CAR_KING_SPEECH_EVENT = 'LAHS_CAR_KING_SPEECH_EVENT';
export const CAR_KING_GAME_ID = 'math-car-king';
export const ANIMAL_CHAMPION_SPEECH_CONTROL = 'LAHS_ANIMAL_CHAMPION_SPEECH_CONTROL';
export const ANIMAL_CHAMPION_SPEECH_EVENT = 'LAHS_ANIMAL_CHAMPION_SPEECH_EVENT';
export const ANIMAL_CHAMPION_GAME_ID = 'animal-champion';

export type CarKingSpeechCommand = 'prewarm' | 'start' | 'stop' | 'abort';
export type CarKingSpeechEventType = 'availability' | 'state' | 'level' | 'partial' | 'final' | 'error';
export type CarKingSpeechState = 'idle' | 'prewarming' | 'listening' | 'stopping' | 'error';

export interface SpeechSessionOptions {
    roundId: string;
    language?: string;
    contextualPhrases?: string[];
    partialResults?: boolean;
    silenceMs?: number;
    prewarmLeadMs?: number;
    continuousHotMic?: boolean;
    keepAlive?: boolean;
}

export interface CarKingSpeechControlMessage {
    type: typeof CAR_KING_SPEECH_CONTROL;
    gameId: typeof CAR_KING_GAME_ID;
    command: CarKingSpeechCommand;
    options?: SpeechSessionOptions;
}

export interface CarKingSpeechEventMessage {
    type: typeof CAR_KING_SPEECH_EVENT;
    gameId: typeof CAR_KING_GAME_ID;
    event: CarKingSpeechEventType;
    engine?: string;
    available?: boolean;
    onDevice?: boolean;
    processLocally?: boolean;
    roundId?: string | null;
    state?: CarKingSpeechState;
    reason?: string;
    message?: string;
    code?: string;
    level?: number;
    matches?: string[];
    text?: string;
    buffered?: boolean;
}

export interface AnimalChampionSpeechControlMessage {
    type: typeof ANIMAL_CHAMPION_SPEECH_CONTROL;
    gameId: typeof ANIMAL_CHAMPION_GAME_ID;
    command: CarKingSpeechCommand;
    options?: SpeechSessionOptions;
}

export interface AnimalChampionSpeechEventMessage {
    type: typeof ANIMAL_CHAMPION_SPEECH_EVENT;
    gameId: typeof ANIMAL_CHAMPION_GAME_ID;
    event: CarKingSpeechEventType;
    engine?: string;
    available?: boolean;
    onDevice?: boolean;
    processLocally?: boolean;
    roundId?: string | null;
    state?: CarKingSpeechState;
    reason?: string;
    message?: string;
    code?: string;
    level?: number;
    matches?: string[];
    text?: string;
    buffered?: boolean;
}

export const isCarKingSpeechControlMessage = (value: unknown): value is CarKingSpeechControlMessage => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const message = value as Partial<CarKingSpeechControlMessage>;
    return (
        message.type === CAR_KING_SPEECH_CONTROL
        && message.gameId === CAR_KING_GAME_ID
        && typeof message.command === 'string'
    );
};

export const createCarKingSpeechEvent = (
    message: Omit<CarKingSpeechEventMessage, 'type' | 'gameId'>,
): CarKingSpeechEventMessage => {
    return {
        type: CAR_KING_SPEECH_EVENT,
        gameId: CAR_KING_GAME_ID,
        ...message,
    };
};

export const isAnimalChampionSpeechControlMessage = (
    value: unknown,
): value is AnimalChampionSpeechControlMessage => {
    if (!value || typeof value !== 'object') return false;
    const message = value as Partial<AnimalChampionSpeechControlMessage>;
    return (
        message.type === ANIMAL_CHAMPION_SPEECH_CONTROL
        && message.gameId === ANIMAL_CHAMPION_GAME_ID
        && typeof message.command === 'string'
    );
};

export const createAnimalChampionSpeechEvent = (
    message: Omit<AnimalChampionSpeechEventMessage, 'type' | 'gameId'>,
): AnimalChampionSpeechEventMessage => ({
    type: ANIMAL_CHAMPION_SPEECH_EVENT,
    gameId: ANIMAL_CHAMPION_GAME_ID,
    ...message,
});
