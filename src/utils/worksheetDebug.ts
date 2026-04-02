export const DEBUG_WORKSHEETS_QUERY_KEY = 'debugWorksheets';

export const parseBooleanQueryFlag = (value: string | null): boolean => {
    if (!value) {
        return false;
    }

    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

export const appendWorksheetDebugQuery = (path: string, enabled: boolean): string => {
    if (!enabled || !path) {
        return path;
    }

    try {
        const nextUrl = new URL(path, window.location.origin);
        nextUrl.searchParams.set(DEBUG_WORKSHEETS_QUERY_KEY, '1');
        return `${nextUrl.pathname}${nextUrl.search}`;
    } catch {
        return path.includes('?')
            ? `${path}&${DEBUG_WORKSHEETS_QUERY_KEY}=1`
            : `${path}?${DEBUG_WORKSHEETS_QUERY_KEY}=1`;
    }
};
