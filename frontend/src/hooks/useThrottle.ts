import { useRef, useEffect, useMemo } from 'react';

/**
 * Throttle a value to update at most once every specified delay.
 *
 * @param value - The value to throttle
 * @param delay - The minimum time between updates in milliseconds (default: 500ms)
 * @returns The throttled value
 *
 * @example
 * function ScrollComponent() {
 *   const [scrollY, setScrollY] = useState(0);
 *   const throttledScrollY = useThrottle(scrollY, 100);
 *
 *   useEffect(() => {
 *     const handleScroll = () => setScrollY(window.scrollY);
 *     window.addEventListener('scroll', handleScroll);
 *     return () => window.removeEventListener('scroll', handleScroll);
 *   }, []);
 *
 *   // This will update at most once every 100ms, instead of on every scroll event
 *   return <div>Scroll position: {throttledScrollY}</div>;
 * }
 */
export function useThrottle<T>(value: T, delay: number = 500): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastExecuted = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      const now = Date.now();
      const timeElapsed = now - lastExecuted.current;

      if (timeElapsed >= delay) {
        setThrottledValue(value);
        lastExecuted.current = now;
      }
    }, delay - (Date.now() - lastExecuted.current));

    return () => clearTimeout(handler);
  }, [value, delay]);

  return throttledValue;
}

/**
 * Throttle a callback function to execute at most once every specified delay.
 *
 * @param callback - The function to throttle
 * @param delay - The minimum time between executions in milliseconds (default: 500ms)
 * @returns The throttled callback function
 *
 * @example
 * function ResizeComponent() {
 *   const handleResize = useThrottledCallback(() => {
 *     console.log('Window resized:', window.innerWidth);
 *   }, 200);
 *
 *   useEffect(() => {
 *     window.addEventListener('resize', handleResize);
 *     return () => window.removeEventListener('resize', handleResize);
 *   }, [handleResize]);
 *
 *   return <div>Resize the window (throttled!)</div>;
 * }
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): T {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useMemo(() => {
    return ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeElapsed = now - lastRun.current;

      if (timeElapsed >= delay) {
        // Enough time has passed, execute immediately
        lastRun.current = now;
        callback(...args);
      } else if (!timeoutRef.current) {
        // Set up timeout to execute after remaining delay
        const remainingDelay = delay - timeElapsed;
        timeoutRef.current = setTimeout(() => {
          lastRun.current = Date.now();
          callback(...args);
          timeoutRef.current = null;
        }, remainingDelay);
      }
    }) as T;
  }, [callback, delay]);
}

/**
 * Throttle a callback function and ensure the last call is always executed
 * after the delay expires (combines throttling with debouncing for the final call).
 *
 * @param callback - The function to throttle
 * @param delay - The minimum time between executions in milliseconds (default: 500ms)
 * @returns The throttled callback function with guaranteed final execution
 *
 * @example
 * function AutoSaveComponent() {
 *   const saveToServer = useThrottledCallbackWithFinalCall(async () => {
 *     await saveDocument();
 *   }, 1000);
 *
 *   return <textarea onChange={saveToServer} />;
 * }
 */
export function useThrottledCallbackWithFinalCall<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): T {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgs = useRef<Parameters<T> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useMemo(() => {
    return ((...args: Parameters<T>) => {
      // Store the latest arguments
      lastArgs.current = args;

      const now = Date.now();
      const timeElapsed = now - lastRun.current;

      const executeCallback = () => {
        if (lastArgs.current) {
          callback(...lastArgs.current);
          lastArgs.current = null;
        }
        lastRun.current = Date.now();
      };

      if (timeElapsed >= delay) {
        // Enough time has passed, execute immediately
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        executeCallback();
      } else if (!timeoutRef.current) {
        // Set up timeout to execute after remaining delay
        const remainingDelay = delay - timeElapsed;
        timeoutRef.current = setTimeout(() => {
          executeCallback();
          timeoutRef.current = null;
        }, remainingDelay);
      }
    }) as T;
  }, [callback, delay]);
}

import { useState } from 'react';
