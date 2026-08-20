export const GAME_POINTS_CONTEXT_MESSAGE = 'LAHS_POINTS_CONTEXT';
export const GAME_POINTS_EARNED_MESSAGE = 'LAHS_POINTS_EARNED';
export const GAME_POINTS_ACK_MESSAGE = 'LAHS_POINTS_ACK';
export const RESERVED_STARS_TOTAL = 0;

export const SINGLE_PLAYER_POINTS_GAME_IDS = new Set<string>([
  'MathPuzzle',
  'preschool-fun-game',
  'word-puzzle-game',
  'math-1768955732393-game',
  'math-quiz-it-polygon',
  'math-car-king',
  'math-analog-clock-game-v2',
  'math-farmers-market-frenzy',
  'states-champion',
  'many-birds-one-stone',
  'animal-champion',
  'defender-champion',
]);

export interface GamePointsContextMessage {
  type: typeof GAME_POINTS_CONTEXT_MESSAGE;
  gameId: string;
  sessionId: string;
  totalPoints: number;
  stars: number;
  userId: string | null;
  isAuthenticated: boolean;
  request?: boolean;
}

export interface GamePointsEarnedMessage {
  type: typeof GAME_POINTS_EARNED_MESSAGE;
  gameId: string;
  sessionId?: string | null;
  eventId: string;
  points: number;
  occurredAt?: string;
  label?: string | null;
  meta?: Record<string, unknown>;
}

export interface GamePointsAckMessage {
  type: typeof GAME_POINTS_ACK_MESSAGE;
  gameId: string;
  sessionId: string;
  eventId: string;
  accepted: boolean;
  totalPoints: number;
  stars: number;
}

export interface PointsAwardInput {
  gameId: string;
  sessionId: string;
  eventId: string;
  points: number;
  occurredAt?: string;
  label?: string | null;
  meta?: Record<string, unknown>;
}

export interface PointsAwardResult {
  accepted: boolean;
  totalPoints: number;
  stars: number;
  reason?: string | null;
}

export const isSinglePlayerPointsGameId = (value: string | null | undefined): value is string => {
  return Boolean(value && SINGLE_PLAYER_POINTS_GAME_IDS.has(value));
};

export const sanitizePointValue = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  return Math.max(0, Math.round(numeric));
};

export const sanitizePointDeltaValue = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return 0;
  }

  return Math.round(numeric);
};

export const normalizeStoredPointTotal = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  return Math.max(0, Math.round(numeric));
};

export const getPointEventKey = (gameId: string, sessionId: string, eventId: string): string => {
  return `${gameId}::${sessionId}::${eventId}`;
};

export const createGamePointsSessionId = (gameId: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${gameId}:${crypto.randomUUID()}`;
  }

  return `${gameId}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};
