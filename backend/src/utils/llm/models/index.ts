import * as ollama from './ollama'
import * as gemini from './gemini'
import * as openai from './openai'
import * as grok from './grok'
import * as claude from './claude'
import * as openrouter from './openrouter'
import * as bigmodel from './bigmodel'
import * as deepseek from './deepseek'
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
    case 'deepseek': return deepseek
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

  // Use dummy embeddings for now (RAG will be skipped)
  // TODO: Fix Gemini embeddings model name
  const embeddings: EmbeddingsLike = {
    embedDocuments: async (texts: string[]) => {
      console.log('[models] Using dummy embeddings for', texts.length, 'documents')
      return texts.map(() => new Array(1536).fill(0))
    },
    embedQuery: async (_text: string) => {
      return new Array(1536).fill(0)
    }
  }
  console.log('[models] Using dummy embeddings (RAG disabled)')

  return { llm, embeddings }
}