import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CONTENT_ITEMS } from '../data/mockContent';
import { buildAssetPath } from '../utils/pathUtils';
import { downloadFile } from '../utils/downloadUtils';
import type { FullscreenDocumentType, FullscreenHTMLElementType } from '../types/fullscreen';
import { usePWA } from '../hooks/usePWA';
import { PWAInstallModal } from '../components/PWAInstallModal';
import { useSoundSettings } from '../context/SoundSettingsContext';
import { applySoundSettingsToWindow } from '../utils/soundSettings';
import './Viewer.css';

const ViewerPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const viewerContainerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomScale, setZoomScale] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const item = useMemo(() => CONTENT_ITEMS.find(i => i.id === id), [id]);

    // Derived state - defined early for use in callbacks
    const isGameContent = item?.type === 'game';
    const isWorksheetContent = item?.type === 'worksheet';

    const { isInstallable, isInstalled, installPrompt, installContext } = usePWA();
    const { settings: soundSettings } = useSoundSettings();

    useEffect(() => {
        applySoundSettingsToWindow(iframeRef.current?.contentWindow, soundSettings);
    }, [soundSettings]);

    const handleInstallClick = useCallback(async () => {
        if (isInstalled) return;
        if (isInstallable) {
            await installPrompt();
        } else {
            setIsModalOpen(true);
        }
    }, [isInstallable, isInstalled, installPrompt]);

    const handleZoomIn = useCallback(() => {
        setZoomScale(prev => Math.min(prev * 1.2, 3));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoomScale(prev => Math.max(prev * 0.8, 0.5));
    }, []);

    const handleZoomReset = useCallback(() => {
        setZoomScale(1);
    }, []);

    const handlePrint = useCallback(() => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.print();
        }
    }, []);

    const enterFullscreen = useCallback(async () => {
        const element = viewerContainerRef.current;
        if (!element) return;
        try {
            const el = element as FullscreenHTMLElementType;
            if (el.requestFullscreen) await el.requestFullscreen();
            else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
            else if (el.mozRequestFullScreen) await el.mozRequestFullScreen();
            else if (el.msRequestFullscreen) await el.msRequestFullscreen();
        } catch {
            // ignore
        }
    }, []);

    const exitFullscreen = useCallback(async () => {
        try {
            const doc = document as FullscreenDocumentType;
            if (doc.exitFullscreen) await doc.exitFullscreen();
            else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
            else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
            else if (doc.msExitFullscreen) await doc.msExitFullscreen();
            setIsFullscreen(false);
        } catch {
            // ignore
        }
    }, []);

    // Auto-hide controls in fullscreen mode
    const resetControlsTimeout = useCallback(() => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (isFullscreen && isWorksheetContent) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    }, [isFullscreen, isWorksheetContent]);

    const handleMouseMove = useCallback(() => {
        if (isFullscreen && isWorksheetContent) {
            setShowControls(true);
            resetControlsTimeout();
        }
    }, [isFullscreen, isWorksheetContent, resetControlsTimeout]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const doc = document as FullscreenDocumentType;
            const fullscreenElement = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
            const isNowFullscreen = !!fullscreenElement;
            setIsFullscreen(isNowFullscreen);

            // Auto-show controls when entering fullscreen
            if (isNowFullscreen && isWorksheetContent) {
                setShowControls(true);
                resetControlsTimeout();
            }
        };
        const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
        events.forEach(e => document.addEventListener(e, handleFullscreenChange));
        return () => events.forEach(e => document.removeEventListener(e, handleFullscreenChange));
    }, [resetControlsTimeout, isWorksheetContent]);

    useEffect(() => {
        setIsLoading(true);
        setZoomScale(1);

        if (item?.customHtmlPath && iframeRef.current) {
            iframeRef.current.src = buildAssetPath(item.customHtmlPath);
        }
    }, [item]);

    const handleDownload = useCallback(async () => {
        if (!item) return;
        setIsDownloading(true);
        try {
            const url = item.downloadUrl || (item.customHtmlPath ? buildAssetPath(item.customHtmlPath) : item.externalUrl);
            if (!url) {
                alert('No download available');
                return;
            }
            const ext = url.toLowerCase().endsWith('.pdf') ? '.pdf' : '.html';
            const filename = `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}${ext}`;
            await downloadFile(url, filename);
        } catch {
            alert('Download failed');
        } finally {
            setIsDownloading(false);
        }
    }, [item]);

    if (!item) {
        return (
            <div className="empty-state">
                <p>Resource not found</p>
                <button onClick={() => navigate(-1)} className="back-btn">← Go Back</button>
            </div>
        );

    }

    const renderContent = () => {
        if (!item.customHtmlPath) {
            return (
                <div className="empty-state">
                    <p>No preview available</p>
                </div>
            );
        }

        const htmlPath = buildAssetPath(item.customHtmlPath);

        if (isGameContent) {
            return (
                <div className="game-viewport">
                    <div className={`loading-overlay ${!isLoading ? 'hidden' : ''}`}>
                        <div className="loading-spinner" />
                        <p className="loading-text">Loading Game...</p>
                    </div>
                    <button
                        className="fullscreen-toggle-btn"
                        onClick={isFullscreen ? exitFullscreen : enterFullscreen}
                        aria-label={isFullscreen ? "Minimize" : "Maximize"}
                    >
                        {isFullscreen ? '[]' : '[ ]'}
                    </button>
                    <iframe
                        ref={iframeRef}
                        src={htmlPath}
                        title={item.title}
                        className="game-frame"
                        allowFullScreen
                        sandbox="allow-scripts allow-forms allow-popups"
                        onLoad={() => {
                            setIsLoading(false);
                            applySoundSettingsToWindow(iframeRef.current?.contentWindow, soundSettings);
                        }}
                    />
                </div>
            );
        }

        // Worksheet view with inner container for proper zoom isolation
        return (
            <div className="worksheet-viewport">
                <div className={`loading-overlay ${!isLoading ? 'hidden' : ''}`}>
                    <div className="loading-spinner" />
                    <p className="loading-text">Loading Worksheet...</p>
                </div>
                <div className="worksheet-inner">
                    <iframe
                        ref={iframeRef}
                        src={htmlPath}
                        title={item.title}
                        className="worksheet-frame"
                        style={{
                            transform: `scale(${zoomScale})`,
                            transformOrigin: 'top center',
                            width: `${100 / zoomScale}%`,
                            minHeight: `${100 / zoomScale}%`,
                            transition: 'transform 0.2s ease-out'
                        }}
                        allowFullScreen
                        sandbox="allow-scripts"
                        onLoad={() => {
                            setIsLoading(false);
                            applySoundSettingsToWindow(iframeRef.current?.contentWindow, soundSettings);
                        }}
                    />
                </div>
            </div>
        );
    };

    // Worksheet fullscreen control panel
    const renderWorksheetFullscreenControls = () => {
        if (!isWorksheetContent || !isFullscreen) return null;

        return (
            <div
                className={`worksheet-fullscreen-controls ${showControls ? 'visible' : 'hidden'}`}
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={resetControlsTimeout}
            >
                <div className="worksheet-control-panel">
                    <div className="worksheet-info">
                        <h2 className="worksheet-title">{item.title}</h2>
                        <p className="worksheet-description">{item.description}</p>
                        <div className="worksheet-meta">
                            <span className="worksheet-subjects">{item.subjects.join(', ')}</span>
                            <span className="worksheet-grades">{item.gradeLevels.join(', ')}</span>
                        </div>
                    </div>
                    <div className="worksheet-actions">
                        <div className="worksheet-zoom-controls">
                            <button
                                onClick={handleZoomOut}
                                className="worksheet-zoom-btn"
                                title="Zoom Out"
                                aria-label="Zoom Out"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                    <path d="M8 11h6" />
                                </svg>
                            </button>
                            <span className="worksheet-zoom-level">{Math.round(zoomScale * 100)}%</span>
                            <button
                                onClick={handleZoomIn}
                                className="worksheet-zoom-btn"
                                title="Zoom In"
                                aria-label="Zoom In"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                    <path d="M11 8v6M8 11h6" />
                                </svg>
                            </button>
                            <button
                                onClick={handleZoomReset}
                                className="worksheet-zoom-btn reset"
                                title="Reset Zoom"
                                aria-label="Reset Zoom"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                    <path d="M3 3v5h5" />
                                </svg>
                            </button>
                        </div>
                        <button
                            onClick={handlePrint}
                            className="worksheet-action-btn print-btn"
                            title="Print Worksheet"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 6 2 18 2 18 9" />
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                <rect width="12" height="8" x="6" y="14" />
                            </svg>
                            <span>Print</span>
                        </button>
                        <button
                            onClick={handleDownload}
                            className={`worksheet-action-btn download-btn ${isDownloading ? 'downloading' : ''}`}
                            disabled={isDownloading}
                            title="Download Worksheet"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" x2="12" y1="15" y2="3" />
                            </svg>
                            <span>{isDownloading ? 'Saving...' : 'Save'}</span>
                        </button>
                        <button
                            onClick={exitFullscreen}
                            className="worksheet-action-btn exit-btn"
                            title="Exit Fullscreen"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
                            </svg>
                            <span>Exit</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div
            ref={viewerContainerRef}
            className={`viewer-page ${isGameContent ? 'game-viewer' : ''} ${isWorksheetContent ? 'worksheet-viewer' : ''} ${isFullscreen ? 'fullscreen-mode' : ''}`}
            onMouseMove={handleMouseMove}
        >
            {!isFullscreen && (
                <>
                    <button onClick={() => navigate(-1)} className="back-btn">← Back</button>
                    <header className="viewer-header">
                        <div className="viewer-header-title">
                            <h1>{item.title}</h1>
                            <div className="header-actions">
                                {isWorksheetContent && (
                                    <>
                                        <div className="zoom-controls">
                                            <button onClick={handleZoomOut} className="zoom-btn" title="Zoom Out">−</button>
                                            <span className="zoom-level">{Math.round(zoomScale * 100)}%</span>
                                            <button onClick={handleZoomIn} className="zoom-btn" title="Zoom In">+</button>
                                            <button onClick={handleZoomReset} className="zoom-btn reset" title="Reset">⤢</button>
                                        </div>
                                        <button onClick={handlePrint} className="print-btn-main">🖨️ Print</button>
                                    </>
                                )}
                                {isGameContent ? (
                                    <button
                                        onClick={handleInstallClick}
                                        className={`download-btn-main ${isInstalled ? 'installed' : ''}`}
                                        disabled={isInstalled}
                                    >
                                        {isInstalled ? '✓ Installed' : installContext.platform === 'console' ? '🎮 Install Unsupported' : '📱 Install App'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleDownload}
                                        className={`download-btn-main ${isDownloading ? 'downloading' : ''}`}
                                        disabled={isDownloading}
                                    >
                                        {isDownloading ? 'Saving...' : '💾 Download'}
                                    </button>
                                )}
                            </div>
                        </div>
                        <p>{item.description}</p>
                        <div className="tags">
                            {item.gradeLevels.map(g => <span key={g} className="tag">{g}</span>)}
                        </div>
                    </header>
                </>
            )}

            {renderWorksheetFullscreenControls()}

            <div className="viewer-content">
                {renderContent()}
            </div>
            {isGameContent && (
                <PWAInstallModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    platform={installContext.platform}
                />
            )}
        </div>
    );
};

export default ViewerPage;
