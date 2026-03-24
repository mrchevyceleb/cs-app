import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWidgetSession } from '@/lib/widget/auth'
import type { MessageAttachmentInsert } from '@/types/database'

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']

// Max image size: 5MB (smaller limit for widget)
const MAX_FILE_SIZE = 5 * 1024 * 1024

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function corsJson(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS })
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SB_URL
  const serviceKey = process.env.SB_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(supabaseUrl, serviceKey)
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

function isValidImageType(mimeType: string, filename: string): boolean {
  const extension = getFileExtension(filename)
  // Require both MIME type AND extension to be valid (prevents spoofing)
  return ALLOWED_IMAGE_TYPES.includes(mimeType) && ALLOWED_EXTENSIONS.includes(extension)
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

// POST /api/widget/upload - Upload image from widget chat
export async function POST(request: NextRequest) {
  try {
    // Authenticate via widget token
    const session = await getWidgetSession(request)
    if (!session) {
      return corsJson({ error: 'Unauthorized' }, 401)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const ticketId = formData.get('ticketId') as string | null

    if (!file) {
      return corsJson({ error: 'No file provided' }, 400)
    }

    // Reject zero-byte files
    if (file.size === 0) {
      return corsJson({ error: 'File is empty' }, 400)
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return corsJson({ error: `Image exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` }, 400)
    }

    // Validate image type
    if (!isValidImageType(file.type, file.name)) {
      return corsJson({ error: 'Only images are supported (jpg, png, gif, webp)' }, 400)
    }

    const supabase = getServiceClient()

    // If ticketId provided, verify ownership
    if (ticketId) {
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('id')
        .eq('id', ticketId)
        .eq('customer_id', session.customerId)
        .single()

      if (ticketError || !ticket) {
        return corsJson({ error: 'Ticket not found' }, 404)
      }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const safeFileName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 100)
    const uniqueFileName = `${timestamp}_${randomSuffix}_${safeFileName}`

    // Storage path: widget/{customerId}/{filename} (or tickets/{ticketId}/ if ticket exists)
    const storagePath = ticketId
      ? `tickets/${ticketId}/${uniqueFileName}`
      : `widget/${session.customerId}/${uniqueFileName}`

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
      console.error('[Widget Upload] Storage error:', uploadError)
      return corsJson({ error: 'Failed to upload image' }, 500)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(storagePath)

    const publicUrl = urlData?.publicUrl || null

    // Create attachment record (message_id null until message is sent)
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
      console.error('[Widget Upload] DB error:', dbError)
      await supabase.storage.from('attachments').remove([storagePath])
      return corsJson({ error: 'Failed to save attachment record' }, 500)
    }

    return corsJson({
      id: attachment.id,
      url: attachment.public_url,
      fileName: attachment.file_name,
      fileType: attachment.file_type,
      fileSize: attachment.file_size,
    }, 201)
  } catch (error) {
    console.error('[Widget Upload] Error:', error)
    return corsJson({ error: 'Internal server error' }, 500)
  }
}
