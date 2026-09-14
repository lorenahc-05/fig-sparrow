// ============================================================
// SERVICE WORKER — hace la app instalable de verdad y la deja
// funcionando sin conexión. Estrategia simple: sirve de caché al
// momento y actualiza esa caché en segundo plano en cada petición.
// ============================================================

const CACHE_NAME = "figsparrow-v1";

const APP_SHELL = [
  "./",
  "index.html",
  "style.css",
  "data.js",
  "store.js",
  "sync-config.js",
  "sync.js",
  "app.js",
  "manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // no tocar Firestore/Google Fonts

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
