const CACHE = "presew-shell-__BUILD_ID__";
const SHELL = [
  "/",
  "/index.html",
  "/app.js",
  "/styles.css",
  "/atelier.css",
  "/fonts/manrope-latin.woff2",
  "/fonts/cormorant-latin.woff2",
  "/fonts/cormorant-italic-latin.woff2",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/assets/icon.svg",
  "/assets/favicon-32.png",
  "/assets/apple-touch-icon.png",
  "/assets/app-icon-192.png",
  "/assets/app-icon-512.png",
  "/assets/maskable-icon-192.png",
  "/assets/maskable-icon-512.png",
  "/assets/studio-hero.svg",
  ...["sun", "plum", "indigo", "rose", "sage", "cocoa"].map((x) => `/assets/fabric-${x}.svg`),
  ...["dress", "peplum", "set", "evening", "agbada", "skirt"].map((x) => `/assets/style-${x}.svg`),
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("presew-shell-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !SHELL.includes(url.pathname) ||
    url.search
  )
    return;
  // Serve one complete build until the user accepts an update. Never cache account APIs or photos.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(url.pathname);
      if (cached) return cached;
      try {
        return await fetch(event.request);
      } catch {
        return new Response("Reconnect to open PreSew.", { status: 503 });
      }
    }),
  );
});
