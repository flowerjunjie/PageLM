export type Msg = { role: 'user' | 'assistant' | 'system'; content: string }

// LLM Response types
export interface AskCard {
  front: string
  back: string
}

export interface LearningMaterialRef {
  id: string
  notes?: { id: string; title: string; summary: string }
  quiz?: { id: string; questionCount: number }
}

export interface LLMResponse {
  topic: string
  answer: string
  flashcards: AskCard[]
  materials?: LearningMaterialRef
}

export interface LLM {
  invoke(m: Msg[]): Promise<LLMResponse>
  call(m: Msg[]): Promise<LLMResponse>
}

export type EmbeddingsLike = {
  embedDocuments(texts: string[]): Promise<number[][]>
  embedQuery(text: string): Promise<number[]>
}

export type MkLLM = (cfg: any) => LLM
export type MkEmb = (cfg: any) => EmbeddingsLike