const CACHE_NAME = 'app-cache-v1'
const RUNTIME_CACHE = 'app-runtime-cache-v1'
const FONT_CACHE = 'app-fonts-v1'
const IMAGE_CACHE = 'app-images-v1'

const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
]

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching assets')
      return cache.addAll(PRECACHE_ASSETS)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return (
              name !== CACHE_NAME &&
              name !== RUNTIME_CACHE &&
              name !== FONT_CACHE &&
              name !== IMAGE_CACHE
            )
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') {
    return
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      })
    )
    return
  }

  if (url.pathname.includes('/fonts/') || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) return response
        
        return fetch(request).then((response) => {
          if (response.status === 200) {
            caches.open(FONT_CACHE).then((c) => c.put(request, response.clone()))
          }
          return response
        }).catch(() => {
          return caches.match(request)
        })
      })
    )
    return
  }

  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) return response
        
        return fetch(request).then((response) => {
          if (response.status === 200) {
            caches.open(IMAGE_CACHE).then((c) => {
              c.put(request, response.clone())
            })
          }
          return response
        }).catch(() => {
          return new Response(
            '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect fill="#ccc" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="#999">Offline</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          )
        })
      })
    )
    return
  }

  if (
    request.mode === 'navigate' ||
    request.destination === 'script' ||
    request.destination === 'style'
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((c) => c.put(request, response.clone()))
          }
          return response
        })
        .catch(() => {
          return caches.match(request).then((response) => {
            if (response) return response
            if (request.mode === 'navigate') {
              return caches.match('/offline.html') ||
                new Response('Offline - Page not available', { status: 503 })
            }
          })
        })
    )
    return
  }
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
