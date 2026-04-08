/**
 * Composer Component Unit Tests
 *
 * Tests for the chat message composer component
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

import Composer from '../../../../src/components/Chat/Composer'

describe('Composer Component', () => {
  const mockOnSend = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render textarea with placeholder', () => {
      render(<Composer onSend={mockOnSend} />)
      expect(screen.getByPlaceholderText('composer.placeholder')).toBeInTheDocument()
    })

    it('should render send button', () => {
      render(<Composer onSend={mockOnSend} />)
      expect(screen.getByRole('button', { name: /composer\.send/i })).toBeInTheDocument()
    })

    it('should render attachment button', () => {
      render(<Composer onSend={mockOnSend} />)
      // The attachment button has a plus icon
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('User Input', () => {
    it('should update textarea value on input', () => {
      render(<Composer onSend={mockOnSend} />)
      const textarea = screen.getByRole('textbox')

      fireEvent.change(textarea, { target: { value: 'Hello world' } })
      expect(textarea).toHaveValue('Hello world')
    })

    it('should not send empty message', () => {
      render(<Composer onSend={mockOnSend} />)
      const textarea = screen.getByRole('textbox')

      fireEvent.change(textarea, { target: { value: '   ' } })
      fireEvent.keyDown(textarea, { key: 'Enter' })

      expect(mockOnSend).not.toHaveBeenCalled()
    })

    it('should send message on Enter key (without Shift)', () => {
      render(<Composer onSend={mockOnSend} />)
      const textarea = screen.getByRole('textbox')

      fireEvent.change(textarea, { target: { value: 'Test message' } })
      fireEvent.keyDown(textarea, { key: 'Enter' })

      expect(mockOnSend).toHaveBeenCalledWith('Test message')
    })

    it('should not send on Shift+Enter', () => {
      render(<Composer onSend={mockOnSend} />)
      const textarea = screen.getByRole('textbox')

      fireEvent.change(textarea, { target: { value: 'Test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

      expect(mockOnSend).not.toHaveBeenCalled()
    })

    it('should clear textarea after sending', () => {
      render(<Composer onSend={mockOnSend} />)
      const textarea = screen.getByRole('textbox')

      fireEvent.change(textarea, { target: { value: 'To send' } })
      fireEvent.keyDown(textarea, { key: 'Enter' })

      expect(textarea).toHaveValue('')
    })
  })

  describe('Send Button', () => {
    it('should call onSend when clicked', () => {
      render(<Composer onSend={mockOnSend} />)
      const textarea = screen.getByRole('textbox')

      fireEvent.change(textarea, { target: { value: 'Button click test' } })

      const sendButton = screen.getByRole('button', { name: /composer\.send/i })
      fireEvent.click(sendButton)

      expect(mockOnSend).toHaveBeenCalledWith('Button click test')
    })

    it('should be disabled when disabled prop is true', () => {
      render(<Composer onSend={mockOnSend} disabled={true} />)
      const sendButton = screen.getByRole('button', { name: /composer\.send/i })

      expect(sendButton).toBeDisabled()
    })

    it('should show loading state when loading prop is true', () => {
      render(<Composer onSend={mockOnSend} loading={true} />)
      // Should show spinner when loading
      const sendButton = screen.getByRole('button', { name: /composer\.send/i })
      const spinner = sendButton.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('Auto-resize', () => {
    it('should have initial height', () => {
      render(<Composer onSend={mockOnSend} />)
      const textarea = screen.getByRole('textbox')

      // Initial height should be set (style attribute contains height)
      expect(textarea.style.height).toBeDefined()
    })
  })

  describe('IME Composition', () => {
    it('should not send during composition', () => {
      render(<Composer onSend={mockOnSend} />)
      const textarea = screen.getByRole('textbox')

      // Start composition
      fireEvent.compositionStart(textarea)
      fireEvent.change(textarea, { target: { value: ' композиция' } })

      // Try to send while composing
      fireEvent.keyDown(textarea, { key: 'Enter' })

      expect(mockOnSend).not.toHaveBeenCalled()

      // End composition
      fireEvent.compositionEnd(textarea)
    })
  })

  describe('Disabled State', () => {
    it('should not send when disabled', () => {
      render(<Composer onSend={mockOnSend} disabled={true} />)
      const textarea = screen.getByRole('textbox')

      fireEvent.change(textarea, { target: { value: 'Should not send' } })
      fireEvent.keyDown(textarea, { key: 'Enter' })

      expect(mockOnSend).not.toHaveBeenCalled()
    })

    it('should not call send on button click when disabled', () => {
      render(<Composer onSend={mockOnSend} disabled={true} />)
      const sendButton = screen.getByRole('button', { name: /composer\.send/i })

      fireEvent.click(sendButton)

      expect(mockOnSend).not.toHaveBeenCalled()
    })
  })
})
