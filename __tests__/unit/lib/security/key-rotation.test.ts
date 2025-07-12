import { KeyRotationService } from '@/lib/security/key-rotation'
import { createClient } from '@/lib/supabase/admin'
import { redisClients } from '@/lib/cache/redis-sentinel'
import crypto from 'crypto'

jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/cache/redis-sentinel')

describe('KeyRotationService', () => {
  let keyRotationService: KeyRotationService
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
    keyRotationService = KeyRotationService.getInstance()
    
    // Mock Redis operations
    ;(redisClients.cache.setex as jest.Mock).mockResolvedValue('OK')
    ;(redisClients.cache.get as jest.Mock).mockResolvedValue(null)
    ;(redisClients.cache.del as jest.Mock).mockResolvedValue(1)
  })

  describe('createKeyVersion', () => {
    it('should create a new API key version', async () => {
      const mockCurrentKey = { version: 1 }
      const mockNewKey = {
        id: 'test-key',
        type: 'api_key',
        name: 'Test API Key',
        value: 'encrypted_value',
        version: 2,
        created_at: new Date(),
        expires_at: new Date(),
        status: 'active',
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockCurrentKey, error: null })
        .mockResolvedValueOnce({ data: mockNewKey, error: null })

      const result = await keyRotationService.createKeyVersion(
        'test-key',
        'api_key',
        'Test API Key'
      )

      expect(result).toBeDefined()
      expect(result.version).toBe(2)
      expect(result.type).toBe('api_key')
      expect(mockSupabase.insert).toHaveBeenCalled()
      expect(redisClients.cache.setex).toHaveBeenCalled()
    })

    it('should generate different key formats based on type', async () => {
      const types = ['api_key', 'jwt_secret', 'encryption_key', 'webhook_secret']
      
      for (const type of types) {
        mockSupabase.single.mockResolvedValue({ data: null, error: null })
        mockSupabase.single.mockResolvedValue({
          data: { id: 'test', type, value: 'encrypted', version: 1 },
          error: null,
        })

        const result = await keyRotationService.createKeyVersion(
          'test',
          type as any,
          'Test Key'
        )

        expect(result.value).toBeDefined()
        
        if (type === 'api_key') {
          expect(result.value).toMatch(/^hj_[a-z0-9]+_[A-Za-z0-9_-]+$/)
        } else {
          expect(result.value.length).toBeGreaterThan(20)
        }
      }
    })
  })

  describe('rotateKey', () => {
    it('should rotate an active key', async () => {
      const mockActiveKey = {
        id: 'test-key',
        type: 'api_key',
        name: 'Test Key',
        value: 'old_encrypted_value',
        version: 1,
        status: 'active',
      }

      mockSupabase.single.mockResolvedValueOnce({ data: mockActiveKey, error: null })
      mockSupabase.update.mockReturnThis()
      mockSupabase.single.mockResolvedValueOnce({ data: { ...mockActiveKey, version: 2 }, error: null })

      await keyRotationService.rotateKey('test-key')

      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'rotating' })
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'deprecated',
          rotated_at: expect.any(Date),
        })
      )
    })

    it('should handle rotation failure and rollback', async () => {
      const mockActiveKey = {
        id: 'test-key',
        type: 'api_key',
        name: 'Test Key',
        value: 'encrypted_value',
        version: 1,
        status: 'active',
      }

      mockSupabase.single.mockResolvedValueOnce({ data: mockActiveKey, error: null })
      mockSupabase.single.mockRejectedValueOnce(new Error('Creation failed'))

      await expect(keyRotationService.rotateKey('test-key')).rejects.toThrow()
      
      // Verify rollback
      expect(mockSupabase.update).toHaveBeenLastCalledWith({ status: 'active' })
    })
  })

  describe('validateKey', () => {
    it('should validate active keys', async () => {
      const testKey = 'test-api-key'
      const encryptedKey = JSON.stringify({
        encrypted: Buffer.from(testKey).toString('base64'),
        iv: crypto.randomBytes(16).toString('base64'),
        authTag: crypto.randomBytes(16).toString('base64'),
      })

      mockSupabase.or.mockReturnThis()
      mockSupabase.select.mockResolvedValue({
        data: [
          { value: encryptedKey, version: 1, status: 'active' },
        ],
        error: null,
      })

      // Mock decryption to return the test key
      jest.spyOn(keyRotationService as any, 'decryptKey').mockReturnValue(testKey)

      const isValid = await keyRotationService.validateKey('test-key', testKey)
      expect(isValid).toBe(true)
    })

    it('should validate deprecated keys and log usage', async () => {
      const testKey = 'deprecated-key'
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      mockSupabase.or.mockReturnThis()
      mockSupabase.select.mockResolvedValue({
        data: [
          { value: 'encrypted', version: 1, status: 'deprecated' },
        ],
        error: null,
      })

      jest.spyOn(keyRotationService as any, 'decryptKey').mockReturnValue(testKey)

      const isValid = await keyRotationService.validateKey('test-key', testKey)
      
      expect(isValid).toBe(true)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deprecated key test-key v1 is still in use')
      )

      consoleWarnSpy.mockRestore()
    })

    it('should return false for invalid keys', async () => {
      mockSupabase.or.mockReturnThis()
      mockSupabase.select.mockResolvedValue({
        data: [
          { value: 'encrypted', version: 1, status: 'active' },
        ],
        error: null,
      })

      jest.spyOn(keyRotationService as any, 'decryptKey').mockReturnValue('different-key')

      const isValid = await keyRotationService.validateKey('test-key', 'wrong-key')
      expect(isValid).toBe(false)
    })
  })

  describe('getActiveKey', () => {
    it('should return cached key if available', async () => {
      const cachedKey = 'cached-api-key'
      ;(redisClients.cache.get as jest.Mock).mockResolvedValue(cachedKey)

      const result = await keyRotationService.getActiveKey('test-key')
      
      expect(result).toBe(cachedKey)
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('should fetch from database if not cached', async () => {
      const dbKey = 'database-api-key'
      ;(redisClients.cache.get as jest.Mock).mockResolvedValue(null)
      
      mockSupabase.single.mockResolvedValue({
        data: { value: 'encrypted', version: 1 },
        error: null,
      })

      jest.spyOn(keyRotationService as any, 'decryptKey').mockReturnValue(dbKey)

      const result = await keyRotationService.getActiveKey('test-key')
      
      expect(result).toBe(dbKey)
      expect(redisClients.cache.setex).toHaveBeenCalledWith(
        'key:test-key:active',
        3600,
        dbKey
      )
    })

    it('should return null if key not found', async () => {
      ;(redisClients.cache.get as jest.Mock).mockResolvedValue(null)
      mockSupabase.single.mockResolvedValue({ data: null, error: 'Not found' })

      const result = await keyRotationService.getActiveKey('non-existent')
      expect(result).toBeNull()
    })
  })
})