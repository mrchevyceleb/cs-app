import OpenAI from 'openai'

// Server-side OpenAI client - lazy initialization for build compatibility
let openaiClient: OpenAI | undefined

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

// Export a proxy that lazily initializes the client
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const client = getOpenAIClient()
    return client[prop as keyof OpenAI]
  },
})

// Embedding model for knowledge base
export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536

// Chat model for customer interactions
export const CHAT_MODEL = 'gpt-4-turbo-preview'
