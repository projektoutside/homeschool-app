import React from 'react';
import './PWAInstallModal.css';

interface PWAInstallModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose, title = "Install App" }) => {
    if (!isOpen) return null;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                  !(window as unknown as { MSStream?: boolean }).MSStream;

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
                ) : (
                    <div className="pwa-instructions">
                        <p>To install this app:</p>
                        <ol>
                            <li>Open your browser's menu (usually <strong>⋮</strong> or <strong>...</strong>).</li>
                            <li>Select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.</li>
                        </ol>
                    </div>
                )}

                <button className="pwa-modal-btn" onClick={onClose}>Got it</button>
            </div>
        </div>
    );
};
