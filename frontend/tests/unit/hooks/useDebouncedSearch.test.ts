/**
 * useDebouncedSearch Hook Unit Tests
 *
 * Tests for the debounced search hook with API integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('@/lib/apiClient', () => ({
  api: {
    get: vi.fn(),
  },
  apiClient: {},
}))

import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { api } from '@/lib/apiClient'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with empty query and no results', () => {
    const { result } = renderHook(
      () => useDebouncedSearch('/search'),
      { wrapper: createWrapper() }
    )

    expect(result.current.query).toBe('')
    expect(result.current.results).toBeUndefined()
    expect(result.current.isSearching).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should update query immediately when setQuery is called', () => {
    const { result } = renderHook(
      () => useDebouncedSearch('/search'),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.setQuery('test query')
    })

    expect(result.current.query).toBe('test query')
  })

  it('should not trigger search when query is below minChars', () => {
    const { result } = renderHook(
      () => useDebouncedSearch('/search', { minChars: 3, debounceMs: 100 }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.setQuery('ab')
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(api.get).not.toHaveBeenCalled()
  })

  it('should clear search state when clearSearch is called', () => {
    const { result } = renderHook(
      () => useDebouncedSearch('/search'),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.setQuery('test')
    })

    act(() => {
      result.current.clearSearch()
    })

    expect(result.current.query).toBe('')
    expect(result.current.results).toBeUndefined()
    expect(result.current.error).toBeNull()
    expect(result.current.isSearching).toBe(false)
  })

  it('should not search when enabled is false', () => {
    const { result } = renderHook(
      () => useDebouncedSearch('/search', { enabled: false, debounceMs: 100 }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.setQuery('test query')
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(api.get).not.toHaveBeenCalled()
  })

  it('should expose debouncedQuery that updates after debounce', () => {
    const { result } = renderHook(
      () => useDebouncedSearch('/search', { debounceMs: 300 }),
      { wrapper: createWrapper() }
    )

    expect(result.current.debouncedQuery).toBe('')

    act(() => {
      result.current.setQuery('hello')
    })

    // Before debounce fires
    expect(result.current.debouncedQuery).toBe('')

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // After debounce fires
    expect(result.current.debouncedQuery).toBe('hello')
  })

  it('should expose search function', () => {
    const { result } = renderHook(
      () => useDebouncedSearch('/search'),
      { wrapper: createWrapper() }
    )

    expect(typeof result.current.search).toBe('function')
  })

  it('should expose clearSearch function', () => {
    const { result } = renderHook(
      () => useDebouncedSearch('/search'),
      { wrapper: createWrapper() }
    )

    expect(typeof result.current.clearSearch).toBe('function')
  })

  it('should use search function that calls api.get with encoded query', async () => {
    vi.useRealTimers() // use real timers for async test
    const mockResults = [{ id: 1 }]
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { results: mockResults },
      status: 200,
      headers: new Headers(),
      cached: false,
      error: undefined,
    } as any)

    const { result } = renderHook(
      () => useDebouncedSearch('/search', { minChars: 1 }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      await result.current.search('hello world')
    })

    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining('q=hello%20world'),
      expect.any(Object)
    )
    vi.useFakeTimers()
  })

  it('should set error state when api.get throws', async () => {
    vi.useRealTimers()
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(
      () => useDebouncedSearch('/search', { minChars: 1 }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      await result.current.search('fail')
    })

    expect(result.current.error).not.toBeNull()
    expect(result.current.isSearching).toBe(false)
    vi.useFakeTimers()
  })

  it('should call onSuccess callback after successful search', async () => {
    vi.useRealTimers()
    const onSuccess = vi.fn()
    const mockResults = [{ id: 1 }, { id: 2 }]
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { results: mockResults },
      status: 200,
      headers: new Headers(),
      cached: false,
      error: undefined,
    } as any)

    const { result } = renderHook(
      () => useDebouncedSearch('/search', { minChars: 1, onSuccess }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      await result.current.search('query')
    })

    expect(onSuccess).toHaveBeenCalledWith(mockResults)
    vi.useFakeTimers()
  })

  it('should call onError callback when search fails', async () => {
    vi.useRealTimers()
    const onError = vi.fn()
    vi.mocked(api.get).mockRejectedValueOnce(new Error('API Error'))

    const { result } = renderHook(
      () => useDebouncedSearch('/search', { minChars: 1, onError }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      await result.current.search('query')
    })

    expect(onError).toHaveBeenCalledTimes(1)
    vi.useFakeTimers()
  })

  it('should handle response with items format', async () => {
    vi.useRealTimers()
    const mockData = [{ id: 1 }, { id: 2 }]
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { items: mockData },
      status: 200,
      headers: new Headers(),
      cached: false,
      error: undefined,
    } as any)

    const { result } = renderHook(
      () => useDebouncedSearch('/search', { minChars: 1 }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      await result.current.search('query')
    })

    expect(result.current.results).toEqual(mockData)
    vi.useFakeTimers()
  })

  it('should handle response with data format (array)', async () => {
    vi.useRealTimers()
    const mockData = [{ id: 1 }]
    vi.mocked(api.get).mockResolvedValueOnce({
      data: mockData,
      status: 200,
      headers: new Headers(),
      cached: false,
      error: undefined,
    } as any)

    const { result } = renderHook(
      () => useDebouncedSearch('/search', { minChars: 1 }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      await result.current.search('query')
    })

    expect(result.current.results).toEqual(mockData)
    vi.useFakeTimers()
  })
})
