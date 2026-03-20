/**
 * LLM (Language Model) Mock for Backend Tests
 * Provides mock implementations for AI model interactions
 */

import { vi } from 'vitest'

/**
 * Mock response generator for LLM calls
 */
export function createMockLLMResponse(content: string): any {
  return {
    content,
    generations: [{ text: content }],
  }
}

/**
 * Mock JSON response generator
 */
export function createMockJSONResponse<T>(data: T): string {
  return JSON.stringify(data)
}

/**
 * Mock streaming response generator
 */
export async function* createMockStreamResponse(chunks: string[]): AsyncGenerator<string> {
  for (const chunk of chunks) {
    yield chunk
  }
}

/**
 * Mock LLM model implementation
 */
export const mockLLM = {
  call: vi.fn(async (messages: any[]): Promise<any> => {
    // Default mock response
    return createMockLLMResponse('This is a mock AI response')
  }),

  invoke: vi.fn(async (input: any): Promise<any> => {
    return { content: 'Mock invoke response' }
  }),

  stream: vi.fn(async function* (input: any): AsyncGenerator<any> {
    yield { content: 'Mock ' }
    yield { content: 'streaming ' }
    yield { content: 'response' }
  }),
}

/**
 * Mock embedding model
 */
export const mockEmbeddings = {
  embedQuery: vi.fn(async (text: string): Promise<number[]> => {
    // Return a mock 1536-dimensional embedding vector
    return new Array(1536).fill(0).map(() => Math.random() * 2 - 1)
  }),

  embedDocuments: vi.fn(async (documents: string[]): Promise<number[][]> => {
    return documents.map(() =>
      new Array(1536).fill(0).map(() => Math.random() * 2 - 1)
    )
  }),
}

/**
 * Mock model factory
 */
export const mockMakeModels = vi.fn(() => ({
  llm: mockLLM,
  embeddings: mockEmbeddings,
}))

/**
 * Mock ask response factory
 */
export function createMockAskResponse(overrides: Partial<any> = {}): any {
  return {
    topic: 'Test Topic',
    answer: 'This is a test answer from the AI.',
    flashcards: [
      { q: 'Test question 1?', a: 'Test answer 1', tags: ['test'] },
      { q: 'Test question 2?', a: 'Test answer 2', tags: ['test'] },
    ],
    ...overrides,
  }
}

/**
 * Mock learning materials response
 */
export function createMockLearningMaterials(overrides: Partial<any> = {}): any {
  return {
    flashcards: [
      {
        id: `fc-${Date.now()}-1`,
        question: 'What is this test about?',
        answer: 'This is a test answer',
        tags: ['test', 'mock'],
      },
    ],
    notes: {
      id: `note-${Date.now()}`,
      title: 'Test Notes',
      summary: 'Summary of test notes',
      content: 'Detailed content of test notes',
      keyPoints: ['Key point 1', 'Key point 2'],
      examples: ['Example 1'],
    },
    quiz: {
      id: `quiz-${Date.now()}`,
      questions: [
        {
          id: `q-${Date.now()}`,
          question: 'What is 2+2?',
          type: 'choice',
          options: ['3', '4', '5', '6'],
          correct: 1,
          explanation: '2+2 equals 4',
        },
      ],
    },
    ...overrides,
  }
}

/**
 * Mock quiz generation response
 */
export function createMockQuizResponse(overrides: Partial<any> = {}): any {
  return {
    questions: [
      {
        id: 1,
        question: 'What is the capital of France?',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
        correct: 2,
        hint: 'It starts with P',
        explanation: 'Paris is the capital of France',
      },
      {
        id: 2,
        question: 'What is 2+2?',
        options: ['3', '4', '5', '6'],
        correct: 1,
        hint: 'Think about basic addition',
        explanation: '2+2 equals 4',
      },
    ],
    ...overrides,
  }
}

/**
 * Mock podcast script response
 */
export function createMockPodcastScript(overrides: Partial<any> = {}): any {
  return {
    title: 'Test Podcast Episode',
    segments: [
      {
        speaker: 'Host A',
        text: 'Welcome to our test podcast!',
      },
      {
        speaker: 'Host B',
        text: 'Today we are discussing test topics.',
      },
    ],
    duration: 300,
    ...overrides,
  }
}

/**
 * Mock debate response
 */
export function createMockDebateResponse(overrides: Partial<any> = {}): any {
  return {
    topic: 'Test Debate Topic',
    stance: 'pro',
    argument: 'This is a test argument for the debate.',
    rebuttal: 'This is a test rebuttal.',
    ...overrides,
  }
}

/**
 * Mock smart notes response
 */
export function createMockSmartNotes(overrides: Partial<any> = {}): any {
  return {
    title: 'Test Notes',
    summary: 'Summary of the notes',
    keyPoints: ['Point 1', 'Point 2', 'Point 3'],
    sections: [
      { title: 'Introduction', content: 'Intro content' },
      { title: 'Main Points', content: 'Main content' },
    ],
    ...overrides,
  }
}

/**
 * Mock error response
 */
export function createMockLLMError(message: string = 'LLM Error'): Error {
  return new Error(message)
}

/**
 * Helper to simulate LLM timeout
 */
export function createTimeoutLLM(delayMs: number = 60000): any {
  return {
    call: vi.fn(async () => {
      await new Promise((_, reject) =>
        setTimeout(() => reject(new Error('LLM timeout')), delayMs)
      )
    }),
  }
}

/**
 * Helper to simulate LLM rate limit error
 */
export function createRateLimitLLM(): any {
  return {
    call: vi.fn(async () => {
      throw new Error('Rate limit exceeded: quota exhausted')
    }),
  }
}

/**
 * Helper to simulate LLM authentication error
 */
export function createAuthErrorLLM(): any {
  return {
    call: vi.fn(async () => {
      throw new Error('Authentication failed: 401 Unauthorized')
    }),
  }
}

export default mockLLM
