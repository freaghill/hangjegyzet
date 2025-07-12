import * as winston from 'winston'
import 'winston-daily-rotate-file'
import * as path from 'path'
import { hostname } from 'os'

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Define colors for each level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
}

// Add colors to Winston
winston.addColors(logColors)

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
)

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.align(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    return `${timestamp} [${level}]: ${message} ${metaString}`
  })
)

// Define transports
const transports: winston.transport[] = []

// Console transport for all environments
if (process.env.NODE_ENV !== 'test') {
  transports.push(
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    })
  )
}

// File transports for production
if (process.env.NODE_ENV === 'production') {
  // Error logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(process.env.LOG_DIR || './logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
    })
  )

  // Combined logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(process.env.LOG_DIR || './logs', 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    })
  )

  // HTTP request logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(process.env.LOG_DIR || './logs', 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxSize: '20m',
      maxFiles: '7d',
      format: logFormat,
    })
  )
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels: logLevels,
  format: logFormat,
  transports,
  exitOnError: false,
})

// Add default metadata
logger.defaultMeta = {
  service: 'hangjegyzet-api',
  hostname: hostname(),
  environment: process.env.NODE_ENV || 'development',
}

// Helper functions for structured logging
export interface LogContext {
  userId?: string
  organizationId?: string
  meetingId?: string
  requestId?: string
  action?: string
  duration?: number
  error?: Error | unknown
  [key: string]: any
}

class Logger {
  private logger: winston.Logger

  constructor(logger: winston.Logger) {
    this.logger = logger
  }

  // Error logging with context
  error(message: string, context?: LogContext): void {
    const { error, ...meta } = context || {}
    
    if (error instanceof Error) {
      this.logger.error(message, {
        ...meta,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      })
    } else {
      this.logger.error(message, { ...meta, error })
    }
  }

  // Warning logging
  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context)
  }

  // Info logging
  info(message: string, context?: LogContext): void {
    this.logger.info(message, context)
  }

  // HTTP request logging
  http(message: string, context?: LogContext): void {
    this.logger.http(message, context)
  }

  // Debug logging
  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context)
  }

  // Performance logging
  perf(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 1000 ? 'warn' : 'info'
    this.logger.log(level, `Performance: ${operation}`, {
      ...context,
      duration,
      durationMs: duration,
      slow: duration > 1000,
    })
  }

  // Audit logging
  audit(action: string, context: LogContext & { userId: string }): void {
    this.logger.info(`Audit: ${action}`, {
      ...context,
      audit: true,
      timestamp: new Date().toISOString(),
    })
  }

  // Security logging
  security(event: string, context?: LogContext): void {
    this.logger.warn(`Security: ${event}`, {
      ...context,
      security: true,
      timestamp: new Date().toISOString(),
    })
  }

  // Child logger with additional context
  child(defaultContext: LogContext): Logger {
    const childLogger = this.logger.child(defaultContext)
    return new Logger(childLogger)
  }

  // Measure and log execution time
  async measureTime<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const start = Date.now()
    
    try {
      const result = await fn()
      const duration = Date.now() - start
      
      this.perf(operation, duration, {
        ...context,
        success: true,
      })
      
      return result
    } catch (error) {
      const duration = Date.now() - start
      
      this.error(`${operation} failed`, {
        ...context,
        duration,
        error,
      })
      
      throw error
    }
  }

  // Log database queries
  query(sql: string, params?: any[], duration?: number): void {
    this.debug('Database query', {
      sql: sql.substring(0, 1000), // Truncate long queries
      params: process.env.NODE_ENV === 'production' ? undefined : params,
      duration,
      type: 'database',
    })
  }

  // Log external API calls
  api(method: string, url: string, statusCode?: number, duration?: number): void {
    const level = statusCode && statusCode >= 400 ? 'warn' : 'info'
    
    this.logger.log(level, `External API: ${method} ${url}`, {
      method,
      url,
      statusCode,
      duration,
      type: 'external_api',
    })
  }
}

// Export singleton instance
export const log = new Logger(logger)

// Export for testing
export { Logger }

// Graceful shutdown
process.on('SIGTERM', () => {
  log.info('SIGTERM received, closing logger')
  logger.close()
})