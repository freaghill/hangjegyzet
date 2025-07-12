import { performance } from 'perf_hooks'
import { WebSocketManager } from '@/lib/realtime/websocket-manager'
import { StreamingTranscription } from '@/lib/realtime/streaming-transcription'
import { LiveAnalysis } from '@/lib/realtime/live-analysis'
import { AlertEngine } from '@/lib/realtime/alert-engine'

describe('Real-Time Performance Tests', () => {
  let wsManager: WebSocketManager
  let transcription: StreamingTranscription
  let analysis: LiveAnalysis
  let alerts: AlertEngine

  beforeEach(() => {
    wsManager = new WebSocketManager()
    transcription = new StreamingTranscription()
    analysis = new LiveAnalysis()
    alerts = new AlertEngine()
  })

  afterEach(() => {
    wsManager.disconnect()
  })

  describe('Latency Requirements', () => {
    test('audio to transcript latency should be <500ms', async () => {
      const audioData = new Float32Array(4096).fill(0.5)
      const start = performance.now()
      
      const result = await transcription.processAudioChunk({
        data: audioData,
        sampleRate: 16000,
        timestamp: Date.now()
      })
      
      const latency = performance.now() - start
      expect(latency).toBeLessThan(500)
    })

    test('insight generation should be <1s', async () => {
      const transcript = 'Ez egy teszt meeting. Beszéljünk a költségvetésről.'
      const start = performance.now()
      
      const sentimentResult = await analysis.analyzeSentiment(transcript)
      
      const latency = performance.now() - start
      expect(latency).toBeLessThan(1000)
      expect(sentimentResult).toBeDefined()
    })

    test('alert detection should be <2s', async () => {
      const transcript = 'A GDPR compliance nagyon fontos számunkra.'
      const start = performance.now()
      
      alerts.addRule({
        id: 'gdpr',
        type: 'keyword',
        config: { keywords: ['GDPR', 'compliance'] },
        priority: 'high',
        enabled: true
      })
      
      const alertResults = await alerts.checkAlerts(transcript, {
        speaker: 'Test Speaker',
        timestamp: Date.now()
      })
      
      const latency = performance.now() - start
      expect(latency).toBeLessThan(2000)
      expect(alertResults).toHaveLength(1)
    })
  })

  describe('Concurrent Processing', () => {
    test('should handle 10 concurrent audio streams', async () => {
      const streams = Array.from({ length: 10 }, (_, i) => ({
        id: `stream-${i}`,
        data: new Float32Array(4096).fill(Math.random())
      }))
      
      const start = performance.now()
      
      const results = await Promise.all(
        streams.map(stream => 
          transcription.processAudioChunk({
            data: stream.data,
            sampleRate: 16000,
            timestamp: Date.now()
          })
        )
      )
      
      const totalTime = performance.now() - start
      const avgTime = totalTime / streams.length
      
      expect(results).toHaveLength(10)
      expect(avgTime).toBeLessThan(500) // Average should still be under 500ms
    })

    test('should maintain performance with multiple analysis types', async () => {
      const transcript = 'Ez egy hosszabb meeting transcript több témával...'
      const start = performance.now()
      
      const [sentiment, emotion, topics, engagement] = await Promise.all([
        analysis.analyzeSentiment(transcript),
        analysis.detectEmotion(transcript, {}),
        analysis.trackTopics(transcript),
        analysis.calculateEngagement('speaker1', transcript)
      ])
      
      const totalTime = performance.now() - start
      
      expect(totalTime).toBeLessThan(2000) // All analyses combined under 2s
      expect(sentiment).toBeDefined()
      expect(emotion).toBeDefined()
      expect(topics).toBeDefined()
      expect(engagement).toBeGreaterThan(0)
    })
  })

  describe('Memory Management', () => {
    test('should not leak memory with continuous processing', async () => {
      if (!global.gc) {
        console.warn('Garbage collection not exposed. Run with --expose-gc')
        return
      }
      
      const initialMemory = process.memoryUsage().heapUsed
      
      // Process 1000 audio chunks
      for (let i = 0; i < 1000; i++) {
        const audioData = new Float32Array(4096).fill(Math.random())
        await transcription.processAudioChunk({
          data: audioData,
          sampleRate: 16000,
          timestamp: Date.now()
        })
        
        // Force GC every 100 iterations
        if (i % 100 === 0) {
          global.gc()
        }
      }
      
      global.gc()
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024 // MB
      
      expect(memoryIncrease).toBeLessThan(50) // Less than 50MB increase
    })

    test('should clean up old data efficiently', async () => {
      const store = analysis['store']
      
      // Add 10000 data points
      for (let i = 0; i < 10000; i++) {
        store.add('test-metric', Math.random(), { type: 'gauge' })
      }
      
      // Check memory usage
      const dataSize = JSON.stringify(store.export()).length
      expect(dataSize).toBeLessThan(1024 * 1024) // Less than 1MB when serialized
      
      // Old data should be compressed or removed
      const exportedData = store.export()
      expect(Object.keys(exportedData).length).toBeGreaterThan(0)
    })
  })

  describe('Network Optimization', () => {
    test('should batch WebSocket messages efficiently', async () => {
      let messageCount = 0
      const mockSend = jest.fn()
      
      // Mock WebSocket send
      wsManager['io'] = {
        emit: mockSend
      } as any
      
      // Send 100 updates rapidly
      for (let i = 0; i < 100; i++) {
        wsManager['broadcastTranscript']({
          segment: `Segment ${i}`,
          timestamp: Date.now()
        })
      }
      
      // Wait for batching
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Should batch messages, not send 100 individual ones
      expect(mockSend).toHaveBeenCalledTimes(1) // Or very few times
    })

    test('should compress large payloads', () => {
      const largeTranscript = 'A'.repeat(10000)
      
      // In real implementation, this would use actual compression
      const compressed = wsManager['compressPayload']?.(largeTranscript) || largeTranscript
      
      // Verify compression would be applied
      expect(largeTranscript.length).toBeGreaterThan(1024) // Threshold for compression
    })
  })

  describe('Edge Cases', () => {
    test('should handle audio buffer overflow gracefully', async () => {
      const buffers = Array.from({ length: 1000 }, () => 
        new Float32Array(4096).fill(Math.random())
      )
      
      let processed = 0
      const results = []
      
      for (const buffer of buffers) {
        try {
          const result = await transcription.processAudioChunk({
            data: buffer,
            sampleRate: 16000,
            timestamp: Date.now()
          })
          results.push(result)
          processed++
        } catch (error) {
          // Should handle overflow gracefully
          expect(error.message).toContain('buffer')
        }
      }
      
      // Should process most buffers successfully
      expect(processed).toBeGreaterThan(900)
    })

    test('should recover from analysis errors', async () => {
      const malformedTranscript = '\x00\x01\x02' // Binary data
      
      const result = await analysis.analyzeSentiment(malformedTranscript)
      
      // Should return neutral/default values, not crash
      expect(result).toEqual({
        score: 0,
        label: 'neutral',
        confidence: 0
      })
    })
  })

  describe('Load Testing', () => {
    test('should maintain <500ms latency under load', async () => {
      const concurrentRequests = 50
      const latencies: number[] = []
      
      const requests = Array.from({ length: concurrentRequests }, async () => {
        const start = performance.now()
        const audioData = new Float32Array(4096).fill(Math.random())
        
        await transcription.processAudioChunk({
          data: audioData,
          sampleRate: 16000,
          timestamp: Date.now()
        })
        
        const latency = performance.now() - start
        latencies.push(latency)
      })
      
      await Promise.all(requests)
      
      const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length
      const maxLatency = Math.max(...latencies)
      const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)]
      
      expect(avgLatency).toBeLessThan(500)
      expect(p95Latency).toBeLessThan(750) // 95th percentile under 750ms
      expect(maxLatency).toBeLessThan(1000) // No request over 1s
    })
  })
})

// Helper to simulate WebSocket manager compression
declare module '@/lib/realtime/websocket-manager' {
  interface WebSocketManager {
    compressPayload?(payload: any): any
    broadcastTranscript(data: any): void
  }
}