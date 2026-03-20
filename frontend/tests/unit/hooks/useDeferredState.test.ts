/**
 * useDeferredState Hook Unit Tests
 *
 * Tests for the deferred state hook that uses React transitions.
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDeferredState } from '@/hooks/useLatest'

describe('useDeferredState', () => {
  it('should initialize with the provided value', () => {
    const { result } = renderHook(() => useDeferredState('initial'))
    const [state] = result.current
    expect(state).toBe('initial')
  })

  it('should initialize with a factory function', () => {
    const { result } = renderHook(() => useDeferredState(() => 42))
    const [state] = result.current
    expect(state).toBe(42)
  })

  it('should provide a setter function', () => {
    const { result } = renderHook(() => useDeferredState('initial'))
    const [, setState] = result.current
    expect(typeof setState).toBe('function')
  })

  it('should update state when setter is called with value', async () => {
    const { result } = renderHook(() => useDeferredState('initial'))

    act(() => {
      const [, setState] = result.current
      setState('updated')
    })

    const [state] = result.current
    expect(state).toBe('updated')
  })

  it('should update state when setter is called with updater function', async () => {
    const { result } = renderHook(() => useDeferredState(0))

    act(() => {
      const [, setState] = result.current
      setState((prev) => prev + 1)
    })

    const [state] = result.current
    expect(state).toBe(1)
  })

  it('should handle number initial state', () => {
    const { result } = renderHook(() => useDeferredState(100))
    const [state] = result.current
    expect(state).toBe(100)
  })

  it('should handle object initial state', () => {
    const initialObj = { name: 'Alice', age: 30 }
    const { result } = renderHook(() => useDeferredState(initialObj))
    const [state] = result.current
    expect(state).toEqual(initialObj)
  })

  it('should handle array initial state', () => {
    const initialArr = [1, 2, 3]
    const { result } = renderHook(() => useDeferredState(initialArr))
    const [state] = result.current
    expect(state).toEqual(initialArr)
  })

  it('should update multiple times in sequence', async () => {
    const { result } = renderHook(() => useDeferredState(0))

    act(() => {
      const [, setState] = result.current
      setState(1)
    })

    act(() => {
      const [, setState] = result.current
      setState(2)
    })

    act(() => {
      const [, setState] = result.current
      setState(3)
    })

    const [state] = result.current
    expect(state).toBe(3)
  })

  it('should handle boolean state', () => {
    const { result } = renderHook(() => useDeferredState(false))
    const [state] = result.current
    expect(state).toBe(false)

    act(() => {
      const [, setState] = result.current
      setState(true)
    })

    const [updatedState] = result.current
    expect(updatedState).toBe(true)
  })
})
