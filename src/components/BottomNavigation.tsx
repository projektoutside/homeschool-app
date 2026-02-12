import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './BottomNavigation.css';

interface BottomNavigationProps {
    onOpenSettings: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ onOpenSettings }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    
    const [isMinimized, setIsMinimized] = useState(false);
    
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

        // If swiping left (positive diff) and NOT minimized -> Minimize
        if (diff > minSwipeDistance && !isMinimized) {
            setIsMinimized(true);
            touchStartX.current = null; // Reset to prevent multiple triggers
        }
        
        // If swiping right (negative diff) and minimized -> Restore
        if (diff < -minSwipeDistance && isMinimized) {
            setIsMinimized(false);
            touchStartX.current = null; // Reset
        }
    };

    const onTouchEnd = () => {
        touchStartX.current = null;
        // We do NOT reset hasSwiped here immediately because the onClick event fires *after* touchEnd.
        // We let the onClickCapture handle it, or reset it on next touchStart.
        // Actually, for safety, we can reset it after a small timeout if needed, but the next touchStart handles it.
    };

    // Block accidental clicks if a swipe occurred
    const handleClickCapture = (e: React.MouseEvent) => {
        if (hasSwiped.current) {
            e.stopPropagation();
            e.preventDefault();
            hasSwiped.current = false; // Consume the block
        }
    };

    const userDisplayName = (user?.user_metadata?.home_label as string | undefined)?.trim()
        || (user?.user_metadata?.username as string | undefined)?.trim()
        || user?.email?.split('@')[0]
        || 'HOME';

    // Helper to determine active state
    const isHomeActive = location.pathname === '/' || location.pathname === '/home-profile';
    
    const isGamesActive = location.pathname === '/apps' && new URLSearchParams(location.search).get('tab')?.toLowerCase() === 'game';
    
    // Classroom is active for /classroom route AND the legacy worksheet/tool routes that are now "inside" classroom
    const tab = new URLSearchParams(location.search).get('tab')?.toLowerCase();
    const isClassroomActive = 
        location.pathname === '/classroom' ||
        (location.pathname === '/apps' && (tab === 'worksheet' || tab === 'worksheets' || tab === 'tool' || tab === 'tools')) ||
        location.pathname === '/html-viewer';

    return (
        <nav 
            className={`bottom-navigation-dock ${isMinimized ? 'minimized' : ''}`} 
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
                    // Always allow restoring, even if it was a small drag
                    if (isMinimized) {
                        setIsMinimized(false);
                        e.stopPropagation(); 
                    }
                }}
                title="Slide right or click to restore"
            >
                <div className="nav-restore-line"></div>
            </div>

            {/* Content Container - Hidden when minimized */}
            <div className="nav-content-container">
                <button
                    type="button"
                    className="nav-settings-btn"
                    onClick={onOpenSettings}
                    aria-label="Open settings"
                    title="Settings"
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
                >
                    <span className="nav-tab-icon" aria-hidden="true">🏠</span>
                    <span>{userDisplayName}</span>
                </button>

                <button
                    type="button"
                    className={`nav-tab-btn ${isGamesActive ? 'active' : ''}`}
                    onClick={() => navigate('/apps?tab=game')}
                    aria-label="Games"
                >
                    <span className="nav-tab-icon" aria-hidden="true">🎮</span>
                    <span>Games</span>
                </button>

                <button
                    type="button"
                    className={`nav-tab-btn ${isClassroomActive ? 'active' : ''}`}
                    onClick={() => navigate('/classroom')}
                    aria-label="Classroom"
                >
                    <span className="nav-tab-icon" aria-hidden="true">🏫</span>
                    <span>Classroom</span>
                </button>
            </div>

            {/* Minimize Toggle (Vertical Line) */}
            <button
                type="button"
                className="nav-minimize-btn"
                onClick={(e) => {
                    // Always allow toggling via the button
                    setIsMinimized(!isMinimized);
                    e.stopPropagation();
                }}
                aria-label={isMinimized ? "Restore navigation" : "Minimize navigation"}
                title={isMinimized ? "Restore" : "Minimize"}
            >
                <div className="nav-minimize-line"></div>
            </button>
        </nav>
    );
};
