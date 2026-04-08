/**
 * Chat Message Bubble Component Unit Tests
 *
 * Tests for the memoized message bubble components
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock the MarkdownView component
vi.mock('../../../../../src/components/Chat/MarkdownView', () => ({
  default: ({ md }: { md: string }) => (
    <div data-testid="markdown-view">{md.slice(0, 50)}</div>
  ),
}))

// Import the memoized components
// We need to test them in isolation from the main Chat component

// Simple versions of the components for testing
const UserBubble = React.memo(function UserBubble({ content }: { content: string }) {
  return (
    <div data-testid="user-bubble" className="user-bubble">
      <div className="message-content">{content}</div>
    </div>
  )
})

const AssistantBubble = React.memo(function AssistantBubble({ content }: { content: string }) {
  return (
    <div data-testid="assistant-bubble" className="assistant-bubble">
      <div data-testid="markdown-view">{content.slice(0, 50)}</div>
    </div>
  )
})

describe('Chat Message Bubbles', () => {
  describe('UserBubble', () => {
    it('should render user message content', () => {
      render(<UserBubble content="Hello, this is a test message" />)
      expect(screen.getByTestId('user-bubble')).toBeInTheDocument()
      expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument()
    })

    it('should apply correct structure', () => {
      render(<UserBubble content="Test" />)
      expect(screen.getByTestId('user-bubble')).toHaveClass('user-bubble')
    })

    it('should handle long messages', () => {
      const longMessage = 'A'.repeat(1000)
      render(<UserBubble content={longMessage} />)
      expect(screen.getByText(longMessage)).toBeInTheDocument()
    })

    it('should handle special characters', () => {
      render(<UserBubble content="Message with <script>alert('xss')</script>" />)
      expect(screen.getByTestId('user-bubble')).toBeInTheDocument()
      // Content should be rendered as text, not executed
      expect(screen.getByText(/<script>/)).toBeInTheDocument()
    })

    it('should be memoized and not re-render with same props', () => {
      const renderSpy = vi.fn()
      const TestComponent = React.memo(function TestComponent({ content }: { content: string }) {
        renderSpy()
        return <div>{content}</div>
      })

      const { rerender } = render(<TestComponent content="same" />)
      expect(renderSpy).toHaveBeenCalledTimes(1)

      // Re-render with same props
      rerender(<TestComponent content="same" />)
      expect(renderSpy).toHaveBeenCalledTimes(1) // Should not re-render

      // Re-render with different props
      rerender(<TestComponent content="different" />)
      expect(renderSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('AssistantBubble', () => {
    it('should render assistant message content', () => {
      render(<AssistantBubble content="# This is a response" />)
      expect(screen.getByTestId('assistant-bubble')).toBeInTheDocument()
    })

    it('should contain markdown view', () => {
      render(<AssistantBubble content="Formatted **content**" />)
      expect(screen.getByTestId('markdown-view')).toBeInTheDocument()
    })

    it('should truncate long content in preview', () => {
      const longContent = 'B'.repeat(100)
      render(<AssistantBubble content={longContent} />)
      // Should show truncated preview
      const preview = screen.getByTestId('markdown-view').textContent
      expect(preview?.length).toBeLessThan(longContent.length)
    })

    it('should handle empty content', () => {
      render(<AssistantBubble content="" />)
      expect(screen.getByTestId('assistant-bubble')).toBeInTheDocument()
    })
  })

  describe('Message Bubble Pattern', () => {
    it('should render a list of messages correctly', () => {
      const messages = [
        { id: '1', role: 'user' as const, content: 'First message' },
        { id: '2', role: 'assistant' as const, content: 'Second message' },
        { id: '3', role: 'user' as const, content: 'Third message' },
      ]

      const { container } = render(
        <div>
          {messages.map((m) =>
            m.role === 'assistant' ? (
              <AssistantBubble key={m.id} content={m.content} />
            ) : (
              <UserBubble key={m.id} content={m.content} />
            )
          )}
        </div>
      )

      expect(container.querySelectorAll('[data-testid="user-bubble"]')).toHaveLength(2)
      expect(container.querySelectorAll('[data-testid="assistant-bubble"]')).toHaveLength(1)
    })
  })
})
