// Service Worker for HangJegyzet
const CACHE_VERSION = 'v1'
const CACHE_NAME = `hangjegyzet-${CACHE_VERSION}`
const API_CACHE = `hangjegyzet-api-${CACHE_VERSION}`
const IMAGE_CACHE = `hangjegyzet-images-${CACHE_VERSION}`

// Assets to precache
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  '/images/placeholder.svg',
  '/images/default-avatar.svg',
]

// Install event - precache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS)
    })
  )
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('hangjegyzet-') && !name.includes(CACHE_VERSION)
          })
          .map((name) => caches.delete(name))
      )
    })
  )
  // Take control of all pages immediately
  self.clients.claim()
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip WebSocket and SSE connections
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle image requests
  if (request.destination === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.pathname)) {
    event.respondWith(handleImageRequest(request))
    return
  }

  // Handle static assets
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleStaticRequest(request))
    return
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request))
    return
  }

  // Default strategy - network first
  event.respondWith(handleDefaultRequest(request))
})

// API requests - network first with cache fallback
async function handleApiRequest(request) {
  try {
    const response = await fetch(request)
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(API_CACHE)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    // Try cache on network failure
    const cached = await caches.match(request)
    if (cached) {
      // Add header to indicate stale response
      const headers = new Headers(cached.headers)
      headers.set('X-SW-Cache', 'stale')
      
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: headers,
      })
    }
    
    // Return error response
    return new Response(
      JSON.stringify({ error: 'Network error' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

// Image requests - cache first with network fallback
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE)
  const cached = await cache.match(request)
  
  if (cached) {
    // Return cached image and update in background
    fetchAndCache(request, IMAGE_CACHE)
    return cached
  }
  
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    // Return placeholder image on error
    return caches.match('/images/placeholder.svg')
  }
}

// Static assets - cache first, immutable
async function handleStaticRequest(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())
  }
  
  return response
}

// Navigation requests - network first with offline page
async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request)
    
    // Cache successful page loads
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    // Try cache
    const cached = await caches.match(request)
    if (cached) return cached
    
    // Return offline page
    return caches.match('/offline')
  }
}

// Default requests - stale while revalidate
async function handleDefaultRequest(request) {
  const cached = await caches.match(request)
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const cache = caches.open(CACHE_NAME)
      cache.then((c) => c.put(request, response.clone()))
    }
    return response
  })
  
  return cached || fetchPromise
}

// Background fetch and cache
async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response)
    }
  } catch (error) {
    // Silent fail for background updates
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls)
      })
    )
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => {
        return Promise.all(names.map((name) => caches.delete(name)))
      })
    )
  }
})