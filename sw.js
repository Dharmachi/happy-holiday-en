const CACHE = "happy-holiday-v10";
const ASSETS = ["./", "./index.html", "./app.js", "./data.js", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // HTML / JS 优先网络，避免家人一直看到旧版
  if (req.mode === "navigate" || req.url.includes("app.js") || req.url.includes("data.js") || req.url.includes("index.html")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }
  e.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});
