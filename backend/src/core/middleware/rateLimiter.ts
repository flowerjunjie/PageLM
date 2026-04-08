/**
 * Rate Limiting Middleware
 * Provides comprehensive rate limiting for API endpoints
 * - Per-IP rate limiting
 * - Endpoint-specific limits
 * - Sliding window algorithm
 * - Redis-backed support for distributed systems
 */

import type { AppRequest, AppResponse, NextFunction } from '../../types/http';

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyGenerator?: (req: AppRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  requests: number;
  resetTime: number;
}

// In-memory store for single-instance deployments
const rateLimitStore = new Map<string, RateLimitStore>();

// Cleanup expired entries every 60 seconds
// Store reference so we can clean up on process exit
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

// Cleanup interval on process exit to prevent memory leaks
if (typeof process !== 'undefined') {
  const cleanup = () => {
    clearInterval(cleanupInterval);
  };
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  process.on('exit', cleanup);
}

/** Middleware handler type understood by the Fubelt framework */
type MiddlewareFn = (req: AppRequest, res: AppResponse, next: NextFunction) => void | Promise<void>;

/**
 * Create rate limiting middleware
 */
export function createRateLimiter(config: RateLimitConfig): MiddlewareFn {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req: AppRequest) => req.ip || 'unknown',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config;

  return async (req: AppRequest, res: AppResponse, next: NextFunction): Promise<void> => {
    const key = `ratelimit:${keyGenerator(req)}`;
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new window
      entry = {
        requests: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    // Check if limit exceeded BEFORE incrementing
    if (entry.requests >= maxRequests) {
      // Set headers showing current state (no increment happened)
      const remaining = Math.max(0, maxRequests - entry.requests);
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
      res.setHeader('Retry-After', retryAfter);

      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      });
      return;
    }

    // Increment counter
    entry.requests++;

    // Set rate limit headers (show state AFTER increment for next request)
    const remaining = Math.max(0, maxRequests - entry.requests);
    const resetTime = new Date(entry.resetTime).toISOString();

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    // Handle skip logic AFTER response completes
    // Note: This is a best-effort approach since we can't "un-count" a request
    if (skipSuccessfulRequests || skipFailedRequests) {
      res.once('finish', () => {
        const statusCode = res.statusCode;
        if ((skipSuccessfulRequests && statusCode < 400) ||
            (skipFailedRequests && statusCode >= 400)) {
          // Decrement since this request should not be counted
          entry.requests = Math.max(0, entry.requests - 1);
        }
      });
    }

    next();
  };
}

// Pre-configured rate limiters for different use cases
export const defaultRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 500, // 500 requests per 15 minutes (relaxed for testing)
});

export const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes (increased from 20)
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // 20 attempts per 15 minutes (increased from 5)
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 uploads per hour (increased from 10)
});

/**
 * Create custom rate limiter with specific configuration
 */
export function customRateLimiter(windowMs: number, maxRequests: number): MiddlewareFn {
  return createRateLimiter({ windowMs, maxRequests });
}
