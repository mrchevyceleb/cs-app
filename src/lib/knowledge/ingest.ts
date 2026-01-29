/**
 * Knowledge Base Ingestion Orchestrator
 * Reads KB markdown files, parses into chunks, embeds, and upserts into database
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { parseMarkdownFile } from './parser'
import type { KBChunk, KBIngestResult, KBIngestSummary } from './types'
import fs from 'fs'
import path from 'path'

// OpenAI embedding batch size
const EMBEDDING_BATCH_SIZE = 20

/**
 * Ingest all KB files or a single file
 */
export async function ingestKnowledgeBase(
  singleFile?: string
): Promise<KBIngestSummary> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE environment variables')
  }
  if (!openaiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable')
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Find KB directory
  const kbDir = findKBDirectory()
  if (!kbDir) {
    throw new Error('Knowledge-Base directory not found')
  }

  // Get files to process
  let files: string[]
  if (singleFile) {
    const filePath = path.join(kbDir, singleFile)
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${singleFile}`)
    }
    files = [singleFile]
  } else {
    files = fs.readdirSync(kbDir)
      .filter(f => f.endsWith('.md'))
      .sort()
  }

  const results: KBIngestResult[] = []
  let totalChunks = 0
  let totalErrors = 0

  for (const file of files) {
    const result = await ingestFile(supabase, openaiKey, kbDir, file)
    results.push(result)
    totalChunks += result.chunks_created
    totalErrors += result.errors.length
  }

  return {
    total_files: files.length,
    total_chunks: totalChunks,
    total_errors: totalErrors,
    results,
  }
}

/**
 * Ingest a single KB file
 */
async function ingestFile(
  supabase: SupabaseClient,
  openaiKey: string,
  kbDir: string,
  fileName: string
): Promise<KBIngestResult> {
  const errors: string[] = []
  const filePath = path.join(kbDir, fileName)

  try {
    // Read file
    const content = fs.readFileSync(filePath, 'utf-8')

    // Parse into chunks
    const chunks = parseMarkdownFile(content, fileName)

    if (chunks.length === 0) {
      return { file: fileName, chunks_created: 0, chunks_deleted: 0, errors: ['No chunks parsed'] }
    }

    // Delete existing chunks for this source file
    const { data: deleted } = await supabase
      .from('knowledge_articles')
      .delete()
      .eq('is_kb_source', true)
      .eq('source_file', fileName)
      .select('id')

    const chunksDeleted = deleted?.length || 0

    // Generate embeddings in batches
    const embeddedChunks = await generateEmbeddingsForChunks(openaiKey, chunks, errors)

    // Upsert chunks
    let chunksCreated = 0
    for (const { chunk, embedding } of embeddedChunks) {
      const { error } = await supabase
        .from('knowledge_articles')
        .insert({
          title: chunk.title,
          content: chunk.content,
          category: chunk.category,
          source_file: chunk.source_file,
          section_path: chunk.section_path,
          file_number: chunk.file_number,
          chunk_index: chunk.chunk_index,
          metadata: chunk.metadata as unknown as Record<string, unknown>,
          is_kb_source: true,
          embedding,
        })

      if (error) {
        errors.push(`Insert error for "${chunk.title}": ${error.message}`)
      } else {
        chunksCreated++
      }
    }

    return { file: fileName, chunks_created: chunksCreated, chunks_deleted: chunksDeleted, errors }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`File processing error: ${msg}`)
    return { file: fileName, chunks_created: 0, chunks_deleted: 0, errors }
  }
}

/**
 * Generate embeddings for chunks in batches via OpenAI API
 */
async function generateEmbeddingsForChunks(
  openaiKey: string,
  chunks: KBChunk[],
  errors: string[]
): Promise<{ chunk: KBChunk; embedding: number[] }[]> {
  const results: { chunk: KBChunk; embedding: number[] }[] = []

  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE)
    const texts = batch.map(c => `${c.title}\n\n${c.content}`.slice(0, 8000))

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts,
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        errors.push(`Embedding API error (batch ${i / EMBEDDING_BATCH_SIZE}): ${errText}`)
        continue
      }

      const data = await response.json()
      const embeddings = data.data as { embedding: number[]; index: number }[]

      for (const item of embeddings) {
        results.push({
          chunk: batch[item.index],
          embedding: item.embedding,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Embedding batch error: ${msg}`)
    }
  }

  return results
}

/**
 * Find the Knowledge-Base directory
 */
function findKBDirectory(): string | null {
  // Try relative to project root
  const candidates = [
    path.join(process.cwd(), 'Knowledge-Base'),
    path.resolve(__dirname, '../../../../Knowledge-Base'),
  ]

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir
    }
  }

  return null
}
