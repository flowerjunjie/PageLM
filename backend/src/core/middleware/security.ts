/**
 * Security Middleware
 * Provides comprehensive security headers and protections
 */

import type { AppRequest, AppResponse, NextFunction } from '../../types/http';
import { createRateLimiter } from './rateLimiter';

/**
 * Security Headers Middleware
 * Implements OWASP recommended security headers
 */
export function securityHeaders(req: AppRequest, res: AppResponse, next: NextFunction): void {
  // Content Security Policy - Restrict sources of content
  // Content Security Policy - restrict sources of content
  // Note: 'unsafe-inline' and 'unsafe-eval' removed for security
  // If you need inline styles/scripts, use nonces or hashes instead
  const cspDirectives = [
    "default-src 'self'",
    // Allow CDN for static assets but prefer self-hosted alternatives in production
    `script-src 'self' ${process.env.NODE_ENV === 'development' ? "'unsafe-inline'" : ''} https://cdn.jsdelivr.net`,
    `style-src 'self' ${process.env.NODE_ENV === 'development' ? "'unsafe-inline'" : ''} https://cdn.jsdelivr.net`,
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://cdn.jsdelivr.net",
    // Support multiple LLM providers
    `connect-src 'self' https://*.googleapis.com https://*.openai.com https://*.anthropic.com https://*.grok.com https://*.ollama.ai wss://*`,
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
  return (req: AppRequest, res: AppResponse, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0');

    if (contentLength > maxSize) {
      res.status(413).json({
        error: 'Payload Too Large',
        message: `Request body too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
      });
      return;
    }

    next();
  };
}

/**
 * Sanitize Input Middleware
 * Removes potentially dangerous input patterns
 */
export function sanitizeInput(req: AppRequest, res: AppResponse, next: NextFunction): void {
  const sanitizeString = (str: string): string => {
    // Remove null bytes and control characters
    return str.replace(/[\x00-\x1F\x7F]/g, '').trim();
  };

  const sanitizeValue = (obj: unknown): unknown => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeValue);
    }
    if (obj !== null && typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        sanitized[sanitizeString(key)] = sanitizeValue(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body !== undefined && req.body !== null) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query) as Record<string, string | string[]>;
  }
  if (req.params) {
    req.params = sanitizeValue(req.params) as Record<string, string>;
  }

  next();
}

/**
 * Prevent Path Traversal
 */
export function preventPathTraversal(req: AppRequest, res: AppResponse, next: NextFunction): void {
  const checkPath = (path: string): boolean => {
    if (path.includes('..') || path.includes('\\') || path.includes('\0')) {
      return true;
    }
    return false;
  };

  if (checkPath(req.url ?? '') || checkPath(req.path)) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid path',
    });
    return;
  }

  next();
}

/**
 * Validate Content Type for POST/PUT/PATCH
 */
export function validateContentType(req: AppRequest, res: AppResponse, next: NextFunction): void {
  if (['POST', 'PUT', 'PATCH'].includes(req.method ?? '')) {
    const contentType = req.headers['content-type'];

    if (!contentType) {
      res.status(415).json({
        error: 'Unsupported Media Type',
        message: 'Content-Type header is required',
      });
      return;
    }

    const validTypes = [
      'application/json',
      'multipart/form-data',
      'application/x-www-form-urlencoded',
      'text/plain',
    ];

    const isValid = validTypes.some(type => contentType.includes(type));

    if (!isValid) {
      res.status(415).json({
        error: 'Unsupported Media Type',
        message: `Content-Type ${contentType} is not supported`,
      });
      return;
    }
  }

  next();
}

/** Middleware handler type understood by the Fubelt framework */
type MiddlewareFn = (req: AppRequest, res: AppResponse, next: NextFunction) => void;

/**
 * Compose multiple middleware functions
 */
export function composeMiddleware(...middlewares: MiddlewareFn[]): MiddlewareFn {
  return (req: AppRequest, res: AppResponse, next: NextFunction): void => {
    let index = 0;

    function dispatch(i: number): void {
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
