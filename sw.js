const CACHE_NAME = "rdo-team-v1";

const APP_SHELL = [
    "/",
    "/index.html",
    "/view/index-rdo.html",
    "/view/index-rdo-solda.html",
    "/view/styles.css",
    "/controller/main-rdo-solda.js",
    "/icons/icon-192.svg",
    "/icons/icon-512.svg",
    "/manifest.json"
];

const CDN_CACHE = "rdo-cdn-v1";

self.addEventListener("install", e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME && k !== CDN_CACHE)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", e => {
    const url = new URL(e.request.url);

    // Recursos CDN: network first, cai no cache se offline
    if (url.hostname.includes("cdn.jsdelivr.net")) {
        e.respondWith(
            fetch(e.request)
                .then(res => {
                    const clone = res.clone();
                    caches.open(CDN_CACHE).then(c => c.put(e.request, clone));
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
        return;
    }

    // App shell: cache first, network fallback
    if (e.request.method === "GET") {
        e.respondWith(
            caches.match(e.request).then(cached => {
                if (cached) return cached;
                return fetch(e.request).then(res => {
                    if (!res || res.status !== 200 || res.type === "opaque") return res;
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                    return res;
                });
            })
        );
    }
});
