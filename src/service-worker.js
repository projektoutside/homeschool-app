/**
 * Service Worker for La's Homeschool Hub App
 * Provides offline support, caching, and live update activation.
 */

const APP_BUILD_ID = __APP_BUILD_ID__;
const APP_BUILT_AT = __APP_BUILT_AT__;
const APP_COMMIT_MESSAGE = __APP_COMMIT_MESSAGE__;
const APP_REPO_URL = __APP_REPO_URL__;
const CACHE_NAME = `homeschool-hub-${APP_BUILD_ID}`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './app-version.json',
  './icons/icon-32x32.png',
  './icons/icon-48x48.png',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-180x180.png',
  './icons/icon-192x192.png',
  './icons/icon-256x256.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  console.log(`[SW] Installing Service Worker ${APP_BUILD_ID}...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating Service Worker ${APP_BUILD_ID}...`);
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name.startsWith('homeschool-hub-'))
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  );
});

const shouldSkip = (url) => {
  return (
    url.includes('.supabase.co') ||
    url.startsWith('chrome-extension://')
  );
};

const LIVE_CONTENT_SEGMENTS = [
  '/HomePageAPP/',
  '/3dClass/',
  '/PolygonAPP/',
  '/Games/',
  '/Worksheets/',
  '/MathWorksheetCreator/',
  '/FinalGraph/',
];

const isLiveContentPath = (pathname) => {
  return LIVE_CONTENT_SEGMENTS.some((segment) => pathname.includes(segment));
};

const responseOrError = (response) => response || Response.error();

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || shouldSkip(event.request.url)) {
    return;
  }

  const url = new URL(event.request.url);
  const acceptsHeader = event.request.headers.get('accept') || '';
  const isHtmlRequest =
    event.request.mode === 'navigate' ||
    acceptsHeader.includes('text/html');
  const isLiveContentRequest = isLiveContentPath(url.pathname);
  const isVersionRequest = url.pathname.endsWith('/app-version.json');

  if (isHtmlRequest || isLiveContentRequest || isVersionRequest) {
    const networkRequest = new Request(event.request, { cache: 'no-store' });

    event.respondWith(
      fetch(networkRequest)
        .then((networkResponse) => {
          if (!networkResponse || !networkResponse.ok) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          const htmlFallbackToCache = isHtmlRequest ? networkResponse.clone() : null;
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);

            if (isHtmlRequest && htmlFallbackToCache) {
              cache.put('./index.html', htmlFallbackToCache);
            }
          });
          return networkResponse;
        })
        .catch(() => {
          if (isHtmlRequest) {
            return caches.match('./index.html').then(responseOrError);
          }

          return caches.match(event.request).then(responseOrError);
        }),
    );
    return;
  }

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
        .catch(() => undefined);

      return cachedResponse || fetchPromise.then(responseOrError);
    }),
  );
});

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
      event.source?.postMessage({
        type: 'VERSION_INFO',
        buildId: APP_BUILD_ID,
        builtAt: APP_BUILT_AT,
        cacheName: CACHE_NAME,
      });
      break;
  }
});

const getVersionUrl = () => {
  return new URL('./app-version.json', self.registration.scope).href;
};

async function fetchLatestBuildInfo() {
  const response = await fetch(`${getVersionUrl()}?t=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Version metadata request failed: ${response.status}`);
  }

  return response.json();
}

async function checkForUpdates(client) {
  try {
    const latestInfo = await fetchLatestBuildInfo();
    const latestBuildId = typeof latestInfo?.buildId === 'string'
      ? latestInfo.buildId
      : null;
    const hasUpdate = Boolean(latestBuildId && latestBuildId !== APP_BUILD_ID);

    client?.postMessage({
      type: 'UPDATE_CHECK_RESULT',
      hasUpdate,
      currentCommit: APP_BUILD_ID,
      latestCommit: latestBuildId ?? APP_BUILD_ID,
      commitDate: latestInfo?.builtAt ?? APP_BUILT_AT,
      commitMessage: latestInfo?.commitMessage ?? APP_COMMIT_MESSAGE,
      repoUrl: latestInfo?.repoUrl ?? APP_REPO_URL,
    });
  } catch (error) {
    client?.postMessage({
      type: 'UPDATE_CHECK_ERROR',
      error: error instanceof Error ? error.message : 'Unknown update check failure',
    });
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    // Reserved for future offline data sync.
  }
});
