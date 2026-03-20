/**
 * Security Middleware
 * Provides comprehensive security headers and protections
 */

import { createRateLimiter } from './rateLimiter';

/**
 * Security Headers Middleware
 * Implements OWASP recommended security headers
 */
export function securityHeaders(req: any, res: any, next: Function) {
  // Content Security Policy - Restrict sources of content
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://cdn.jsdelivr.net",
    "connect-src 'self' https://api.deepseek.com wss://api.deepseek.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  // Set security headers
  res.setHeader('Content-Security-Policy', cspDirectives);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // Remove server information
  res.removeHeader('X-Powered-By');

  next();
}

/**
 * Request Size Limiter
 * Prevents DoS attacks through large payloads
 */
export function requestSizeLimiter(maxSize: number = 10 * 1024 * 1024) {
  return (req: any, res: any, next: Function) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');

    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Payload Too Large',
        message: `Request body too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
      });
    }

    next();
  };
}

/**
 * Sanitize Input Middleware
 * Removes potentially dangerous input patterns
 */
export function sanitizeInput(req: any, res: any, next: Function) {
  const sanitizeString = (str: string): string => {
    // Remove null bytes and control characters
    return str.replace(/[\x00-\x1F\x7F]/g, '').trim();
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[sanitizeString(key)] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
}

/**
 * Prevent Path Traversal
 */
export function preventPathTraversal(req: any, res: any, next: Function) {
  const checkPath = (path: string) => {
    if (path.includes('..') || path.includes('\\') || path.includes('\0')) {
      return true;
    }
    return false;
  };

  if (checkPath(req.url) || checkPath(req.path)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid path',
    });
  }

  next();
}

/**
 * Validate Content Type for POST/PUT/PATCH
 */
export function validateContentType(req: any, res: any, next: Function) {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];

    if (!contentType) {
      return res.status(415).json({
        error: 'Unsupported Media Type',
        message: 'Content-Type header is required',
      });
    }

    const validTypes = [
      'application/json',
      'multipart/form-data',
      'application/x-www-form-urlencoded',
      'text/plain',
    ];

    const isValid = validTypes.some(type => contentType.includes(type));

    if (!isValid) {
      return res.status(415).json({
        error: 'Unsupported Media Type',
        message: `Content-Type ${contentType} is not supported`,
      });
    }
  }

  next();
}

/**
 * Compose multiple middleware functions
 */
export function composeMiddleware(...middlewares: Function[]) {
  return (req: any, res: any, next: Function) => {
    let index = 0;

    function dispatch(i: number) {
      if (i >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[i];
      middleware(req, res, () => dispatch(i + 1));
    }

    dispatch(0);
  };
}

/**
 * Default security middleware stack
 */
export const defaultSecurityMiddleware = composeMiddleware(
  securityHeaders,
  createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 100 }),
  requestSizeLimiter(10 * 1024 * 1024),
  sanitizeInput,
  preventPathTraversal,
  validateContentType,
);
