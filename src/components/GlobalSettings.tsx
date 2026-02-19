import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSoundSettings } from '../context/SoundSettingsContext';
import { HOME_PAGE_MUSIC_OPTIONS } from '../utils/homePageMusic';
import { hasQuickUnlock, resolveQuickUnlockCredentials, saveQuickUnlock } from '../utils/quickUnlock';
import './GlobalSettings.css';

interface GlobalSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { user, signOut, updateHomeLabel, updatePassword, updateUsername } = useAuth();
    const {
        settings,
        setMuted,
        setMusicVolume,
        setSfxVolume,
        setHomePageMusicTrack,
        setNatureSoundsMuted,
        setNatureSoundsVolume,
        resetSoundSettings,
    } = useSoundSettings();

    const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
    const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState(false);
    
    // Form States
    const [homeLabel, setHomeLabel] = useState('');
    const [username, setUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [oldPasskey, setOldPasskey] = useState('');
    const [newPasskey, setNewPasskey] = useState('');
    const [confirmPasskey, setConfirmPasskey] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [statusError, setStatusError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Audio Context Ref
    const audioContextRef = useRef<AudioContext | null>(null);

    // Initialize logic
    useEffect(() => {
        if (isOpen) {
            const nextUsername = (user?.user_metadata?.username as string | undefined)?.trim()
            || user?.email?.split('@')[0]
            || '';
            const nextHomeLabel = (user?.user_metadata?.home_label as string | undefined)?.trim()
            || nextUsername;

            setUsername(nextUsername);
            setHomeLabel(nextHomeLabel);
            resetStatus();
        }
    }, [isOpen, user]);

    const resetStatus = () => {
        setStatusError('');
        setStatusMessage('');
    };

    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    const playTestTone = useCallback((type: 'music' | 'sfx', volume: number) => {
        if (settings.muted) return;
        
        try {
            const ctx = getAudioContext();
            const gainNode = ctx.createGain();
            const osc = ctx.createOscillator();
            
            // Convert 0-100 to 0-1 gain (logarithmic perception approximation)
            const normalizedVol = Math.pow(volume / 100, 2);
            
            gainNode.gain.setValueAtTime(normalizedVol, ctx.currentTime);
            gainNode.connect(ctx.destination);

            if (type === 'music') {
                // Play a pleasant major chord arpeggio for music test
                const now = ctx.currentTime;
                
                // Root
                const osc1 = ctx.createOscillator();
                osc1.type = 'sine';
                osc1.frequency.value = 261.63; // C4
                osc1.connect(gainNode);
                osc1.start(now);
                osc1.stop(now + 0.3);

                // Third
                const osc2 = ctx.createOscillator();
                osc2.type = 'sine';
                osc2.frequency.value = 329.63; // E4
                osc2.connect(gainNode);
                osc2.start(now + 0.1);
                osc2.stop(now + 0.4);

                // Fifth
                const osc3 = ctx.createOscillator();
                osc3.type = 'sine';
                osc3.frequency.value = 392.00; // G4
                osc3.connect(gainNode);
                osc3.start(now + 0.2);
                osc3.stop(now + 0.6);
                
                // Fade out
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            } else {
                // Play a "blip" sound for SFX
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
                osc.connect(gainNode);
                osc.start();
                osc.stop(ctx.currentTime + 0.15);
                
                // Quick fade
                gainNode.gain.setValueAtTime(normalizedVol, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            }
        } catch (e) {
            console.error('Audio playback failed', e);
        }
    }, [getAudioContext, settings.muted]);

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

    if (!isOpen) return null;

    return (
        <>
            <button
                type="button"
                className="settings-backdrop"
                aria-label="Close settings"
                onClick={onClose}
            />

            <section className="settings-panel" aria-label="Settings panel">
                <header className="settings-header">
                    <h2>Settings</h2>
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            setIsAccountSettingsOpen(false);
                            setIsSoundSettingsOpen(false);
                        }}
                        aria-label="Close settings"
                    >
                        ✕
                    </button>
                </header>

                <div className="settings-menu-list" aria-label="Settings categories">
                    <button
                        type="button"
                        className="settings-menu-btn"
                        onClick={() => setIsAccountSettingsOpen(true)}
                    >
                        Account Settings
                    </button>
                    <button
                        type="button"
                        className="settings-menu-btn"
                        onClick={() => setIsSoundSettingsOpen(true)}
                    >
                        Sound Settings
                    </button>
                </div>
            </section>

            {isAccountSettingsOpen && (
                <>
                    <button
                        type="button"
                        className="settings-sub-backdrop"
                        aria-label="Close account settings"
                        onClick={() => setIsAccountSettingsOpen(false)}
                    />
                    <section className="settings-subpanel" aria-label="Account settings panel">
                        <header className="settings-header">
                            <h2>Account Settings</h2>
                            <button type="button" onClick={() => setIsAccountSettingsOpen(false)} aria-label="Close account settings">✕</button>
                        </header>

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

            {isSoundSettingsOpen && (
                <>
                    <button
                        type="button"
                        className="settings-sub-backdrop"
                        aria-label="Close sound settings"
                        onClick={() => setIsSoundSettingsOpen(false)}
                    />
                    <section className="settings-subpanel" aria-label="Sound settings panel">
                        <header className="settings-header">
                            <h2>Sound Settings</h2>
                            <button type="button" onClick={() => setIsSoundSettingsOpen(false)} aria-label="Close sound settings">✕</button>
                        </header>

                        <div className="settings-group">
                            <label className="settings-toggle-label" htmlFor="globalMuteToggle">
                                <span>Mute all app sound</span>
                                <input
                                    id="globalMuteToggle"
                                    type="checkbox"
                                    checked={settings.muted}
                                    onChange={(e) => setMuted(e.target.checked)}
                                />
                            </label>
                            <p className="settings-helper-text">This setting overrides audio in games, worksheets, and tools.</p>
                        </div>

                        <div className="settings-group">
                            <label htmlFor="musicVolumeRange">Global music volume: {settings.musicVolume}%</label>
                            <input
                                id="musicVolumeRange"
                                type="range"
                                min={0}
                                max={100}
                                value={settings.musicVolume}
                                onChange={(e) => setMusicVolume(Number(e.target.value))}
                                onMouseUp={() => playTestTone('music', settings.musicVolume)}
                                onTouchEnd={() => playTestTone('music', settings.musicVolume)}
                                disabled={settings.muted}
                            />
                        </div>

                        <div className="settings-group">
                            <label htmlFor="homePageMusicSelect">Homepage character music</label>
                            <select
                                id="homePageMusicSelect"
                                value={settings.homePageMusicTrack}
                                onChange={(e) => setHomePageMusicTrack(e.target.value)}
                            >
                                {HOME_PAGE_MUSIC_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <p className="settings-helper-text">Applies only to the Homepage tab while viewing your character.</p>
                        </div>

                        <div className="settings-group">
                            <label htmlFor="natureSoundsMuteToggle">Nature Sounds</label>
                            <label className="settings-toggle-label" htmlFor="natureSoundsMuteToggle">
                                <span>Mute Nature Sounds</span>
                                <input
                                    id="natureSoundsMuteToggle"
                                    type="checkbox"
                                    checked={settings.natureSoundsMuted}
                                    onChange={(e) => setNatureSoundsMuted(e.target.checked)}
                                />
                            </label>
                            <label htmlFor="natureSoundsVolumeRange">Nature Sounds volume: {settings.natureSoundsVolume}%</label>
                            <input
                                id="natureSoundsVolumeRange"
                                type="range"
                                min={0}
                                max={100}
                                value={settings.natureSoundsVolume}
                                onChange={(e) => setNatureSoundsVolume(Number(e.target.value))}
                                disabled={settings.muted || settings.natureSoundsMuted}
                            />
                            <p className="settings-helper-text">Applies only on the Homepage tab. It fades out when you leave Home.</p>
                        </div>

                        <div className="settings-group">
                            <label htmlFor="sfxVolumeRange">Global effects volume: {settings.sfxVolume}%</label>
                            <input
                                id="sfxVolumeRange"
                                type="range"
                                min={0}
                                max={100}
                                value={settings.sfxVolume}
                                onChange={(e) => setSfxVolume(Number(e.target.value))}
                                onMouseUp={() => playTestTone('sfx', settings.sfxVolume)}
                                onTouchEnd={() => playTestTone('sfx', settings.sfxVolume)}
                                disabled={settings.muted}
                            />
                            <button type="button" onClick={resetSoundSettings}>Reset Sound Defaults</button>
                        </div>
                    </section>
                </>
            )}
        </>
    );
};
