import React from 'react';
import { InstallHelperSheet } from './InstallButton';
import { useInstallResolution } from '../hooks/useInstallResolution';

interface PWAInstallModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    platform?: 'ios' | 'android' | 'chromium-desktop' | 'firefox' | 'safari-desktop' | 'console' | 'unknown';
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
    isOpen,
    onClose,
    title,
}) => {
    const { installResolution } = useInstallResolution('inline');

    return (
        <InstallHelperSheet
            isOpen={isOpen}
            onClose={onClose}
            resolution={installResolution}
            titleOverride={title}
        />
    );
};
