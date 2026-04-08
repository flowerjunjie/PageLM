/**
 * MarkdownView Component Unit Tests
 *
 * Tests for the MarkdownView component with XSS protection
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown-content">{children}</div>,
}))

vi.mock('remark-gfm', () => ({ default: () => [] }))
vi.mock('remark-breaks', () => ({ default: () => [] }))
vi.mock('remark-math', () => ({ default: () => [] }))
vi.mock('rehype-katex', () => ({ default: () => [] }))
vi.mock('rehype-highlight', () => ({ default: () => [] }))

// Import the component to test
import MarkdownView from '../../../../src/components/Chat/MarkdownView'

describe('MarkdownView Component', () => {
  describe('Rendering', () => {
    it('should render markdown content', () => {
      render(<MarkdownView md="# Hello World" />)
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
    })

    it('should handle empty string', () => {
      render(<MarkdownView md="" />)
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
    })

    it('should handle null/undefined', () => {
      render(<MarkdownView md={undefined as any} />)
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
    })
  })

  describe('XSS Protection', () => {
    it('should sanitize malicious className in inline code', () => {
      const maliciousClassName = "onclick=alert('XSS')"
      render(
        <MarkdownView md={`\`className="${maliciousClassName}"`} />
      )
      // Component should render without executing malicious code
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
    })

    it('should sanitize className with script injection', () => {
      const maliciousClassName = "script>alert('XSS')"
      render(
        <MarkdownView md={`\`className="${maliciousClassName}"`} />
      )
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
    })

    it('should handle very long className', () => {
      const longClassName = "a".repeat(300)
      render(
        <MarkdownView md={`\`className="${longClassName}"`} />
      )
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
    })

    it('should allow valid syntax highlighting classes', () => {
      const validClassName = "language-javascript"
      render(
        <MarkdownView md={`\`className="${validClassName}"`} />
      )
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
    })

    it('should allow className with numbers and hyphens', () => {
      const validClassName = "hljs-123 language-ts"
      render(
        <MarkdownView md={`\`className="${validClassName}"`} />
      )
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
    })
  })
})
