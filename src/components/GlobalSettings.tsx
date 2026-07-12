import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_SOUND_SETTINGS, useSoundSettings, type SoundSettings } from '../context/SoundSettingsContext';
import { HOME_PAGE_MUSIC_OPTIONS } from '../utils/homePageMusic';
import { hasQuickUnlock, resolveQuickUnlockCredentials, saveQuickUnlock } from '../utils/quickUnlock';
import './GlobalSettings.css';

interface GlobalSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    externalCloseRequestId?: number;
}

type SoundExitIntent = 'close-sound-panel' | 'close-all-settings';

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ isOpen, onClose, externalCloseRequestId = 0 }) => {
    const navigate = useNavigate();
    const { isGuest, user, signOut, updateHomeLabel, updatePassword, updateUsername } = useAuth();
    const {
        settings,
        setMuted,
        setMusicVolume,
        setSfxVolume,
        setHomePageMusicTrack,
        setNatureSoundsMuted,
        setNatureSoundsVolume,
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
    const [soundDraft, setSoundDraft] = useState<SoundSettings>(settings);
    const [soundStatusMessage, setSoundStatusMessage] = useState('');
    const [soundStatusError, setSoundStatusError] = useState('');
    const [isUnsavedSoundPromptOpen, setIsUnsavedSoundPromptOpen] = useState(false);
    const [pendingSoundExitIntent, setPendingSoundExitIntent] = useState<SoundExitIntent | null>(null);
    const [soundBaseline, setSoundBaseline] = useState<SoundSettings | null>(null);
    const lastHandledExternalCloseRequestRef = useRef(externalCloseRequestId);

    // Audio Context Ref
    const audioContextRef = useRef<AudioContext | null>(null);

    const resetStatus = useCallback(() => {
        setStatusError('');
        setStatusMessage('');
    }, []);

    const resetSoundStatus = useCallback(() => {
        setSoundStatusError('');
        setSoundStatusMessage('');
    }, []);

    // Initialize profile/account forms whenever the parent settings menu opens.
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const nextUsername = (user?.user_metadata?.username as string | undefined)?.trim()
        || user?.email?.split('@')[0]
        || '';
        const nextHomeLabel = (user?.user_metadata?.home_label as string | undefined)?.trim()
        || nextUsername;

        setUsername(nextUsername);
        setHomeLabel(nextHomeLabel);
        setPendingSoundExitIntent(null);
        setIsUnsavedSoundPromptOpen(false);
        resetStatus();
        resetSoundStatus();
    }, [isOpen, resetSoundStatus, resetStatus, user]);

    useEffect(() => {
        if (isSoundSettingsOpen) {
            return;
        }
        setSoundDraft(settings);
    }, [isSoundSettingsOpen, settings]);

    const hasSoundDraftChanges = useMemo(() => {
        const baseline = soundBaseline;
        if (!baseline) {
            return false;
        }

        return (
            soundDraft.muted !== baseline.muted
            || soundDraft.musicVolume !== baseline.musicVolume
            || soundDraft.sfxVolume !== baseline.sfxVolume
            || soundDraft.homePageMusicTrack !== baseline.homePageMusicTrack
            || soundDraft.natureSoundsMuted !== baseline.natureSoundsMuted
            || soundDraft.natureSoundsVolume !== baseline.natureSoundsVolume
        );
    }, [soundBaseline, soundDraft]);

    useEffect(() => {
        if (!isSoundSettingsOpen || !hasSoundDraftChanges) {
            return;
        }

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasSoundDraftChanges, isSoundSettingsOpen]);

    const getAudioContext = useCallback((): AudioContext | null => {
        const AudioContextCtor = window.AudioContext
            || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) {
            return null;
        }

        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContextCtor();
        }
        if (audioContextRef.current.state === 'suspended') {
            void audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    const playTestTone = useCallback((type: 'music' | 'sfx', volume: number) => {
        if (soundDraft.muted) return;

        try {
            const ctx = getAudioContext();
            if (!ctx) return;

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
    }, [getAudioContext, soundDraft.muted]);

    const applySoundSettingsToGlobal = useCallback((nextSettings: SoundSettings) => {
        setMuted(nextSettings.muted);
        setMusicVolume(nextSettings.musicVolume);
        setSfxVolume(nextSettings.sfxVolume);
        setHomePageMusicTrack(nextSettings.homePageMusicTrack);
        setNatureSoundsMuted(nextSettings.natureSoundsMuted);
        setNatureSoundsVolume(nextSettings.natureSoundsVolume);
    }, [
        setHomePageMusicTrack,
        setMusicVolume,
        setMuted,
        setNatureSoundsMuted,
        setNatureSoundsVolume,
        setSfxVolume,
    ]);

    // Live preview: apply draft changes immediately while the user adjusts controls.
    useEffect(() => {
        if (!isSoundSettingsOpen || !soundBaseline) {
            return;
        }
        applySoundSettingsToGlobal(soundDraft);
    }, [applySoundSettingsToGlobal, isSoundSettingsOpen, soundBaseline, soundDraft]);

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

    const applySoundDraftToGlobalSettings = useCallback(() => {
        applySoundSettingsToGlobal(soundDraft);
        setSoundStatusError('');
        setSoundStatusMessage('Sound settings saved. These preferences will stay until you change them again.');
    }, [applySoundSettingsToGlobal, soundDraft]);

    const closeSoundSettingsPanelNow = useCallback(() => {
        setIsSoundSettingsOpen(false);
        setSoundBaseline(null);
        setPendingSoundExitIntent(null);
        setIsUnsavedSoundPromptOpen(false);
        resetSoundStatus();
    }, [resetSoundStatus]);

    const closeAllSettingsNow = useCallback(() => {
        setIsAccountSettingsOpen(false);
        setIsSoundSettingsOpen(false);
        setSoundBaseline(null);
        setPendingSoundExitIntent(null);
        setIsUnsavedSoundPromptOpen(false);
        resetSoundStatus();
        onClose();
    }, [onClose, resetSoundStatus]);

    const executeSoundExitIntent = useCallback((intent: SoundExitIntent) => {
        if (intent === 'close-all-settings') {
            closeAllSettingsNow();
            return;
        }
        closeSoundSettingsPanelNow();
    }, [closeAllSettingsNow, closeSoundSettingsPanelNow]);

    const requestSoundExit = useCallback((intent: SoundExitIntent) => {
        if (isSoundSettingsOpen && hasSoundDraftChanges) {
            setPendingSoundExitIntent(intent);
            setIsUnsavedSoundPromptOpen(true);
            return;
        }

        executeSoundExitIntent(intent);
    }, [executeSoundExitIntent, hasSoundDraftChanges, isSoundSettingsOpen]);

    useEffect(() => {
        if (!isOpen) {
            lastHandledExternalCloseRequestRef.current = externalCloseRequestId;
            return;
        }

        if (externalCloseRequestId === lastHandledExternalCloseRequestRef.current) {
            return;
        }

        lastHandledExternalCloseRequestRef.current = externalCloseRequestId;
        requestSoundExit('close-all-settings');
    }, [externalCloseRequestId, isOpen, requestSoundExit]);

    const openSoundSettingsPanel = useCallback(() => {
        setSoundDraft(settings);
        setSoundBaseline(settings);
        setPendingSoundExitIntent(null);
        setIsUnsavedSoundPromptOpen(false);
        resetSoundStatus();
        setIsSoundSettingsOpen(true);
    }, [resetSoundStatus, settings]);

    const handleSaveSoundDraftAndExit = useCallback(() => {
        applySoundDraftToGlobalSettings();
        closeSoundSettingsPanelNow();
    }, [applySoundDraftToGlobalSettings, closeSoundSettingsPanelNow]);

    const handleDiscardSoundDraft = useCallback((showMessage: boolean) => {
        const revertTarget = soundBaseline ?? settings;
        setSoundDraft(revertTarget);
        applySoundSettingsToGlobal(revertTarget);
        setSoundStatusError('');
        setSoundStatusMessage(showMessage ? 'Unsaved sound changes were discarded.' : '');
    }, [applySoundSettingsToGlobal, settings, soundBaseline]);

    const handleExitWithoutSaving = useCallback(() => {
        handleDiscardSoundDraft(false);
        closeSoundSettingsPanelNow();
    }, [closeSoundSettingsPanelNow, handleDiscardSoundDraft]);

    const handleConfirmSaveAndExit = useCallback(() => {
        applySoundDraftToGlobalSettings();
        const intent = pendingSoundExitIntent ?? 'close-sound-panel';
        executeSoundExitIntent(intent);
    }, [applySoundDraftToGlobalSettings, executeSoundExitIntent, pendingSoundExitIntent]);

    const handleConfirmDiscardAndExit = useCallback(() => {
        handleDiscardSoundDraft(false);
        const intent = pendingSoundExitIntent ?? 'close-sound-panel';
        executeSoundExitIntent(intent);
    }, [executeSoundExitIntent, handleDiscardSoundDraft, pendingSoundExitIntent]);

    const handleCancelUnsavedSoundPrompt = useCallback(() => {
        setPendingSoundExitIntent(null);
        setIsUnsavedSoundPromptOpen(false);
    }, []);

    if (!isOpen) return null;

    return (
        <>
            <button
                type="button"
                className="settings-backdrop"
                aria-label="Close settings"
                onClick={() => requestSoundExit('close-all-settings')}
            />

            <section className="settings-panel" aria-label="Settings panel">
                <header className="settings-header">
                    <h2>Settings</h2>
                    <button
                        type="button"
                        onClick={() => requestSoundExit('close-all-settings')}
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
                        onClick={openSoundSettingsPanel}
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

                        {isGuest && (
                            <p className="settings-helper-text">
                                Guest profile changes last only for this play session.
                            </p>
                        )}

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

                        {!isGuest && (
                            <>
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
                            </>
                        )}

                        <div className="settings-group danger-zone">
                            <button type="button" onClick={handleSignOut} disabled={isSaving}>
                                {isGuest ? 'Exit Guest Session' : 'Sign out'}
                            </button>
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
                        onClick={() => requestSoundExit('close-sound-panel')}
                    />
                    <section className="settings-subpanel" aria-label="Sound settings panel">
                        <header className="settings-header">
                            <h2>Sound Settings</h2>
                            <button
                                type="button"
                                onClick={() => requestSoundExit('close-sound-panel')}
                                aria-label="Close sound settings"
                            >
                                ✕
                            </button>
                        </header>

                        <p className={`settings-draft-note ${hasSoundDraftChanges ? 'pending' : 'saved'}`} role="status" aria-live="polite">
                            {hasSoundDraftChanges
                                ? 'You are previewing unsaved sound changes live. Use Save Sound Settings and Exit to keep them permanently.'
                                : 'All sound settings are currently saved.'}
                        </p>

                        <div className="settings-group">
                            <label className="settings-toggle-label" htmlFor="globalMuteToggle">
                                <span>Mute all app sound</span>
                                <input
                                    id="globalMuteToggle"
                                    type="checkbox"
                                    checked={soundDraft.muted}
                                    onChange={(e) => setSoundDraft(prev => ({ ...prev, muted: e.target.checked }))}
                                />
                            </label>
                            <p className="settings-helper-text">
                                This setting overrides audio in games, worksheets, and tools.
                                Changes preview in real time. Save to keep them permanently.
                            </p>
                        </div>

                        <div className="settings-group">
                            <label htmlFor="musicVolumeRange">Global music volume: {soundDraft.musicVolume}%</label>
                            <input
                                id="musicVolumeRange"
                                type="range"
                                min={0}
                                max={100}
                                value={soundDraft.musicVolume}
                                onChange={(e) => setSoundDraft(prev => ({ ...prev, musicVolume: Number(e.target.value) }))}
                                onMouseUp={() => playTestTone('music', soundDraft.musicVolume)}
                                onTouchEnd={() => playTestTone('music', soundDraft.musicVolume)}
                                disabled={soundDraft.muted}
                            />
                        </div>

                        <div className="settings-group">
                            <label htmlFor="homePageMusicSelect">Homepage character music</label>
                            <select
                                id="homePageMusicSelect"
                                value={soundDraft.homePageMusicTrack}
                                onChange={(e) => setSoundDraft(prev => ({ ...prev, homePageMusicTrack: e.target.value }))}
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
                                    checked={soundDraft.natureSoundsMuted}
                                    onChange={(e) => setSoundDraft(prev => ({ ...prev, natureSoundsMuted: e.target.checked }))}
                                />
                            </label>
                            <label htmlFor="natureSoundsVolumeRange">Nature Sounds volume: {soundDraft.natureSoundsVolume}%</label>
                            <input
                                id="natureSoundsVolumeRange"
                                type="range"
                                min={0}
                                max={100}
                                value={soundDraft.natureSoundsVolume}
                                onChange={(e) => setSoundDraft(prev => ({ ...prev, natureSoundsVolume: Number(e.target.value) }))}
                                disabled={soundDraft.muted || soundDraft.natureSoundsMuted}
                            />
                            <p className="settings-helper-text">Applies only on the Homepage tab. It fades out when you leave Home.</p>
                        </div>

                        <div className="settings-group">
                            <label htmlFor="sfxVolumeRange">Global effects volume: {soundDraft.sfxVolume}%</label>
                            <input
                                id="sfxVolumeRange"
                                type="range"
                                min={0}
                                max={100}
                                value={soundDraft.sfxVolume}
                                onChange={(e) => setSoundDraft(prev => ({ ...prev, sfxVolume: Number(e.target.value) }))}
                                onMouseUp={() => playTestTone('sfx', soundDraft.sfxVolume)}
                                onTouchEnd={() => playTestTone('sfx', soundDraft.sfxVolume)}
                                disabled={soundDraft.muted}
                            />
                        </div>

                        <div className="settings-group settings-group-actions">
                            <p className="settings-helper-text">
                                Changes apply as live preview immediately. Save makes the current preview permanent on this device.
                            </p>
                            <div className="settings-action-row">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSoundDraft(DEFAULT_SOUND_SETTINGS);
                                        setSoundStatusError('');
                                        setSoundStatusMessage('Preview reset to default sound values. Select Save Sound Settings and Exit to keep these values.');
                                    }}
                                >
                                    Reset Draft to Defaults
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExitWithoutSaving}
                                    disabled={!hasSoundDraftChanges}
                                >
                                    Exit without Saving
                                </button>
                                <button
                                    type="button"
                                    className="settings-save-primary"
                                    onClick={handleSaveSoundDraftAndExit}
                                    disabled={!hasSoundDraftChanges}
                                >
                                    Save Sound Settings and Exit
                                </button>
                            </div>
                        </div>

                        {soundStatusMessage && <p className="settings-status success">{soundStatusMessage}</p>}
                        {soundStatusError && <p className="settings-status error">{soundStatusError}</p>}
                    </section>
                </>
            )}

            {isUnsavedSoundPromptOpen && (
                <>
                    <button
                        type="button"
                        className="settings-confirm-backdrop"
                        aria-label="Close save confirmation dialog"
                        onClick={handleCancelUnsavedSoundPrompt}
                    />
                    <section className="settings-confirm-dialog" role="dialog" aria-modal="true" aria-label="Unsaved sound changes">
                        <h3>Unsaved Sound Changes</h3>
                        <p>
                            You changed sound settings but have not saved yet.
                            Choose Save and Exit to keep them, or Discard to leave without saving.
                        </p>
                        <div className="settings-confirm-actions">
                            <button type="button" className="confirm-secondary" onClick={handleCancelUnsavedSoundPrompt}>
                                Keep Editing
                            </button>
                            <button type="button" className="confirm-danger" onClick={handleConfirmDiscardAndExit}>
                                Discard Changes
                            </button>
                            <button type="button" className="confirm-primary" onClick={handleConfirmSaveAndExit}>
                                Save and Exit
                            </button>
                        </div>
                    </section>
                </>
            )}
        </>
    );
};
