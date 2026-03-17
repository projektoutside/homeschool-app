import React, { useMemo, useState } from 'react';
import { installConfig } from '../config/installConfig';
import { useInstallResolution } from '../hooks/useInstallResolution';
import type { InstallResolution, InstallSurface } from '../types/install';
import './InstallButton.css';

interface InstallButtonProps {
  className?: string;
  showIcon?: boolean;
  surface?: InstallSurface;
  onInstallStart?: () => void;
  onInstallComplete?: (success: boolean) => void;
}

interface InstallHelperSheetProps {
  isOpen: boolean;
  onClose: () => void;
  resolution: InstallResolution;
  titleOverride?: string;
}

const getPlatformBadgeTone = (target: InstallResolution['target']) => {
  if (target === 'installed') {
    return 'success';
  }

  if (target === 'unsupported') {
    return 'warning';
  }

  return 'info';
};

export const InstallHelperSheet: React.FC<InstallHelperSheetProps> = ({
  isOpen,
  onClose,
  resolution,
  titleOverride,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="install-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="install-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-sheet-title"
      >
        <button className="install-sheet__close" onClick={onClose} aria-label="Close install help" type="button">
          ×
        </button>
        <span className={`install-sheet__badge ${getPlatformBadgeTone(resolution.target)}`}>
          {resolution.platformLabel}
        </span>
        <h2 id="install-sheet-title">{titleOverride ?? resolution.helperTitle}</h2>
        <p className="install-sheet__description">{resolution.helperDescription}</p>
        <ol className="install-sheet__steps">
          {resolution.helperSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <button className="install-sheet__confirm" onClick={onClose} type="button">
          {resolution.helperConfirmLabel}
        </button>
      </div>
    </div>
  );
};

/**
 * One-click install button that routes to the correct install channel for the current runtime.
 */
export const InstallButton: React.FC<InstallButtonProps> = ({
  className = '',
  showIcon = true,
  surface = 'inline',
  onInstallStart,
  onInstallComplete,
}) => {
  const { installResolution, runInstallAction } = useInstallResolution(surface);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showHelperSheet, setShowHelperSheet] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  const buttonLabel = installResolution.buttonLabel;
  const isInstalledTarget = installResolution.target === 'installed';

  const handleInstall = async () => {
    onInstallStart?.();
    setIsInstalling(true);
    setInstallError(null);

    try {
      const result = await runInstallAction();
      onInstallComplete?.(result.completed);

      if (result.target === 'pwa-prompt' && !result.completed) {
        setInstallError('Install prompt was dismissed. Tap again to retry.');
      } else if (result.openedHelper) {
        setShowHelperSheet(true);
      }
    } catch {
      onInstallComplete?.(false);
      setInstallError('Install is unavailable right now. Use the install steps instead.');
      setShowHelperSheet(true);
    } finally {
      setIsInstalling(false);
    }
  };

  if (installResolution.hidePrimaryCta) {
    return null;
  }

  return (
    <>
      <button
        className={`install-button ${className}`.trim()}
        onClick={handleInstall}
        disabled={isInstalling || isInstalledTarget}
        aria-label={`Install ${installConfig.appName}`}
        type="button"
      >
        {isInstalling ? (
          <span className="loading-spinner" aria-hidden="true" />
        ) : (
          <>
            {showIcon ? <span className="icon" aria-hidden="true">↓</span> : null}
            <span>{buttonLabel}</span>
          </>
        )}
      </button>
      {installError ? <p className="install-helper-note">{installError}</p> : null}
      <InstallHelperSheet
        isOpen={showHelperSheet}
        onClose={() => setShowHelperSheet(false)}
        resolution={installResolution}
      />
    </>
  );
};

/**
 * Full-page install card used on the dedicated install page.
 */
export const InstallCard: React.FC = () => {
  const { installResolution } = useInstallResolution('install-page');
  const [showInstalledMessage, setShowInstalledMessage] = useState(false);

  const installStatusLabel = useMemo(() => {
    if (installResolution.target === 'installed') {
      return 'Installed and ready';
    }

    return `${installResolution.platformLabel} install path`;
  }, [installResolution.platformLabel, installResolution.target]);

  const handleInstallComplete = (success: boolean) => {
    if (success) {
      setShowInstalledMessage(true);
    }
  };

  if (showInstalledMessage || installResolution.target === 'installed') {
    return (
      <div className="install-success">
        <div className="success-icon" aria-hidden="true">✓</div>
        <h2 className="success-title">Installed</h2>
        <p className="success-message">
          {installConfig.appName} is available on your device like a normal installed application.
        </p>
      </div>
    );
  }

  return (
    <div className="install-card">
      <span className="install-card__badge">{installStatusLabel}</span>
      <div className="app-icon" aria-hidden="true">
        <span>LH</span>
      </div>
      <h1 className="app-title">{installConfig.appName}</h1>
      <p className="app-description">{installConfig.description}</p>

      <ul className="feature-list">
        <li>One install path for phone, tablet, desktop, and native app packaging.</li>
        <li>Fullscreen learning experience with chrome-free classroom, games, and worksheets.</li>
        <li>Appears on the device like a normal app after installation.</li>
      </ul>

      <InstallButton
        onInstallComplete={handleInstallComplete}
        className="install-button-large"
        surface="install-page"
      />
    </div>
  );
};
