/**
 * Middleware Index
 * Exports all middleware functions
 */

import type { IncomingMessage, ServerResponse } from 'http';

export * from './rateLimiter';
export * from './security';
export * from './upload';
export * from './websocket';

// Legacy middleware export
export function loggerMiddleware(req: IncomingMessage, _res: ServerResponse, next: () => void): void {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.url}`);
  next();
}
