// World Cup 2026 Pool — Service Worker
// Caches the app shell for fast loading; always fetches API data fresh.

const CACHE_NAME  = 'wc-pool-v2';
const SHELL_URLS  = ['/', '/app.js', '/styles.css', '/logo.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Always go network-first for API calls and same-origin non-GET
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') {
    return; // let the browser handle it normally
  }
  // Cache-first for shell assets
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
