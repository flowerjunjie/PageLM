/**
 * Badge Component Unit Tests
 *
 * Tests for Badge, StatusBadge, Tag, ProgressBadge, NotificationBadge
 * and preset badge components.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

import {
  Badge,
  StatusBadge,
  Tag,
  ProgressBadge,
  NotificationBadge,
  NewBadge,
  BetaBadge,
  ProBadge,
} from '@/components/Badge'

describe('Badge', () => {
  it('should render children', () => {
    render(<Badge>Test Label</Badge>)
    expect(screen.getByText('Test Label')).toBeInTheDocument()
  })

  it('should apply default variant class', () => {
    const { container } = render(<Badge>Default</Badge>)
    const span = container.querySelector('span')
    expect(span?.className).toContain('bg-stone-700')
  })

  it('should apply primary variant class', () => {
    const { container } = render(<Badge variant="primary">Primary</Badge>)
    const span = container.querySelector('span')
    expect(span?.className).toContain('bg-sky-600')
  })

  it('should apply success variant class', () => {
    const { container } = render(<Badge variant="success">Success</Badge>)
    const span = container.querySelector('span')
    expect(span?.className).toContain('bg-emerald-600')
  })

  it('should apply warning variant class', () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>)
    const span = container.querySelector('span')
    expect(span?.className).toContain('bg-amber-600')
  })

  it('should apply error variant class', () => {
    const { container } = render(<Badge variant="error">Error</Badge>)
    const span = container.querySelector('span')
    expect(span?.className).toContain('bg-red-600')
  })

  it('should apply outline variant class', () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>)
    const span = container.querySelector('span')
    expect(span?.className).toContain('bg-transparent')
  })

  it('should render with dot indicator', () => {
    const { container } = render(<Badge dot>With Dot</Badge>)
    const dotSpan = container.querySelectorAll('span')[1]
    expect(dotSpan?.className).toContain('rounded-full')
  })

  it('should display count instead of children when count prop is provided', () => {
    render(<Badge count={5}>Ignored</Badge>)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should display max+ when count exceeds max', () => {
    render(<Badge count={150} max={99}>Ignored</Badge>)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('should return null when count is 0 and showZero is false', () => {
    const { container } = render(<Badge count={0}>Ignored</Badge>)
    expect(container.firstChild).toBeNull()
  })

  it('should display 0 when count is 0 and showZero is true', () => {
    render(<Badge count={0} showZero>Ignored</Badge>)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Badge onClick={handleClick}>Clickable</Badge>)
    fireEvent.click(screen.getByText('Clickable'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should apply custom className', () => {
    const { container } = render(<Badge className="custom-class">Test</Badge>)
    expect(container.querySelector('span')?.className).toContain('custom-class')
  })

  it('should apply size xs class', () => {
    const { container } = render(<Badge size="xs">XS</Badge>)
    expect(container.querySelector('span')?.className).toContain('px-1.5')
  })

  it('should apply size lg class', () => {
    const { container } = render(<Badge size="lg">LG</Badge>)
    expect(container.querySelector('span')?.className).toContain('px-3')
  })
})

describe('StatusBadge', () => {
  it('should render online status', () => {
    const { container } = render(<StatusBadge status="online" />)
    expect(container).toBeInTheDocument()
    expect(screen.getByText('在线')).toBeInTheDocument()
  })

  it('should render offline status', () => {
    render(<StatusBadge status="offline" />)
    expect(screen.getByText('离线')).toBeInTheDocument()
  })

  it('should render busy status', () => {
    render(<StatusBadge status="busy" />)
    expect(screen.getByText('忙碌')).toBeInTheDocument()
  })

  it('should not render text when showText is false', () => {
    render(<StatusBadge status="online" showText={false} />)
    expect(screen.queryByText('在线')).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<StatusBadge status="online" className="my-class" />)
    expect(container.querySelector('span')?.className).toContain('my-class')
  })
})

describe('Tag', () => {
  it('should render children', () => {
    render(<Tag>JavaScript</Tag>)
    expect(screen.getByText('JavaScript')).toBeInTheDocument()
  })

  it('should not show remove button when removable is false', () => {
    render(<Tag>React</Tag>)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('should show remove button when removable is true', () => {
    render(<Tag removable onRemove={() => {}}>TypeScript</Tag>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should call onRemove when remove button is clicked', () => {
    const handleRemove = vi.fn()
    render(<Tag removable onRemove={handleRemove}>Vue</Tag>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleRemove).toHaveBeenCalledTimes(1)
  })

  it('should apply custom className', () => {
    const { container } = render(<Tag className="tag-custom">Content</Tag>)
    expect(container.querySelector('span')?.className).toContain('tag-custom')
  })
})

describe('ProgressBadge', () => {
  it('should show percentage by default', () => {
    render(<ProgressBadge value={75} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('should show value when showPercentage is false', () => {
    render(<ProgressBadge value={30} showPercentage={false} />)
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('should use success variant at 100%', () => {
    const { container } = render(<ProgressBadge value={100} />)
    expect(container.querySelector('span')?.className).toContain('bg-emerald-600')
  })

  it('should use warning variant below 50%', () => {
    const { container } = render(<ProgressBadge value={30} />)
    expect(container.querySelector('span')?.className).toContain('bg-amber-600')
  })

  it('should calculate percentage correctly with custom max', () => {
    render(<ProgressBadge value={50} max={200} />)
    expect(screen.getByText('25%')).toBeInTheDocument()
  })
})

describe('NotificationBadge', () => {
  it('should render children', () => {
    render(<NotificationBadge count={3}><span>Icon</span></NotificationBadge>)
    expect(screen.getByText('Icon')).toBeInTheDocument()
  })

  it('should show count badge when count is positive', () => {
    render(<NotificationBadge count={5}><span>Bell</span></NotificationBadge>)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should not show badge when count is 0', () => {
    render(<NotificationBadge count={0}><span>Bell</span></NotificationBadge>)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('should show max+ when count exceeds max', () => {
    render(<NotificationBadge count={200} max={99}><span>Bell</span></NotificationBadge>)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })
})

describe('Preset Badge components', () => {
  it('should render NewBadge', () => {
    render(<NewBadge />)
    expect(screen.getByText('新')).toBeInTheDocument()
  })

  it('should render BetaBadge', () => {
    render(<BetaBadge />)
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('should render ProBadge', () => {
    render(<ProBadge />)
    expect(screen.getByText('Pro')).toBeInTheDocument()
  })
})
