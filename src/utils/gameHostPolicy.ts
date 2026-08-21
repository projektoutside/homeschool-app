export const ANIMAL_CHAMPION_GAME_ID = 'animal-champion';

export type GameHostPolicy = Readonly<{
    lockZoom: boolean;
    requiresNativeFullscreen: boolean;
    iframeAllow: string | undefined;
    allowFullScreen: boolean;
    iframeSandbox: string;
}>;

const DEFAULT_POLICY: GameHostPolicy = Object.freeze({
    lockZoom: true,
    requiresNativeFullscreen: true,
    iframeAllow: 'autoplay; fullscreen; camera; microphone; geolocation',
    allowFullScreen: true,
    iframeSandbox: 'allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation',
});

const ANIMAL_CHAMPION_POLICY: GameHostPolicy = Object.freeze({
    lockZoom: false,
    requiresNativeFullscreen: false,
    iframeAllow: 'microphone',
    allowFullScreen: false,
    iframeSandbox: 'allow-same-origin allow-scripts',
});

export const getGameHostPolicy = (gameId: string | null | undefined): GameHostPolicy =>
    gameId === ANIMAL_CHAMPION_GAME_ID ? ANIMAL_CHAMPION_POLICY : DEFAULT_POLICY;

export const getGameIdFromHostRoute = (pathname: string): string | null => {
    const match = pathname.match(/^\/(?:play|open)\/([^/]+)\/?$/);
    if (!match) {
        return null;
    }

    try {
        return decodeURIComponent(match[1]);
    } catch {
        return null;
    }
};

export const getGameHostPolicyForRoute = (pathname: string): GameHostPolicy =>
    getGameHostPolicy(getGameIdFromHostRoute(pathname));
