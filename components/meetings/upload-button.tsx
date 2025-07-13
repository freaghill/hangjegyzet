'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { ChunkedUploadDialog } from '@/components/upload/chunked-upload-dialog'
import { UploadDialog } from '@/components/meetings/upload-dialog'
import { shouldUseChunkedUpload } from '@/lib/upload-validation'

interface UploadButtonProps {
  organizationId: string
  onSuccess?: (meetingId: string) => void
  className?: string
}

export function UploadButton({ 
  organizationId, 
  onSuccess,
  className 
}: UploadButtonProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showChunkedDialog, setShowChunkedDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    
    // Decide which dialog to show based on file size
    if (shouldUseChunkedUpload(file.size)) {
      setShowChunkedDialog(true)
    } else {
      setShowUploadDialog(true)
    }
  }

  const handleUploadSuccess = (meetingId: string) => {
    setShowUploadDialog(false)
    setShowChunkedDialog(false)
    setSelectedFile(null)
    onSuccess?.(meetingId)
  }

  return (
    <>
      <Button
        onClick={() => document.getElementById('upload-input')?.click()}
        className={className}
      >
        <Upload className="mr-2 h-4 w-4" />
        Fájl feltöltése
      </Button>
      
      <input
        id="upload-input"
        type="file"
        className="hidden"
        accept="audio/*,video/*"
        onChange={handleFileSelect}
      />

      {/* Regular upload dialog for smaller files */}
      <UploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onSuccess={handleUploadSuccess}
        initialFile={selectedFile}
      />

      {/* Chunked upload dialog for larger files */}
      <ChunkedUploadDialog
        open={showChunkedDialog}
        onOpenChange={setShowChunkedDialog}
        onSuccess={handleUploadSuccess}
        organizationId={organizationId}
      />
    </>
  )
}