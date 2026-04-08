/**
 * ActionRow Component Unit Tests
 *
 * Tests for the chat action button row component
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

import ActionRow from '../../../../src/components/Chat/ActionRow'

describe('ActionRow Component', () => {
  const mockOnSummarize = vi.fn()
  const mockOnLearnMore = vi.fn()
  const mockOnStartQuiz = vi.fn()
  const mockOnCreatePodcast = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render all four action buttons', () => {
      render(
        <ActionRow
          onSummarize={mockOnSummarize}
          onLearnMore={mockOnLearnMore}
          onStartQuiz={mockOnStartQuiz}
          onCreatePodcast={mockOnCreatePodcast}
        />
      )

      expect(screen.getByText('actionRow.summarize')).toBeInTheDocument()
      expect(screen.getByText('actionRow.startQuiz')).toBeInTheDocument()
      expect(screen.getByText('actionRow.createPodcast')).toBeInTheDocument()
      expect(screen.getByText('actionRow.learnMore')).toBeInTheDocument()
    })

    it('should render SVG icons for each button', () => {
      render(
        <ActionRow
          onSummarize={mockOnSummarize}
          onLearnMore={mockOnLearnMore}
          onStartQuiz={mockOnStartQuiz}
          onCreatePodcast={mockOnCreatePodcast}
        />
      )

      // All buttons should have SVG icons (inside button elements)
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button.querySelector('svg')).toBeInTheDocument()
      })
    })

    it('should render with correct layout classes', () => {
      render(
        <ActionRow
          onSummarize={mockOnSummarize}
          onLearnMore={mockOnLearnMore}
          onStartQuiz={mockOnStartQuiz}
          onCreatePodcast={mockOnCreatePodcast}
        />
      )

      const container = screen.getByText('actionRow.summarize').parentElement?.parentElement
      expect(container).toHaveClass('flex', 'flex-wrap', 'justify-center', 'gap-3')
    })
  })

  describe('Button Click Events', () => {
    it('should call onSummarize when summarize button is clicked', () => {
      render(
        <ActionRow
          onSummarize={mockOnSummarize}
          onLearnMore={mockOnLearnMore}
          onStartQuiz={mockOnStartQuiz}
          onCreatePodcast={mockOnCreatePodcast}
        />
      )

      fireEvent.click(screen.getByText('actionRow.summarize'))
      expect(mockOnSummarize).toHaveBeenCalledTimes(1)
    })

    it('should call onStartQuiz when quiz button is clicked', () => {
      render(
        <ActionRow
          onSummarize={mockOnSummarize}
          onLearnMore={mockOnLearnMore}
          onStartQuiz={mockOnStartQuiz}
          onCreatePodcast={mockOnCreatePodcast}
        />
      )

      fireEvent.click(screen.getByText('actionRow.startQuiz'))
      expect(mockOnStartQuiz).toHaveBeenCalledTimes(1)
    })

    it('should call onCreatePodcast when podcast button is clicked', () => {
      render(
        <ActionRow
          onSummarize={mockOnSummarize}
          onLearnMore={mockOnLearnMore}
          onStartQuiz={mockOnStartQuiz}
          onCreatePodcast={mockOnCreatePodcast}
        />
      )

      fireEvent.click(screen.getByText('actionRow.createPodcast'))
      expect(mockOnCreatePodcast).toHaveBeenCalledTimes(1)
    })

    it('should call onLearnMore when learn more button is clicked', () => {
      render(
        <ActionRow
          onSummarize={mockOnSummarize}
          onLearnMore={mockOnLearnMore}
          onStartQuiz={mockOnStartQuiz}
          onCreatePodcast={mockOnCreatePodcast}
        />
      )

      fireEvent.click(screen.getByText('actionRow.learnMore'))
      expect(mockOnLearnMore).toHaveBeenCalledTimes(1)
    })
  })

  describe('Disabled State', () => {
    it('should disable all buttons when disabled prop is true', () => {
      render(
        <ActionRow
          disabled={true}
          onSummarize={mockOnSummarize}
          onLearnMore={mockOnLearnMore}
          onStartQuiz={mockOnStartQuiz}
          onCreatePodcast={mockOnCreatePodcast}
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toBeDisabled()
      })
    })

    it('should not call callbacks when disabled', () => {
      render(
        <ActionRow
          disabled={true}
          onSummarize={mockOnSummarize}
          onLearnMore={mockOnLearnMore}
          onStartQuiz={mockOnStartQuiz}
          onCreatePodcast={mockOnCreatePodcast}
        />
      )

      fireEvent.click(screen.getByText('actionRow.summarize'))
      fireEvent.click(screen.getByText('actionRow.startQuiz'))
      fireEvent.click(screen.getByText('actionRow.createPodcast'))
      fireEvent.click(screen.getByText('actionRow.learnMore'))

      expect(mockOnSummarize).not.toHaveBeenCalled()
      expect(mockOnLearnMore).not.toHaveBeenCalled()
      expect(mockOnStartQuiz).not.toHaveBeenCalled()
      expect(mockOnCreatePodcast).not.toHaveBeenCalled()
    })

    it('should apply disabled opacity styling', () => {
      render(
        <ActionRow
          disabled={true}
          onSummarize={mockOnSummarize}
          onLearnMore={mockOnLearnMore}
          onStartQuiz={mockOnStartQuiz}
          onCreatePodcast={mockOnCreatePodcast}
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveClass('disabled:opacity-60')
      })
    })
  })

  describe('Button Group Behavior', () => {
    it('should call multiple different callbacks in sequence', () => {
      render(
        <ActionRow
          onSummarize={mockOnSummarize}
          onLearnMore={mockOnLearnMore}
          onStartQuiz={mockOnStartQuiz}
          onCreatePodcast={mockOnCreatePodcast}
        />
      )

      fireEvent.click(screen.getByText('actionRow.summarize'))
      fireEvent.click(screen.getByText('actionRow.startQuiz'))
      fireEvent.click(screen.getByText('actionRow.createPodcast'))
      fireEvent.click(screen.getByText('actionRow.learnMore'))

      expect(mockOnSummarize).toHaveBeenCalledTimes(1)
      expect(mockOnStartQuiz).toHaveBeenCalledTimes(1)
      expect(mockOnCreatePodcast).toHaveBeenCalledTimes(1)
      expect(mockOnLearnMore).toHaveBeenCalledTimes(1)
    })

    it('should allow calling the same callback multiple times', () => {
      render(
        <ActionRow
          onSummarize={mockOnSummarize}
          onLearnMore={mockOnLearnMore}
          onStartQuiz={mockOnStartQuiz}
          onCreatePodcast={mockOnCreatePodcast}
        />
      )

      fireEvent.click(screen.getByText('actionRow.summarize'))
      fireEvent.click(screen.getByText('actionRow.summarize'))
      fireEvent.click(screen.getByText('actionRow.summarize'))

      expect(mockOnSummarize).toHaveBeenCalledTimes(3)
    })
  })

  describe('Optional Callbacks', () => {
    it('should render without onSummarize callback', () => {
      render(
        <ActionRow
          onLearnMore={mockOnLearnMore}
          onStartQuiz={mockOnStartQuiz}
          onCreatePodcast={mockOnCreatePodcast}
        />
      )

      expect(screen.getByText('actionRow.summarize')).toBeInTheDocument()
    })

    it('should not throw when clicking button without callback', () => {
      render(
        <ActionRow
          onLearnMore={mockOnLearnMore}
          onStartQuiz={mockOnStartQuiz}
          onCreatePodcast={mockOnCreatePodcast}
        />
      )

      // Should not throw, even though onSummarize is undefined
      expect(() => {
        fireEvent.click(screen.getByText('actionRow.summarize'))
      }).not.toThrow()
    })
  })
})
