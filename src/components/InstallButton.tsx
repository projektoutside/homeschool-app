import React, { useState, useCallback } from 'react';
import { usePWA } from '../hooks/usePWA';
import './InstallButton.css';

interface InstallButtonProps {
  className?: string;
  showIcon?: boolean;
  onInstallStart?: () => void;
  onInstallComplete?: (success: boolean) => void;
}

/**
 * One-Click Install Button Component
 * Provides a simple button to install the PWA with platform-specific handling
 */
export const InstallButton: React.FC<InstallButtonProps> = ({
  className = '',
  showIcon = true,
  onInstallStart,
  onInstallComplete
}) => {
  const { isInstallable, isInstalled, installPrompt, installContext } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as { MSStream?: boolean }).MSStream;
  const supportsShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const isConsoleUnsupported = installContext.platform === 'console';

  const openShareSheet = useCallback(async (): Promise<boolean> => {
    if (!supportsShare) return false;
    try {
      await navigator.share({
        title: "La's Homeschool Hub",
        text: "Install La's Homeschool Hub",
        url: window.location.href
      });
      return true;
    } catch {
      return false;
    }
  }, [supportsShare]);

  const handleInstall = useCallback(async () => {
    onInstallStart?.();
    setIsInstalling(true);
    setInstallError(null);

    if (isConsoleUnsupported) {
      setShowIOSInstructions(true);
      setIsInstalling(false);
      onInstallComplete?.(false);
      return;
    }

    // Preferred path: native one-click install prompt
    if (isInstallable) {
      const success = await installPrompt();
      setIsInstalling(false);
      onInstallComplete?.(success);

      if (!success) {
        setInstallError('Install prompt was dismissed. Tap again to retry.');
      }
      return;
    }

    // iOS best possible fallback: open native share sheet in one tap.
    if (isIOS) {
      await openShareSheet();
      setShowIOSInstructions(true);
      setIsInstalling(false);
      onInstallComplete?.(false);
      return;
    }

    // Non-iOS fallback guidance
    setShowIOSInstructions(true);
    setIsInstalling(false);
    onInstallComplete?.(false);
  }, [isConsoleUnsupported, isInstallable, isIOS, installPrompt, onInstallStart, onInstallComplete, openShareSheet]);

  const getInstallHeading = () => {
    switch (installContext.platform) {
      case 'android':
        return '🤖 Install on Android';
      case 'chromium-desktop':
        return '💻 Install on Desktop (Chrome/Edge)';
      case 'firefox':
        return '🦊 Install on Firefox';
      case 'safari-desktop':
        return '🧭 Install on Safari (macOS)';
      case 'console':
        return '🎮 Console Browsers';
      default:
        return '💻 Install from Browser Menu';
    }
  };

  const getInstructionItems = () => {
    if (installContext.platform === 'console') {
      return [
        'Most game consoles do not support full PWA app installation.',
        'Use a phone, tablet, or desktop browser for the best install experience.',
        'You can still use the website in the console browser when supported.'
      ];
    }

    if (installContext.platform === 'firefox') {
      return [
        'Open Firefox menu (☰).',
        'Use Add to Home Screen / Install shortcut if available on your device.',
        'If install is not offered, open this app in Chrome or Edge for one-click install.'
      ];
    }

    if (installContext.platform === 'safari-desktop') {
      return [
        'Open Safari menu bar.',
        'Use File → Add to Dock (on supported macOS versions).',
        'Launch from Dock like an app after adding.'
      ];
    }

    return [
      'Open browser menu (⋮ or ...).',
      'Select Install App or Add to Home Screen.',
      'Follow prompts to add the app to your device.'
    ];
  };

  const installButtonLabel = isInstallable
    ? 'Install in 1 Tap'
    : isConsoleUnsupported
      ? 'Install Not Supported Here'
      : 'Open Install Steps';

  // If already installed, show launch option
  if (isInstalled) {
    return (
      <button className={`install-button installed ${className}`} disabled>
        {showIcon && <span className="icon">✓</span>}
        <span>Installed</span>
      </button>
    );
  }

  return (
    <>
      <button
        className={`install-button ${className}`}
        onClick={handleInstall}
        disabled={isInstalling}
        aria-label="Install La's Homeschool Hub App"
      >
        {isInstalling ? (
          <span className="loading-spinner" />
        ) : (
          <>
            {showIcon && <span className="icon">📲</span>}
            <span>{installButtonLabel}</span>
          </>
        )}
      </button>

      {installError && <p className="install-helper-note">{installError}</p>}

      {/* iOS/Desktop Instructions Modal */}
      {showIOSInstructions && (
        <div className="pwa-modal-overlay" onClick={() => setShowIOSInstructions(false)}>
          <div className="pwa-modal-content" onClick={e => e.stopPropagation()}>
            <button 
              className="pwa-modal-close" 
              onClick={() => setShowIOSInstructions(false)}
              aria-label="Close"
            >
              ×
            </button>
            
            {isIOS ? (
              <div className="ios-instructions">
                <h3>📱 Quick Install on iPhone/iPad</h3>
                {supportsShare && (
                  <button className="install-quick-action" onClick={openShareSheet}>
                    Open Share Sheet
                  </button>
                )}
                <ol>
                  <li>Tap <strong>Share</strong> <span className="share-icon">⎋</span>.</li>
                  <li>Tap <strong>Add to Home Screen</strong> <span className="add-icon">⊕</span>.</li>
                  <li>Tap <strong>Add</strong> in the top right corner.</li>
                </ol>
              </div>
            ) : (
              <div className="desktop-instructions">
                <h3>{getInstallHeading()}</h3>
                <ol>
                  {getInstructionItems().map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ol>
              </div>
            )}
            
            <button className="pwa-modal-btn" onClick={() => setShowIOSInstructions(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Install Card Component
 * Shows a full install card with app info and install button
 */
export const InstallCard: React.FC = () => {
  const { isInstalled, isStandalone } = usePWA();
  const [showInstalledMessage, setShowInstalledMessage] = useState(false);

  const handleInstallComplete = (success: boolean) => {
    if (success) {
      setShowInstalledMessage(true);
    }
  };

  if (showInstalledMessage || (isInstalled && isStandalone)) {
    return (
      <div className="install-success">
        <div className="success-icon">🎉</div>
        <h2 className="success-title">Successfully Installed!</h2>
        <p className="success-message">
          La's Homeschool Hub has been added to your device.
        </p>
        <a href="/" className="launch-button">
          <span>🚀</span>
          <span>Launch App</span>
        </a>
      </div>
    );
  }

  return (
    <div className="install-card">
      <div className="app-icon">🎓</div>
      <h1 className="app-title">La's Homeschool Hub</h1>
      <p className="app-description">
        A central place for all your homeschool educational resources, games, and tools.
      </p>
      
      <ul className="feature-list">
        <li>Access educational games & activities</li>
        <li>Generate custom worksheets</li>
        <li>Works offline - no internet required</li>
        <li>Regular updates with new content</li>
        <li>Fullscreen, distraction-free learning</li>
      </ul>

      <InstallButton 
        onInstallComplete={handleInstallComplete}
        className="install-button-large"
      />
    </div>
  );
};
