import { ChatOpenAI } from '@langchain/openai'
import { wrapChat } from './util'
import type { MkLLM } from './types'

export const makeLLM: MkLLM = (cfg: any) => {
  const apiKey = cfg.deepseek || process.env.DEEPSEEK_API_KEY
  const baseURL = cfg.deepseek_base || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
  const model = cfg.deepseek_model || process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  console.log('[deepseek] Config:', {
    model,
    baseURL,
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.slice(0, 10) + '...' : 'MISSING'
  })

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not configured')
  }

  const m = new ChatOpenAI({
    model,
    apiKey,
    temperature: cfg.temp ?? 0.7,
    maxTokens: cfg.max_tokens ?? 8192,
    streaming: false, // Disable streaming for DeepSeek
    configuration: {
      baseURL,
    }
  })
  return wrapChat(m)
}
