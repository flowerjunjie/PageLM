/**
 * Core Router Unit Tests
 *
 * Tests for route registration and middleware setup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerRoutes } from '../../../src/core/router'
import { createMockExpressApp, mockRequest, mockResponse, mockNextFunction } from '../../mocks/http'

describe('Router', () => {
  let app: ReturnType<typeof createMockExpressApp>

  beforeEach(() => {
    app = createMockExpressApp()
  })

  describe('registerRoutes', () => {
    it('should register routes without throwing', () => {
      expect(() => registerRoutes(app)).not.toThrow()
    })

    it('should register API routes', () => {
      registerRoutes(app)

      // Check that common API routes are registered
      const registeredRoutes = Object.keys(app._routes)
      expect(registeredRoutes.length).toBeGreaterThan(0)
    })

    it('should register routes and app should have registered routes', () => {
      registerRoutes(app)
      // registerRoutes doesn't return the app, but it should have registered routes
      const registeredRoutes = Object.keys(app._routes)
      expect(registeredRoutes.length).toBeGreaterThan(0)
    })
  })
})
