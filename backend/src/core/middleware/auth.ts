/**
 * HTTP Authentication Middleware
 * Provides JWT-based authentication for HTTP routes
 */

import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import type { IncomingMessage } from 'http';

// Extend Express Request type
export interface AuthenticatedRequest extends IncomingMessage {
  user?: {
    id: string;
    email?: string;
    [key: string]: any;
  };
  userId: string;
}

// Express-style response interface (for type compatibility)
interface ExpressResponse {
  status(code: number): ExpressResponse;
  json(body: any): ExpressResponse;
  send(body?: any): ExpressResponse;
  end(): void;
}

/**
 * Extract JWT token from request
 * Checks: Authorization header, query parameter, cookie
 */
export function extractToken(req: IncomingMessage): string | null {
  // Check query parameter
  const query = (req as any).query;
  const tokenFromQuery = query?.token || query?.jwt;
  if (tokenFromQuery && typeof tokenFromQuery === 'string') {
    return tokenFromQuery;
  }

  // Check Authorization header
  const authHeader = req.headers?.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check Cookie header
  const cookieHeader = req.headers?.cookie;
  if (cookieHeader && typeof cookieHeader === 'string') {
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    if (tokenMatch) {
      return tokenMatch[1];
    }
  }

  return null;
}

/**
 * Verify JWT token and return decoded payload
 */
function verifyToken(token: string): { userId: string; user: any } | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as any;
    const userId = decoded.userId || decoded.sub;
    if (!userId) {
      console.warn('[auth] Token missing userId/sub claim');
      return null;
    }
    return { userId, user: decoded };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      console.warn('[auth] Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.warn('[auth] Invalid token:', error.message);
    }
    return null;
  }
}

/**
 * Require authentication middleware
 * Returns 401 if no valid token is provided
 */
export function requireAuth(req: IncomingMessage, res: any, next: () => void): void {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const result = verifyToken(token);
  if (!result) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Attach user info to request
  (req as AuthenticatedRequest).user = result.user;
  (req as AuthenticatedRequest).userId = result.userId;

  next();
}

/**
 * Optional authentication middleware
 * Sets userId to 'anonymous' if no token is provided
 * Does NOT return 401 for missing tokens
 */
export function optionalAuth(req: IncomingMessage, res: any, next: () => void): void {
  const token = extractToken(req);

  if (!token) {
    // No token provided, set as anonymous
    (req as AuthenticatedRequest).userId = 'anonymous';
    next();
    return;
  }

  const result = verifyToken(token);
  if (!result) {
    // Invalid token, but optional auth - set as anonymous
    (req as AuthenticatedRequest).userId = 'anonymous';
    next();
    return;
  }

  // Valid token provided
  (req as AuthenticatedRequest).user = result.user;
  (req as AuthenticatedRequest).userId = result.userId;

  next();
}

/**
 * Check if request is authenticated (without enforcing)
 * Returns true if valid token present, false otherwise
 */
export function isAuthenticated(req: IncomingMessage): boolean {
  const token = extractToken(req);
  if (!token) return false;
  return verifyToken(token) !== null;
}
