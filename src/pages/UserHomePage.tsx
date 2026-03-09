import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSoundSettings } from '../context/SoundSettingsContext';
import { buildAssetPath } from '../utils/pathUtils';
import { applySoundSettingsToWindow } from '../utils/soundSettings';
import './Home.css';
import './UserHomePage.css';

const HOME_PAGE_APP_PATH = 'HomePageAPP/index.html';
const HOME_PAGE_APP_VERSION = '2026-03-09-29';
const HOME_PAGE_TILT_STATUS_MESSAGE = 'homepage-deviceorientation-status';
const HOME_PAGE_TILT_SAMPLE_MESSAGE = 'homepage-deviceorientation';
const HOME_PAGE_TILT_PERMISSION_REQUEST_MESSAGE = 'homepage-deviceorientation-request-permission';
const HOME_PAGE_TILT_SYNC_REQUEST_MESSAGE = 'homepage-deviceorientation-sync-status';

type HomePageTiltPermissionState =
  | 'unknown'
  | 'unsupported'
  | 'blocked'
  | 'prompt'
  | 'denied'
  | 'granted';

type HomePageTiltBridge = {
  ensureStarted: (options?: { userGesture?: boolean }) => Promise<boolean>;
  getState: () => {
    permission: HomePageTiltPermissionState;
    listening: boolean;
  };
};

type DeviceOrientationPermissionAPI = (typeof DeviceOrientationEvent) & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

declare global {
  interface Window {
    __homePageTiltBridge?: HomePageTiltBridge;
  }
}

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
  const tiltBridgeStateRef = useRef<{
    permission: HomePageTiltPermissionState;
    listening: boolean;
    handler: ((event: DeviceOrientationEvent) => void) | null;
  }>({
    permission: 'unknown',
    listening: false,
    handler: null,
  });

  const postTiltBridgeMessage = useCallback((payload: Record<string, unknown>) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    try {
      target.postMessage(payload, window.location.origin);
    } catch {
      return;
    }
  }, []);

  const syncTiltBridgeStateToIframe = useCallback(() => {
    const bridgeState = tiltBridgeStateRef.current;
    postTiltBridgeMessage({
      type: HOME_PAGE_TILT_STATUS_MESSAGE,
      permission: bridgeState.permission,
      listening: bridgeState.listening,
    });
  }, [postTiltBridgeMessage]);

  useEffect(() => {
    applySoundSettingsToWindow(
      iframeRef.current?.contentWindow,
      soundSettings,
      { homePageActive: isActive },
    );
  }, [isActive, soundSettings]);

  useEffect(() => {
    const bridgeState = tiltBridgeStateRef.current;

    const startTiltListener = () => {
      if (bridgeState.listening) {
        syncTiltBridgeStateToIframe();
        return true;
      }

      const handler = (event: DeviceOrientationEvent) => {
        postTiltBridgeMessage({
          type: HOME_PAGE_TILT_SAMPLE_MESSAGE,
          beta: typeof event.beta === 'number' ? event.beta : null,
          gamma: typeof event.gamma === 'number' ? event.gamma : null,
          alpha: typeof event.alpha === 'number' ? event.alpha : null,
          absolute: Boolean(event.absolute),
        });
      };

      window.addEventListener('deviceorientation', handler, { passive: true });
      bridgeState.handler = handler;
      bridgeState.listening = true;
      bridgeState.permission = 'granted';
      syncTiltBridgeStateToIframe();
      return true;
    };

    const ensureStarted = async ({ userGesture = false }: { userGesture?: boolean } = {}) => {
      if (bridgeState.listening) {
        syncTiltBridgeStateToIframe();
        return true;
      }

      if (typeof window.DeviceOrientationEvent === 'undefined') {
        bridgeState.permission = 'unsupported';
        syncTiltBridgeStateToIframe();
        return false;
      }

      if (!window.isSecureContext) {
        bridgeState.permission = 'blocked';
        syncTiltBridgeStateToIframe();
        return false;
      }

      const deviceOrientationPermissionAPI =
        window.DeviceOrientationEvent as DeviceOrientationPermissionAPI | undefined;
      const requestPermission = deviceOrientationPermissionAPI?.requestPermission;
      if (typeof requestPermission === 'function') {
        if (!userGesture) {
          bridgeState.permission = 'prompt';
          syncTiltBridgeStateToIframe();
          return false;
        }

        try {
          const result = await requestPermission.call(deviceOrientationPermissionAPI);
          bridgeState.permission = result === 'granted' ? 'granted' : 'denied';
          if (bridgeState.permission !== 'granted') {
            syncTiltBridgeStateToIframe();
            return false;
          }
        } catch {
          bridgeState.permission = 'denied';
          syncTiltBridgeStateToIframe();
          return false;
        }
      }

      return startTiltListener();
    };

    const bridge: HomePageTiltBridge = {
      ensureStarted,
      getState: () => ({
        permission: bridgeState.permission,
        listening: bridgeState.listening,
      }),
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== 'object') return;

      const type = (event.data as { type?: string }).type;
      if (type === HOME_PAGE_TILT_PERMISSION_REQUEST_MESSAGE) {
        void ensureStarted({ userGesture: true });
        return;
      }
      if (type === HOME_PAGE_TILT_SYNC_REQUEST_MESSAGE) {
        void ensureStarted({ userGesture: false });
      }
    };

    window.__homePageTiltBridge = bridge;
    window.addEventListener('message', handleMessage);
    void ensureStarted({ userGesture: false });

    return () => {
      window.removeEventListener('message', handleMessage);
      if (bridgeState.handler) {
        window.removeEventListener('deviceorientation', bridgeState.handler);
      }
      bridgeState.handler = null;
      bridgeState.listening = false;
      bridgeState.permission = 'unknown';
      if (window.__homePageTiltBridge === bridge) {
        delete window.__homePageTiltBridge;
      }
    };
  }, [postTiltBridgeMessage, syncTiltBridgeStateToIframe]);

  const handleLoad = () => {
    setIsLoading(false);
    applySoundSettingsToWindow(
      iframeRef.current?.contentWindow,
      soundSettings,
      { homePageActive: isActive },
    );
    syncTiltBridgeStateToIframe();
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
          allow="fullscreen; autoplay; microphone; camera; accelerometer; gyroscope"
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
