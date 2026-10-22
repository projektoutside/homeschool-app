import type { ContentItem } from '../../types/content';
import { buildAssetPath } from '../../utils/pathUtils';

const deriveThumbPathFromHtmlPath = (customHtmlPath?: string): string | null => {
    if (!customHtmlPath) return null;

    const match = customHtmlPath.match(/^(.*)\/index\.html$/i);
    if (!match) return null;

    return `${match[1]}/thumb.png`;
};

export const resolveItemIconPath = (item: Pick<ContentItem, 'thumbnail' | 'customHtmlPath'>): string | null => {
    if (item.thumbnail) {
        return buildAssetPath(item.thumbnail);
    }

    const derivedThumbPath = deriveThumbPathFromHtmlPath(item.customHtmlPath);
    return derivedThumbPath ? buildAssetPath(derivedThumbPath) : null;
};
