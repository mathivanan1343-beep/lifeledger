// LifeLedger web app (PWA) service worker: makes the app open offline and update itself.
// The cache version and the list of app files are filled in by scripts/build-pwa.js.
// It caches ONLY the app's own files. User data lives in the browser's local storage and is
// never cached, sent or touched here.
const CACHE = 'lifeledger-1.7.4-1795848141853';
const PRECACHE = ["/lifeledger/","/lifeledger/favicon.ico","/lifeledger/icons/icon-1024.png","/lifeledger/icons/icon-192.png","/lifeledger/index.html","/lifeledger/manifest.webmanifest","/lifeledger/_expo/static/js/web/index-8ce5b7b9fe2b1d806e227b2678d3a558.js"];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('lifeledger-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch other sites (e.g. usage counter)

  // Pages: network first (get updates), fall back to the cached app when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match(self.registration.scope)))
    );
    return;
  }
  // App files (hashed names): cache first.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
