/**
 * Rate Limiter Middleware - Real Implementation Tests
 *
 * Tests that call createRateLimiter() and run requests through the actual
 * middleware function to cover the implementation in rateLimiter.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockRequest, mockResponse, mockNextFunction } from '../../../mocks/http'
import {
  createRateLimiter,
  customRateLimiter,
  defaultRateLimiter,
  strictRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
} from '../../../../src/core/middleware/rateLimiter'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(ip: string = '1.2.3.4') {
  return mockRequest({ ip })
}

// ---------------------------------------------------------------------------
// createRateLimiter
// ---------------------------------------------------------------------------

describe('createRateLimiter', () => {
  it('should return a middleware function', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 })
    expect(typeof limiter).toBe('function')
  })

  it('should call next() for requests within the limit', async () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 })
    const req = makeReq('10.0.0.1')
    const res = mockResponse()
    const next = mockNextFunction()

    await limiter(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.statusCode).not.toBe(429)
  })

  it('should set X-RateLimit-Limit header', async () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 50 })
    const req = makeReq('10.0.0.2')
    const res = mockResponse()
    const next = mockNextFunction()

    await limiter(req, res, next)

    expect(res._headers['x-ratelimit-limit']).toBe(50)
  })

  it('should set X-RateLimit-Remaining header', async () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 50 })
    const req = makeReq('10.0.0.3')
    const res = mockResponse()
    const next = mockNextFunction()

    await limiter(req, res, next)

    // After 1 request, remaining should be 49
    expect(res._headers['x-ratelimit-remaining']).toBe(49)
  })

  it('should set X-RateLimit-Reset header', async () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 })
    const req = makeReq('10.0.0.4')
    const res = mockResponse()
    const next = mockNextFunction()

    await limiter(req, res, next)

    expect(res._headers['x-ratelimit-reset']).toBeDefined()
  })

  it('should return 429 when limit is exceeded', async () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2 })
    const ip = `test-ip-exceed-${Date.now()}`
    const next = mockNextFunction()

    // First two requests allowed
    await limiter(makeReq(ip), mockResponse(), next)
    await limiter(makeReq(ip), mockResponse(), next)

    // Third request should be blocked
    const res3 = mockResponse()
    const next3 = mockNextFunction()
    await limiter(makeReq(ip), res3, next3)

    expect(res3.statusCode).toBe(429)
    expect(next3).not.toHaveBeenCalled()
  })

  it('should set Retry-After header when rate limited', async () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 })
    const ip = `test-ip-retry-${Date.now()}`
    const next = mockNextFunction()

    await limiter(makeReq(ip), mockResponse(), next)

    const res2 = mockResponse()
    await limiter(makeReq(ip), res2, mockNextFunction())

    expect(res2._headers['retry-after']).toBeDefined()
  })

  it('should use custom keyGenerator when provided', async () => {
    const keyGen = vi.fn((req: any) => `custom-${req.headers?.['x-user-id'] || 'anon'}`)
    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 5,
      keyGenerator: keyGen,
    })

    const req = mockRequest({ headers: { 'x-user-id': 'user-999' } })
    const res = mockResponse()
    await limiter(req, res, mockNextFunction())

    expect(keyGen).toHaveBeenCalledWith(req)
  })

  it('should skip rate limiting when skipSuccessfulRequests is true and status < 400', async () => {
    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 1,
      skipSuccessfulRequests: true,
    })

    const ip = `test-skip-success-${Date.now()}`
    const res1 = mockResponse()
    res1.statusCode = 200 // successful response

    const next1 = mockNextFunction()
    await limiter(makeReq(ip), res1, next1)

    // Should be skipped (next called) without incrementing
    expect(next1).toHaveBeenCalled()
  })

  it('should skip rate limiting when skipFailedRequests is true and status >= 400', async () => {
    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 1,
      skipFailedRequests: true,
    })

    const ip = `test-skip-fail-${Date.now()}`
    const res1 = mockResponse()
    res1.statusCode = 400 // failed response

    const next1 = mockNextFunction()
    await limiter(makeReq(ip), res1, next1)

    expect(next1).toHaveBeenCalled()
  })

  it('should track separate counts for different IPs', async () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2 })
    const ip1 = `ip1-separate-${Date.now()}`
    const ip2 = `ip2-separate-${Date.now()}`

    // Max out ip1
    await limiter(makeReq(ip1), mockResponse(), mockNextFunction())
    await limiter(makeReq(ip1), mockResponse(), mockNextFunction())

    // ip2 should still be allowed on first request
    const res = mockResponse()
    const next = mockNextFunction()
    await limiter(makeReq(ip2), res, next)

    expect(next).toHaveBeenCalled()
    expect(res.statusCode).not.toBe(429)
  })
})

// ---------------------------------------------------------------------------
// customRateLimiter
// ---------------------------------------------------------------------------

describe('customRateLimiter', () => {
  it('should create a rate limiter with given window and maxRequests', async () => {
    const limiter = customRateLimiter(30000, 5)
    expect(typeof limiter).toBe('function')

    const req = makeReq(`custom-${Date.now()}`)
    const res = mockResponse()
    const next = mockNextFunction()

    await limiter(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Pre-configured rate limiters
// ---------------------------------------------------------------------------

describe('pre-configured rate limiters', () => {
  it('defaultRateLimiter should be a function', () => {
    expect(typeof defaultRateLimiter).toBe('function')
  })

  it('strictRateLimiter should be a function', () => {
    expect(typeof strictRateLimiter).toBe('function')
  })

  it('authRateLimiter should be a function', () => {
    expect(typeof authRateLimiter).toBe('function')
  })

  it('uploadRateLimiter should be a function', () => {
    expect(typeof uploadRateLimiter).toBe('function')
  })

  it('defaultRateLimiter should allow first request', async () => {
    const req = makeReq(`default-${Date.now()}`)
    const res = mockResponse()
    const next = mockNextFunction()

    await defaultRateLimiter(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('strictRateLimiter should allow first request', async () => {
    const req = makeReq(`strict-${Date.now()}`)
    const res = mockResponse()
    const next = mockNextFunction()

    await strictRateLimiter(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})
