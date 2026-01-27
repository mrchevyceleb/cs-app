'use client'

import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Upload,
  X,
  File,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react'

// Supported file types
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ACCEPTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export interface UploadedFile {
  id: string
  file: File
  url: string
  fileName: string
  fileType: string
  fileSize: number
  status: 'uploading' | 'completed' | 'error'
  progress: number
  error?: string
  previewUrl?: string
}

interface FileUploadProps {
  ticketId: string
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void
  disabled?: boolean
  maxFiles?: number
}

function getFileIcon(mimeType: string) {
  if (ACCEPTED_IMAGE_TYPES.includes(mimeType)) {
    return ImageIcon
  }
  if (mimeType === 'application/pdf') {
    return FileText
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return FileSpreadsheet
  }
  return File
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function isValidFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` }
  }

  const isValidType = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_DOCUMENT_TYPES].includes(file.type)
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const isValidExtension = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(extension)

  if (!isValidType && !isValidExtension) {
    return { valid: false, error: 'Unsupported file type' }
  }

  return { valid: true }
}

export function FileUpload({
  ticketId,
  files,
  onFilesChange,
  disabled = false,
  maxFiles = 5,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File): Promise<UploadedFile> => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2)}`
    const previewUrl = ACCEPTED_IMAGE_TYPES.includes(file.type)
      ? URL.createObjectURL(file)
      : undefined

    const uploadedFile: UploadedFile = {
      id: tempId,
      file,
      url: '',
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      status: 'uploading',
      progress: 0,
      previewUrl,
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('ticketId', ticketId)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()

      return {
        ...uploadedFile,
        id: data.id,
        url: data.url,
        status: 'completed',
        progress: 100,
      }
    } catch (error) {
      return {
        ...uploadedFile,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
      }
    }
  }, [ticketId])

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const newFiles = Array.from(fileList)
    const remainingSlots = maxFiles - files.length
    const filesToUpload = newFiles.slice(0, remainingSlots)

    if (filesToUpload.length === 0) return

    // Validate files first
    const validatedFiles: { file: File; error?: string }[] = filesToUpload.map(file => {
      const validation = isValidFile(file)
      return { file, error: validation.error }
    })

    // Add files to state as uploading
    const newUploadedFiles: UploadedFile[] = validatedFiles.map(({ file, error }) => ({
      id: `temp_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      file,
      url: '',
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      status: error ? 'error' as const : 'uploading' as const,
      progress: error ? 0 : 10,
      error,
      previewUrl: ACCEPTED_IMAGE_TYPES.includes(file.type)
        ? URL.createObjectURL(file)
        : undefined,
    }))

    onFilesChange([...files, ...newUploadedFiles])

    // Upload valid files
    const uploadPromises = validatedFiles
      .filter(({ error }) => !error)
      .map(({ file }) => uploadFile(file))

    const results = await Promise.all(uploadPromises)

    // Update state with results
    onFilesChange(prevFiles => {
      const uploadingIds = newUploadedFiles
        .filter(f => f.status === 'uploading')
        .map(f => f.id)
      const nonUploadingFiles = prevFiles.filter(f => !uploadingIds.includes(f.id))
      const errorFiles = newUploadedFiles.filter(f => f.status === 'error')
      return [...nonUploadingFiles, ...errorFiles, ...results]
    })
  }, [files, maxFiles, onFilesChange, uploadFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [disabled, handleFiles])

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }, [disabled])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      // Reset input so the same file can be selected again
      e.target.value = ''
    }
  }, [handleFiles])

  const removeFile = useCallback(async (fileId: string) => {
    const fileToRemove = files.find(f => f.id === fileId)

    // Cleanup preview URL
    if (fileToRemove?.previewUrl) {
      URL.revokeObjectURL(fileToRemove.previewUrl)
    }

    // If file was uploaded, delete from server
    if (fileToRemove && fileToRemove.status === 'completed' && !fileToRemove.id.startsWith('temp_')) {
      try {
        await fetch(`/api/upload?id=${fileToRemove.id}`, {
          method: 'DELETE',
        })
      } catch (error) {
        console.error('Failed to delete file:', error)
      }
    }

    onFilesChange(files.filter(f => f.id !== fileId))
  }, [files, onFilesChange])

  const hasReachedLimit = files.length >= maxFiles

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      {!hasReachedLimit && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
            'flex flex-col items-center justify-center gap-2 text-center',
            isDragging
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Upload className={cn(
            'h-8 w-8',
            isDragging ? 'text-primary-500' : 'text-gray-400'
          )} />
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Images, PDFs, Word, Excel, Text (max {MAX_FILE_SIZE / 1024 / 1024}MB each)
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled}
          />
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => (
            <FilePreviewItem
              key={file.id}
              file={file}
              onRemove={() => removeFile(file.id)}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* File count */}
      {files.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
          {files.length} / {maxFiles} files
        </p>
      )}
    </div>
  )
}

interface FilePreviewItemProps {
  file: UploadedFile
  onRemove: () => void
  disabled?: boolean
}

function FilePreviewItem({ file, onRemove, disabled }: FilePreviewItemProps) {
  const Icon = getFileIcon(file.fileType)
  const isImage = ACCEPTED_IMAGE_TYPES.includes(file.fileType)

  return (
    <div className={cn(
      'flex items-center gap-3 p-2 rounded-lg border',
      file.status === 'error'
        ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
    )}>
      {/* Preview / Icon */}
      <div className="h-12 w-12 rounded flex-shrink-0 overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-gray-700">
        {isImage && file.previewUrl ? (
          <img
            src={file.previewUrl}
            alt={file.fileName}
            className="h-full w-full object-cover"
          />
        ) : (
          <Icon className="h-6 w-6 text-gray-400" />
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {file.fileName}
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            {formatFileSize(file.fileSize)}
          </span>

          {file.status === 'uploading' && (
            <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading...
            </span>
          )}

          {file.status === 'completed' && (
            <span className="text-green-600 dark:text-green-400">
              Ready
            </span>
          )}

          {file.status === 'error' && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertCircle className="h-3 w-3" />
              {file.error || 'Failed'}
            </span>
          )}
        </div>
      </div>

      {/* Remove Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
        onClick={onRemove}
        disabled={disabled || file.status === 'uploading'}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Compact file chips for ChatInput
export interface FileChipProps {
  file: UploadedFile
  onRemove: () => void
  disabled?: boolean
}

export function FileChip({ file, onRemove, disabled }: FileChipProps) {
  const Icon = getFileIcon(file.fileType)
  const isImage = ACCEPTED_IMAGE_TYPES.includes(file.fileType)

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
      file.status === 'error'
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    )}>
      {file.status === 'uploading' ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isImage && file.previewUrl ? (
        <img
          src={file.previewUrl}
          alt=""
          className="h-4 w-4 rounded object-cover"
        />
      ) : (
        <Icon className="h-3 w-3" />
      )}

      <span className="max-w-[100px] truncate">
        {file.fileName}
      </span>

      <button
        type="button"
        onClick={onRemove}
        disabled={disabled || file.status === 'uploading'}
        className="hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
