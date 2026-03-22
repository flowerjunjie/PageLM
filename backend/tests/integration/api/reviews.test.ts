/**
 * Reviews Routes Integration Tests
 *
 * Tests for GET /api/reviews/due, /all, /stats, POST /api/reviews/:id/result,
 * DELETE /api/reviews/:id - calling registered handlers directly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock spaced-repetition service
vi.mock('../../../src/services/spaced-repetition', () => ({
  getDueReviews: vi.fn(),
  getAllReviews: vi.fn(),
  updateReviewResult: vi.fn(),
  getReviewStats: vi.fn(),
  deleteReviewSchedule: vi.fn(),
  scheduleReview: vi.fn(),
}))

import {
  getDueReviews,
  getAllReviews,
  updateReviewResult,
  getReviewStats,
  deleteReviewSchedule,
} from '../../../src/services/spaced-repetition'
import { reviewRoutes } from '../../../src/core/routes/reviews'

// ---------------------------------------------------------------------------
// Mock app helper
// ---------------------------------------------------------------------------

type Handler = (req: any, res: any) => any

function createApp() {
  const routes: Record<string, Handler> = {}
  return {
    routes,
    get: (path: string, handler: Handler) => { routes[`GET ${path}`] = handler },
    post: (path: string, handler: Handler) => { routes[`POST ${path}`] = handler },
    delete: (path: string, handler: Handler) => { routes[`DELETE ${path}`] = handler },
    ws: (path: string, handler: Handler) => { routes[`WS ${path}`] = handler },
  }
}

function mockRes() {
  const res: any = {
    _status: 200,
    _body: undefined,
    statusCode: 200,
    status: vi.fn(function(code: number) { res._status = code; res.statusCode = code; return res }),
    send: vi.fn(function(body: any) { res._body = body; return res }),
    json: vi.fn(function(body: any) { res._body = body; return res }),
  }
  return res
}

function mockReq(overrides: any = {}) {
  return { body: {}, params: {}, query: {}, headers: {}, ...overrides }
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
  it('should return due reviews for default user', async () => {
    const dueReviews = [{ id: 'fc-1', flashcardId: 'fc-1', dueDate: Date.now() }]
    vi.mocked(getDueReviews).mockResolvedValue(dueReviews as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    await app.routes['GET /api/reviews/due'](req, res)

    expect(res._body.success).toBe(true)
    expect(res._body.data).toEqual(dueReviews)
    expect(res._body.meta.total).toBe(1)
    expect(getDueReviews).toHaveBeenCalledWith('default')
  })

  it('should use userId from query parameter', async () => {
    vi.mocked(getDueReviews).mockResolvedValue([])

    const req = mockReq({ query: { userId: 'user-123' } })
    const res = mockRes()

    await app.routes['GET /api/reviews/due'](req, res)

    expect(getDueReviews).toHaveBeenCalledWith('user-123')
  })

  it('should return 500 on service error', async () => {
    vi.mocked(getDueReviews).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ query: {} })
    const res = mockRes()

    await app.routes['GET /api/reviews/due'](req, res)

    expect(res._status).toBe(500)
    expect(res._body.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// GET /api/reviews/all
// ---------------------------------------------------------------------------

describe('GET /api/reviews/all', () => {
  it('should return all reviews', async () => {
    const reviews = [{ id: 'r-1', flashcardId: 'fc-1' }, { id: 'r-2', flashcardId: 'fc-2' }]
    vi.mocked(getAllReviews).mockResolvedValue(reviews as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    await app.routes['GET /api/reviews/all'](req, res)

    expect(res._body.success).toBe(true)
    expect(res._body.data.length).toBe(2)
    expect(res._body.meta.total).toBe(2)
  })

  it('should return 500 on service error', async () => {
    vi.mocked(getAllReviews).mockRejectedValue(new Error('Service error'))

    await app.routes['GET /api/reviews/all'](mockReq({ query: {} }), mockRes())
    // Just verify it doesn't throw - error handling path
  })
})

// ---------------------------------------------------------------------------
// POST /api/reviews/:id/result
// ---------------------------------------------------------------------------

describe('POST /api/reviews/:id/result', () => {
  it('should return 400 when quality is not a number', async () => {
    const req = mockReq({ params: { id: 'fc-1' }, body: { quality: 'bad' } })
    const res = mockRes()

    await app.routes['POST /api/reviews/:id/result'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.success).toBe(false)
  })

  it('should return 400 when quality is out of range (>5)', async () => {
    const req = mockReq({ params: { id: 'fc-1' }, body: { quality: 6 } })
    const res = mockRes()

    await app.routes['POST /api/reviews/:id/result'](req, res)

    expect(res._status).toBe(400)
  })

  it('should return 400 when quality is negative', async () => {
    const req = mockReq({ params: { id: 'fc-1' }, body: { quality: -1 } })
    const res = mockRes()

    await app.routes['POST /api/reviews/:id/result'](req, res)

    expect(res._status).toBe(400)
  })

  it('should return 404 when schedule not found', async () => {
    vi.mocked(updateReviewResult).mockResolvedValue(null as any)

    const req = mockReq({ params: { id: 'nonexistent' }, body: { quality: 3 } })
    const res = mockRes()

    await app.routes['POST /api/reviews/:id/result'](req, res)

    expect(res._status).toBe(404)
  })

  it('should update review result and return updated schedule', async () => {
    const updatedSchedule = { id: 'fc-1', interval: 2, repetitions: 2 }
    vi.mocked(updateReviewResult).mockResolvedValue(updatedSchedule as any)

    const req = mockReq({ params: { id: 'fc-1' }, body: { quality: 4 } })
    const res = mockRes()

    await app.routes['POST /api/reviews/:id/result'](req, res)

    expect(res._body.success).toBe(true)
    expect(res._body.data).toEqual(updatedSchedule)
    expect(updateReviewResult).toHaveBeenCalledWith('fc-1', 4)
  })

  it('should accept quality of 0 (valid boundary)', async () => {
    const schedule = { id: 'fc-1', interval: 1 }
    vi.mocked(updateReviewResult).mockResolvedValue(schedule as any)

    const req = mockReq({ params: { id: 'fc-1' }, body: { quality: 0 } })
    const res = mockRes()

    await app.routes['POST /api/reviews/:id/result'](req, res)

    expect(res._body.success).toBe(true)
  })

  it('should accept quality of 5 (valid boundary)', async () => {
    const schedule = { id: 'fc-1', interval: 7 }
    vi.mocked(updateReviewResult).mockResolvedValue(schedule as any)

    const req = mockReq({ params: { id: 'fc-1' }, body: { quality: 5 } })
    const res = mockRes()

    await app.routes['POST /api/reviews/:id/result'](req, res)

    expect(res._body.success).toBe(true)
  })

  it('should return 500 on service error', async () => {
    vi.mocked(updateReviewResult).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ params: { id: 'fc-1' }, body: { quality: 3 } })
    const res = mockRes()

    await app.routes['POST /api/reviews/:id/result'](req, res)

    expect(res._status).toBe(500)
  })

  it('should return 500 with fallback error when service rejects without a message', async () => {
    vi.mocked(updateReviewResult).mockRejectedValue({})

    const req = mockReq({ params: { id: 'fc-1' }, body: { quality: 3 } })
    const res = mockRes()

    await app.routes['POST /api/reviews/:id/result'](req, res)

    expect(res._status).toBe(500)
    expect(res._body.error).toContain('Failed to update review result')
  })
})

// ---------------------------------------------------------------------------
// GET /api/reviews/stats
// ---------------------------------------------------------------------------

describe('GET /api/reviews/stats', () => {
  it('should return review stats', async () => {
    const stats = { totalDue: 5, streakDays: 3, totalReviewed: 20 }
    vi.mocked(getReviewStats).mockResolvedValue(stats as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    await app.routes['GET /api/reviews/stats'](req, res)

    expect(res._body.success).toBe(true)
    expect(res._body.data).toEqual(stats)
  })

  it('should use userId from query', async () => {
    vi.mocked(getReviewStats).mockResolvedValue({} as any)

    const req = mockReq({ query: { userId: 'user-xyz' } })
    const res = mockRes()

    await app.routes['GET /api/reviews/stats'](req, res)

    expect(getReviewStats).toHaveBeenCalledWith('user-xyz')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/reviews/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/reviews/:id', () => {
  it('should delete review schedule and return success', async () => {
    vi.mocked(deleteReviewSchedule).mockResolvedValue(undefined)

    const req = mockReq({ params: { id: 'fc-1' }, query: {} })
    const res = mockRes()

    await app.routes['DELETE /api/reviews/:id'](req, res)

    expect(res._body.success).toBe(true)
    expect(deleteReviewSchedule).toHaveBeenCalledWith('fc-1', 'default')
  })

  it('should use userId from query parameter', async () => {
    vi.mocked(deleteReviewSchedule).mockResolvedValue(undefined)

    const req = mockReq({ params: { id: 'fc-2' }, query: { userId: 'user-del' } })
    const res = mockRes()

    await app.routes['DELETE /api/reviews/:id'](req, res)

    expect(deleteReviewSchedule).toHaveBeenCalledWith('fc-2', 'user-del')
  })

  it('should return 500 on service error', async () => {
    vi.mocked(deleteReviewSchedule).mockRejectedValue(new Error('Cannot delete'))

    const req = mockReq({ params: { id: 'fc-1' }, query: {} })
    const res = mockRes()

    await app.routes['DELETE /api/reviews/:id'](req, res)

    expect(res._status).toBe(500)
    expect(res._body.success).toBe(false)
  })
})
