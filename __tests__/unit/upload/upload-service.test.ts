import { UploadService } from '@/lib/upload/upload-service'
import { createClient } from '@supabase/supabase-js'
import { createMockFile, mockSuccessResponse, mockErrorResponse } from '@/__tests__/test-utils'

jest.mock('@supabase/supabase-js')

describe('UploadService', () => {
  let uploadService: UploadService
  let mockSupabaseClient: any

  beforeEach(() => {
    mockSupabaseClient = {
      storage: {
        from: jest.fn(() => ({
          upload: jest.fn(),
          createSignedUrl: jest.fn(),
          remove: jest.fn(),
          list: jest.fn(),
        })),
      },
      from: jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
    uploadService = new UploadService()
  })

  describe('uploadFile', () => {
    it('should successfully upload a valid audio file', async () => {
      const file = createMockFile('test.mp3', 10 * 1024 * 1024, 'audio/mp3') // 10MB
      const userId = 'test-user-id'
      const filePath = `${userId}/test.mp3`

      mockSupabaseClient.storage.from().upload.mockResolvedValue(
        mockSuccessResponse({ path: filePath })
      )

      const result = await uploadService.uploadFile(file, userId)

      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('meetings')
      expect(mockSupabaseClient.storage.from().upload).toHaveBeenCalledWith(
        expect.stringContaining(`${userId}/`),
        file,
        {
          contentType: 'audio/mp3',
          upsert: false,
        }
      )
      expect(result.path).toContain(userId)
      expect(result.error).toBeNull()
    })

    it('should reject files exceeding size limit', async () => {
      const file = createMockFile('huge.mp3', 3 * 1024 * 1024 * 1024, 'audio/mp3') // 3GB
      const userId = 'test-user-id'

      const result = await uploadService.uploadFile(file, userId)

      expect(result.path).toBeNull()
      expect(result.error).toContain('File size exceeds maximum limit')
      expect(mockSupabaseClient.storage.from().upload).not.toHaveBeenCalled()
    })

    it('should reject unsupported file types', async () => {
      const file = createMockFile('test.exe', 1024, 'application/exe')
      const userId = 'test-user-id'

      const result = await uploadService.uploadFile(file, userId)

      expect(result.path).toBeNull()
      expect(result.error).toContain('Unsupported file type')
      expect(mockSupabaseClient.storage.from().upload).not.toHaveBeenCalled()
    })

    it('should handle upload errors', async () => {
      const file = createMockFile('test.mp3', 10 * 1024 * 1024, 'audio/mp3')
      const userId = 'test-user-id'

      mockSupabaseClient.storage.from().upload.mockResolvedValue(
        mockErrorResponse('Network error')
      )

      const result = await uploadService.uploadFile(file, userId)

      expect(result.path).toBeNull()
      expect(result.error).toBe('Network error')
    })
  })

  describe('uploadChunk', () => {
    it('should upload file chunks successfully', async () => {
      const chunk = new Blob(['chunk data'])
      const uploadId = 'test-upload-id'
      const chunkIndex = 0
      const chunkPath = `chunks/${uploadId}/chunk-${chunkIndex}`

      mockSupabaseClient.storage.from().upload.mockResolvedValue(
        mockSuccessResponse({ path: chunkPath })
      )

      const result = await uploadService.uploadChunk(chunk, uploadId, chunkIndex)

      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('meetings')
      expect(mockSupabaseClient.storage.from().upload).toHaveBeenCalledWith(
        chunkPath,
        chunk,
        { upsert: false }
      )
      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should handle chunk upload errors', async () => {
      const chunk = new Blob(['chunk data'])
      const uploadId = 'test-upload-id'
      const chunkIndex = 0

      mockSupabaseClient.storage.from().upload.mockResolvedValue(
        mockErrorResponse('Upload failed')
      )

      const result = await uploadService.uploadChunk(chunk, uploadId, chunkIndex)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Upload failed')
    })
  })

  describe('mergeChunks', () => {
    it('should merge chunks and create final file', async () => {
      const uploadId = 'test-upload-id'
      const fileName = 'merged.mp3'
      const totalChunks = 3
      const userId = 'test-user-id'

      // Mock chunk downloads
      const chunks = ['chunk1', 'chunk2', 'chunk3']
      chunks.forEach((_, index) => {
        mockSupabaseClient.storage.from().download = jest.fn()
          .mockResolvedValueOnce(mockSuccessResponse(new Blob([chunks[index]])))
      })

      // Mock final upload
      mockSupabaseClient.storage.from().upload.mockResolvedValue(
        mockSuccessResponse({ path: `${userId}/${fileName}` })
      )

      // Mock chunk removal
      mockSupabaseClient.storage.from().remove.mockResolvedValue(
        mockSuccessResponse(null)
      )

      const result = await uploadService.mergeChunks(uploadId, fileName, totalChunks, userId)

      expect(result.path).toBe(`${userId}/${fileName}`)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.storage.from().remove).toHaveBeenCalled()
    })
  })

  describe('getSignedUrl', () => {
    it('should generate signed URL for file', async () => {
      const filePath = 'user-id/test.mp3'
      const signedUrl = 'https://example.com/signed-url'

      mockSupabaseClient.storage.from().createSignedUrl.mockResolvedValue(
        mockSuccessResponse({ signedUrl })
      )

      const result = await uploadService.getSignedUrl(filePath)

      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('meetings')
      expect(mockSupabaseClient.storage.from().createSignedUrl).toHaveBeenCalledWith(
        filePath,
        3600 // 1 hour
      )
      expect(result.url).toBe(signedUrl)
      expect(result.error).toBeNull()
    })

    it('should handle signed URL generation errors', async () => {
      const filePath = 'user-id/test.mp3'

      mockSupabaseClient.storage.from().createSignedUrl.mockResolvedValue(
        mockErrorResponse('Not found')
      )

      const result = await uploadService.getSignedUrl(filePath)

      expect(result.url).toBeNull()
      expect(result.error).toBe('Not found')
    })
  })

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const filePath = 'user-id/test.mp3'

      mockSupabaseClient.storage.from().remove.mockResolvedValue(
        mockSuccessResponse(null)
      )

      const result = await uploadService.deleteFile(filePath)

      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('meetings')
      expect(mockSupabaseClient.storage.from().remove).toHaveBeenCalledWith([filePath])
      expect(result.error).toBeNull()
    })

    it('should handle deletion errors', async () => {
      const filePath = 'user-id/test.mp3'

      mockSupabaseClient.storage.from().remove.mockResolvedValue(
        mockErrorResponse('Permission denied')
      )

      const result = await uploadService.deleteFile(filePath)

      expect(result.error).toBe('Permission denied')
    })
  })

  describe('validateFile', () => {
    it('should validate supported audio formats', () => {
      const validFiles = [
        createMockFile('test.mp3', 1024, 'audio/mp3'),
        createMockFile('test.wav', 1024, 'audio/wav'),
        createMockFile('test.m4a', 1024, 'audio/m4a'),
        createMockFile('test.mp4', 1024, 'video/mp4'),
        createMockFile('test.mov', 1024, 'video/quicktime'),
      ]

      validFiles.forEach(file => {
        const result = uploadService.validateFile(file)
        expect(result.valid).toBe(true)
        expect(result.error).toBeNull()
      })
    })

    it('should reject invalid file types', () => {
      const invalidFiles = [
        createMockFile('test.txt', 1024, 'text/plain'),
        createMockFile('test.pdf', 1024, 'application/pdf'),
        createMockFile('test.exe', 1024, 'application/exe'),
      ]

      invalidFiles.forEach(file => {
        const result = uploadService.validateFile(file)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Unsupported file type')
      })
    })

    it('should validate file size limits', () => {
      const tooLarge = createMockFile('huge.mp3', 3 * 1024 * 1024 * 1024, 'audio/mp3') // 3GB
      const result = uploadService.validateFile(tooLarge)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds maximum limit')
    })

    it('should reject empty files', () => {
      const emptyFile = createMockFile('empty.mp3', 0, 'audio/mp3')
      const result = uploadService.validateFile(emptyFile)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('File is empty')
    })
  })
})