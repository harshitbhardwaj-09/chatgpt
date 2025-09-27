"use client"

import React, { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, Image, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'

interface FileAttachment {
  id: string
  type: 'document' | 'image'
  fileName: string
  fileType: string
  content?: string
  mimeType?: string
  size: number
  wordCount?: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

interface SimpleFileUploadProps {
  onFilesUploaded: (files: FileAttachment[]) => void
  onFileRemoved: (fileId: string) => void
  attachments: FileAttachment[]
  disabled?: boolean
  maxFiles?: number
}

const SUPPORTED_TYPES = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'text/plain': 'TXT',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPG',
  'image/webp': 'WEBP'
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function SimpleFileUpload({ 
  onFilesUploaded, 
  onFileRemoved, 
  attachments, 
  disabled = false,
  maxFiles = 3 
}: SimpleFileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    if (!Object.keys(SUPPORTED_TYPES).includes(file.type)) {
      return {
        isValid: false,
        error: `Unsupported file type. Supported: ${Object.values(SUPPORTED_TYPES).join(', ')}`
      }
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      }
    }

    return { isValid: true }
  }

  const uploadFile = async (file: File): Promise<FileAttachment> => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/simple-upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        let errorMessage = 'Upload failed'
        try {
          const error = await response.json()
          errorMessage = error.error || errorMessage
        } catch (e) {
          // If response is not JSON (like HTML error page), use status text
          errorMessage = `Upload failed: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      let result
      try {
        result = await response.json()
      } catch (e) {
        throw new Error('Server returned invalid response (not JSON)')
      }

      const fileData = result.data

      if (!fileData) {
        throw new Error('No file data returned from server')
      }

      return {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: fileData.type,
        fileName: fileData.fileName,
        fileType: fileData.fileType,
        content: fileData.content,
        mimeType: fileData.mimeType,
        size: fileData.size,
        wordCount: fileData.wordCount,
        status: 'success'
      }
    } catch (error) {
      return {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'document',
        fileName: file.name,
        fileType: SUPPORTED_TYPES[file.type as keyof typeof SUPPORTED_TYPES] || 'Unknown',
        size: file.size,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }

  const handleFiles = useCallback(async (files: FileList) => {
    if (disabled || isUploading) return
    
    const filesArray = Array.from(files)
    
    // Check file limits
    if (attachments.length + filesArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Validate files
    const validFiles: File[] = []
    for (const file of filesArray) {
      const validation = validateFile(file)
      if (!validation.isValid) {
        alert(`${file.name}: ${validation.error}`)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    setIsUploading(true)

    // Create pending attachments
    const pendingAttachments: FileAttachment[] = validFiles.map(file => ({
      id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: file.type.startsWith('image/') ? 'image' : 'document',
      fileName: file.name,
      fileType: SUPPORTED_TYPES[file.type as keyof typeof SUPPORTED_TYPES] || 'Unknown',
      size: file.size,
      status: 'uploading' as const
    }))

    onFilesUploaded([...attachments, ...pendingAttachments])

    // Upload files
    const uploadedFiles: FileAttachment[] = []
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      const uploadedFile = await uploadFile(file)
      uploadedFiles.push(uploadedFile)
      
      // Update progress
      const updatedAttachments = [
        ...attachments,
        ...uploadedFiles,
        ...pendingAttachments.slice(i + 1)
      ]
      onFilesUploaded(updatedAttachments)
    }

    setIsUploading(false)
  }, [attachments, disabled, isUploading, maxFiles, onFilesUploaded])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }, [disabled, handleFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFiles])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-3">
      {/* Upload Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
          isDragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
            : "border-token-border-medium hover:border-token-border-heavy",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-8 w-8 text-token-text-secondary mb-2" />
        <p className="text-sm text-token-text-primary font-medium">
          Drop files here or{' '}
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={disabled}
            className="text-blue-600 hover:text-blue-700 underline"
          >
            browse
          </button>
        </p>
        <p className="text-xs text-token-text-secondary mt-1">
          PDF, DOCX, TXT, PNG, JPG (max {formatFileSize(MAX_FILE_SIZE)})
        </p>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          multiple
          accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* File List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 bg-token-sidebar-surface-secondary rounded-lg"
            >
              <div className="flex-shrink-0">
                {file.type === 'image' ? (
                  <Image className="h-5 w-5 text-blue-500" />
                ) : (
                  <FileText className="h-5 w-5 text-green-500" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-token-text-primary truncate">
                  {file.fileName}
                </p>
                <div className="flex items-center gap-2 text-xs text-token-text-secondary">
                  <span>{file.fileType}</span>
                  <span>•</span>
                  <span>{formatFileSize(file.size)}</span>
                  {file.wordCount && (
                    <>
                      <span>•</span>
                      <span>{file.wordCount} words</span>
                    </>
                  )}
                </div>
                {file.error && (
                  <p className="text-xs text-red-500 mt-1">{file.error}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {file.status === 'uploading' && (
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                )}
                {file.status === 'success' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {file.status === 'error' && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-token-text-secondary hover:text-token-text-primary"
                  onClick={() => onFileRemoved(file.id)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}