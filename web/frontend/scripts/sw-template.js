const CACHE = __CACHE_NAME__;
const FILES = __PRECACHE_FILES__;
const PUBLIC_PATHS = new Set(FILES);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("replens-shell-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;
  if (request.mode === "navigate" && url.pathname === "/") {
    event.respondWith(
      fetch(request).catch(async () => {
        return (await caches.match("/index.html")) ?? Response.error();
      }),
    );
    return;
  }
  if (!PUBLIC_PATHS.has(url.pathname)) return;
  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request)),
  );
});
