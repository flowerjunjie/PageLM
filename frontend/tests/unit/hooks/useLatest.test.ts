/**
 * useLatest & useStableCallback Hook Unit Tests
 *
 * Tests for the latest value ref and stable callback hooks.
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLatest, useStableCallback } from '@/hooks/useLatest'

describe('useLatest', () => {
  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useLatest('initial'))
    expect(result.current.current).toBe('initial')
  })

  it('should always have the latest value without re-rendering', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useLatest(value),
      { initialProps: { value: 'first' } }
    )

    expect(result.current.current).toBe('first')

    rerender({ value: 'second' })
    expect(result.current.current).toBe('second')

    rerender({ value: 'third' })
    expect(result.current.current).toBe('third')
  })

  it('should handle object values', () => {
    const obj1 = { id: 1, name: 'Alice' }
    const obj2 = { id: 2, name: 'Bob' }

    const { result, rerender } = renderHook(
      ({ value }) => useLatest(value),
      { initialProps: { value: obj1 } }
    )

    expect(result.current.current).toBe(obj1)

    rerender({ value: obj2 })
    expect(result.current.current).toBe(obj2)
  })

  it('should handle number values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useLatest(value),
      { initialProps: { value: 0 } }
    )

    expect(result.current.current).toBe(0)
    rerender({ value: 42 })
    expect(result.current.current).toBe(42)
  })

  it('should handle undefined and null values', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string | null | undefined }) => useLatest(value),
      { initialProps: { value: 'initial' as string | null | undefined } }
    )

    rerender({ value: null })
    expect(result.current.current).toBeNull()

    rerender({ value: undefined })
    expect(result.current.current).toBeUndefined()
  })

  it('should maintain the same ref object across renders', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useLatest(value),
      { initialProps: { value: 'one' } }
    )

    const firstRef = result.current
    rerender({ value: 'two' })
    const secondRef = result.current

    // The ref object should be the same identity
    expect(firstRef).toBe(secondRef)
  })

  it('should handle function values', () => {
    const fn1 = () => 'fn1'
    const fn2 = () => 'fn2'

    const { result, rerender } = renderHook(
      ({ value }) => useLatest(value),
      { initialProps: { value: fn1 } }
    )

    expect(result.current.current).toBe(fn1)
    rerender({ value: fn2 })
    expect(result.current.current).toBe(fn2)
  })
})

describe('useStableCallback', () => {
  it('should return a stable function reference', () => {
    const cb = vi.fn()
    const { result, rerender } = renderHook(
      ({ callback }) => useStableCallback(callback),
      { initialProps: { callback: cb } }
    )

    const firstRef = result.current
    rerender({ callback: vi.fn() }) // Pass new callback
    const secondRef = result.current

    // The stable callback reference should remain the same
    expect(firstRef).toBe(secondRef)
  })

  it('should call the latest callback when invoked', () => {
    const firstCb = vi.fn(() => 'first')
    const secondCb = vi.fn(() => 'second')

    const { result, rerender } = renderHook(
      ({ callback }) => useStableCallback(callback),
      { initialProps: { callback: firstCb } }
    )

    // Call with first callback
    act(() => {
      result.current()
    })
    expect(firstCb).toHaveBeenCalledTimes(1)

    // Update to second callback
    rerender({ callback: secondCb })

    // Now stable callback should call second
    act(() => {
      result.current()
    })
    expect(secondCb).toHaveBeenCalledTimes(1)
    expect(firstCb).toHaveBeenCalledTimes(1) // Not called again
  })

  it('should forward arguments to the callback', () => {
    const cb = vi.fn()
    const { result } = renderHook(() => useStableCallback(cb))

    act(() => {
      result.current('arg1', 42, { key: 'value' })
    })

    expect(cb).toHaveBeenCalledWith('arg1', 42, { key: 'value' })
  })

  it('should return the callback return value', () => {
    const cb = vi.fn(() => 'result')
    const { result } = renderHook(() => useStableCallback(cb))

    let returnValue: string
    act(() => {
      returnValue = result.current()
    })

    expect(returnValue!).toBe('result')
  })
})
