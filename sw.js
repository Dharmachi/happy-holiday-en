const CACHE = "happy-holiday-v15";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./data.js",
  "./wordlevel.js",
  "./moba.html",
  "./moba-data.js",
  "./moba-app.js",
  "./perfekt.html",
  "./perfekt-data.js",
  "./perfekt-app.js",
  "./deutsch-drill.html",
  "./deutsch-drill-data.js",
  "./deutsch-drill-app.js",
  "./manifest.webmanifest",
  "./icon.svg",
];

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
  // HTML / JS 一律优先网络，避免家人一直看到旧版；漏掉任何一个脚本都会新旧混用
  const isCode = /\.(js|html)$/.test(new URL(req.url).pathname);
  if (req.mode === "navigate" || isCode) {
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
