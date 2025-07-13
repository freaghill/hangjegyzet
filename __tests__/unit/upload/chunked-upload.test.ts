import { ChunkedUploadManager } from '@/lib/upload/chunked-upload'
import { UploadService } from '@/lib/upload/upload-service'
import { createMockFile } from '@/__tests__/test-utils'

jest.mock('@/lib/upload/upload-service')

describe('ChunkedUploadManager', () => {
  let uploadManager: ChunkedUploadManager
  let mockUploadService: jest.Mocked<UploadService>
  let onProgressMock: jest.Mock
  let onCompleteMock: jest.Mock
  let onErrorMock: jest.Mock

  beforeEach(() => {
    mockUploadService = {
      uploadChunk: jest.fn(),
      mergeChunks: jest.fn(),
      validateFile: jest.fn(),
    } as any

    ;(UploadService as jest.Mock).mockImplementation(() => mockUploadService)

    onProgressMock = jest.fn()
    onCompleteMock = jest.fn()
    onErrorMock = jest.fn()

    uploadManager = new ChunkedUploadManager({
      chunkSize: 1024, // 1KB for testing
      maxConcurrentUploads: 2,
      onProgress: onProgressMock,
      onComplete: onCompleteMock,
      onError: onErrorMock,
    })
  })

  describe('upload', () => {
    it('should upload small file without chunking', async () => {
      const file = createMockFile('small.mp3', 500, 'audio/mp3') // 500 bytes
      const userId = 'test-user-id'

      mockUploadService.validateFile.mockReturnValue({ valid: true, error: null })
      mockUploadService.uploadChunk.mockResolvedValue({ success: true, error: null })
      mockUploadService.mergeChunks.mockResolvedValue({ 
        path: `${userId}/${file.name}`, 
        error: null 
      })

      await uploadManager.upload(file, userId)

      expect(mockUploadService.validateFile).toHaveBeenCalledWith(file)
      expect(mockUploadService.uploadChunk).toHaveBeenCalledTimes(1)
      expect(onProgressMock).toHaveBeenCalledWith(100)
      expect(onCompleteMock).toHaveBeenCalledWith(`${userId}/${file.name}`)
      expect(onErrorMock).not.toHaveBeenCalled()
    })

    it('should upload large file in chunks', async () => {
      const file = createMockFile('large.mp3', 3 * 1024, 'audio/mp3') // 3KB
      const userId = 'test-user-id'

      mockUploadService.validateFile.mockReturnValue({ valid: true, error: null })
      mockUploadService.uploadChunk.mockResolvedValue({ success: true, error: null })
      mockUploadService.mergeChunks.mockResolvedValue({ 
        path: `${userId}/${file.name}`, 
        error: null 
      })

      await uploadManager.upload(file, userId)

      // Should be split into 3 chunks (1KB each)
      expect(mockUploadService.uploadChunk).toHaveBeenCalledTimes(3)
      expect(mockUploadService.mergeChunks).toHaveBeenCalledWith(
        expect.any(String),
        file.name,
        3,
        userId
      )
      expect(onProgressMock).toHaveBeenCalled()
      expect(onCompleteMock).toHaveBeenCalledWith(`${userId}/${file.name}`)
    })

    it('should handle validation errors', async () => {
      const file = createMockFile('invalid.txt', 1024, 'text/plain')
      const userId = 'test-user-id'

      mockUploadService.validateFile.mockReturnValue({ 
        valid: false, 
        error: 'Unsupported file type' 
      })

      await uploadManager.upload(file, userId)

      expect(mockUploadService.uploadChunk).not.toHaveBeenCalled()
      expect(onErrorMock).toHaveBeenCalledWith('Unsupported file type')
      expect(onCompleteMock).not.toHaveBeenCalled()
    })

    it('should retry failed chunks', async () => {
      const file = createMockFile('test.mp3', 2 * 1024, 'audio/mp3') // 2KB
      const userId = 'test-user-id'

      mockUploadService.validateFile.mockReturnValue({ valid: true, error: null })
      
      // First chunk fails once, then succeeds
      mockUploadService.uploadChunk
        .mockResolvedValueOnce({ success: false, error: 'Network error' })
        .mockResolvedValueOnce({ success: true, error: null })
        .mockResolvedValue({ success: true, error: null })

      mockUploadService.mergeChunks.mockResolvedValue({ 
        path: `${userId}/${file.name}`, 
        error: null 
      })

      await uploadManager.upload(file, userId)

      // 2 chunks + 1 retry = 3 calls
      expect(mockUploadService.uploadChunk).toHaveBeenCalledTimes(3)
      expect(onCompleteMock).toHaveBeenCalled()
    })

    it('should handle chunk upload failures after max retries', async () => {
      const file = createMockFile('test.mp3', 1024, 'audio/mp3')
      const userId = 'test-user-id'

      mockUploadService.validateFile.mockReturnValue({ valid: true, error: null })
      mockUploadService.uploadChunk.mockResolvedValue({ 
        success: false, 
        error: 'Persistent error' 
      })

      await uploadManager.upload(file, userId)

      // 1 initial attempt + 3 retries = 4 calls
      expect(mockUploadService.uploadChunk).toHaveBeenCalledTimes(4)
      expect(onErrorMock).toHaveBeenCalledWith('Failed to upload chunk 0 after 3 retries')
      expect(onCompleteMock).not.toHaveBeenCalled()
    })

    it('should handle merge errors', async () => {
      const file = createMockFile('test.mp3', 1024, 'audio/mp3')
      const userId = 'test-user-id'

      mockUploadService.validateFile.mockReturnValue({ valid: true, error: null })
      mockUploadService.uploadChunk.mockResolvedValue({ success: true, error: null })
      mockUploadService.mergeChunks.mockResolvedValue({ 
        path: null, 
        error: 'Merge failed' 
      })

      await uploadManager.upload(file, userId)

      expect(onErrorMock).toHaveBeenCalledWith('Failed to merge chunks: Merge failed')
      expect(onCompleteMock).not.toHaveBeenCalled()
    })
  })

  describe('pause and resume', () => {
    it('should pause and resume upload', async () => {
      const file = createMockFile('test.mp3', 5 * 1024, 'audio/mp3') // 5KB
      const userId = 'test-user-id'

      mockUploadService.validateFile.mockReturnValue({ valid: true, error: null })
      
      let uploadCount = 0
      mockUploadService.uploadChunk.mockImplementation(async () => {
        uploadCount++
        // Pause after 2 chunks
        if (uploadCount === 2) {
          uploadManager.pause()
        }
        await new Promise(resolve => setTimeout(resolve, 10))
        return { success: true, error: null }
      })

      mockUploadService.mergeChunks.mockResolvedValue({ 
        path: `${userId}/${file.name}`, 
        error: null 
      })

      const uploadPromise = uploadManager.upload(file, userId)

      // Wait a bit for upload to start and pause
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(uploadManager.isPaused()).toBe(true)
      expect(mockUploadService.uploadChunk).toHaveBeenCalledTimes(2)

      // Resume upload
      uploadManager.resume()
      expect(uploadManager.isPaused()).toBe(false)

      await uploadPromise

      expect(mockUploadService.uploadChunk).toHaveBeenCalledTimes(5)
      expect(onCompleteMock).toHaveBeenCalled()
    })
  })

  describe('cancel', () => {
    it('should cancel ongoing upload', async () => {
      const file = createMockFile('test.mp3', 5 * 1024, 'audio/mp3') // 5KB
      const userId = 'test-user-id'

      mockUploadService.validateFile.mockReturnValue({ valid: true, error: null })
      
      let uploadCount = 0
      mockUploadService.uploadChunk.mockImplementation(async () => {
        uploadCount++
        // Cancel after 2 chunks
        if (uploadCount === 2) {
          uploadManager.cancel()
        }
        await new Promise(resolve => setTimeout(resolve, 10))
        return { success: true, error: null }
      })

      await uploadManager.upload(file, userId)

      expect(mockUploadService.uploadChunk).toHaveBeenCalledTimes(2)
      expect(onErrorMock).toHaveBeenCalledWith('Upload cancelled')
      expect(onCompleteMock).not.toHaveBeenCalled()
    })
  })

  describe('progress tracking', () => {
    it('should report accurate progress', async () => {
      const file = createMockFile('test.mp3', 4 * 1024, 'audio/mp3') // 4KB
      const userId = 'test-user-id'

      mockUploadService.validateFile.mockReturnValue({ valid: true, error: null })
      mockUploadService.uploadChunk.mockResolvedValue({ success: true, error: null })
      mockUploadService.mergeChunks.mockResolvedValue({ 
        path: `${userId}/${file.name}`, 
        error: null 
      })

      const progressCalls: number[] = []
      uploadManager = new ChunkedUploadManager({
        chunkSize: 1024,
        maxConcurrentUploads: 1, // Sequential for predictable progress
        onProgress: (progress) => progressCalls.push(progress),
        onComplete: onCompleteMock,
        onError: onErrorMock,
      })

      await uploadManager.upload(file, userId)

      // Should have progress updates for each chunk
      expect(progressCalls).toEqual([25, 50, 75, 100])
    })
  })
})