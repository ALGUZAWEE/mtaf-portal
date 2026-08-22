// MTAF Portal service worker
// Caches only the app shell (HTML, manifest, icons) so the app opens
// instantly and still opens if there's no signal. Never caches
// Supabase requests \u2014 those always go straight to the network so
// data stays live.

const CACHE_NAME = "mtaf-shell-v1";
const SHELL_FILES = [
  "./mtaf-portal-offline.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
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

  // Never intercept Supabase (or any cross-origin) traffic — always
  // let those go straight to the network so fees, messages, results
  // etc. are always live and never served stale from cache.
  if (url.origin !== self.location.origin) return;

  // App shell: try the network first so updates show up quickly,
  // but fall back to the cached copy if there's no connection.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
