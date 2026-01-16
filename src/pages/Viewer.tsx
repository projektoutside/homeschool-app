import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CONTENT_ITEMS } from '../data/mockContent';
import { buildAssetPath } from '../utils/pathUtils';
import { downloadFile } from '../utils/downloadUtils';
import type { FullscreenDocumentType, FullscreenHTMLElementType } from '../types/fullscreen';
import './Viewer.css';

const ViewerPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const isGame = useRef(false);
    const hasAutoMaximized = useRef<string | null>(null);

    const item = useMemo(() => CONTENT_ITEMS.find(i => i.id === id), [id]);

    // Determine if this is a game
    useEffect(() => {
        isGame.current = item?.type === 'game' && !!item?.customHtmlPath;
    }, [item]);

    // Enter fullscreen for games
    const enterFullscreen = useCallback(async () => {
        if (!isGame.current || !containerRef.current) {
            return;
        }

        try {
            const element = containerRef.current as FullscreenHTMLElementType;

            // Request fullscreen - this may require user gesture
            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                await element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                await element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                await element.msRequestFullscreen();
            }

            // Don't set state here - let the fullscreenchange event handle it
            // This prevents state updates if fullscreen is blocked
        } catch (err: unknown) {
            // Fullscreen might be blocked by browser policy (requires user gesture)
            // Silently fail - fullscreen is a nice-to-have feature
        }
    }, []);

    // Exit fullscreen
    const exitFullscreen = useCallback(async () => {
        try {
            const doc = document as FullscreenDocumentType;
            if (doc.exitFullscreen) {
                await doc.exitFullscreen();
            } else if (doc.webkitExitFullscreen) {
                await doc.webkitExitFullscreen();
            } else if (doc.mozCancelFullScreen) {
                await doc.mozCancelFullScreen();
            } else if (doc.msExitFullscreen) {
                await doc.msExitFullscreen();
            }
            setIsFullscreen(false);
        } catch (err: unknown) {
            // Silently fail - exit fullscreen error is not critical
        }
    }, []);

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            const doc = document as FullscreenDocumentType;
            const fullscreenElement = doc.fullscreenElement ||
                doc.webkitFullscreenElement ||
                doc.mozFullScreenElement ||
                doc.msFullscreenElement;
            setIsFullscreen(!!fullscreenElement);
        };

        // Use all possible fullscreen event names for cross-browser support
        const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];

        events.forEach(eventName => {
            document.addEventListener(eventName, handleFullscreenChange);
        });

        return () => {
            events.forEach(eventName => {
                document.removeEventListener(eventName, handleFullscreenChange);
            });
        };
    }, []);

    // Reset iframe when item changes
    useEffect(() => {
        setIsLoading(true);
        setIsFullscreen(false);
        hasAutoMaximized.current = null;

        if (!item) {
            return;
        }

        if (item.customHtmlPath && iframeRef.current) {
            const htmlPath = buildAssetPath(item.customHtmlPath);

            // Always set the src to ensure it loads correctly, especially when item changes
            // Force a clean reload by clearing first
            const currentSrc = iframeRef.current.src;
            if (currentSrc === htmlPath || currentSrc.includes(htmlPath)) {
                // If already loading this path, clear and reload to ensure fresh load
                iframeRef.current.src = 'about:blank';
                setTimeout(() => {
                    if (iframeRef.current && item.id === id) {
                        iframeRef.current.src = htmlPath;
                    }
                }, 100);
            } else {
                // Directly set new path
                iframeRef.current.src = htmlPath;
            }
        } else if (iframeRef.current && !item.customHtmlPath) {
            // Clear iframe if no customHtmlPath
            iframeRef.current.src = 'about:blank';
            setIsLoading(false);
        }
    }, [item, id]);

    const handleDownload = useCallback(async () => {
        if (!item) return;

        setIsDownloading(true);
        try {
            // Priority: downloadUrl, then customHtmlPath, then externalUrl
            const downloadUrl = item.downloadUrl || (item.customHtmlPath ? buildAssetPath(item.customHtmlPath) : item.externalUrl);

            if (!downloadUrl) {
                alert('No download available for this item.');
                return;
            }

            // Generate a clean filename
            const extension = downloadUrl.toLowerCase().endsWith('.pdf') ? '.pdf' : '.html';
            const filename = `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}${extension}`;

            await downloadFile(downloadUrl, filename);
        } catch (error) {
            console.error('Download error:', error);
            alert('An error occurred while trying to download this resource.');
        } finally {
            setIsDownloading(false);
        }
    }, [item]);

    if (!item) {
        return (
            <div className="empty-state">
                <p>Resource not found for ID: {id}</p>
                <div className="empty-state-actions">
                    <button onClick={() => navigate(-1)} className="back-btn">← Go Back</button>
                    <button onClick={() => navigate('/')} className="home-btn">Go Home</button>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        if (item.customHtmlPath) {
            // Use utility function to ensure paths work on both desktop and mobile
            const htmlPath = buildAssetPath(item.customHtmlPath);
            const isGameContent = item.type === 'game';

            return (
                <div
                    ref={containerRef}
                    className={`iframe-container ${isGameContent ? 'game-container' : ''} ${isFullscreen ? 'fullscreen-active' : ''}`}
                >
                    <div className={`loading-overlay ${!isLoading ? 'hidden' : ''}`}>
                        <div className="loading-spinner"></div>
                        <p className="loading-text">Loading {isGameContent ? 'Game' : 'Content'}...</p>
                    </div>
                    {isGameContent && (
                        <button
                            className="fullscreen-toggle-btn"
                            onClick={isFullscreen ? exitFullscreen : enterFullscreen}
                            aria-label={isFullscreen ? "Minimize" : "Maximize"}
                            type="button"
                            title={isFullscreen ? "Minimize" : "Maximize"}
                        >
                            {isFullscreen ? (
                                <span className="minimize-icon" aria-hidden="true">[]</span>
                            ) : (
                                <span className="maximize-icon" aria-hidden="true">[ ]</span>
                            )}
                            <span className="sr-only">{isFullscreen ? "Minimize" : "Maximize"}</span>
                        </button>
                    )}
                    <iframe
                        ref={iframeRef}
                        key={item.id}
                        src={htmlPath}
                        title={item.title}
                        allowFullScreen
                        className={`content-iframe ${isGameContent ? 'game-iframe' : ''}`}
                        allow="fullscreen; camera; microphone; geolocation"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                        loading="eager"
                        onLoad={() => {
                            setIsLoading(false);

                            // Automatically maximize when game loads, but only once per item
                            if (isGameContent && hasAutoMaximized.current !== item.id) {
                                hasAutoMaximized.current = item.id;
                                setTimeout(() => {
                                    enterFullscreen().catch(() => {
                                        // Silently fail if blocked by browser policy
                                    });
                                }, 300);
                            }
                        }}
                        onError={() => {
                            setIsLoading(false);
                            // Don't navigate away on iframe error - error is already handled by loading state
                        }}
                    />
                </div>
            );
        }

        switch (item.type) {
            case 'game':
                // Placeholder for game component logic (only for games without customHtmlPath)
                return (
                    <div className="game-container">
                        <div className="placeholder-game">
                            <span className="game-icon">🎮</span>
                            <h3>{item.title} - Game Wrapper</h3>
                            <p>Game Component: {item.componentName}</p>
                            <p>In a real implementation, the specific React component would dynamically load here.</p>
                        </div>
                    </div>
                );
            case 'tool':
                if (item.externalUrl) {
                    return (
                        <div className="iframe-container">
                            <iframe
                                key={item.id}
                                src={item.externalUrl}
                                title={item.title}
                                allowFullScreen
                                className="content-iframe"
                                allow="fullscreen; camera; microphone; geolocation"
                                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"
                            />
                        </div>
                    );
                }
                // Tool without externalUrl or customHtmlPath - show placeholder
                return <div className="placeholder-tool">Tool component not found</div>;
            case 'worksheet':
            case 'resource':
                return (
                    <div className="resource-container">
                        <div className="pdf-preview">
                            <span>📄 Preview of {item.title}</span>
                        </div>
                        <div className="resource-actions">
                            {item.downloadUrl ? (
                                <a href={item.downloadUrl} className="download-btn" target="_blank" rel="noopener noreferrer">
                                    Download PDF
                                </a>
                            ) : (
                                <button className="download-btn" disabled>Download Unavailable</button>
                            )}
                        </div>
                    </div>
                );
            default:
                return <div>Unknown content type</div>;
        }
    };

    const isGameContent = item?.type === 'game';

    return (
        <div className={`viewer-page ${isGameContent ? 'game-viewer' : ''} ${isFullscreen ? 'fullscreen-mode' : ''}`}>
            {!isFullscreen && (
                <>
                    <button
                        onClick={() => navigate(-1)}
                        className="back-btn"
                        aria-label="Go back to previous page"
                        type="button"
                    >
                        <span aria-hidden="true">←</span> Back
                    </button>
                    <header className="viewer-header">
                        <div className="viewer-header-title">
                            <h1>{item.title}</h1>
                            <button
                                onClick={handleDownload}
                                className={`download-btn-main ${isDownloading ? 'downloading' : ''}`}
                                disabled={isDownloading}
                                title="Download for offline use"
                            >
                                {isDownloading ? (
                                    <>
                                        <span className="spinner-sm"></span>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <span className="icon">💾</span>
                                        Download
                                    </>
                                )}
                            </button>
                        </div>
                        <p>{item.description}</p>
                        <div className="tags" role="list">
                            {item.gradeLevels.map(g => (
                                <span key={g} className="tag" role="listitem">
                                    {g}
                                </span>
                            ))}
                        </div>
                    </header>
                </>
            )}
            <div className="viewer-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default ViewerPage;
