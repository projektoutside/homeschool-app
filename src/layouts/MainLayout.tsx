import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import '../styles/variables.css';
import './MainLayout.css';
import { BottomNavigation } from '../components/BottomNavigation';
import { GlobalSettings } from '../components/GlobalSettings';
import UserHomePage from '../pages/UserHomePage';
import { useGlobalUiClickSound } from '../hooks/useGlobalUiClickSound';
import { useAuth } from '../context/AuthContext';
import { isManagerUser } from '../utils/managerAccess';

const LazyClassroomPage = React.lazy(() => import('../pages/ClassroomPage'));

const MainLayout: React.FC = () => {
    useGlobalUiClickSound();

    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsCloseRequestId, setSettingsCloseRequestId] = useState(0);
    const [hasHomePageMounted, setHasHomePageMounted] = useState<boolean>(
        location.pathname === '/home-profile' || location.pathname === '/',
    );

    const isUserHomeRoute = location.pathname === '/home-profile' || location.pathname === '/';
    const isHomeRoute = location.pathname === '/';
    const isAppsRoute = location.pathname === '/apps';
    const isClassroomRoute = location.pathname === '/classroom';
    const isCharacterCreatorRoute = location.pathname === '/character-creator';
    const isGamePlayerRoute = location.pathname.startsWith('/play/') || location.pathname.startsWith('/open/');
    const isManagerRoute = location.pathname === '/manager';
    const isImmersiveRoute = isHomeRoute || isAppsRoute || isUserHomeRoute || isGamePlayerRoute || isManagerRoute || isClassroomRoute || isCharacterCreatorRoute;
    const shouldRenderUserHomePage = (hasHomePageMounted || isUserHomeRoute) && !isGamePlayerRoute;
    const shouldRenderClassroomPage = isClassroomRoute;
    const hasDeveloperAccess = isManagerUser(user);
    const shouldShowCharacterCreatorLauncher = hasDeveloperAccess && !isCharacterCreatorRoute && !isGamePlayerRoute;

    useEffect(() => {
        if (!isUserHomeRoute) {
            return;
        }
        const timerId = window.setTimeout(() => {
            setHasHomePageMounted(true);
        }, 0);
        return () => window.clearTimeout(timerId);
    }, [isUserHomeRoute]);

    // Dev-only shortcut: Ctrl+Shift+M to toggle manager
    useEffect(() => {
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

    const handleSettingsButtonClick = () => {
        if (!isSettingsOpen) {
            setIsSettingsOpen(true);
            return;
        }

        setSettingsCloseRequestId(prev => prev + 1);
    };

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
                {shouldRenderUserHomePage ? (
                    <section
                        className={`persistent-home-page ${isUserHomeRoute ? 'is-visible' : 'is-hidden'}`}
                        aria-hidden={!isUserHomeRoute}
                    >
                        <UserHomePage isActive={isUserHomeRoute} />
                    </section>
                ) : null}
                {shouldRenderClassroomPage ? (
                    <section
                        className={`persistent-home-page ${isClassroomRoute ? 'is-visible' : 'is-hidden'}`}
                        aria-hidden={!isClassroomRoute}
                    >
                        <LazyClassroomPage isActive={isClassroomRoute} />
                    </section>
                ) : null}
            </main>

            {shouldShowCharacterCreatorLauncher ? (
                <Link
                    to="/character-creator"
                    className="character-creator-launcher"
                    aria-label="Open XiO Studio"
                >
                    <span className="character-creator-launcher__eyebrow">Studio Access</span>
                    <span className="character-creator-launcher__title">XiO Studio</span>
                </Link>
            ) : null}

            {/* Persistent Bottom Navigation */}
            {/* Render always, or maybe hide on GamePlayer if strictly needed? User said "regardless of which page". */}
            <BottomNavigation onOpenSettings={handleSettingsButtonClick} isSettingsOpen={isSettingsOpen} />

            {/* Global Settings Panel */}
            <GlobalSettings
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                externalCloseRequestId={settingsCloseRequestId}
            />
        </div>
    );
};

export default MainLayout;
