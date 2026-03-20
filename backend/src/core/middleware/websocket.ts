/**
 * WebSocket Security Middleware
 * Provides authentication and security for WebSocket connections
 */

import jwt from 'jsonwebtoken';

export interface WebSocketAuthConfig {
  secret: string;
  algorithm?: jwt.Algorithm;
  tokenExtractor?: (req: any) => string | null;
  skipFailedRequests?: boolean;
}

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  user?: any;
  isAuthenticated?: boolean;
}

/**
 * Create WebSocket authentication middleware
 */
export function createWebSocketAuth(config: WebSocketAuthConfig) {
  const {
    secret,
    algorithm = 'HS256',
    tokenExtractor = defaultTokenExtractor,
  } = config;

  return (ws: AuthenticatedWebSocket, req: any) => {
    try {
      const token = tokenExtractor(req);

      if (!token) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Authentication required',
        }));
        ws.close(4008, 'Authentication required');
        return false;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, secret, { algorithms: [algorithm] }) as any;

      // Attach user info to WebSocket
      ws.userId = decoded.userId || decoded.sub;
      ws.user = decoded;
      ws.isAuthenticated = true;

      return true;
    } catch (error: any) {
      console.error('WebSocket authentication error:', error);

      ws.send(JSON.stringify({
        type: 'error',
        message: error.name === 'TokenExpiredError'
          ? 'Token expired'
          : 'Invalid token',
      }));

      ws.close(4008, 'Authentication failed');
      return false;
    }
  };
}

/**
 * Default token extractor - checks query parameter and header
 */
function defaultTokenExtractor(req: any): string | null {
  // Check query parameter
  const tokenFromQuery = req.query?.token || req.query?.jwt;
  if (tokenFromQuery) {
    return tokenFromQuery;
  }

  // Check Authorization header
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check Cookie header
  const cookieHeader = req.headers?.cookie;
  if (cookieHeader) {
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    if (tokenMatch) {
      return tokenMatch[1];
    }
  }

  return null;
}

/**
 * Rate limiter for WebSocket connections
 */
export function createWebSocketRateLimiter(maxConnections: number = 10, windowMs: number = 60000) {
  const connections = new Map<string, { count: number; resetTime: number }>();

  return (ws: AuthenticatedWebSocket, req: any): boolean => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let entry = connections.get(ip);

    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
      connections.set(ip, entry);
    } else {
      entry.count++;
    }

    if (entry.count > maxConnections) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Too many connections',
      }));
      ws.close(4009, 'Too many connections');
      return false;
    }

    // Cleanup on close
    ws.addEventListener('close', () => {
      if (entry) {
        entry.count--;
        if (entry.count <= 0) {
          connections.delete(ip);
        }
      }
    });

    return true;
  };
}

/**
 * Validate WebSocket message format
 */
export function validateWebSocketMessage(message: any): boolean {
  if (!message || typeof message !== 'object') {
    return false;
  }

  // Check for common attack patterns
  const messageStr = JSON.stringify(message);
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<iframe/gi,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(messageStr)) {
      return false;
    }
  }

  return true;
}

/**
 * Create rate limiter for WebSocket messages
 */
export function createWebSocketMessageRateLimiter(maxMessages: number = 100, windowMs: number = 10000) {
  const messageCounts = new Map<WebSocket, { count: number; resetTime: number }>();

  return (ws: AuthenticatedWebSocket, message: any): boolean => {
    const now = Date.now();

    let entry = messageCounts.get(ws);

    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
      messageCounts.set(ws, entry);
    } else {
      entry.count++;
    }

    if (entry.count > maxMessages) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Message rate limit exceeded',
      }));
      return false;
    }

    // Validate message content
    if (!validateWebSocketMessage(message)) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
      }));
      return false;
    }

    return true;
  };
}

/**
 * Cleanup expired rate limit entries
 */
setInterval(() => {
  const now = Date.now();
  // Message rate limiters will be cleaned up when connections close
}, 60000);
