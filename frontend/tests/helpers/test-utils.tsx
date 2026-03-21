/**
 * Test Utilities
 * Helper functions for writing tests
 */

import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'

interface AllProvidersProps {
  children: React.ReactNode
}

// Wrapper with all required providers
function AllProviders({ children }: AllProvidersProps) {
  return (
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </BrowserRouter>
  )
}

// Custom render function with providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

// Mock data generators
export const mockFlashcard = (overrides = {}) => ({
  id: 'fc-1',
  front: 'What is React?',
  back: 'A JavaScript library for building user interfaces',
  deckId: 'deck-1',
  ...overrides,
})

export const mockDeck = (overrides = {}) => ({
  id: 'deck-1',
  name: 'JavaScript Fundamentals',
  description: 'Core JavaScript concepts',
  cardCount: 10,
  ...overrides,
})

export const mockLearningMaterial = (overrides = {}) => ({
  id: 'lm-1',
  title: 'Introduction to Algorithms',
  type: 'article',
  content: 'Sample content...',
  difficulty: 'intermediate',
  estimatedTime: 15,
  ...overrides,
})

export const mockReviewSchedule = (overrides = {}) => ({
  flashcardId: 'fc-1',
  userId: 'user-1',
  nextReviewAt: Date.now() + 1000 * 60 * 20, // 20 minutes
  interval: 0,
  repetition: 0,
  easiness: 2.5,
  reviewHistory: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

// Wait for async operations
export const waitFor = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

// Mock API response wrapper
export const mockApiResponse = <T>(data: T, delay = 0) => {
  return new Promise<{ data: T }>((resolve) => {
    setTimeout(() => resolve({ data }), delay)
  })
}

// Mock API error
export const mockApiError = (message: string, status = 500) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const error: any = new Error(message)
      error.status = status
      reject(error)
    }, 0)
  })
}

// SM-2 Algorithm test data
export const sm2TestCases = [
  {
    description: 'perfect response (5) increases interval',
    input: { interval: 1, repetition: 0, easiness: 2.5, quality: 5 },
    expected: { newInterval: 1, newRepetition: 1, newEasiness: 2.6 },
  },
  {
    description: 'failed recall (0) resets repetition',
    input: { interval: 10, repetition: 5, easiness: 2.5, quality: 0 },
    expected: { newInterval: 1, newReputation: 0, newEasiness: 1.9 },
  },
  {
    description: 'difficult correct (3) maintains easiness',
    input: { interval: 6, repetition: 1, easiness: 2.5, quality: 3 },
    expected: { newInterval: 15, newReputation: 2, newEasiness: 2.5 },
  },
]

// Re-export everything from Testing Library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
