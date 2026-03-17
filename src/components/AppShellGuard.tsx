import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { usePWA } from '../hooks/usePWA';
import './AppShellGuard.css';

type GuardHistoryState = History['state'] & {
    __lahsExitGuard?: boolean;
    __lahsExitSentinel?: boolean;
};

const buildGuardState = (baseState: History['state'], isSentinel: boolean): GuardHistoryState => ({
    ...(typeof baseState === 'object' && baseState !== null ? baseState : {}),
    __lahsExitGuard: true,
    __lahsExitSentinel: isSentinel,
});

export const AppShellGuard: React.FC = () => {
    const location = useLocation();
    const { isAndroid, isStandaloneShell } = usePWA();
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showClosedFallback, setShowClosedFallback] = useState(false);
    const sentinelInitializedRef = useRef(false);
    const exitAttemptTimeoutRef = useRef<number | null>(null);

    const isEnabled = isAndroid && isStandaloneShell;

    const pushActiveGuardState = useCallback(() => {
        const currentState = window.history.state as History['state'];
        window.history.pushState(buildGuardState(currentState, false), '', window.location.href);
    }, []);

    useEffect(() => {
        if (!isEnabled) {
            sentinelInitializedRef.current = false;
            if (exitAttemptTimeoutRef.current !== null) {
                window.clearTimeout(exitAttemptTimeoutRef.current);
                exitAttemptTimeoutRef.current = null;
            }
            return;
        }

        if (sentinelInitializedRef.current) {
            return;
        }

        const currentState = window.history.state as History['state'];
        window.history.replaceState(buildGuardState(currentState, true), '', window.location.href);
        window.history.pushState(buildGuardState(currentState, false), '', window.location.href);
        sentinelInitializedRef.current = true;
    }, [isEnabled]);

    useEffect(() => {
        if (!isEnabled) {
            return;
        }

        const handlePopState = (event: PopStateEvent) => {
            const state = event.state as GuardHistoryState | null;
            if (!state?.__lahsExitGuard || !state.__lahsExitSentinel) {
                return;
            }

            setShowClosedFallback(false);
            setShowExitConfirm(true);
            pushActiveGuardState();
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isEnabled, pushActiveGuardState]);

    useEffect(() => {
        return () => {
            if (exitAttemptTimeoutRef.current !== null) {
                window.clearTimeout(exitAttemptTimeoutRef.current);
            }
        };
    }, []);

    const handleCancelExit = useCallback(() => {
        setShowExitConfirm(false);
        setShowClosedFallback(false);
    }, []);

    const handleResumeApp = useCallback(() => {
        setShowClosedFallback(false);
        setShowExitConfirm(false);
    }, []);

    const handleConfirmExit = useCallback(() => {
        setShowExitConfirm(false);

        try {
            window.close();
        } catch {
            // Ignore close failures and use the in-app closed state instead.
        }

        if (exitAttemptTimeoutRef.current !== null) {
            window.clearTimeout(exitAttemptTimeoutRef.current);
        }

        exitAttemptTimeoutRef.current = window.setTimeout(() => {
            if (!document.hidden) {
                setShowClosedFallback(true);
            }
        }, 240);
    }, []);

    if (!isEnabled) {
        return null;
    }

    return (
        <>
            {showExitConfirm ? (
                <div className="app-shell-guard-backdrop" role="presentation">
                    <div
                        className="app-shell-guard-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="app-shell-guard-title"
                        aria-describedby="app-shell-guard-description"
                    >
                        <span className="app-shell-guard-badge">Application Safety</span>
                        <h2 id="app-shell-guard-title">Exit Application</h2>
                        <p id="app-shell-guard-description">
                            Leaving now will close the immersive app session. Stay in the application unless you intend to exit.
                        </p>
                        <div className="app-shell-guard-actions">
                            <button type="button" className="app-shell-guard-button secondary" onClick={handleCancelExit}>
                                Cancel
                            </button>
                            <button type="button" className="app-shell-guard-button primary" onClick={handleConfirmExit}>
                                Exit
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {showClosedFallback ? (
                <div className="app-shell-guard-closed" role="presentation">
                    <div className="app-shell-guard-closed__panel">
                        <span className="app-shell-guard-badge">La&apos;s Homeschool Hub</span>
                        <h2>Application Closed</h2>
                        <p>
                            The app session was closed. Resume when you are ready to continue.
                        </p>
                        <button type="button" className="app-shell-guard-button primary" onClick={handleResumeApp}>
                            Resume App
                        </button>
                        <p className="app-shell-guard-closed__path">{location.pathname}</p>
                    </div>
                </div>
            ) : null}
        </>
    );
};

export default AppShellGuard;
