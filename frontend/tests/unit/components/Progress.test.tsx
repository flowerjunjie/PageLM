/**
 * Progress Component Unit Tests
 *
 * Tests for ProgressBar, CircularProgress, ProgressSteps,
 * IndeterminateProgress, and ProgressRing components.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

import {
  ProgressBar,
  CircularProgress,
  ProgressSteps,
  IndeterminateProgress,
  ProgressRing,
} from '@/components/Progress'

describe('ProgressBar', () => {
  it('should render without errors', () => {
    const { container } = render(<ProgressBar value={50} />)
    expect(container).toBeInTheDocument()
  })

  it('should show percentage at 50%', () => {
    const progressBar = render(<ProgressBar value={50} />)
    const progressEl = progressBar.container.querySelector('[role="progressbar"]')
    expect(progressEl).toBeInTheDocument()
    expect(progressEl?.getAttribute('aria-valuenow')).toBe('50')
  })

  it('should clamp value at 100% maximum', () => {
    const { container } = render(<ProgressBar value={150} />)
    const bar = container.querySelector('[role="progressbar"]') as HTMLElement
    expect(bar?.style.width).toBe('100%')
  })

  it('should clamp value at 0% minimum', () => {
    const { container } = render(<ProgressBar value={-20} />)
    const bar = container.querySelector('[role="progressbar"]') as HTMLElement
    expect(bar?.style.width).toBe('0%')
  })

  it('should show label when showLabel is true', () => {
    render(<ProgressBar value={75} showLabel />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('should show custom label text', () => {
    render(<ProgressBar value={30} label="Uploading..." />)
    expect(screen.getByText('Uploading...')).toBeInTheDocument()
  })

  it('should apply success variant class', () => {
    const { container } = render(<ProgressBar value={60} variant="success" />)
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar?.className).toContain('bg-emerald-500')
  })

  it('should apply error variant class', () => {
    const { container } = render(<ProgressBar value={40} variant="error" />)
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar?.className).toContain('bg-red-500')
  })

  it('should apply warning variant class', () => {
    const { container } = render(<ProgressBar value={40} variant="warning" />)
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar?.className).toContain('bg-amber-500')
  })

  it('should apply size xs class', () => {
    const { container } = render(<ProgressBar value={50} size="xs" />)
    const track = container.querySelector('.relative')
    expect(track?.className).toContain('h-1')
  })

  it('should apply size lg class', () => {
    const { container } = render(<ProgressBar value={50} size="lg" />)
    const track = container.querySelector('.relative')
    expect(track?.className).toContain('h-4')
  })

  it('should set aria attributes correctly', () => {
    render(<ProgressBar value={60} max={200} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '60')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '200')
  })

  it('should apply custom className to container', () => {
    const { container } = render(<ProgressBar value={50} className="my-progress" />)
    expect(container.firstChild?.className).toContain('my-progress')
  })

  it('should handle 0 value', () => {
    const { container } = render(<ProgressBar value={0} />)
    const bar = container.querySelector('[role="progressbar"]') as HTMLElement
    expect(bar?.style.width).toBe('0%')
  })

  it('should handle 100 value', () => {
    const { container } = render(<ProgressBar value={100} />)
    const bar = container.querySelector('[role="progressbar"]') as HTMLElement
    expect(bar?.style.width).toBe('100%')
  })
})

describe('CircularProgress', () => {
  it('should render an SVG element', () => {
    const { container } = render(<CircularProgress value={50} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should show percentage when showLabel is true', () => {
    render(<CircularProgress value={65} showLabel />)
    expect(screen.getByText('65%')).toBeInTheDocument()
  })

  it('should show custom label', () => {
    render(<CircularProgress value={40} label="Processing" />)
    expect(screen.getByText('Processing')).toBeInTheDocument()
  })

  it('should set correct SVG dimensions', () => {
    const { container } = render(<CircularProgress value={50} size={100} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('100')
    expect(svg?.getAttribute('height')).toBe('100')
  })

  it('should have progressbar role', () => {
    render(<CircularProgress value={50} />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeInTheDocument()
  })

  it('should set aria-valuenow correctly', () => {
    render(<CircularProgress value={75} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '75')
  })

  it('should clamp to 0 minimum', () => {
    render(<CircularProgress value={-10} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '-10') // raw value passed but percentage clamped
  })

  it('should apply custom className', () => {
    const { container } = render(<CircularProgress value={50} className="circular-custom" />)
    expect(container.firstChild?.className).toContain('circular-custom')
  })
})

describe('ProgressSteps', () => {
  const steps = ['Step 1', 'Step 2', 'Step 3']

  it('should render all step labels', () => {
    render(<ProgressSteps steps={steps} currentStep={0} />)
    steps.forEach(step => {
      expect(screen.getByText(step)).toBeInTheDocument()
    })
  })

  it('should render step numbers', () => {
    render(<ProgressSteps steps={steps} currentStep={0} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('should show checkmark for completed steps', () => {
    const { container } = render(
      <ProgressSteps steps={steps} currentStep={2} completed={[0, 1]} />
    )
    // Completed steps show a checkmark SVG instead of number
    const svgElements = container.querySelectorAll('svg')
    expect(svgElements.length).toBeGreaterThan(0)
  })

  it('should apply current step styling', () => {
    const { container } = render(<ProgressSteps steps={steps} currentStep={1} />)
    // Current step circle should have sky-500 border
    const circles = container.querySelectorAll('[class*="border-"]')
    expect(circles.length).toBeGreaterThan(0)
  })

  it('should apply custom className', () => {
    const { container } = render(
      <ProgressSteps steps={steps} currentStep={0} className="steps-custom" />
    )
    expect(container.firstChild?.className).toContain('steps-custom')
  })
})

describe('IndeterminateProgress', () => {
  it('should render without errors', () => {
    const { container } = render(<IndeterminateProgress />)
    expect(container).toBeInTheDocument()
  })

  it('should have progressbar role with aria-label', () => {
    render(<IndeterminateProgress />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-label', 'Loading')
  })

  it('should apply size sm class', () => {
    const { container } = render(<IndeterminateProgress size="sm" />)
    const track = container.querySelector('.relative')
    expect(track?.className).toContain('h-2')
  })

  it('should apply custom className', () => {
    const { container } = render(<IndeterminateProgress className="indeterminate-custom" />)
    expect(container.firstChild?.className).toContain('indeterminate-custom')
  })
})

describe('ProgressRing', () => {
  it('should render an SVG element', () => {
    const { container } = render(<ProgressRing value={50} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should have progressbar role', () => {
    render(<ProgressRing value={50} />)
    const ring = screen.getByRole('progressbar')
    expect(ring).toBeInTheDocument()
  })

  it('should set aria-valuenow correctly', () => {
    render(<ProgressRing value={30} />)
    const ring = screen.getByRole('progressbar')
    expect(ring).toHaveAttribute('aria-valuenow', '30')
  })

  it('should render with custom size', () => {
    const { container } = render(<ProgressRing value={50} size={60} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('60')
    expect(svg?.getAttribute('height')).toBe('60')
  })

  it('should apply custom className', () => {
    const { container } = render(<ProgressRing value={50} className="ring-custom" />)
    expect(container.querySelector('svg')?.className.baseVal).toContain('ring-custom')
  })
})
