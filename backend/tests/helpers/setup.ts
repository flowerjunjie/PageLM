/**
 * Backend Test Setup
 * Configures test environment for Node.js with Vitest
 */

import { vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'

// Extend global type declarations
declare global {
  var testUtils: {
    delay: (ms: number) => Promise<void>
    randomId: () => string
    mockDate: (date: Date) => void
    restoreDate: () => void
    freezeTime: (timestamp?: number) => void
    advanceTime: (ms: number) => void
  }
}

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug,
}

/**
 * Global test utilities
 */
global.testUtils = {
  /**
   * Create a mock delay
   */
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  /**
   * Generate random test ID
   */
  randomId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  /**
   * Mock date for consistent testing
   */
  mockDate: (date: Date) => {
    vi.useFakeTimers()
    vi.setSystemTime(date)
  },

  /**
   * Restore real date
   */
  restoreDate: () => {
    vi.useRealTimers()
  },

  /**
   * Freeze time at a specific timestamp
   */
  freezeTime: (timestamp: number = Date.now()) => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    vi.setSystemTime(timestamp)
  },

  /**
   * Advance time by milliseconds
   */
  advanceTime: (ms: number) => {
    vi.advanceTimersByTime(ms)
  },
}

/**
 * Suppress console methods in tests unless DEBUG_TESTS is set
 */
if (!process.env.DEBUG_TESTS) {
  console.log = vi.fn()
  console.debug = vi.fn()
  console.info = vi.fn()
}

// Always keep error and warn for debugging test failures
// but make them silent by default in CI
if (process.env.CI && !process.env.DEBUG_TESTS) {
  console.error = vi.fn((...args) => {
    // Only log actual errors, not warnings
    if (args[0] instanceof Error) {
      originalConsole.error(...args)
    }
  })
  console.warn = vi.fn()
}

/**
 * Reset mocks before each test
 */
beforeEach(() => {
  vi.clearAllMocks()
})

/**
 * Cleanup after each test
 */
afterEach(() => {
  vi.useRealTimers()
})

/**
 * Global before all hook
 */
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test'
  process.env.db_mode = 'json'
})

/**
 * Global after all hook
 */
afterAll(() => {
  // Restore console methods
  console.log = originalConsole.log
  console.error = originalConsole.error
  console.warn = originalConsole.warn
  console.debug = originalConsole.debug
})

/**
 * Mock environment variables helper
 */
export function mockEnv(variables: Record<string, string | undefined>): () => void {
  const original: Record<string, string | undefined> = {}

  for (const [key, value] of Object.entries(variables)) {
    original[key] = process.env[key]
    if (value === undefined || value === null) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  // Return cleanup function
  return () => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return
    }
    await global.testUtils.delay(interval)
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`)
}

/**
 * Generate test fixtures
 */
export const fixtures = {
  /**
   * Valid user object
   */
  user: {
    id: 'user-test-123',
    name: 'Test User',
    email: 'test@example.com',
    createdAt: Date.now(),
  },

  /**
   * Valid chat object
   */
  chat: {
    id: 'chat-test-123',
    title: 'Test Chat',
    createdAt: Date.now(),
    messages: [],
  },

  /**
   * Valid flashcard object
   */
  flashcard: {
    id: 'fc-test-123',
    question: 'What is 2+2?',
    answer: '4',
    tags: ['math', 'basic'],
    createdAt: Date.now(),
  },

  /**
   * Valid quiz object
   */
  quiz: {
    id: 'quiz-test-123',
    title: 'Test Quiz',
    questions: [
      {
        id: 1,
        question: 'What is the capital of France?',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
        correct: 2,
        hint: 'It starts with P',
        explanation: 'Paris is the capital of France',
      },
    ],
  },

  /**
   * Valid task object
   */
  task: {
    id: 'task-test-123',
    title: 'Test Task',
    description: 'Test description',
    subject: 'math',
    dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    priority: 'medium',
    status: 'pending',
    estimatedMinutes: 30,
  },
}

export default {
  mockEnv,
  waitFor,
  fixtures,
}
