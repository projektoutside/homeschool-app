import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildAssetPath } from '../utils/pathUtils';
import { useSoundSettings } from '../context/SoundSettingsContext';
import { applySoundSettingsToWindow } from '../utils/soundSettings';
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

// Build URL for worksheet files that works with GitHub Pages base URL
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

const WORKSHEET_BASE_WIDTH = 816;
const WORKSHEET_BASE_HEIGHT = 1056;

const clampScale = (value: number, min = 0.25, max = 6): number => {
    if (!Number.isFinite(value) || value <= 0) return 1;
    return Math.max(min, Math.min(max, value));
};

const computeFitScale = (availableWidth: number, availableHeight: number): number => {
    if (!Number.isFinite(availableWidth) || !Number.isFinite(availableHeight) || availableWidth <= 0 || availableHeight <= 0) {
        return 1;
    }
    const scaleX = availableWidth / WORKSHEET_BASE_WIDTH;
    const scaleY = availableHeight / WORKSHEET_BASE_HEIGHT;
    return clampScale(Math.min(scaleX, scaleY));
};

const HTMLViewer: React.FC = () => {
    const navigate = useNavigate();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fullscreenScale, setFullscreenScale] = useState(1);
    const [zoomScale, setZoomScale] = useState(1);
    const [selectedFile, setSelectedFile] = useState<WorksheetFile | null>(null);
    const [showFileBrowser, setShowFileBrowser] = useState(false);
    const [folders, setFolders] = useState<WorksheetFolder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const viewerContainerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const { settings: soundSettings } = useSoundSettings();

    useEffect(() => {
        applySoundSettingsToWindow(iframeRef.current?.contentWindow, soundSettings);
    }, [soundSettings]);

    // Format folder name for display
    const formatFolderName = (name: string): string => {
        return name
            .replace(/-/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    // Build worksheet entries from the known static folder set to avoid
    // runtime probing requests that can stall lower-end devices.
    useEffect(() => {
        setIsLoading(true);

        const scannedFolders: WorksheetFolder[] = KNOWN_WORKSHEET_FOLDERS.map((folderName) => {
            const filePath = buildWorksheetUrl(folderName);
            const file: WorksheetFile = {
                name: 'index.html',
                path: filePath,
                folder: folderName,
                title: formatFolderName(folderName),
                description: 'Interactive worksheet'
            };

            return {
                name: folderName,
                path: buildAssetPath(`Worksheets/${folderName}`),
                files: [file]
            };
        });

        setFolders(scannedFolders.sort((a, b) => a.name.localeCompare(b.name)));
        setIsLoading(false);
    }, []);

    const handleZoomIn = useCallback(() => {
        setZoomScale(prev => Math.min(prev * 1.1, 3));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoomScale(prev => Math.max(prev * 0.9, 0.5));
    }, []);

    const handlePrint = useCallback(() => {
        if (!selectedFile) return;

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
        if (!selectedFile) return;
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
            // Fallback: direct URL download attempt.
        }

        const fallbackLink = document.createElement('a');
        fallbackLink.href = selectedFile.path;
        fallbackLink.download = safeFileName;
        fallbackLink.rel = 'noopener noreferrer';
        document.body.appendChild(fallbackLink);
        fallbackLink.click();
        document.body.removeChild(fallbackLink);
    }, [selectedFile]);

    // Calculate auto-fit scale for standard view
    const calculatePanelFit = useCallback(() => {
        if (!panelRef.current) return 1;

        const panelRect = panelRef.current.getBoundingClientRect();
        const horizontalInset = 10;
        const verticalInset = 10;
        const availableWidth = Math.max(1, panelRect.width - horizontalInset * 2);
        const availableHeight = Math.max(1, panelRect.height - verticalInset * 2);
        return computeFitScale(availableWidth, availableHeight);
    }, []);

    const handleFileSelect = useCallback((file: WorksheetFile) => {
        setSelectedFile(file);
        setShowFileBrowser(false);
        setTimeout(() => {
            setZoomScale(calculatePanelFit());
        }, 50);
    }, [calculatePanelFit]);

    // Update scale on window resize
    useEffect(() => {
        const handleResize = () => {
            if (!isFullscreen && selectedFile) {
                setZoomScale(calculatePanelFit());
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isFullscreen, selectedFile, calculatePanelFit]);

    useEffect(() => {
        if (!selectedFile || !panelRef.current) return;

        const observer = new ResizeObserver(() => {
            const panel = panelRef.current;
            if (!panel) return;

            if (isFullscreen) {
                const rect = panel.getBoundingClientRect();
                const fitScale = computeFitScale(rect.width, rect.height);
                setFullscreenScale(fitScale);
            } else {
                setZoomScale(calculatePanelFit());
            }
        });

        observer.observe(panelRef.current);
        return () => observer.disconnect();
    }, [selectedFile, isFullscreen, calculatePanelFit]);

    const toggleFolder = useCallback((folderName: string) => {
        setExpandedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folderName)) {
                newSet.delete(folderName);
            } else {
                newSet.add(folderName);
            }
            return newSet;
        });
    }, []);

    const filteredFolders = folders.filter(folder => {
        const matchesSearch = folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            folder.files.some(file => file.title.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
    });

    // Calculate perfect fit scale when in fullscreen
    useEffect(() => {
        if (!isFullscreen) return;

        const calculateFitScale = () => {
            if (panelRef.current) {
                const panelRect = panelRef.current.getBoundingClientRect();
                setFullscreenScale(computeFitScale(panelRect.width, panelRect.height));
                return;
            }
            const screenWidth = window.innerWidth || 1024;
            const screenHeight = window.innerHeight || 768;
            setFullscreenScale(computeFitScale(screenWidth, screenHeight));
        };

        const timer = setTimeout(calculateFitScale, 50);

        window.addEventListener('resize', calculateFitScale);
        return () => {
            window.removeEventListener('resize', calculateFitScale);
            clearTimeout(timer);
        };
    }, [isFullscreen]);

    useEffect(() => {
        const rootElement = viewerContainerRef.current;
        if (!rootElement) return;

        const syncFullscreenState = () => {
            const isNativeFullscreen = document.fullscreenElement === rootElement;
            setIsFullscreen(isNativeFullscreen);
        };

        document.addEventListener('fullscreenchange', syncFullscreenState);
        return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
    }, []);

    const enterFullscreen = useCallback(() => {
        const rootElement = viewerContainerRef.current;
        if (!rootElement) {
            setIsFullscreen(true);
            return;
        }

        if (rootElement.requestFullscreen) {
            void rootElement.requestFullscreen()
                .then(() => setIsFullscreen(true))
                .catch(() => setIsFullscreen(true));
            return;
        }

        setIsFullscreen(true);
    }, []);

    const exitFullscreen = useCallback(() => {
        if (document.fullscreenElement && document.exitFullscreen) {
            void document.exitFullscreen()
                .then(() => setIsFullscreen(false))
                .catch(() => setIsFullscreen(false));
            return;
        }
        setIsFullscreen(false);
    }, []);

    useEffect(() => {
        if (!isFullscreen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                exitFullscreen();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen, exitFullscreen]);

    useEffect(() => {
        if (!selectedFile || isFullscreen) return;
        setZoomScale(calculatePanelFit());
    }, [selectedFile, isFullscreen, calculatePanelFit]);

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
                            aria-label="Zoom Out"
                            title="Zoom Out"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                        <span className="zoom-level">{Math.round(zoomScale * 100)}%</span>
                        <button
                            className="zoom-btn zoom-in"
                            onClick={handleZoomIn}
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
                            onClick={() => navigate('/')}
                            aria-label="Home"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            <span>Home</span>
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
                            aria-label="Fullscreen"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                            </svg>
                            <span>Fullscreen</span>
                        </button>
                    </div>
                </div>

                <div className="worksheet-viewer-panel" ref={panelRef}>
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
                        <div
                            className="worksheet-content-wrapper"
                            style={isFullscreen ? {
                                transform: `scale(${fullscreenScale})`,
                                transformOrigin: 'center center',
                            } : {
                                width: `${WORKSHEET_BASE_WIDTH * zoomScale}px`,
                                height: `${WORKSHEET_BASE_HEIGHT * zoomScale}px`,
                                position: 'relative',
                                display: 'block'
                            }}
                        >
                            <iframe
                                ref={iframeRef}
                                src={selectedFile.path}
                                title={selectedFile.title}
                                className="worksheet-iframe"
                                allowFullScreen
                                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
                                style={isFullscreen ? {
                                    background: 'white'
                                } : {
                                    background: 'white',
                                    width: `${WORKSHEET_BASE_WIDTH}px`,
                                    height: `${WORKSHEET_BASE_HEIGHT}px`,
                                    transform: `scale(${zoomScale})`,
                                    transformOrigin: 'top left',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    border: 'none'
                                }}
                                onLoad={() => {
                                    applySoundSettingsToWindow(iframeRef.current?.contentWindow, soundSettings);
                                }}
                            />
                        </div>
                    ) : (
                        <div className="worksheet-placeholder">
                            <p>HTML viewer display panel</p>
                        </div>
                    )}
                </div>
            </div>

            {showFileBrowser && (
                <div className="file-browser-overlay" onClick={() => setShowFileBrowser(false)}>
                    <div className="file-browser-panel" onClick={e => e.stopPropagation()}>
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
                                onChange={(e) => setSearchQuery(e.target.value)}
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
                                    {filteredFolders.map(folder => (
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
                                                    {folder.files.map(file => (
                                                        <button
                                                            key={file.path}
                                                            className={`file-item ${selectedFile?.path === file.path ? 'selected' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
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
