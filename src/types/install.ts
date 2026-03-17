export type InstallTarget = 'installed' | 'pwa-prompt' | 'store-link' | 'instructions' | 'unsupported';

export type InstallStoreKind = 'play-store' | 'app-store' | null;

export type InstallSurface = 'homepage' | 'install-page' | 'gate' | 'inline';

export interface InstallActionResult {
    completed: boolean;
    openedHelper: boolean;
    target: InstallTarget;
}

export interface InstallResolution {
    target: InstallTarget;
    buttonLabel: string;
    helperTitle: string;
    helperDescription: string;
    helperSteps: string[];
    helperConfirmLabel: string;
    storeUrl: string | null;
    storeKind: InstallStoreKind;
    platformLabel: string;
    hidePrimaryCta: boolean;
}
