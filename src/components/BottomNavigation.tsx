import React from 'react';
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
        <nav className="bottom-navigation-dock" aria-label="Main navigation">
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
        </nav>
    );
};
