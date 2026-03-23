import type { User } from '@supabase/supabase-js';

const MANAGER_ENV_ALLOWLIST = String(import.meta.env.VITE_3DCLASS_MANAGER_ALLOWLIST ?? '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter((entry) => entry.length > 0);

export type ManagerAccessSource = 'metadata' | 'allowlist' | null;

export interface ManagerAccessState {
  hasAccess: boolean;
  accessSource: ManagerAccessSource;
  hasManagerMetadataClaims: boolean;
  allowlistConfigured: boolean;
  matchedAllowlistIdentity: string | null;
  evaluatedIdentities: string[];
  denialReason: 'unauthenticated' | 'missing-manager-claim' | null;
}

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

  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>;
  if (
    toBooleanLike(appMetadata.is_manager)
    || toBooleanLike(appMetadata.isManager)
    || toBooleanLike(appMetadata.manager)
    || isManagerRole(appMetadata.role)
  ) {
    return true;
  }

  return false;
};

const getIdentityTokens = (user: User | null): string[] => {
  if (!user) {
    return [];
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>;
  const rawTokens = [
    user.id,
    user.email ?? '',
    getUsername(user),
    typeof metadata.email === 'string' ? metadata.email : '',
    typeof metadata.username === 'string' ? metadata.username : '',
    typeof appMetadata.email === 'string' ? appMetadata.email : '',
    typeof appMetadata.username === 'string' ? appMetadata.username : '',
  ];

  return Array.from(new Set(
    rawTokens
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0),
  ));
};

export const getManagerAccessState = (user: User | null): ManagerAccessState => {
  if (!user) {
    return {
      hasAccess: false,
      accessSource: null,
      hasManagerMetadataClaims: false,
      allowlistConfigured: MANAGER_ENV_ALLOWLIST.length > 0,
      matchedAllowlistIdentity: null,
      evaluatedIdentities: [],
      denialReason: 'unauthenticated',
    };
  }

  const hasMetadataClaims = hasManagerMetadataClaims(user);
  const evaluatedIdentities = getIdentityTokens(user);
  const matchedAllowlistIdentity = MANAGER_ENV_ALLOWLIST.length === 0
    ? null
    : evaluatedIdentities.find((entry) => MANAGER_ENV_ALLOWLIST.includes(entry)) ?? null;

  if (hasMetadataClaims) {
    return {
      hasAccess: true,
      accessSource: 'metadata',
      hasManagerMetadataClaims: true,
      allowlistConfigured: MANAGER_ENV_ALLOWLIST.length > 0,
      matchedAllowlistIdentity,
      evaluatedIdentities,
      denialReason: null,
    };
  }

  if (matchedAllowlistIdentity) {
    return {
      hasAccess: true,
      accessSource: 'allowlist',
      hasManagerMetadataClaims: false,
      allowlistConfigured: true,
      matchedAllowlistIdentity,
      evaluatedIdentities,
      denialReason: null,
    };
  }

  return {
    hasAccess: false,
    accessSource: null,
    hasManagerMetadataClaims: false,
    allowlistConfigured: MANAGER_ENV_ALLOWLIST.length > 0,
    matchedAllowlistIdentity: null,
    evaluatedIdentities,
    denialReason: 'missing-manager-claim',
  };
};

export const isManagerUser = (user: User | null): boolean => getManagerAccessState(user).hasAccess;
