export const UPLOAD_LIMITS = {
  maxFileSize: 500 * 1024 * 1024, // 500MB
  allowedMimeTypes: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/webm',
    'audio/mp4',
    'audio/x-m4a',
    'video/mp4', // For video with audio
    'video/webm',
    'video/ogg'
  ],
  allowedExtensions: [
    '.mp3', '.wav', '.ogg', '.m4a', '.webm', '.mp4'
  ]
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateFileUpload(file: File): ValidationResult {
  // Check file size
  if (file.size > UPLOAD_LIMITS.maxFileSize) {
    const sizeMB = Math.round(file.size / (1024 * 1024))
    return {
      valid: false,
      error: `A fájl túl nagy (${sizeMB}MB). Maximum 500MB engedélyezett.`
    }
  }
  
  // Check mime type
  if (!UPLOAD_LIMITS.allowedMimeTypes.includes(file.type)) {
    // Fallback to extension check for cases where mime type is not set correctly
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!UPLOAD_LIMITS.allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `Nem támogatott fájltípus. Engedélyezett formátumok: ${UPLOAD_LIMITS.allowedExtensions.join(', ')}`
      }
    }
  }
  
  // Check if file is not empty
  if (file.size === 0) {
    return {
      valid: false,
      error: 'A fájl üres'
    }
  }
  
  return { valid: true }
}

export function getFileExtension(filename: string): string {
  return '.' + filename.split('.').pop()?.toLowerCase()
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}