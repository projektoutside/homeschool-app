import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasQuickUnlock, resolveQuickUnlockCredentials, saveQuickUnlock } from '../utils/quickUnlock';
import './UserHomePage.css';

const UserHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut, updateHomeLabel, updatePassword, updateUsername } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [homeLabel, setHomeLabel] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [oldPasskey, setOldPasskey] = React.useState('');
  const [newPasskey, setNewPasskey] = React.useState('');
  const [confirmPasskey, setConfirmPasskey] = React.useState('');
  const [statusMessage, setStatusMessage] = React.useState('');
  const [statusError, setStatusError] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    const nextUsername = (user?.user_metadata?.username as string | undefined)?.trim()
      || user?.email?.split('@')[0]
      || '';
    const nextHomeLabel = (user?.user_metadata?.home_label as string | undefined)?.trim()
      || nextUsername;

    setUsername(nextUsername);
    setHomeLabel(nextHomeLabel);
  }, [user]);

  const resetStatus = () => {
    setStatusError('');
    setStatusMessage('');
  };

  const handleSaveHomeLabel = async () => {
    resetStatus();
    setIsSaving(true);
    try {
      await updateHomeLabel(homeLabel);
      setStatusMessage('Home button label updated!');
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to update home label.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveUsername = async () => {
    resetStatus();
    setIsSaving(true);
    try {
      await updateUsername(username);
      setStatusMessage('Username updated!');
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to update username.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePassword = async () => {
    resetStatus();
    if (newPassword !== confirmPassword) {
      setStatusError('Password confirmation does not match.');
      return;
    }

    setIsSaving(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setStatusMessage('Password updated successfully.');
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePasskey = async () => {
    resetStatus();
    if (!hasQuickUnlock()) {
      setStatusError('Quick passkey is not set yet. Please set one during sign in first.');
      return;
    }
    if (!/^\d{4,8}$/.test(newPasskey)) {
      setStatusError('New passkey must be 4 to 8 digits.');
      return;
    }
    if (newPasskey !== confirmPasskey) {
      setStatusError('Passkey confirmation does not match.');
      return;
    }

    setIsSaving(true);
    try {
      const credentials = await resolveQuickUnlockCredentials(oldPasskey);
      await saveQuickUnlock(credentials.usernameOrEmail, credentials.password, newPasskey);
      setOldPasskey('');
      setNewPasskey('');
      setConfirmPasskey('');
      setStatusMessage('Quick passkey updated!');
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to update quick passkey.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    resetStatus();
    setIsSaving(true);
    try {
      await signOut();
      navigate('/auth', { replace: true });
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to sign out.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="user-home-page">
      <section className="user-home-placeholder" aria-label="Homepage status">
        <h1>Homepage still to come...</h1>
      </section>

      <nav className="user-home-bottom-tabs" aria-label="Quick app sections">
        <button type="button" className="user-home-tab-btn" onClick={() => navigate('/apps?tab=games')}>
          <span aria-hidden="true">🎮</span>
          <span>Games</span>
        </button>
        <button type="button" className="user-home-tab-btn" onClick={() => navigate('/apps?tab=worksheets')}>
          <span aria-hidden="true">📄</span>
          <span>Worksheets</span>
        </button>
        <button type="button" className="user-home-tab-btn" onClick={() => navigate('/apps?tab=tools')}>
          <span aria-hidden="true">🧰</span>
          <span>Tools</span>
        </button>
      </nav>

      <button
        type="button"
        className="user-home-settings-btn"
        onClick={() => setIsSettingsOpen(true)}
        aria-label="Open settings"
        title="Settings"
      >
        ⚙️
      </button>

      {isSettingsOpen && (
        <>
          <button
            type="button"
            className="user-home-settings-backdrop"
            aria-label="Close settings"
            onClick={() => setIsSettingsOpen(false)}
          />

          <section className="user-home-settings-panel" aria-label="Settings panel">
            <header className="user-home-settings-header">
              <h2>Settings</h2>
              <button type="button" onClick={() => setIsSettingsOpen(false)} aria-label="Close settings">✕</button>
            </header>

            <div className="settings-tab-label">Account</div>

            <div className="settings-group">
              <label htmlFor="homeLabel">Home button label</label>
              <input
                id="homeLabel"
                value={homeLabel}
                onChange={(e) => setHomeLabel(e.target.value)}
                placeholder="e.g. Xatori"
              />
              <button type="button" onClick={handleSaveHomeLabel} disabled={isSaving}>Save Home Label</button>
            </div>

            <div className="settings-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
              />
              <button type="button" onClick={handleSaveUsername} disabled={isSaving}>Save Username</button>
            </div>

            <div className="settings-group">
              <label htmlFor="newPassword">Change password</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
              <button type="button" onClick={handleSavePassword} disabled={isSaving}>Update Password</button>
            </div>

            <div className="settings-group">
              <label htmlFor="oldPasskey">Change passkey</label>
              <input
                id="oldPasskey"
                type="password"
                value={oldPasskey}
                onChange={(e) => setOldPasskey(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Current passkey"
                inputMode="numeric"
              />
              <input
                type="password"
                value={newPasskey}
                onChange={(e) => setNewPasskey(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="New passkey (4-8 digits)"
                inputMode="numeric"
              />
              <input
                type="password"
                value={confirmPasskey}
                onChange={(e) => setConfirmPasskey(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Confirm new passkey"
                inputMode="numeric"
              />
              <button type="button" onClick={handleSavePasskey} disabled={isSaving}>Update Passkey</button>
            </div>

            <div className="settings-group danger-zone">
              <button type="button" onClick={handleSignOut} disabled={isSaving}>Sign out</button>
            </div>

            {statusMessage && <p className="settings-status success">{statusMessage}</p>}
            {statusError && <p className="settings-status error">{statusError}</p>}
          </section>
        </>
      )}
    </div>
  );
};

export default UserHomePage;
