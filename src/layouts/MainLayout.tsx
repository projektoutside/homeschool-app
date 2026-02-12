import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import '../styles/variables.css';
import './MainLayout.css';
import { BottomNavigation } from '../components/BottomNavigation';
import { GlobalSettings } from '../components/GlobalSettings';

const MainLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const isHomeRoute = location.pathname === '/';
    const isAppsRoute = location.pathname === '/apps';
    const isClassroomRoute = location.pathname === '/classroom';
    const isUserHomeRoute = location.pathname === '/home-profile';
    const isGamePlayerRoute = location.pathname.startsWith('/play/') || location.pathname.startsWith('/open/');
    const isManagerRoute = location.pathname === '/manager';
    const isImmersiveRoute = isHomeRoute || isAppsRoute || isUserHomeRoute || isGamePlayerRoute || isManagerRoute || isClassroomRoute;

    // Dev-only shortcut: Ctrl+Shift+M to toggle manager
    React.useEffect(() => {
        if (!import.meta.env.DEV) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'm') {
                event.preventDefault();
                if (location.pathname === '/manager') {
                    navigate('/');
                } else {
                    navigate('/manager');
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [location.pathname, navigate]);

    return (
        <div
            className={`layout-container ${isImmersiveRoute ? 'home-immersive' : ''} ${isGamePlayerRoute ? 'game-immersive' : ''}`}
        >
            {/* Skip to main content link for keyboard users */}
            <a href="#main-content" className="skip-to-main">
                Skip to main content
            </a>

            {/* Main Content Area */}
            <main id="main-content" className="main-content">
                <Outlet />
            </main>

            {/* Persistent Bottom Navigation */}
            {/* Render always, or maybe hide on GamePlayer if strictly needed? User said "regardless of which page". */}
            <BottomNavigation onOpenSettings={() => setIsSettingsOpen(true)} />

            {/* Global Settings Panel */}
            <GlobalSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};

export default MainLayout;
