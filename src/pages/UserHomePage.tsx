import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSoundSettings } from '../context/SoundSettingsContext';
import { buildAssetPath } from '../utils/pathUtils';
import { applySoundSettingsToWindow } from '../utils/soundSettings';
import './Home.css';
import './UserHomePage.css';

const HOME_PAGE_APP_PATH = 'HomePageAPP/index.html';
const HOME_PAGE_APP_VERSION = '2026-03-05-3';

interface UserHomePageProps {
  isActive: boolean;
}

const UserHomePage: React.FC<UserHomePageProps> = ({ isActive }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { settings: soundSettings } = useSoundSettings();
  const launchPath = useMemo(
    () => buildAssetPath(`${HOME_PAGE_APP_PATH}?v=${HOME_PAGE_APP_VERSION}`),
    [],
  );

  useEffect(() => {
    applySoundSettingsToWindow(
      iframeRef.current?.contentWindow,
      soundSettings,
      { homePageActive: isActive },
    );
  }, [isActive, soundSettings]);

  const handleLoad = () => {
    setIsLoading(false);
    applySoundSettingsToWindow(
      iframeRef.current?.contentWindow,
      soundSettings,
      { homePageActive: isActive },
    );
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsLoading(false);
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  }, [launchPath]);

  return (
    <div className="os-desktop-shell">
      <section className="os-icon-area user-home-os-area" aria-label="Homepage app">
        <div className="user-home-app-shell">
        {isLoading && (
          <div className="user-home-app-loading" aria-live="polite">
            Loading homepage...
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={launchPath}
          title="Homepage App"
          className={`user-home-app-frame ${isLoading ? 'is-loading' : ''}`}
          allow="fullscreen; autoplay; microphone; camera"
          allowFullScreen
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"
          onLoad={handleLoad}
        />
        </div>
      </section>
    </div>
  );
};

export default UserHomePage;
