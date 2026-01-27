import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { MessageAttachmentInsert } from '@/types/database'

// Supported file types
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]

const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt',
]

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

function isValidFileType(mimeType: string, filename: string): boolean {
  const extension = getFileExtension(filename)
  return ALLOWED_MIME_TYPES.includes(mimeType) || ALLOWED_EXTENSIONS.includes(extension)
}

// POST /api/upload - Upload file to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const ticketId = formData.get('ticketId') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Missing ticketId' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Validate file type
    if (!isValidFileType(file.type, file.name)) {
      return NextResponse.json(
        { error: 'File type not allowed. Supported: images (jpg, png, gif, webp), documents (pdf, doc, docx, xls, xlsx, txt)' },
        { status: 400 }
      )
    }

    // Generate unique filename to avoid collisions
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const safeFileName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 100) // Limit filename length
    const uniqueFileName = `${timestamp}_${randomSuffix}_${safeFileName}`

    // Storage path: tickets/{ticketId}/{filename}
    const storagePath = `tickets/${ticketId}/${uniqueFileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(storagePath)

    const publicUrl = urlData?.publicUrl || null

    // Create attachment record in database
    // Note: message_id is null initially, will be linked when message is sent
    const attachmentData: MessageAttachmentInsert = {
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
      public_url: publicUrl,
    }

    const { data: attachment, error: dbError } = await supabase
      .from('message_attachments')
      .insert(attachmentData)
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      // Try to clean up the uploaded file
      await supabase.storage.from('attachments').remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to create attachment record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: attachment.id,
      url: attachment.public_url,
      fileName: attachment.file_name,
      fileType: attachment.file_type,
      fileSize: attachment.file_size,
    }, { status: 201 })

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/upload - Delete an uploaded attachment (before it's linked to a message)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get('id')

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'Missing attachment id' },
        { status: 400 }
      )
    }

    // Get attachment to find storage path
    const { data: attachment, error: fetchError } = await supabase
      .from('message_attachments')
      .select('*')
      .eq('id', attachmentId)
      .is('message_id', null) // Only allow deleting unlinked attachments
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found or already linked to a message' },
        { status: 404 }
      )
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('attachments')
      .remove([attachment.storage_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('message_attachments')
      .delete()
      .eq('id', attachmentId)

    if (dbError) {
      console.error('Database delete error:', dbError)
      return NextResponse.json(
        { error: 'Failed to delete attachment record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete attachment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
