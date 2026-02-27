#!/usr/bin/env npx tsx
/**
 * CLI script for Knowledge Base ingestion
 * Usage:
 *   npx tsx scripts/ingest-kb.ts                    # Ingest all files
 *   npx tsx scripts/ingest-kb.ts 02-plans-and-pricing.md  # Single file
 *
 * Requires env vars: NEXT_PUBLIC_SB_URL, SB_SERVICE_ROLE_KEY, OPENAI_API_KEY
 */

import 'dotenv/config'
import { ingestKnowledgeBase } from '../src/lib/knowledge/ingest'

async function main() {
  const singleFile = process.argv[2]

  console.log('=== R-Link Knowledge Base Ingestion ===')
  console.log(singleFile ? `File: ${singleFile}` : 'Mode: Full ingestion (all files)')
  console.log('')

  const startTime = Date.now()

  try {
    const result = await ingestKnowledgeBase(singleFile)

    console.log(`\nResults:`)
    console.log(`  Files processed: ${result.total_files}`)
    console.log(`  Total chunks created: ${result.total_chunks}`)
    console.log(`  Total errors: ${result.total_errors}`)
    console.log(`  Time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
    console.log('')

    for (const r of result.results) {
      const status = r.errors.length === 0 ? 'OK' : 'ERRORS'
      console.log(`  [${status}] ${r.file}: ${r.chunks_created} chunks (${r.chunks_deleted} deleted)`)
      for (const err of r.errors) {
        console.log(`         ERROR: ${err}`)
      }
    }

    if (result.total_errors > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

main()
