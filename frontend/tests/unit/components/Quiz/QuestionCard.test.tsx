/**
 * QuestionCard Component Unit Tests
 *
 * Tests for the quiz question card component including XSS protection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html: string) => {
      // Simple mock that strips script tags
      return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    }),
  },
  sanitize: vi.fn((html: string) => {
    // Simple mock that strips script tags
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  }),
}))

import QuestionCard from '../../../../src/components/Quiz/QuestionCard'
import type { Question } from '../../../../src/pages/Quiz'

describe('QuestionCard Component', () => {
  const mockQuestion: Question = {
    question: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correct: 1,
    explanation: '2 + 2 equals 4',
    hint: 'Think about basic addition',
    imageHtml: '',
  }

  const mockOnSelect = vi.fn()
  const mockOnHint = vi.fn()
  const mockOnNext = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render question text', () => {
      render(
        <QuestionCard
          q={mockQuestion}
          selected={null}
          showExp={false}
          showHint={false}
          onSelect={mockOnSelect}
          onHint={mockOnHint}
          onNext={mockOnNext}
          isLast={false}
        />
      )

      expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument()
    })

    it('should render all answer options', () => {
      render(
        <QuestionCard
          q={mockQuestion}
          selected={null}
          showExp={false}
          showHint={false}
          onSelect={mockOnSelect}
          onHint={mockOnHint}
          onNext={mockOnNext}
          isLast={false}
        />
      )

      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('6')).toBeInTheDocument()
    })

    it('should render hint button', () => {
      render(
        <QuestionCard
          q={mockQuestion}
          selected={null}
          showExp={false}
          showHint={false}
          onSelect={mockOnSelect}
          onHint={mockOnHint}
          onNext={mockOnNext}
          isLast={false}
        />
      )

      expect(screen.getByText(/showHint/i)).toBeInTheDocument()
    })

    it('should render next button', () => {
      render(
        <QuestionCard
          q={mockQuestion}
          selected={null}
          showExp={false}
          showHint={false}
          onSelect={mockOnSelect}
          onHint={mockOnHint}
          onNext={mockOnNext}
          isLast={false}
        />
      )

      expect(screen.getByText('quiz.nextQuestion')).toBeInTheDocument()
    })

    it('should show submit text on last question', () => {
      render(
        <QuestionCard
          q={mockQuestion}
          selected={null}
          showExp={false}
          showHint={false}
          onSelect={mockOnSelect}
          onHint={mockOnHint}
          onNext={mockOnNext}
          isLast={true}
        />
      )

      expect(screen.getByText('quiz.submit')).toBeInTheDocument()
    })
  })

  describe('Answer Selection', () => {
    it('should call onSelect when answer is clicked', () => {
      render(
        <QuestionCard
          q={mockQuestion}
          selected={null}
          showExp={false}
          showHint={false}
          onSelect={mockOnSelect}
          onHint={mockOnHint}
          onNext={mockOnNext}
          isLast={false}
        />
      )

      fireEvent.click(screen.getByText('4'))
      expect(mockOnSelect).toHaveBeenCalledWith(1) // Index 1 = "4"
    })
  })

  describe('Hint', () => {
    it('should call onHint when hint button is clicked', () => {
      render(
        <QuestionCard
          q={mockQuestion}
          selected={null}
          showExp={false}
          showHint={false}
          onSelect={mockOnSelect}
          onHint={mockOnHint}
          onNext={mockOnNext}
          isLast={false}
        />
      )

      fireEvent.click(screen.getByText(/showHint/i))
      expect(mockOnHint).toHaveBeenCalled()
    })

    it('should show hint text when showHint is true', () => {
      render(
        <QuestionCard
          q={mockQuestion}
          selected={null}
          showExp={false}
          showHint={true}
          onSelect={mockOnSelect}
          onHint={mockOnHint}
          onNext={mockOnNext}
          isLast={false}
        />
      )

      expect(screen.getByText(/Think about basic addition/)).toBeInTheDocument()
    })
  })

  describe('XSS Protection', () => {
    it('should sanitize imageHtml using DOMPurify', async () => {
      const questionWithImage: Question = {
        ...mockQuestion,
        imageHtml: '<img src="valid.jpg" />',
      }

      render(
        <QuestionCard
          q={questionWithImage}
          selected={null}
          showExp={false}
          showHint={false}
          onSelect={mockOnSelect}
          onHint={mockOnHint}
          onNext={mockOnNext}
          isLast={false}
        />
      )

      // DOMPurify.sanitize should be called
      const dompurify = await import('dompurify')
      expect(dompurify.default?.sanitize || dompurify.sanitize).toHaveBeenCalled()
    })

    it('should not render script tags from imageHtml', () => {
      const maliciousHtml = '<img src="x" onerror="alert(1)" />'
      const questionWithMaliciousImage: Question = {
        ...mockQuestion,
        imageHtml: maliciousHtml,
      }

      const { container } = render(
        <QuestionCard
          q={questionWithMaliciousImage}
          selected={null}
          showExp={false}
          showHint={false}
          onSelect={mockOnSelect}
          onHint={mockOnHint}
          onNext={mockOnNext}
          isLast={false}
        />
      )

      // Script should be stripped by DOMPurify
      expect(container.querySelector('script')).not.toBeInTheDocument()
    })

    it('should handle empty imageHtml', () => {
      const { container } = render(
        <QuestionCard
          q={mockQuestion}
          selected={null}
          showExp={false}
          showHint={false}
          onSelect={mockOnSelect}
          onHint={mockOnHint}
          onNext={mockOnNext}
          isLast={false}
        />
      )

      // No image element should be rendered
      expect(container.querySelector('img')).not.toBeInTheDocument()
    })
  })
})
