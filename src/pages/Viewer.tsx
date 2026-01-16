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
        if (!isGame.current || !containerRef.current) return;

        try {
            const element = containerRef.current;
            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if ((element as any).webkitRequestFullscreen) {
                await (element as any).webkitRequestFullscreen();
            } else if ((element as any).mozRequestFullScreen) {
                await (element as any).mozRequestFullScreen();
            } else if ((element as any).msRequestFullscreen) {
                await (element as any).msRequestFullscreen();
            }
            setIsFullscreen(true);
        } catch (err) {
            console.log('Fullscreen error:', err);
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
        if (iframeRef.current && item?.customHtmlPath) {
            const htmlPath = buildAssetPath(item.customHtmlPath);
            // Only set src if it's different to avoid unnecessary reloads
            if (iframeRef.current.src !== htmlPath && !iframeRef.current.src.includes(htmlPath)) {
                console.log('Setting iframe src to:', htmlPath);
                iframeRef.current.src = htmlPath;
            }
        }
    }, [item, id]);

    if (!item) {
        return (
            <div className="empty-state">
                <p>Resource not found.</p>
                <button onClick={() => navigate('/')}>Go Home</button>
            </div>
        );
    }

    const renderContent = () => {
        // 1. Check for Local HTML Content (for games, tools, worksheets with customHtmlPath)
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
                        key={`${item.id}-${item.customHtmlPath}`}
                        src={htmlPath}
                        title={item.title}
                        allowFullScreen
                        className={`content-iframe ${isGameContent ? 'game-iframe' : ''}`}
                        allow="fullscreen; camera; microphone; geolocation"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                        onLoad={(e) => {
                            const iframe = e.currentTarget;
                            setIsLoading(false);
                            try {
                                // Prevent navigation inside iframe from affecting parent
                                if (iframe.contentWindow) {
                                    console.log('Iframe loaded successfully:', htmlPath, 'Current src:', iframe.src);
                                    
                                    // Verify the iframe loaded the correct content
                                    try {
                                        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                                        if (iframeDoc) {
                                            const title = iframeDoc.title || iframeDoc.querySelector('title')?.textContent;
                                            console.log('Iframe document title:', title);
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
                            if (isGameContent) {
                                setTimeout(() => {
                                    enterFullscreen();
                                }, 300); // Small delay for smooth transition
                            }
                        }}
                        onError={(e) => {
                            console.error('Iframe failed to load:', htmlPath, e);
                            setIsLoading(false);
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
