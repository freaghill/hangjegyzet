import { Logger } from '../index'
import winston from 'winston'
import {
  logQuery,
  logCache,
  logAuth,
  logMetric,
  logAI,
} from '../formatters'

// Mock winston
jest.mock('winston', () => {
  const mockTransport = {
    log: jest.fn(),
  }
  
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
    child: jest.fn(() => mockLogger),
    defaultMeta: {},
    on: jest.fn(),
    add: jest.fn(),
    log: jest.fn(),
  }
  
  return {
    createLogger: jest.fn(() => mockLogger),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      errors: jest.fn(),
      splat: jest.fn(),
      json: jest.fn(),
      colorize: jest.fn(),
      align: jest.fn(),
      printf: jest.fn(),
    },
    transports: {
      Console: jest.fn(() => mockTransport),
    },
    addColors: jest.fn(),
  }
})

describe('Logger', () => {
  let logger: Logger
  let mockWinstonLogger: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockWinstonLogger = winston.createLogger()
    logger = new Logger(mockWinstonLogger)
  })

  describe('Basic logging', () => {
    it('should log info messages', () => {
      logger.info('Test message', { userId: '123' })
      
      expect(mockWinstonLogger.info).toHaveBeenCalledWith('Test message', {
        userId: '123',
      })
    })

    it('should log error messages with error object', () => {
      const error = new Error('Test error')
      logger.error('Operation failed', { error, userId: '123' })
      
      expect(mockWinstonLogger.error).toHaveBeenCalledWith('Operation failed', {
        userId: '123',
        error: {
          name: 'Error',
          message: 'Test error',
          stack: expect.any(String),
        },
      })
    })

    it('should log warnings', () => {
      logger.warn('Low memory', { available: 100 })
      
      expect(mockWinstonLogger.warn).toHaveBeenCalledWith('Low memory', {
        available: 100,
      })
    })

    it('should log debug messages', () => {
      logger.debug('Debug info', { details: 'test' })
      
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith('Debug info', {
        details: 'test',
      })
    })
  })

  describe('Performance logging', () => {
    it('should log performance metrics', () => {
      logger.perf('Database query', 150, { query: 'SELECT *' })
      
      expect(mockWinstonLogger.log).toHaveBeenCalledWith('info', 'Performance: Database query', {
        query: 'SELECT *',
        duration: 150,
        durationMs: 150,
        slow: false,
      })
    })

    it('should warn on slow operations', () => {
      logger.perf('Slow operation', 1500, { operation: 'process' })
      
      expect(mockWinstonLogger.log).toHaveBeenCalledWith('warn', 'Performance: Slow operation', {
        operation: 'process',
        duration: 1500,
        durationMs: 1500,
        slow: true,
      })
    })
  })

  describe('Audit logging', () => {
    it('should log audit events', () => {
      logger.audit('User deleted meeting', {
        userId: 'user123',
        meetingId: 'meeting456',
      })
      
      expect(mockWinstonLogger.info).toHaveBeenCalledWith('Audit: User deleted meeting', {
        userId: 'user123',
        meetingId: 'meeting456',
        audit: true,
        timestamp: expect.any(String),
      })
    })
  })

  describe('Security logging', () => {
    it('should log security events', () => {
      logger.security('Failed login attempt', {
        userId: 'user123',
        ip: '192.168.1.1',
      })
      
      expect(mockWinstonLogger.warn).toHaveBeenCalledWith('Security: Failed login attempt', {
        userId: 'user123',
        ip: '192.168.1.1',
        security: true,
        timestamp: expect.any(String),
      })
    })
  })

  describe('Child logger', () => {
    it('should create child logger with context', () => {
      const childLogger = logger.child({ requestId: 'req123' })
      
      expect(mockWinstonLogger.child).toHaveBeenCalledWith({ requestId: 'req123' })
      expect(childLogger).toBeInstanceOf(Logger)
    })
  })

  describe('measureTime', () => {
    it('should measure successful operations', async () => {
      const result = await logger.measureTime(
        'Test operation',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50))
          return { data: 'test' }
        },
        { context: 'test' }
      )
      
      expect(result).toEqual({ data: 'test' })
      expect(mockWinstonLogger.log).toHaveBeenCalledWith(
        'info',
        'Performance: Test operation',
        expect.objectContaining({
          context: 'test',
          success: true,
          duration: expect.any(Number),
        })
      )
    })

    it('should log errors when operation fails', async () => {
      const error = new Error('Test error')
      
      await expect(
        logger.measureTime(
          'Failing operation',
          async () => {
            throw error
          },
          { context: 'test' }
        )
      ).rejects.toThrow(error)
      
      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Failing operation failed',
        expect.objectContaining({
          context: 'test',
          error,
          duration: expect.any(Number),
        })
      )
    })
  })

  describe('Specialized logging methods', () => {
    it('should log database queries', () => {
      logger.query('SELECT * FROM users WHERE id = $1', ['123'], 45)
      
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith('Database query', {
        sql: 'SELECT * FROM users WHERE id = $1',
        params: ['123'],
        duration: 45,
        type: 'database',
      })
    })

    it('should log API calls', () => {
      logger.api('GET', 'https://api.example.com/users', 200, 250)
      
      expect(mockWinstonLogger.log).toHaveBeenCalledWith('info', 'External API: GET https://api.example.com/users', {
        method: 'GET',
        url: 'https://api.example.com/users',
        statusCode: 200,
        duration: 250,
        type: 'external_api',
      })
    })

    it('should warn on failed API calls', () => {
      logger.api('POST', 'https://api.example.com/users', 500, 1000)
      
      expect(mockWinstonLogger.log).toHaveBeenCalledWith('warn', expect.any(String), expect.objectContaining({
        statusCode: 500,
      }))
    })
  })
})

describe('Formatters', () => {
  let mockLogger: Logger

  beforeEach(() => {
    jest.clearAllMocks()
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any
    
    // Replace the logger instance in formatters
    jest.doMock('../index', () => ({ log: mockLogger }))
  })

  it('should format database queries', () => {
    logQuery('INSERT', 'meetings', { rows: 1, duration: 50 })
    
    expect(mockLogger.debug).toHaveBeenCalledWith('Database: INSERT on meetings', {
      rows: 1,
      duration: 50,
      type: 'database',
      operation: 'INSERT',
      table: 'meetings',
    })
  })

  it('should format cache operations', () => {
    logCache('hit', 'user:123:profile')
    
    expect(mockLogger.debug).toHaveBeenCalledWith('Cache hit: user:123:profile', {
      type: 'cache',
      operation: 'hit',
      key: 'user:123:profile',
    })
  })

  it('should format auth events', () => {
    logAuth('login', 'user123', true, { method: 'email' })
    
    expect(mockLogger.info).toHaveBeenCalledWith('Auth: login succeeded', {
      method: 'email',
      type: 'auth',
      event: 'login',
      userId: 'user123',
      success: true,
    })
  })

  it('should format metrics', () => {
    logMetric('api_latency', 89, 'ms', { endpoint: '/api/users' })
    
    expect(mockLogger.info).toHaveBeenCalledWith('Metric: api_latency', {
      endpoint: '/api/users',
      type: 'metric',
      metric: 'api_latency',
      value: 89,
      unit: 'ms',
    })
  })

  it('should format AI operations', () => {
    logAI('transcription', 'whisper-large', 5000, 10000, { meetingId: '123' })
    
    expect(mockLogger.info).toHaveBeenCalledWith('AI: transcription with whisper-large', {
      meetingId: '123',
      type: 'ai',
      operation: 'transcription',
      model: 'whisper-large',
      duration: 5000,
      tokens: 10000,
      tokensPerSecond: 2000,
    })
  })
})