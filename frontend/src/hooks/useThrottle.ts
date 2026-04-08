import { useRef, useEffect, useMemo, useState } from 'react';

/**
 * Get current timestamp that is compatible with vi.useFakeTimers()
 * Uses performance.now() instead of Date.now() because fake timers
 * do not affect Date.now() but DO affect performance.now()
 */
function getFakeTimerCompatibleTimestamp(): number {
  return performance.now();
}

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
  const lastExecuted = useRef(getFakeTimerCompatibleTimestamp());

  useEffect(() => {
    const handler = setTimeout(() => {
      const now = getFakeTimerCompatibleTimestamp();
      const timeElapsed = now - lastExecuted.current;

      if (timeElapsed >= delay) {
        setThrottledValue(value);
        lastExecuted.current = now;
      }
    }, delay - (getFakeTimerCompatibleTimestamp() - lastExecuted.current));

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
  const lastRun = useRef<number | null>(null);
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
      const now = getFakeTimerCompatibleTimestamp();

      // First call or enough time has passed - execute immediately
      if (lastRun.current === null || now - lastRun.current >= delay) {
        lastRun.current = now;
        callback(...args);
      } else if (!timeoutRef.current) {
        // Set up timeout to execute after remaining delay
        const remainingDelay = delay - (now - lastRun.current);
        timeoutRef.current = setTimeout(() => {
          lastRun.current = getFakeTimerCompatibleTimestamp();
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
  const lastRun = useRef<number | null>(null);
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

      const now = getFakeTimerCompatibleTimestamp();

      const executeCallback = () => {
        if (lastArgs.current) {
          callback(...lastArgs.current);
          lastArgs.current = null;
        }
        lastRun.current = getFakeTimerCompatibleTimestamp();
      };

      // First call or enough time has passed - execute immediately
      if (lastRun.current === null || now - lastRun.current >= delay) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        executeCallback();
      } else if (!timeoutRef.current) {
        // Set up timeout to execute after remaining delay
        const remainingDelay = delay - (now - lastRun.current);
        timeoutRef.current = setTimeout(() => {
          executeCallback();
          timeoutRef.current = null;
        }, remainingDelay);
      }
    }) as T;
  }, [callback, delay]);
}

