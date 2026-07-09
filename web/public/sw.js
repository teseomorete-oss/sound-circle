// Self-destroying service worker. The app now runs on an always-on local server
// and no longer uses offline caching (it only caused stale builds). This worker
// clears all caches, unregisters itself, and reloads open pages so any browser
// still holding an old cached build cleans itself up on next visit.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.clients.claim();
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});

// Pass everything straight through to the network — no caching.
