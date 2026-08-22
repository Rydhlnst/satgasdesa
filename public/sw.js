const CACHE_NAME = "satgas-static-v7";
const OFFLINE_URL = "/offline";
const STATIC_ASSETS = [OFFLINE_URL, "/manifest.webmanifest", "/favicon.ico"];

async function cacheResponse(request, response) {
  if (!response || !response.ok) return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request).then((response) => cacheResponse(request, response));
  if (cached) {
    void network.catch(() => undefined);
    return cached;
  }
  return network;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.allSettled(STATIC_ASSETS.map((asset) => cache.add(asset)))));
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
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
  }
});
