import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useTransition } from 'react';

/**
 * Lazy state initialization - runs initializer function only once
 * Use for expensive initial values from localStorage, JSON parsing, building indexes
 *
 * @example
 * // ❌ WRONG: Runs JSON.parse on every render
 * const [settings, setSettings] = useState(JSON.parse(localStorage.getItem('settings') || '{}'))
 *
 * // ✅ CORRECT: Runs only on initial render
 * const [settings, setSettings] = useState(() =>
 *   JSON.parse(localStorage.getItem('settings') || '{}')
 * )
 */
export function useLazyState<T>(initializer: () => T): [T, (value: T | ((prev: T) => T)) => void] {
  return useState(initializer);
}

/**
 * Storage cache with automatic invalidation
 * Caches localStorage/sessionStorage reads to avoid expensive synchronous operations
 */
const storageCache = new Map<string, string | null>();

export function useCachedLocalStorage(key: string): [string | null, (value: string) => void, () => void] {
  const [value, setValue] = useState<string | null>(() => {
    if (storageCache.has(key)) {
      return storageCache.get(key)!;
    }
    const stored = localStorage.getItem(key);
    storageCache.set(key, stored);
    return stored;
  });

  const setCachedValue = (newValue: string) => {
    localStorage.setItem(key, newValue);
    storageCache.set(key, newValue);
    setValue(newValue);
  };

  const removeCachedValue = () => {
    localStorage.removeItem(key);
    storageCache.delete(key);
    setValue(null);
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        const newValue = e.newValue;
        storageCache.set(key, newValue);
        setValue(newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [value, setCachedValue, removeCachedValue];
}

/**
 * Derived state subscription - re-renders only when boolean changes, not continuous values
 * Reduces re-renders for width/scroll/size-based state
 *
 * @example
 * // ❌ WRONG: Re-renders on every pixel change
 * const width = useWindowWidth()
 * const isMobile = width < 768
 *
 * // ✅ CORRECT: Re-renders only when boolean changes
 * const isMobile = useMediaQuery('(max-width: 767px)')
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const updateMatches = () => setMatches(mediaQuery.matches);

    mediaQuery.addEventListener('change', updateMatches);
    return () => mediaQuery.removeEventListener('change', updateMatches);
  }, [query]);

  return matches;
}

/**
 * Memoized component factory
 */
export function createMemoComponent<T extends object>(
  Component: React.ComponentType<T>,
  areEqual?: (prevProps: T, nextProps: T) => boolean
): React.MemoExoticComponent<React.ComponentType<T>> {
  return memo(Component, areEqual);
}

/**
 * Optimized array operations - combine multiple iterations into one
 */
export function useArrayFilter<T>(
  array: T[],
  predicates: Array<(item: T) => boolean>
): T[][] {
  return useMemo(() => {
    const results: T[][] = Array.from({ length: predicates.length }, () => []);

    for (const item of array) {
      predicates.forEach((predicate, index) => {
        if (predicate(item)) {
          results[index].push(item);
        }
      });
    }

    return results;
  }, [array, predicates]);
}

/**
 * Index map builder for O(1) lookups
 * Use instead of repeated .find() calls
 */
export function buildIndexMap<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Map<K, T> {
  const map = new Map<K, T>();
  for (const item of items) {
    map.set(keyFn(item), item);
  }
  return map;
}

/**
 * Re-export useLatest from the separate file
 */
export { useLatest, useStableCallback } from './useLatest';
