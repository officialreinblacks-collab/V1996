// MarketPlusView service worker: lets the app open with no connection.
const CACHE = 'marketplusview-shell-v1';
const LIB = 'https://cdnjs.cloudflare.com/ajax/libs/lightweight-charts/4.1.3/lightweight-charts.standalone.production.js';
const STATIC_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'res.cloudinary.com'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(['./', './index.html', 'manifest.json'].map(u => c.add(u).catch(() => {})));
    try { await c.put(LIB, await fetch(new Request(LIB, { mode: 'no-cors' }))); } catch (err) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

const store = async (req, res) => {
  if (res && (res.ok || res.type === 'opaque')) { try { (await caches.open(CACHE)).put(req, res.clone()); } catch (e) {} }
  return res;
};

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.hostname.endsWith('binance.com')) return; // live market data is handled by the app

  // The page itself: network first (so updates arrive), saved copy when offline.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
        const res = await fetch(req, { signal: ctl.signal }); clearTimeout(t);
        return store('./', res);
      } catch (err) {
        return (await caches.match('./')) || (await caches.match(req)) || Response.error();
      }
    })());
    return;
  }

  // Libraries, fonts, logo and other app files: saved copy first, refreshed in the background.
  if (url.origin === location.origin || STATIC_HOSTS.includes(url.hostname)) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      const net = fetch(req).then(res => store(req, res)).catch(() => null);
      return hit || (await net) || Response.error();
    })());
  }
});

// Tapping an alert notification brings the app forward.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (list.length) return list[0].focus();
    return clients.openWindow('./');
  })());
});
