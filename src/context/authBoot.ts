export const AUTH_BOOT_TIMEOUT_MS = 3000;
export const AUTH_REFRESH_TIMEOUT_MS = 3000;

interface SessionCandidate {
  user?: unknown;
  expires_at?: number | null;
}

export class AuthBootTimeoutError extends Error {
  constructor(operationLabel: string, timeoutMs: number) {
    super(`${operationLabel} timed out after ${timeoutMs}ms.`);
    this.name = 'AuthBootTimeoutError';
  }
}

export const isUsableSupabaseSession = <TSession extends SessionCandidate>(
  session: TSession | null | undefined,
): session is TSession & { user: NonNullable<TSession['user']> } => {
  if (!session?.user) return false;

  if (typeof session.expires_at === 'number' && session.expires_at * 1000 <= Date.now()) {
    return false;
  }

  return true;
};

export const getSessionAfterRefreshFailure = <TSession extends SessionCandidate>(
  currentSession: TSession | null | undefined,
  error: unknown,
): TSession | null => {
  if (error instanceof AuthBootTimeoutError && isUsableSupabaseSession(currentSession)) {
    return currentSession;
  }

  return null;
};

export const withAuthTimeout = async <TResult>(
  operation: Promise<TResult>,
  timeoutMs: number,
  operationLabel: string,
): Promise<TResult> => {
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeoutId = globalThis.setTimeout(() => {
          reject(new AuthBootTimeoutError(operationLabel, timeoutMs));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      globalThis.clearTimeout(timeoutId);
    }
  }
};
