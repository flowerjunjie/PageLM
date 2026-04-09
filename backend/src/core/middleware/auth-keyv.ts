/**
 * User Isolation Key Management
 * Provides utilities for generating user-isolated database keys
 */

import type { IncomingMessage } from 'http';
import { extractToken, verifyToken } from './auth';
import { config } from '../../config/env';
import type { AuthenticatedRequest } from './auth';

/**
 * Generate a user-isolated database key
 * Format: user:{userId}:{resource}:{id?}
 *
 * @param userId - The user's ID
 * @param resource - The resource type (e.g., 'flashcards', 'tasks')
 * @param id - Optional resource ID
 * @returns The formatted database key
 */
export function userKey(userId: string, resource: string, id?: string): string {
  if (id) {
    return `user:${userId}:${resource}:${id}`;
  }
  return `user:${userId}:${resource}`;
}

/**
 * Generate key prefix for listing all user resources of a type
 * Format: user:{userId}:{resource}
 *
 * @param userId - The user's ID
 * @param resource - The resource type
 * @returns The key prefix for scanning
 */
export function userKeyPrefix(userId: string, resource: string): string {
  return `user:${userId}:${resource}`;
}

/**
 * Get userId from request (for use in route handlers)
 * Must be called after requireAuth or optionalAuth middleware
 *
 * @param req - The incoming request
 * @returns The user ID
 */
export function getUserId(req: IncomingMessage): string {
  return (req as AuthenticatedRequest).userId;
}

/**
 * Extract userId from token in request (without modifying request)
 * Use this in route handlers to get the authenticated userId
 *
 * @param req - The incoming request
 * @returns The userId or null if not authenticated
 */
export function getUserIdFromToken(req: IncomingMessage): string | null {
  const token = extractToken(req);
  if (!token) return null;

  const result = verifyToken(token);
  return result?.userId || null;
}

/**
 * Generate a resource key with optional user isolation
 * If userId is provided, uses user-isolated format
 * Otherwise uses global format (for backwards compatibility)
 *
 * @param userId - The user's ID (optional)
 * @param resource - The resource type
 * @param id - The resource ID
 * @returns The formatted database key
 */
export function resourceKey(userId: string | null | undefined, resource: string, id?: string): string {
  if (userId) {
    return userKey(userId, resource, id);
  }
  // Fallback to global key for backwards compatibility
  if (id) {
    return `${resource}:${id}`;
  }
  return resource;
}
