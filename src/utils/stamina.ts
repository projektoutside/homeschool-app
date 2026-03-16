export const STAMINA_MAX_TOTAL = 20;
export const GAME_STAMINA_COST = 1;
export const STAMINA_RECHARGE_INTERVAL_MS = 10 * 60 * 1000;
export const STAMINA_STORAGE_VERSION = 1;

export interface StoredStaminaState {
  version: number;
  available: number;
  updatedAtMs: number;
}

export interface HydratedStaminaState {
  available: number;
  anchorMs: number;
  nextRechargeAtMs: number | null;
}

export const sanitizeStaminaValue = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return STAMINA_MAX_TOTAL;
  }

  return Math.max(0, Math.min(STAMINA_MAX_TOTAL, Math.round(numeric)));
};

export const sanitizeTimestampMs = (value: unknown, fallbackMs = Date.now()): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallbackMs;
  }

  return Math.max(0, Math.round(numeric));
};

export const createDefaultStaminaState = (nowMs = Date.now()): StoredStaminaState => ({
  version: STAMINA_STORAGE_VERSION,
  available: STAMINA_MAX_TOTAL,
  updatedAtMs: sanitizeTimestampMs(nowMs, Date.now()),
});

export const hydrateStaminaState = (
  storedState: StoredStaminaState,
  nowMs = Date.now(),
): HydratedStaminaState => {
  const safeNowMs = sanitizeTimestampMs(nowMs, Date.now());
  const available = sanitizeStaminaValue(storedState.available);
  const updatedAtMs = Math.min(
    sanitizeTimestampMs(storedState.updatedAtMs, safeNowMs),
    safeNowMs,
  );

  if (available >= STAMINA_MAX_TOTAL) {
    return {
      available: STAMINA_MAX_TOTAL,
      anchorMs: updatedAtMs,
      nextRechargeAtMs: null,
    };
  }

  const elapsedMs = Math.max(0, safeNowMs - updatedAtMs);
  const regeneratedPoints = Math.floor(elapsedMs / STAMINA_RECHARGE_INTERVAL_MS);
  const normalizedAvailable = Math.min(STAMINA_MAX_TOTAL, available + regeneratedPoints);

  if (normalizedAvailable >= STAMINA_MAX_TOTAL) {
    return {
      available: STAMINA_MAX_TOTAL,
      anchorMs: safeNowMs,
      nextRechargeAtMs: null,
    };
  }

  const remainderMs = elapsedMs % STAMINA_RECHARGE_INTERVAL_MS;
  const anchorMs = safeNowMs - remainderMs;

  return {
    available: normalizedAvailable,
    anchorMs,
    nextRechargeAtMs: anchorMs + STAMINA_RECHARGE_INTERVAL_MS,
  };
};

export const getSecondsUntilNextRecharge = (
  nextRechargeAtMs: number | null,
  nowMs = Date.now(),
): number => {
  if (!nextRechargeAtMs) {
    return 0;
  }

  const remainingMs = Math.max(0, nextRechargeAtMs - sanitizeTimestampMs(nowMs, Date.now()));
  return Math.ceil(remainingMs / 1000);
};
