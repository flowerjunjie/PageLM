import { useRef, useEffect } from 'react';

/**
 * useLatest - Access latest values in callbacks without adding them to dependency arrays
 * Prevents effect re-runs while avoiding stale closures
 *
 * @example
 * function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
 *   const [query, setQuery] = useState('')
 *   const onSearchRef = useLatest(onSearch)
 *
 *   useEffect(() => {
 *     const timeout = setTimeout(() => onSearchRef.current(query), 300)
 *     return () => clearTimeout(timeout)
 *   }, [query]) // onSearch not needed in deps
 * }
 */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

/**
 * useStableCallback - Creates a stable callback reference that always has the latest values
 * Useful for event handlers passed to child components
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const ref = useLatest(callback);
  return useRef((...args: any[]) => ref.current(...args)).current as T;
}

/**
 * useDeferredState - Defers state updates to non-urgent transitions
 * Helps maintain UI responsiveness during frequent updates
 */
export function useDeferredState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState(initialState);
  const [isPending, startTransition] = useTransition();

  const setDeferredState = (value: T | ((prev: T) => T)) => {
    startTransition(() => {
      setState(value);
    });
  };

  return [state, setDeferredState];
}

import { useState, useTransition } from 'react';
