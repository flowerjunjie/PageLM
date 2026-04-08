/**
 * useThrottle Hook Unit Tests
 *
 * Tests for throttling hooks: useThrottle, useThrottledCallback,
 * and useThrottledCallbackWithFinalCall
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'

// Note: These tests use fake timers to control async behavior
// vi.useFakeTimers() is used to advance time manually

import { useThrottle, useThrottledCallback, useThrottledCallbackWithFinalCall } from '@/hooks/useThrottle'

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useThrottle('initial', 100))

    expect(result.current).toBe('initial')
  })

  it('should update value after delay', async () => {
    const { result, rerender } = renderHook(({ value }) => useThrottle(value, 100), {
      initialProps: { value: 'initial' },
    })

    // Change value
    rerender({ value: 'updated' })

    // Should still have old value before delay
    expect(result.current).toBe('initial')

    // Advance time past delay
    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Now should have new value
    expect(result.current).toBe('updated')
  })

  it('should use default delay of 500ms', async () => {
    const { result, rerender } = renderHook(({ value }) => useThrottle(value), {
      initialProps: { value: 'initial' },
    })

    rerender({ value: 'updated' })

    act(() => {
      vi.advanceTimersByTime(499)
    })

    // Should still be old value
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(1) // 500ms total
    })

    expect(result.current).toBe('updated')
  })

  it('should handle different value types', async () => {
    const { result, rerender } = renderHook(({ value }) => useThrottle(value, 100), {
      initialProps: { value: 0 },
    })

    rerender({ value: 42 })
    act(() => { vi.advanceTimersByTime(100) })
    expect(result.current).toBe(42)

    rerender({ value: { key: 'value' } })
    act(() => { vi.advanceTimersByTime(100) })
    expect(result.current).toEqual({ key: 'value' })
  })
})

describe('useThrottledCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should call callback immediately on first invocation', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottledCallback(callback, 100))

    act(() => {
      result.current()
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should not call callback again within delay period', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottledCallback(callback, 100))

    act(() => {
      result.current()
    })
    expect(callback).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(50)
      result.current()
    })
    expect(callback).toHaveBeenCalledTimes(1) // Still 1, not called again
  })

  it('should call callback again after delay', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottledCallback(callback, 100))

    act(() => {
      result.current()
    })
    expect(callback).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(100)
      result.current()
    })
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('should pass arguments to callback', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottledCallback(callback, 100))

    act(() => {
      result.current('arg1', 'arg2')
    })

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('should schedule delayed call if invoked during cooldown', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottledCallback(callback, 100))

    act(() => {
      result.current('first')
    })
    expect(callback).toHaveBeenCalledWith('first')

    // Invoke during cooldown
    act(() => {
      vi.advanceTimersByTime(50)
      result.current('second')
    })
    expect(callback).toHaveBeenCalledTimes(1) // Not yet called

    // Advance past remaining delay
    act(() => {
      vi.advanceTimersByTime(50) // 100ms total from first call
      vi.runAllTimers()
    })
    expect(callback).toHaveBeenCalledWith('second')
  })

  it('should cleanup timeout on unmount', () => {
    const callback = vi.fn()
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    const { result, unmount } = renderHook(() => useThrottledCallback(callback, 100))

    act(() => {
      result.current('first')
    })

    act(() => {
      vi.advanceTimersByTime(50)
      result.current('second')
    })

    unmount()

    // Should have called clearTimeout during cleanup
    expect(clearTimeoutSpy).toHaveBeenCalled()
  })
})

describe('useThrottledCallbackWithFinalCall', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should call callback immediately on first invocation', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottledCallbackWithFinalCall(callback, 100))

    act(() => {
      result.current()
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should not call callback again within delay period', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottledCallbackWithFinalCall(callback, 100))

    act(() => {
      result.current()
    })
    expect(callback).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(50)
      result.current()
    })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should call with latest arguments when delay expires', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottledCallbackWithFinalCall(callback, 100))

    act(() => {
      result.current('first')
    })
    expect(callback).toHaveBeenCalledWith('first')

    act(() => {
      vi.advanceTimersByTime(50)
      result.current('second')
    })
    expect(callback).toHaveBeenCalledTimes(1) // Not called yet

    act(() => {
      vi.advanceTimersByTime(50)
      vi.runAllTimers()
    })
    expect(callback).toHaveBeenCalledWith('second')
  })

  it('should call only once with latest args when many rapid calls', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottledCallbackWithFinalCall(callback, 100))

    act(() => {
      result.current('call1')
    })

    // Many rapid calls during cooldown
    for (let i = 2; i <= 5; i++) {
      act(() => {
        vi.advanceTimersByTime(20)
        result.current(`call${i}`)
      })
    }

    // Only initial call happened so far
    expect(callback).toHaveBeenCalledTimes(1)

    // Let delay expire
    act(() => {
      vi.advanceTimersByTime(100)
      vi.runAllTimers()
    })

    // Only one final call with latest args
    expect(callback).toHaveBeenCalledTimes(2) // Initial + final
    expect(callback).toHaveBeenLastCalledWith('call5')
  })

  it('should pass arguments to callback', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottledCallbackWithFinalCall(callback, 100))

    act(() => {
      result.current('arg1', 42, { key: 'value' })
    })

    expect(callback).toHaveBeenCalledWith('arg1', 42, { key: 'value' })
  })

  it('should clear pending timeout when called after delay expires', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottledCallbackWithFinalCall(callback, 100))

    act(() => {
      result.current('first')
    })
    expect(callback).toHaveBeenCalledWith('first')

    // Wait for delay to expire
    act(() => {
      vi.advanceTimersByTime(100)
      result.current('second')
    })
    expect(callback).toHaveBeenCalledWith('second')

    // Should not have extra calls
    act(() => {
      vi.advanceTimersByTime(100)
      vi.runAllTimers()
    })
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('should cleanup timeout on unmount', () => {
    const callback = vi.fn()
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    const { result, unmount } = renderHook(() => useThrottledCallbackWithFinalCall(callback, 100))

    act(() => {
      result.current('first')
    })

    act(() => {
      vi.advanceTimersByTime(50)
      result.current('second')
    })

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
  })
})
