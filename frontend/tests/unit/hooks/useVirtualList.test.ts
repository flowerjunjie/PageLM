/**
 * useSimpleVirtualList Hook Unit Tests
 *
 * Tests for the simplified virtual list hook with fixed item heights.
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSimpleVirtualList } from '@/hooks/useVirtualList'

const generateItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: i, label: `Item ${i}` }))

describe('useSimpleVirtualList', () => {
  it('should return empty visibleItems for undefined items', () => {
    const { result } = renderHook(() =>
      useSimpleVirtualList<{ id: number; label: string }>(undefined, 50, 500)
    )

    expect(result.current.visibleItems).toHaveLength(0)
    expect(result.current.totalHeight).toBe(0)
  })

  it('should calculate total height correctly', () => {
    const items = generateItems(20)
    const itemHeight = 50
    const { result } = renderHook(() =>
      useSimpleVirtualList(items, itemHeight, 500)
    )

    expect(result.current.totalHeight).toBe(20 * 50)
  })

  it('should expose containerProps with onScroll and style', () => {
    const items = generateItems(10)
    const { result } = renderHook(() =>
      useSimpleVirtualList(items, 50, 300)
    )

    expect(result.current.containerProps.onScroll).toBeTypeOf('function')
    expect(result.current.containerProps.style.height).toBe('300px')
    expect(result.current.containerProps.style.overflow).toBe('auto')
  })

  it('should expose innerProps with correct total height style', () => {
    const items = generateItems(100)
    const itemHeight = 40
    const { result } = renderHook(() =>
      useSimpleVirtualList(items, itemHeight, 400)
    )

    expect(result.current.innerProps.style.height).toBe(`${100 * 40}px`)
    expect(result.current.innerProps.style.position).toBe('relative')
  })

  it('should show visible items within container window', () => {
    const items = generateItems(100)
    const itemHeight = 50
    const containerHeight = 300
    const { result } = renderHook(() =>
      useSimpleVirtualList(items, itemHeight, containerHeight)
    )

    // At scroll 0, visible items = container/itemHeight + overscan
    expect(result.current.visibleItems.length).toBeGreaterThan(0)
    expect(result.current.startIndex).toBe(0)
  })

  it('should update visible items when scrolled', () => {
    const items = generateItems(200)
    const itemHeight = 50
    const containerHeight = 500
    const { result } = renderHook(() =>
      useSimpleVirtualList(items, itemHeight, containerHeight)
    )

    const initialStart = result.current.startIndex

    // Simulate scroll
    const scrollEvent = {
      currentTarget: { scrollTop: 1000 }
    } as unknown as React.UIEvent<HTMLDivElement>

    act(() => {
      result.current.containerProps.onScroll(scrollEvent)
    })

    expect(result.current.startIndex).toBeGreaterThan(initialStart)
  })

  it('should calculate offsetY correctly after scroll', () => {
    const items = generateItems(50)
    const itemHeight = 60
    const containerHeight = 300
    const overscan = 2
    const { result } = renderHook(() =>
      useSimpleVirtualList(items, itemHeight, containerHeight, overscan)
    )

    const scrollEvent = {
      currentTarget: { scrollTop: 600 } // 10 items scrolled past
    } as unknown as React.UIEvent<HTMLDivElement>

    act(() => {
      result.current.containerProps.onScroll(scrollEvent)
    })

    // startIndex = max(0, floor(600/60) - overscan) = max(0, 10 - 2) = 8
    expect(result.current.startIndex).toBe(8)
    expect(result.current.offsetY).toBe(8 * 60)
  })

  it('should expose startIndex and endIndex', () => {
    const items = generateItems(50)
    const { result } = renderHook(() =>
      useSimpleVirtualList(items, 50, 300)
    )

    expect(result.current.startIndex).toBeGreaterThanOrEqual(0)
    expect(result.current.endIndex).toBeGreaterThan(result.current.startIndex)
    expect(result.current.endIndex).toBeLessThanOrEqual(items.length)
  })

  it('should handle small item lists (fewer than visible slots)', () => {
    const items = generateItems(3)
    const { result } = renderHook(() =>
      useSimpleVirtualList(items, 100, 800)
    )

    expect(result.current.visibleItems).toHaveLength(3)
    expect(result.current.endIndex).toBe(3)
  })

  it('should include overscan items', () => {
    const items = generateItems(100)
    const itemHeight = 50
    const containerHeight = 300 // 6 items visible
    const overscan = 5

    const { result } = renderHook(() =>
      useSimpleVirtualList(items, itemHeight, containerHeight, overscan)
    )

    // At least containerHeight/itemHeight + 2*overscan items should be visible
    const minVisible = Math.ceil(containerHeight / itemHeight)
    expect(result.current.visibleItems.length).toBeGreaterThanOrEqual(minVisible)
  })
})
