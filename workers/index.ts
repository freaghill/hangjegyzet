import './transcription.worker'
import './ai-processing.worker'
import { closeQueues } from '@/lib/queue/config'

console.log('🚀 Workers started successfully')

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down workers...')
  await closeQueues()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down workers...')
  await closeQueues()
  process.exit(0)
})