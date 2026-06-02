const CACHE_NAME = 'sweet-flappy-cache-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './dist/index.js',
  './manifest.json',
  './assets/pwa_icon_192.png',
  './assets/pwa_icon_512.png'
];

// Pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Remove old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Cache First with network fallback & revalidate strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET
  if (event.request.method !== 'GET') return;
  
  // Ignore API requests, handle offline fallback inside the client application code instead
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch new version in background to update cache for next load
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {}); // Suppress background fetch errors when offline

        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        // Offline default fallback
        return caches.match('/');
      });
    })
  );
});
