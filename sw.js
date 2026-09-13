/* History Scout service worker — offline support for field use.
   Strategy is deliberately split so you never get a stale app:
     - the app itself (navigation): NETWORK FIRST, cache as fallback
       => at home you always get the newest build; in the woods it loads from cache
     - libraries + map tiles: CACHE FIRST
       => tiles you've already looked at keep working with no signal
   Bump BUILD to match index.html when you ship.  */
const BUILD = 18;
const APP   = 'hs-app-v' + BUILD;
const LIB   = 'hs-lib-v1';
const TILES = 'hs-tiles-v1';
const MAX_TILES = 1200;

const SHELL = ['./', './index.html'];

/* www.gstatic.com serves the Firebase code (BUILD 11). Saved like the other libraries so the app
   still opens and captures in a hollow with no signal. The database and photo-storage requests
   themselves go to *.googleapis.com, which is on no list here, so they always go to the network. */
const LIB_HOSTS = ['cdnjs.cloudflare.com', 'unpkg.com', 'cdn.jsdelivr.net', 'www.gstatic.com'];
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
      // Update checks used to be cached, one entry per check, forever. Clear them out.
      .then(() => caches.open(APP).then(c => c.keys().then(reqs =>
        Promise.all(reqs.filter(r => r.url.includes('sw.js')).map(r => c.delete(r)))
      )))
      .then(() => self.clients.claim())
  );
});

/* What counts as "the app itself".

   This used to be only `mode === 'navigate'` or a path ending in .html — and that
   left a hole big enough to strand the app permanently. The home screen icon opens
   the bare directory URL ("…/History_Scout/"), which ends in a slash, not in .html.
   When that request did not arrive flagged as a navigation it fell through to rule 4
   and was served cache-first, so the installed app kept handing back whatever build
   it first saw while Safari, asking a slightly different way, updated normally.

   That is exactly what happened between BUILD 4 and BUILD 5: Safari showed 5, the
   home screen icon sat on 4 and no amount of reopening moved it. Reproduced here
   before fixing: fetch('./') returned the old build while fetch('./index.html')
   returned the new one. */
const DOC_PAGES = /\/(manual|card)\.html$/;
const isAppItself = (req, url) =>
  (!(url.origin === location.origin && DOC_PAGES.test(url.pathname))) &&
  (req.mode === 'navigate' ||
  req.destination === 'document' ||
  (url.origin === location.origin &&
    (url.pathname.endsWith('.html') || url.pathname.endsWith('/'))));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* 0. Never touch sw.js. It is how the app asks "is there a newer build?", so a
        cached answer is worse than useless.

        This check used to live down in rule 4, AFTER the shell rule. In BUILD 7 the
        shell rule was accidentally written as `if (isAppItself)` — testing the
        function instead of calling it, which is always true — so every request fell
        into the shell rule, this one included, and the update check was saved AS
        THE APP. With no signal, History Scout opened as a page of its own source
        code. Checking sw.js first means no mistake further down can ever route it
        into the cache again. Fixed in BUILD 8. */
  if (url.origin === location.origin && url.pathname.endsWith('sw.js')) return;

  // 1. the app shell — network first. CALL it: a bare `isAppItself` is always true.
  if (isAppItself(req, url)) {
    e.respondWith(shellResponse(req));
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

/* The app itself: try the network, but do not wait forever for it.

   Straight network-first hangs on marginal signal — a bar or two is enough to keep
   the connection trying and never complete, and the app simply never opens. That is
   a real field failure, not a theoretical one: it is why Outdoor Companion grew this
   same 2-second rule, and it is copied from there.

   With signal: the network almost always wins the race, so a new build appears at
   once. Without it, or on one bar: the saved copy is served immediately and the app
   opens. Either way the network fetch, whenever it finally finishes, still refreshes
   the cache for next time. */
const SHELL_TIMEOUT = 2000;

function shellResponse(req) {
  return caches.match('./')
    .then(hit => hit || caches.match('./index.html'))
    .then(cached => {
      const network = fetch(req, { cache: 'no-store' })
        .then(res => {
          if (res && res.ok) {
            const a = res.clone(), b = res.clone();
            caches.open(APP).then(c => { c.put('./', a); c.put('./index.html', b); });
            return res;
          }
          // a 404 or a 500 is not worth replacing a good saved copy with
          return cached ? null : res;
        })
        .catch(() => null);

      // nothing saved yet — the network is the only option, however long it takes
      if (!cached) {
        return network.then(res => res || fetch(req)
          .catch(() => new Response('History Scout is offline and has nothing saved yet.',
            { status: 503, headers: { 'Content-Type': 'text/plain' } })));
      }

      return Promise.race([
        network,
        new Promise(r => setTimeout(() => r(null), SHELL_TIMEOUT))
      ]).then(res => res || cached);
    });
}

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
