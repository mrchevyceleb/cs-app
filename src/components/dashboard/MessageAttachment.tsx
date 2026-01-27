'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  File,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Download,
  ExternalLink,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { MessageAttachment as MessageAttachmentType } from '@/types/database'

// Check if file is an image based on MIME type
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function isImageType(mimeType: string): boolean {
  return IMAGE_TYPES.includes(mimeType)
}

function getFileIcon(mimeType: string) {
  if (isImageType(mimeType)) {
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

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toUpperCase() || 'FILE'
}

interface MessageAttachmentProps {
  attachment: MessageAttachmentType
  variant?: 'default' | 'compact'
}

export function MessageAttachment({ attachment, variant = 'default' }: MessageAttachmentProps) {
  const [showLightbox, setShowLightbox] = useState(false)
  const [imageError, setImageError] = useState(false)

  const isImage = isImageType(attachment.file_type) && !imageError
  const Icon = getFileIcon(attachment.file_type)

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!attachment.public_url) return

    try {
      const response = await fetch(attachment.public_url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      // Fallback: open in new tab
      window.open(attachment.public_url, '_blank')
    }
  }, [attachment.public_url, attachment.file_name])

  const handleOpenLightbox = useCallback(() => {
    if (isImage && attachment.public_url) {
      setShowLightbox(true)
    }
  }, [isImage, attachment.public_url])

  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={isImage ? handleOpenLightbox : handleDownload}
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs',
            'bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30',
            'transition-colors cursor-pointer'
          )}
        >
          {isImage && attachment.public_url ? (
            <img
              src={attachment.public_url}
              alt={attachment.file_name}
              className="h-4 w-4 rounded object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <Icon className="h-3 w-3" />
          )}
          <span className="max-w-[80px] truncate">{attachment.file_name}</span>
        </button>

        {isImage && attachment.public_url && (
          <ImageLightbox
            open={showLightbox}
            onOpenChange={setShowLightbox}
            imageUrl={attachment.public_url}
            fileName={attachment.file_name}
            fileSize={attachment.file_size}
            onDownload={handleDownload}
          />
        )}
      </>
    )
  }

  // Default variant - image preview or document card
  if (isImage && attachment.public_url) {
    return (
      <>
        <button
          onClick={handleOpenLightbox}
          className="relative group rounded-lg overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <img
            src={attachment.public_url}
            alt={attachment.file_name}
            className="max-w-[200px] max-h-[150px] object-cover rounded-lg"
            onError={() => setImageError(true)}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="h-6 w-6 text-white drop-shadow-lg" />
            </div>
          </div>
        </button>

        <ImageLightbox
          open={showLightbox}
          onOpenChange={setShowLightbox}
          imageUrl={attachment.public_url}
          fileName={attachment.file_name}
          fileSize={attachment.file_size}
          onDownload={handleDownload}
        />
      </>
    )
  }

  // Document card
  return (
    <button
      onClick={handleDownload}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'bg-white/50 dark:bg-black/20',
        'border border-gray-200/50 dark:border-gray-600/50',
        'hover:bg-white/80 dark:hover:bg-black/30',
        'transition-colors cursor-pointer w-full max-w-[250px]',
        'focus:outline-none focus:ring-2 focus:ring-primary-500'
      )}
    >
      <div className={cn(
        'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
        'bg-gray-100 dark:bg-gray-700'
      )}>
        <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      </div>

      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium truncate text-gray-900 dark:text-white">
          {attachment.file_name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {getFileExtension(attachment.file_name)} - {formatFileSize(attachment.file_size)}
        </p>
      </div>

      <Download className="h-4 w-4 text-gray-400 shrink-0" />
    </button>
  )
}

// Group of attachments for a message
interface MessageAttachmentsProps {
  attachments: MessageAttachmentType[]
  variant?: 'default' | 'compact'
}

export function MessageAttachments({ attachments, variant = 'default' }: MessageAttachmentsProps) {
  if (!attachments || attachments.length === 0) return null

  // Separate images and documents
  const images = attachments.filter(a => isImageType(a.file_type))
  const documents = attachments.filter(a => !isImageType(a.file_type))

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {attachments.map(attachment => (
          <MessageAttachment
            key={attachment.id}
            attachment={attachment}
            variant="compact"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Image grid */}
      {images.length > 0 && (
        <div className={cn(
          'flex flex-wrap gap-2',
          images.length === 1 ? '' : 'grid grid-cols-2'
        )}>
          {images.map(attachment => (
            <MessageAttachment
              key={attachment.id}
              attachment={attachment}
            />
          ))}
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="flex flex-col gap-2">
          {documents.map(attachment => (
            <MessageAttachment
              key={attachment.id}
              attachment={attachment}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Lightbox for viewing images
interface ImageLightboxProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string
  fileName: string
  fileSize: number
  onDownload: (e: React.MouseEvent) => void
}

function ImageLightbox({
  open,
  onOpenChange,
  imageUrl,
  fileName,
  fileSize,
  onDownload,
}: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1)

  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z + 0.25, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(z - 0.25, 0.5))
  }, [])

  const handleReset = useCallback(() => {
    setZoom(1)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black/95"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Image Preview: {fileName}</DialogTitle>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="text-white">
            <p className="font-medium truncate max-w-[300px]">{fileName}</p>
            <p className="text-sm text-white/70">{formatFileSize(fileSize)}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <button
              onClick={handleReset}
              className="text-white/70 text-sm hover:text-white px-2"
            >
              {Math.round(zoom * 100)}%
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            <div className="w-px h-6 bg-white/30 mx-2" />
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={onDownload}
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => window.open(imageUrl, '_blank')}
            >
              <ExternalLink className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Image */}
        <div
          className="flex items-center justify-center w-full h-full min-h-[300px] overflow-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onOpenChange(false)
            }
          }}
        >
          <img
            src={imageUrl}
            alt={fileName}
            style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease' }}
            className="max-w-full max-h-[85vh] object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
