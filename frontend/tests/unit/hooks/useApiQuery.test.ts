/**
 * useApiGet / useApiPost Hook Unit Tests
 *
 * Tests for the API hooks with React Query integration
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
    delete: vi.fn(),
  },
  apiClient: {},
  ApiErrorClass: class ApiErrorClass extends Error {
    status?: number
    code?: string
    constructor(message: string, status?: number, code?: string) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.code = code
    }
  },
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

import { useApiGet, useApiPost } from '@/hooks/useApiQuery'
import { api } from '@/lib/apiClient'

// Create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    )
  }
}

describe('useApiGet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch data successfully', async () => {
    const mockData = { id: 1, name: 'Test' }
    vi.mocked(api.get).mockResolvedValueOnce({
      data: mockData,
      status: 200,
      headers: new Headers(),
      cached: false,
    })

    const { result } = renderHook(
      () => useApiGet<{ id: number; name: string }>('/test-endpoint'),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockData)
    expect(api.get).toHaveBeenCalledWith('/test-endpoint')
  })

  it('should handle fetch errors', async () => {
    const error = new Error('Network error')
    vi.mocked(api.get).mockRejectedValueOnce(error)

    const { result } = renderHook(
      () => useApiGet('/error-endpoint'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeDefined()
  })

  it('should not fetch when enabled is false', () => {
    const { result } = renderHook(
      () => useApiGet('/disabled', { enabled: false }),
      { wrapper: createWrapper() }
    )

    expect(api.get).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })

  it('should use custom queryKey when provided', async () => {
    const mockData = [{ id: 1 }]
    vi.mocked(api.get).mockResolvedValueOnce({
      data: mockData,
      status: 200,
      headers: new Headers(),
      cached: false,
    })

    const { result } = renderHook(
      () => useApiGet('/endpoint', { cacheKey: ['custom', 'key'] }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockData)
  })

  it('should throw error when response has error field', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: undefined,
      error: new Error('API Error') as any,
      status: 400,
      headers: new Headers(),
      cached: false,
    })

    const { result } = renderHook(
      () => useApiGet('/bad-endpoint'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useApiPost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should make a POST request with data', async () => {
    const responseData = { id: 2, created: true }
    vi.mocked(api.post).mockResolvedValueOnce({
      data: responseData,
      status: 201,
      headers: new Headers(),
      cached: false,
    })

    const { result } = renderHook(
      () => useApiPost<{ id: number; created: boolean }, { name: string }>('/create'),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      result.current.mutate({ name: 'New Item' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.post).toHaveBeenCalledWith('/create', { name: 'New Item' })
    expect(result.current.data).toEqual(responseData)
  })

  it('should handle mutation errors', async () => {
    const error = new Error('Server Error')
    vi.mocked(api.post).mockRejectedValueOnce(error)

    const { result } = renderHook(
      () => useApiPost('/create'),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      result.current.mutate({})
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('should call onSuccess callback on success', async () => {
    const onSuccess = vi.fn()
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
      headers: new Headers(),
      cached: false,
    })

    const { result } = renderHook(
      () => useApiPost('/endpoint', { onSuccess }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      result.current.mutate({})
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('should call onError callback on failure', async () => {
    const onError = vi.fn()
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Fail'))

    const { result } = renderHook(
      () => useApiPost('/endpoint', { onError }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      result.current.mutate({})
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('should start in idle state (not pending) before mutation is called', () => {
    const { result } = renderHook(
      () => useApiPost('/endpoint'),
      { wrapper: createWrapper() }
    )

    // Before any mutation is called, isPending should be false
    expect(result.current.isPending).toBe(false)
    expect(result.current.isIdle).toBe(true)
  })
})
