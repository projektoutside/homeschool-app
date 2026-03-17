import React from 'react';
import { InstallCard } from '../components/InstallButton';
import { useInstallResolution } from '../hooks/useInstallResolution';
import '../components/InstallButton.css';

/**
 * Install Page
 * A dedicated page for customers to install the app
 * Accessible at /install route
 */
const InstallPage: React.FC = () => {
  const { installResolution } = useInstallResolution('install-page');
  const badgeLabel = `${installResolution.platformLabel} install`;
  const badgeTone = installResolution.target === 'unsupported'
    ? 'warning'
    : installResolution.target === 'installed'
      ? 'success'
      : 'info';

  return (
    <div className="install-page">
      <div className={`install-platform-badge ${badgeTone}`} role="status" aria-live="polite">
        {badgeLabel}
      </div>
      <InstallCard />
      
      <footer style={{ 
        marginTop: '2rem', 
        textAlign: 'center', 
        color: '#9ca3af',
        fontSize: '0.875rem'
      }}>
        <p>Best browser install experience: Chrome or Edge on Android and desktop</p>
        <p style={{ marginTop: '0.5rem' }}>
          Native app store packaging is prepared separately from the web install path
        </p>
      </footer>
    </div>
  );
};

export default InstallPage;
