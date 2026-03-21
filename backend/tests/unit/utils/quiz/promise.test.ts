/**
 * Quiz Promise Utility Tests
 *
 * Tests for the withTimeout() helper which wraps a promise with a time limit.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withTimeout } from '../../../../src/utils/quiz/promise'

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---------------------------------------------------------------------------
  // Happy path - promise resolves before timeout
  // ---------------------------------------------------------------------------

  it('should resolve with the promise value when resolved before timeout', async () => {
    const p = Promise.resolve('hello')
    const result = await withTimeout(p, 1000, 'test-op')
    expect(result).toBe('hello')
  })

  it('should resolve with numeric value', async () => {
    const p = Promise.resolve(42)
    const result = await withTimeout(p, 5000)
    expect(result).toBe(42)
  })

  it('should resolve with object value', async () => {
    const value = { data: 'test', count: 3 }
    const p = Promise.resolve(value)
    const result = await withTimeout(p, 5000)
    expect(result).toEqual(value)
  })

  it('should resolve with null', async () => {
    const p = Promise.resolve(null)
    const result = await withTimeout(p, 5000)
    expect(result).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // Timeout expiry
  // ---------------------------------------------------------------------------

  it('should reject with timeout error message when timeout expires', async () => {
    const neverResolves = new Promise<never>(() => {})
    const resultPromise = withTimeout(neverResolves, 100, 'my-op')

    vi.advanceTimersByTime(100)

    await expect(resultPromise).rejects.toThrow('my-op timeout 100ms')
  })

  it('should include ms in the error message', async () => {
    const neverResolves = new Promise<never>(() => {})
    const resultPromise = withTimeout(neverResolves, 500, 'fetch')

    vi.advanceTimersByTime(500)

    await expect(resultPromise).rejects.toThrow('500ms')
  })

  it('should include the label in the error message', async () => {
    const neverResolves = new Promise<never>(() => {})
    const resultPromise = withTimeout(neverResolves, 200, 'db-query')

    vi.advanceTimersByTime(200)

    await expect(resultPromise).rejects.toThrow('db-query')
  })

  it('should use default label "op" when no label provided', async () => {
    const neverResolves = new Promise<never>(() => {})
    const resultPromise = withTimeout(neverResolves, 50)

    vi.advanceTimersByTime(50)

    await expect(resultPromise).rejects.toThrow('op timeout 50ms')
  })

  // ---------------------------------------------------------------------------
  // Promise rejection propagation
  // ---------------------------------------------------------------------------

  it('should propagate rejection from the inner promise', async () => {
    const error = new Error('inner error')
    const p = Promise.reject(error)
    await expect(withTimeout(p, 5000, 'op')).rejects.toThrow('inner error')
  })

  it('should propagate rejection before timeout fires', async () => {
    const p = Promise.reject(new Error('fast fail'))
    vi.advanceTimersByTime(0)
    await expect(withTimeout(p, 10000, 'op')).rejects.toThrow('fast fail')
  })

  // ---------------------------------------------------------------------------
  // Timer cleanup
  // ---------------------------------------------------------------------------

  it('should not leave dangling timer after resolution', async () => {
    const p = Promise.resolve('done')
    await withTimeout(p, 10000, 'op')
    // Advance well past the timeout - no rejection should occur
    vi.advanceTimersByTime(20000)
    // If we reach here without an unhandled rejection, timer was cleared
  })

  it('should not leave dangling timer after rejection', async () => {
    const p = Promise.reject(new Error('boom'))
    try {
      await withTimeout(p, 10000, 'op')
    } catch {
      // expected
    }
    // Advance well past the timeout - no extra rejection
    vi.advanceTimersByTime(20000)
  })
})
