/**
 * Service Worker for La's Homeschool Hub App
 * Provides offline support, caching, and auto-update functionality
 * @version 1.0.4
 */

const CACHE_NAME = 'homeschool-hub-v1.0.4';
const SW_VERSION = '1.0.4';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png'
];

// GitHub API configuration for update checking
const GITHUB_CONFIG = {
  owner: 'projektoutside',
  repo: 'homeschool-app',
  branch: 'main'
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing Service Worker v${SW_VERSION}...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating Service Worker v${SW_VERSION}...`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper to determine if a request is an API or external call to skip
const shouldSkip = (url) => {
  return (
    url.includes('api.github.com') ||
    url.includes('.supabase.co') ||
    url.startsWith('chrome-extension://')
  );
};

const LIVE_CONTENT_SEGMENTS = [
  '/PolygonAPP/',
  '/Games/',
  '/Worksheets/',
  '/MathWorksheetCreator/',
  '/FinalGraph/'
];

const isLiveContentPath = (pathname) => {
  return LIVE_CONTENT_SEGMENTS.some((segment) => pathname.includes(segment));
};

// Fetch event - Robust Strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || shouldSkip(event.request.url)) {
    return;
  }

  const url = new URL(event.request.url);

  const acceptsHeader = event.request.headers.get('accept') || '';
  const isHtmlRequest =
    event.request.mode === 'navigate' ||
    (event.request.method === 'GET' && acceptsHeader.includes('text/html'));
  const isLiveContentRequest = isLiveContentPath(url.pathname);

  // STRATEGY 1: Network First for HTML/Navigation + mutable game/worksheet/tool assets
  // We want the latest entry point always, falling back to cache if offline.
  if (isHtmlRequest || isLiveContentRequest) {
    const networkRequest = (isLiveContentRequest && !isHtmlRequest)
      ? new Request(event.request, { cache: 'no-store' })
      : event.request;

    event.respondWith(
      fetch(networkRequest)
        .then((networkResponse) => {
          if (!networkResponse || !networkResponse.ok) {
            return networkResponse;
          }

          // Cache fresh copies (separate clones to avoid consumed-body clone errors)
          const responseToCache = networkResponse.clone();
          const htmlFallbackToCache = isHtmlRequest ? networkResponse.clone() : null;
          caches.open(CACHE_NAME).then((cache) => {
            // Update the specific request cache
            cache.put(event.request, responseToCache);

            if (isHtmlRequest && htmlFallbackToCache) {
              // CRITICAL: Also update the 'index.html' cache entry because that's our fallback
              // We use './index.html' so it resolves relative to the SW location
              cache.put('./index.html', htmlFallbackToCache);
            }
          });
          return networkResponse;
        })
        .catch(() => {
          console.log('[SW] Network failed, serving offline fallback');
          if (isHtmlRequest) {
            // HTML navigation fallback to app shell.
            return caches.match('./index.html').then(response => response || null);
          }

          // For non-HTML live assets, never return index.html.
          // Return cached asset match if present, otherwise let request fail naturally.
          return caches.match(event.request).then(response => response || null);
        })
    );
    return;
  }

  // STRATEGY 2: Stale-While-Revalidate for everything else (JS, CSS, Images)
  // Returns cached version immediately, but updates cache in background.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          // Network failure is fine if we have cache
          // console.log('[SW] Background fetch failed:', err);
        });

      // If we have a cached response, return it immediately
      // The network request continues in background to update cache for NEXT time
      return cachedResponse || fetchPromise;
    })
  );
});

// Message event - handle communication from main app
self.addEventListener('message', (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CHECK_FOR_UPDATES':
      checkForUpdates(event.source);
      break;
    case 'GET_VERSION':
      event.source.postMessage({
        type: 'VERSION_INFO',
        version: CACHE_NAME,
        timestamp: new Date().toISOString()
      });
      break;
  }
});

// Check for app updates from GitHub
async function checkForUpdates(client) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/commits/${GITHUB_CONFIG.branch}`,
      { headers: { 'Accept': 'application/vnd.github.v3+json' } }
    );

    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
    const data = await response.json();
    const latestCommit = data?.sha || 'unknown';

    client.postMessage({
      type: 'UPDATE_CHECK_RESULT',
      hasUpdate: false, // Simplified for now since we rely on SW versioning
      latestCommit: latestCommit
    });
  } catch (error) {
    console.log('[SW] Update check failed:', error.message);
  }
}

// Background sync (placeholder)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    // console.log('[SW] Background sync');
  }
});