/**
 * Middleware Index
 * Exports all middleware functions
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { requestMetrics } from './metrics';

export * from './rateLimiter';
export * from './security';
export * from './upload';
export * from './websocket';
export * from './metrics';

// Legacy middleware export
export function loggerMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void): void {
  const now = new Date().toISOString();
  const startTime = Date.now();

  // Track request
  requestMetrics.requests++;

  console.log(`[${now}] ${req.method} ${req.url}`);

  // Track response metrics when response finishes
  const originalEnd = res.end.bind(res);
  res.end = (...args: any[]) => {
    const responseTime = Date.now() - startTime;
    requestMetrics.responseTimes.push(responseTime);

    // Limit stored response times to prevent memory growth
    if (requestMetrics.responseTimes.length > 1000) {
      requestMetrics.responseTimes = requestMetrics.responseTimes.slice(-500);
    }

    // Track errors (status code >= 400)
    if (res.statusCode >= 400) {
      requestMetrics.errors++;
    }

    return originalEnd(...args);
  };

  next();
}
