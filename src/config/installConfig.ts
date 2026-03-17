import rawInstallConfig from './install.config.json';

type InstallConfigIcon = {
    src: string;
    sizes: string;
    type: string;
    purpose: string;
};

type RawInstallConfig = {
    appName: string;
    shortName: string;
    description: string;
    appId: string;
    manifestId: string;
    startUrl: string;
    scope: string;
    display: string;
    orientation: string;
    themeColor: string;
    backgroundColor: string;
    categories: string[];
    playStoreUrl: string;
    appStoreUrl: string;
    icons: InstallConfigIcon[];
};

const trimOptionalUrl = (value: string | undefined): string | null => {
    if (!value) {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
};

const baseInstallConfig = rawInstallConfig as RawInstallConfig;

export const installConfig = {
    ...baseInstallConfig,
    playStoreUrl: trimOptionalUrl(import.meta.env.VITE_PLAY_STORE_URL ?? baseInstallConfig.playStoreUrl),
    appStoreUrl: trimOptionalUrl(import.meta.env.VITE_APP_STORE_URL ?? baseInstallConfig.appStoreUrl),
} as const;

export type InstallConfig = typeof installConfig;
