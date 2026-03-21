/**
 * Service Worker for灵犀AI学习系统
 * Implements caching strategies for offline functionality and performance
 */

const CACHE_NAME = 'pagelm-v1';
const STATIC_CACHE = 'pagelm-static-v1';
const DYNAMIC_CACHE = 'pagelm-dynamic-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/logo.png',
  '/app.css',
  '/assets/index-*.js',
  '/assets/index-*.css',
];

// API cache settings
const API_CACHE_TIME = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50;

// Cache size tracker
let cacheSize = 0;

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    (async () => {
      const staticCache = await caches.open(STATIC_CACHE);
      await staticCache.addAll(STATIC_ASSETS.filter(asset => !asset.includes('*')));
      console.log('[SW] Static assets cached');
    })()
  );

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
      console.log('[SW] Old caches removed');
    })()
  );

  // Take control immediately
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // API requests - network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Static assets - cache first with network fallback
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // HTML pages - network first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Default - network only
  event.respondWith(fetch(request));
});

/**
 * Handle API requests with network-first strategy
 */
async function handleApiRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    // Try network first
    const response = await fetch(request);

    if (response.ok) {
      // Cache successful responses
      await cache.put(request, response.clone());

      // Implement cache size limit
      await limitCacheSize(cache);
    }

    return response;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] API request served from cache:', request.url);
      return cachedResponse;
    }

    throw error;
  }
}

/**
 * Handle static assets with cache-first strategy
 */
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Static asset fetch failed:', request.url);
    throw error;
  }
}

/**
 * Handle navigation requests
 */
async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    // Try network first
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] Navigation served from cache:', request.url);
      return cachedResponse;
    }

    // Return offline page
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({ 'Content-Type': 'text/plain' }),
    });
  }
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/) ||
    url.pathname.startsWith('/assets/')
  );
}

/**
 * Limit cache size to prevent storage bloat
 */
async function limitCacheSize(cache) {
  const keys = await cache.keys();

  if (keys.length > MAX_CACHE_SIZE) {
    // Delete oldest entries
    const keysToDelete = keys.slice(0, keys.length - MAX_CACHE_SIZE);
    await Promise.all(keysToDelete.map((key) => cache.delete(key)));
    console.log('[SW] Cache size limited, old entries removed');
  }
}

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-chats') {
    event.waitUntil(syncChats());
  }
});

/**
 * Periodic background sync for fresh content
 */
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);

  if (event.tag === 'update-content') {
    event.waitUntil(updateContent());
  }
});

/**
 * Sync chats when back online
 */
async function syncChats() {
  try {
    // Get offline queue from IndexedDB
    const offlineQueue = await getOfflineQueue();

    for (const action of offlineQueue) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: JSON.stringify(action.body),
        });

        // Remove from queue on success
        await removeFromOfflineQueue(action.id);
      } catch (error) {
        console.error('[SW] Failed to sync action:', action);
      }
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

/**
 * Update content in background
 */
async function updateContent() {
  try {
    // Fetch fresh data from API
    const response = await fetch('/api/chats', {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (response.ok) {
      // Update cache with fresh data
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put('/api/chats', response.clone());
      console.log('[SW] Content updated in background');
    }
  } catch (error) {
    console.error('[SW] Background update failed:', error);
  }
}

/**
 * IndexedDB helpers for offline queue
 */
async function getOfflineQueue() {
  // Implementation would use IndexedDB
  return [];
}

async function removeFromOfflineQueue(id) {
  // Implementation would remove from IndexedDB
  return true;
}

/**
 * Push notification handler
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification('灵犀AI学习系统', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
