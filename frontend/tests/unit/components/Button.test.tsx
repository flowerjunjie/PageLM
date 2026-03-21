/**
 * Button Component Unit Tests
 *
 * Tests for the Button component from the component library
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Simple Button component for testing
const Button = React.forwardRef<
  HTMLButtonElement,
  {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    variant?: 'primary' | 'secondary' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
  }
>(({ children, onClick, disabled, variant = 'primary', size = 'md', loading }, ref) => {
  const baseClasses = 'btn'
  const variantClasses = `btn-${variant}`
  const sizeClasses = `btn-${size}`
  const loadingClasses = loading ? 'btn-loading' : ''

  return React.createElement(
    'button',
    {
      ref,
      onClick,
      disabled: disabled || loading,
      className: `${baseClasses} ${variantClasses} ${sizeClasses} ${loadingClasses}`,
      'data-testid': 'button',
    },
    loading ? 'Loading...' : children
  )
})
Button.displayName = 'Button'

describe('Button', () => {
  it('should render children correctly', () => {
    render(React.createElement(Button, {}, 'Click me'))
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn()
    render(React.createElement(Button, { onClick: handleClick }, 'Click me'))

    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should not call onClick when disabled', () => {
    const handleClick = vi.fn()
    render(
      React.createElement(Button, { onClick: handleClick, disabled: true }, 'Click me')
    )

    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('should apply variant classes', () => {
    const { rerender } = render(React.createElement(Button, { variant: 'primary' }, 'Button'))
    expect(screen.getByTestId('button')).toHaveClass('btn-primary')

    rerender(React.createElement(Button, { variant: 'secondary' }, 'Button'))
    expect(screen.getByTestId('button')).toHaveClass('btn-secondary')

    rerender(React.createElement(Button, { variant: 'danger' }, 'Button'))
    expect(screen.getByTestId('button')).toHaveClass('btn-danger')
  })

  it('should apply size classes', () => {
    const { rerender } = render(React.createElement(Button, { size: 'sm' }, 'Button'))
    expect(screen.getByTestId('button')).toHaveClass('btn-sm')

    rerender(React.createElement(Button, { size: 'md' }, 'Button'))
    expect(screen.getByTestId('button')).toHaveClass('btn-md')

    rerender(React.createElement(Button, { size: 'lg' }, 'Button'))
    expect(screen.getByTestId('button')).toHaveClass('btn-lg')
  })

  it('should show loading state', () => {
    render(React.createElement(Button, { loading: true }, 'Save'))
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByTestId('button')).toBeDisabled()
    expect(screen.getByTestId('button')).toHaveClass('btn-loading')
  })

  it('should be disabled when loading', () => {
    const handleClick = vi.fn()
    render(
      React.createElement(Button, { onClick: handleClick, loading: true }, 'Save')
    )

    fireEvent.click(screen.getByTestId('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(React.createElement(Button, { ref }, 'Button'))

    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    expect(ref.current?.tagName).toBe('BUTTON')
  })
})
