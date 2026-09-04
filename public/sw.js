/* Lovely Enterprise PWA service worker.
 *
 * Strategy:
 *  - Static assets (JS/CSS/images/fonts) -> cache-first, fast offline shells.
 *  - API calls & navigation -> network-first, always fresh data.
 */
const CACHE = "lovely-erp-v1";
const STATIC_PRECACHE = ["/", "/pwa", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(STATIC_PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Always network-first for API and navigation so users never see stale data.
  if (
    url.pathname.startsWith("/api/") ||
    event.request.mode === "navigate"
  ) {
    event.respondWith(
      fetch(event.request).catch(() =>
        event.request.mode === "navigate"
          ? caches.match("/") || caches.match("/index.html")
          : new Response(JSON.stringify({ error: "offline" }), {
              headers: { "Content-Type": "application/json" },
            }),
      ),
    );
    return;
  }

  // Static assets: cache-first for fast loads.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }),
  );
});
