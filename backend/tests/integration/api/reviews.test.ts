/**
 * Reviews Routes Integration Tests
 *
 * Tests for GET /api/reviews/due, /all, /stats, POST /api/reviews/:id/result,
 * DELETE /api/reviews/:id - calling registered handlers directly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

// Mock spaced-repetition service
vi.mock('../../../src/services/spaced-repetition', () => ({
  getDueReviews: vi.fn(),
  getAllReviews: vi.fn(),
  updateReviewResult: vi.fn(),
  getReviewStats: vi.fn(),
  deleteReviewSchedule: vi.fn(),
  scheduleReview: vi.fn(),
}))

// Mock config to provide a test JWT secret
vi.mock('../../../src/config/env', () => ({
  config: {
    jwtSecret: 'test-secret-key-for-testing-only',
  }
}))

import {
  getDueReviews,
  getAllReviews,
  updateReviewResult,
  getReviewStats,
  deleteReviewSchedule,
} from '../../../src/services/spaced-repetition'
import { reviewRoutes } from '../../../src/core/routes/reviews'
import { config } from '../../../src/config/env'

// ---------------------------------------------------------------------------
// Mock app helper
// ---------------------------------------------------------------------------

type Handler = (req: any, res: any) => any

function createApp() {
  const routes: Record<string, Handler[]> = {}
  return {
    routes,
    get: (path: string, ...handlers: Handler[]) => { routes[`GET ${path}`] = handlers },
    post: (path: string, ...handlers: Handler[]) => { routes[`POST ${path}`] = handlers },
    delete: (path: string, ...handlers: Handler[]) => { routes[`DELETE ${path}`] = handlers },
    ws: (path: string, handler: Handler) => { routes[`WS ${path}`] = [handler] },
  }
}

function mockRes() {
  const res: any = {
    _status: 200,
    _body: undefined,
    statusCode: 200,
    headersSent: false,
    status: vi.fn(function(code: number) { res._status = code; res.statusCode = code; res.headersSent = true; return res }),
    send: vi.fn(function(body: any) { res._body = body; res.headersSent = true; return res }),
    json: vi.fn(function(body: any) { res._body = body; res.headersSent = true; return res }),
  }
  return res
}

// Create a valid JWT token for testing
function createTestToken(userId: string): string {
  return jwt.sign({ userId }, config.jwtSecret, { algorithm: 'HS256' })
}

// Create mock request with auth token
function mockReq(overrides: any = {}) {
  const userId = overrides.userId || 'test-user'
  const token = createTestToken(userId)
  return {
    body: {},
    params: {},
    query: {},
    headers: { authorization: `Bearer ${token}` },
    user: { id: userId },
    userId,
    ...overrides
  }
}

// Execute middleware chain and call final handler
async function exec(req: any, res: any, handlers: Handler[]) {
  let index = 0
  const next = () => { index++ }
  while (index < handlers.length) {
    const handler = handlers[index]
    if (handler.length > 2) {
      await new Promise<void>(resolve => {
        const nextCb = () => { resolve() }
        handler(req, res, nextCb)
        // Safety: if response was sent without calling next, resolve immediately
        if (res.headersSent) resolve()
      })
    } else {
      await handler(req, res)
      break
    }
    index++
    // Stop if response was already sent (e.g., auth middleware sent 401)
    if (res.headersSent) break
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let app: ReturnType<typeof createApp>

beforeEach(() => {
  vi.clearAllMocks()
  app = createApp()
  reviewRoutes(app)
})

// ---------------------------------------------------------------------------
// GET /api/reviews/due
// ---------------------------------------------------------------------------

describe('GET /api/reviews/due', () => {
  it('should return due reviews for authenticated user', async () => {
    const dueReviews = [{ id: 'fc-1', flashcardId: 'fc-1', dueDate: Date.now() }]
    vi.mocked(getDueReviews).mockResolvedValue(dueReviews as any)

    const req = mockReq()
    const res = mockRes()

    await exec(req, res, app.routes['GET /api/reviews/due'])

    expect(res._body.success).toBe(true)
    expect(res._body.data).toEqual(dueReviews)
    expect(res._body.meta.total).toBe(1)
    expect(getDueReviews).toHaveBeenCalledWith('test-user')
  })

  it('should return 500 on service error', async () => {
    vi.mocked(getDueReviews).mockRejectedValue(new Error('DB error'))

    const req = mockReq()
    const res = mockRes()

    await exec(req, res, app.routes['GET /api/reviews/due'])

    expect(res._status).toBe(500)
    expect(res._body.success).toBe(false)
  })

  it('should return 401 when no token provided', async () => {
    const req = { body: {}, params: {}, query: {}, headers: {} }
    const res = mockRes()

    await exec(req, res, app.routes['GET /api/reviews/due'])

    expect(res._status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// GET /api/reviews/all
// ---------------------------------------------------------------------------

describe('GET /api/reviews/all', () => {
  it('should return all reviews for authenticated user', async () => {
    const reviews = [{ id: 'r-1', flashcardId: 'fc-1' }, { id: 'r-2', flashcardId: 'fc-2' }]
    vi.mocked(getAllReviews).mockResolvedValue(reviews as any)

    const req = mockReq()
    const res = mockRes()

    await exec(req, res, app.routes['GET /api/reviews/all'])

    expect(res._body.success).toBe(true)
    expect(res._body.data.length).toBe(2)
    expect(res._body.meta.total).toBe(2)
  })

  it('should return 500 on service error', async () => {
    vi.mocked(getAllReviews).mockRejectedValue(new Error('Service error'))

    const req = mockReq()
    const res = mockRes()

    await exec(req, res, app.routes['GET /api/reviews/all'])

    expect(res._status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// POST /api/reviews/:id/result
// ---------------------------------------------------------------------------

describe('POST /api/reviews/:id/result', () => {
  it('should return 400 when quality is not a number', async () => {
    const req = mockReq({ params: { id: 'fc-1' }, body: { quality: 'bad' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /api/reviews/:id/result'])

    expect(res._status).toBe(400)
    expect(res._body.success).toBe(false)
  })

  it('should return 400 when quality is out of range (>5)', async () => {
    const req = mockReq({ params: { id: 'fc-1' }, body: { quality: 6 } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /api/reviews/:id/result'])

    expect(res._status).toBe(400)
  })

  it('should return 400 when quality is negative', async () => {
    const req = mockReq({ params: { id: 'fc-1' }, body: { quality: -1 } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /api/reviews/:id/result'])

    expect(res._status).toBe(400)
  })

  it('should return 404 when schedule not found', async () => {
    vi.mocked(updateReviewResult).mockResolvedValue(null as any)

    const req = mockReq({ params: { id: 'nonexistent' }, body: { quality: 3 } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /api/reviews/:id/result'])

    expect(res._status).toBe(404)
  })

  it('should update review result and return updated schedule', async () => {
    const updatedSchedule = { id: 'fc-1', interval: 2, repetitions: 2 }
    vi.mocked(updateReviewResult).mockResolvedValue(updatedSchedule as any)

    const req = mockReq({ params: { id: 'fc-1' }, body: { quality: 4 } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /api/reviews/:id/result'])

    expect(res._body.success).toBe(true)
    expect(res._body.data).toEqual(updatedSchedule)
    expect(updateReviewResult).toHaveBeenCalledWith('fc-1', 4, 'test-user')
  })

  it('should accept quality of 0 (valid boundary)', async () => {
    const schedule = { id: 'fc-1', interval: 1 }
    vi.mocked(updateReviewResult).mockResolvedValue(schedule as any)

    const req = mockReq({ params: { id: 'fc-1' }, body: { quality: 0 } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /api/reviews/:id/result'])

    expect(res._body.success).toBe(true)
  })

  it('should accept quality of 5 (valid boundary)', async () => {
    const schedule = { id: 'fc-1', interval: 7 }
    vi.mocked(updateReviewResult).mockResolvedValue(schedule as any)

    const req = mockReq({ params: { id: 'fc-1' }, body: { quality: 5 } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /api/reviews/:id/result'])

    expect(res._body.success).toBe(true)
  })

  it('should return 500 on service error', async () => {
    vi.mocked(updateReviewResult).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ params: { id: 'fc-1' }, body: { quality: 3 } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /api/reviews/:id/result'])

    expect(res._status).toBe(500)
  })

  it('should return 500 with fallback error when service rejects without a message', async () => {
    vi.mocked(updateReviewResult).mockRejectedValue({})

    const req = mockReq({ params: { id: 'fc-1' }, body: { quality: 3 } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /api/reviews/:id/result'])

    expect(res._status).toBe(500)
    expect(res._body.error).toContain('Failed to update review result')
  })
})

// ---------------------------------------------------------------------------
// GET /api/reviews/stats
// ---------------------------------------------------------------------------

describe('GET /api/reviews/stats', () => {
  it('should return review stats for authenticated user', async () => {
    const stats = { totalDue: 5, streakDays: 3, totalReviewed: 20 }
    vi.mocked(getReviewStats).mockResolvedValue(stats as any)

    const req = mockReq()
    const res = mockRes()

    await exec(req, res, app.routes['GET /api/reviews/stats'])

    expect(res._body.success).toBe(true)
    expect(res._body.data).toEqual(stats)
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/reviews/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/reviews/:id', () => {
  it('should delete review schedule and return success', async () => {
    vi.mocked(deleteReviewSchedule).mockResolvedValue(undefined)

    const req = mockReq({ params: { id: 'fc-1' } })
    const res = mockRes()

    await exec(req, res, app.routes['DELETE /api/reviews/:id'])

    expect(res._body.success).toBe(true)
    expect(deleteReviewSchedule).toHaveBeenCalledWith('fc-1', 'test-user')
  })

  it('should return 500 on service error', async () => {
    vi.mocked(deleteReviewSchedule).mockRejectedValue(new Error('Cannot delete'))

    const req = mockReq({ params: { id: 'fc-1' } })
    const res = mockRes()

    await exec(req, res, app.routes['DELETE /api/reviews/:id'])

    expect(res._status).toBe(500)
    expect(res._body.success).toBe(false)
  })
})
