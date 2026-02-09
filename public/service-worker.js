/**
 * Service Worker for La's Homeschool Hub App
 * Provides offline support, caching, and auto-update functionality
 * @version 1.0.0
 */

const CACHE_NAME = 'homeschool-hub-v3';
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
  console.log('[SW] Installing Service Worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting to activate immediately');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Helper to determine if a request should be Cache-First (static assets)
const isStaticAsset = (url) => {
  // Check for common static file extensions
  // Supports optional query strings (e.g., style.css?v=1)
  return /\.(png|jpg|jpeg|svg|gif|webp|ico|mp3|wav|ogg|mp4|webm|woff|woff2|ttf|eot|css|js)(\?.*)?$/i.test(url);
};

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Skip API calls and external resources (Google Fonts/Analytics might be external but let's skip API)
  if (event.request.url.includes('api.github.com')) {
    return;
  }

  // Strategy 1: Cache First for Static Assets (Images, Media, Fonts, Scripts)
  // If in cache, return immediately. Do NOT revalidate in background.
  if (isStaticAsset(event.request.url)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          // Cache the new asset
          if (networkResponse.ok && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Strategy 2: Stale-While-Revalidate for HTML, JSON, and other content
  // Return cached version if avail, but always update in background
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          // Fetch new version in background for next time
          // ONLY if it's the same origin to avoid cross-origin issues
          if (event.request.url.startsWith(self.location.origin)) {
            fetch(event.request)
              .then((fetchResponse) => {
                if (fetchResponse.ok) {
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, fetchResponse.clone());
                  });
                }
              })
              .catch(() => { }); // Ignore fetch errors for background update
          }
          return response;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((fetchResponse) => {
            // Cache successful responses
            if (fetchResponse.ok && fetchResponse.type === 'basic') {
              const responseToCache = fetchResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return fetchResponse;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', error);
            // Return offline fallback if available
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            throw error;
          });
      })
  );
});

// Message event - handle communication from main app
self.addEventListener('message', (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case 'SKIP_WAITING':
      console.log('[SW] Skip waiting message received');
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
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Homeschool-Hub-App'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    // Safely extract commit data with fallbacks
    const latestCommit = data?.sha || 'unknown';
    const commitData = data?.commit || {};
    const commitInfo = commitData?.commit || commitData; // Handle different API versions
    const authorInfo = commitInfo?.author || commitData?.author || {};

    const commitDate = authorInfo?.date || new Date().toISOString();
    const commitMessage = commitInfo?.message || commitData?.message || 'No message available';

    // Get stored commit hash
    const storedCommit = await getStoredCommit();

    client.postMessage({
      type: 'UPDATE_CHECK_RESULT',
      hasUpdate: latestCommit !== storedCommit && latestCommit !== 'unknown',
      currentCommit: storedCommit,
      latestCommit: latestCommit,
      commitDate: commitDate,
      commitMessage: commitMessage,
      repoUrl: `https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`
    });

  } catch (error) {
    console.log('[SW] Update check failed:', error.message);
    // Silently fail - don't spam console with errors
    client.postMessage({
      type: 'UPDATE_CHECK_ERROR',
      error: 'Unable to check for updates'
    });
  }
}

// Store commit hash in cache
async function storeCommit(commitHash) {
  const cache = await caches.open(CACHE_NAME);
  const response = new Response(JSON.stringify({ commit: commitHash }));
  await cache.put('app-commit-hash', response);
}

// Get stored commit hash from cache
async function getStoredCommit() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('app-commit-hash');
    if (response) {
      const data = await response.json();
      return data.commit;
    }
  } catch (e) {
    console.error('[SW] Error reading stored commit:', e);
  }
  return null;
}

// Periodic sync for background update checks (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-check') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => checkForUpdates(client));
      })
    );
  }
});

// Background sync for offline form submissions (if implemented)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Implement data synchronization logic here if needed
  console.log('[SW] Background sync triggered');
}