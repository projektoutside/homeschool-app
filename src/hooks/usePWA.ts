import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { HOMEPAGE_BOOT_STABLE_EVENT } from '../constants/runtimeEvents';
import { exitDocumentFullscreen, getFullscreenElement, requestElementFullscreen } from '../utils/fullscreen';

const LIVE_UPDATE_POLL_INTERVAL_MS = 5 * 60 * 1000;

// Type definitions
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface UpdateInfo {
  hasUpdate: boolean;
  currentCommit?: string | null;
  latestCommit?: string;
  commitDate?: string;
  commitMessage?: string;
  repoUrl?: string;
}

interface UsePWAReturn {
  // Install state
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isNativeApp: boolean;
  nativePlatform: 'android' | 'ios' | null;
  isAndroid: boolean;
  isStandaloneShell: boolean;
  requiresInstalledShell: boolean;
  shouldUseNativeFullscreenFallback: boolean;
  installPrompt: () => Promise<boolean>;
  installContext: {
    platform: 'ios' | 'android' | 'chromium-desktop' | 'firefox' | 'safari-desktop' | 'console' | 'unknown';
    installMethod: 'native-prompt' | 'manual-ios-share' | 'manual-browser-menu' | 'unsupported';
    canOneClickInstall: boolean;
  };
  
  // Fullscreen state
  isFullscreen: boolean;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  toggleFullscreen: () => Promise<void>;
  
  // Update state
  updateInfo: UpdateInfo | null;
  isCheckingForUpdates: boolean;
  checkForUpdates: () => void;
  applyUpdate: () => void;
  
  // Service worker state
  swRegistration: ServiceWorkerRegistration | null;
  isOfflineReady: boolean;
}

/**
 * Comprehensive PWA Hook for La's Homeschool Hub App
 * Handles installation, fullscreen mode, auto-updates, and offline support
 */
export function usePWA(): UsePWAReturn {
  // Install state
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Update state
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  
  // Service worker state
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const hasReloadedForUpdateRef = useRef(false);
  const hasAutoAppliedUpdateRef = useRef(false);
  const hasScheduledInitialUpdateCheckRef = useRef(false);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  
  const checkForUpdatesFromSWRef = useRef<() => void>(() => {});

  const nativePlatform = useMemo<'android' | 'ios' | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const capacitorBridge = (window as Window & {
      Capacitor?: {
        getPlatform?: () => string;
      };
    }).Capacitor;

    const platform = capacitorBridge?.getPlatform?.();
    if (platform === 'android' || platform === 'ios') {
      return platform;
    }

    return null;
  }, []);
  const isNativeApp = nativePlatform !== null;
  const isLocalTestingOrigin = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    const hostname = window.location.hostname.trim().toLowerCase();
    if (!hostname) {
      return false;
    }

    if (
      hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname === '::1'
      || hostname.endsWith('.local')
    ) {
      return true;
    }

    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }

    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }

    const private172Match = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
    if (private172Match) {
      const secondOctet = Number(private172Match[1]);
      return secondOctet >= 16 && secondOctet <= 31;
    }

    return false;
  }, []);
  const bypassInstalledShellGate = import.meta.env.DEV || isLocalTestingOrigin;
  const installContext = useMemo(() => {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    const isConsole = /PlayStation|Nintendo|Xbox/i.test(ua);
    const isFirefox = /Firefox/i.test(ua);
    const isEdge = /Edg\//i.test(ua);
    const isChrome = /Chrome|CriOS/i.test(ua) && !isEdge && !/OPR|Opera|SamsungBrowser/i.test(ua);
    const isSafariDesktop = /Safari/i.test(ua) && !/Chrome|CriOS|Android|Edg|OPR|Firefox/i.test(ua) && !isIOS;

    if (isConsole) {
      return {
        platform: 'console' as const,
        installMethod: 'unsupported' as const,
        canOneClickInstall: false,
      };
    }

    if (deferredPrompt) {
      if (isAndroid) {
        return {
          platform: 'android' as const,
          installMethod: 'native-prompt' as const,
          canOneClickInstall: true,
        };
      }

      if (isChrome || isEdge) {
        return {
          platform: 'chromium-desktop' as const,
          installMethod: 'native-prompt' as const,
          canOneClickInstall: true,
        };
      }
    }

    if (isIOS) {
      return {
        platform: 'ios' as const,
        installMethod: 'manual-ios-share' as const,
        canOneClickInstall: false,
      };
    }

    if (isFirefox) {
      return {
        platform: 'firefox' as const,
        installMethod: 'manual-browser-menu' as const,
        canOneClickInstall: false,
      };
    }

    if (isSafariDesktop) {
      return {
        platform: 'safari-desktop' as const,
        installMethod: 'manual-browser-menu' as const,
        canOneClickInstall: false,
      };
    }

    if (isAndroid) {
      return {
        platform: 'android' as const,
        installMethod: 'manual-browser-menu' as const,
        canOneClickInstall: false,
      };
    }

    if (isChrome || isEdge) {
      return {
        platform: 'chromium-desktop' as const,
        installMethod: 'manual-browser-menu' as const,
        canOneClickInstall: false,
      };
    }

    return {
      platform: 'unknown' as const,
      installMethod: 'manual-browser-menu' as const,
      canOneClickInstall: false,
    };
  }, [deferredPrompt]);

  const isAndroid = installContext.platform === 'android' || nativePlatform === 'android';
  const isStandaloneShell = isStandalone || isNativeApp;
  const requiresInstalledShell = isAndroid && !isStandaloneShell && !bypassInstalledShellGate;
  const shouldUseNativeFullscreenFallback = !isStandaloneShell && !requiresInstalledShell;

  // Check for updates via service worker - defined early for use in effects
  const checkForUpdatesFromSW = useCallback(() => {
    if (navigator.serviceWorker.controller) {
      setIsCheckingForUpdates(true);
      navigator.serviceWorker.controller.postMessage({
        type: 'CHECK_FOR_UPDATES'
      });
    }
  }, []);

  // Store reference for use in other effects
  useEffect(() => {
    checkForUpdatesFromSWRef.current = checkForUpdatesFromSW;
  }, [checkForUpdatesFromSW]);

  // Check if app is in standalone mode (installed)
  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                        window.matchMedia('(display-mode: fullscreen)').matches ||
                        (window.navigator as { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
      setIsInstalled(standalone);
    };

    checkStandalone();

    // Listen for display mode changes
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');
    
    const handleChange = () => checkStandalone();
    standaloneQuery.addEventListener('change', handleChange);
    fullscreenQuery.addEventListener('change', handleChange);

    return () => {
      standaloneQuery.removeEventListener('change', handleChange);
      fullscreenQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsStandalone(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Register service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    if (isNativeApp) {
      const reloadKey = 'native-sw-cleanup-reload';
      void Promise.all([
        navigator.serviceWorker.getRegistrations().then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister()))
        ),
        'caches' in window
          ? caches.keys().then((cacheKeys) => Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey))))
          : Promise.resolve([]),
      ]).then(() => {
        setSwRegistration(null);
        setIsOfflineReady(false);
        if (navigator.serviceWorker.controller && sessionStorage.getItem(reloadKey) !== '1') {
          sessionStorage.setItem(reloadKey, '1');
          window.location.reload();
          return;
        }
        sessionStorage.removeItem(reloadKey);
      });
      return;
    }

    // Avoid stale-cached game/assets while developing with Vite dev server.
    if (import.meta.env.DEV) {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      });

      if ('caches' in window) {
        void caches.keys().then((cacheKeys) => {
          cacheKeys.forEach((cacheKey) => {
            void caches.delete(cacheKey);
          });
        });
      }

      const frameId = window.requestAnimationFrame(() => {
        setSwRegistration(null);
        setIsOfflineReady(false);
      });
      return () => window.cancelAnimationFrame(frameId);
    }

    {
      const swUrl = `${import.meta.env.BASE_URL}service-worker.js`;
      let deferredUpdateListenersCleanup: (() => void) | null = null;
      let liveUpdatePollIntervalId: number | null = null;

      const onControllerChange = () => {
        // Auto-refresh once when a new SW takes control.
        if (hasReloadedForUpdateRef.current) return;
        hasReloadedForUpdateRef.current = true;
        window.location.reload();
      };

      const onServiceWorkerMessage = (event: MessageEvent) => {
        if (event.data?.type === 'UPDATE_CHECK_RESULT') {
          const hasUpdate = Boolean(event.data.hasUpdate);
          setUpdateInfo({
            hasUpdate,
            currentCommit: event.data.currentCommit,
            latestCommit: event.data.latestCommit,
            commitDate: event.data.commitDate,
            commitMessage: event.data.commitMessage,
            repoUrl: event.data.repoUrl
          });
          setIsCheckingForUpdates(false);

          if (hasUpdate) {
            void swRegistrationRef.current?.update().catch(() => {
              // Ignore update polling failures; the next poll/launch will retry.
            });
          }
        } else if (event.data?.type === 'UPDATE_CHECK_ERROR') {
          console.error('[PWA] Update check failed:', event.data.error);
          setIsCheckingForUpdates(false);
        }
      };

      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage);

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
          swRegistrationRef.current = registration;
          setSwRegistration(registration);
          setIsOfflineReady(true);

          if (registration.waiting) {
            setUpdateInfo({
              hasUpdate: true,
              latestCommit: 'A new app version is ready',
            });

            if (!hasAutoAppliedUpdateRef.current) {
              hasAutoAppliedUpdateRef.current = true;
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }

          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;

            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateInfo({
                  hasUpdate: true,
                  latestCommit: 'A new app version is ready',
                });

                if (registration.waiting && !hasAutoAppliedUpdateRef.current) {
                  hasAutoAppliedUpdateRef.current = true;
                  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
              }
            });
          });

          let idleTimeoutId: number | null = null;
          let idleCallbackId: number | null = null;
          const idleWindow = window as Window & {
            requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
            cancelIdleCallback?: (handle: number) => void;
          };

          const runUpdateCheck = () => {
            registration.update().catch(() => {
              // Ignore update polling failures
            });
            checkForUpdatesFromSWRef.current();
          };

          deferredUpdateListenersCleanup = () => {
            window.removeEventListener(HOMEPAGE_BOOT_STABLE_EVENT, scheduleInitialUpdateCheck);
            window.removeEventListener('pointerdown', scheduleInitialUpdateCheck);
            window.removeEventListener('keydown', scheduleInitialUpdateCheck);
            window.removeEventListener('touchstart', scheduleInitialUpdateCheck);
            document.removeEventListener('visibilitychange', handleVisibilityRecovery);

            if (idleTimeoutId !== null) {
              window.clearTimeout(idleTimeoutId);
              idleTimeoutId = null;
            }

            if (idleCallbackId !== null && typeof idleWindow.cancelIdleCallback === 'function') {
              idleWindow.cancelIdleCallback(idleCallbackId);
              idleCallbackId = null;
            }
          };

          const runInitialUpdateCheck = () => {
            deferredUpdateListenersCleanup?.();
            runUpdateCheck();
          };

          const scheduleIdleCheck = () => {
            if (typeof idleWindow.requestIdleCallback === 'function') {
              idleCallbackId = idleWindow.requestIdleCallback(() => {
                idleCallbackId = null;
                runInitialUpdateCheck();
              }, { timeout: 2000 });
              return;
            }

            idleTimeoutId = window.setTimeout(() => {
              idleTimeoutId = null;
              runInitialUpdateCheck();
            }, 250);
          };

          const scheduleInitialUpdateCheck = () => {
            if (hasScheduledInitialUpdateCheckRef.current) {
              return;
            }

            hasScheduledInitialUpdateCheckRef.current = true;
            scheduleIdleCheck();
          };

          const handleVisibilityRecovery = () => {
            if (document.visibilityState === 'visible') {
              scheduleInitialUpdateCheck();
            }
          };

          window.addEventListener(HOMEPAGE_BOOT_STABLE_EVENT, scheduleInitialUpdateCheck);
          window.addEventListener('pointerdown', scheduleInitialUpdateCheck);
          window.addEventListener('keydown', scheduleInitialUpdateCheck);
          window.addEventListener('touchstart', scheduleInitialUpdateCheck);
          document.addEventListener('visibilitychange', handleVisibilityRecovery);

          liveUpdatePollIntervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
              runUpdateCheck();
            }
          }, LIVE_UPDATE_POLL_INTERVAL_MS);
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });

      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        navigator.serviceWorker.removeEventListener('message', onServiceWorkerMessage);
        swRegistrationRef.current = null;
        deferredUpdateListenersCleanup?.();

        if (liveUpdatePollIntervalId !== null) {
          window.clearInterval(liveUpdatePollIntervalId);
        }
      };
    }
  }, [isNativeApp]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(getFullscreenElement(document)));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Install prompt function
  const installPrompt = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      // If no prompt available (iOS or already dismissed), return false
      return false;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    setDeferredPrompt(null);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  // Fullscreen functions
  const enterFullscreen = useCallback(async () => {
    if (!shouldUseNativeFullscreenFallback) {
      return;
    }
    await requestElementFullscreen(document.documentElement);
  }, [shouldUseNativeFullscreenFallback]);

  const exitFullscreen = useCallback(async () => {
    if (!shouldUseNativeFullscreenFallback) {
      return;
    }
    const didExitFullscreen = await exitDocumentFullscreen();
    if (!didExitFullscreen) {
      console.error('[PWA] Failed to exit fullscreen');
    }
  }, [shouldUseNativeFullscreenFallback]);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  const checkForUpdates = useCallback(() => {
    if (swRegistration) {
      setIsCheckingForUpdates(true);
      swRegistration.update().finally(() => {
        setIsCheckingForUpdates(false);
      });
    }
    checkForUpdatesFromSW();
  }, [checkForUpdatesFromSW, swRegistration]);

  // Apply update - reload to get new version
  const applyUpdate = useCallback(() => {
    if (swRegistration?.waiting) {
      // Tell waiting service worker to skip waiting
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload to activate new service worker
      window.location.reload();
    } else {
      // Force reload to get latest version
      window.location.reload();
    }
  }, [swRegistration]);

  return {
    // Install
    isInstallable: !!deferredPrompt,
    isInstalled,
    isStandalone,
    isNativeApp,
    nativePlatform,
    isAndroid,
    isStandaloneShell,
    requiresInstalledShell,
    shouldUseNativeFullscreenFallback,
    installPrompt,
    installContext,
    
    // Fullscreen
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    
    // Updates
    updateInfo,
    isCheckingForUpdates,
    checkForUpdates,
    applyUpdate,
    
    // Service Worker
    swRegistration,
    isOfflineReady
  };
}
