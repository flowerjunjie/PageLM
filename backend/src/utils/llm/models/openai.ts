import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { wrapChat } from './util'
import type { MkLLM, MkEmb, EmbeddingsLike } from './types'

export const makeLLM: MkLLM = (cfg: any) => {
  const apiKey = cfg.openai || process.env.OPENAI_API_KEY
  const baseURL = cfg.openai_base || process.env.OPENAI_BASE_URL
  const model = cfg.openai_model || 'gpt-4o-mini'

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
