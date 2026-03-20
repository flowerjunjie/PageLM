/**
 * useVirtualList Hook Unit Tests (Advanced)
 *
 * Tests for the main virtual list hook with dynamic heights.
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVirtualList } from '@/hooks/useVirtualList'

interface Item {
  id: number
  content: string
}

const generateItems = (count: number): Item[] =>
  Array.from({ length: count }, (_, i) => ({ id: i, content: `Content ${i}` }))

describe('useVirtualList', () => {
  it('should return empty visibleItems when no items provided', () => {
    const { result } = renderHook(() =>
      useVirtualList<Item>(undefined, { itemHeight: 50 })
    )

    expect(result.current.visibleItems).toHaveLength(0)
    expect(result.current.totalHeight).toBe(0)
  })

  it('should return empty for empty array', () => {
    const { result } = renderHook(() =>
      useVirtualList<Item>([], { itemHeight: 50 })
    )

    expect(result.current.visibleItems).toHaveLength(0)
    expect(result.current.totalHeight).toBe(0)
  })

  it('should calculate total height with fixed itemHeight', () => {
    const items = generateItems(100)
    const { result } = renderHook(() =>
      useVirtualList(items, { itemHeight: 60 })
    )

    expect(result.current.totalHeight).toBe(100 * 60)
  })

  it('should calculate total height with dynamic itemHeight function', () => {
    const items = generateItems(5)
    const heights = [50, 100, 75, 120, 80]
    const itemHeight = (index: number) => heights[index]

    const { result } = renderHook(() =>
      useVirtualList(items, { itemHeight })
    )

    const expectedTotal = heights.reduce((sum, h) => sum + h, 0)
    expect(result.current.totalHeight).toBe(expectedTotal)
  })

  it('should expose containerProps with ref, onScroll, and style', () => {
    const items = generateItems(10)
    const { result } = renderHook(() =>
      useVirtualList(items, { itemHeight: 50 })
    )

    const { containerProps } = result.current
    expect(containerProps.ref).toBeDefined()
    expect(containerProps.onScroll).toBeTypeOf('function')
    expect(containerProps.style.height).toBe('100%')
    expect(containerProps.style.overflow).toBe('auto')
    expect(containerProps.style.position).toBe('relative')
  })

  it('should expose innerProps with total height style', () => {
    const items = generateItems(20)
    const { result } = renderHook(() =>
      useVirtualList(items, { itemHeight: 40 })
    )

    const { innerProps } = result.current
    expect(innerProps.style.height).toBe(`${20 * 40}px`)
    expect(innerProps.style.position).toBe('relative')
  })

  it('should track scrollTop state', () => {
    const items = generateItems(100)
    const { result } = renderHook(() =>
      useVirtualList(items, { itemHeight: 50 })
    )

    expect(result.current.scrollTop).toBe(0)
    expect(result.current.isScrolling).toBe(false)
  })

  it('should update scrollTop and isScrolling when scrolled', () => {
    const items = generateItems(100)
    const { result } = renderHook(() =>
      useVirtualList(items, { itemHeight: 50 })
    )

    const scrollEvent = {
      currentTarget: { scrollTop: 500 }
    } as unknown as React.UIEvent<HTMLDivElement>

    act(() => {
      result.current.containerProps.onScroll(scrollEvent)
    })

    expect(result.current.scrollTop).toBe(500)
    expect(result.current.isScrolling).toBe(true)
  })

  it('should stop scrolling after timeout', () => {
    vi.useFakeTimers()
    const items = generateItems(100)
    const { result } = renderHook(() =>
      useVirtualList(items, { itemHeight: 50 })
    )

    const scrollEvent = {
      currentTarget: { scrollTop: 200 }
    } as unknown as React.UIEvent<HTMLDivElement>

    act(() => {
      result.current.containerProps.onScroll(scrollEvent)
    })

    expect(result.current.isScrolling).toBe(true)

    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(result.current.isScrolling).toBe(false)
    vi.useRealTimers()
  })

  it('should use custom getItemKey function', () => {
    const items = generateItems(50)
    const getItemKey = (index: number, data: Item) => data.id

    const { result } = renderHook(() =>
      useVirtualList(items, { itemHeight: 50, getItemKey })
    )

    // Check that visibleItems have keys assigned
    if (result.current.visibleItems.length > 0) {
      const firstKey = result.current.visibleItems[0].key
      expect(typeof firstKey).toBe('number')
    }
  })

  it('should include item index in visible items', () => {
    const items = generateItems(20)
    const { result } = renderHook(() =>
      useVirtualList(items, { itemHeight: 100 })
    )

    // Check that visible items have valid indices
    result.current.visibleItems.forEach((visibleItem) => {
      expect(visibleItem.index).toBeGreaterThanOrEqual(0)
      expect(visibleItem.index).toBeLessThan(items.length)
    })
  })

  it('should include offset for each visible item', () => {
    const items = generateItems(10)
    const { result } = renderHook(() =>
      useVirtualList(items, { itemHeight: 50 })
    )

    result.current.visibleItems.forEach((visibleItem) => {
      expect(visibleItem.offset).toBeGreaterThanOrEqual(0)
      expect(visibleItem.height).toBe(50)
    })
  })

  it('should include item data in visible items', () => {
    const items = generateItems(5)
    const { result } = renderHook(() =>
      useVirtualList(items, { itemHeight: 60 })
    )

    result.current.visibleItems.forEach((visibleItem) => {
      expect(visibleItem.item).toBeDefined()
      expect(visibleItem.item.id).toBeGreaterThanOrEqual(0)
    })
  })
})
