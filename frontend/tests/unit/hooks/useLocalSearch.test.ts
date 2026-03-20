/**
 * useLocalSearch Hook Unit Tests
 *
 * Tests for the local search hook with debouncing and filtering.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock @tanstack/react-query (used in useDebouncedSearch but not useLocalSearch)
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}))

// Mock apiClient
vi.mock('@/lib/apiClient', () => ({
  api: {
    get: vi.fn(),
  },
  apiClient: {},
}))

import { useLocalSearch } from '@/hooks/useDebouncedSearch'

interface Item {
  id: number
  name: string
  category: string
}

const items: Item[] = [
  { id: 1, name: 'Apple', category: 'fruit' },
  { id: 2, name: 'Banana', category: 'fruit' },
  { id: 3, name: 'Carrot', category: 'vegetable' },
  { id: 4, name: 'Daikon', category: 'vegetable' },
  { id: 5, name: 'Elderberry', category: 'fruit' },
]

const searchFn = (item: Item, query: string) =>
  item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)

describe('useLocalSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return all items when query is empty', () => {
    const { result } = renderHook(() =>
      useLocalSearch(items, searchFn, { debounceMs: 150 })
    )

    expect(result.current.results).toHaveLength(5)
  })

  it('should return initial empty query', () => {
    const { result } = renderHook(() =>
      useLocalSearch(items, searchFn)
    )

    expect(result.current.query).toBe('')
  })

  it('should filter items based on search query after debounce', () => {
    const { result } = renderHook(() =>
      useLocalSearch(items, searchFn, { debounceMs: 150, minChars: 1 })
    )

    act(() => {
      result.current.setQuery('apple')
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current.results.some(i => i.name === 'Apple')).toBe(true)
  })

  it('should return all items when query is below minChars', () => {
    const { result } = renderHook(() =>
      useLocalSearch(items, searchFn, { minChars: 3, debounceMs: 150 })
    )

    act(() => {
      result.current.setQuery('ap')
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Query below minChars means all items are shown
    expect(result.current.results).toHaveLength(5)
  })

  it('should filter by category', () => {
    const { result } = renderHook(() =>
      useLocalSearch(items, searchFn, { debounceMs: 150, minChars: 1 })
    )

    act(() => {
      result.current.setQuery('vegetable')
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    const names = result.current.results.map(i => i.name)
    expect(names).toContain('Carrot')
    expect(names).toContain('Daikon')
    expect(names).not.toContain('Apple')
  })

  it('should clear search and restore all items', () => {
    const { result } = renderHook(() =>
      useLocalSearch(items, searchFn, { debounceMs: 150, minChars: 1 })
    )

    act(() => {
      result.current.setQuery('apple')
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    act(() => {
      result.current.clearSearch()
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current.query).toBe('')
    expect(result.current.results).toHaveLength(5)
  })

  it('should handle undefined items gracefully', () => {
    const { result } = renderHook(() =>
      useLocalSearch<Item>(undefined, searchFn)
    )

    expect(result.current.results).toHaveLength(0)
  })

  it('should return empty results for no matching query', () => {
    const { result } = renderHook(() =>
      useLocalSearch(items, searchFn, { debounceMs: 150, minChars: 1 })
    )

    act(() => {
      result.current.setQuery('zzznomatch')
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current.results).toHaveLength(0)
  })

  it('should expose debouncedQuery that updates after debounce', () => {
    const { result } = renderHook(() =>
      useLocalSearch(items, searchFn, { debounceMs: 200 })
    )

    // Before setting query, debouncedQuery is ''
    expect(result.current.debouncedQuery).toBe('')

    act(() => {
      result.current.setQuery('banana')
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current.debouncedQuery).toBe('banana')
  })

  it('should update query immediately but filter after debounce', () => {
    const { result } = renderHook(() =>
      useLocalSearch(items, searchFn, { debounceMs: 300, minChars: 1 })
    )

    act(() => {
      result.current.setQuery('carrot')
    })

    // Query is updated immediately
    expect(result.current.query).toBe('carrot')

    // But debouncedQuery hasn't fired yet
    expect(result.current.debouncedQuery).toBe('')

    // After debounce fires
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.debouncedQuery).toBe('carrot')
  })
})
