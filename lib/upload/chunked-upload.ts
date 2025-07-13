/**
 * Chunked file upload utilities for handling large files
 */

export interface ChunkMetadata {
  uploadId: string
  fileName: string
  fileSize: number
  fileType: string
  chunkSize: number
  totalChunks: number
  uploadedChunks: Set<number>
  startTime: number
  expiresAt: number
}

export interface UploadProgress {
  uploadId: string
  fileName: string
  fileSize: number
  uploadedBytes: number
  uploadedChunks: number
  totalChunks: number
  percentage: number
  speed: number // bytes per second
  remainingTime: number // seconds
  status: 'preparing' | 'uploading' | 'paused' | 'completed' | 'error'
  error?: string
}

export class ChunkedUploadManager {
  private static CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks
  private static MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB
  private static UPLOAD_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours
  
  private uploads: Map<string, ChunkMetadata> = new Map()
  private progressCallbacks: Map<string, (progress: UploadProgress) => void> = new Map()
  private abortControllers: Map<string, AbortController> = new Map()
  
  /**
   * Initialize a new chunked upload
   */
  async initializeUpload(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    if (file.size > ChunkedUploadManager.MAX_FILE_SIZE) {
      throw new Error(`A fájl mérete meghaladja a maximális 2GB limitet`)
    }
    
    const uploadId = this.generateUploadId()
    const totalChunks = Math.ceil(file.size / ChunkedUploadManager.CHUNK_SIZE)
    
    const metadata: ChunkMetadata = {
      uploadId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      chunkSize: ChunkedUploadManager.CHUNK_SIZE,
      totalChunks,
      uploadedChunks: new Set(),
      startTime: Date.now(),
      expiresAt: Date.now() + ChunkedUploadManager.UPLOAD_EXPIRY
    }
    
    this.uploads.set(uploadId, metadata)
    
    if (onProgress) {
      this.progressCallbacks.set(uploadId, onProgress)
    }
    
    // Save to localStorage for resume capability
    this.saveToLocalStorage(uploadId, metadata)
    
    return uploadId
  }
  
  /**
   * Upload a file in chunks
   */
  async uploadFile(
    file: File,
    uploadId: string,
    endpoint: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    const metadata = this.uploads.get(uploadId)
    if (!metadata) {
      throw new Error('Upload not initialized')
    }
    
    const abortController = new AbortController()
    this.abortControllers.set(uploadId, abortController)
    
    try {
      this.updateProgress(uploadId, { status: 'uploading' })
      
      for (let chunkIndex = 0; chunkIndex < metadata.totalChunks; chunkIndex++) {
        // Skip already uploaded chunks (for resume)
        if (metadata.uploadedChunks.has(chunkIndex)) {
          continue
        }
        
        // Check if upload was aborted
        if (abortController.signal.aborted) {
          throw new Error('Upload aborted')
        }
        
        const start = chunkIndex * metadata.chunkSize
        const end = Math.min(start + metadata.chunkSize, file.size)
        const chunk = file.slice(start, end)
        
        await this.uploadChunk(
          chunk,
          uploadId,
          chunkIndex,
          endpoint,
          additionalData,
          abortController.signal
        )
        
        metadata.uploadedChunks.add(chunkIndex)
        this.saveToLocalStorage(uploadId, metadata)
        this.updateProgress(uploadId)
      }
      
      // Finalize upload
      await this.finalizeUpload(uploadId, endpoint, additionalData)
      
      this.updateProgress(uploadId, { status: 'completed' })
      this.cleanup(uploadId)
    } catch (error: any) {
      this.updateProgress(uploadId, { 
        status: 'error', 
        error: error.message 
      })
      throw error
    }
  }
  
  /**
   * Upload a single chunk
   */
  private async uploadChunk(
    chunk: Blob,
    uploadId: string,
    chunkIndex: number,
    endpoint: string,
    additionalData?: Record<string, any>,
    signal?: AbortSignal
  ): Promise<void> {
    const metadata = this.uploads.get(uploadId)
    if (!metadata) {
      throw new Error('Upload metadata not found')
    }
    
    const formData = new FormData()
    formData.append('chunk', chunk)
    formData.append('uploadId', uploadId)
    formData.append('chunkIndex', chunkIndex.toString())
    formData.append('totalChunks', metadata.totalChunks.toString())
    formData.append('fileName', metadata.fileName)
    formData.append('fileType', metadata.fileType)
    formData.append('fileSize', metadata.fileSize.toString())
    
    // Add any additional data
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }
    
    const response = await fetch(`${endpoint}/chunk`, {
      method: 'POST',
      body: formData,
      signal
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Chunk upload failed')
    }
  }
  
  /**
   * Finalize the upload after all chunks are uploaded
   */
  private async finalizeUpload(
    uploadId: string,
    endpoint: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    const metadata = this.uploads.get(uploadId)
    if (!metadata) {
      throw new Error('Upload metadata not found')
    }
    
    const response = await fetch(`${endpoint}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uploadId,
        fileName: metadata.fileName,
        fileType: metadata.fileType,
        fileSize: metadata.fileSize,
        totalChunks: metadata.totalChunks,
        ...additionalData
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Upload finalization failed')
    }
  }
  
  /**
   * Resume a paused upload
   */
  async resumeUpload(
    file: File,
    uploadId: string,
    endpoint: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    const savedMetadata = this.getFromLocalStorage(uploadId)
    if (!savedMetadata) {
      throw new Error('No upload found to resume')
    }
    
    // Validate file matches
    if (
      file.name !== savedMetadata.fileName ||
      file.size !== savedMetadata.fileSize ||
      file.type !== savedMetadata.fileType
    ) {
      throw new Error('File does not match the original upload')
    }
    
    // Restore metadata
    this.uploads.set(uploadId, {
      ...savedMetadata,
      uploadedChunks: new Set(savedMetadata.uploadedChunks)
    })
    
    // Continue upload
    await this.uploadFile(file, uploadId, endpoint, additionalData)
  }
  
  /**
   * Pause an ongoing upload
   */
  pauseUpload(uploadId: string): void {
    const controller = this.abortControllers.get(uploadId)
    if (controller) {
      controller.abort()
    }
    this.updateProgress(uploadId, { status: 'paused' })
  }
  
  /**
   * Cancel an upload and clean up
   */
  cancelUpload(uploadId: string): void {
    this.pauseUpload(uploadId)
    this.cleanup(uploadId)
  }
  
  /**
   * Get current upload progress
   */
  getProgress(uploadId: string): UploadProgress | null {
    const metadata = this.uploads.get(uploadId)
    if (!metadata) {
      return null
    }
    
    const uploadedBytes = metadata.uploadedChunks.size * metadata.chunkSize
    const percentage = Math.round((uploadedBytes / metadata.fileSize) * 100)
    const elapsedTime = (Date.now() - metadata.startTime) / 1000
    const speed = uploadedBytes / elapsedTime
    const remainingBytes = metadata.fileSize - uploadedBytes
    const remainingTime = remainingBytes / speed
    
    return {
      uploadId,
      fileName: metadata.fileName,
      fileSize: metadata.fileSize,
      uploadedBytes,
      uploadedChunks: metadata.uploadedChunks.size,
      totalChunks: metadata.totalChunks,
      percentage,
      speed,
      remainingTime,
      status: 'uploading'
    }
  }
  
  /**
   * Update progress and notify callback
   */
  private updateProgress(
    uploadId: string, 
    updates?: Partial<UploadProgress>
  ): void {
    const progress = this.getProgress(uploadId)
    if (!progress) return
    
    const updatedProgress = { ...progress, ...updates }
    const callback = this.progressCallbacks.get(uploadId)
    if (callback) {
      callback(updatedProgress)
    }
  }
  
  /**
   * Clean up upload data
   */
  private cleanup(uploadId: string): void {
    this.uploads.delete(uploadId)
    this.progressCallbacks.delete(uploadId)
    this.abortControllers.delete(uploadId)
    this.removeFromLocalStorage(uploadId)
  }
  
  /**
   * Generate unique upload ID
   */
  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Save upload metadata to localStorage
   */
  private saveToLocalStorage(uploadId: string, metadata: ChunkMetadata): void {
    const data = {
      ...metadata,
      uploadedChunks: Array.from(metadata.uploadedChunks)
    }
    localStorage.setItem(`hangjegyzet_upload_${uploadId}`, JSON.stringify(data))
  }
  
  /**
   * Get upload metadata from localStorage
   */
  private getFromLocalStorage(uploadId: string): ChunkMetadata | null {
    const data = localStorage.getItem(`hangjegyzet_upload_${uploadId}`)
    if (!data) return null
    
    try {
      const parsed = JSON.parse(data)
      return {
        ...parsed,
        uploadedChunks: new Set(parsed.uploadedChunks)
      }
    } catch {
      return null
    }
  }
  
  /**
   * Remove upload metadata from localStorage
   */
  private removeFromLocalStorage(uploadId: string): void {
    localStorage.removeItem(`hangjegyzet_upload_${uploadId}`)
  }
  
  /**
   * Get all resumable uploads
   */
  static getResumableUploads(): Array<{
    uploadId: string
    fileName: string
    fileSize: number
    progress: number
    expiresAt: number
  }> {
    const uploads = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('hangjegyzet_upload_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}')
          const uploadedBytes = data.uploadedChunks.length * data.chunkSize
          const progress = Math.round((uploadedBytes / data.fileSize) * 100)
          
          uploads.push({
            uploadId: data.uploadId,
            fileName: data.fileName,
            fileSize: data.fileSize,
            progress,
            expiresAt: data.expiresAt
          })
        } catch {
          // Invalid data, skip
        }
      }
    }
    
    // Filter out expired uploads
    const now = Date.now()
    return uploads.filter(upload => upload.expiresAt > now)
  }
}

export const chunkedUploadManager = new ChunkedUploadManager()