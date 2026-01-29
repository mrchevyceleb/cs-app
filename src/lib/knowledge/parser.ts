/**
 * Knowledge Base Markdown Parser
 * Parses .md files into semantically meaningful chunks for embedding
 */

import type { KBChunk, KBChunkMetadata, KBCategory } from './types'

// Max chars per chunk (~1500 tokens). Chunks larger than this get split on H3.
const MAX_CHUNK_CHARS = 6000
// Min chars to be worth embedding
const MIN_CHUNK_CHARS = 100

// Category mapping by file number
const CATEGORY_MAP: Record<number, KBCategory> = {
  0: 'Foundation',
  1: 'Foundation',
  2: 'Foundation',
  3: 'Foundation',
  4: 'Foundation',
  5: 'Foundation',
  6: 'Foundation',
  7: 'Studio Core',
  8: 'Studio Core',
  9: 'Studio Core',
  10: 'Studio Features',
  11: 'Studio Features',
  12: 'Studio Features',
  13: 'Studio Features',
  14: 'Studio Features',
  15: 'Studio Features',
  16: 'Studio Features',
  17: 'Studio Features',
  18: 'Studio Features',
  19: 'Studio Features',
  20: 'Studio Features',
  21: 'Studio Features',
  22: 'Admin',
  23: 'Admin',
  24: 'Admin',
  25: 'Admin',
  26: 'Admin',
  27: 'Admin',
  28: 'Admin',
  29: 'Admin',
  30: 'Admin',
  31: 'General',
  32: 'Admin',
}

/**
 * Parse a markdown file into semantically meaningful chunks
 */
export function parseMarkdownFile(
  content: string,
  fileName: string
): KBChunk[] {
  const fileNumber = extractFileNumber(fileName)
  const category = CATEGORY_MAP[fileNumber] || 'General'
  const chunks: KBChunk[] = []

  // Split into H2 sections
  const h2Sections = splitOnHeading(content, 2)

  let chunkIndex = 0

  for (const section of h2Sections) {
    const sectionTitle = section.heading || fileName.replace('.md', '')
    const sectionContent = section.body.trim()

    if (sectionContent.length < MIN_CHUNK_CHARS) continue

    // If section is too large, split on H3
    if (sectionContent.length > MAX_CHUNK_CHARS) {
      const h3Sections = splitOnHeading(sectionContent, 3)

      for (const subSection of h3Sections) {
        const subTitle = subSection.heading
          ? `${sectionTitle} > ${subSection.heading}`
          : sectionTitle
        const subContent = subSection.body.trim()

        if (subContent.length < MIN_CHUNK_CHARS) continue

        // If still too large, split into sized chunks
        if (subContent.length > MAX_CHUNK_CHARS) {
          const parts = splitBySize(subContent, MAX_CHUNK_CHARS)
          for (let i = 0; i < parts.length; i++) {
            chunks.push(buildChunk({
              title: `${subTitle} (Part ${i + 1})`,
              content: parts[i],
              fileName,
              fileNumber,
              chunkIndex: chunkIndex++,
              sectionPath: subTitle,
              category,
            }))
          }
        } else {
          chunks.push(buildChunk({
            title: subTitle,
            content: subContent,
            fileName,
            fileNumber,
            chunkIndex: chunkIndex++,
            sectionPath: subTitle,
            category,
          }))
        }
      }
    } else {
      chunks.push(buildChunk({
        title: sectionTitle,
        content: sectionContent,
        fileName,
        fileNumber,
        chunkIndex: chunkIndex++,
        sectionPath: sectionTitle,
        category,
      }))
    }
  }

  return chunks
}

interface ChunkInput {
  title: string
  content: string
  fileName: string
  fileNumber: number
  chunkIndex: number
  sectionPath: string
  category: KBCategory
}

function buildChunk(input: ChunkInput): KBChunk {
  const metadata = extractMetadata(input.content, input.sectionPath)

  return {
    title: input.title,
    content: input.content,
    source_file: input.fileName,
    file_number: input.fileNumber,
    chunk_index: input.chunkIndex,
    section_path: input.sectionPath,
    category: input.category,
    metadata,
  }
}

/**
 * Split content on a specific heading level (## for 2, ### for 3)
 */
function splitOnHeading(
  content: string,
  level: number
): { heading: string | null; body: string }[] {
  const prefix = '#'.repeat(level) + ' '
  const regex = new RegExp(`^${prefix.replace(/ /g, '\\s+')}(.+)$`, 'gm')
  const sections: { heading: string | null; body: string }[] = []

  let lastIndex = 0
  let lastHeading: string | null = null
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    // Everything before this heading is the previous section's body
    if (match.index > lastIndex || sections.length === 0) {
      const body = content.slice(lastIndex, match.index).trim()
      if (body || sections.length === 0) {
        sections.push({ heading: lastHeading, body })
      }
    }
    lastHeading = match[1].trim()
    lastIndex = match.index + match[0].length
  }

  // Last section
  const remainingBody = content.slice(lastIndex).trim()
  if (remainingBody) {
    sections.push({ heading: lastHeading, body: remainingBody })
  }

  // If no headings found, return entire content as one section
  if (sections.length === 0) {
    sections.push({ heading: null, body: content.trim() })
  }

  return sections.filter(s => s.body.length > 0)
}

/**
 * Split content into roughly equal-sized parts at paragraph boundaries
 */
function splitBySize(content: string, maxSize: number): string[] {
  const paragraphs = content.split(/\n\n+/)
  const parts: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxSize && current.length > 0) {
      parts.push(current.trim())
      current = para
    } else {
      current += (current ? '\n\n' : '') + para
    }
  }

  if (current.trim()) {
    parts.push(current.trim())
  }

  return parts
}

/**
 * Extract metadata from chunk content
 */
function extractMetadata(content: string, sectionPath: string): KBChunkMetadata {
  const lowerContent = content.toLowerCase()
  const lowerPath = sectionPath.toLowerCase()

  // Detect FAQ sections
  const isFaq =
    lowerPath.includes('faq') ||
    lowerPath.includes('frequently asked') ||
    lowerContent.includes('**q:') ||
    lowerContent.includes('**q.**') ||
    (content.match(/\*\*Q\d/g) || []).length >= 2

  // Detect troubleshooting sections
  const isTroubleshooting =
    lowerPath.includes('troubleshoot') ||
    lowerPath.includes('common issues') ||
    lowerPath.includes('error') ||
    lowerContent.includes('**problem:**') ||
    lowerContent.includes('**solution:**') ||
    lowerContent.includes('**fix:**')

  // Extract cross-references (file references like 01-platform-overview.md)
  const crossRefs = Array.from(
    new Set(
      (content.match(/\d{2}-[\w-]+\.md/g) || [])
    )
  )

  // Extract plan requirements
  const planRequirements: string[] = []
  if (lowerContent.includes('business plan') || lowerContent.includes('business only')) {
    planRequirements.push('Business')
  }
  if (lowerContent.includes('basic plan') || lowerContent.includes('basic and business')) {
    planRequirements.push('Basic')
  }

  // Heading level from section path
  const headingLevel = (sectionPath.match(/>/g) || []).length + 2

  return {
    plan_requirements: planRequirements.length > 0 ? planRequirements : undefined,
    is_faq: isFaq,
    is_troubleshooting: isTroubleshooting,
    cross_references: crossRefs,
    heading_level: headingLevel,
    word_count: content.split(/\s+/).length,
  }
}

/**
 * Extract file number from filename (e.g., "02-plans-and-pricing.md" -> 2)
 */
function extractFileNumber(fileName: string): number {
  const match = fileName.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}
