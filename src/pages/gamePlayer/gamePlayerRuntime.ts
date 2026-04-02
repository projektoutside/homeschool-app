import { buildAssetPath } from '../../utils/pathUtils';
import type { ContentItem } from '../../types/content';

export const buildGameLaunchPath = (
    item: Pick<ContentItem, 'customHtmlPath' | 'externalUrl'> | null | undefined,
    devCacheBust: string,
    isDev: boolean,
): string => {
    if (!item) {
        return '';
    }

    if (item.customHtmlPath) {
        const basePath = buildAssetPath(item.customHtmlPath);
        if (!isDev) {
            return basePath;
        }

        const separator = basePath.includes('?') ? '&' : '?';
        return `${basePath}${separator}dev=${devCacheBust}`;
    }

    if (item.externalUrl) {
        return item.externalUrl;
    }

    return '';
};

type StaminaLaunchEventIdOptions = {
    currentGameId: string | null;
    isGameItem: boolean;
    locationKey: string;
    pathname: string;
};

export const buildStaminaLaunchEventId = ({
    currentGameId,
    isGameItem,
    locationKey,
    pathname,
}: StaminaLaunchEventIdOptions): string | null => {
    if (!isGameItem || !currentGameId) {
        return null;
    }

    const safeLocationKey = locationKey && locationKey !== 'default'
        ? locationKey
        : `${pathname}:${currentGameId}`;
    return `launch:${currentGameId}:${safeLocationKey}`;
};

export const formatRechargeCountdown = (secondsUntilNextStamina: number): string => {
    const minutes = Math.floor(secondsUntilNextStamina / 60);
    const seconds = secondsUntilNextStamina % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};
