// Fundora — minimal update-safe service worker (PWA implementation #2)
// Scope: Fundora-owned static shell assets only. Does NOT cache React/ReactDOM/
// Babel CDN scripts, Google Fonts, or any third-party origin.

const CACHE_NAME = 'fundora-shell-pwa-v3';

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-16.png',
  '/icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
    // Intentionally no .catch() here — if any precache asset fails to fetch,
    // addAll() rejects and install fails loudly (visible in devtools), rather
    // than silently shipping a broken/partial cache.
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('fundora-shell-pwa-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = req.mode === 'navigate'
    || (req.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    // Network-first: always prefer the freshest deployed app shell. Only
    // fall back to the cached shell when fully offline, so users are never
    // stuck on a stale Fundora build while they have connectivity.
    event.respondWith(
      fetch(req).catch(() => caches.match('/'))
    );
    return;
  }

  if (PRECACHE_URLS.includes(url.pathname)) {
    // Cache-first for Fundora-owned, versioned static shell assets only.
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }

  // Everything else (including all third-party/CDN requests) is left
  // completely unhandled — no respondWith() means normal network behavior.
});
