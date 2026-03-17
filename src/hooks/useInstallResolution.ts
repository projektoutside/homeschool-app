import { useCallback, useMemo } from 'react';
import { installConfig } from '../config/installConfig';
import { usePWA } from './usePWA';
import type { InstallActionResult, InstallResolution, InstallSurface } from '../types/install';

const openExternalInstallUrl = (url: string) => {
    window.location.assign(url);
};

const getGenericInstructionSteps = (): string[] => {
    return [
        'Open your browser menu.',
        'Choose Install App or Add to Home Screen.',
        'Confirm the prompt to place the app on your device.',
    ];
};

const getPlatformLabel = (platform: ReturnType<typeof usePWA>['installContext']['platform'], nativePlatform: ReturnType<typeof usePWA>['nativePlatform']): string => {
    if (nativePlatform === 'android') {
        return 'Android App';
    }

    if (nativePlatform === 'ios') {
        return 'iPhone App';
    }

    switch (platform) {
        case 'android':
            return 'Android';
        case 'ios':
            return 'iPhone / iPad';
        case 'chromium-desktop':
            return 'Chrome / Edge';
        case 'firefox':
            return 'Firefox';
        case 'safari-desktop':
            return 'Safari';
        case 'console':
            return 'Console Browser';
        default:
            return 'Browser';
    }
};

const buildResolution = (
    pwa: ReturnType<typeof usePWA>,
    surface: InstallSurface,
): InstallResolution => {
    const isInstalledRuntime = pwa.isInstalled || pwa.isStandaloneShell || pwa.isNativeApp;
    const platformLabel = getPlatformLabel(pwa.installContext.platform, pwa.nativePlatform);
    const hidePrimaryCta = surface === 'homepage' && isInstalledRuntime;

    if (isInstalledRuntime) {
        return {
            target: 'installed',
            buttonLabel: 'Installed',
            helperTitle: `${installConfig.appName} is already installed`,
            helperDescription: 'Open the app from your device just like any other installed application.',
            helperSteps: ['Launch it from your Home Screen, app drawer, Dock, or desktop shortcut.'],
            helperConfirmLabel: 'Done',
            storeUrl: null,
            storeKind: null,
            platformLabel,
            hidePrimaryCta,
        };
    }

    if (pwa.isInstallable) {
        return {
            target: 'pwa-prompt',
            buttonLabel: 'Install App',
            helperTitle: `Install ${installConfig.appName}`,
            helperDescription: 'This browser supports a one-tap install prompt.',
            helperSteps: ['Approve the browser install prompt to add the app to your device.'],
            helperConfirmLabel: 'Close',
            storeUrl: null,
            storeKind: null,
            platformLabel,
            hidePrimaryCta: false,
        };
    }

    if (pwa.nativePlatform === 'ios' || pwa.installContext.platform === 'ios') {
        if (installConfig.appStoreUrl) {
            return {
                target: 'store-link',
                buttonLabel: 'Download on the App Store',
                helperTitle: `Get ${installConfig.appName} on the App Store`,
                helperDescription: 'Install the native iPhone/iPad app from the App Store.',
                helperSteps: ['Open the App Store page and tap Get.'],
                helperConfirmLabel: 'Close',
                storeUrl: installConfig.appStoreUrl,
                storeKind: 'app-store',
                platformLabel,
                hidePrimaryCta: false,
            };
        }

        return {
            target: 'instructions',
            buttonLabel: 'Add to Home Screen',
            helperTitle: `Install ${installConfig.appName} on iPhone or iPad`,
            helperDescription: 'Safari cannot show a one-tap web install prompt here, so use Add to Home Screen for now.',
            helperSteps: [
                'Tap the Share button in Safari.',
                'Choose Add to Home Screen.',
                'Tap Add to place the app on your device.',
            ],
            helperConfirmLabel: 'Got it',
            storeUrl: null,
            storeKind: null,
            platformLabel,
            hidePrimaryCta: false,
        };
    }

    if (pwa.installContext.platform === 'android') {
        if (installConfig.playStoreUrl) {
            return {
                target: 'store-link',
                buttonLabel: 'Get it on Google Play',
                helperTitle: `Get ${installConfig.appName} on Google Play`,
                helperDescription: 'Install the Android app from Google Play.',
                helperSteps: ['Open Google Play and tap Install.'],
                helperConfirmLabel: 'Close',
                storeUrl: installConfig.playStoreUrl,
                storeKind: 'play-store',
                platformLabel,
                hidePrimaryCta: false,
            };
        }

        return {
            target: 'instructions',
            buttonLabel: 'Install App',
            helperTitle: `Install ${installConfig.appName} on Android`,
            helperDescription: 'Use your browser install option to add the app directly to your Home Screen.',
            helperSteps: [
                'Open the browser menu.',
                'Tap Install App or Add to Home Screen.',
                'Reopen the app from your Home Screen after installation.',
            ],
            helperConfirmLabel: 'Got it',
            storeUrl: null,
            storeKind: null,
            platformLabel,
            hidePrimaryCta: false,
        };
    }

    if (pwa.installContext.platform === 'console') {
        return {
            target: 'unsupported',
            buttonLabel: 'Install Options',
            helperTitle: `${installConfig.appName} is not installable here`,
            helperDescription: 'Console browsers do not provide a reliable installed-app experience for this product.',
            helperSteps: [
                'Open this app on Android, iPhone/iPad, or desktop Chrome/Edge.',
                'Use the install action there for the full app experience.',
            ],
            helperConfirmLabel: 'Close',
            storeUrl: null,
            storeKind: null,
            platformLabel,
            hidePrimaryCta: surface === 'homepage',
        };
    }

    return {
        target: 'instructions',
        buttonLabel: surface === 'install-page' ? 'Install App' : 'Install Options',
        helperTitle: `Install ${installConfig.appName}`,
        helperDescription: 'Install support depends on your current browser, but the app can still be added to your device where supported.',
        helperSteps: getGenericInstructionSteps(),
        helperConfirmLabel: 'Close',
        storeUrl: null,
        storeKind: null,
        platformLabel,
        hidePrimaryCta: false,
    };
};

export const useInstallResolution = (surface: InstallSurface = 'inline') => {
    const pwa = usePWA();

    const resolution = useMemo(() => buildResolution(pwa, surface), [pwa, surface]);

    const runInstallAction = useCallback(async (): Promise<InstallActionResult> => {
        switch (resolution.target) {
            case 'installed':
                return { completed: false, openedHelper: false, target: resolution.target };
            case 'pwa-prompt': {
                const success = await pwa.installPrompt();
                return { completed: success, openedHelper: false, target: resolution.target };
            }
            case 'store-link':
                if (resolution.storeUrl) {
                    openExternalInstallUrl(resolution.storeUrl);
                    return { completed: true, openedHelper: false, target: resolution.target };
                }
                return { completed: false, openedHelper: true, target: 'instructions' };
            case 'instructions':
            case 'unsupported':
                return { completed: false, openedHelper: true, target: resolution.target };
            default:
                return { completed: false, openedHelper: true, target: 'instructions' };
        }
    }, [pwa, resolution]);

    return {
        ...pwa,
        installResolution: resolution,
        runInstallAction,
    };
};
