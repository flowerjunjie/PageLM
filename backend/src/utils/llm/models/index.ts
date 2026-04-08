import * as ollama from './ollama'
import * as gemini from './gemini'
import * as openai from './openai'
import * as grok from './grok'
import * as claude from './claude'
import * as openrouter from './openrouter'
import * as bigmodel from './bigmodel'
import * as deepseek from './deepseek'
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

  // Use simple hash-based embeddings for RAG
  // This provides basic similarity based on word overlap
  const simpleEmbeddings: EmbeddingsLike = {
    embedDocuments: async (texts: string[]) => {
      return texts.map(text => simpleHashEmbedding(text))
    },
    embedQuery: async (text: string) => {
      return simpleHashEmbedding(text)
    }
  }

  console.log('[models] Using simple hash embeddings for RAG')

  return { llm, embeddings: simpleEmbeddings }
}

// Simple hash-based embedding for basic similarity
// Uses word frequency vectors with random projection
function simpleHashEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const dim = 384 // Smaller dimension for efficiency
  const vector = new Array(dim).fill(0)

  // Simple hash-based word embedding
  for (const word of words) {
    const hash = hashString(word)
    for (let i = 0; i < dim; i++) {
      // Use hash to seed pseudo-random values
      vector[i] += Math.sin(hash * (i + 1)) * words.length
    }
  }

  // Normalize
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      vector[i] /= norm
    }
  }

  return vector
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}
