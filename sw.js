/* Ventas en Ruta — service worker.
   Guarda la app en el celular para que abra sin internet.
   Al publicar una version nueva, sube el numero de CACHE. */
const CACHE = "ventas-ruta-v2";
const ARCHIVOS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable.png"
];

self.addEventListener("install", ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ARCHIVOS).catch(() => c.add("./index.html")))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", ev => {
  ev.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET") return;                 // los envios a la hoja van directo a la red
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;       // nada externo se cachea

  ev.respondWith(
    caches.match(req).then(hit => {
      if (hit) {
        // refresca en segundo plano, sin bloquear
        fetch(req).then(r => {
          if (r && r.ok) caches.open(CACHE).then(c => c.put(req, r.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(req)
        .then(r => {
          if (r && r.ok) caches.open(CACHE).then(c => c.put(req, r.clone()));
          return r;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
