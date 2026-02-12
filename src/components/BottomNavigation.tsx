import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CONTENT_ITEMS } from '../data/mockContent';
import './BottomNavigation.css';

interface BottomNavigationProps {
    onOpenSettings: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ onOpenSettings }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    
    const [isMinimized, setIsMinimized] = useState(false);
    const [expandedMode, setExpandedMode] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);
    
    // Reset expanded mode when minimized
    useEffect(() => {
        if (isMinimized) {
            setExpandedMode(false);
        }
    }, [isMinimized]);

    // Scroll to end when entering expanded mode
    useEffect(() => {
        if (expandedMode && sliderRef.current) {
            // Slight timeout to ensure layout is ready/transition has started
            const timer = setTimeout(() => {
                if (sliderRef.current) {
                    sliderRef.current.scrollLeft = sliderRef.current.scrollWidth;
                }
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [expandedMode]);

    // Touch swipe handling
    const touchStartX = useRef<number | null>(null);
    const hasSwiped = useRef<boolean>(false);
    const minSwipeDistance = 50; // Minimum distance for a full swipe action
    const clickBlockThreshold = 10; // Distance to consider a tap as a drag/swipe (blocks click)

    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
        hasSwiped.current = false;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        
        const currentX = e.targetTouches[0].clientX;
        const diff = touchStartX.current - currentX;

        // If moved more than threshold, mark as swiped to block accidental clicks
        if (Math.abs(diff) > clickBlockThreshold) {
            hasSwiped.current = true;
        }

        // --- GESTURE LOGIC ---

        // 1. MINIMIZE: Swipe Left (positive diff) on Standard View
        if (diff > minSwipeDistance && !isMinimized && !expandedMode) {
            setIsMinimized(true);
            touchStartX.current = null; 
            return;
        }
        
        // 2. RESTORE: Swipe Right (negative diff) on Minimized View
        if (diff < -minSwipeDistance && isMinimized) {
            setIsMinimized(false);
            touchStartX.current = null; 
            return;
        }

        // 3. OPEN SLIDER: Swipe Right (negative diff) on Standard View
        if (diff < -minSwipeDistance && !isMinimized && !expandedMode) {
            setExpandedMode(true);
            touchStartX.current = null;
            return;
        }

        // 4. CLOSE SLIDER: Swipe Left (positive diff) on Slider View AT THE RIGHT EDGE
        if (diff > minSwipeDistance && !isMinimized && expandedMode && sliderRef.current) {
            const slider = sliderRef.current;
            // Check if we are roughly at the right edge (tolerance of 5px)
            // Logic: scrollLeft + clientWidth approx equals scrollWidth
            const distFromRight = slider.scrollWidth - (slider.scrollLeft + slider.clientWidth);
            const isAtRightEdge = distFromRight < 20; // 20px tolerance for ease of use

            if (isAtRightEdge) {
                setExpandedMode(false);
                touchStartX.current = null;
            }
        }
    };

    const onTouchEnd = () => {
        touchStartX.current = null;
    };

    // Block accidental clicks if a swipe occurred
    const handleClickCapture = (e: React.MouseEvent) => {
        if (hasSwiped.current) {
            e.stopPropagation();
            e.preventDefault();
            hasSwiped.current = false; 
        }
    };

    const userDisplayName = (user?.user_metadata?.home_label as string | undefined)?.trim()
        || (user?.user_metadata?.username as string | undefined)?.trim()
        || user?.email?.split('@')[0]
        || 'HOME';

    // Helper to determine active state
    const isHomeActive = location.pathname === '/' || location.pathname === '/home-profile';
    const isGamesActive = location.pathname === '/apps' && new URLSearchParams(location.search).get('tab')?.toLowerCase() === 'game';
    const tab = new URLSearchParams(location.search).get('tab')?.toLowerCase();
    const isClassroomActive = 
        location.pathname === '/classroom' ||
        (location.pathname === '/apps' && (tab === 'worksheet' || tab === 'worksheets' || tab === 'tool' || tab === 'tools')) ||
        location.pathname === '/html-viewer';

    // Content for Expanded Mode
    const games = CONTENT_ITEMS.filter(item => item.type === 'game');

    return (
        <nav 
            className={`bottom-navigation-dock ${isMinimized ? 'minimized' : ''} ${expandedMode ? 'expanded' : ''}`} 
            aria-label="Main navigation"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onClickCapture={handleClickCapture}
        >
            {/* Restore Handle (Thin Line) - Visible only when minimized */}
            <div 
                className="nav-restore-handle" 
                aria-hidden={!isMinimized}
                onClick={(e) => {
                    if (isMinimized) {
                        setIsMinimized(false);
                        e.stopPropagation(); 
                    }
                }}
                title="Slide right or click to restore"
            >
                <div className="nav-restore-line"></div>
            </div>

            {/* View Stack: Holds both Standard and Slider views overlapping */}
            <div className="dock-view-stack">
                
                {/* Standard Tab Buttons */}
                <div className={`nav-content-container ${expandedMode ? 'view-hidden-left' : 'view-active'}`}>
                    <button
                        type="button"
                        className="nav-settings-btn"
                        onClick={onOpenSettings}
                        aria-label="Open settings"
                        title="Settings"
                        tabIndex={expandedMode ? -1 : 0}
                    >
                        <span className="nav-settings-icon" aria-hidden="true">
                            <span className="settings-square"></span>
                            <span className="settings-square"></span>
                            <span className="settings-square"></span>
                        </span>
                    </button>

                    <button
                        type="button"
                        className={`nav-tab-btn ${isHomeActive ? 'active' : ''}`}
                        onClick={() => navigate('/home-profile')}
                        aria-label={`Open ${userDisplayName} home`}
                        tabIndex={expandedMode ? -1 : 0}
                    >
                        <span className="nav-tab-icon" aria-hidden="true">🏠</span>
                        <span>{userDisplayName}</span>
                    </button>

                    <button
                        type="button"
                        className={`nav-tab-btn ${isGamesActive ? 'active' : ''}`}
                        onClick={() => navigate('/apps?tab=game')}
                        aria-label="Games"
                        tabIndex={expandedMode ? -1 : 0}
                    >
                        <span className="nav-tab-icon" aria-hidden="true">🎮</span>
                        <span>Games</span>
                    </button>

                    <button
                        type="button"
                        className={`nav-tab-btn ${isClassroomActive ? 'active' : ''}`}
                        onClick={() => navigate('/classroom')}
                        aria-label="Classroom"
                        tabIndex={expandedMode ? -1 : 0}
                    >
                        <span className="nav-tab-icon" aria-hidden="true">🏫</span>
                        <span>Classroom</span>
                    </button>
                </div>

                {/* Expanded Slider Content */}
                <div 
                    className={`nav-slider-container ${expandedMode ? 'view-active' : 'view-hidden-right'}`} 
                    ref={sliderRef}
                >
                    {/* HOME SECTION (Leftmost) */}
                    <div className="nav-slider-section home-section">
                        <div className="nav-slider-item static">
                            <span className="nav-slider-icon">🏠</span>
                            <span className="nav-slider-label">Home</span>
                        </div>
                    </div>

                    {/* GAMES SECTION */}
                    <div className="nav-slider-section games-section">
                        {games.map(game => (
                            <button
                                key={game.id}
                                className="nav-slider-item"
                                onClick={() => navigate(`/play/${game.id}`)}
                                title={game.title}
                                tabIndex={expandedMode ? 0 : -1}
                            >
                                <span className="nav-slider-icon">🎮</span>
                                <span className="nav-slider-label">{game.title}</span>
                            </button>
                        ))}
                    </div>

                    {/* CLASSROOM SECTION (Rightmost) */}
                    <div className="nav-slider-section classroom-section">
                        <button
                            className="nav-slider-item"
                            onClick={() => navigate('/apps?tab=tools')}
                            title="Tools"
                            tabIndex={expandedMode ? 0 : -1}
                        >
                            <span className="nav-slider-icon">🧰</span>
                            <span className="nav-slider-label">Tools</span>
                        </button>
                        <button
                            className="nav-slider-item"
                            onClick={() => navigate('/html-viewer')}
                            title="Worksheets"
                            tabIndex={expandedMode ? 0 : -1}
                        >
                            <span className="nav-slider-icon">📄</span>
                            <span className="nav-slider-label">Worksheets</span>
                        </button>
                    </div>
                </div>

            </div>

            {/* Minimize Toggle (Vertical Line) */}
            <button
                type="button"
                className="nav-minimize-btn"
                onClick={(e) => {
                    if (expandedMode) {
                        setExpandedMode(false); // Close expand first
                    } else {
                        setIsMinimized(!isMinimized);
                    }
                    e.stopPropagation();
                }}
                aria-label={isMinimized ? "Restore navigation" : (expandedMode ? "Close slider" : "Minimize navigation")}
                title={isMinimized ? "Restore" : (expandedMode ? "Close" : "Minimize")}
            >
                <div className="nav-minimize-line"></div>
            </button>
        </nav>
    );
};
