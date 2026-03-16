(function attachLAHSPointsBridge(global) {
    if (!global || global.LAHSPointsBridge) {
        return;
    }

    const GAME_POINTS_CONTEXT_MESSAGE = 'LAHS_POINTS_CONTEXT';
    const GAME_POINTS_EARNED_MESSAGE = 'LAHS_POINTS_EARNED';
    const GAME_POINTS_ACK_MESSAGE = 'LAHS_POINTS_ACK';

    const listeners = new Set();
    let listenerAttached = false;
    let sequence = 0;
    const ackedEventIds = new Set();
    const state = {
        gameId: '',
        sessionId: '',
        totalPoints: 0,
        stars: 0,
        userId: null,
        isAuthenticated: false
    };

    function getTargetOrigin() {
        return global.location.origin && global.location.origin !== 'null' && !global.location.origin.startsWith('file:')
            ? global.location.origin
            : '*';
    }

    function sanitizeString(value) {
        return typeof value === 'string' && value.trim() ? value.trim() : '';
    }

    function sanitizePoints(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return 0;
        }

        return Math.max(0, Math.round(numeric));
    }

    function sanitizePointTotal(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return 0;
        }

        return Math.max(0, Math.round(numeric));
    }

    function sanitizeMeta(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return {};
        }

        try {
            return JSON.parse(JSON.stringify(value));
        } catch (_error) {
            return {};
        }
    }

    function getSnapshot() {
        return {
            gameId: state.gameId,
            sessionId: state.sessionId,
            totalPoints: state.totalPoints,
            stars: state.stars,
            userId: state.userId,
            isAuthenticated: state.isAuthenticated
        };
    }

    function notifyListeners() {
        const snapshot = getSnapshot();
        listeners.forEach((listener) => {
            try {
                listener(snapshot);
            } catch (_error) {
                // Ignore listener failures so scoring stays uninterrupted.
            }
        });
    }

    function handleHostMessage(event) {
        if (!event || !event.data || typeof event.data !== 'object') return;
        if (event.origin && event.origin !== global.location.origin && event.origin !== 'null') return;

        const message = event.data;

        if (message.type === GAME_POINTS_CONTEXT_MESSAGE) {
            const messageGameId = sanitizeString(message.gameId);
            if (state.gameId && messageGameId && messageGameId !== state.gameId) {
                return;
            }

            const nextSessionId = sanitizeString(message.sessionId);
            if (nextSessionId && nextSessionId !== state.sessionId) {
                sequence = 0;
                ackedEventIds.clear();
            }

            state.gameId = messageGameId || state.gameId;
            state.sessionId = nextSessionId || state.sessionId;
            state.totalPoints = sanitizePointTotal(message.totalPoints);
            state.stars = sanitizePointTotal(message.stars);
            state.userId = sanitizeString(message.userId) || null;
            state.isAuthenticated = Boolean(message.isAuthenticated && state.userId);
            notifyListeners();
            return;
        }

        if (message.type === GAME_POINTS_ACK_MESSAGE) {
            const messageGameId = sanitizeString(message.gameId);
            if (state.gameId && messageGameId && messageGameId !== state.gameId) {
                return;
            }

            const eventId = sanitizeString(message.eventId);
            if (eventId) {
                ackedEventIds.add(eventId);
            }

            state.totalPoints = sanitizePointTotal(message.totalPoints);
            state.stars = sanitizePointTotal(message.stars);
            notifyListeners();
        }
    }

    function ensureListener() {
        if (listenerAttached) return;
        global.addEventListener('message', handleHostMessage);
        listenerAttached = true;
    }

    function requestContext() {
        if (!global.parent || global.parent === global || !state.gameId) {
            return false;
        }

        try {
            global.parent.postMessage({
                type: GAME_POINTS_CONTEXT_MESSAGE,
                gameId: state.gameId,
                request: true
            }, getTargetOrigin());
            return true;
        } catch (_error) {
            return false;
        }
    }

    function init(options) {
        ensureListener();

        const nextGameId = sanitizeString(options && options.gameId);
        if (nextGameId) {
            state.gameId = nextGameId;
        }

        requestContext();
        return getSnapshot();
    }

    function awardPoints(points, options) {
        const normalizedPoints = sanitizePoints(points);
        if (!state.gameId || normalizedPoints <= 0 || !global.parent || global.parent === global) {
            return null;
        }

        if (!state.sessionId) {
            requestContext();
        }

        const providedEventId = sanitizeString(options && options.eventId);
        const eventId = providedEventId || `evt-${++sequence}`;
        if (ackedEventIds.has(eventId)) {
            return null;
        }

        const payload = {
            type: GAME_POINTS_EARNED_MESSAGE,
            gameId: state.gameId,
            sessionId: state.sessionId || null,
            eventId,
            points: normalizedPoints,
            occurredAt: typeof options?.occurredAt === 'string' && options.occurredAt.trim()
                ? new Date(options.occurredAt).toISOString()
                : new Date().toISOString(),
            label: typeof options?.label === 'string' && options.label.trim() ? options.label.trim() : null,
            meta: sanitizeMeta(options && options.meta)
        };

        try {
            global.parent.postMessage(payload, getTargetOrigin());
            return payload;
        } catch (_error) {
            return null;
        }
    }

    function onContextChange(listener) {
        if (typeof listener !== 'function') {
            return function noop() {};
        }

        listeners.add(listener);
        return function unsubscribe() {
            listeners.delete(listener);
        };
    }

    global.LAHSPointsBridge = {
        init,
        requestContext,
        awardPoints,
        getState: getSnapshot,
        onContextChange,
        constants: {
            GAME_POINTS_CONTEXT_MESSAGE,
            GAME_POINTS_EARNED_MESSAGE,
            GAME_POINTS_ACK_MESSAGE
        }
    };
})(window);
