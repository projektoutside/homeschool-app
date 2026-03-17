import React from 'react';
import { InstallButton } from './InstallButton';
import { useInstallResolution } from '../hooks/useInstallResolution';
import './HomeInstallLauncher.css';

export const HomeInstallLauncher: React.FC = () => {
    const { installResolution } = useInstallResolution('homepage');

    if (installResolution.hidePrimaryCta || installResolution.target === 'unsupported') {
        return null;
    }

    return (
        <div className="home-install-launcher" aria-label="Install app">
            <span className="home-install-launcher__eyebrow">Install App</span>
            <span className="home-install-launcher__title">{installResolution.platformLabel}</span>
            <InstallButton className="home-install-launcher__button" surface="homepage" showIcon={false} />
        </div>
    );
};

export default HomeInstallLauncher;
