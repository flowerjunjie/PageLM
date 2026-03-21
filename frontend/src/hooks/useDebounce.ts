import { useState, useEffect } from 'react';

/**
 * Debounce a value to delay updates until after a specified delay has passed
 * since the last change.
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 500ms)
 * @returns The debounced value
 *
 * @example
 * function SearchComponent() {
 *   const [searchTerm, setSearchTerm] = useState('');
 *   const debouncedSearchTerm = useDebounce(searchTerm, 500);
 *
 *   useEffect(() => {
 *     // This will only run 500ms after the user stops typing
 *     if (debouncedSearchTerm) {
 *       performSearch(debouncedSearchTerm);
 *     }
 *   }, [debouncedSearchTerm]);
 *
 *   return <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />;
 * }
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up timer to update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up timer if value changes before delay expires
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounce a callback function to delay its execution until after a specified
 * delay has passed since the last invocation.
 *
 * @param callback - The function to debounce
 * @param delay - The delay in milliseconds (default: 500ms)
 * @returns The debounced callback function
 *
 * @example
 * function SearchComponent() {
 *   const [results, setResults] = useState([]);
 *   const debouncedSearch = useDebouncedCallback(
 *     async (term: string) => {
 *       const data = await searchAPI(term);
 *       setResults(data);
 *     },
 *     500
 *   );
 *
 *   return <input onChange={(e) => debouncedSearch(e.target.value)} />;
 * }
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clean up timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useMemo(() => {
    return ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T;
  }, [callback, delay]);
}

import { useRef, useMemo } from 'react';
