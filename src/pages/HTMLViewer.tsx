import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { findBaseModuleById } from '../data/moduleRegistry';
import { useSoundSettings } from '../context/SoundSettingsContext';
import { useTheme } from '../context/ThemeContext';
import { usePWA } from '../hooks/usePWA';
import type { WorksheetManifest, WorksheetManifestEntry, WorksheetManifestSubject } from '../types/worksheetManifest';
import { buildAssetPath } from '../utils/pathUtils';
import { teardownIframeElementWhenDisconnected } from '../utils/iframeLifecycle';
import { exitDocumentFullscreen, getFullscreenElement, requestElementFullscreen } from '../utils/fullscreen';
import { resumeIframeRuntime, syncIframeSoundSettings } from '../utils/iframeRuntime';
import {
    buildWorksheetViewerRoute,
    getWorksheetLookupAliases,
    migrateLegacyWorksheetPath,
} from '../utils/worksheetRoutes';
import './HTMLViewer.css';

type WorksheetScreen = 'home' | 'open' | 'create' | 'settings' | 'viewer';
type WorksheetLayoutMode = 'auto' | 'touch' | 'compact';

interface WorksheetSize {
    width: number;
    height: number;
}

interface WorksheetAppPreferences {
    uiScale: number;
    layoutMode: WorksheetLayoutMode;
    rememberLastSelection: boolean;
}

interface WorksheetSubjectGroup {
    slug: string;
    label: string;
    totalCount: number;
    entries: WorksheetManifestEntry[];
}

const WORKSHEET_MANIFEST_PATH = '/Worksheets/manifest.json';
const WORKSHEET_APP_PREFERENCES_KEY = 'lhs.worksheet-app.preferences.v1';
const WORKSHEET_LAST_SELECTED_STORAGE_KEY = 'lhs.worksheet-app.last-selected.v1';
const DEBUG_WORKSHEETS_QUERY_KEY = 'debugWorksheets';
const FALLBACK_WORKSHEET_SIZE: WorksheetSize = { width: 816, height: 1056 };
const FALLBACK_VIEWPORT_SIZE: WorksheetSize = { width: 816, height: 600 };
const MIN_VIEWPORT_FIT_MARGIN = 10;
const MAX_VIEWPORT_FIT_MARGIN = 24;
const MIN_EFFECTIVE_SCALE = 0.25;
const MAX_EFFECTIVE_SCALE = 6;
const DEFAULT_PREFERENCES: WorksheetAppPreferences = {
    uiScale: 100,
    layoutMode: 'auto',
    rememberLastSelection: true,
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const clampScale = (value: number): number => {
    if (!Number.isFinite(value) || value <= 0) {
        return 1;
    }

    return clamp(value, MIN_EFFECTIVE_SCALE, MAX_EFFECTIVE_SCALE);
};

const areSizesEqual = (left: WorksheetSize, right: WorksheetSize): boolean => (
    left.width === right.width && left.height === right.height
);

const getRectSize = (element: HTMLElement | null | undefined): WorksheetSize => {
    if (!element) {
        return { width: 0, height: 0 };
    }

    const rect = element.getBoundingClientRect();
    return {
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height),
    };
};

const getDocumentIntrinsicSize = (doc: Document): WorksheetSize => {
    const root = doc.documentElement as HTMLElement | null;
    const body = doc.body as HTMLElement | null;
    const rootRect = getRectSize(root);
    const bodyRect = getRectSize(body);

    const width = Math.max(
        FALLBACK_WORKSHEET_SIZE.width,
        root?.scrollWidth ?? 0,
        root?.offsetWidth ?? 0,
        root?.clientWidth ?? 0,
        body?.scrollWidth ?? 0,
        body?.offsetWidth ?? 0,
        body?.clientWidth ?? 0,
        rootRect.width,
        bodyRect.width,
    );

    const height = Math.max(
        FALLBACK_WORKSHEET_SIZE.height,
        root?.scrollHeight ?? 0,
        root?.offsetHeight ?? 0,
        root?.clientHeight ?? 0,
        body?.scrollHeight ?? 0,
        body?.offsetHeight ?? 0,
        body?.clientHeight ?? 0,
        rootRect.height,
        bodyRect.height,
    );

    return {
        width: Math.ceil(width),
        height: Math.ceil(height),
    };
};

const waitForStableWorksheetLayout = async (doc: Document): Promise<void> => {
    try {
        if ('fonts' in doc && doc.fonts?.ready) {
            await doc.fonts.ready;
        }
    } catch {
        // Ignore font readiness failures.
    }

    await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve());
        });
    });
};

const resetWorksheetViewport = (doc: Document): void => {
    const root = doc.documentElement;
    const body = doc.body;

    if (doc.activeElement instanceof HTMLElement && doc.activeElement !== body) {
        doc.activeElement.blur();
    }

    root.scrollTop = 0;
    root.scrollLeft = 0;

    if (body) {
        body.scrollTop = 0;
        body.scrollLeft = 0;
    }

    try {
        doc.defaultView?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {
        doc.defaultView?.scrollTo(0, 0);
    }
};

const getPanelViewportSize = (panel: HTMLDivElement | null): WorksheetSize => {
    if (!panel) {
        return FALLBACK_VIEWPORT_SIZE;
    }

    const panelStyles = window.getComputedStyle(panel);
    const paddingX = parseFloat(panelStyles.paddingLeft || '0') + parseFloat(panelStyles.paddingRight || '0');
    const paddingY = parseFloat(panelStyles.paddingTop || '0') + parseFloat(panelStyles.paddingBottom || '0');
    const innerWidth = Math.max(1, panel.clientWidth - paddingX);
    const innerHeight = Math.max(1, panel.clientHeight - paddingY);
    const fitMargin = clamp(
        Math.floor(Math.min(innerWidth, innerHeight) * 0.025),
        MIN_VIEWPORT_FIT_MARGIN,
        MAX_VIEWPORT_FIT_MARGIN,
    );

    return {
        width: Math.max(1, innerWidth - fitMargin * 2),
        height: Math.max(1, innerHeight - fitMargin * 2),
    };
};

const computeFitScale = (viewport: WorksheetSize, intrinsic: WorksheetSize): number => {
    if (viewport.width <= 0 || viewport.height <= 0 || intrinsic.width <= 0 || intrinsic.height <= 0) {
        return 1;
    }

    const scaleX = viewport.width / intrinsic.width;
    const scaleY = viewport.height / intrinsic.height;
    return clampScale(Math.min(scaleX, scaleY));
};

const isWorksheetScreen = (value: string | null): value is WorksheetScreen => (
    value === 'home'
    || value === 'open'
    || value === 'create'
    || value === 'settings'
    || value === 'viewer'
);

const isEnabledQueryFlag = (value: string | null): boolean => {
    if (!value) {
        return false;
    }

    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const readStoredPreferences = (): WorksheetAppPreferences => {
    if (typeof window === 'undefined') {
        return DEFAULT_PREFERENCES;
    }

    try {
        const raw = window.localStorage.getItem(WORKSHEET_APP_PREFERENCES_KEY);
        if (!raw) {
            return DEFAULT_PREFERENCES;
        }

        const parsed = JSON.parse(raw) as Partial<WorksheetAppPreferences>;
        const layoutMode = parsed.layoutMode === 'touch' || parsed.layoutMode === 'compact' ? parsed.layoutMode : 'auto';

        return {
            uiScale: clamp(Number(parsed.uiScale ?? DEFAULT_PREFERENCES.uiScale), 85, 125),
            layoutMode,
            rememberLastSelection: parsed.rememberLastSelection !== false,
        };
    } catch {
        return DEFAULT_PREFERENCES;
    }
};

const readStoredSelection = (): string => {
    if (typeof window === 'undefined') {
        return '';
    }

    try {
        return window.localStorage.getItem(WORKSHEET_LAST_SELECTED_STORAGE_KEY) ?? '';
    } catch {
        return '';
    }
};

const findWorksheetEntry = (
    subjects: WorksheetManifestSubject[],
    candidate: string | null | undefined,
): WorksheetManifestEntry | null => {
    const candidateAliases = new Set(getWorksheetLookupAliases(candidate));
    if (candidateAliases.size === 0) {
        return null;
    }

    for (const subject of subjects) {
        for (const entry of subject.entries) {
            const entryAliases = new Set<string>([
                ...getWorksheetLookupAliases(entry.launchPath),
                ...getWorksheetLookupAliases(entry.downloadPath),
                `${entry.subjectSlug}/${entry.slug}`.toLowerCase(),
                entry.slug.toLowerCase(),
            ]);

            for (const alias of candidateAliases) {
                if (entryAliases.has(alias)) {
                    return entry;
                }
            }
        }
    }

    return null;
};

const HTMLViewer: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const { shouldUseNativeFullscreenFallback } = usePWA();
    const { settings: soundSettings } = useSoundSettings();
    const [manifest, setManifest] = useState<WorksheetManifest | null>(null);
    const [isManifestLoading, setIsManifestLoading] = useState(true);
    const [manifestError, setManifestError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
    const [preferences, setPreferences] = useState<WorksheetAppPreferences>(readStoredPreferences);
    const [selectedBuilderSubject, setSelectedBuilderSubject] = useState('math');
    const [rememberedPath, setRememberedPath] = useState<string>(readStoredSelection);
    const [viewportSize, setViewportSize] = useState<WorksheetSize>(FALLBACK_VIEWPORT_SIZE);
    const [intrinsicSize, setIntrinsicSize] = useState<WorksheetSize>(FALLBACK_WORKSHEET_SIZE);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const viewerContainerRef = useRef<HTMLDivElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const measurementCleanupRef = useRef<(() => void) | null>(null);
    const scheduledMeasureRef = useRef<number | null>(null);
    const measurementTokenRef = useRef(0);
    const viewerOwnsNativeFullscreenRef = useRef(false);
    const previousScreenRef = useRef<WorksheetScreen | null>(null);

    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const currentSource = (queryParams.get('source') ?? '').trim().toLowerCase() === 'classroom'
        ? 'classroom'
        : null;
    const debugWorksheets = useMemo(
        () => isEnabledQueryFlag(queryParams.get(DEBUG_WORKSHEETS_QUERY_KEY)),
        [queryParams],
    );
    const openMode = (queryParams.get('open') ?? '').trim().toLowerCase();
    const requestedScreen = useMemo<WorksheetScreen | null>(() => {
        const nextScreen = queryParams.get('screen');
        return isWorksheetScreen(nextScreen) ? nextScreen : null;
    }, [queryParams]);
    const requestedWorksheetPath = useMemo(() => {
        const directPath = queryParams.get('path')
            ?? queryParams.get('worksheet')
            ?? queryParams.get('folder')
            ?? queryParams.get('file');

        if (directPath) {
            return migrateLegacyWorksheetPath(directPath);
        }

        const requestedId = (queryParams.get('id') ?? '').trim();
        if (!requestedId) {
            return '';
        }

        const item = findBaseModuleById(requestedId);
        return migrateLegacyWorksheetPath(item?.customHtmlPath);
    }, [queryParams]);

    const manifestSubjects = useMemo(
        () => manifest?.subjects ?? [],
        [manifest],
    );
    const rememberedEntry = useMemo(
        () => findWorksheetEntry(manifestSubjects, rememberedPath),
        [manifestSubjects, rememberedPath],
    );
    const activeEntry = useMemo(
        () => findWorksheetEntry(manifestSubjects, requestedWorksheetPath),
        [manifestSubjects, requestedWorksheetPath],
    );
    const logWorksheetDebug = useCallback((event: string, details: Record<string, unknown> = {}) => {
        if (!debugWorksheets) {
            return;
        }

        console.info('[WorksheetsDebug]', event, details);
    }, [debugWorksheets]);
    const withWorksheetDebugQuery = useCallback((route: string) => {
        if (!debugWorksheets) {
            return route;
        }

        const nextUrl = new URL(route, window.location.origin);
        nextUrl.searchParams.set(DEBUG_WORKSHEETS_QUERY_KEY, '1');
        return `${nextUrl.pathname}${nextUrl.search}`;
    }, [debugWorksheets]);
    const currentScreen: WorksheetScreen = useMemo(() => {
        if (activeEntry) {
            return 'viewer';
        }

        if (requestedScreen && requestedScreen !== 'viewer') {
            return requestedScreen;
        }

        if (openMode === 'browser') {
            return 'open';
        }

        return 'home';
    }, [activeEntry, openMode, requestedScreen]);
    const isViewerScreen = currentScreen === 'viewer' && Boolean(activeEntry);

    const fitScale = isViewerScreen
        ? clampScale(Math.min(viewportSize.width / Math.max(intrinsicSize.width, 1), 1))
        : computeFitScale(viewportSize, intrinsicSize);
    const scaledWorksheetWidth = intrinsicSize.width * fitScale;
    const scaledWorksheetHeight = intrinsicSize.height * fitScale;
    const stageWidth = isViewerScreen
        ? Math.max(viewportSize.width, Math.ceil(scaledWorksheetWidth))
        : viewportSize.width;
    const stageHeight = isViewerScreen
        ? Math.max(viewportSize.height, Math.ceil(scaledWorksheetHeight))
        : viewportSize.height;
    const paperOffsetX = Math.max(0, (stageWidth - scaledWorksheetWidth) / 2);
    const paperOffsetY = isViewerScreen ? 0 : Math.max(0, (stageHeight - scaledWorksheetHeight) / 2);

    const updateViewportSize = useCallback(() => {
        const nextViewport = getPanelViewportSize(panelRef.current);
        setViewportSize((currentViewport) => (areSizesEqual(currentViewport, nextViewport) ? currentViewport : nextViewport));
        return nextViewport;
    }, []);

    const cleanupWorksheetMeasurement = useCallback(() => {
        measurementCleanupRef.current?.();
        measurementCleanupRef.current = null;

        if (scheduledMeasureRef.current !== null) {
            window.cancelAnimationFrame(scheduledMeasureRef.current);
            scheduledMeasureRef.current = null;
        }
    }, []);

    const measureWorksheet = useCallback((doc: Document) => {
        const nextIntrinsicSize = getDocumentIntrinsicSize(doc);
        setIntrinsicSize((currentSize) => (areSizesEqual(currentSize, nextIntrinsicSize) ? currentSize : nextIntrinsicSize));
    }, []);

    const scheduleWorksheetMeasurement = useCallback((doc: Document) => {
        if (scheduledMeasureRef.current !== null) {
            return;
        }

        scheduledMeasureRef.current = window.requestAnimationFrame(() => {
            scheduledMeasureRef.current = null;
            measureWorksheet(doc);
        });
    }, [measureWorksheet]);

    const initializeWorksheetMeasurement = useCallback(async () => {
        cleanupWorksheetMeasurement();

        const iframe = iframeRef.current;
        const doc = iframe?.contentDocument;
        if (!iframe || !doc) {
            setIntrinsicSize(FALLBACK_WORKSHEET_SIZE);
            return;
        }

        const measurementToken = measurementTokenRef.current + 1;
        measurementTokenRef.current = measurementToken;

        resetWorksheetViewport(doc);
        await waitForStableWorksheetLayout(doc);

        if (measurementTokenRef.current !== measurementToken) {
            return;
        }

        resetWorksheetViewport(doc);
        measureWorksheet(doc);

        const root = doc.documentElement;
        const body = doc.body;
        const resizeObserver = new ResizeObserver(() => scheduleWorksheetMeasurement(doc));
        resizeObserver.observe(root);
        if (body) {
            resizeObserver.observe(body);
        }

        const mutationObserver = new MutationObserver(() => scheduleWorksheetMeasurement(doc));
        if (body) {
            mutationObserver.observe(body, {
                subtree: true,
                childList: true,
                attributes: true,
                characterData: true,
            });
        }

        const handleInnerResize = () => scheduleWorksheetMeasurement(doc);
        doc.defaultView?.addEventListener('resize', handleInnerResize);

        measurementCleanupRef.current = () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            doc.defaultView?.removeEventListener('resize', handleInnerResize);
        };
    }, [cleanupWorksheetMeasurement, measureWorksheet, scheduleWorksheetMeasurement]);

    const buildShellRoute = useCallback((screen: Exclude<WorksheetScreen, 'viewer'>) => {
        const params = new URLSearchParams();
        if (screen !== 'home') {
            params.set('screen', screen);
        }
        if (currentSource === 'classroom') {
            params.set('source', 'classroom');
        }
        if (debugWorksheets) {
            params.set(DEBUG_WORKSHEETS_QUERY_KEY, '1');
        }

        const query = params.toString();
        return query ? `/html-viewer?${query}` : '/html-viewer';
    }, [currentSource, debugWorksheets]);

    const goToScreen = useCallback((screen: Exclude<WorksheetScreen, 'viewer'>) => {
        navigate(buildShellRoute(screen));
    }, [buildShellRoute, navigate]);

    const openWorksheet = useCallback((entry: WorksheetManifestEntry) => {
        navigate(withWorksheetDebugQuery(buildWorksheetViewerRoute({
            path: entry.launchPath,
            screen: 'viewer',
            source: currentSource,
        })));
    }, [currentSource, navigate, withWorksheetDebugQuery]);

    const toggleSubject = useCallback((subjectSlug: string) => {
        setExpandedSubjects((currentSubjects) => {
            const nextSubjects = new Set(currentSubjects);
            if (nextSubjects.has(subjectSlug)) {
                nextSubjects.delete(subjectSlug);
            } else {
                nextSubjects.add(subjectSlug);
            }
            return nextSubjects;
        });
    }, []);

    const handleDownload = useCallback(async () => {
        if (!activeEntry) {
            return;
        }

        const safeFileName = `${activeEntry.slug.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}.html`;
        const downloadUrl = buildAssetPath(activeEntry.downloadPath);

        try {
            const response = await fetch(downloadUrl, { credentials: 'same-origin' });
            if (!response.ok) {
                throw new Error(`Download request failed with status ${response.status}`);
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = safeFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
            return;
        } catch {
            // Fall back to a direct download attempt.
        }

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = safeFileName;
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [activeEntry]);

    const handlePrint = useCallback(() => {
        if (!activeEntry) {
            return;
        }

        try {
            const frameWindow = iframeRef.current?.contentWindow;
            if (frameWindow) {
                frameWindow.focus();
                frameWindow.print();
                return;
            }
        } catch {
            // Fall through to popup printing.
        }

        const printUrl = buildAssetPath(activeEntry.launchPath);
        const printWindow = window.open(printUrl, '_blank', 'noopener,noreferrer');
        if (!printWindow) {
            return;
        }

        const triggerPrint = () => {
            try {
                printWindow.focus();
                printWindow.print();
            } catch {
                // Browser may block the fallback.
            }
        };

        printWindow.addEventListener('load', triggerPrint, { once: true });
        window.setTimeout(triggerPrint, 800);
    }, [activeEntry]);

    const handleFullscreenToggle = useCallback(() => {
        if (isFullscreen) {
            if (!shouldUseNativeFullscreenFallback) {
                viewerOwnsNativeFullscreenRef.current = false;
                setIsFullscreen(false);
                return;
            }

            if (getFullscreenElement() === viewerContainerRef.current) {
                void exitDocumentFullscreen().finally(() => {
                    viewerOwnsNativeFullscreenRef.current = false;
                    setIsFullscreen(false);
                });
                return;
            }

            viewerOwnsNativeFullscreenRef.current = false;
            setIsFullscreen(false);
            return;
        }

        if (!shouldUseNativeFullscreenFallback) {
            setIsFullscreen(true);
            return;
        }

        const rootElement = viewerContainerRef.current;
        if (!rootElement) {
            setIsFullscreen(true);
            return;
        }

        const fullscreenElement = getFullscreenElement();
        if (fullscreenElement && fullscreenElement !== rootElement) {
            setIsFullscreen(true);
            return;
        }

        void requestElementFullscreen(rootElement).then((ownsFullscreen) => {
            viewerOwnsNativeFullscreenRef.current = ownsFullscreen;
            setIsFullscreen(true);
        });
    }, [isFullscreen, shouldUseNativeFullscreenFallback]);

    const filteredSubjects = useMemo<WorksheetSubjectGroup[]>(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return manifestSubjects
            .map((subject) => {
                const subjectMatches = normalizedQuery.length > 0 && subject.label.toLowerCase().includes(normalizedQuery);
                const entries = normalizedQuery.length === 0
                    ? subject.entries
                    : subject.entries.filter((entry) => {
                        const searchIndex = `${entry.title} ${entry.slug} ${entry.subjectLabel}`.toLowerCase();
                        return subjectMatches || searchIndex.includes(normalizedQuery);
                    });

                return {
                    slug: subject.slug,
                    label: subject.label,
                    totalCount: subject.entries.length,
                    entries,
                };
            })
            .filter((subject) => subject.entries.length > 0 || normalizedQuery.length === 0);
    }, [manifestSubjects, searchQuery]);

    useEffect(() => {
        logWorksheetDebug('route-mount', {
            path: location.pathname,
            search: location.search,
            source: currentSource,
            requestedScreen,
            requestedWorksheetPath,
        });
    }, [currentSource, location.pathname, location.search, logWorksheetDebug, requestedScreen, requestedWorksheetPath]);

    useEffect(() => {
        let isActive = true;

        const loadManifest = async () => {
            setIsManifestLoading(true);
            setManifestError(null);
            logWorksheetDebug('manifest-load-start', {
                manifestPath: buildAssetPath(WORKSHEET_MANIFEST_PATH),
            });

            try {
                const response = await fetch(buildAssetPath(WORKSHEET_MANIFEST_PATH), {
                    credentials: 'same-origin',
                    cache: 'no-store',
                });

                if (!response.ok) {
                    throw new Error(`Manifest request failed with status ${response.status}`);
                }

                const nextManifest = await response.json() as WorksheetManifest;
                if (!isActive) {
                    return;
                }

                setManifest(nextManifest);
                logWorksheetDebug('manifest-load-success', {
                    generatedAt: nextManifest.generatedAt,
                    subjectCount: nextManifest.subjects.length,
                    worksheetCount: nextManifest.subjects.reduce((total, subject) => total + subject.entries.length, 0),
                });
            } catch (error) {
                if (!isActive) {
                    return;
                }

                setManifest(null);
                setManifestError(error instanceof Error ? error.message : 'Failed to load worksheets.');
                logWorksheetDebug('manifest-load-failure', {
                    error: error instanceof Error ? error.message : 'Failed to load worksheets.',
                });
            } finally {
                if (isActive) {
                    setIsManifestLoading(false);
                }
            }
        };

        void loadManifest();

        return () => {
            isActive = false;
        };
    }, [logWorksheetDebug]);

    useEffect(() => {
        logWorksheetDebug('worksheet-resolution', {
            currentScreen,
            requestedWorksheetPath,
            subjectCount: manifestSubjects.length,
            activeEntry: activeEntry
                ? {
                    slug: activeEntry.slug,
                    title: activeEntry.title,
                    launchPath: activeEntry.launchPath,
                    subjectSlug: activeEntry.subjectSlug,
                }
                : null,
        });
    }, [activeEntry, currentScreen, logWorksheetDebug, manifestSubjects.length, requestedWorksheetPath]);

    useEffect(() => {
        try {
            window.localStorage.setItem(WORKSHEET_APP_PREFERENCES_KEY, JSON.stringify(preferences));
        } catch {
            // Ignore storage failures.
        }
    }, [preferences]);

    useEffect(() => {
        if (!preferences.rememberLastSelection) {
            try {
                window.localStorage.removeItem(WORKSHEET_LAST_SELECTED_STORAGE_KEY);
            } catch {
                // Ignore storage failures.
            }
            setRememberedPath('');
        }
    }, [preferences.rememberLastSelection]);

    useEffect(() => {
        if (!activeEntry || !preferences.rememberLastSelection) {
            return;
        }

        try {
            window.localStorage.setItem(WORKSHEET_LAST_SELECTED_STORAGE_KEY, activeEntry.launchPath);
        } catch {
            // Ignore storage failures.
        }

        setRememberedPath(activeEntry.launchPath);
    }, [activeEntry, preferences.rememberLastSelection]);

    useEffect(() => {
        const previousScreen = previousScreenRef.current;
        if (currentScreen === 'open' && previousScreen !== 'open') {
            setExpandedSubjects((currentSubjects) => (currentSubjects.size === 0 ? currentSubjects : new Set()));
        }
        previousScreenRef.current = currentScreen;
    }, [currentScreen]);

    useEffect(() => {
        setExpandedSubjects((currentSubjects) => {
            if (currentSubjects.size === 0) {
                return currentSubjects;
            }

            const availableSubjects = new Set(filteredSubjects.map((subject) => subject.slug));
            const nextSubjects = new Set(
                [...currentSubjects].filter((subjectSlug) => availableSubjects.has(subjectSlug)),
            );

            return nextSubjects.size === currentSubjects.size ? currentSubjects : nextSubjects;
        });
    }, [filteredSubjects]);

    useEffect(() => {
        syncIframeSoundSettings(iframeRef.current, soundSettings);
    }, [soundSettings]);

    useEffect(() => {
        const iframe = iframeRef.current;
        return () => {
            teardownIframeElementWhenDisconnected(iframe, { reason: 'html-viewer-unmount' });
            if (iframeRef.current === iframe) {
                iframeRef.current = null;
            }
        };
    }, [activeEntry?.launchPath]);

    useEffect(() => {
        const panel = panelRef.current;
        if (!panel) {
            return;
        }

        updateViewportSize();

        const resizeObserver = new ResizeObserver(() => {
            updateViewportSize();
        });

        resizeObserver.observe(panel);

        const handleWindowResize = () => {
            updateViewportSize();
        };

        window.addEventListener('resize', handleWindowResize);
        window.addEventListener('orientationchange', handleWindowResize);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', handleWindowResize);
            window.removeEventListener('orientationchange', handleWindowResize);
        };
    }, [currentScreen, updateViewportSize]);

    useEffect(() => {
        if (!activeEntry) {
            return;
        }

        updateViewportSize();
    }, [activeEntry, isFullscreen, updateViewportSize]);

    useEffect(() => {
        if (!shouldUseNativeFullscreenFallback) {
            return;
        }

        const rootElement = viewerContainerRef.current;
        if (!rootElement) {
            return;
        }

        const syncFullscreenState = () => {
            const isViewerNativeFullscreen = document.fullscreenElement === rootElement;

            if (isViewerNativeFullscreen) {
                viewerOwnsNativeFullscreenRef.current = true;
                setIsFullscreen(true);
                return;
            }

            if (viewerOwnsNativeFullscreenRef.current) {
                viewerOwnsNativeFullscreenRef.current = false;
                setIsFullscreen(false);
            }
        };

        document.addEventListener('fullscreenchange', syncFullscreenState);
        return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
    }, [shouldUseNativeFullscreenFallback]);

    useEffect(() => {
        if (!isFullscreen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !shouldUseNativeFullscreenFallback) {
                setIsFullscreen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen, shouldUseNativeFullscreenFallback]);

    useEffect(() => {
        if (currentScreen !== 'viewer') {
            cleanupWorksheetMeasurement();
            setIntrinsicSize(FALLBACK_WORKSHEET_SIZE);
            if (!shouldUseNativeFullscreenFallback) {
                setIsFullscreen(false);
            }
        }
    }, [cleanupWorksheetMeasurement, currentScreen, shouldUseNativeFullscreenFallback]);

    useEffect(() => {
        return () => {
            cleanupWorksheetMeasurement();
        };
    }, [cleanupWorksheetMeasurement]);

    const viewerSrc = activeEntry ? buildAssetPath(activeEntry.launchPath) : '';

    useEffect(() => {
        if (currentScreen !== 'viewer') {
            return;
        }

        logWorksheetDebug('iframe-target', {
            viewerSrc,
            worksheetTitle: activeEntry?.title ?? null,
        });
    }, [activeEntry?.title, currentScreen, logWorksheetDebug, viewerSrc]);

    const appScaleStyle = useMemo(
        () => ({ '--worksheet-app-scale': `${preferences.uiScale / 100}` } as React.CSSProperties),
        [preferences.uiScale],
    );
    const selectedBuilderSubjectLabel = useMemo(
        () => manifestSubjects.find((subject) => subject.slug === selectedBuilderSubject)?.label ?? 'Math',
        [manifestSubjects, selectedBuilderSubject],
    );

    const builderMessage = selectedBuilderSubject === 'math'
        ? 'Launch the existing Math Worksheet Creator Studio to build new printable math pages today.'
        : `A guided ${selectedBuilderSubject.replace(/-/g, ' ')} worksheet builder will fit into this workspace next.`;

    return (
        <div
            className={`html-viewer-page theme-${theme} layout-${preferences.layoutMode} ${isFullscreen ? 'is-fullscreen' : ''}`}
            ref={viewerContainerRef}
            style={appScaleStyle}
        >
            <div className={`worksheet-app-shell ${isViewerScreen ? 'is-viewer-screen' : ''}`}>
                <header className={`worksheet-app-topbar ${isViewerScreen ? 'worksheet-app-topbar--viewer' : ''}`}>
                    <div className="worksheet-app-topbar__brand">
                        <span className="worksheet-app-topbar__eyebrow">
                            {isViewerScreen && activeEntry ? activeEntry.subjectLabel : 'STUDENT WORKSHEET HUB'}
                        </span>
                        {isViewerScreen ? (
                            <h1>{activeEntry?.title ?? 'Worksheet Viewer'}</h1>
                        ) : null}
                    </div>

                    <div className="worksheet-app-topbar__actions">
                        {isViewerScreen ? (
                            <button
                                type="button"
                                className="worksheet-secondary-link"
                                onClick={() => goToScreen('home')}
                            >
                                Main Menu
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className="worksheet-theme-button"
                            onClick={toggleTheme}
                            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        >
                            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                        </button>
                    </div>
                </header>
                {manifestError ? (
                    <section className="worksheet-app-error" aria-live="polite">
                        <h2>Worksheet library unavailable</h2>
                        <p>{manifestError}</p>
                        <button
                            type="button"
                            className="worksheet-primary-button"
                            onClick={() => window.location.reload()}
                        >
                            Retry
                        </button>
                    </section>
                ) : null}

                {!manifestError && currentScreen !== 'viewer' ? (
                    <main className="worksheet-app-content">
                        {currentScreen === 'home' ? (
                            <section className="worksheet-home">
                                <div className="worksheet-home__hero">
                                    <div className="worksheet-home__copy">
                                        <span className="worksheet-home__badge">Main Menu</span>
                                        <h2>Choose what you want to do</h2>
                                        <p>
                                            Open a worksheet, create a new one, or change your worksheet settings.
                                        </p>
                                    </div>

                                    <div className="worksheet-home__actions">
                                        <button type="button" className="worksheet-home-card worksheet-home-card--open" onClick={() => goToScreen('open')}>
                                            <span className="worksheet-home-card__label">Open Worksheets</span>
                                            <span className="worksheet-home-card__detail">Browse subjects and open a worksheet.</span>
                                        </button>
                                        <button type="button" className="worksheet-home-card worksheet-home-card--create" onClick={() => goToScreen('create')}>
                                            <span className="worksheet-home-card__label">Create Worksheets</span>
                                            <span className="worksheet-home-card__detail">Go to the worksheet builder.</span>
                                        </button>
                                        <button type="button" className="worksheet-home-card worksheet-home-card--settings" onClick={() => goToScreen('settings')}>
                                            <span className="worksheet-home-card__label">Settings</span>
                                            <span className="worksheet-home-card__detail">Change theme, size, and layout.</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="worksheet-home__summary-grid">
                                    <article className="worksheet-summary-card">
                                        <span className="worksheet-summary-card__eyebrow">Subjects Ready</span>
                                        <strong>{manifestSubjects.length}</strong>
                                        <p>Organized folders that can expand as you add more worksheet collections.</p>
                                    </article>
                                </div>

                                {preferences.rememberLastSelection && rememberedEntry ? (
                                    <section className="worksheet-home__recent">
                                        <div>
                                            <span className="worksheet-home__recent-label">Last worksheet</span>
                                            <h3>{rememberedEntry.title}</h3>
                                            <p>{rememberedEntry.subjectLabel}</p>
                                        </div>
                                        <button type="button" className="worksheet-secondary-button" onClick={() => openWorksheet(rememberedEntry)}>
                                            Open Last Worksheet
                                        </button>
                                    </section>
                                ) : null}
                            </section>
                        ) : null}

                        {currentScreen === 'open' ? (
                            <section className="worksheet-library">
                                <div className="worksheet-section-header">
                                    <div>
                                        <span className="worksheet-section-header__eyebrow">Choose a Subject</span>
                                        <h2>Pick a subject</h2>
                                        <p>Open a subject to see its worksheets.</p>
                                    </div>
                                    <button type="button" className="worksheet-secondary-button" onClick={() => goToScreen('home')}>
                                        Back Home
                                    </button>
                                </div>

                                <div className="worksheet-library__toolbar">
                                    <label className="worksheet-search-field">
                                        <span>Search worksheets</span>
                                        <input
                                            type="search"
                                            value={searchQuery}
                                            onChange={(event) => setSearchQuery(event.target.value)}
                                            placeholder="Search worksheet titles"
                                        />
                                    </label>
                                </div>

                                <div className="worksheet-library__subjects">
                                    {isManifestLoading ? (
                                        <div className="worksheet-empty-card">Loading worksheet subjects...</div>
                                    ) : filteredSubjects.length === 0 ? (
                                        <div className="worksheet-empty-card">No worksheets matched your search.</div>
                                    ) : filteredSubjects.map((subject) => {
                                        const isExpanded = expandedSubjects.has(subject.slug);
                                        return (
                                            <section key={subject.slug} className={`worksheet-subject-card ${isExpanded ? 'is-expanded' : ''}`} data-subject={subject.slug}>
                                                <button type="button" className="worksheet-subject-card__header" onClick={() => toggleSubject(subject.slug)} aria-expanded={isExpanded}>
                                                    <div>
                                                        <span className="worksheet-folder-pill">{subject.label}</span>
                                                        <h3>{subject.label}</h3>
                                                        <p>{subject.totalCount} worksheet{subject.totalCount === 1 ? '' : 's'} available</p>
                                                    </div>
                                                    <span className="worksheet-subject-card__toggle">{isExpanded ? 'Minimize' : 'Open'}</span>
                                                </button>

                                                {isExpanded ? (
                                                    <div className="worksheet-subject-card__entries">
                                                        {subject.entries.map((entry) => (
                                                            <button type="button" key={`${subject.slug}:${entry.slug}`} className="worksheet-entry-button" onClick={() => openWorksheet(entry)}>
                                                                <span className="worksheet-entry-button__title">{entry.title}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : null}
                                            </section>
                                        );
                                    })}
                                </div>
                            </section>
                        ) : null}

                        {currentScreen === 'create' ? (
                            <section className="worksheet-create">
                                <div className="worksheet-section-header">
                                    <div>
                                        <span className="worksheet-section-header__eyebrow">Builder Workspace</span>
                                        <h2>What subject are we covering on this new worksheet?</h2>
                                        <p>Select a subject now so this screen can grow into the full worksheet builder system later.</p>
                                    </div>
                                    <button type="button" className="worksheet-secondary-button" onClick={() => goToScreen('home')}>
                                        Back Home
                                    </button>
                                </div>

                                <div className="worksheet-create__grid">
                                    {manifestSubjects.map((subject) => (
                                        <button
                                            type="button"
                                            key={subject.slug}
                                            className={`worksheet-builder-card ${selectedBuilderSubject === subject.slug ? 'is-selected' : ''}`}
                                            onClick={() => setSelectedBuilderSubject(subject.slug)}
                                        >
                                            <span className="worksheet-builder-card__eyebrow">Subject</span>
                                            <strong>{subject.label}</strong>
                                            <p>{subject.entries.length} existing worksheet{subject.entries.length === 1 ? '' : 's'} in this folder</p>
                                        </button>
                                    ))}
                                </div>

                                <div className="worksheet-create__detail-card">
                                    <div>
                                        <span className="worksheet-create__detail-label">Selected Subject</span>
                                        <h3>{selectedBuilderSubjectLabel}</h3>
                                        <p>{builderMessage}</p>
                                    </div>

                                    <div className="worksheet-create__detail-actions">
                                        {selectedBuilderSubject === 'math' ? (
                                            <button type="button" className="worksheet-primary-button" onClick={() => navigate('/open/MathWorksheetCreator')}>
                                                Open Math Worksheet Creator Studio
                                            </button>
                                        ) : (
                                            <button type="button" className="worksheet-secondary-button" onClick={() => goToScreen('open')}>
                                                Browse Existing {selectedBuilderSubjectLabel}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </section>
                        ) : null}

                        {currentScreen === 'settings' ? (
                            <section className="worksheet-settings">
                                <div className="worksheet-section-header">
                                    <div>
                                        <span className="worksheet-section-header__eyebrow">Settings</span>
                                        <h2>Adjust the worksheet experience</h2>
                                        <p>These controls tune the worksheet app while reusing the platform theme system.</p>
                                    </div>
                                    <button type="button" className="worksheet-secondary-button" onClick={() => goToScreen('home')}>
                                        Back Home
                                    </button>
                                </div>

                                <div className="worksheet-settings__grid">
                                    <article className="worksheet-settings-card">
                                        <span className="worksheet-settings-card__eyebrow">Theme</span>
                                        <h3>{theme === 'light' ? 'Light mode active' : 'Dark mode active'}</h3>
                                        <p>Use the same global light and dark theme switch as the rest of the app.</p>
                                        <button type="button" className="worksheet-primary-button" onClick={toggleTheme}>
                                            Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
                                        </button>
                                    </article>

                                    <article className="worksheet-settings-card">
                                        <span className="worksheet-settings-card__eyebrow">UI Scaling</span>
                                        <h3>{preferences.uiScale}%</h3>
                                        <p>Increase or reduce the chrome size without changing worksheet print proportions.</p>
                                        <label className="worksheet-range-field">
                                            <span>Interface scale</span>
                                            <input type="range" min="85" max="125" step="5" value={preferences.uiScale} onChange={(event) => setPreferences((currentPreferences) => ({ ...currentPreferences, uiScale: clamp(Number(event.target.value), 85, 125) }))} />
                                        </label>
                                    </article>

                                    <article className="worksheet-settings-card">
                                        <span className="worksheet-settings-card__eyebrow">Responsiveness</span>
                                        <h3>Device behavior</h3>
                                        <p>Choose how roomy or touch-friendly the worksheet menus should feel across screens.</p>
                                        <div className="worksheet-choice-group">
                                            {([
                                                ['auto', 'Auto adapt'],
                                                ['touch', 'Touch-friendly'],
                                                ['compact', 'Compact library'],
                                            ] as const).map(([mode, label]) => (
                                                <button type="button" key={mode} className={`worksheet-choice-chip ${preferences.layoutMode === mode ? 'is-active' : ''}`} onClick={() => setPreferences((currentPreferences) => ({ ...currentPreferences, layoutMode: mode }))}>
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </article>

                                    <article className="worksheet-settings-card">
                                        <span className="worksheet-settings-card__eyebrow">Basic Preference</span>
                                        <h3>Remember last worksheet</h3>
                                        <p>Keep the most recently opened worksheet ready as a quick shortcut on the landing page.</p>
                                        <label className="worksheet-toggle-row">
                                            <span>{preferences.rememberLastSelection ? 'Enabled' : 'Disabled'}</span>
                                            <input type="checkbox" checked={preferences.rememberLastSelection} onChange={(event) => setPreferences((currentPreferences) => ({ ...currentPreferences, rememberLastSelection: event.target.checked }))} />
                                        </label>
                                    </article>
                                </div>
                            </section>
                        ) : null}
                    </main>
                ) : null}

                {!manifestError && currentScreen === 'viewer' ? (
                    <main className="worksheet-viewer">
                        <div className="worksheet-viewer__toolbar">
                            {activeEntry ? (
                                <div className="worksheet-viewer__toolbar-copy">
                                    <span className="worksheet-folder-pill">{activeEntry.subjectLabel}</span>
                                    <span className="worksheet-viewer__toolbar-title">{activeEntry.title}</span>
                                </div>
                            ) : null}
                            <div className="worksheet-viewer__toolbar-group">
                                <button type="button" className="worksheet-toolbar-button worksheet-toolbar-button--primary" onClick={() => goToScreen('home')}>Home</button>
                                <button type="button" className="worksheet-toolbar-button" onClick={handleDownload} disabled={!activeEntry}>Download</button>
                                <button type="button" className="worksheet-toolbar-button" onClick={handlePrint} disabled={!activeEntry}>Print</button>
                                <button type="button" className="worksheet-toolbar-button" onClick={handleFullscreenToggle} disabled={!activeEntry}>
                                    {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                                </button>
                            </div>
                        </div>

                        {activeEntry ? (
                            <>
                                <div className="worksheet-viewer__panel" ref={panelRef}>
                                    <div className="worksheet-viewer__stage" style={{ width: `${stageWidth}px`, height: `${stageHeight}px` }}>
                                        <div
                                            className="worksheet-viewer__paper"
                                            style={{
                                                width: `${scaledWorksheetWidth}px`,
                                                height: `${scaledWorksheetHeight}px`,
                                                left: `${paperOffsetX}px`,
                                                top: `${paperOffsetY}px`,
                                            }}
                                        >
                                            <iframe
                                                ref={iframeRef}
                                                src={viewerSrc}
                                                title={activeEntry.title}
                                                className="worksheet-viewer__iframe"
                                                style={{
                                                    width: `${intrinsicSize.width}px`,
                                                    height: `${intrinsicSize.height}px`,
                                                    transform: `scale(${fitScale})`,
                                                    transformOrigin: 'top left',
                                                }}
                                                allowFullScreen
                                                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
                                                onLoad={() => {
                                                    logWorksheetDebug('iframe-loaded', {
                                                        viewerSrc,
                                                        worksheetTitle: activeEntry.title,
                                                    });
                                                    resumeIframeRuntime(iframeRef.current, { reason: 'html-viewer-worksheet-load', soundSettings });
                                                    syncIframeSoundSettings(iframeRef.current, soundSettings);
                                                    void initializeWorksheetMeasurement();
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="worksheet-empty-card">Select a worksheet from the library to open it here.</div>
                        )}
                    </main>
                ) : null}
            </div>
        </div>
    );
};

export default HTMLViewer;
