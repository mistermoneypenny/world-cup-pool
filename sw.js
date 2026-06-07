// World Cup 2026 Pool — Service Worker
// Static assets (images) cached for fast loading.
// JS and CSS are NEVER cached here — server sends no-cache headers
// so they are always fetched fresh, ensuring code updates take effect immediately.

const CACHE_NAME  = 'wc-pool-v3';
const SHELL_URLS  = ['/', '/logo.png'];   // JS/CSS intentionally excluded

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
  // Pass through: API calls, non-GET, and ALL code files (JS/CSS)
  if (url.pathname.startsWith('/api/') ||
      event.request.method !== 'GET'   ||
      url.pathname.endsWith('.js')     ||
      url.pathname.endsWith('.css')) {
    return; // let the browser fetch normally — server sends no-cache headers
  }
  // Cache-first for remaining static assets (images, manifest, etc.)
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
