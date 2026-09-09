/* Service worker per "Slot della Sagra" — installabile e funzionante offline.
   Ad ogni modifica dei file, alza CACHE_VERSION per forzare l'aggiornamento. */
const CACHE_VERSION = 'slot-sagra-v14';

/* Risorse messe in cache all'installazione: dopo la prima apertura la slot
   funziona anche senza connessione. */
const PRECACHE_URLS = [
  './slot.html',
  './slot.css',
  './slot.js',
  './pieronzo.js',
  './pwa.js',
  './manifest.webmanifest',
  './images/icons/icon-192.png',
  './images/icons/icon-512.png',
  './images/icons/icon-maskable-512.png',
  './images/icons/apple-touch-icon.png',
  './images/slot/bonus.png',
  './images/slot/gem.png',
  './images/slot/jack.png',
  './images/slot/king.png',
  './images/slot/moneybag.png',
  './images/slot/queen.png',
  './images/slot/ten.png',
  './images/slot/wild.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigazioni: prova la rete, se offline usa la slot in cache.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./slot.html'))
    );
    return;
  }

  // Altre risorse: cache-first, con aggiornamento in background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
