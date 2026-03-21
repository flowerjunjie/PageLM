/**
 * Security Middleware Unit Tests
 *
 * Tests for the actual security middleware functions from src/core/middleware/security.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockRequest, mockResponse, mockNextFunction } from '../../../mocks/http'
import {
  securityHeaders,
  requestSizeLimiter,
  sanitizeInput,
  preventPathTraversal,
  validateContentType,
  composeMiddleware,
} from '../../../../src/core/middleware/security'

describe('Security Middleware', () => {
  describe('securityHeaders', () => {
    it('should set X-Content-Type-Options to nosniff', () => {
      const req = mockRequest()
      const res = mockResponse()
      const next = mockNextFunction()

      securityHeaders(req, res, next)

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff')
    })

    it('should set X-Frame-Options to DENY', () => {
      const req = mockRequest()
      const res = mockResponse()
      const next = mockNextFunction()

      securityHeaders(req, res, next)

      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY')
    })

    it('should set X-XSS-Protection', () => {
      const req = mockRequest()
      const res = mockResponse()
      const next = mockNextFunction()

      securityHeaders(req, res, next)

      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block')
    })

    it('should set Content-Security-Policy', () => {
      const req = mockRequest()
      const res = mockResponse()
      const next = mockNextFunction()

      securityHeaders(req, res, next)

      expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', expect.any(String))
    })

    it('should set Strict-Transport-Security', () => {
      const req = mockRequest()
      const res = mockResponse()
      const next = mockNextFunction()

      securityHeaders(req, res, next)

      expect(res.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringContaining('max-age=')
      )
    })

    it('should set Referrer-Policy', () => {
      const req = mockRequest()
      const res = mockResponse()
      const next = mockNextFunction()

      securityHeaders(req, res, next)

      expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', expect.any(String))
    })

    it('should remove X-Powered-By header', () => {
      const req = mockRequest()
      const res = mockResponse()
      const next = mockNextFunction()

      securityHeaders(req, res, next)

      expect(res.removeHeader).toHaveBeenCalledWith('X-Powered-By')
    })

    it('should call next after setting headers', () => {
      const req = mockRequest()
      const res = mockResponse()
      const next = vi.fn()

      securityHeaders(req, res, next)

      expect(next).toHaveBeenCalledOnce()
    })
  })

  describe('requestSizeLimiter', () => {
    it('should allow requests under size limit', () => {
      const middleware = requestSizeLimiter(10 * 1024 * 1024) // 10MB
      const req = mockRequest({ headers: { 'content-length': '1024' } })
      const res = mockResponse()
      const next = vi.fn()

      middleware(req, res, next)

      expect(next).toHaveBeenCalledOnce()
      expect(res.status).not.toHaveBeenCalledWith(413)
    })

    it('should reject requests over size limit', () => {
      const middleware = requestSizeLimiter(1024) // 1KB limit
      const req = mockRequest({ headers: { 'content-length': '2048' } }) // 2KB
      const res = mockResponse()
      const next = vi.fn()

      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(413)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Payload Too Large',
      }))
      expect(next).not.toHaveBeenCalled()
    })

    it('should use default size limit of 10MB', () => {
      const middleware = requestSizeLimiter()
      const req = mockRequest({ headers: { 'content-length': '0' } })
      const res = mockResponse()
      const next = vi.fn()

      middleware(req, res, next)

      expect(next).toHaveBeenCalledOnce()
    })

    it('should handle missing content-length header', () => {
      const middleware = requestSizeLimiter(1024)
      const req = mockRequest({ headers: {} })
      const res = mockResponse()
      const next = vi.fn()

      middleware(req, res, next)

      // No content-length defaults to 0, should pass
      expect(next).toHaveBeenCalledOnce()
    })
  })

  describe('sanitizeInput', () => {
    it('should call next after sanitizing', () => {
      const req = mockRequest({ body: { message: 'Hello World' } })
      const res = mockResponse()
      const next = vi.fn()

      sanitizeInput(req, res, next)

      expect(next).toHaveBeenCalledOnce()
    })

    it('should remove null bytes from string body', () => {
      const req = mockRequest({ body: { message: 'Hello\x00World' } })
      const res = mockResponse()
      const next = vi.fn()

      sanitizeInput(req, res, next)

      expect(req.body.message).not.toContain('\x00')
    })

    it('should remove control characters from body', () => {
      const req = mockRequest({ body: { message: 'Hello\x01\x02World' } })
      const res = mockResponse()
      const next = vi.fn()

      sanitizeInput(req, res, next)

      expect(req.body.message).toBe('HelloWorld')
    })

    it('should sanitize nested object body', () => {
      const req = mockRequest({
        body: {
          user: {
            name: 'Test\x00User',
            email: 'test@example.com',
          }
        }
      })
      const res = mockResponse()
      const next = vi.fn()

      sanitizeInput(req, res, next)

      expect(req.body.user.name).not.toContain('\x00')
    })

    it('should sanitize array body', () => {
      const req = mockRequest({
        body: { tags: ['tag1\x00', 'tag2'] }
      })
      const res = mockResponse()
      const next = vi.fn()

      sanitizeInput(req, res, next)

      expect(req.body.tags[0]).not.toContain('\x00')
    })

    it('should sanitize query parameters', () => {
      const req = mockRequest({ query: { search: 'hello\x00world' } })
      const res = mockResponse()
      const next = vi.fn()

      sanitizeInput(req, res, next)

      expect(req.query.search).not.toContain('\x00')
    })

    it('should sanitize route params', () => {
      const req = mockRequest({ params: { id: 'abc\x00def' } })
      const res = mockResponse()
      const next = vi.fn()

      sanitizeInput(req, res, next)

      expect(req.params.id).not.toContain('\x00')
    })

    it('should handle non-string values passthrough', () => {
      const req = mockRequest({ body: { count: 42, active: true } })
      const res = mockResponse()
      const next = vi.fn()

      sanitizeInput(req, res, next)

      expect(req.body.count).toBe(42)
      expect(req.body.active).toBe(true)
    })
  })

  describe('preventPathTraversal', () => {
    it('should allow normal paths', () => {
      const req = mockRequest({ url: '/api/users', path: '/api/users' })
      const res = mockResponse()
      const next = vi.fn()

      preventPathTraversal(req, res, next)

      expect(next).toHaveBeenCalledOnce()
    })

    it('should block paths with .. traversal', () => {
      const req = mockRequest({ url: '/api/../etc/passwd', path: '/api/../etc/passwd' })
      const res = mockResponse()
      const next = vi.fn()

      preventPathTraversal(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(next).not.toHaveBeenCalled()
    })

    it('should block paths with backslash', () => {
      const req = mockRequest({ url: '/api\\secret', path: '/api\\secret' })
      const res = mockResponse()
      const next = vi.fn()

      preventPathTraversal(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(next).not.toHaveBeenCalled()
    })

    it('should block paths with null byte', () => {
      const req = mockRequest({ url: '/api\x00secret', path: '/api\x00secret' })
      const res = mockResponse()
      const next = vi.fn()

      preventPathTraversal(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(next).not.toHaveBeenCalled()
    })

    it('should return 400 with Bad Request error for traversal attempts', () => {
      const req = mockRequest({ url: '/../secret', path: '/../secret' })
      const res = mockResponse()
      const next = vi.fn()

      preventPathTraversal(req, res, next)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Bad Request',
      }))
    })
  })

  describe('validateContentType', () => {
    it('should pass GET requests without content-type check', () => {
      const req = mockRequest({ method: 'GET', headers: {} })
      const res = mockResponse()
      const next = vi.fn()

      validateContentType(req, res, next)

      expect(next).toHaveBeenCalledOnce()
    })

    it('should pass DELETE requests without content-type check', () => {
      const req = mockRequest({ method: 'DELETE', headers: {} })
      const res = mockResponse()
      const next = vi.fn()

      validateContentType(req, res, next)

      expect(next).toHaveBeenCalledOnce()
    })

    it('should reject POST requests without content-type', () => {
      const req = mockRequest({ method: 'POST', headers: {} })
      const res = mockResponse()
      const next = vi.fn()

      validateContentType(req, res, next)

      expect(res.status).toHaveBeenCalledWith(415)
      expect(next).not.toHaveBeenCalled()
    })

    it('should allow POST with application/json', () => {
      const req = mockRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' }
      })
      const res = mockResponse()
      const next = vi.fn()

      validateContentType(req, res, next)

      expect(next).toHaveBeenCalledOnce()
    })

    it('should allow PUT with application/json', () => {
      const req = mockRequest({
        method: 'PUT',
        headers: { 'content-type': 'application/json; charset=utf-8' }
      })
      const res = mockResponse()
      const next = vi.fn()

      validateContentType(req, res, next)

      expect(next).toHaveBeenCalledOnce()
    })

    it('should allow PATCH with application/json', () => {
      const req = mockRequest({
        method: 'PATCH',
        headers: { 'content-type': 'application/json' }
      })
      const res = mockResponse()
      const next = vi.fn()

      validateContentType(req, res, next)

      expect(next).toHaveBeenCalledOnce()
    })

    it('should allow multipart/form-data content type', () => {
      const req = mockRequest({
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=---' }
      })
      const res = mockResponse()
      const next = vi.fn()

      validateContentType(req, res, next)

      expect(next).toHaveBeenCalledOnce()
    })

    it('should allow text/plain content type', () => {
      const req = mockRequest({
        method: 'POST',
        headers: { 'content-type': 'text/plain' }
      })
      const res = mockResponse()
      const next = vi.fn()

      validateContentType(req, res, next)

      expect(next).toHaveBeenCalledOnce()
    })

    it('should reject unsupported content types', () => {
      const req = mockRequest({
        method: 'POST',
        headers: { 'content-type': 'application/xml' }
      })
      const res = mockResponse()
      const next = vi.fn()

      validateContentType(req, res, next)

      expect(res.status).toHaveBeenCalledWith(415)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Unsupported Media Type',
      }))
    })
  })

  describe('composeMiddleware', () => {
    it('should execute middleware in order', () => {
      const order: number[] = []
      const m1 = (_req: any, _res: any, next: any) => { order.push(1); next() }
      const m2 = (_req: any, _res: any, next: any) => { order.push(2); next() }
      const m3 = (_req: any, _res: any, next: any) => { order.push(3); next() }

      const composed = composeMiddleware(m1, m2, m3)
      const next = vi.fn()

      composed(mockRequest(), mockResponse(), next)

      expect(order).toEqual([1, 2, 3])
      expect(next).toHaveBeenCalledOnce()
    })

    it('should stop execution if a middleware does not call next', () => {
      const order: number[] = []
      const m1 = (_req: any, _res: any, next: any) => { order.push(1); next() }
      const m2 = (_req: any, _res: any, _next: any) => { order.push(2); /* no next() */ }
      const m3 = (_req: any, _res: any, next: any) => { order.push(3); next() }

      const composed = composeMiddleware(m1, m2, m3)
      const finalNext = vi.fn()

      composed(mockRequest(), mockResponse(), finalNext)

      expect(order).toEqual([1, 2])
      expect(finalNext).not.toHaveBeenCalled()
    })

    it('should call final next when all middleware pass', () => {
      const m1 = (_req: any, _res: any, next: any) => next()
      const m2 = (_req: any, _res: any, next: any) => next()

      const composed = composeMiddleware(m1, m2)
      const next = vi.fn()

      composed(mockRequest(), mockResponse(), next)

      expect(next).toHaveBeenCalledOnce()
    })

    it('should work with zero middleware', () => {
      const composed = composeMiddleware()
      const next = vi.fn()

      composed(mockRequest(), mockResponse(), next)

      expect(next).toHaveBeenCalledOnce()
    })
  })
})
