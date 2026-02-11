import React from 'react';
import './PWAInstallModal.css';

interface PWAInstallModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    platform?: 'ios' | 'android' | 'chromium-desktop' | 'firefox' | 'safari-desktop' | 'console' | 'unknown';
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose, title = "Install App", platform = 'unknown' }) => {
    if (!isOpen) return null;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                  !(window as unknown as { MSStream?: boolean }).MSStream;

    const renderNonIOSInstructions = () => {
        if (platform === 'console') {
            return (
                <div className="pwa-instructions">
                    <p><strong>Console browsers have limited app-install support.</strong></p>
                    <ol>
                        <li>Most consoles cannot install PWAs as native-style apps.</li>
                        <li>Use a phone, tablet, or desktop browser for installation.</li>
                        <li>You can still browse this site directly on supported consoles.</li>
                    </ol>
                </div>
            );
        }

        if (platform === 'firefox') {
            return (
                <div className="pwa-instructions">
                    <p>To install from Firefox:</p>
                    <ol>
                        <li>Open the browser menu (<strong>☰</strong>).</li>
                        <li>Use <strong>Add to Home Screen</strong> / install shortcut if shown.</li>
                        <li>If not available, open this app in Chrome or Edge for one-click install.</li>
                    </ol>
                </div>
            );
        }

        if (platform === 'safari-desktop') {
            return (
                <div className="pwa-instructions">
                    <p>To install from Safari on macOS:</p>
                    <ol>
                        <li>Open the menu bar.</li>
                        <li>Choose <strong>File → Add to Dock</strong> (if available).</li>
                        <li>Launch from Dock like an app.</li>
                    </ol>
                </div>
            );
        }

        return (
            <div className="pwa-instructions">
                <p>To install this app:</p>
                <ol>
                    <li>Open your browser's menu (usually <strong>⋮</strong> or <strong>...</strong>).</li>
                    <li>Select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.</li>
                </ol>
            </div>
        );
    };

    return (
        <div className="pwa-modal-overlay" onClick={onClose}>
            <div className="pwa-modal-content" onClick={e => e.stopPropagation()}>
                <button className="pwa-modal-close" onClick={onClose} aria-label="Close">×</button>
                <h2>{title}</h2>

                {isIOS ? (
                    <div className="pwa-instructions">
                        <p>To install this app on your iPhone or iPad:</p>
                        <ol>
                            <li>Tap the <strong>Share</strong> button <span className="ios-share-icon">⎋</span> in your browser menu.</li>
                            <li>Scroll down and tap <strong>Add to Home Screen</strong> <span className="ios-add-icon">⊕</span>.</li>
                            <li>Tap <strong>Add</strong> in the top right corner.</li>
                        </ol>
                    </div>
                ) : renderNonIOSInstructions()}

                <button className="pwa-modal-btn" onClick={onClose}>Got it</button>
            </div>
        </div>
    );
};
