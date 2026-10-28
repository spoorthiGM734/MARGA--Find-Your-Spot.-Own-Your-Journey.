// MARGA service worker: lets the app install on a phone and open the main screens when the network is slow or missing.
// Pages and scripts are fetched from the network first (so you always get the newest version) and fall back to the saved copy.
const CACHE = 'marga-v3';
const SHELL = ['/', '/index.html', '/search.html', '/auth.html', '/dashboard.html', '/facility.html', '/drive.html', '/rush.html', '/offline.html',
  '/css/style.css', '/js/common.js', '/js/i18n.js', '/js/guide.js', '/img/logo.png', '/img/icon-192.png', '/manifest.json'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;   // live data is never cached
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request).then((m) => m || (e.request.mode === 'navigate' ? caches.match('/offline.html') : undefined))));
});
