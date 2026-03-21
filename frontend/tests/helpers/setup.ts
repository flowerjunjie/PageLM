/**
 * Frontend Test Setup
 * Configures test environment for React Testing Library with Vitest
 */

import { expect, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

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
declare global {
  var testUtils: {
    delay: (ms: number) => Promise<void>
    randomId: () => string
    mockDate: (date: Date) => void
    restoreDate: () => void
    advanceTimers: (ms: number) => void
    flushPromises: () => Promise<void>
  }
}

global.testUtils = {
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  randomId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  mockDate: (date: Date) => {
    vi.useFakeTimers()
    vi.setSystemTime(date)
  },

  restoreDate: () => {
    vi.useRealTimers()
  },

  advanceTimers: (ms: number) => {
    vi.advanceTimersByTime(ms)
  },

  flushPromises: () => new Promise((resolve) => setImmediate(resolve)),
}

/**
 * Suppress console methods in tests unless DEBUG_TESTS is set
 */
if (!process.env.DEBUG_TESTS) {
  console.log = vi.fn()
  console.debug = vi.fn()
  console.info = vi.fn()
}

// Keep errors visible for debugging
if (process.env.CI && !process.env.DEBUG_TESTS) {
  console.warn = vi.fn()
}

/**
 * Mock window.matchMedia
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

/**
 * Mock IntersectionObserver
 */
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any

/**
 * Mock ResizeObserver
 */
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any

/**
 * Mock scrollTo
 */
window.scrollTo = vi.fn()

/**
 * Mock localStorage
 */
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

/**
 * Mock sessionStorage
 */
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

/**
 * Cleanup after each test
 */
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
})

/**
 * Global before all hook
 */
beforeAll(() => {
  process.env.NODE_ENV = 'test'
})

/**
 * Global after all hook
 */
afterAll(() => {
  console.log = originalConsole.log
  console.error = originalConsole.error
  console.warn = originalConsole.warn
  console.debug = originalConsole.debug
})

/**
 * Helper to wait for element to be removed
 */
export async function waitForElementToBeRemoved(
  callback: () => HTMLElement | null,
  timeout: number = 4500
): Promise<void> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    const element = callback()
    if (!element || !document.contains(element)) {
      return
    }
    await global.testUtils.delay(50)
  }
  throw new Error('Timeout waiting for element to be removed')
}

/**
 * Helper to simulate user events
 */
export function createUserEvent() {
  return {
    click: async (element: Element) => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    },
    type: async (element: HTMLInputElement, text: string) => {
      element.value = text
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
    },
    clear: async (element: HTMLInputElement) => {
      element.value = ''
      element.dispatchEvent(new Event('input', { bubbles: true }))
    },
    selectOptions: async (element: HTMLSelectElement, values: string | string[]) => {
      const options = Array.isArray(values) ? values : [values]
      Array.from(element.options).forEach((option) => {
        option.selected = options.includes(option.value)
      })
      element.dispatchEvent(new Event('change', { bubbles: true }))
    },
    hover: async (element: Element) => {
      element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    },
    unhover: async (element: Element) => {
      element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    },
  }
}

/**
 * Test fixtures
 */
export const fixtures = {
  user: {
    id: 'user-test-123',
    name: 'Test User',
    email: 'test@example.com',
    avatar: null,
  },

  chat: {
    id: 'chat-test-123',
    title: 'Test Chat',
    createdAt: Date.now(),
    messages: [],
  },

  message: {
    id: 'msg-test-123',
    role: 'user' as const,
    content: 'Test message',
    at: Date.now(),
  },

  flashcard: {
    id: 'fc-test-123',
    question: 'What is 2+2?',
    answer: '4',
    tags: ['math'],
    createdAt: Date.now(),
  },

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

  task: {
    id: 'task-test-123',
    title: 'Test Task',
    description: 'Test description',
    subject: 'math',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'medium',
    status: 'pending',
    estimatedMinutes: 30,
  },
}

export default {
  waitForElementToBeRemoved,
  createUserEvent,
  fixtures,
}
