/**
 * ApiClient Advanced Tests
 *
 * Additional tests for caching, retry logic, and all HTTP methods.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockFetchResponse } from '../../mocks/api'

vi.mock('@/config/env', () => ({
  env: {
    backend: 'http://localhost:3000',
    timeout: 90000,
  },
}))

describe('apiClient advanced behavior', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    // Reset module registry so each test gets a fresh apiClient instance
    vi.resetModules()
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should use text response for text content type', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/plain' }),
      json: () => Promise.resolve('text'),
      text: () => Promise.resolve('Hello World'),
    } as Response)

    const { api } = await import('@/lib/apiClient')
    const result = await api.get('/text-endpoint', { retries: 0 })
    expect(result.status).toBe(200)
  })

  it('should include Content-Type application/json header', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockFetchResponse({ id: 1 }, 200, { 'content-type': 'application/json' })
    )

    const { api } = await import('@/lib/apiClient')
    await api.post('/endpoint', { data: 'test' }, { retries: 0 })

    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  it('should make PUT request to correct URL', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockFetchResponse({ updated: true }, 200, { 'content-type': 'application/json' })
    )

    const { api } = await import('@/lib/apiClient')
    await api.put('/items/5', { name: 'Updated' }, { retries: 0 })

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/items/5')
    expect(options.method).toBe('PUT')
  })

  it('should make PATCH request to correct URL', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockFetchResponse({ patched: true }, 200, { 'content-type': 'application/json' })
    )

    const { api } = await import('@/lib/apiClient')
    await api.patch('/items/5', { name: 'Patched' }, { retries: 0 })

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/items/5')
    expect(options.method).toBe('PATCH')
  })

  it('should make DELETE request to correct URL', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockFetchResponse(null, 204, { 'content-type': 'application/json' })
    )

    const { api } = await import('@/lib/apiClient')
    await api.delete('/items/5', { retries: 0 })

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/items/5')
    expect(options.method).toBe('DELETE')
  })

  it('should return cached: false for new responses', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockFetchResponse({ data: 1 }, 200, { 'content-type': 'application/json' })
    )

    const { api } = await import('@/lib/apiClient')
    const result = await api.get('/endpoint', { retries: 0 })
    expect(result.cached).toBe(false)
  })

  it('should return cached: true for cached responses', async () => {
    const responseData = { items: 'data' }
    mockFetch.mockResolvedValueOnce(
      createMockFetchResponse(responseData, 200, { 'content-type': 'application/json' })
    )

    const { api } = await import('@/lib/apiClient')

    // First request - sets cache
    await api.get('/cacheable', { cache: 'force-cache', retries: 0 })

    // Second request - should be cached
    const cachedResult = await api.get('/cacheable', { cache: 'force-cache', retries: 0 })
    expect(cachedResult.cached).toBe(true)
    expect(cachedResult.data).toEqual(responseData)
    // fetch should only have been called once
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should clear cache with clearCache()', async () => {
    const responseData = { value: 42 }
    mockFetch.mockResolvedValue(
      createMockFetchResponse(responseData, 200, { 'content-type': 'application/json' })
    )

    const { api } = await import('@/lib/apiClient')

    // Cache a response
    await api.get('/cached-item', { cache: 'force-cache', retries: 0 })
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Clear cache
    api.clearCache()

    // Should make a new fetch after cache is cleared
    await api.get('/cached-item', { cache: 'force-cache', retries: 0 })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should clear cache with pattern', async () => {
    mockFetch.mockResolvedValue(
      createMockFetchResponse({ data: 1 }, 200, { 'content-type': 'application/json' })
    )

    const { api } = await import('@/lib/apiClient')

    // Cache two endpoints
    await api.get('/users/list', { cache: 'force-cache', retries: 0 })
    await api.get('/posts/list', { cache: 'force-cache', retries: 0 })
    expect(mockFetch).toHaveBeenCalledTimes(2)

    // Clear only users cache
    api.clearCache('/users')

    // Fetching users should make new request, posts should still be cached
    await api.get('/users/list', { cache: 'force-cache', retries: 0 })
    expect(mockFetch).toHaveBeenCalledTimes(3)

    const postsCached = await api.get('/posts/list', { cache: 'force-cache', retries: 0 })
    expect(postsCached.cached).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(3) // No new fetch for posts
  })

  it('should not retry on 4xx client errors', async () => {
    mockFetch.mockResolvedValue(
      createMockFetchResponse({ message: 'Bad Request' }, 400, { 'content-type': 'application/json' })
    )

    const { api } = await import('@/lib/apiClient')

    try {
      await api.get('/bad-request', { retries: 3 })
    } catch (err) {
      // Expected error
    }

    // Should only have called fetch once (no retry for 400)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should make multiple requests for different endpoints', async () => {
    mockFetch
      .mockResolvedValueOnce(
        createMockFetchResponse({ id: 1 }, 200, { 'content-type': 'application/json' })
      )
      .mockResolvedValueOnce(
        createMockFetchResponse({ id: 2 }, 200, { 'content-type': 'application/json' })
      )

    const { api } = await import('@/lib/apiClient')

    const [result1, result2] = await Promise.all([
      api.get('/endpoint-1', { retries: 0 }),
      api.get('/endpoint-2', { retries: 0 })
    ])

    expect(result1.data).toEqual({ id: 1 })
    expect(result2.data).toEqual({ id: 2 })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should handle blob response type', async () => {
    const blobData = new Blob(['binary data'])
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/octet-stream' }),
      json: () => Promise.reject(),
      text: () => Promise.reject(),
      blob: () => Promise.resolve(blobData),
    } as unknown as Response)

    const { api } = await import('@/lib/apiClient')
    const result = await api.get('/binary', { retries: 0 })
    expect(result.status).toBe(200)
  })

  it('should pass custom headers in request', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockFetchResponse({}, 200, { 'content-type': 'application/json' })
    )

    const { api } = await import('@/lib/apiClient')
    await api.get('/endpoint', {
      headers: { 'Authorization': 'Bearer token123' },
      retries: 0
    })

    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers['Authorization']).toBe('Bearer token123')
  })
})

import { act } from '@testing-library/react'
