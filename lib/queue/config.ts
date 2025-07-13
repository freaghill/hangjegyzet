import Redis from 'ioredis'
import { Queue, Worker, QueueEvents } from 'bullmq'

// Redis connection for BullMQ
export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
})

// Keep internal reference for backward compatibility
const connection = redisConnection

// Queue definitions
export const QUEUE_NAMES = {
  TRANSCRIPTION: 'transcription',
  AI_PROCESSING: 'ai-processing',
  EXPORT: 'export',
  EMAIL: 'email',
  CLEANUP: 'cleanup',
  WEBHOOK: 'webhook',
} as const

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES]

// Job priorities
export const JOB_PRIORITIES = {
  HIGH: 1,
  NORMAL: 5,
  LOW: 10,
} as const

// Queue options
export const QUEUE_OPTIONS = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 7 days
    },
  },
}

// Create queue instances
export const queues: Record<QueueName, Queue> = {
  [QUEUE_NAMES.TRANSCRIPTION]: new Queue(QUEUE_NAMES.TRANSCRIPTION, {
    connection,
    ...QUEUE_OPTIONS,
  }),
  [QUEUE_NAMES.AI_PROCESSING]: new Queue(QUEUE_NAMES.AI_PROCESSING, {
    connection,
    ...QUEUE_OPTIONS,
  }),
  [QUEUE_NAMES.EXPORT]: new Queue(QUEUE_NAMES.EXPORT, {
    connection,
    ...QUEUE_OPTIONS,
  }),
  [QUEUE_NAMES.EMAIL]: new Queue(QUEUE_NAMES.EMAIL, {
    connection,
    ...QUEUE_OPTIONS,
  }),
  [QUEUE_NAMES.CLEANUP]: new Queue(QUEUE_NAMES.CLEANUP, {
    connection,
    ...QUEUE_OPTIONS,
  }),
  [QUEUE_NAMES.WEBHOOK]: new Queue(QUEUE_NAMES.WEBHOOK, {
    connection,
    ...QUEUE_OPTIONS,
  }),
}

// Queue events for monitoring
export const queueEvents: Record<QueueName, QueueEvents> = {
  [QUEUE_NAMES.TRANSCRIPTION]: new QueueEvents(QUEUE_NAMES.TRANSCRIPTION, { connection }),
  [QUEUE_NAMES.AI_PROCESSING]: new QueueEvents(QUEUE_NAMES.AI_PROCESSING, { connection }),
  [QUEUE_NAMES.EXPORT]: new QueueEvents(QUEUE_NAMES.EXPORT, { connection }),
  [QUEUE_NAMES.EMAIL]: new QueueEvents(QUEUE_NAMES.EMAIL, { connection }),
  [QUEUE_NAMES.CLEANUP]: new QueueEvents(QUEUE_NAMES.CLEANUP, { connection }),
  [QUEUE_NAMES.WEBHOOK]: new QueueEvents(QUEUE_NAMES.WEBHOOK, { connection }),
}

// Helper to get queue by name
export function getQueue(name: QueueName): Queue {
  return queues[name]
}

// Helper to close all connections
export async function closeQueues() {
  await Promise.all(Object.values(queues).map(queue => queue.close()))
  await Promise.all(Object.values(queueEvents).map(events => events.close()))
  await connection.quit()
}

// Performance settings based on CPU cores
export const WORKER_SETTINGS = {
  [QUEUE_NAMES.TRANSCRIPTION]: {
    concurrency: parseInt(process.env.TRANSCRIPTION_CONCURRENCY || '2'),
    limiter: {
      max: 5,
      duration: 60000, // 5 jobs per minute
    },
  },
  [QUEUE_NAMES.AI_PROCESSING]: {
    concurrency: parseInt(process.env.AI_CONCURRENCY || '3'),
    limiter: {
      max: 10,
      duration: 60000, // 10 jobs per minute
    },
  },
  [QUEUE_NAMES.EXPORT]: {
    concurrency: parseInt(process.env.EXPORT_CONCURRENCY || '5'),
    limiter: {
      max: 20,
      duration: 60000, // 20 jobs per minute
    },
  },
  [QUEUE_NAMES.EMAIL]: {
    concurrency: parseInt(process.env.EMAIL_CONCURRENCY || '10'),
    limiter: {
      max: 100,
      duration: 60000, // 100 emails per minute
    },
  },
  [QUEUE_NAMES.CLEANUP]: {
    concurrency: 1,
    limiter: {
      max: 1,
      duration: 300000, // 1 job per 5 minutes
    },
  },
}