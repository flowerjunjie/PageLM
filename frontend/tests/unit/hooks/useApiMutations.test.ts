/**
 * useApiPut / useApiDelete / useApiBatch Hook Unit Tests
 *
 * Tests for the remaining API mutation hooks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock the apiClient
vi.mock('@/lib/apiClient', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    clearCache: vi.fn(),
  },
  apiClient: {},
}))

// Mock the Toast hook
vi.mock('@/components/Toast', () => ({
  useToastActions: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}))

import { useApiPut, useApiDelete, useApiBatch, useApiInfinite } from '@/hooks/useApiQuery'
import { api } from '@/lib/apiClient'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useApiPut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should make a PUT request with variables', async () => {
    const responseData = { id: 1, name: 'Updated' }
    vi.mocked(api.put).mockResolvedValueOnce({
      data: responseData,
      status: 200,
      headers: new Headers(),
      cached: false,
    })

    const { result } = renderHook(
      () => useApiPut<{ id: number; name: string }, { name: string }>('/items/1'),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      result.current.mutate({ name: 'Updated' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.put).toHaveBeenCalledWith('/items/1', { name: 'Updated' })
    expect(result.current.data).toEqual(responseData)
  })

  it('should handle PUT errors', async () => {
    vi.mocked(api.put).mockRejectedValueOnce(new Error('Update failed'))

    const { result } = renderHook(
      () => useApiPut('/items/1'),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      result.current.mutate({})
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('should call onSuccess callback after successful PUT', async () => {
    const onSuccess = vi.fn()
    vi.mocked(api.put).mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
      headers: new Headers(),
      cached: false,
    })

    const { result } = renderHook(
      () => useApiPut('/endpoint', { onSuccess }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      result.current.mutate({})
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('should call onError callback after failed PUT', async () => {
    const onError = vi.fn()
    vi.mocked(api.put).mockRejectedValueOnce(new Error('Failed'))

    const { result } = renderHook(
      () => useApiPut('/endpoint', { onError }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      result.current.mutate({})
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('should start in idle state', () => {
    const { result } = renderHook(
      () => useApiPut('/endpoint'),
      { wrapper: createWrapper() }
    )

    expect(result.current.isPending).toBe(false)
    expect(result.current.isIdle).toBe(true)
  })
})

describe('useApiDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should make a DELETE request with ID in path', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({
      data: undefined,
      status: 204,
      headers: new Headers(),
      cached: false,
    })

    const { result } = renderHook(
      () => useApiDelete('/items'),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      result.current.mutate('123' as any)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.delete).toHaveBeenCalledWith('/items/123')
  })

  it('should handle DELETE errors', async () => {
    vi.mocked(api.delete).mockRejectedValueOnce(new Error('Delete failed'))

    const { result } = renderHook(
      () => useApiDelete('/items'),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      result.current.mutate('999' as any)
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('should call onSuccess after successful delete', async () => {
    const onSuccess = vi.fn()
    vi.mocked(api.delete).mockResolvedValueOnce({
      data: undefined,
      status: 204,
      headers: new Headers(),
      cached: false,
    })

    const { result } = renderHook(
      () => useApiDelete('/items', { onSuccess }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      result.current.mutate('1' as any)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('should call onError after failed delete', async () => {
    const onError = vi.fn()
    vi.mocked(api.delete).mockRejectedValueOnce(new Error('Failed'))

    const { result } = renderHook(
      () => useApiDelete('/items', { onError }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      result.current.mutate('bad' as any)
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(onError).toHaveBeenCalledTimes(1)
  })
})

describe('useApiBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send multiple POST requests in parallel', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { id: 1 }, status: 201, headers: new Headers(), cached: false })
      .mockResolvedValueOnce({ data: { id: 2 }, status: 201, headers: new Headers(), cached: false })

    const { result } = renderHook(
      () => useApiBatch<{ id: number }, { name: string }>('/items'),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      result.current.mutate([{ name: 'Item 1' }, { name: 'Item 2' }])
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(result.current.data).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('should handle batch errors', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Batch failed'))

    const { result } = renderHook(
      () => useApiBatch('/items'),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      result.current.mutate([{}])
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('should start in idle state', () => {
    const { result } = renderHook(
      () => useApiBatch('/items'),
      { wrapper: createWrapper() }
    )

    expect(result.current.isIdle).toBe(true)
  })
})

describe('useApiInfinite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch paginated data', async () => {
    const mockData = { items: [{ id: 1 }, { id: 2 }], total: 10 }
    vi.mocked(api.get).mockResolvedValueOnce({
      data: mockData,
      status: 200,
      headers: new Headers(),
      cached: false,
    })

    const { result } = renderHook(
      () => useApiInfinite<{ id: number }>('/items'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockData)
    expect(api.get).toHaveBeenCalledWith('/items?page=1&limit=20')
  })

  it('should handle errors in infinite query', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Fetch error'))

    const { result } = renderHook(
      () => useApiInfinite('/items'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('should not fetch when enabled is false', () => {
    const { result } = renderHook(
      () => useApiInfinite('/items', { enabled: false }),
      { wrapper: createWrapper() }
    )

    expect(api.get).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })
})
