import crypto from 'crypto'

// Use environment variable for encryption key, or generate one
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
const IV_LENGTH = 16 // For AES, this is always 16
const ALGORITHM = 'aes-256-cbc'

// Ensure key is 32 bytes
const KEY = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)

export interface EncryptedData {
  encrypted: string
  iv: string
}

/**
 * Encrypt sensitive data
 */
export function encryptToken(text: string): EncryptedData {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return {
    encrypted,
    iv: iv.toString('hex')
  }
}

/**
 * Decrypt sensitive data
 */
export function decryptToken(encryptedData: EncryptedData): string {
  const iv = Buffer.from(encryptedData.iv, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Encrypt object (for complex token data)
 */
export function encryptObject<T extends object>(obj: T): EncryptedData {
  const jsonString = JSON.stringify(obj)
  return encryptToken(jsonString)
}

/**
 * Decrypt object
 */
export function decryptObject<T extends object>(encryptedData: EncryptedData): T {
  const jsonString = decryptToken(encryptedData)
  return JSON.parse(jsonString) as T
}

/**
 * Hash sensitive data (one-way)
 */
export function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')
}

/**
 * Validate encryption key is set
 */
export function validateEncryptionSetup(): boolean {
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    console.warn('WARNING: TOKEN_ENCRYPTION_KEY not set in environment. Using generated key.')
    console.warn('Set TOKEN_ENCRYPTION_KEY in production for persistent encryption.')
    return false
  }
  return true
}