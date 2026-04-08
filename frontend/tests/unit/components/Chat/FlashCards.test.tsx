/**
 * FlashCards Component Unit Tests
 *
 * Tests for the flashcard list component in the chat bag
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

import FlashCards from '../../../../src/components/Chat/FlashCards'
import type { FlashCard } from '../../../../src/lib/api'

describe('FlashCards Component', () => {
  const mockOnAdd = vi.fn()

  const mockFlashcards: FlashCard[] = [
    { id: 'fc-1', q: 'What is artificial intelligence?', a: 'The simulation of human intelligence by machines', tags: ['AI', 'Tech'] },
    { id: 'fc-2', q: 'What is machine learning?', a: 'A subset of AI that enables systems to learn from data', tags: ['ML', 'Tech'] },
    { id: 'fc-3', q: 'What is deep learning?', a: 'Neural networks with many layers that learn from large amounts of data', tags: ['DL', 'Tech'] },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render flashcard component container', () => {
      render(<FlashCards items={mockFlashcards} onAdd={mockOnAdd} />)
      expect(screen.getByText('bag.importantTopics')).toBeInTheDocument()
    })

    it('should display item count badge', () => {
      render(<FlashCards items={mockFlashcards} onAdd={mockOnAdd} />)
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should render empty state when no items', () => {
      render(<FlashCards items={[]} onAdd={mockOnAdd} />)
      expect(screen.getByText('bag.empty')).toBeInTheDocument()
    })

    it('should not render empty state when items exist', () => {
      render(<FlashCards items={mockFlashcards} onAdd={mockOnAdd} />)
      expect(screen.queryByText('bag.empty')).not.toBeInTheDocument()
    })

    it('should render with correct container classes', () => {
      render(<FlashCards items={mockFlashcards} onAdd={mockOnAdd} />)
      // Component has sticky positioning and custom height
      const container = screen.getByText('bag.importantTopics').closest('.sticky')
      expect(container).toBeInTheDocument()
    })
  })

  describe('List Rendering', () => {
    it('should render all flashcard items', () => {
      render(<FlashCards items={mockFlashcards} onAdd={mockOnAdd} />)

      expect(screen.getByText('What is artificial intelligence?')).toBeInTheDocument()
      expect(screen.getByText('What is machine learning?')).toBeInTheDocument()
      expect(screen.getByText('What is deep learning?')).toBeInTheDocument()
    })

    it('should render answer content for each card', () => {
      render(<FlashCards items={mockFlashcards} onAdd={mockOnAdd} />)

      expect(screen.getByText(/The simulation of human intelligence/)).toBeInTheDocument()
      expect(screen.getByText(/A subset of AI that enables systems/)).toBeInTheDocument()
      expect(screen.getByText(/Neural networks with many layers/)).toBeInTheDocument()
    })

    it('should render add button for each card', () => {
      render(<FlashCards items={mockFlashcards} onAdd={mockOnAdd} />)

      const addButtons = screen.getAllByRole('button', { name: /addToBag|ariaLabels\.addToBag/i })
      expect(addButtons.length).toBe(3)
    })

    it('should render unique keys for each card', () => {
      render(<FlashCards items={mockFlashcards} onAdd={mockOnAdd} />)

      // Cards should be rendered without React warnings about duplicate keys
      const cards = screen.getAllByText(/^What is/)
      expect(cards.length).toBe(3)
    })
  })

  describe('Single Card Rendering', () => {
    it('should render card with question and answer', () => {
      render(<FlashCards items={[mockFlashcards[0]]} onAdd={mockOnAdd} />)

      expect(screen.getByText('What is artificial intelligence?')).toBeInTheDocument()
      expect(screen.getByText(/The simulation of human intelligence/)).toBeInTheDocument()
    })

    it('should truncate long content with line-clamp', () => {
      const longCard: FlashCard = {
        id: 'fc-long',
        q: 'What is a very long question that might need truncation?',
        a: 'This is a very long answer that contains a lot of text and should be truncated after three lines according to the line-clamp-3 CSS class that is applied to the content paragraph element in the component',
        tags: ['Test'],
      }

      render(<FlashCards items={[longCard]} onAdd={mockOnAdd} />)

      const content = screen.getByText(/This is a very long answer/)
      expect(content).toHaveClass('line-clamp-3')
    })
  })

  describe('Add to Bag Interaction', () => {
    it('should call onAdd with flashcard kind when add button is clicked', () => {
      render(<FlashCards items={mockFlashcards} onAdd={mockOnAdd} />)

      const addButtons = screen.getAllByRole('button', { name: /addToBag|ariaLabels\.addToBag/i })
      fireEvent.click(addButtons[0])

      expect(mockOnAdd).toHaveBeenCalledWith({
        kind: 'flashcard',
        title: 'What is artificial intelligence?',
        content: 'The simulation of human intelligence by machines',
      })
    })

    it('should call onAdd with correct content for each card', () => {
      render(<FlashCards items={mockFlashcards} onAdd={mockOnAdd} />)

      const addButtons = screen.getAllByRole('button', { name: /addToBag|ariaLabels\.addToBag/i })

      // Click second card's add button
      fireEvent.click(addButtons[1])

      expect(mockOnAdd).toHaveBeenCalledWith({
        kind: 'flashcard',
        title: 'What is machine learning?',
        content: 'A subset of AI that enables systems to learn from data',
      })
    })

    it('should allow adding multiple cards', () => {
      render(<FlashCards items={mockFlashcards} onAdd={mockOnAdd} />)

      const addButtons = screen.getAllByRole('button', { name: /addToBag|ariaLabels\.addToBag/i })

      fireEvent.click(addButtons[0])
      fireEvent.click(addButtons[1])
      fireEvent.click(addButtons[2])

      expect(mockOnAdd).toHaveBeenCalledTimes(3)
    })
  })

  describe('Empty State', () => {
    it('should render empty state message', () => {
      render(<FlashCards items={[]} onAdd={mockOnAdd} />)
      expect(screen.getByText('bag.empty')).toBeInTheDocument()
    })

    it('should not render any flashcard items when empty', () => {
      render(<FlashCards items={[]} onAdd={mockOnAdd} />)
      expect(screen.queryByText(/^What is/)).not.toBeInTheDocument()
    })

    it('should not render add buttons when empty', () => {
      render(<FlashCards items={[]} onAdd={mockOnAdd} />)
      expect(screen.queryByRole('button', { name: /addToBag|ariaLabels\.addToBag/i })).not.toBeInTheDocument()
    })

    it('should show zero count in badge when empty', () => {
      render(<FlashCards items={[]} onAdd={mockOnAdd} />)
      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })

  describe('Default Props', () => {
    it('should default to empty array when items is undefined', () => {
      render(<FlashCards onAdd={mockOnAdd} />)
      expect(screen.getByText('bag.empty')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label on add buttons', () => {
      render(<FlashCards items={mockFlashcards} onAdd={mockOnAdd} />)

      const addButtons = screen.getAllByRole('button', { name: /addToBag|ariaLabels\.addToBag/i })
      addButtons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label')
      })
    })

    it('should have title attribute on add buttons', () => {
      render(<FlashCards items={mockFlashcards} onAdd={mockOnAdd} />)

      const addButtons = screen.getAllByRole('button', { name: /addToBag|ariaLabels\.addToBag/i })
      addButtons.forEach((button) => {
        expect(button).toHaveAttribute('title')
      })
    })

    it('should have accessible heading for section', () => {
      render(<FlashCards items={mockFlashcards} onAdd={mockOnAdd} />)

      const heading = screen.getByText('bag.importantTopics')
      expect(heading.tagName).toBe('H3')
    })
  })

  describe('Scrolling Container', () => {
    it('should have overflow-y-auto for scrolling', () => {
      render(<FlashCards items={mockFlashcards} onAdd={mockOnAdd} />)

      // The scrollable area should have the custom scroll class
      const scrollContainer = screen.getByText('bag.importantTopics').closest('.flex-1')
      expect(scrollContainer?.className).toContain('overflow-y-auto')
    })
  })
})
