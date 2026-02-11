const CACHE_VERSION = 'polygon-fun-v17-live-level-sync-hotfix';
const NETWORK_FIRST_PATHS = new Set([
  '/index.html'
]);
const MUTABLE_NETWORK_FIRST_PATHS = new Set([
  '/js/levels.js',
  '/js/level.js',
  '/js/game.js'
]);
const OFFLINE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './thumb.png',
  './icons/icon-32x32.png',
  './icons/icon-48x48.png',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-256x256.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './Images/22dd4fd8-b24a-448a-acab-6369fe6d5b89.png',
  './Images/61b46aaf-6e13-4282-aae9-83226f6cfba2.png',
  './Images/8136500b-fdae-481c-8b49-d79cab9fdbc0.png',
  './Images/adc0e9cd-c520-467b-9864-872b16d05fad.png',
  './Images/c9cbcb38-a40e-4254-9465-c7cbf84b70bf.png',
  './Images/f8b0dc61-bf5b-49e8-8ead-dc1b8659b846.png',
  './Music/MainMenu.mp3',
  './Music/Tutorial1.mp3',
  './Music/Tutorial2.mp3',
  './Music/Tutorial3.mp3',
  './Music/Tutorial4.mp3',
  './Music/Tutorialx.mp3',
  './Music/failed.mp3',
  './Music/victory.mp3',
  './js/background-animation.js',
  './js/geometry.js',
  './js/menu-fix.js',
  './js/music.js',
  './js/tutorial.js',
  './js/ui-modal.js',
  './js/audio-unlock.js',
  './js/storage.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(OFFLINE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const acceptsHeader = event.request.headers.get('accept') || '';
  const isNavigationRequest =
    event.request.mode === 'navigate' || acceptsHeader.includes('text/html');

  const scopePath = new URL(self.registration.scope).pathname.replace(/\/$/, '');
  const scopedPath = requestUrl.pathname.startsWith(scopePath)
    ? requestUrl.pathname.slice(scopePath.length) || '/'
    : requestUrl.pathname;
  const normalizedPath = scopedPath.startsWith('/') ? scopedPath : `/${scopedPath}`;
  const isMutableScript =
    MUTABLE_NETWORK_FIRST_PATHS.has(normalizedPath) ||
    MUTABLE_NETWORK_FIRST_PATHS.has(requestUrl.pathname) ||
    normalizedPath.endsWith('/js/levels.js') ||
    normalizedPath.endsWith('/js/level.js') ||
    normalizedPath.endsWith('/js/game.js');
  const mutableCacheKey = `${requestUrl.origin}${requestUrl.pathname}`;

  const shouldUseNetworkFirst = isSameOrigin && (
    isNavigationRequest ||
    NETWORK_FIRST_PATHS.has(normalizedPath) ||
    NETWORK_FIRST_PATHS.has(requestUrl.pathname) ||
    isMutableScript
  );

  const networkRequest = shouldUseNetworkFirst
    ? new Request(event.request, { cache: 'no-store' })
    : event.request;

  if (shouldUseNetworkFirst) {
    event.respondWith(
      fetch(networkRequest)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            const key = isMutableScript ? mutableCacheKey : event.request;
            cache.put(key, responseClone).catch(() => { });
          });
          return response;
        })
        .catch(() => {
          const key = isMutableScript ? mutableCacheKey : event.request;
          return caches.match(key).then((cached) => {
            if (cached) return cached;
            return caches.match('./index.html');
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, responseClone).catch(() => { });
          });
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});