const VERSION = "usta-cepte-pwa-v1";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

function basePath() {
  return new URL("./", self.registration.scope).pathname;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      const base = basePath();
      return cache.addAll([
        base,
        `${base}index.html`,
        `${base}manifest.webmanifest`,
        `${base}icon-192.svg`,
        `${base}icon-512.svg`,
        `${base}favicon.svg`,
      ]);
    }).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  const url = new URL(request.url);
  const base = basePath();
  if (!url.pathname.startsWith(base)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(RUNTIME_CACHE);
          return (await cache.match(request)) || (await caches.match(`${base}index.html`)) || caches.match(base);
        }),
    );
    return;
  }

  if (url.pathname.includes("/api/")) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && (request.destination === "script" || request.destination === "style" || request.destination === "font" || request.destination === "image")) {
          const copy = response.clone();
          void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});