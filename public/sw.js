const CACHE = "muv-v1"

const ASSETS = [
  "/",
  "/login",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (url.origin !== location.origin) return

  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/__nextjs/")) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        fetch(request).then((response) => {
          cache.put(request, response.clone())
          return response
        }).catch(() => caches.match(request))
      )
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
})
