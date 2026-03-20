/**
 * Database Mock for Backend Tests
 * Provides mock implementations for Keyv/SQLite database operations
 */

import { vi } from 'vitest'

// In-memory store for mock database
const mockStore = new Map<string, any>()

/**
 * Reset the mock database to empty state
 */
export function resetMockDatabase(): void {
  mockStore.clear()
}

/**
 * Get the mock database store for inspection
 */
export function getMockStore(): Map<string, any> {
  return mockStore
}

/**
 * Mock database implementation
 */
export const mockDb = {
  get: vi.fn(async (key: string): Promise<any> => {
    return mockStore.get(key) ?? undefined
  }),

  set: vi.fn(async (key: string, value: any): Promise<void> => {
    mockStore.set(key, value)
  }),

  delete: vi.fn(async (key: string): Promise<void> => {
    mockStore.delete(key)
  }),

  clear: vi.fn(async (): Promise<void> => {
    mockStore.clear()
  }),

  has: vi.fn(async (key: string): Promise<boolean> => {
    return mockStore.has(key)
  }),

  // Utility for tests
  getAllKeys: vi.fn(async (): Promise<string[]> => {
    return Array.from(mockStore.keys())
  }),

  // Get all values with a prefix
  getByPrefix: vi.fn(async (prefix: string): Promise<[string, any][]> => {
    const results: [string, any][] = []
    for (const [key, value] of mockStore.entries()) {
      if (key.startsWith(prefix)) {
        results.push([key, value])
      }
    }
    return results
  }),
}

/**
 * Factory for creating mock database entries
 */
export function createMockFlashcard(overrides: Partial<any> = {}): any {
  return {
    id: `flashcard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    question: 'What is the capital of France?',
    answer: 'Paris',
    tags: ['geography', 'europe'],
    createdAt: Date.now(),
    ...overrides,
  }
}

/**
 * Factory for creating mock review schedules
 */
export function createMockReviewSchedule(overrides: Partial<any> = {}): any {
  return {
    flashcardId: `flashcard-${Date.now()}`,
    userId: 'default',
    nextReviewAt: Date.now() + 20 * 60 * 1000, // 20 minutes
    interval: 0,
    repetition: 0,
    easiness: 2.5,
    reviewHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

/**
 * Factory for creating mock chat entries
 */
export function createMockChat(overrides: Partial<any> = {}): any {
  const id = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  return {
    id,
    title: 'Test Chat',
    createdAt: Date.now(),
    messages: [],
    ...overrides,
  }
}

/**
 * Factory for creating mock message entries
 */
export function createMockMessage(overrides: Partial<any> = {}): any {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role: 'user',
    content: 'Test message content',
    at: Date.now(),
    ...overrides,
  }
}

/**
 * Factory for creating mock learning materials
 */
export function createMockMaterials(overrides: Partial<any> = {}): any {
  const id = `materials-${Date.now()}`
  return {
    id,
    chatId: `chat-${Date.now()}`,
    flashcards: [
      {
        id: `fc-${Date.now()}-1`,
        question: 'Question 1?',
        answer: 'Answer 1',
        tags: ['test'],
        createdAt: Date.now(),
      },
    ],
    notes: {
      id: `note-${Date.now()}`,
      title: 'Test Notes',
      summary: 'Test summary',
      content: 'Test content',
      keyPoints: ['Point 1', 'Point 2'],
      examples: ['Example 1'],
      createdAt: Date.now(),
    },
    quiz: {
      id: `quiz-${Date.now()}`,
      questions: [
        {
          id: `q-${Date.now()}`,
          question: 'Test question?',
          type: 'choice',
          options: ['A', 'B', 'C', 'D'],
          correct: 0,
          explanation: 'Test explanation',
        },
      ],
      createdAt: Date.now(),
    },
    createdAt: Date.now(),
    ...overrides,
  }
}

/**
 * Factory for creating mock planner tasks
 */
export function createMockTask(overrides: Partial<any> = {}): any {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Test Task',
    description: 'Test description',
    subject: 'math',
    dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    priority: 'medium',
    status: 'pending',
    estimatedMinutes: 30,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

/**
 * Factory for creating mock analytics entries
 */
export function createMockAnalytics(overrides: Partial<any> = {}): any {
  return {
    userId: 'default',
    date: new Date().toISOString().split('T')[0],
    sessions: [],
    totalMessages: 0,
    totalStudyTime: 0,
    subjects: {},
    ...overrides,
  }
}

/**
 * Seed the mock database with test data
 */
export function seedMockDatabase(data: { [key: string]: any }): void {
  Object.entries(data).forEach(([key, value]) => {
    mockStore.set(key, value)
  })
}

/**
 * Setup function for database tests
 */
export function setupMockDatabase(): void {
  beforeEach(() => {
    resetMockDatabase()
  })

  afterEach(() => {
    resetMockDatabase()
  })
}

export default mockDb
