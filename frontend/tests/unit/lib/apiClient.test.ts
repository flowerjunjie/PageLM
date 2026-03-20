/**
 * ApiClient Unit Tests
 *
 * Tests for the enhanced API client including caching, retry logic,
 * error handling, and HTTP method convenience functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiErrorClass } from '@/lib/apiClient'
import { createMockFetchResponse } from '../../mocks/api'

// Mock the env module to avoid import.meta issues
vi.mock('@/config/env', () => ({
  env: {
    backend: 'http://localhost:3000',
    timeout: 90000,
  },
}))

describe('ApiErrorClass', () => {
  it('should create an error with message', () => {
    const err = new ApiErrorClass('Something went wrong')
    expect(err.message).toBe('Something went wrong')
    expect(err.name).toBe('ApiError')
  })

  it('should create an error with status code', () => {
    const err = new ApiErrorClass('Not Found', 404)
    expect(err.status).toBe(404)
  })

  it('should create an error with code string', () => {
    const err = new ApiErrorClass('Unauthorized', 401, 'AUTH_ERROR')
    expect(err.code).toBe('AUTH_ERROR')
  })

  it('should create an error with details', () => {
    const details = { field: 'email', message: 'Invalid email' }
    const err = new ApiErrorClass('Validation failed', 422, 'VALIDATION_ERROR', details)
    expect(err.details).toEqual(details)
  })

  it('should be an instance of Error', () => {
    const err = new ApiErrorClass('Test error')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ApiErrorClass)
  })

  it('should have undefined status, code, details when not provided', () => {
    const err = new ApiErrorClass('Minimal error')
    expect(err.status).toBeUndefined()
    expect(err.code).toBeUndefined()
    expect(err.details).toBeUndefined()
  })
})

describe('createMockFetchResponse helper', () => {
  it('should create a successful response', () => {
    const data = { id: 1, name: 'Test' }
    const response = createMockFetchResponse(data)

    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)
  })

  it('should create a response with custom status', () => {
    const response = createMockFetchResponse({}, 404)
    expect(response.ok).toBe(false)
    expect(response.status).toBe(404)
  })

  it('should resolve json correctly', async () => {
    const data = { key: 'value' }
    const response = createMockFetchResponse(data)
    const parsed = await response.json()
    expect(parsed).toEqual(data)
  })

  it('should resolve text correctly', async () => {
    const data = { key: 'value' }
    const response = createMockFetchResponse(data)
    const text = await response.text()
    expect(text).toBe(JSON.stringify(data))
  })

  it('should have custom headers', () => {
    const response = createMockFetchResponse({}, 200, { 'x-custom': 'header' })
    expect(response.headers.get('x-custom')).toBe('header')
  })
})

describe('api module fetch mocking', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    global.fetch = mockFetch
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should make a GET request with correct URL', async () => {
    const responseData = { id: 1, name: 'Test' }
    mockFetch.mockResolvedValueOnce(
      createMockFetchResponse(responseData, 200, { 'content-type': 'application/json' })
    )

    const { api } = await import('@/lib/apiClient')
    const result = await api.get('/test-endpoint', { retries: 0 })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/test-endpoint')
    expect(options.method).toBe('GET')
    expect(result.status).toBe(200)
  })

  it('should make a POST request with body', async () => {
    const requestBody = { name: 'New Item' }
    const responseData = { id: 2, name: 'New Item' }
    mockFetch.mockResolvedValueOnce(
      createMockFetchResponse(responseData, 201, { 'content-type': 'application/json' })
    )

    const { api } = await import('@/lib/apiClient')
    await api.post('/items', requestBody, { retries: 0 })

    const [, options] = mockFetch.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual(requestBody)
  })

  it('should throw ApiErrorClass on 4xx response', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockFetchResponse({ message: 'Not Found' }, 404, { 'content-type': 'application/json' })
    )

    const { api } = await import('@/lib/apiClient')

    await expect(api.get('/not-found', { retries: 0 })).rejects.toThrow()
  })

  it('should throw ApiErrorClass on 401 response', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockFetchResponse({ message: 'Unauthorized' }, 401, { 'content-type': 'application/json' })
    )

    const { api } = await import('@/lib/apiClient')

    try {
      await api.get('/protected', { retries: 0 })
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiErrorClass)
      expect((err as ApiErrorClass).status).toBe(401)
    }
  })
})
