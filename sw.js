// World Cup 2026 Pool — Service Worker v4
// HTML (/) uses network-first so code updates are always visible immediately.
// JS/CSS are never cached here — server sends no-store headers.
// Images use cache-first for performance.

const CACHE_NAME = 'wc-pool-v4';  // bumped: v3 cache (stale HTML) is purged on activate

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(['/logo.png'])).catch(() => {})
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

  // Pass through: API calls, non-GET, JS, CSS
  if (url.pathname.startsWith('/api/') ||
      event.request.method !== 'GET'   ||
      url.pathname.endsWith('.js')     ||
      url.pathname.endsWith('.css')) {
    return;
  }

  // Network-first for HTML — always get the latest page from the server.
  // Falls back to cache only when offline.
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for remaining static assets (images, manifest, icons)
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
