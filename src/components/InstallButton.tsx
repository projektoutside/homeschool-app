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
  const { isInstallable, isInstalled, installPrompt } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as { MSStream?: boolean }).MSStream;
  
  // Detect Safari
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  const handleInstall = useCallback(async () => {
    onInstallStart?.();
    setIsInstalling(true);

    // iOS Safari doesn't support beforeinstallprompt
    if (isIOS && isSafari) {
      setShowIOSInstructions(true);
      setIsInstalling(false);
      onInstallComplete?.(false);
      return;
    }

    // Try native install prompt
    if (isInstallable) {
      const success = await installPrompt();
      setIsInstalling(false);
      onInstallComplete?.(success);
    } else {
      // Desktop Chrome/Edge or other browsers without prompt
      setShowIOSInstructions(true);
      setIsInstalling(false);
      onInstallComplete?.(false);
    }
  }, [isInstallable, isInstalled, isIOS, isSafari, installPrompt, onInstallStart, onInstallComplete]);

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
            <span>Install App</span>
          </>
        )}
      </button>

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
                <h3>📱 Install on iPhone/iPad</h3>
                <ol>
                  <li>Tap the <strong>Share</strong> button <span className="share-icon">⎋</span> at the bottom of your screen.</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong> <span className="add-icon">⊕</span>.</li>
                  <li>Tap <strong>Add</strong> in the top right corner.</li>
                </ol>
              </div>
            ) : (
              <div className="desktop-instructions">
                <h3>💻 Install on Desktop</h3>
                <ol>
                  <li>Look for the install icon <strong>⊕</strong> in your browser's address bar.</li>
                  <li>Or open the browser menu (⋮) and select "Install La's Homeschool Hub".</li>
                  <li>Follow the prompts to add the app to your desktop.</li>
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