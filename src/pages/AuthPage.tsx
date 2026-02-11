import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  clearQuickUnlock,
  hasQuickUnlock,
  readQuickUnlockUsername,
  resolveQuickUnlockCredentials,
  saveQuickUnlock,
} from '../utils/quickUnlock';

const formWrapStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
  background: 'var(--color-background)',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  borderRadius: 20,
  padding: '1.25rem 1.25rem 1.1rem',
  background: 'linear-gradient(180deg, #17233e 0%, #12203a 100%)',
  boxShadow: '0 14px 34px rgba(0,0,0,0.28)',
  border: '2px solid rgba(255,255,255,0.08)',
  color: '#f8fafc',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.72rem 0.8rem',
  borderRadius: 12,
  border: '1px solid #d1d5db',
  marginTop: 6,
  marginBottom: 12,
  fontSize: '1rem',
};

const actionBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.72rem 0.8rem',
  borderRadius: 12,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 700,
};

const AuthPage: React.FC = () => {
  const { signIn, signUp, isConfigured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(hasQuickUnlock());
  const [devicePin, setDevicePin] = useState('');
  const [devicePinConfirm, setDevicePinConfirm] = useState('');
  const [quickUnlockPin, setQuickUnlockPin] = useState('');
  const [showQuickUnlock, setShowQuickUnlock] = useState(hasQuickUnlock());
  const [supportsBiometric, setSupportsBiometric] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'PublicKeyCredential' in window;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  React.useEffect(() => {
    const checkPlatformAuth = async () => {
      if (!('PublicKeyCredential' in window)) return;
      const credential = window.PublicKeyCredential as typeof PublicKeyCredential & {
        isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
      };
      if (!credential.isUserVerifyingPlatformAuthenticatorAvailable) return;
      try {
        const available = await credential.isUserVerifyingPlatformAuthenticatorAvailable();
        setSupportsBiometric(available);
      } catch {
        // ignore capability check failures
      }
    };

    checkPlatformAuth();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!usernameOrEmail.trim() || password.length < 6) {
      setError('Please enter a username/email and a password with at least 6 characters.');
      return;
    }

    if (rememberDevice) {
      if (!/^\d{4,8}$/.test(devicePin)) {
        setError('Create a 4 to 8 digit quick passcode to save this device login.');
        return;
      }
      if (devicePin !== devicePinConfirm) {
        setError('Quick passcode and confirmation do not match.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        await signIn(usernameOrEmail, password);
      } else {
        await signUp(usernameOrEmail, password);
        setMessage('Account created. If email confirmations are enabled, please confirm before logging in.');
      }

      if (rememberDevice) {
        await saveQuickUnlock(usernameOrEmail, password, devicePin);
        setShowQuickUnlock(true);
        setMessage(mode === 'signin'
          ? 'Welcome back! Quick Unlock saved for this device. 🎉'
          : 'Account created and quick passcode saved for this device.');
      } else if (hasQuickUnlock()) {
        clearQuickUnlock();
        setShowQuickUnlock(false);
      }
    } catch (err) {
      const status = typeof err === 'object' && err && 'status' in err
        ? Number((err as { status?: unknown }).status)
        : undefined;
      const rawMessage = err instanceof Error ? err.message : 'Authentication failed';
      const lowerMessage = rawMessage.toLowerCase();

      const isRateLimited = status === 429 || lowerMessage.includes('rate limit');

      const nextMessage = isRateLimited
        ? 'Too many signup attempts were made too quickly. Please wait a few minutes, then try again. You can also disable email confirmation in Supabase Auth settings while testing locally.'
        : rawMessage;
      setError(nextMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickUnlock = async () => {
    setError('');
    setMessage('');

    if (!/^\d{4,8}$/.test(quickUnlockPin)) {
      setError('Enter your 4 to 8 digit quick passcode.');
      return;
    }

    setIsSubmitting(true);
    try {
      const credentials = await resolveQuickUnlockCredentials(quickUnlockPin);
      await signIn(credentials.usernameOrEmail, credentials.password);
      setMessage('Unlocked! Welcome back 👋');
      setQuickUnlockPin('');
    } catch (err) {
      const nextMessage = err instanceof Error ? err.message : 'Quick unlock failed.';
      setError(nextMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickUnlockUser = readQuickUnlockUsername();

  return (
    <div style={formWrapStyle}>
      <form style={cardStyle} onSubmit={handleSubmit}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
          <span style={{ fontSize: '1.5rem' }}>🌟</span>
          <h1 style={{ margin: 0 }}>{mode === 'signin' ? 'Welcome Back!' : 'Create Account'}</h1>
        </div>
        <p style={{ marginTop: 6, marginBottom: 16, opacity: 0.9 }}>
          {mode === 'signin'
            ? 'Let’s jump into learning fun!'
            : 'Create your account to save progress and settings.'}
        </p>

        {!isConfigured && (
          <p style={{ color: '#b91c1c', marginBottom: 12 }}>
            Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
          </p>
        )}

        <label htmlFor="usernameOrEmail">Username or Email</label>
        <input
          id="usernameOrEmail"
          style={inputStyle}
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          placeholder="e.g. mom_admin or you@example.com"
          autoComplete="username"
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          style={inputStyle}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        />

        <div style={{ marginBottom: 12, marginTop: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: rememberDevice ? 8 : 0 }}>
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
            />
            Save this device with a quick passcode 🔐
          </label>

          {rememberDevice && (
            <>
              <input
                style={inputStyle}
                type="password"
                value={devicePin}
                onChange={(e) => setDevicePin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Create passcode (4-8 digits)"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
              />
              <input
                style={inputStyle}
                type="password"
                value={devicePinConfirm}
                onChange={(e) => setDevicePinConfirm(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Confirm passcode"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
              />
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={!isConfigured || isSubmitting}
          style={{ ...actionBtnStyle, background: '#f6d365', color: '#10213f' }}
        >
          {isSubmitting ? 'Please wait...' : mode === 'signin' ? '🚀 Sign in' : '✨ Create account'}
        </button>

        <button
          type="button"
          onClick={() => setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'))}
          style={{ width: '100%', marginTop: 10, background: 'transparent', border: 'none', color: '#7dd3fc', cursor: 'pointer' }}
        >
          {mode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
        </button>

        {showQuickUnlock && (
          <div style={{ marginTop: 12, borderRadius: 12, padding: 10, border: '1px dashed rgba(255,255,255,0.35)' }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>⚡ Quick Unlock</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: 8 }}>
              {quickUnlockUser ? `Saved for: ${quickUnlockUser}` : 'Use your passcode to log in fast on this device.'}
            </div>
            <input
              style={inputStyle}
              type="password"
              value={quickUnlockPin}
              onChange={(e) => setQuickUnlockPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="Enter quick passcode"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={handleQuickUnlock}
              disabled={isSubmitting}
              style={{ ...actionBtnStyle, background: '#22d3ee', color: '#052f43' }}
            >
              {supportsBiometric ? '🔓 Unlock (Passcode / Fingerprint-ready device)' : '🔓 Unlock with Passcode'}
            </button>
          </div>
        )}

        {message && <p style={{ color: '#065f46', marginTop: 12 }}>{message}</p>}
        {error && <p style={{ color: '#b91c1c', marginTop: 12 }}>{error}</p>}
      </form>
    </div>
  );
};

export default AuthPage;
