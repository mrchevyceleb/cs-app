import OpenAI from 'openai'

// Server-side OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Embedding model for knowledge base
export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536

// Chat model for customer interactions
export const CHAT_MODEL = 'gpt-4-turbo-preview'
