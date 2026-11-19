/* Ventas en Ruta — service worker.
   Guarda la app en el celular para que abra sin internet.
   Al publicar una version nueva, sube el numero de CACHE. */
const CACHE = "ventas-ruta-v16";
const ARCHIVOS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable.png",
  "./membrete.js",
  "./pdf-cotizacion.js"
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

/* Primero la red, con la copia guardada como respaldo.
   Antes era al reves y funcionaba sin senal, pero cada mejora tardaba una
   o dos aperturas en aparecer. Con este orden el cambio se ve de una, y si
   no hay senal (o la red tarda mas de LIMITE) entra la copia guardada, asi
   que sigue sirviendo en obra. */
const LIMITE = 3500;

self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET") return;                   // los envios a la hoja van directo a la red
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;         // nada externo se cachea
  if (url.pathname.endsWith("catalogo.json")) return; // la lista va siempre a la red

  ev.respondWith((async () => {
    try {
      const red = await Promise.race([
        fetch(url.pathname + url.search, { cache: "no-store" }),
        new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("lenta")), LIMITE))
      ]);
      if (red && red.ok) {
        const c = await caches.open(CACHE);
        c.put(req, red.clone());
        return red;
      }
      throw new Error("respuesta " + (red && red.status));
    } catch (e) {
      const guardada = await caches.match(req);
      if (guardada) return guardada;
      const raiz = await caches.match("./index.html");
      if (raiz) return raiz;
      throw e;
    }
  })());
});
