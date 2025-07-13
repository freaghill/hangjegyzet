import { useState, useCallback, useRef } from 'react'
import { ChunkedUploadManager, UploadProgress } from '@/lib/upload/chunked-upload'
import { validateChunkedFileUpload, shouldUseChunkedUpload } from '@/lib/upload-validation'
import { useToast } from '@/components/ui/use-toast'

interface UseChunkedUploadOptions {
  endpoint: string
  onSuccess?: (response: any) => void
  onError?: (error: Error) => void
  additionalData?: Record<string, any>
}

interface UploadState {
  file: File | null
  uploadId: string | null
  progress: UploadProgress | null
  isUploading: boolean
  isPaused: boolean
  error: string | null
}

export function useChunkedUpload(options: UseChunkedUploadOptions) {
  const { endpoint, onSuccess, onError, additionalData } = options
  const [state, setState] = useState<UploadState>({
    file: null,
    uploadId: null,
    progress: null,
    isUploading: false,
    isPaused: false,
    error: null
  })
  
  const { toast } = useToast()
  const uploadManagerRef = useRef(new ChunkedUploadManager())

  const upload = useCallback(async (file: File) => {
    // Validate file
    const validation = validateChunkedFileUpload(file)
    if (!validation.valid) {
      setState(prev => ({ ...prev, error: validation.error || 'Invalid file' }))
      toast({
        title: 'Érvénytelen fájl',
        description: validation.error,
        variant: 'destructive'
      })
      return
    }

    setState({
      file,
      uploadId: null,
      progress: null,
      isUploading: true,
      isPaused: false,
      error: null
    })

    try {
      // Check if we should use chunked upload
      const useChunked = shouldUseChunkedUpload(file.size)
      
      if (useChunked) {
        // Initialize chunked upload
        const uploadId = await uploadManagerRef.current.initializeUpload(
          file,
          (progress) => {
            setState(prev => ({ ...prev, progress }))
          }
        )

        setState(prev => ({ ...prev, uploadId }))

        // Start upload
        await uploadManagerRef.current.uploadFile(
          file,
          uploadId,
          endpoint,
          additionalData
        )

        setState(prev => ({ 
          ...prev, 
          isUploading: false,
          progress: { ...prev.progress!, status: 'completed' }
        }))

        if (onSuccess) {
          onSuccess({ uploadId, fileName: file.name })
        }

        toast({
          title: 'Feltöltés sikeres',
          description: `${file.name} sikeresen feltöltve.`
        })
      } else {
        // Use regular upload for smaller files
        const formData = new FormData()
        formData.append('file', file)
        
        if (additionalData) {
          Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, value)
          })
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Upload failed')
        }

        const result = await response.json()
        
        setState(prev => ({ ...prev, isUploading: false }))

        if (onSuccess) {
          onSuccess(result)
        }

        toast({
          title: 'Feltöltés sikeres',
          description: `${file.name} sikeresen feltöltve.`
        })
      }
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isUploading: false,
        error: error.message 
      }))

      if (onError) {
        onError(error)
      }

      toast({
        title: 'Feltöltési hiba',
        description: error.message,
        variant: 'destructive'
      })
    }
  }, [endpoint, additionalData, onSuccess, onError, toast])

  const pause = useCallback(() => {
    if (state.uploadId) {
      uploadManagerRef.current.pauseUpload(state.uploadId)
      setState(prev => ({ ...prev, isPaused: true }))
    }
  }, [state.uploadId])

  const resume = useCallback(async () => {
    if (state.uploadId && state.file) {
      setState(prev => ({ ...prev, isPaused: false, isUploading: true }))
      
      try {
        await uploadManagerRef.current.resumeUpload(
          state.file,
          state.uploadId,
          endpoint,
          additionalData
        )
        
        setState(prev => ({ ...prev, isUploading: false }))
        
        if (onSuccess) {
          onSuccess({ uploadId: state.uploadId, fileName: state.file!.name })
        }
      } catch (error: any) {
        setState(prev => ({ 
          ...prev, 
          isUploading: false,
          error: error.message 
        }))

        if (onError) {
          onError(error)
        }
      }
    }
  }, [state.uploadId, state.file, endpoint, additionalData, onSuccess, onError])

  const cancel = useCallback(() => {
    if (state.uploadId) {
      uploadManagerRef.current.cancelUpload(state.uploadId)
    }
    
    setState({
      file: null,
      uploadId: null,
      progress: null,
      isUploading: false,
      isPaused: false,
      error: null
    })
  }, [state.uploadId])

  const reset = useCallback(() => {
    setState({
      file: null,
      uploadId: null,
      progress: null,
      isUploading: false,
      isPaused: false,
      error: null
    })
  }, [])

  return {
    ...state,
    upload,
    pause,
    resume,
    cancel,
    reset
  }
}