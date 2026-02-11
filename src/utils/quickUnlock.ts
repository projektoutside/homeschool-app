const QUICK_UNLOCK_KEY = 'homeschool_quick_unlock_v1';
const ITERATIONS = 120000;

interface StoredQuickUnlock {
  usernameOrEmail: string;
  cipherTextB64: string;
  ivB64: string;
  saltB64: string;
  iterations: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
};

const toB64 = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
};

const fromB64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const deriveAesKey = async (pin: string, salt: Uint8Array, iterations = ITERATIONS): Promise<CryptoKey> => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

export const hasQuickUnlock = (): boolean => {
  return Boolean(localStorage.getItem(QUICK_UNLOCK_KEY));
};

export const clearQuickUnlock = (): void => {
  localStorage.removeItem(QUICK_UNLOCK_KEY);
};

export const saveQuickUnlock = async (usernameOrEmail: string, password: string, pin: string): Promise<void> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(pin, salt);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(password),
  );

  const payload: StoredQuickUnlock = {
    usernameOrEmail,
    cipherTextB64: toB64(new Uint8Array(cipherBuffer)),
    ivB64: toB64(iv),
    saltB64: toB64(salt),
    iterations: ITERATIONS,
  };

  localStorage.setItem(QUICK_UNLOCK_KEY, JSON.stringify(payload));
};

export const readQuickUnlockUsername = (): string | null => {
  const raw = localStorage.getItem(QUICK_UNLOCK_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredQuickUnlock>;
    return typeof parsed.usernameOrEmail === 'string' ? parsed.usernameOrEmail : null;
  } catch {
    return null;
  }
};

export const resolveQuickUnlockCredentials = async (pin: string): Promise<{ usernameOrEmail: string; password: string }> => {
  const raw = localStorage.getItem(QUICK_UNLOCK_KEY);
  if (!raw) {
    throw new Error('Quick unlock is not configured on this device yet.');
  }

  const payload = JSON.parse(raw) as StoredQuickUnlock;
  const salt = fromB64(payload.saltB64);
  const iv = fromB64(payload.ivB64);
  const cipherText = fromB64(payload.cipherTextB64);

  try {
    const key = await deriveAesKey(pin, salt, payload.iterations || ITERATIONS);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(cipherText),
    );

    return {
      usernameOrEmail: payload.usernameOrEmail,
      password: decoder.decode(plainBuffer),
    };
  } catch {
    throw new Error('Incorrect passcode. Try again.');
  }
};
