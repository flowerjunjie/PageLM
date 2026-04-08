/**
 * GeneratedMaterials Component Unit Tests
 *
 * Tests for the generated learning materials display component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params && 'count' in params) {
        return `${params.count} ${key.split('.')[1]}`
      }
      return key
    },
  }),
}))

import GeneratedMaterials from '../../../../src/components/Chat/GeneratedMaterials'
import type { GeneratedMaterialRef } from '../../../../src/components/Chat/GeneratedMaterials'

describe('GeneratedMaterials Component', () => {
  const mockMaterials: GeneratedMaterialRef = {
    flashcards: [
      { id: 'fc-1', question: 'What is AI?', answer: 'Artificial Intelligence', tags: ['tech'] },
      { id: 'fc-2', question: 'What is ML?', answer: 'Machine Learning', tags: ['tech'] },
      { id: 'fc-3', question: 'What is DL?', answer: 'Deep Learning', tags: ['tech'] },
    ],
    notes: { id: 'note-1', title: 'AI Basics', summary: 'Introduction to AI concepts' },
    quiz: { id: 'quiz-1', questionCount: 5 },
  }

  const mockOnViewFlashcards = vi.fn()
  const mockOnReviewFlashcards = vi.fn()
  const mockOnViewNotes = vi.fn()
  const mockOnExportNotes = vi.fn()
  const mockOnTakeQuiz = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render when all materials are present', () => {
      render(
        <GeneratedMaterials
          materials={mockMaterials}
          onViewFlashcards={mockOnViewFlashcards}
          onReviewFlashcards={mockOnReviewFlashcards}
          onViewNotes={mockOnViewNotes}
          onExportNotes={mockOnExportNotes}
          onTakeQuiz={mockOnTakeQuiz}
        />
      )

      expect(screen.getByText(/materials\.generatedForYou/)).toBeInTheDocument()
    })

    it('should render flashcard section when flashcards exist', () => {
      render(<GeneratedMaterials materials={mockMaterials} />)
      expect(screen.getByText(/3 flashcardsCount/)).toBeInTheDocument()
    })

    it('should render notes section when notes exist', () => {
      render(<GeneratedMaterials materials={mockMaterials} />)
      expect(screen.getByText('materials.notesTitle')).toBeInTheDocument()
    })

    it('should render quiz section when quiz exists', () => {
      render(<GeneratedMaterials materials={mockMaterials} />)
      expect(screen.getByText(/5 quizCount/)).toBeInTheDocument()
    })

    it('should return null when no materials', () => {
      const noMaterials: GeneratedMaterialRef = {
        flashcards: [],
        notes: { id: '', title: '', summary: '' },
        quiz: { id: '', questionCount: 0 },
      }

      const { container } = render(<GeneratedMaterials materials={noMaterials} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Flashcard Section', () => {
    it('should show flashcard count', () => {
      render(<GeneratedMaterials materials={mockMaterials} />)
      expect(screen.getByText(/3/)).toBeInTheDocument()
    })

    it('should expand flashcards on click', () => {
      render(<GeneratedMaterials materials={mockMaterials} />)

      const expandButton = screen.getAllByRole('button')[0]
      fireEvent.click(expandButton)

      // Should show preview cards when expanded
      expect(screen.getByText('What is AI?')).toBeInTheDocument()
    })

    it('should call onViewFlashcards when view button clicked', () => {
      const flashcardsOnly: GeneratedMaterialRef = {
        flashcards: mockMaterials.flashcards,
        notes: { id: '', title: '', summary: '' },
        quiz: { id: '', questionCount: 0 },
      }
      render(
        <GeneratedMaterials
          materials={flashcardsOnly}
          onViewFlashcards={mockOnViewFlashcards}
        />
      )

      fireEvent.click(screen.getByText('materials.view'))
      expect(mockOnViewFlashcards).toHaveBeenCalled()
    })

    it('should call onReviewFlashcards when review button clicked', () => {
      render(
        <GeneratedMaterials
          materials={mockMaterials}
          onReviewFlashcards={mockOnReviewFlashcards}
        />
      )

      fireEvent.click(screen.getAllByText('materials.review')[0])
      expect(mockOnReviewFlashcards).toHaveBeenCalled()
    })
  })

  describe('Notes Section', () => {
    it('should show notes title', () => {
      render(<GeneratedMaterials materials={mockMaterials} />)
      expect(screen.getByText('AI Basics')).toBeInTheDocument()
    })

    it('should expand notes on click', () => {
      const notesOnly: GeneratedMaterialRef = {
        flashcards: [],
        notes: mockMaterials.notes,
        quiz: { id: '', questionCount: 0 },
      }
      render(<GeneratedMaterials materials={notesOnly} />)

      const expandButton = screen.getAllByRole('button')[0]
      fireEvent.click(expandButton)

      expect(screen.getByText('Introduction to AI concepts')).toBeInTheDocument()
    })

    it('should call onViewNotes when view button clicked', () => {
      const notesOnly: GeneratedMaterialRef = {
        flashcards: [],
        notes: mockMaterials.notes,
        quiz: { id: '', questionCount: 0 },
      }
      render(
        <GeneratedMaterials
          materials={notesOnly}
          onViewNotes={mockOnViewNotes}
        />
      )

      fireEvent.click(screen.getByText('materials.view'))
      expect(mockOnViewNotes).toHaveBeenCalled()
    })

    it('should call onExportNotes when export button clicked', () => {
      render(
        <GeneratedMaterials
          materials={mockMaterials}
          onExportNotes={mockOnExportNotes}
        />
      )

      fireEvent.click(screen.getByText('materials.export'))
      expect(mockOnExportNotes).toHaveBeenCalled()
    })
  })

  describe('Quiz Section', () => {
    it('should show quiz question count', () => {
      render(<GeneratedMaterials materials={mockMaterials} />)
      expect(screen.getByText(/5/)).toBeInTheDocument()
    })

    it('should call onTakeQuiz when quiz button clicked', () => {
      render(
        <GeneratedMaterials
          materials={mockMaterials}
          onTakeQuiz={mockOnTakeQuiz}
        />
      )

      fireEvent.click(screen.getByText('materials.testNow'))
      expect(mockOnTakeQuiz).toHaveBeenCalled()
    })
  })

  describe('Expand/Collapse', () => {
    it('should toggle expanded state on click', () => {
      render(<GeneratedMaterials materials={mockMaterials} />)

      const expandButtons = screen.getAllByRole('button')

      // First click - expand
      fireEvent.click(expandButtons[0])
      expect(screen.getByText('What is AI?')).toBeInTheDocument()

      // Second click - collapse
      fireEvent.click(expandButtons[0])
      // Content should be hidden or show button
      expect(screen.queryByText('What is AI?')).not.toBeInTheDocument()
    })
  })

  describe('Multiple Flashcards Display', () => {
    it('should show +N more when more than 3 flashcards', () => {
      render(<GeneratedMaterials materials={mockMaterials} />)

      const expandButtons = screen.getAllByRole('button')
      fireEvent.click(expandButtons[0])

      // Should show +0 more since we have exactly 3
      expect(screen.queryByText(/\+0/)).not.toBeInTheDocument()
    })

    it('should show +N more when more than 3 flashcards', () => {
      const manyCards: GeneratedMaterialRef = {
        ...mockMaterials,
        flashcards: [
          ...mockMaterials.flashcards,
          { id: 'fc-4', question: 'Q4', answer: 'A4', tags: [] },
          { id: 'fc-5', question: 'Q5', answer: 'A5', tags: [] },
        ],
      }

      render(<GeneratedMaterials materials={manyCards} />)

      const expandButtons = screen.getAllByRole('button')
      fireEvent.click(expandButtons[0])

      expect(screen.getByText('+2 materials.more')).toBeInTheDocument()
    })
  })
})
