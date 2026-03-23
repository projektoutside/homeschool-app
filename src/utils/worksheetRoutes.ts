const WORKSHEET_ROOT_SEGMENT = 'worksheets';
const KNOWN_SUBJECTS = new Set(['math', 'ela', 'social-studies']);

const sanitizePathValue = (value: string | null | undefined): string => {
    if (!value) {
        return '';
    }

    let normalized = value.trim().replace(/\\/g, '/');
    if (!normalized) {
        return '';
    }

    try {
        if (/^https?:\/\//i.test(normalized)) {
            normalized = new URL(normalized).pathname;
        }
    } catch {
        // Ignore malformed paths and fall back to string normalization.
    }

    return normalized.split('?')[0]?.split('#')[0] ?? normalized;
};

export const migrateLegacyWorksheetPath = (value: string | null | undefined): string => {
    const normalized = sanitizePathValue(value);
    if (!normalized) {
        return '';
    }

    const leadingSlashPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
    const worksheetMatch = leadingSlashPath.match(/^\/Worksheets\/(.+)$/i);
    if (!worksheetMatch) {
        return leadingSlashPath;
    }

    const worksheetSuffix = worksheetMatch[1];
    const [subjectOrSlug] = worksheetSuffix.split('/');
    if (subjectOrSlug && KNOWN_SUBJECTS.has(subjectOrSlug.toLowerCase())) {
        return `/Worksheets/${worksheetSuffix}`;
    }

    return `/Worksheets/math/${worksheetSuffix}`;
};

export const normalizeWorksheetLookupValue = (value: string | null | undefined): string => {
    const migratedPath = migrateLegacyWorksheetPath(value);
    if (!migratedPath) {
        return '';
    }

    let normalized = migratedPath
        .replace(/^.*\/Worksheets\//i, '')
        .replace(/^\/?Worksheets\//i, '')
        .replace(/\/index\.html?$/i, '')
        .replace(/\.html?$/i, '')
        .replace(/^\/+|\/+$/g, '')
        .toLowerCase();

    if (!normalized) {
        return '';
    }

    if (normalized.startsWith(`${WORKSHEET_ROOT_SEGMENT}/`)) {
        normalized = normalized.slice(WORKSHEET_ROOT_SEGMENT.length + 1);
    }

    return normalized;
};

export const getWorksheetLookupAliases = (value: string | null | undefined): string[] => {
    const normalized = normalizeWorksheetLookupValue(value);
    if (!normalized) {
        return [];
    }

    const aliases = new Set<string>([normalized]);
    const segments = normalized.split('/').filter(Boolean);

    if (segments.length > 1 && KNOWN_SUBJECTS.has(segments[0])) {
        aliases.add(segments.slice(1).join('/'));
    }

    if (segments.length > 0) {
        aliases.add(segments[segments.length - 1]);
    }

    return Array.from(aliases);
};

type WorksheetViewerRouteOptions = {
    path?: string | null;
    screen?: 'home' | 'open' | 'create' | 'settings' | 'viewer';
    source?: string | null;
};

export const buildWorksheetViewerRoute = ({
    path,
    screen = 'viewer',
    source,
}: WorksheetViewerRouteOptions = {}): string => {
    const params = new URLSearchParams();

    if (screen) {
        params.set('screen', screen);
    }

    const migratedPath = migrateLegacyWorksheetPath(path);
    if (migratedPath) {
        params.set('path', migratedPath);
    }

    if (source) {
        params.set('source', source);
    }

    const query = params.toString();
    return query ? `/html-viewer?${query}` : '/html-viewer';
};
