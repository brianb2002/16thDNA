/* XVI DNA offline cache: the app page is network-first (updates land when online);
   three.js and fonts from the CDN are cached after the first visit. Market data,
   AI and broker calls are never cached. */
const CACHE = 'xvi-dna-v8';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'manifest.json', 'icon-192.png'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  const cdn = /(^|\.)(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname);
  const same = u.origin === self.location.origin && !u.pathname.startsWith('/__cb');
  if (!cdn && !same) return;
  if (cdn) { e.respondWith(caches.match(r).then(h => h || fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)); return res; }))); return; }
  e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)); return res; }).catch(() => caches.match(r, { ignoreSearch: true })));
});
