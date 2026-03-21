/**
 * useDebounce Hook Unit Tests
 *
 * Tests for the debounce hook implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDebounce, useDebouncedCallback } from '@/hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    // Update value
    rerender({ value: 'updated', delay: 500 })
    expect(result.current).toBe('initial') // Should still be initial

    // Fast forward timers
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe('updated')
  })

  it('should reset timer on rapid updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    // First update
    rerender({ value: 'update1', delay: 500 })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('initial')

    // Second update before timer expires
    rerender({ value: 'update2', delay: 500 })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('initial') // Still initial

    // Complete the delay
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe('update2')
  })

  it('should use default delay of 500ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })

    act(() => {
      vi.advanceTimersByTime(499)
    })
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('updated')
  })

  it('should handle number values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 0 } }
    )

    rerender({ value: 100 })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toBe(100)
  })

  it('should handle object values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: { a: 1 } } }
    )

    const newValue = { a: 2, b: 3 }
    rerender({ value: newValue })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toEqual(newValue)
  })

  it('should handle array values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: [1, 2] } }
    )

    rerender({ value: [1, 2, 3] })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toEqual([1, 2, 3])
  })

  it('should clean up timer on unmount', () => {
    const { rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })
    unmount()

    // Should not throw when timer fires after unmount
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(500)
      })
    }).not.toThrow()
  })
})

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should debounce callback execution', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    // Call multiple times
    act(() => {
      result.current('arg1')
      result.current('arg2')
      result.current('arg3')
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Should only be called once with last argument
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('arg3')
  })

  it('should pass correct arguments to callback', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => {
      result.current('a', 'b', 'c')
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(callback).toHaveBeenCalledWith('a', 'b', 'c')
  })

  it('should use default delay of 500ms', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback))

    act(() => {
      result.current()
    })

    act(() => {
      vi.advanceTimersByTime(499)
    })
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(callback).toHaveBeenCalled()
  })

  it('should cancel previous timer on new call', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    act(() => {
      result.current('first')
    })

    act(() => {
      vi.advanceTimersByTime(400)
    })

    act(() => {
      result.current('second')
    })

    act(() => {
      vi.advanceTimersByTime(400)
    })

    // First call should not have executed
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('second')
  })

  it('should clean up on unmount', () => {
    const callback = vi.fn()
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 500))

    act(() => {
      result.current()
    })

    unmount()

    // Should not throw or call callback after unmount
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(500)
      })
    }).not.toThrow()

    expect(callback).not.toHaveBeenCalled()
  })
})
