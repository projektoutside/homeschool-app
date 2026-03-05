import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CONTENT_ITEMS } from '../data/mockContent';
import { buildAssetPath } from '../utils/pathUtils';
import type { ContentItem } from '../types/content';
import type { FullscreenHTMLElementType } from '../types/fullscreen';
import { useSoundSettings } from '../context/SoundSettingsContext';
import { applySoundSettingsToWindow } from '../utils/soundSettings';
import './GamePlayer.css';

const GAME_EXIT_TO_HOME_MESSAGE = 'LAHS_GAME_EXIT_TO_HOME';
const DEV_CACHE_BUST = import.meta.env.DEV ? Date.now().toString() : '';

const GamePlayer: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { settings: soundSettings } = useSoundSettings();

    useEffect(() => {
        applySoundSettingsToWindow(iframeRef.current?.contentWindow, soundSettings);
    }, [soundSettings]);

    const launchStateItem = useMemo(() => {
        const state = location.state as { launchItem?: ContentItem } | null;
        if (!state || typeof state !== 'object' || !state.launchItem) return null;
        return state.launchItem;
    }, [location.state]);

    const item = useMemo(() => {
        if (launchStateItem && launchStateItem.id === id) {
            return launchStateItem;
        }
        return CONTENT_ITEMS.find(content => content.id === id);
    }, [id, launchStateItem]);
    const launchPath = useMemo(() => {
        if (!item) return '';
        if (item.customHtmlPath) {
            const basePath = buildAssetPath(item.customHtmlPath);
            if (!import.meta.env.DEV) {
                return basePath;
            }
            const separator = basePath.includes('?') ? '&' : '?';
            return `${basePath}${separator}dev=${DEV_CACHE_BUST}`;
        }
        if (item.externalUrl) return item.externalUrl;
        return '';
    }, [item]);

    // Only handle games and tools in fullscreen mode
    // Worksheets are handled by the Viewer with print preview mode
    const isImmersiveType = item?.type === 'game' || item?.type === 'tool';

    useEffect(() => {
        const handleGameMessage = (event: MessageEvent) => {
            if (!iframeRef.current?.contentWindow || event.source !== iframeRef.current.contentWindow) {
                return;
            }

            const message = event.data as { type?: unknown } | null;
            if (!message || message.type !== GAME_EXIT_TO_HOME_MESSAGE) {
                return;
            }

            navigate('/home-profile');
        };

        window.addEventListener('message', handleGameMessage);
        return () => window.removeEventListener('message', handleGameMessage);
    }, [navigate]);

    const enterFullscreen = useCallback(async () => {
        const element = document.documentElement as FullscreenHTMLElementType;
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
        if (!item || !isImmersiveType || !launchPath) {
            navigate(item ? `/resource/${item.id}` : '/', { replace: true });
        }
    }, [item, isImmersiveType, launchPath, navigate]);

    if (!item || !isImmersiveType || !launchPath) {
        return null;
    }

    return (
        <div className="game-player-shell" ref={containerRef}>
            {isLoading && <div className="game-player-loading" aria-live="polite">Launching {item.type}...</div>}

            <iframe
                ref={iframeRef}
                src={launchPath}
                title={item.title}
                className={`game-player-frame ${isLoading ? 'is-loading' : ''}`}
                allow="fullscreen; camera; microphone; geolocation"
                allowFullScreen
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"
                onLoad={() => {
                    setIsLoading(false);
                    applySoundSettingsToWindow(iframeRef.current?.contentWindow, soundSettings);
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
