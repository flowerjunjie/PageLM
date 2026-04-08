import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { wrapChat } from './util'
import type { MkLLM, MkEmb, EmbeddingsLike } from './types'

// Supported models in order of preference (fallback order)
const SUPPORTED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]

let currentModelIndex = 0

export function getCurrentModel(): string {
  return SUPPORTED_MODELS[currentModelIndex]
}

export function getNextModel(): string {
  currentModelIndex = (currentModelIndex + 1) % SUPPORTED_MODELS.length
  const model = SUPPORTED_MODELS[currentModelIndex]
  console.log(`[openai] Switched to model: ${model}`)
  return model
}

export function resetModelIndex(): void {
  currentModelIndex = 0
}

export function shouldSwitchModel(error: any): boolean {
  if (!error) return false
  const message = error.message || error.toString() || ''
  // Check for rate limit, quota exceeded, or 429 errors
  return message.includes('429') ||
         message.includes('rate limit') ||
         message.includes('quota') ||
         message.includes('额度') ||
         message.includes('TOO_MANY_REQUESTS')
}

export const makeLLM: MkLLM = (cfg: any) => {
  const apiKey = cfg.openai || process.env.OPENAI_API_KEY
  const baseURL = cfg.openai_base || process.env.OPENAI_BASE_URL
  const model = cfg.openai_model || getCurrentModel()

  console.log('[openai] Config:', {
    model,
    baseURL,
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.slice(0, 10) + '...' : 'MISSING'
  })

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const m = new ChatOpenAI({
    model,
    apiKey,
    temperature: cfg.temp ?? 0.7,
    maxTokens: cfg.max_tokens,
    configuration: {
      baseURL,
    }
  })
  return wrapChat(m)
}

export const makeEmbeddings: MkEmb = (cfg: any): EmbeddingsLike => {
  return new OpenAIEmbeddings({
    model: cfg.openai_embed_model || 'text-embedding-3-large',
    apiKey: cfg.openai || process.env.OPENAI_EMBED_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_EMBED_BASE_URL,
    }
  })
}
