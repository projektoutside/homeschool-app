/**
 * Service Worker for The Spy Academy
 * Mobile-Compatible Version with Simplified Caching
 */

const CACHE_NAME = 'spy-academy-v1.0.2'; // Updated version for mobile fixes
const OFFLINE_CACHE = 'spy-academy-offline-v1.0.2';

// Critical files that must be cached - use relative paths for better device compatibility
const CRITICAL_RESOURCES = [
    './',
    './index.html',
    './styles.css',
    './manifest.json'
];

// Game files - less aggressive caching for mobile
const GAME_RESOURCES = [
    './js/utils/config.js',
    './js/utils/helpers.js',
    './js/utils/logger.js',
    './js/soundManager.js',
    './js/gameManager.js',
    './js/main.js'
];

// External resources
const EXTERNAL_RESOURCES = [
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Cinzel:wght@400;600&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache critical resources only
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache critical resources
            caches.open(CACHE_NAME).then((cache) => {
                console.log('📦 Caching critical resources...');
                return cache.addAll(CRITICAL_RESOURCES).catch((error) => {
                    console.warn('Failed to cache some critical resources:', error);
                    // Continue anyway - don't block installation
                    return Promise.resolve();
                });
            }),
            
            // Cache external resources separately
            caches.open(OFFLINE_CACHE).then((cache) => {
                console.log('📦 Caching external resources...');
                return Promise.all(
                    EXTERNAL_RESOURCES.map(url => {
                        return cache.add(url).catch((error) => {
                            console.warn('Failed to cache external resource:', url, error);
                            // Don't fail the entire installation
                            return Promise.resolve();
                        });
                    })
                );
            })
        ]).then(() => {
            console.log('✅ Service Worker installed successfully');
            // Force immediate activation for mobile compatibility
            return self.skipWaiting();
        }).catch((error) => {
            console.error('❌ Service Worker installation failed:', error);
            // Don't prevent installation, just log the error
            return Promise.resolve();
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('🔧 Service Worker activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
                            console.log('🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // Take control of all pages immediately
            self.clients.claim()
        ]).then(() => {
            console.log('✅ Service Worker activated and took control');
        }).catch((error) => {
            console.error('❌ Service Worker activation failed:', error);
        })
    );
});

// Fetch event - network-first strategy for mobile
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip Chrome extension requests
    if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
        return;
    }
    
    // Network-first strategy with mobile-friendly timeouts
    event.respondWith(
        fetch(request, {
            // Shorter timeout for mobile networks
            signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
        })
        .then((response) => {
            // If we got a valid response, cache it and return
            if (response && response.status === 200) {
                // Only cache same-origin requests to avoid CORS issues
                if (url.origin === location.origin) {
                    const responseClone = response.clone();
                    
                    // Determine which cache to use
                    const cacheName = CRITICAL_RESOURCES.includes(url.pathname) || 
                                     CRITICAL_RESOURCES.includes(url.pathname + '/') 
                                     ? CACHE_NAME : OFFLINE_CACHE;
                    
                    caches.open(cacheName).then((cache) => {
                        cache.put(request, responseClone).catch((error) => {
                            console.warn('Failed to cache response:', request.url, error);
                        });
                    });
                }
                return response;
            }
            
            // If response is not ok, try cache
            return getCachedResponse(request);
        })
        .catch((error) => {
            console.warn('Network fetch failed, trying cache:', request.url, error);
            return getCachedResponse(request);
        })
    );
});

// Helper function to get cached response
async function getCachedResponse(request) {
    try {
        // Try main cache first
        let response = await caches.match(request, { cacheName: CACHE_NAME });
        
        if (!response) {
            // Try offline cache
            response = await caches.match(request, { cacheName: OFFLINE_CACHE });
        }
        
        if (response) {
            console.log('📱 Serving from cache:', request.url);
            return response;
        }
        
        // If no cache match, return a basic offline page for navigation requests
        if (request.mode === 'navigate') {
            return new Response(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Offline - The Spy Academy</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            background: #000511;
                            color: white;
                            text-align: center;
                            padding: 50px;
                            margin: 0;
                        }
                        .offline-message {
                            max-width: 400px;
                            margin: 0 auto;
                        }
                        button {
                            background: #00ffff;
                            color: #000511;
                            border: none;
                            padding: 15px 30px;
                            border-radius: 10px;
                            cursor: pointer;
                            font-size: 16px;
                            margin-top: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="offline-message">
                        <h1>🌐 You're Offline</h1>
                        <p>The Spy Academy requires an internet connection to load.</p>
                        <p>Please check your connection and try again.</p>
                        <button onclick="location.reload()">Try Again</button>
                    </div>
                </body>
                </html>
            `, {
                headers: {
                    'Content-Type': 'text/html'
                }
            });
        }
        
        // For other requests, return a simple error response
        return new Response('Offline', { 
            status: 503, 
            statusText: 'Service Unavailable' 
        });
        
    } catch (error) {
        console.error('Cache lookup failed:', error);
        return new Response('Cache Error', { 
            status: 500, 
            statusText: 'Internal Server Error' 
        });
    }
}

// Error event handler
self.addEventListener('error', (event) => {
    console.error('Service Worker error:', event.error);
});

// Unhandled rejection handler
self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker unhandled rejection:', event.reason);
});

console.log('🚀 Service Worker script loaded - Version:', CACHE_NAME);
