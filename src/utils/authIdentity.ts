const getSyntheticEmailDomain = (): string => {
  try {
    const configuredUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!configuredUrl) return 'example.com';

    const host = new URL(configuredUrl).hostname;
    return host || 'example.com';
  } catch {
    return 'example.com';
  }
};

export const usernameOrEmailToSupabaseEmail = (usernameOrEmail: string): string => {
  const normalized = usernameOrEmail.trim().toLowerCase();
  if (normalized.includes('@')) return normalized;

  const usernameOnly = normalized.replace(/[^a-z0-9._-]/g, '');
  const safeLocalPart = usernameOnly || `user-${Date.now()}`;
  return `${safeLocalPart}@${getSyntheticEmailDomain()}`;
};
