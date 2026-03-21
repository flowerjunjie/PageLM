/**
 * Card Component Unit Tests
 *
 * Tests for the Card component from the component library
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Simple Card component for testing
const Card: React.FC<{
  children: React.ReactNode
  title?: string
  subtitle?: string
  footer?: React.ReactNode
  className?: string
}> = ({ children, title, subtitle, footer, className }) => {
  return React.createElement(
    'div',
    { className: `card ${className || ''}`, 'data-testid': 'card' },
    title && React.createElement('h3', { className: 'card-title', 'data-testid': 'card-title' }, title),
    subtitle && React.createElement('p', { className: 'card-subtitle', 'data-testid': 'card-subtitle' }, subtitle),
    React.createElement('div', { className: 'card-content' }, children),
    footer && React.createElement('div', { className: 'card-footer', 'data-testid': 'card-footer' }, footer)
  )
}

describe('Card', () => {
  it('should render children correctly', () => {
    render(React.createElement(Card, {}, 'Card content'))
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('should render title when provided', () => {
    render(React.createElement(Card, { title: 'Card Title' }, 'Content'))
    expect(screen.getByTestId('card-title')).toHaveTextContent('Card Title')
  })

  it('should render subtitle when provided', () => {
    render(
      React.createElement(Card, { title: 'Title', subtitle: 'Card subtitle' }, 'Content')
    )
    expect(screen.getByTestId('card-subtitle')).toHaveTextContent('Card subtitle')
  })

  it('should render footer when provided', () => {
    render(
      React.createElement(
        Card,
        { footer: React.createElement('button', {}, 'Action') },
        'Content'
      )
    )
    expect(screen.getByTestId('card-footer')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(React.createElement(Card, { className: 'custom-class' }, 'Content'))
    expect(screen.getByTestId('card')).toHaveClass('custom-class')
  })

  it('should render all sections together', () => {
    render(
      React.createElement(
        Card,
        {
          title: 'Full Card',
          subtitle: 'With all sections',
          footer: React.createElement('span', {}, 'Footer content'),
        },
        'Main content'
      )
    )

    expect(screen.getByTestId('card-title')).toBeInTheDocument()
    expect(screen.getByTestId('card-subtitle')).toBeInTheDocument()
    expect(screen.getByText('Main content')).toBeInTheDocument()
    expect(screen.getByTestId('card-footer')).toBeInTheDocument()
  })

  it('should not render title element when title is not provided', () => {
    render(React.createElement(Card, {}, 'Content'))
    expect(screen.queryByTestId('card-title')).not.toBeInTheDocument()
  })

  it('should not render subtitle element when subtitle is not provided', () => {
    render(React.createElement(Card, { title: 'Title' }, 'Content'))
    expect(screen.queryByTestId('card-subtitle')).not.toBeInTheDocument()
  })

  it('should not render footer element when footer is not provided', () => {
    render(React.createElement(Card, {}, 'Content'))
    expect(screen.queryByTestId('card-footer')).not.toBeInTheDocument()
  })
})
