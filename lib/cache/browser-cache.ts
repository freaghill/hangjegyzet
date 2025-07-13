// Browser caching utilities
export const browserCache = {
  // Cache names
  CACHE_NAME: 'hangjegyzet-v1',
  STATIC_CACHE: 'hangjegyzet-static-v1',
  API_CACHE: 'hangjegyzet-api-v1',
  IMAGE_CACHE: 'hangjegyzet-images-v1',

  // Cache strategies
  strategies: {
    // Network first, fallback to cache
    networkFirst: async (request: Request): Promise<Response> => {
      try {
        const response = await fetch(request)
        if (response.ok) {
          const cache = await caches.open(browserCache.CACHE_NAME)
          cache.put(request, response.clone())
        }
        return response
      } catch (error) {
        const cached = await caches.match(request)
        if (cached) return cached
        throw error
      }
    },

    // Cache first, fallback to network
    cacheFirst: async (request: Request): Promise<Response> => {
      const cached = await caches.match(request)
      if (cached) return cached

      const response = await fetch(request)
      if (response.ok) {
        const cache = await caches.open(browserCache.CACHE_NAME)
        cache.put(request, response.clone())
      }
      return response
    },

    // Stale while revalidate
    staleWhileRevalidate: async (request: Request): Promise<Response> => {
      const cached = await caches.match(request)
      
      const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
          caches.open(browserCache.CACHE_NAME).then(cache => {
            cache.put(request, response.clone())
          })
        }
        return response
      })

      return cached || fetchPromise
    },
  },

  // Precache essential assets
  precache: async (urls: string[]) => {
    const cache = await caches.open(browserCache.STATIC_CACHE)
    await cache.addAll(urls)
  },

  // Clean old caches
  cleanOldCaches: async () => {
    const cacheNames = await caches.keys()
    const currentCaches = [
      browserCache.CACHE_NAME,
      browserCache.STATIC_CACHE,
      browserCache.API_CACHE,
      browserCache.IMAGE_CACHE,
    ]

    await Promise.all(
      cacheNames
        .filter(name => !currentCaches.includes(name))
        .map(name => caches.delete(name))
    )
  },

  // Cache with expiration
  cacheWithExpiry: async (
    cacheName: string,
    request: Request,
    response: Response,
    expiryMinutes: number
  ) => {
    const cache = await caches.open(cacheName)
    const clonedResponse = response.clone()
    
    // Add expiry metadata
    const headers = new Headers(clonedResponse.headers)
    headers.set('sw-cache-expire', new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString())
    
    const responseWithExpiry = new Response(clonedResponse.body, {
      status: clonedResponse.status,
      statusText: clonedResponse.statusText,
      headers: headers,
    })

    await cache.put(request, responseWithExpiry)
  },

  // Get cache with expiry check
  getCacheWithExpiry: async (
    cacheName: string,
    request: Request
  ): Promise<Response | null> => {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(request)
    
    if (!cached) return null

    const expiry = cached.headers.get('sw-cache-expire')
    if (expiry && new Date(expiry) < new Date()) {
      await cache.delete(request)
      return null
    }

    return cached
  },
}

// IndexedDB for larger data caching
export class LocalDataCache {
  private dbName = 'hangjegyzet-cache'
  private version = 1
  private db: IDBDatabase | null = null

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create stores
        if (!db.objectStoreNames.contains('meetings')) {
          db.createObjectStore('meetings', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('transcripts')) {
          db.createObjectStore('transcripts', { keyPath: 'meetingId' })
        }
        if (!db.objectStoreNames.contains('analytics')) {
          const store = db.createObjectStore('analytics', { keyPath: 'key' })
          store.createIndex('timestamp', 'timestamp')
        }
      }
    })
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async set(storeName: string, data: any): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(data)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

// Create singleton instance
export const localCache = new LocalDataCache()