/* 今日のカード（体験版）Service Worker：ネット優先、つながらないときだけキャッシュ */
const CACHE = 'akari-daily-card-v2';
const ASSETS = ['./', './index.html', './config.js', './cards.js', './generator.js', './voice.js', './app.js', './icon.svg', './icon-192.png', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('akari-daily-card-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !font) return; // Supabase などはそのまま通す
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok && (sameOrigin || font)) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((m) => m || caches.match('./index.html')))
  );
});
