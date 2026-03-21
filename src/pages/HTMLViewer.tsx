import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildAssetPath } from '../utils/pathUtils';
import { useSoundSettings } from '../context/SoundSettingsContext';
import { usePWA } from '../hooks/usePWA';
import { teardownIframeElementWhenDisconnected } from '../utils/iframeLifecycle';
import { exitDocumentFullscreen, getFullscreenElement, requestElementFullscreen } from '../utils/fullscreen';
import { resumeIframeRuntime, syncIframeSoundSettings } from '../utils/iframeRuntime';
import './HTMLViewer.css';

interface WorksheetFile {
    name: string;
    path: string;
    folder: string;
    title: string;
    description: string;
}

interface WorksheetFolder {
    name: string;
    path: string;
    files: WorksheetFile[];
}

interface WorksheetSize {
    width: number;
    height: number;
}

const buildWorksheetUrl = (folderName: string): string => {
    return buildAssetPath(`Worksheets/${folderName}/index.html`);
};

const KNOWN_WORKSHEET_FOLDERS = [
    '1minuteadditiontest', '1minutedivisiontest', '1minutemultiplicationtest', '1minutesubtractiontest',
    '2stepmathproblems', '2stepmathproblems-easy', '2stepmathproblems-hard',
    '30-addition-worksheet', '30-addition-worksheet-5s', '30-addition-worksheet-10s',
    '30-addsub-worksheet', '30-division-worksheet', '30-double-digit-addition-worksheet',
    '30-double-digit-addsub-worksheet', '30-double-digit-division-worksheet',
    '30-double-digit-multiplication-worksheet', '30-double-digit-subtraction-worksheet',
    '30-multiplication-worksheet', '30-multiplicationdivision-worksheet',
    '30-simple-substitution-worksheet', '30-subtraction-worksheet',
    '30-subtraction-worksheet-5s', '30-subtraction-worksheet-10s',
    'additionsubtractionmissing-substitution', 'countby2s', 'countby5s', 'countby10s',
    'countingoddnumbers', 'crosswordpuzzlegenerator', 'decimal-numbers-worksheet',
    'emptymultiplicationtable', 'extraeasyadditionmissingaddend', 'extraeasysubtractionmissingminuend',
    'fillintheblankartcalender', 'fillintheblankcalender', 'introduction-to-fractions-worksheet',
    'introtofractions', 'missingpattern8shape', 'missingpatterncountsheet',
    'missingpatterncountsheet-easy', 'missingpatterncountsheet-hard', 'missingpatternshape',
    'positive-negative-add-sub-worksheet', 'positivenegativesecretword', 'presidents-worksheet',
    'presidenttestfirst10', 'presidenttestlast15', 'simple-substitution10-worksheet',
    'simple-substitution16-additionworksheet', 'simple-substitution16-divisionworksheet',
    'simple-substitution16-mixaddsubworksheet', 'simple-substitution16-multiplicationworksheet',
    'simple-substitution16-subtractionworksheet', 'simple-substitution16-variablesworksheet',
    'simple-substitutionwordproblems', 'storytelling-elements-worksheet', 'substitutionsecretword',
    'uniquepatternworksheet', 'uniquepatternworksheeteasy', 'uniquepatternworksheethard',
    'uniquepatternworksheetmedium', 'us-states-word-bank'
] as const;

const FALLBACK_WORKSHEET_SIZE: WorksheetSize = {
    width: 816,
    height: 1056,
};

const FALLBACK_VIEWPORT_SIZE: WorksheetSize = {
    width: 816,
    height: 600,
};

const MIN_VIEWPORT_FIT_MARGIN = 8;
const MAX_VIEWPORT_FIT_MARGIN = 18;
const MIN_EFFECTIVE_SCALE = 0.25;
const MAX_EFFECTIVE_SCALE = 6;
const MIN_ZOOM_MULTIPLIER = 0.5;
const MAX_ZOOM_MULTIPLIER = 12;

const clamp = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
};

const clampScale = (value: number): number => {
    if (!Number.isFinite(value) || value <= 0) {
        return 1;
    }
    return clamp(value, MIN_EFFECTIVE_SCALE, MAX_EFFECTIVE_SCALE);
};

const clampZoomMultiplier = (value: number): number => {
    if (!Number.isFinite(value) || value <= 0) {
        return 1;
    }
    return clamp(value, MIN_ZOOM_MULTIPLIER, MAX_ZOOM_MULTIPLIER);
};

const areSizesEqual = (left: WorksheetSize, right: WorksheetSize): boolean => {
    return left.width === right.width && left.height === right.height;
};

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
        // Ignore font readiness failures and continue with fallback sizing.
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

const HTMLViewer: React.FC = () => {
    const navigate = useNavigate();
    const { shouldUseNativeFullscreenFallback } = usePWA();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<WorksheetFile | null>(null);
    const [showFileBrowser, setShowFileBrowser] = useState(false);
    const [folders, setFolders] = useState<WorksheetFolder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [viewportSize, setViewportSize] = useState<WorksheetSize>(FALLBACK_VIEWPORT_SIZE);
    const [intrinsicSize, setIntrinsicSize] = useState<WorksheetSize>(FALLBACK_WORKSHEET_SIZE);
    const [zoomMultiplier, setZoomMultiplier] = useState(1);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const viewerContainerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const measurementCleanupRef = useRef<(() => void) | null>(null);
    const scheduledMeasureRef = useRef<number | null>(null);
    const measurementTokenRef = useRef(0);
    const lastScrollResetKeyRef = useRef<string | null>(null);
    const viewerOwnsNativeFullscreenRef = useRef(false);
    const { settings: soundSettings } = useSoundSettings();

    const fitScale = computeFitScale(viewportSize, intrinsicSize);
    const effectiveScale = clampScale(fitScale * zoomMultiplier);
    const scaledWorksheetWidth = intrinsicSize.width * effectiveScale;
    const scaledWorksheetHeight = intrinsicSize.height * effectiveScale;
    const stageWidth = Math.max(viewportSize.width, scaledWorksheetWidth);
    const stageHeight = Math.max(viewportSize.height, scaledWorksheetHeight);
    const paperOffsetX = scaledWorksheetWidth < viewportSize.width ? (stageWidth - scaledWorksheetWidth) / 2 : 0;
    const paperOffsetY = scaledWorksheetHeight < viewportSize.height ? (stageHeight - scaledWorksheetHeight) / 2 : 0;

    const updateViewportSize = useCallback(() => {
        const nextViewport = getPanelViewportSize(panelRef.current);
        setViewportSize((currentViewport) => {
            return areSizesEqual(currentViewport, nextViewport) ? currentViewport : nextViewport;
        });
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
        setIntrinsicSize((currentSize) => {
            return areSizesEqual(currentSize, nextIntrinsicSize) ? currentSize : nextIntrinsicSize;
        });
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

        const enforceTopViewport = () => {
            resetWorksheetViewport(doc);
        };

        doc.defaultView?.addEventListener('load', enforceTopViewport);
        const resetTimers = [
            window.setTimeout(enforceTopViewport, 0),
            window.setTimeout(enforceTopViewport, 120),
            window.setTimeout(enforceTopViewport, 300),
        ];

        measurementCleanupRef.current = () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            doc.defaultView?.removeEventListener('resize', handleInnerResize);
            doc.defaultView?.removeEventListener('load', enforceTopViewport);
            resetTimers.forEach((timerId) => window.clearTimeout(timerId));
        };
    }, [cleanupWorksheetMeasurement, measureWorksheet, scheduleWorksheetMeasurement]);

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
    }, [selectedFile?.path]);

    const formatFolderName = (name: string): string => {
        return name
            .replace(/-/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    useEffect(() => {
        setIsLoading(true);

        const scannedFolders: WorksheetFolder[] = KNOWN_WORKSHEET_FOLDERS.map((folderName) => {
            const filePath = buildWorksheetUrl(folderName);
            const file: WorksheetFile = {
                name: 'index.html',
                path: filePath,
                folder: folderName,
                title: formatFolderName(folderName),
                description: 'Interactive worksheet',
            };

            return {
                name: folderName,
                path: buildAssetPath(`Worksheets/${folderName}`),
                files: [file],
            };
        });

        setFolders(scannedFolders.sort((left, right) => left.name.localeCompare(right.name)));
        setIsLoading(false);
    }, []);

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
    }, [updateViewportSize]);

    useEffect(() => {
        if (!selectedFile) {
            return;
        }

        updateViewportSize();
    }, [selectedFile, isFullscreen, updateViewportSize]);

    useEffect(() => {
        return () => {
            cleanupWorksheetMeasurement();
        };
    }, [cleanupWorksheetMeasurement]);

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
            if (event.key === 'Escape') {
                if (document.fullscreenElement === viewerContainerRef.current && document.exitFullscreen) {
                    void document.exitFullscreen().catch(() => setIsFullscreen(false));
                    return;
                }
                setIsFullscreen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    useEffect(() => {
        if (!selectedFile || !panelRef.current) {
            return;
        }

        const resetKey = `${selectedFile.path}|${intrinsicSize.width}x${intrinsicSize.height}`;
        if (lastScrollResetKeyRef.current === resetKey) {
            return;
        }

        lastScrollResetKeyRef.current = resetKey;

        window.requestAnimationFrame(() => {
            const panel = panelRef.current;
            if (!panel) {
                return;
            }

            const maxScrollLeft = Math.max(0, panel.scrollWidth - panel.clientWidth);
            panel.scrollLeft = maxScrollLeft / 2;
            panel.scrollTop = 0;
        });
    }, [selectedFile, intrinsicSize]);

    const handleZoomIn = useCallback(() => {
        setZoomMultiplier((currentZoom) => clampZoomMultiplier(currentZoom * 1.1));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoomMultiplier((currentZoom) => clampZoomMultiplier(currentZoom / 1.1));
    }, []);

    const handlePrint = useCallback(() => {
        if (!selectedFile) {
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
            // Fall through to popup-based print fallback.
        }

        const printWindow = window.open(selectedFile.path, '_blank', 'noopener,noreferrer');
        if (printWindow) {
            const triggerPrint = () => {
                try {
                    printWindow.focus();
                    printWindow.print();
                } catch {
                    // No-op: browser may block print in this fallback.
                }
            };

            printWindow.addEventListener('load', triggerPrint, { once: true });
            window.setTimeout(triggerPrint, 800);
        }
    }, [selectedFile]);

    const handleDownload = useCallback(async () => {
        if (!selectedFile) {
            return;
        }

        const safeFileName = `${selectedFile.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;

        try {
            const response = await fetch(selectedFile.path, { credentials: 'same-origin' });
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
            // Fall back to a direct URL download attempt.
        }

        const fallbackLink = document.createElement('a');
        fallbackLink.href = selectedFile.path;
        fallbackLink.download = safeFileName;
        fallbackLink.rel = 'noopener noreferrer';
        document.body.appendChild(fallbackLink);
        fallbackLink.click();
        document.body.removeChild(fallbackLink);
    }, [selectedFile]);

    const handleFileSelect = useCallback((file: WorksheetFile) => {
        cleanupWorksheetMeasurement();
        lastScrollResetKeyRef.current = null;
        setSelectedFile(file);
        setShowFileBrowser(false);
        setZoomMultiplier(1);
        setIntrinsicSize(FALLBACK_WORKSHEET_SIZE);
    }, [cleanupWorksheetMeasurement]);

    const toggleFolder = useCallback((folderName: string) => {
        setExpandedFolders((currentFolders) => {
            const nextFolders = new Set(currentFolders);
            if (nextFolders.has(folderName)) {
                nextFolders.delete(folderName);
            } else {
                nextFolders.add(folderName);
            }
            return nextFolders;
        });
    }, []);

    const enterFullscreen = useCallback(() => {
        if (!shouldUseNativeFullscreenFallback) {
            viewerOwnsNativeFullscreenRef.current = false;
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
            viewerOwnsNativeFullscreenRef.current = false;
            setIsFullscreen(true);
            return;
        }

        void requestElementFullscreen(rootElement).then((ownsFullscreen) => {
            viewerOwnsNativeFullscreenRef.current = ownsFullscreen;
            setIsFullscreen(true);
        });
    }, [shouldUseNativeFullscreenFallback]);

    const exitFullscreen = useCallback(() => {
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
    }, [shouldUseNativeFullscreenFallback]);

    const filteredFolders = folders.filter((folder) => {
        const normalizedQuery = searchQuery.toLowerCase();
        return folder.name.toLowerCase().includes(normalizedQuery)
            || folder.files.some((file) => file.title.toLowerCase().includes(normalizedQuery));
    });

    const stageStyle: React.CSSProperties = {
        width: `${stageWidth}px`,
        height: `${stageHeight}px`,
        minWidth: `${stageWidth}px`,
        minHeight: `${stageHeight}px`,
    };

    const paperShellStyle: React.CSSProperties = {
        width: `${scaledWorksheetWidth}px`,
        height: `${scaledWorksheetHeight}px`,
        left: `${paperOffsetX}px`,
        top: `${paperOffsetY}px`,
    };

    const iframeStyle: React.CSSProperties = {
        width: `${intrinsicSize.width}px`,
        height: `${intrinsicSize.height}px`,
        transform: `scale(${effectiveScale})`,
        transformOrigin: 'top left',
        background: 'white',
        border: 'none',
        margin: 0,
        padding: 0,
    };

    return (
        <div className={`html-viewer-page ${isFullscreen ? 'is-fullscreen' : ''}`} ref={viewerContainerRef}>
            <div className="html-viewer-container">
                <header className="html-viewer-header">
                    <button
                        className="open-worksheet-btn"
                        onClick={() => setShowFileBrowser(true)}
                        aria-label="Open Worksheet"
                    >
                        <span className="open-worksheet-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                        </span>
                        <span className="open-worksheet-text">Open Worksheet</span>
                    </button>

                    <div className="worksheet-info-panel">
                        {selectedFile ? (
                            <>
                                <p className="worksheet-title">"{selectedFile.title}"</p>
                                <p className="worksheet-description">{selectedFile.description}</p>
                            </>
                        ) : (
                            <>
                                <p className="worksheet-title">"No worksheet selected"</p>
                                <p className="worksheet-description">Click "Open Worksheet" to browse files</p>
                            </>
                        )}
                    </div>
                </header>

                <div className="html-viewer-toolbar">
                    <div className="zoom-control">
                        <button
                            className="zoom-btn zoom-out"
                            onClick={handleZoomOut}
                            disabled={!selectedFile}
                            aria-label="Zoom Out"
                            title="Zoom Out"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                        <span className="zoom-level">{Math.round(effectiveScale * 100)}%</span>
                        <button
                            className="zoom-btn zoom-in"
                            onClick={handleZoomIn}
                            disabled={!selectedFile}
                            aria-label="Zoom In"
                            title="Zoom In"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                    </div>

                    <div className="toolbar-actions">
                        <button
                            className="toolbar-action-btn home-btn"
                            onClick={() => navigate('/classroom')}
                            aria-label="Classroom"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            <span>Classroom</span>
                        </button>
                        <button
                            className="toolbar-action-btn print-btn"
                            onClick={handlePrint}
                            disabled={!selectedFile}
                            aria-label="Print"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 6 2 18 2 18 9" />
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                <rect width="12" height="8" x="6" y="14" />
                            </svg>
                            <span>Print</span>
                        </button>
                        <button
                            className="toolbar-action-btn download-btn"
                            onClick={handleDownload}
                            disabled={!selectedFile}
                            aria-label="Download"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" x2="12" y1="15" y2="3" />
                            </svg>
                            <span>Download</span>
                        </button>
                        <button
                            className="toolbar-action-btn fullscreen-btn"
                            onClick={enterFullscreen}
                            disabled={!selectedFile}
                            aria-label="Fullscreen"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                            </svg>
                            <span>Fullscreen</span>
                        </button>
                    </div>
                </div>

                <div className="html-viewer-panel" ref={panelRef}>
                    <button
                        className="exit-fullscreen-btn"
                        onClick={exitFullscreen}
                        aria-label="Exit Fullscreen"
                        title="Exit Fullscreen (Esc)"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                        </svg>
                        <span>Exit Fullscreen</span>
                    </button>

                    {selectedFile ? (
                        <div className="html-viewer-stage" style={stageStyle}>
                            <div className="html-viewer-paper-shell" style={paperShellStyle}>
                                <iframe
                                    ref={iframeRef}
                                    src={selectedFile.path}
                                    title={selectedFile.title}
                                    className="html-viewer-iframe"
                                    allowFullScreen
                                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
                                    style={iframeStyle}
                                    onLoad={() => {
                                        resumeIframeRuntime(iframeRef.current, {
                                            reason: 'html-viewer-load',
                                            soundSettings,
                                        });
                                        void initializeWorksheetMeasurement();
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="html-viewer-placeholder">
                            <p>HTML viewer display panel</p>
                        </div>
                    )}
                </div>
            </div>

            {showFileBrowser && (
                <div className="file-browser-overlay" onClick={() => setShowFileBrowser(false)}>
                    <div className="file-browser-panel" onClick={(event) => event.stopPropagation()}>
                        <div className="file-browser-header">
                            <h2>Select a Worksheet</h2>
                            <button
                                className="close-browser-btn"
                                onClick={() => setShowFileBrowser(false)}
                                aria-label="Close"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        <div className="file-browser-search">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search worksheets..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>

                        <div className="file-browser-content">
                            {isLoading ? (
                                <div className="file-browser-loading">
                                    <div className="loading-spinner"></div>
                                    <p>Loading worksheets...</p>
                                </div>
                            ) : filteredFolders.length === 0 ? (
                                <div className="file-browser-empty">
                                    <p>No worksheets found</p>
                                </div>
                            ) : (
                                <div className="folder-list">
                                    {filteredFolders.map((folder) => (
                                        <div key={folder.name} className="folder-item">
                                            <button
                                                className="folder-header"
                                                onClick={() => toggleFolder(folder.name)}
                                            >
                                                <span className={`folder-arrow ${expandedFolders.has(folder.name) ? 'expanded' : ''}`}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="9 18 15 12 9 6" />
                                                    </svg>
                                                </span>
                                                <span className="folder-icon">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                                    </svg>
                                                </span>
                                                <span className="folder-name">{formatFolderName(folder.name)}</span>
                                            </button>

                                            {expandedFolders.has(folder.name) && (
                                                <div className="folder-files">
                                                    {folder.files.map((file) => (
                                                        <button
                                                            key={file.path}
                                                            className={`file-item ${selectedFile?.path === file.path ? 'selected' : ''}`}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleFileSelect(file);
                                                            }}
                                                        >
                                                            <span className="file-icon">
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                                    <polyline points="14 2 14 8 20 8" />
                                                                </svg>
                                                            </span>
                                                            <span className="file-name">{file.title}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HTMLViewer;
