/**
 * 電波が無くても ドリルが開けるようにする。
 *
 * ドリルは問題も記録も端末の中で完結しているので、いちど読み込めば通信は要らない。
 * 版が変わったら古い置き場は捨てる（?v= で名前が変わる）。
 */

const VERSION = new URL(self.location.href).searchParams.get("v") || "0";
const CACHE = "drill-" + VERSION;

// 最初に取っておくもの。ここに無いものも、いちど通ればあとから貯まる
const SHELL = ["/", "/index.html", "/index.js", "/style.css", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 外（キャニスターへの問い合わせ等）は触らない

  // 画面の入口は、まず貯めたものを見せてから、うしろで新しくする
  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(request, { ignoreSearch: true }).then(hit => {
        const fresh = fetch(request)
          .then(response => {
            if (response && response.status === 200 && response.type === "basic") {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => hit || cache.match("/index.html"));
        return hit || fresh;
      })
    )
  );
});
