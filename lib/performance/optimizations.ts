// Performance optimization utilities

import { cache } from '@/lib/cache'
import { log } from '@/lib/logger'

// Request deduplication
const pendingRequests = new Map<string, Promise<any>>()

export async function deduplicateRequest<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  // Check if request is already pending
  if (pendingRequests.has(key)) {
    log.debug('Deduplicating request', { key })
    return pendingRequests.get(key)!
  }

  // Create new request
  const promise = fn().finally(() => {
    pendingRequests.delete(key)
  })

  pendingRequests.set(key, promise)
  return promise
}

// Batch processing
export class BatchProcessor<T, R> {
  private queue: Array<{ item: T; resolve: (result: R) => void; reject: (error: any) => void }> = []
  private timer: NodeJS.Timeout | null = null
  private processing = false

  constructor(
    private processor: (items: T[]) => Promise<R[]>,
    private options: {
      maxBatchSize: number
      maxWaitTime: number
      key?: (item: T) => string
    }
  ) {}

  async process(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject })
      this.scheduleProcessing()
    })
  }

  private scheduleProcessing(): void {
    if (this.processing) return

    if (this.queue.length >= this.options.maxBatchSize) {
      this.processBatch()
    } else if (!this.timer) {
      this.timer = setTimeout(() => {
        this.processBatch()
      }, this.options.maxWaitTime)
    }
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) return

    this.processing = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    const batch = this.queue.splice(0, this.options.maxBatchSize)
    const items = batch.map(b => b.item)

    try {
      const results = await this.processor(items)
      
      // Resolve promises
      batch.forEach((b, index) => {
        b.resolve(results[index])
      })
    } catch (error) {
      // Reject all promises in batch
      batch.forEach(b => {
        b.reject(error)
      })
    } finally {
      this.processing = false
      
      // Process next batch if queue has items
      if (this.queue.length > 0) {
        this.scheduleProcessing()
      }
    }
  }
}

// Connection pooling
export class ConnectionPool<T> {
  private available: T[] = []
  private inUse = new Set<T>()
  private waiting: Array<(conn: T) => void> = []
  private createCount = 0

  constructor(
    private factory: () => Promise<T>,
    private destroyer: (conn: T) => Promise<void>,
    private options: {
      min: number
      max: number
      idleTimeout?: number
      validator?: (conn: T) => Promise<boolean>
    }
  ) {
    this.initialize()
  }

  private async initialize(): Promise<void> {
    // Create minimum connections
    const promises = []
    for (let i = 0; i < this.options.min; i++) {
      promises.push(this.createConnection())
    }
    await Promise.all(promises)
  }

  private async createConnection(): Promise<void> {
    if (this.createCount >= this.options.max) {
      return
    }

    try {
      this.createCount++
      const conn = await this.factory()
      this.available.push(conn)
      
      // Notify waiting requests
      const waiter = this.waiting.shift()
      if (waiter) {
        this.available.pop()
        this.inUse.add(conn)
        waiter(conn)
      }
    } catch (error) {
      this.createCount--
      log.error('Failed to create connection', { error })
      throw error
    }
  }

  async acquire(): Promise<T> {
    // Try to get available connection
    while (this.available.length > 0) {
      const conn = this.available.pop()!
      
      // Validate connection if validator provided
      if (this.options.validator) {
        const isValid = await this.options.validator(conn)
        if (!isValid) {
          await this.destroyer(conn)
          this.createCount--
          continue
        }
      }
      
      this.inUse.add(conn)
      return conn
    }

    // Create new connection if under limit
    if (this.createCount < this.options.max) {
      await this.createConnection()
      return this.acquire()
    }

    // Wait for connection to become available
    return new Promise((resolve) => {
      this.waiting.push(resolve)
    })
  }

  async release(conn: T): Promise<void> {
    this.inUse.delete(conn)
    
    // Check if anyone is waiting
    const waiter = this.waiting.shift()
    if (waiter) {
      this.inUse.add(conn)
      waiter(conn)
    } else {
      this.available.push(conn)
    }
  }

  async destroy(): Promise<void> {
    // Destroy all connections
    const allConnections = [...this.available, ...this.inUse]
    await Promise.all(allConnections.map(conn => this.destroyer(conn)))
    
    this.available = []
    this.inUse.clear()
    this.waiting = []
    this.createCount = 0
  }

  getStats(): {
    available: number
    inUse: number
    waiting: number
    total: number
  } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      waiting: this.waiting.length,
      total: this.createCount,
    }
  }
}

// Query optimization helpers
export interface QueryOptimizer {
  analyzeQuery(sql: string): QueryAnalysis
  suggestIndexes(table: string, queries: string[]): IndexSuggestion[]
  explainQuery(sql: string): Promise<ExplainResult>
}

export interface QueryAnalysis {
  complexity: 'simple' | 'moderate' | 'complex'
  estimatedRows: number
  usesIndex: boolean
  suggestions: string[]
}

export interface IndexSuggestion {
  table: string
  columns: string[]
  type: 'btree' | 'hash' | 'gin' | 'gist'
  reason: string
  estimatedImprovement: number
}

export interface ExplainResult {
  plan: any
  executionTime: number
  buffers: {
    shared_hit: number
    shared_read: number
  }
}

// Lazy loading helper
export class LazyLoader<T> {
  private value: T | null = null
  private loading: Promise<T> | null = null

  constructor(
    private loader: () => Promise<T>,
    private options?: {
      ttl?: number
      refresh?: boolean
    }
  ) {}

  async get(): Promise<T> {
    // Return cached value if available
    if (this.value !== null && !this.isExpired()) {
      return this.value
    }

    // Return ongoing load if in progress
    if (this.loading) {
      return this.loading
    }

    // Start new load
    this.loading = this.loader()
      .then(value => {
        this.value = value
        this.loading = null
        return value
      })
      .catch(error => {
        this.loading = null
        throw error
      })

    return this.loading
  }

  private isExpired(): boolean {
    // Implement TTL logic if needed
    return false
  }

  clear(): void {
    this.value = null
    this.loading = null
  }
}

// Pagination helper
export interface PaginationOptions {
  page: number
  limit: number
  maxLimit?: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export function paginate<T>(
  items: T[],
  options: PaginationOptions
): PaginatedResult<T> {
  const limit = Math.min(options.limit, options.maxLimit || 100)
  const offset = (options.page - 1) * limit
  const data = items.slice(offset, offset + limit)
  const total = items.length
  const totalPages = Math.ceil(total / limit)

  return {
    data,
    pagination: {
      page: options.page,
      limit,
      total,
      totalPages,
      hasNext: options.page < totalPages,
      hasPrev: options.page > 1,
    },
  }
}

// Compression utilities
export async function compressResponse(
  data: any,
  acceptEncoding: string
): Promise<{ data: Buffer; encoding: string } | null> {
  const zlib = await import('zlib')
  const { promisify } = await import('util')

  if (acceptEncoding.includes('gzip')) {
    const gzip = promisify(zlib.gzip)
    const compressed = await gzip(JSON.stringify(data))
    return { data: compressed, encoding: 'gzip' }
  }

  if (acceptEncoding.includes('deflate')) {
    const deflate = promisify(zlib.deflate)
    const compressed = await deflate(JSON.stringify(data))
    return { data: compressed, encoding: 'deflate' }
  }

  if (acceptEncoding.includes('br')) {
    const brotli = promisify(zlib.brotliCompress)
    const compressed = await brotli(JSON.stringify(data))
    return { data: compressed, encoding: 'br' }
  }

  return null
}