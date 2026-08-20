export type GameOrientationResult = {
    source: 'native-host' | 'capacitor-plugin' | 'screen-orientation' | 'unsupported';
    success: boolean;
    supported: boolean;
};

type NativeGameOrientationBridge = {
    requestPortrait?: (gameId: string) => boolean | Promise<boolean>;
    releasePortrait?: (gameId: string) => boolean | Promise<boolean>;
};

type CapacitorOrientationPlugin = {
    lock?: (options: { orientation: 'portrait' }) => unknown | Promise<unknown>;
    unlock?: () => unknown | Promise<unknown>;
};

type ScreenOrientationCapability = {
    lock?: (orientation: 'portrait') => unknown | Promise<unknown>;
    unlock?: () => unknown | Promise<unknown>;
};

type GameOrientationWindow = {
    LAHSGameOrientationBridge?: NativeGameOrientationBridge;
    Capacitor?: {
        Plugins?: {
            ScreenOrientation?: CapacitorOrientationPlugin;
        };
    };
    screen?: {
        orientation?: ScreenOrientationCapability;
    };
};

const result = (
    source: GameOrientationResult['source'],
    supported: boolean,
    success: boolean,
): GameOrientationResult => ({ source, success, supported });

export const requestGamePortraitOrientation = async (
    windowRef: GameOrientationWindow,
    gameId: string,
): Promise<GameOrientationResult> => {
    const nativeRequest = windowRef.LAHSGameOrientationBridge?.requestPortrait;
    if (typeof nativeRequest === 'function') {
        try {
            return result('native-host', true, (await nativeRequest(gameId)) !== false);
        } catch {
            return result('native-host', true, false);
        }
    }

    const capacitorLock = windowRef.Capacitor?.Plugins?.ScreenOrientation?.lock;
    if (typeof capacitorLock === 'function') {
        try {
            await capacitorLock({ orientation: 'portrait' });
            return result('capacitor-plugin', true, true);
        } catch {
            return result('capacitor-plugin', true, false);
        }
    }

    const browserLock = windowRef.screen?.orientation?.lock;
    if (typeof browserLock === 'function') {
        try {
            await browserLock.call(windowRef.screen?.orientation, 'portrait');
            return result('screen-orientation', true, true);
        } catch {
            return result('screen-orientation', true, false);
        }
    }

    return result('unsupported', false, false);
};

export const releaseGamePortraitOrientation = async (
    windowRef: GameOrientationWindow,
    gameId: string,
): Promise<GameOrientationResult> => {
    const nativeRelease = windowRef.LAHSGameOrientationBridge?.releasePortrait;
    if (typeof nativeRelease === 'function') {
        try {
            return result('native-host', true, (await nativeRelease(gameId)) !== false);
        } catch {
            return result('native-host', true, false);
        }
    }

    const capacitorUnlock = windowRef.Capacitor?.Plugins?.ScreenOrientation?.unlock;
    if (typeof capacitorUnlock === 'function') {
        try {
            await capacitorUnlock();
            return result('capacitor-plugin', true, true);
        } catch {
            return result('capacitor-plugin', true, false);
        }
    }

    const browserUnlock = windowRef.screen?.orientation?.unlock;
    if (typeof browserUnlock === 'function') {
        try {
            await browserUnlock.call(windowRef.screen?.orientation);
            return result('screen-orientation', true, true);
        } catch {
            return result('screen-orientation', true, false);
        }
    }

    return result('unsupported', false, false);
};
