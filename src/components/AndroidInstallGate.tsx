import React from 'react';
import { Link } from 'react-router-dom';
import { installConfig } from '../config/installConfig';
import { InstallButton } from './InstallButton';
import './AndroidInstallGate.css';

interface AndroidInstallGateProps {
    appName?: string;
}

export const AndroidInstallGate: React.FC<AndroidInstallGateProps> = ({
    appName = installConfig.appName,
}) => {
    return (
        <div className="android-install-gate" role="dialog" aria-modal="true" aria-label="Install required">
            <div className="android-install-gate__card">
                <div className="android-install-gate__badge">Android immersive mode required</div>
                <div className="android-install-gate__icon" aria-hidden="true">📲</div>
                <h1 className="android-install-gate__title">Install {appName} to continue</h1>
                <p className="android-install-gate__body">
                    This Android experience is locked to installed app mode so classroom, games, and worksheets
                    always stay chrome-free and feel like a real application.
                </p>
                <div className="android-install-gate__actions">
                    <InstallButton className="android-install-gate__install-btn" surface="gate" />
                    <Link to="/install" className="android-install-gate__help-link">
                        Open Install Help
                    </Link>
                </div>
                <ul className="android-install-gate__notes" aria-label="Install requirements">
                    <li>Installed mode keeps the browser top bar out of the learning experience.</li>
                    <li>Once installed, reopen the app from your Home Screen icon.</li>
                    <li>Browser-tab mode is intentionally blocked on Android for this app.</li>
                </ul>
            </div>
        </div>
    );
};

export default AndroidInstallGate;
