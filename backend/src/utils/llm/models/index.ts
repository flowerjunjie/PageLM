import * as ollama from './ollama'
import * as gemini from './gemini'
import * as openai from './openai'
import * as grok from './grok'
import * as claude from './claude'
import * as openrouter from './openrouter'
import * as bigmodel from './bigmodel'
import { OpenAIEmbeddings } from '@langchain/openai'
import { config } from '../../../config/env'
import type { EmbeddingsLike, LLM } from './types'

// Re-export model switching functions
export { getNextModel, resetModelIndex, shouldSwitchModel, getCurrentModel } from './openai'

type Pair = { llm: LLM; embeddings: EmbeddingsLike }

function pick(p: string) {
  switch (p) {
    case 'ollama': return ollama
    case 'gemini': return gemini
    case 'openai': return openai
    case 'grok': return grok
    case 'claude': return claude
    case 'openrouter': return openrouter
    case 'bigmodel': return bigmodel
    default: return bigmodel
  }
}

export function makeModels(fallbackModel?: string): Pair {
  let mod: any
  let modelConfig: any = config

  // If a fallback model is provided (from getNextModel retry logic),
  // route to the appropriate module based on model prefix
  if (fallbackModel) {
    if (fallbackModel.startsWith('gemini')) {
      mod = gemini
      modelConfig = { ...config, gemini_model: fallbackModel }
    } else {
      mod = openai
      modelConfig = { ...config, openai_model: fallbackModel }
    }
  } else {
    mod = pick(config.provider)
  }

  const llm = mod.makeLLM(modelConfig)

  // Use OpenAI-compatible embeddings (阿里云通义)
  let embeddings: EmbeddingsLike
  try {
    embeddings = new OpenAIEmbeddings({
      model: config.openai_embed_model || 'text-embedding-v2',
      apiKey: config.openai_embed,
      configuration: {
        baseURL: config.openai_embed_base
      }
    })
    console.log('[models] Using OpenAI-compatible embeddings:', config.openai_embed_model)
  } catch (err: any) {
    console.error('[models] Failed to initialize embeddings:', err.message)
    // Fallback to dummy embeddings
    embeddings = {
      embedDocuments: async (texts: string[]) => {
        return texts.map(() => new Array(1536).fill(0))
      },
      embedQuery: async (_text: string) => {
        return new Array(1536).fill(0)
      }
    } as any
  }

  return { llm, embeddings }
}