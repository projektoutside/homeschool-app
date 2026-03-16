import type { User } from '@supabase/supabase-js';

const MANAGER_ENV_ALLOWLIST = String(import.meta.env.VITE_3DCLASS_MANAGER_ALLOWLIST ?? '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter((entry) => entry.length > 0);

const toBooleanLike = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
  }
  return false;
};

const isManagerRole = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'manager' || normalized === 'admin' || normalized === 'owner';
};

export const getUsername = (user: User | null): string => {
  if (!user) return '';

  const fromMetadata = user.user_metadata?.username;
  if (typeof fromMetadata === 'string' && fromMetadata.trim().length > 0) {
    return fromMetadata.trim();
  }

  const email = user.email ?? '';
  if (email.includes('@')) {
    const local = email.split('@')[0];
    return local && local.trim().length > 0 ? local : user.id;
  }

  return user.id;
};

export const hasManagerMetadataClaims = (user: User | null): boolean => {
  if (!user) return false;

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>;
  if (toBooleanLike(metadata.is_manager) || toBooleanLike(metadata.isManager) || toBooleanLike(metadata.manager)) {
    return true;
  }

  if (
    isManagerRole(metadata.role)
    || toBooleanLike(appMetadata.is_manager)
    || toBooleanLike(appMetadata.isManager)
    || toBooleanLike(appMetadata.manager)
    || isManagerRole(appMetadata.role)
  ) {
    return true;
  }

  return false;
};

export const isManagerUser = (user: User | null): boolean => {
  if (!user) return false;

  if (hasManagerMetadataClaims(user)) {
    return true;
  }

  if (MANAGER_ENV_ALLOWLIST.length === 0) {
    return false;
  }

  const identityTokens = [user.id, user.email ?? '', getUsername(user)]
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

  return identityTokens.some((entry) => MANAGER_ENV_ALLOWLIST.includes(entry));
};
