// Service worker — makes the app installable and fast, but always picks up new
// versions: network-first for the HTML shell, cache-first only for hashed assets.
const CACHE = 'soundcircle-v20';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never touch the API or cross-origin audio (googlevideo) — always live.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) return;

  // Network-first for page navigations so a new build shows up immediately.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => { caches.open(CACHE).then((c) => c.put(request, res.clone())); return res; })
        .catch(() => caches.match(request).then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Cache-first for hashed static assets (they never change once built).
  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((res) => {
        if (res.ok) caches.open(CACHE).then((c) => c.put(request, res.clone()));
        return res;
      }),
    ),
  );
});
