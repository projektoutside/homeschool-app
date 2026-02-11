import { useState, useEffect, useCallback, useRef } from 'react';

// Type definitions
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface UpdateInfo {
  hasUpdate: boolean;
  currentCommit: string | null;
  latestCommit: string;
  commitDate: string;
  commitMessage: string;
  repoUrl: string;
}

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

interface UsePWAReturn {
  // Install state
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  installPrompt: () => Promise<boolean>;
  
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
  
  const checkForUpdatesFromSWRef = useRef<() => void>(() => {});

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
    if ('serviceWorker' in navigator) {
      const swUrl = `${import.meta.env.BASE_URL}service-worker.js`;

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
          setSwRegistration(registration);
          setIsOfflineReady(true);

          // Ask browser to re-check for updated SW on app start
          registration.update().catch(() => {
            // Ignore update polling failures
          });

          // Listen for service worker messages
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'UPDATE_CHECK_RESULT') {
              setUpdateInfo({
                hasUpdate: event.data.hasUpdate,
                currentCommit: event.data.currentCommit,
                latestCommit: event.data.latestCommit,
                commitDate: event.data.commitDate,
                commitMessage: event.data.commitMessage,
                repoUrl: event.data.repoUrl
              });
              setIsCheckingForUpdates(false);
            } else if (event.data?.type === 'UPDATE_CHECK_ERROR') {
              console.error('[PWA] Update check failed:', event.data.error);
              setIsCheckingForUpdates(false);
            }
          });

          // Check for updates on load
          setTimeout(() => {
            checkForUpdatesFromSWRef.current();
          }, 3000);
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    }
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const doc = document as FullscreenDocument;
    
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement !== null ||
        doc.webkitFullscreenElement !== null ||
        doc.mozFullScreenElement !== null ||
        doc.msFullscreenElement !== null
      );
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
    const docEl = document.documentElement as FullscreenElement;
    try {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
    } catch (error) {
      // Fullscreen not supported or permission denied - silently ignore
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    const doc = document as FullscreenDocument;
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    } catch (error) {
      console.error('[PWA] Failed to exit fullscreen:', error);
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  const checkForUpdates = useCallback(() => {
    checkForUpdatesFromSW();
  }, [checkForUpdatesFromSW]);

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
    installPrompt,
    
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
