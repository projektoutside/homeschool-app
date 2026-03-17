import { useEffect } from 'react';
import { installConfig } from '../config/installConfig';

type NativeShellOptions = {
    isNativeApp: boolean;
    nativePlatform: 'android' | 'ios' | null;
};

const isExternalHttpLink = (href: string): boolean => {
    if (!/^https?:/i.test(href)) {
        return false;
    }

    try {
        const url = new URL(href, window.location.href);
        return url.origin !== window.location.origin;
    } catch {
        return false;
    }
};

export const useNativeShell = ({ isNativeApp, nativePlatform }: NativeShellOptions) => {
    useEffect(() => {
        if (!isNativeApp) {
            return;
        }

        let isDisposed = false;

        void (async () => {
            const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
                import('@capacitor/status-bar'),
                import('@capacitor/splash-screen'),
            ]);

            if (isDisposed) {
                return;
            }

            try {
                await StatusBar.setOverlaysWebView({ overlay: true });
                await StatusBar.setBackgroundColor({ color: installConfig.themeColor });
                await StatusBar.setStyle({ style: Style.Light });
            } catch {
                // Ignore native status bar setup failures on unsupported runtimes.
            }

            try {
                await SplashScreen.hide();
            } catch {
                // Ignore splash-screen hide failures when plugin/runtime is unavailable.
            }
        })();

        return () => {
            isDisposed = true;
        };
    }, [isNativeApp]);

    useEffect(() => {
        if (!isNativeApp || nativePlatform !== 'android') {
            return;
        }

        let backButtonListener: { remove: () => Promise<void> } | null = null;

        void import('@capacitor/app').then(({ App }) => {
            void App.addListener('backButton', () => {
                window.history.back();
            }).then((listener) => {
                backButtonListener = listener;
            });
        });

        return () => {
            if (backButtonListener) {
                void backButtonListener.remove();
            }
        };
    }, [isNativeApp, nativePlatform]);

    useEffect(() => {
        if (!isNativeApp) {
            return;
        }

        let isDisposed = false;
        let browserModulePromise: Promise<typeof import('@capacitor/browser')> | null = null;

        const handleDocumentClick = (event: MouseEvent) => {
            if (event.defaultPrevented || event.button !== 0) {
                return;
            }

            const target = event.target as HTMLElement | null;
            const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
            if (!anchor) {
                return;
            }

            const href = anchor.href;
            if (!href || !isExternalHttpLink(href)) {
                return;
            }

            event.preventDefault();

            browserModulePromise ??= import('@capacitor/browser');
            void browserModulePromise.then(({ Browser }) => {
                if (!isDisposed) {
                    void Browser.open({ url: href });
                }
            });
        };

        document.addEventListener('click', handleDocumentClick, true);
        return () => {
            isDisposed = true;
            document.removeEventListener('click', handleDocumentClick, true);
        };
    }, [isNativeApp]);
};
