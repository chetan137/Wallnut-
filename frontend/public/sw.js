// Wallnut Analytics — Progressive Web App Service Worker
const CACHE_NAME = 'wallnut-analytics-v1';

// Install event — activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event — NETWORK-FIRST FOR ALL API CALLS to guarantee live Tally & DB sync
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NEVER cache API requests (Live Tally sync, calls, etc. must always hit the backend)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch((err) => {
        console.warn('API fetch failed:', err);
        return new Response(JSON.stringify({ ok: false, error: 'Network unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }

  // Network-first for everything else
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
