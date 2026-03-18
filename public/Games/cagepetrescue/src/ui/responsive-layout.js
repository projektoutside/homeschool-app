const BREAKPOINTS = {
    tablet: 768,
    desktop: 1024,
    large: 1280,
};

function detectLayout(width) {
    if (width >= BREAKPOINTS.large) {
        return 'large';
    }

    if (width >= BREAKPOINTS.desktop) {
        return 'desktop';
    }

    if (width >= BREAKPOINTS.tablet) {
        return 'tablet';
    }

    return 'mobile';
}

function getPointerMode(win) {
    try {
        if (win.matchMedia('(pointer: coarse)').matches) {
            return 'coarse';
        }

        if (win.matchMedia('(pointer: fine)').matches) {
            return 'fine';
        }
    } catch {
        // Ignore unsupported media query environments.
    }

    return 'unknown';
}

function createLayoutState(win = window) {
    const width = win.innerWidth;
    const height = win.innerHeight;
    const layout = detectLayout(width);
    const orientation = width >= height ? 'landscape' : 'portrait';
    const pointer = getPointerMode(win);
    const rawDesktopLike = layout === 'desktop' || layout === 'large';
    const shouldUseCompactShell =
        !rawDesktopLike ||
        (pointer === 'coarse' && layout === 'desktop' && width <= BREAKPOINTS.desktop && height <= 820);
    const isDesktopLike = rawDesktopLike && !shouldUseCompactShell;
    const mathDeck =
        shouldUseCompactShell
            ? (orientation === 'portrait' ? 'compact-portrait' : 'compact-landscape')
            : layout;

    return {
        width,
        height,
        layout,
        orientation,
        pointer,
        mathDeck,
        isDesktopLike,
        isCompact: shouldUseCompactShell,
    };
}

export function setupResponsiveLayout({
    root = document.body,
    defaultSecondaryPanel = 'ep',
    onChange,
} = {}) {
    const secondaryTabs = Array.from(document.querySelectorAll('.secondary-panel-tab'));
    let currentState = null;

    function syncSecondaryTabs(activePanel) {
        secondaryTabs.forEach((button) => {
            const isActive = button.dataset.secondaryTarget === activePanel;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', String(isActive));
            button.tabIndex = isActive ? 0 : -1;
        });
    }

    function setSecondaryPanel(panel) {
        const nextPanel = panel || defaultSecondaryPanel;
        root.dataset.secondaryPanel = nextPanel;
        syncSecondaryTabs(nextPanel);
    }

    function applyState(nextState) {
        root.dataset.layout = nextState.layout;
        root.dataset.orientation = nextState.orientation;
        root.dataset.pointer = nextState.pointer;
        root.dataset.mathDeck = nextState.mathDeck;

        root.classList.toggle('is-compact-layout', nextState.isCompact);
        root.classList.toggle('is-desktop-layout', nextState.isDesktopLike);
        root.classList.toggle('is-touch-layout', nextState.pointer === 'coarse' || nextState.isCompact);

        if (!root.dataset.secondaryPanel) {
            setSecondaryPanel(defaultSecondaryPanel);
        } else {
            syncSecondaryTabs(root.dataset.secondaryPanel);
        }
    }

    function refreshLayoutState() {
        const previousState = currentState;
        const nextState = createLayoutState();
        currentState = nextState;
        applyState(nextState);

        if (typeof onChange === 'function') {
            onChange(nextState, previousState);
        }
    }

    secondaryTabs.forEach((button) => {
        button.addEventListener('click', () => {
            setSecondaryPanel(button.dataset.secondaryTarget);
        });
    });

    window.addEventListener('resize', refreshLayoutState, { passive: true });
    window.addEventListener('orientationchange', refreshLayoutState);

    refreshLayoutState();

    return {
        getState: () => currentState,
        refresh: refreshLayoutState,
        setSecondaryPanel,
    };
}
