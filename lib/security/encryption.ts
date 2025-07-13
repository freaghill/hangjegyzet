import crypto from 'crypto'

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const TAG_LENGTH = 16 // 128 bits
const SALT_LENGTH = 32 // 256 bits
const ITERATIONS = 100000 // PBKDF2 iterations

// Get or generate encryption key
export function getEncryptionKey(): Buffer {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY
  
  if (!masterKey) {
    throw new Error('ENCRYPTION_MASTER_KEY environment variable is not set')
  }
  
  // Derive key from master key using PBKDF2
  const salt = process.env.ENCRYPTION_SALT || 'hangjegyzet-default-salt'
  return crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha256')
}

// Encrypt data
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  
  const tag = cipher.getAuthTag()
  
  // Combine IV + tag + encrypted data
  const combined = Buffer.concat([iv, tag, encrypted])
  
  // Return base64 encoded
  return combined.toString('base64')
}

// Decrypt data
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey()
  const combined = Buffer.from(encryptedData, 'base64')
  
  // Extract components
  const iv = combined.slice(0, IV_LENGTH)
  const tag = combined.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = combined.slice(IV_LENGTH + TAG_LENGTH)
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])
  
  return decrypted.toString('utf8')
}

// Encrypt object (JSON)
export function encryptObject<T>(obj: T): string {
  const json = JSON.stringify(obj)
  return encrypt(json)
}

// Decrypt object (JSON)
export function decryptObject<T>(encryptedData: string): T {
  const json = decrypt(encryptedData)
  return JSON.parse(json)
}

// Field-level encryption for database
export class FieldEncryption {
  private key: Buffer
  
  constructor(keyName?: string) {
    const envKey = keyName 
      ? process.env[`ENCRYPTION_KEY_${keyName.toUpperCase()}`]
      : process.env.ENCRYPTION_MASTER_KEY
      
    if (!envKey) {
      throw new Error(`Encryption key not found: ${keyName || 'MASTER'}`)
    }
    
    const salt = process.env.ENCRYPTION_SALT || 'hangjegyzet-field-salt'
    this.key = crypto.pbkdf2Sync(envKey, salt, ITERATIONS, KEY_LENGTH, 'sha256')
  }
  
  encrypt(value: string | null | undefined): string | null {
    if (!value) return null
    
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv)
    
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ])
    
    const tag = cipher.getAuthTag()
    const combined = Buffer.concat([iv, tag, encrypted])
    
    return combined.toString('base64')
  }
  
  decrypt(encryptedValue: string | null | undefined): string | null {
    if (!encryptedValue) return null
    
    try {
      const combined = Buffer.from(encryptedValue, 'base64')
      
      const iv = combined.slice(0, IV_LENGTH)
      const tag = combined.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
      const encrypted = combined.slice(IV_LENGTH + TAG_LENGTH)
      
      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv)
      decipher.setAuthTag(tag)
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ])
      
      return decrypted.toString('utf8')
    } catch (error) {
      console.error('Decryption failed:', error)
      return null
    }
  }
}

// Searchable encryption (deterministic for indexing)
export class SearchableEncryption {
  private key: Buffer
  
  constructor() {
    const masterKey = process.env.SEARCHABLE_ENCRYPTION_KEY
    
    if (!masterKey) {
      throw new Error('SEARCHABLE_ENCRYPTION_KEY environment variable is not set')
    }
    
    const salt = process.env.ENCRYPTION_SALT || 'hangjegyzet-search-salt'
    this.key = crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha256')
  }
  
  // Deterministic encryption for searchable fields
  encryptDeterministic(value: string): string {
    // Use HMAC for deterministic encryption
    const hmac = crypto.createHmac('sha256', this.key)
    hmac.update(value.toLowerCase().trim())
    return hmac.digest('hex')
  }
  
  // Create search token
  createSearchToken(query: string): string {
    return this.encryptDeterministic(query)
  }
  
  // Blind index for partial matching
  createBlindIndex(value: string, prefixLength: number = 3): string[] {
    const indices: string[] = []
    const normalized = value.toLowerCase().trim()
    
    for (let i = 0; i <= normalized.length - prefixLength; i++) {
      const prefix = normalized.slice(i, i + prefixLength)
      const index = this.encryptDeterministic(prefix)
      indices.push(index)
    }
    
    return indices
  }
}

// Encrypt sensitive fields in objects
export function encryptSensitiveFields<T extends Record<string, any>>(
  obj: T,
  sensitiveFields: (keyof T)[]
): T {
  const encryption = new FieldEncryption()
  const result = { ...obj }
  
  for (const field of sensitiveFields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encryption.encrypt(result[field] as string) as any
    }
  }
  
  return result
}

// Decrypt sensitive fields in objects
export function decryptSensitiveFields<T extends Record<string, any>>(
  obj: T,
  sensitiveFields: (keyof T)[]
): T {
  const encryption = new FieldEncryption()
  const result = { ...obj }
  
  for (const field of sensitiveFields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encryption.decrypt(result[field] as string) as any
    }
  }
  
  return result
}

// Key rotation utilities
export class KeyRotation {
  static async rotateKey(oldKeyName: string, newKeyName: string) {
    const oldEncryption = new FieldEncryption(oldKeyName)
    const newEncryption = new FieldEncryption(newKeyName)
    
    return {
      reencrypt: (value: string) => {
        const decrypted = oldEncryption.decrypt(value)
        return decrypted ? newEncryption.encrypt(decrypted) : null
      },
      
      bulkReencrypt: async (values: string[]) => {
        return Promise.all(values.map(async (value) => {
          const decrypted = oldEncryption.decrypt(value)
          return decrypted ? newEncryption.encrypt(decrypted) : null
        }))
      }
    }
  }
}

// Secure token generation
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

// Hash sensitive data (one-way)
export function hashSensitiveData(data: string, salt?: string): string {
  const actualSalt = salt || crypto.randomBytes(SALT_LENGTH).toString('hex')
  const hash = crypto.pbkdf2Sync(data, actualSalt, ITERATIONS, 64, 'sha512')
  
  return `${actualSalt}:${hash.toString('hex')}`
}

// Verify hashed data
export function verifyHashedData(data: string, hashedData: string): boolean {
  const [salt, hash] = hashedData.split(':')
  const dataHash = crypto.pbkdf2Sync(data, salt, ITERATIONS, 64, 'sha512')
  
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    dataHash
  )
}

// PII data masking
export function maskPII(value: string, type: 'email' | 'phone' | 'credit_card' | 'custom'): string {
  switch (type) {
    case 'email':
      const [localPart, domain] = value.split('@')
      if (!domain) return '***'
      const maskedLocal = localPart.slice(0, 2) + '***'
      return `${maskedLocal}@${domain}`
      
    case 'phone':
      return value.slice(0, 3) + '****' + value.slice(-2)
      
    case 'credit_card':
      return '**** **** **** ' + value.slice(-4)
      
    case 'custom':
    default:
      if (value.length <= 4) return '****'
      return value.slice(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2)
  }
}