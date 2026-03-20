/**
 * EmptyState Component Unit Tests
 *
 * Tests for EmptyState and its preset sub-components.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock react-i18next - return the last part of the key as text
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key.split('.').pop() || key,
    i18n: { language: 'en' },
  }),
}))

import EmptyState, {
  NoData,
  NoSearchResults,
  NoFavorites,
  NoNetwork,
} from '@/components/EmptyState'

describe('EmptyState', () => {
  it('should render without errors with default type', () => {
    const { container } = render(<EmptyState />)
    expect(container).toBeInTheDocument()
  })

  it('should render custom title', () => {
    render(<EmptyState title="No Results Found" />)
    expect(screen.getByText('No Results Found')).toBeInTheDocument()
  })

  it('should render custom description', () => {
    render(<EmptyState description="Try adjusting your filters" />)
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument()
  })

  it('should render action button when action prop is provided', () => {
    const handleClick = vi.fn()
    render(
      <EmptyState
        action={{ label: 'Create Now', onClick: handleClick }}
      />
    )
    expect(screen.getByText('Create Now')).toBeInTheDocument()
  })

  it('should call action.onClick when button is clicked', () => {
    const handleClick = vi.fn()
    render(
      <EmptyState
        action={{ label: 'Retry', onClick: handleClick }}
      />
    )
    fireEvent.click(screen.getByText('Retry'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should not render action button when no action is provided', () => {
    render(<EmptyState title="Empty" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('should render primary action button with correct styling', () => {
    const { container } = render(
      <EmptyState
        action={{ label: 'Go', onClick: () => {}, variant: 'primary' }}
      />
    )
    const button = container.querySelector('button')
    expect(button?.className).toContain('bg-sky-600')
  })

  it('should render secondary action button with correct styling', () => {
    const { container } = render(
      <EmptyState
        action={{ label: 'Go', onClick: () => {}, variant: 'secondary' }}
      />
    )
    const button = container.querySelector('button')
    expect(button?.className).toContain('bg-stone-800')
  })

  it('should render custom icon', () => {
    const CustomIcon = () => <div data-testid="custom-icon">Custom</div>
    render(<EmptyState icon={<CustomIcon />} />)
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<EmptyState className="empty-custom" />)
    expect(container.firstChild?.className).toContain('empty-custom')
  })

  it('should render noSearchResults type', () => {
    const { container } = render(<EmptyState type="noSearchResults" />)
    expect(container).toBeInTheDocument()
    // Should render search icon (SVG)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should render error type', () => {
    const { container } = render(<EmptyState type="error" />)
    expect(container).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should render noFavorites type', () => {
    const { container } = render(<EmptyState type="noFavorites" />)
    expect(container).toBeInTheDocument()
  })

  it('should render noNetwork type', () => {
    const { container } = render(<EmptyState type="noNetwork" />)
    expect(container).toBeInTheDocument()
  })

  it('should render with custom icon provided via icon prop', () => {
    const CustomIcon = () => <svg data-testid="my-svg" />
    const { container } = render(<EmptyState icon={<CustomIcon />} title="Custom" description="Desc" />)
    expect(container.querySelector('svg[data-testid="my-svg"]')).toBeInTheDocument()
  })
})

describe('NoData preset', () => {
  it('should render without errors', () => {
    const { container } = render(<NoData />)
    expect(container).toBeInTheDocument()
  })

  it('should render with action button', () => {
    const handleCreate = vi.fn()
    render(<NoData action={{ label: 'Create', onClick: handleCreate }} />)
    expect(screen.getByText('Create')).toBeInTheDocument()
  })
})

describe('NoSearchResults preset', () => {
  it('should render without errors', () => {
    const { container } = render(<NoSearchResults />)
    expect(container).toBeInTheDocument()
  })

  it('should render clear search button when action provided', () => {
    const handleClear = vi.fn()
    render(<NoSearchResults action={{ label: 'Clear Search', onClick: handleClear }} />)
    fireEvent.click(screen.getByText('Clear Search'))
    expect(handleClear).toHaveBeenCalledTimes(1)
  })
})

describe('NoFavorites preset', () => {
  it('should render without errors', () => {
    const { container } = render(<NoFavorites />)
    expect(container).toBeInTheDocument()
  })
})

describe('NoNetwork preset', () => {
  it('should render without errors', () => {
    const { container } = render(<NoNetwork />)
    expect(container).toBeInTheDocument()
  })

  it('should render retry button when onRetry is provided', () => {
    const handleRetry = vi.fn()
    render(<NoNetwork onRetry={handleRetry} />)
    fireEvent.click(screen.getByText('重试'))
    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it('should not render retry button when no onRetry provided', () => {
    render(<NoNetwork />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
