import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface UsePWAInstallOptions {
    manifestUrl: string;
    serviceWorkerUrl?: string; // Optional service worker
    enable?: boolean;
}

interface UsePWAInstallResult {
    isSupported: boolean;
    isInstallable: boolean;
    isInstalled: boolean;
    install: () => void;
    promptEvent: BeforeInstallPromptEvent | null;
}

export const usePWAInstall = ({ manifestUrl, serviceWorkerUrl, enable = true }: UsePWAInstallOptions): UsePWAInstallResult => {
    const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [isAppInstalled, setIsAppInstalled] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    // Check if running in standalone mode (already installed)
    useEffect(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;

        setIsAppInstalled(isStandalone);

        const handleAppInstalled = () => {
            setIsAppInstalled(true);
            setPromptEvent(null);
        };

        window.addEventListener('appinstalled', handleAppInstalled);

        // PWA install is supported if beforeinstallprompt is supported or we are on iOS (which we handle manually)
        // Ideally we check browser capabilities, but for now we assume modern browsers
        setIsSupported(true);

        return () => window.removeEventListener('appinstalled', handleAppInstalled);
    }, []);

    // Inject manifest dynamically
    useEffect(() => {
        if (!enable || !manifestUrl) return;

        // Remove any existing manifest
        const existingLinks = document.querySelectorAll('link[rel="manifest"]');
        existingLinks.forEach(link => link.remove());

        // Add new manifest
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = manifestUrl;
        document.head.appendChild(link);

        return () => {
            // Cleanup: remove the injected manifest when unmounting or changing
            if (document.head.contains(link)) {
                document.head.removeChild(link);
            }
        };
    }, [manifestUrl, enable]);

    // Register Service Worker
    useEffect(() => {
        if (!enable || !serviceWorkerUrl || !('serviceWorker' in navigator)) return;

        navigator.serviceWorker.register(serviceWorkerUrl)
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }, [serviceWorkerUrl, enable]);

    // Listen for beforeinstallprompt
    useEffect(() => {
        if (!enable) return;

        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setPromptEvent(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, [enable]);

    const install = useCallback(() => {
        if (!promptEvent) {
            // If no prompt event, it might be iOS or user already declined.
            // The caller should handle fallback (e.g. showing instructions)
            return;
        }

        promptEvent.prompt();
        promptEvent.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                setIsAppInstalled(true);
            } else {
                console.log('User dismissed the install prompt');
            }
            setPromptEvent(null);
        });
    }, [promptEvent]);

    return {
        isSupported,
        isInstallable: !!promptEvent,
        isInstalled: isAppInstalled,
        install,
        promptEvent
    };
};
