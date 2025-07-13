import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import validator from 'validator'

// Common validation schemas
export const validationSchemas = {
  // User input
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(100).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain uppercase, lowercase, number and special character'
  ),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid username format'),
  name: z.string().min(1).max(100).transform(val => validator.escape(val)),
  
  // IDs
  uuid: z.string().uuid(),
  objectId: z.string().regex(/^[a-f\d]{24}$/i),
  
  // Numbers
  positiveInt: z.coerce.number().int().positive(),
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
  
  // File uploads
  fileUpload: z.object({
    filename: z.string().max(255).regex(/^[^<>:"/\\|?*]+$/, 'Invalid filename'),
    mimetype: z.string().regex(/^[a-zA-Z]+\/[a-zA-Z0-9.+-]+$/, 'Invalid MIME type'),
    size: z.number().positive().max(100 * 1024 * 1024), // 100MB max
  }),
  
  // URL validation
  url: z.string().url().refine(
    (url) => {
      try {
        const parsed = new URL(url)
        return ['http:', 'https:'].includes(parsed.protocol)
      } catch {
        return false
      }
    },
    'Invalid URL'
  ),
  
  // Search queries
  searchQuery: z.string()
    .min(1)
    .max(200)
    .transform(val => validator.escape(val.trim())),
    
  // Tags
  tags: z.array(z.string().max(50).regex(/^[a-zA-Z0-9-_]+$/)).max(20),
  
  // Date ranges
  dateRange: z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  }).refine(data => data.from <= data.to, {
    message: 'From date must be before or equal to To date',
  }),
}

// XSS Protection
export function sanitizeHtml(input: string, options?: any): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false,
    ...options,
  })
}

// SQL Injection Prevention (for raw queries)
export function escapeSql(input: string): string {
  // Escape single quotes and backslashes
  return input.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case '\0': return '\\0'
      case '\x08': return '\\b'
      case '\x09': return '\\t'
      case '\x1a': return '\\z'
      case '\n': return '\\n'
      case '\r': return '\\r'
      case '"':
      case "'":
      case '\\':
      case '%': return '\\' + char
      default: return char
    }
  })
}

// Path traversal prevention
export function sanitizePath(input: string): string {
  // Remove any path traversal attempts
  return input
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*]/g, '')
    .replace(/^[/\\]/, '')
    .trim()
}

// Validate and sanitize file upload
export async function validateFileUpload(file: File, options?: {
  maxSize?: number
  allowedTypes?: string[]
  allowedExtensions?: string[]
}): Promise<{ valid: boolean; error?: string }> {
  const {
    maxSize = 100 * 1024 * 1024, // 100MB default
    allowedTypes = ['image/*', 'audio/*', 'video/*', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.mp3', '.mp4', '.wav'],
  } = options || {}
  
  // Check file size
  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` }
  }
  
  // Check MIME type
  const typeValid = allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.slice(0, -2))
    }
    return file.type === type
  })
  
  if (!typeValid) {
    return { valid: false, error: 'Invalid file type' }
  }
  
  // Check file extension
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
  if (!allowedExtensions.includes(extension)) {
    return { valid: false, error: 'Invalid file extension' }
  }
  
  // Additional checks for specific file types
  if (file.type.startsWith('image/')) {
    // Validate image header (magic bytes)
    const buffer = await file.slice(0, 8).arrayBuffer()
    const header = new Uint8Array(buffer)
    
    // Check for common image signatures
    const signatures = {
      jpeg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      gif: [0x47, 0x49, 0x46],
    }
    
    let validSignature = false
    for (const [, signature] of Object.entries(signatures)) {
      if (signature.every((byte, i) => header[i] === byte)) {
        validSignature = true
        break
      }
    }
    
    if (!validSignature) {
      return { valid: false, error: 'Invalid image file' }
    }
  }
  
  return { valid: true }
}

// Rate limit key sanitization
export function sanitizeRateLimitKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 128)
}

// JSON validation
export function parseJsonSafely<T>(input: string, schema?: z.ZodSchema<T>): T | null {
  try {
    const parsed = JSON.parse(input)
    if (schema) {
      return schema.parse(parsed)
    }
    return parsed
  } catch {
    return null
  }
}

// Request validation middleware
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (req: Request): Promise<{ data: T | null; error: string | null }> => {
    try {
      const body = await req.json()
      const data = schema.parse(body)
      return { data, error: null }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          data: null, 
          error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        }
      }
      return { data: null, error: 'Invalid request' }
    }
  }
}

// Common request schemas
export const requestSchemas = {
  // Meeting creation
  createMeeting: z.object({
    title: validationSchemas.name,
    teamId: validationSchemas.uuid.optional(),
    tags: validationSchemas.tags.optional(),
  }),
  
  // Search request
  searchRequest: z.object({
    query: validationSchemas.searchQuery,
    filters: z.object({
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
      speakers: z.array(z.string()).optional(),
      tags: validationSchemas.tags.optional(),
    }).optional(),
    pagination: validationSchemas.pagination.optional(),
  }),
  
  // User update
  updateUser: z.object({
    name: validationSchemas.name.optional(),
    email: validationSchemas.email.optional(),
    avatar: validationSchemas.url.optional(),
  }),
  
  // Team invitation
  inviteTeamMember: z.object({
    email: validationSchemas.email,
    role: z.enum(['owner', 'admin', 'member', 'viewer']),
    message: z.string().max(500).optional(),
  }),
}

// Headers validation
export function validateHeaders(headers: Headers): { valid: boolean; error?: string } {
  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-original-url',
    'x-rewrite-url',
  ]
  
  for (const header of suspiciousHeaders) {
    const value = headers.get(header)
    if (value && !validator.isURL(value, { require_protocol: false })) {
      return { valid: false, error: `Invalid ${header} header` }
    }
  }
  
  // Validate content-type for POST/PUT requests
  const contentType = headers.get('content-type')
  if (contentType && !contentType.match(/^[a-zA-Z]+\/[a-zA-Z0-9.+-]+(;.*)?$/)) {
    return { valid: false, error: 'Invalid content-type header' }
  }
  
  return { valid: true }
}

// Cookie validation
export function validateCookie(name: string, value: string): boolean {
  // Cookie name validation
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return false
  }
  
  // Cookie value validation (base64 or alphanumeric)
  if (!/^[a-zA-Z0-9+/=_-]+$/.test(value)) {
    return false
  }
  
  return true
}