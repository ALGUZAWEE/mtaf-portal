// MTAF Portal service worker
// Only caches truly static, rarely-changing files (icons, manifest) so
// the app's icon/branding still show up with no signal. The app page
// itself (index.html) and all Supabase requests always go straight to
// the network \u2014 never served from a cached copy \u2014 so a brief
// connection hiccup can never silently show old, stale, or buggy data.

const CACHE_NAME = "mtaf-shell-v2";
const STATIC_FILES = [
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept Supabase (or any cross-origin) traffic.
  if (url.origin !== self.location.origin) return;

  // Never intercept the app page itself (any HTML navigation, or the
  // known app filenames) \u2014 always go straight to the network so
  // updates and fixes are never masked by a stale cached copy. If
  // there's genuinely no connection, let the browser show its normal
  // offline error rather than silently loading old, possibly-broken
  // code.
  const isDocument = event.request.mode === "navigate" || event.request.destination === "document";
  const isAppHtml = /\.(html)$/i.test(url.pathname) || url.pathname.endsWith("/");
  if (isDocument || isAppHtml) return;

  // Everything else (icons, manifest): cache-first, since these
  // essentially never change and are safe to reuse offline.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
