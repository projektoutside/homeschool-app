import React from 'react';
import { InstallCard } from '../components/InstallButton';
import { usePWA } from '../hooks/usePWA';
import '../components/InstallButton.css';

/**
 * Install Page
 * A dedicated page for customers to install the app
 * Accessible at /install route
 */
const InstallPage: React.FC = () => {
  const { installContext } = usePWA();

  const badgeLabel = (() => {
    switch (installContext.platform) {
      case 'android':
        return installContext.canOneClickInstall
          ? 'Android: One-tap install available'
          : 'Android: Use browser menu install';
      case 'chromium-desktop':
        return installContext.canOneClickInstall
          ? 'Desktop Chrome/Edge: One-tap install available'
          : 'Desktop Chrome/Edge: Use browser install menu';
      case 'ios':
        return 'iOS: Share → Add to Home Screen';
      case 'firefox':
        return 'Firefox: Install varies by device/version';
      case 'safari-desktop':
        return 'Safari macOS: File → Add to Dock (if supported)';
      case 'console':
        return 'Console browser: native-style app install not supported';
      default:
        return 'Install support depends on your browser/device';
    }
  })();

  const badgeTone = installContext.canOneClickInstall
    ? 'success'
    : installContext.platform === 'console'
      ? 'warning'
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
        <p>Best install experience: Chrome/Edge on Android, Windows, and macOS</p>
        <p style={{ marginTop: '0.5rem' }}>
          iOS requires Share → Add to Home Screen; console browsers have limited support
        </p>
      </footer>
    </div>
  );
};

export default InstallPage;