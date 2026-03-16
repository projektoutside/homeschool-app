import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSoundSettings } from '../context/SoundSettingsContext';
import { useHomepageCatalog } from '../hooks/useHomepageCatalog';
import { buildAssetPath } from '../utils/pathUtils';
import {
  consumeHomepageMysteryTestLaunchToken,
  createCreatorCatalogSyncPayload,
  persistHomepageCatalogSnapshot,
  readHomepageMysteryTestSession,
} from '../utils/homepageCatalogBridge';
import { isManagerUser } from '../utils/managerAccess';
import { applySoundSettingsToWindow } from '../utils/soundSettings';
import { HOMEPAGE_APP_RUNTIME_VERSION } from '../constants/homepageAppVersion';
import type { HomepageCatalogSnapshot } from '../types/homepageCatalog';
import {
  buildPendingMysteryLaunchState,
  createInitialHomepageLaunchState,
  snapshotContainsPropKey,
  type PendingMysteryLaunchState,
} from './userHomePage/homepageLaunchState';
import './Home.css';
import './UserHomePage.css';

const HOME_PAGE_APP_PATH = 'HomePageAPP/index.html';
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
  const [initialLaunchState] = useState(createInitialHomepageLaunchState);
  const initialPendingMysteryLaunch = initialLaunchState.pendingMysteryLaunch;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [launchRefreshToken, setLaunchRefreshToken] = useState(() => initialPendingMysteryLaunch?.launchId || initialPendingMysteryLaunch?.createdAt || '');
  const [pendingMysteryLaunch, setPendingMysteryLaunch] = useState<PendingMysteryLaunchState | null>(initialPendingMysteryLaunch);
  const [storedSnapshot, setStoredSnapshot] = useState<HomepageCatalogSnapshot | null>(
    () => initialLaunchState.storedSnapshot,
  );
  const { user } = useAuth();
  const { settings: soundSettings } = useSoundSettings();
  const { snapshot, isLoading: isCatalogLoading } = useHomepageCatalog({ includeInactive: false });
  const hasDeveloperAccess = useMemo(() => isManagerUser(user), [user]);
  const shouldHoldStoredSnapshot = useMemo(() => {
    if (isCatalogLoading) {
      return false;
    }
    const pendingPropKey = pendingMysteryLaunch?.propKey ?? null;
    if (!pendingPropKey) {
      return false;
    }
    return (
      !snapshotContainsPropKey(snapshot, pendingPropKey)
      && snapshotContainsPropKey(storedSnapshot, pendingPropKey)
    );
  }, [isCatalogLoading, pendingMysteryLaunch?.propKey, snapshot, storedSnapshot]);
  const effectiveSnapshot = useMemo(
    () => {
      if (
        !isCatalogLoading
        && !shouldHoldStoredSnapshot
        && (snapshot.categories.length > 0 || snapshot.props.length > 0)
      ) {
        return snapshot;
      }
      return storedSnapshot ?? snapshot;
    },
    [isCatalogLoading, shouldHoldStoredSnapshot, snapshot, storedSnapshot],
  );
  const homePageRuntimeToken = useMemo(() => (
    launchRefreshToken
    || (!isCatalogLoading ? snapshot.updatedAt : '')
    || effectiveSnapshot?.updatedAt
    || 'runtime'
  ), [effectiveSnapshot?.updatedAt, isCatalogLoading, launchRefreshToken, snapshot.updatedAt]);
  const launchPath = useMemo(
    () => buildAssetPath(`${HOME_PAGE_APP_PATH}?v=${HOMEPAGE_APP_RUNTIME_VERSION}&runtime=${encodeURIComponent(homePageRuntimeToken)}${hasDeveloperAccess ? '&developer=1' : ''}`),
    [hasDeveloperAccess, homePageRuntimeToken],
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
    if (!isActive) {
      return;
    }
    const activeSession = readHomepageMysteryTestSession();
    const launchToken = activeSession ? null : consumeHomepageMysteryTestLaunchToken();
    const nextPendingMysteryLaunch = buildPendingMysteryLaunchState({
      session: activeSession,
      launchToken,
    });
    if (!nextPendingMysteryLaunch) {
      return;
    }
    const latestStoredSnapshot = initialLaunchState.storedSnapshot ?? storedSnapshot;
    const frameId = window.requestAnimationFrame(() => {
      if (latestStoredSnapshot) {
        setStoredSnapshot(latestStoredSnapshot);
      }
      setIsLoading(true);
      setPendingMysteryLaunch(nextPendingMysteryLaunch);
      setLaunchRefreshToken(nextPendingMysteryLaunch.launchId || nextPendingMysteryLaunch.createdAt || `${Date.now()}`);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [initialLaunchState.storedSnapshot, isActive, storedSnapshot]);

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

  useEffect(() => {
    if (isCatalogLoading) {
      return;
    }
    if (shouldHoldStoredSnapshot) {
      console.info('[HomepageHost] Holding fresher local catalog snapshot until the live query contains the pending mystery-test prop.', {
        pendingPropKey: pendingMysteryLaunch?.propKey ?? null,
        requiredCatalogRevision: pendingMysteryLaunch?.requiredCatalogRevision ?? null,
        fetchedSnapshotUpdatedAt: snapshot.updatedAt || null,
        fetchedSnapshotEmpty: snapshot.categories.length === 0 && snapshot.props.length === 0,
        storedSnapshotUpdatedAt: storedSnapshot?.updatedAt || null,
      });
      return;
    }
    persistHomepageCatalogSnapshot(snapshot);
    const frameId = window.requestAnimationFrame(() => {
      setStoredSnapshot(snapshot);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [
    isCatalogLoading,
    pendingMysteryLaunch?.propKey,
    pendingMysteryLaunch?.requiredCatalogRevision,
    shouldHoldStoredSnapshot,
    snapshot,
    storedSnapshot?.updatedAt,
  ]);

  useEffect(() => {
    if (isCatalogLoading) {
      return;
    }
    const pendingPropKey = pendingMysteryLaunch?.propKey ?? null;
    if (!pendingPropKey) {
      return;
    }
    if (!snapshotContainsPropKey(snapshot, pendingPropKey)) {
      return;
    }
    console.info('[HomepageHost] Live catalog query now contains the pending mystery-test prop.', {
      pendingPropKey,
      snapshotUpdatedAt: snapshot.updatedAt || null,
    });
    const frameId = window.requestAnimationFrame(() => {
      setPendingMysteryLaunch(null);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [isCatalogLoading, pendingMysteryLaunch, snapshot]);

  useEffect(() => {
    if (isCatalogLoading) {
      return;
    }
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    try {
      target.postMessage(
        createCreatorCatalogSyncPayload({
          snapshot: effectiveSnapshot,
          publishEnabled: false,
          reason: null,
        }),
        window.location.origin,
      );
    } catch {
      // Ignore early sync failures until the iframe is fully booted.
    }
  }, [effectiveSnapshot, isCatalogLoading]);

  const handleLoad = () => {
    setIsLoading(false);
    applySoundSettingsToWindow(
      iframeRef.current?.contentWindow,
      soundSettings,
      { homePageActive: isActive },
    );
    syncTiltBridgeStateToIframe();
    if (isCatalogLoading) {
      return;
    }
    try {
      iframeRef.current?.contentWindow?.postMessage(
        createCreatorCatalogSyncPayload({
          snapshot: effectiveSnapshot,
          publishEnabled: false,
          reason: null,
        }),
        window.location.origin,
      );
    } catch {
      // Ignore transient sync failures on early iframe boot.
    }
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
        {hasDeveloperAccess ? (
          <Link
            to="/character-creator"
            className="user-home-creator-launcher"
            aria-label="Open XiO Studio"
          >
            <span className="user-home-creator-launcher__eyebrow">Studio Access</span>
            <span className="user-home-creator-launcher__title">Open XiO Studio</span>
          </Link>
        ) : null}
        {isLoading && (
          <div className="user-home-app-loading" aria-live="polite">
            Loading homepage...
          </div>
        )}
        <iframe
          key={launchPath}
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
