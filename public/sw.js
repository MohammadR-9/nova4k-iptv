// Service Worker for NOVA 4K ULTRA PWA
// Enables offline caching and PWABuilder compatibility

const CACHE_NAME = 'nova4k-v3.0.1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy: always try network, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and cross-origin IPTV stream requests
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  // Don't cache IPTV streams or API calls
  if (url.pathname.includes('/live/') || 
      url.pathname.includes('.ts') || 
      url.pathname.includes('.m3u8') ||
      url.pathname.includes('player_api')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache fresh responses for static assets
        if (response.ok && url.origin === self.location.origin) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
