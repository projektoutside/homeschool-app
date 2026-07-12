import type { User } from '@supabase/supabase-js';

const GUEST_SESSION_STORAGE_KEY = 'lahs.guest-session.v1';
const GUEST_PROFILE_STORAGE_KEY = 'lahs.guest-profile.v1';
const STORAGE_TEST_KEY = 'lahs.guest-storage-test';

export const GUEST_USER_ID = 'local-guest-device';

export interface GuestProfile {
  id: string;
  username: string;
  homeLabel: string;
  createdAt: string;
  updatedAt: string;
}

interface GuestSessionState {
  active: boolean;
  userId: string;
  startedAt: string;
}

const DEFAULT_GUEST_USERNAME = 'Guest Learner';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const assertBrowserStorageAvailable = (): void => {
  if (typeof window === 'undefined') {
    throw new Error('Guest mode is only available in the browser.');
  }

  try {
    window.sessionStorage.setItem(STORAGE_TEST_KEY, '1');
    window.sessionStorage.removeItem(STORAGE_TEST_KEY);
  } catch {
    throw new Error('This browser is blocking temporary storage, so guest play cannot start.');
  }
};

const readJson = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown): void => {
  window.sessionStorage.setItem(key, JSON.stringify(value));
};

const sanitizeProfile = (value: unknown): GuestProfile | null => {
  if (!isRecord(value)) return null;

  const id = typeof value.id === 'string' && value.id.trim() ? value.id.trim() : GUEST_USER_ID;
  const username = typeof value.username === 'string' && value.username.trim()
    ? value.username.trim()
    : DEFAULT_GUEST_USERNAME;
  const homeLabel = typeof value.homeLabel === 'string' && value.homeLabel.trim()
    ? value.homeLabel.trim()
    : username;
  const createdAt = typeof value.createdAt === 'string' && value.createdAt.trim()
    ? value.createdAt.trim()
    : new Date().toISOString();
  const updatedAt = typeof value.updatedAt === 'string' && value.updatedAt.trim()
    ? value.updatedAt.trim()
    : createdAt;

  return {
    id,
    username,
    homeLabel,
    createdAt,
    updatedAt,
  };
};

const createDefaultGuestProfile = (): GuestProfile => {
  const now = new Date().toISOString();
  return {
    id: GUEST_USER_ID,
    username: DEFAULT_GUEST_USERNAME,
    homeLabel: DEFAULT_GUEST_USERNAME,
    createdAt: now,
    updatedAt: now,
  };
};

const readGuestProfile = (): GuestProfile | null => {
  return sanitizeProfile(readJson<unknown>(GUEST_PROFILE_STORAGE_KEY));
};

const getOrCreateGuestProfile = (): GuestProfile => {
  const existingProfile = readGuestProfile();
  if (existingProfile) return existingProfile;

  const profile = createDefaultGuestProfile();
  writeJson(GUEST_PROFILE_STORAGE_KEY, profile);
  return profile;
};

export const createGuestUser = (profile: GuestProfile): User => {
  return {
    id: profile.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: undefined,
    phone: '',
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
    app_metadata: {
      provider: 'local_guest',
      providers: ['local_guest'],
      is_guest: true,
    },
    user_metadata: {
      username: profile.username,
      home_label: profile.homeLabel,
      is_guest: true,
    },
    identities: [],
  } as User;
};

export const isGuestUser = (user: Pick<User, 'id' | 'app_metadata'> | null | undefined): boolean => {
  if (!user) return false;
  return user.id === GUEST_USER_ID || user.app_metadata?.provider === 'local_guest' || user.app_metadata?.is_guest === true;
};

export const readActiveGuestUser = (): User | null => {
  const sessionState = readJson<GuestSessionState>(GUEST_SESSION_STORAGE_KEY);
  if (!sessionState?.active || sessionState.userId !== GUEST_USER_ID) {
    return null;
  }

  try {
    assertBrowserStorageAvailable();
    return createGuestUser(getOrCreateGuestProfile());
  } catch {
    return null;
  }
};

export const startGuestSession = (): User => {
  assertBrowserStorageAvailable();
  window.localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
  window.localStorage.removeItem(GUEST_PROFILE_STORAGE_KEY);
  const profile = getOrCreateGuestProfile();
  writeJson(GUEST_SESSION_STORAGE_KEY, {
    active: true,
    userId: profile.id,
    startedAt: new Date().toISOString(),
  } satisfies GuestSessionState);
  return createGuestUser(profile);
};

export const clearGuestSession = (): void => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(GUEST_PROFILE_STORAGE_KEY);
    window.localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
    window.localStorage.removeItem(GUEST_PROFILE_STORAGE_KEY);
  } catch {
    // Ignore sign-out storage failures; route guards will fall back to no guest session.
  }
};

export const updateGuestProfile = (patch: Partial<Pick<GuestProfile, 'username' | 'homeLabel'>>): User => {
  assertBrowserStorageAvailable();
  const currentProfile = getOrCreateGuestProfile();
  const username = patch.username?.trim() || currentProfile.username;
  const homeLabel = patch.homeLabel?.trim() || currentProfile.homeLabel || username;
  const nextProfile: GuestProfile = {
    ...currentProfile,
    username,
    homeLabel,
    updatedAt: new Date().toISOString(),
  };

  writeJson(GUEST_PROFILE_STORAGE_KEY, nextProfile);
  return createGuestUser(nextProfile);
};
