'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { 
  Upload, 
  X, 
  File, 
  Image, 
  FileText, 
  Sheet,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface UploadedFile {
  id: string
  originalName: string
  cloudinaryUrl: string
  publicId: string
  mimeType: string
  size: number
  extractedText: string
  metadata: any
  uploadedAt: string
}

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void
  maxFiles?: number
  maxSizeBytes?: number
  accept?: string
  disabled?: boolean
  className?: string
}

interface FileWithPreview extends File {
  preview?: string
  id: string
  uploadProgress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  extractedText?: string
}

export function FileUpload({
  onFilesUploaded,
  maxFiles = 5,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  accept = '.doc,.docx,.xls,.xlsx,.txt,.csv,.json,.md',
  disabled = false,
  className
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get file icon based on MIME type
  const getFileIcon = (mimeType: string | undefined) => {
    if (!mimeType) return File
    if (mimeType.startsWith('image/')) return Image
    if (mimeType === 'application/pdf') return FileText
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return Sheet
    return File
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Validate file
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    if (file.size > maxSizeBytes) {
      return {
        isValid: false,
        error: `File size ${formatFileSize(file.size)} exceeds maximum allowed size of ${formatFileSize(maxSizeBytes)}`
      }
    }

    const acceptedTypes = accept.split(',').map(type => type.trim())
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    const isAccepted = acceptedTypes.some(type => {
      if (type.startsWith('.')) return type === fileExtension
      return file.type.includes(type.replace('*', ''))
    })

    if (!isAccepted) {
      return {
        isValid: false,
        error: `File type not supported. Accepted types: ${accept}`
      }
    }

    return { isValid: true }
  }

  // Add files to the list
  const addFiles = useCallback((newFiles: File[]) => {
    console.log('addFiles called with:', newFiles.map(f => ({ name: f.name, type: f.type, size: f.size })))
    const validFiles: FileWithPreview[] = []

    for (const file of newFiles) {
      if (files.length + validFiles.length >= maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`)
        break
      }

      const validation = validateFile(file)
      if (!validation.isValid) {
        alert(validation.error)
        continue
      }

      // Create a proper FileWithPreview that extends the original File
      const fileWithPreview = Object.create(file) as FileWithPreview
      fileWithPreview.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      fileWithPreview.uploadProgress = 0
      fileWithPreview.status = 'pending' as const
      
      console.log('Original file:', file);
      console.log('Created fileWithPreview:', fileWithPreview);
      console.log('FileWithPreview keys:', Object.keys(fileWithPreview));
      console.log('File name:', fileWithPreview.name);
      console.log('File type:', fileWithPreview.type);
      console.log('File size:', fileWithPreview.size);

      // Create preview for images (only if type exists and is image)
      if (file.type && file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file)
      }

      validFiles.push(fileWithPreview)
    }

    setFiles(prev => {
      const newFiles = [...prev, ...validFiles];
      console.log('Files updated:', newFiles.map(f => ({ name: f.name, status: f.status })));
      return newFiles;
    });
  }, [files.length, maxFiles])

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    console.log('Files dropped');

    if (disabled) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    console.log('Dropped files:', droppedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
    addFiles(droppedFiles)
  }, [disabled, addFiles])

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed');
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      console.log('Selected files:', selectedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
      addFiles(selectedFiles)
      // Reset input
      e.target.value = ''
    }
  }, [addFiles])

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const newFiles = prev.filter(f => f.id !== fileId)
      // Revoke object URL to prevent memory leaks
      const fileToRemove = prev.find(f => f.id === fileId)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return newFiles
    })
  }, [])

  // Upload files
  const uploadFiles = useCallback(async () => {
    if (files.length === 0 || isUploading) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      const pendingFiles = files.filter(f => f.status === 'pending')
      
      console.log('Uploading files:', pendingFiles.map(f => ({ 
        name: f.name || 'NO NAME', 
        type: f.type || 'NO TYPE', 
        size: f.size || 'NO SIZE',
        isFile: f instanceof File,
        fileKeys: Object.keys(f)
      })))
      
      pendingFiles.forEach((file, index) => {
        console.log(`Appending file ${index}:`, {
          name: file.name,
          type: file.type,
          size: file.size,
          isFile: file instanceof File,
          constructor: file.constructor.name
        })
        
        // Make sure we're appending a proper File object
        if (file instanceof File) {
          formData.append('files', file)
        } else {
          console.error('Not a File object:', file)
        }
      })

      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.status === 'pending' 
          ? { ...f, status: 'uploading' as const, uploadProgress: 0 }
          : f
      ))

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => 
          f.status === 'uploading'
            ? { ...f, uploadProgress: Math.min(f.uploadProgress + 10, 90) }
            : f
        ))
      }, 200)

      console.log('Making fetch request to /api/upload...')
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      console.log('Fetch completed. Response status:', response.status)
      clearInterval(progressInterval)

      if (!response.ok) {
        console.log('Response not OK. Status:', response.status)
        let errorData
        try {
          errorData = await response.json()
          console.log('Error data:', errorData)
        } catch (jsonError) {
          console.log('Failed to parse error JSON:', jsonError)
          const errorText = await response.text()
          console.log('Error text:', errorText)
          errorData = { error: errorText || `HTTP ${response.status}` }
        }
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      
      // Update files with success status
      setFiles(prev => prev.map(f => 
        f.status === 'uploading'
          ? { ...f, status: 'success' as const, uploadProgress: 100 }
          : f
      ))

      // Call callback with uploaded files
      onFilesUploaded(result.files)

      // Clear files after successful upload
      setTimeout(() => {
        setFiles([])
      }, 2000)

    } catch (error) {
      console.error('Upload error:', error)
      console.error('Error type:', typeof error)
      console.error('Error instanceof Error:', error instanceof Error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Network/fetch error detected')
      }
      
      // Update files with error status
      setFiles(prev => prev.map(f => 
        f.status === 'uploading'
          ? { 
              ...f, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : 'Upload failed'
            }
          : f
      ))
    } finally {
      setIsUploading(false)
    }
  }, [files, isUploading, onFilesUploaded])

  // Clear all files
  const clearFiles = useCallback(() => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
    })
    setFiles([])
  }, [files])

  return (
    <div className={cn('w-full', className)}>
      {/* Streamlined Drop zone */}
      <div
        className={cn(
          'relative border border-dashed rounded-lg p-4 text-center transition-all duration-200',
          isDragging
            ? 'border-token-border-heavy bg-token-main-surface-secondary'
            : 'border-token-border-medium hover:border-token-border-heavy hover:bg-token-main-surface-secondary',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Drop files here or click to browse
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Support for Word, Excel, and text files up to {formatFileSize(maxSizeBytes)}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || files.length >= maxFiles}
        >
          Select Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Files ({files.length}/{maxFiles})
            </h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={clearFiles}
                disabled={isUploading}
              >
                Clear All
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  console.log('Upload button clicked');
                  console.log('Files:', files.map(f => ({ status: f.status, name: f.name })));
                  console.log('Is uploading:', isUploading);
                  console.log('Button disabled:', isUploading || files.every(f => f.status !== 'pending'));
                  uploadFiles();
                }}
                disabled={isUploading || files.every(f => f.status !== 'pending')}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Files'
                )}
              </Button>
            </div>
          </div>

          {files.map((file) => {
            const FileIcon = getFileIcon(file.type || 'application/octet-stream')
            
            return (
              <Card key={file.id} className="p-3">
                <CardContent className="p-0">
                  <div className="flex items-center gap-3">
                    {/* File preview/icon */}
                    <div className="flex-shrink-0">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="h-10 w-10 object-cover rounded"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                          <FileIcon className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </p>
                      
                      {/* Progress bar */}
                      {file.status === 'uploading' && (
                        <Progress value={file.uploadProgress} className="mt-1" />
                      )}
                      
                      {/* Error message */}
                      {file.status === 'error' && file.error && (
                        <p className="text-xs text-red-600 mt-1">{file.error}</p>
                      )}
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center gap-2">
                      {file.status === 'pending' && (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      {file.status === 'uploading' && (
                        <Badge variant="secondary">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Uploading
                        </Badge>
                      )}
                      {file.status === 'success' && (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Success
                        </Badge>
                      )}
                      {file.status === 'error' && (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      )}
                      
                      {/* Remove button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(file.id)}
                        disabled={file.status === 'uploading'}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default FileUpload