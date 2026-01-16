import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CONTENT_ITEMS } from '../data/mockContent';
import { buildAssetPath } from '../utils/pathUtils';
import './Viewer.css';

const ViewerPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const isGame = useRef(false);

    const item = useMemo(() => CONTENT_ITEMS.find(i => i.id === id), [id]);

    // Determine if this is a game
    useEffect(() => {
        isGame.current = item?.type === 'game' && !!item?.customHtmlPath;
    }, [item]);

    // Enter fullscreen for games
    const enterFullscreen = async () => {
        if (!isGame.current || !containerRef.current) {
            console.log('Fullscreen - Conditions not met:', { isGame: isGame.current, hasContainer: !!containerRef.current });
            return;
        }

        try {
            const element = containerRef.current;
            console.log('Attempting to enter fullscreen for:', item?.title);
            
            // Request fullscreen - this may require user gesture
            if (element.requestFullscreen) {
                await element.requestFullscreen();
                console.log('Fullscreen entered successfully (standard API)');
            } else if ((element as any).webkitRequestFullscreen) {
                await (element as any).webkitRequestFullscreen();
                console.log('Fullscreen entered successfully (webkit API)');
            } else if ((element as any).mozRequestFullScreen) {
                await (element as any).mozRequestFullScreen();
                console.log('Fullscreen entered successfully (moz API)');
            } else if ((element as any).msRequestFullscreen) {
                await (element as any).msRequestFullscreen();
                console.log('Fullscreen entered successfully (ms API)');
            } else {
                console.warn('Fullscreen API not supported');
                return;
            }
            
            // Don't set state here - let the fullscreenchange event handle it
            // This prevents state updates if fullscreen is blocked
        } catch (err: any) {
            // Fullscreen might be blocked by browser policy (requires user gesture)
            console.warn('Fullscreen error (may require user interaction):', err?.message || err);
            // Don't throw - just log and continue with game display
        }
    };

    // Exit fullscreen
    const exitFullscreen = async () => {
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
                await (document as any).webkitExitFullscreen();
            } else if ((document as any).mozCancelFullScreen) {
                await (document as any).mozCancelFullScreen();
            } else if ((document as any).msExitFullscreen) {
                await (document as any).msExitFullscreen();
            }
            setIsFullscreen(false);
        } catch (err) {
            console.log('Exit fullscreen error:', err);
        }
    };

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            const fullscreenElement = document.fullscreenElement || 
                (document as any).webkitFullscreenElement || 
                (document as any).mozFullScreenElement || 
                (document as any).msFullscreenElement;
            setIsFullscreen(!!fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);

    // Reset iframe when item changes
    useEffect(() => {
        setIsLoading(true);
        setIsFullscreen(false);
        
        if (!item) {
            return;
        }
        
        if (item.customHtmlPath && iframeRef.current) {
            const htmlPath = buildAssetPath(item.customHtmlPath);
            console.log('Viewer - Setting iframe src:', {
                id: item.id,
                title: item.title,
                type: item.type,
                customHtmlPath: item.customHtmlPath,
                builtPath: htmlPath,
                currentSrc: iframeRef.current.src
            });
            
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

    if (!item) {
        console.error('Viewer - Item not found:', { id, availableIds: CONTENT_ITEMS.map(i => i.id) });
        return (
            <div className="empty-state">
                <p>Resource not found for ID: {id}</p>
                <button onClick={() => navigate(-1)} className="back-btn">← Go Back</button>
                <button onClick={() => navigate('/')} style={{ marginLeft: '10px' }}>Go Home</button>
            </div>
        );
    }

    const renderContent = () => {
        // 1. Check for Local HTML Content (for games, tools, worksheets with customHtmlPath)
        if (!item.customHtmlPath) {
            console.warn('Viewer - Item has no customHtmlPath:', {
                id: item.id,
                title: item.title,
                type: item.type
            });
        }
        
        if (item.customHtmlPath) {
            // Use utility function to ensure paths work on both desktop and mobile
            const htmlPath = buildAssetPath(item.customHtmlPath);
            
            // Debug logging
            console.log('Viewer - Loading content:', {
                id: item.id,
                title: item.title,
                type: item.type,
                customHtmlPath: item.customHtmlPath,
                builtPath: htmlPath,
                baseUrl: import.meta.env.BASE_URL,
                isProd: import.meta.env.PROD
            });
            
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
                    {isGameContent && isFullscreen && (
                        <button 
                            className="exit-fullscreen-btn"
                            onClick={exitFullscreen}
                            aria-label="Exit Fullscreen"
                        >
                            ✕
                        </button>
                    )}
                    <iframe
                        ref={iframeRef}
                        key={`${item.id}-${Date.now()}`}
                        src={htmlPath}
                        title={item.title}
                        allowFullScreen
                        className={`content-iframe ${isGameContent ? 'game-iframe' : ''}`}
                        allow="fullscreen; camera; microphone; geolocation"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                        loading="eager"
                        onLoad={(e) => {
                            const iframe = e.currentTarget;
                            setIsLoading(false);
                            
                            try {
                                // Prevent navigation inside iframe from affecting parent
                                if (iframe.contentWindow) {
                                    const currentSrc = iframe.src || '';
                                    console.log('Iframe loaded successfully:', {
                                        htmlPath,
                                        currentSrc,
                                        isGame: isGameContent,
                                        iframeTitle: iframe.title
                                    });
                                    
                                    // Verify the iframe loaded the correct content
                                    try {
                                        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                                        if (iframeDoc) {
                                            const title = iframeDoc.title || iframeDoc.querySelector('title')?.textContent;
                                            console.log('Iframe document title:', title);
                                            
                                            // Check if iframe redirected (common cause of "going to main website")
                                            if (iframeDoc.location && iframeDoc.location.href !== htmlPath) {
                                                console.warn('Iframe may have redirected:', {
                                                    expected: htmlPath,
                                                    actual: iframeDoc.location.href
                                                });
                                            }
                                        }
                                    } catch (crossOriginErr) {
                                        // Expected for cross-origin or sandbox restrictions
                                        console.log('Cannot access iframe document (expected due to sandbox):', crossOriginErr);
                                    }
                                }
                            } catch (err) {
                                // Cross-origin restriction is expected and safe
                                console.log('Iframe loaded (cross-origin restrictions apply):', htmlPath);
                            }

                            // Auto-enter fullscreen for games after a smooth transition
                            if (isGameContent && isGame.current) {
                                // Use a longer delay to ensure iframe is fully loaded
                                setTimeout(() => {
                                    console.log('Entering fullscreen for game:', item.title);
                                    enterFullscreen().catch((err) => {
                                        console.warn('Fullscreen failed (may require user interaction):', err);
                                        // Don't block game loading if fullscreen fails
                                    });
                                }, 500); // Slightly longer delay for smooth transition
                            }
                        }}
                        onError={(e) => {
                            console.error('Iframe failed to load:', {
                                htmlPath,
                                itemId: item.id,
                                itemTitle: item.title,
                                itemType: item.type,
                                error: e,
                                iframeSrc: iframeRef.current?.src
                            });
                            setIsLoading(false);
                            // Don't navigate away on iframe error - just show error message
                        }}
                        style={{ display: 'block', width: '100%', height: '100%', border: 'none' }}
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
                    <button onClick={() => navigate(-1)} className="back-btn">← Back</button>
                    <div className="viewer-header">
                        <h1>{item.title}</h1>
                        <p>{item.description}</p>
                        <div className="tags">
                            {item.gradeLevels.map(g => <span key={g} className="tag">{g}</span>)}
                        </div>
                    </div>
                </>
            )}
            <div className="viewer-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default ViewerPage;
