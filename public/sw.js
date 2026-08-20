const CACHE_NAME = "satgas-static-v5";
const OFFLINE_URL = "/offline";
const STATIC_ASSETS = [OFFLINE_URL, "/manifest.webmanifest", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isCacheableStaticRequest(request) {
  const url = new URL(request.url);
  return url.origin === self.location.origin
    && request.method === "GET"
    && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/_next/image") || url.pathname === "/manifest.webmanifest" || url.pathname === "/favicon.ico");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (isCacheableStaticRequest(request)) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request).then((response) => {
        if (response.ok) void caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      })),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
  }
});
