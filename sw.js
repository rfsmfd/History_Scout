/* History Scout service worker — offline support for field use.
   Strategy is deliberately split so you never get a stale app:
     - the app itself (navigation): NETWORK FIRST, cache as fallback
       => at home you always get the newest build; in the woods it loads from cache
     - libraries + map tiles: CACHE FIRST
       => tiles you've already looked at keep working with no signal
   Bump BUILD to match index.html when you ship.  */
const BUILD = 5;
const APP   = 'hs-app-v' + BUILD;
const LIB   = 'hs-lib-v1';
const TILES = 'hs-tiles-v1';
const MAX_TILES = 1200;

const SHELL = ['./', './index.html'];

const LIB_HOSTS = ['cdnjs.cloudflare.com', 'unpkg.com', 'cdn.jsdelivr.net'];
const TILE_HOSTS = ['server.arcgisonline.com', 'basemap.nationalmap.gov', 'tile.openstreetmap.org'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('hs-app-') && k !== APP).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 1. the app shell — network first
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(APP).then(c => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./').then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // 2. libraries — cache first
  if (LIB_HOSTS.includes(url.hostname)) {
    e.respondWith(cacheFirst(req, LIB));
    return;
  }

  // 3. map tiles — cache first, with a rolling cap
  if (TILE_HOSTS.includes(url.hostname)) {
    e.respondWith(cacheFirst(req, TILES, MAX_TILES));
    return;
  }

  // 4. same-origin assets — cache first
  if (url.origin === location.origin) {
    e.respondWith(cacheFirst(req, APP));
  }
});

function cacheFirst(req, cacheName, cap) {
  return caches.match(req).then(hit => {
    if (hit) return hit;
    return fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(cacheName).then(c => {
          c.put(req, copy);
          if (cap) trim(c, cap);
        });
      }
      return res;
    }).catch(() => hit);
  });
}

function trim(cache, max) {
  cache.keys().then(keys => {
    if (keys.length <= max) return;
    for (let i = 0; i < keys.length - max; i++) cache.delete(keys[i]);
  });
}
