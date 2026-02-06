import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CONTENT_ITEMS } from '../data/mockContent';
import { buildAssetPath } from '../utils/pathUtils';
import type { FullscreenDocumentType, FullscreenHTMLElementType } from '../types/fullscreen';
import './GamePlayer.css';

const GamePlayer: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const item = useMemo(() => CONTENT_ITEMS.find(content => content.id === id), [id]);
    const launchPath = useMemo(() => {
        if (!item) return '';
        if (item.customHtmlPath) return buildAssetPath(item.customHtmlPath);
        if (item.externalUrl) return item.externalUrl;
        return '';
    }, [item]);

    const isImmersiveType = item?.type === 'game' || item?.type === 'worksheet' || item?.type === 'tool';

    const enterFullscreen = useCallback(async () => {
        if (!containerRef.current) return;

        const element = containerRef.current as FullscreenHTMLElementType;
        try {
            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                await element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                await element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                await element.msRequestFullscreen();
            }
        } catch {
            // Browser may block auto fullscreen without user gesture.
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const doc = document as FullscreenDocumentType;
            const fullscreenElement =
                doc.fullscreenElement ||
                doc.webkitFullscreenElement ||
                doc.mozFullScreenElement ||
                doc.msFullscreenElement;
            setIsFullscreen(!!fullscreenElement);
        };

        const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
        events.forEach(eventName => document.addEventListener(eventName, handleFullscreenChange));

        return () => {
            events.forEach(eventName => document.removeEventListener(eventName, handleFullscreenChange));
        };
    }, []);

    useEffect(() => {
        if (!item || !isImmersiveType || !launchPath) {
            navigate(item ? `/resource/${item.id}` : '/', { replace: true });
        }
    }, [item, isImmersiveType, launchPath, navigate]);

    if (!item || !isImmersiveType || !launchPath) {
        return null;
    }

    return (
        <div className="game-player-shell" ref={containerRef}>
            <button type="button" className="game-player-exit" onClick={() => navigate('/')} aria-label="Exit game">
                Exit
            </button>

            {!isFullscreen && (
                <button
                    type="button"
                    className="game-player-fullscreen-prompt"
                    onClick={enterFullscreen}
                    aria-label="Enter fullscreen"
                >
                    Enter Fullscreen
                </button>
            )}

            {isLoading && <div className="game-player-loading" aria-live="polite">Launching {item.type}...</div>}

            <iframe
                src={launchPath}
                title={item.title}
                className={`game-player-frame ${isLoading ? 'is-loading' : ''}`}
                allow="fullscreen; camera; microphone; geolocation"
                allowFullScreen
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"
                onLoad={() => {
                    setIsLoading(false);
                    setTimeout(() => {
                        enterFullscreen().catch(() => {
                            // noop
                        });
                    }, 160);
                }}
            />
        </div>
    );
};

export default GamePlayer;
