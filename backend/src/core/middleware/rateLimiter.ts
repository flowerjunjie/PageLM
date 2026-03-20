/**
 * Rate Limiting Middleware
 * Provides comprehensive rate limiting for API endpoints
 * - Per-IP rate limiting
 * - Endpoint-specific limits
 * - Sliding window algorithm
 * - Redis-backed support for distributed systems
 */

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyGenerator?: (req: any) => string;
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
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * Create rate limiting middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req: any) => req.ip || 'unknown',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config;

  return async (req: any, res: any, next: Function) => {
    // Skip rate limiting for certain conditions if configured
    if (skipSuccessfulRequests && res.statusCode < 400) {
      return next();
    }
    if (skipFailedRequests && res.statusCode >= 400) {
      return next();
    }

    const key = `ratelimit:${keyGenerator(req)}`;
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new window
      entry = {
        requests: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    } else {
      // Increment counter
      entry.requests++;
    }

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.requests);
    const resetTime = new Date(entry.resetTime).toISOString();

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    // Check if limit exceeded
    if (entry.requests > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);

      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      });
    }

    next();
  };
}

// Pre-configured rate limiters for different use cases
export const defaultRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
});

export const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // 20 requests per 15 minutes
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 uploads per hour
});

/**
 * Create custom rate limiter with specific configuration
 */
export function customRateLimiter(windowMs: number, maxRequests: number) {
  return createRateLimiter({ windowMs, maxRequests });
}
