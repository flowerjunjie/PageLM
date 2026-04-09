/**
 * Learning Routes Integration Tests
 *
 * Tests for all GET /api/learning/* endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

// Mock analytics service
vi.mock('../../../src/services/analytics', () => ({
  getLearningProfile: vi.fn(),
  getLearningStats: vi.fn(),
  getKnowledgeMapData: vi.fn(),
  getSubjectStats: vi.fn(),
  getRecentActivity: vi.fn(),
  identifyWeakAreas: vi.fn(),
  calculateLearningTrend: vi.fn(),
}))

// Mock config
vi.mock('../../../src/config/env', () => ({
  config: {
    jwtSecret: 'test-secret-key-for-testing-only',
  }
}))

import {
  getLearningProfile,
  getLearningStats,
  getKnowledgeMapData,
  getSubjectStats,
  getRecentActivity,
  identifyWeakAreas,
  calculateLearningTrend,
} from '../../../src/services/analytics'
import { learningRoutes } from '../../../src/core/routes/learning'
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
        if (res.headersSent) resolve()
      })
    } else {
      await handler(req, res)
      break
    }
    index++
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
  learningRoutes(app)
})

// ---------------------------------------------------------------------------
// GET /api/learning/profile
// ---------------------------------------------------------------------------

describe('GET /api/learning/profile', () => {
  it('should return learning profile', async () => {
    const profile = { stats: { totalStudyTime: 120 }, subjects: [], recentActivity: [] }
    vi.mocked(getLearningProfile).mockResolvedValue(profile as any)

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/profile'])

    expect(res._body.ok).toBe(true)
    expect(res._body.profile).toEqual(profile)
  })

  it('should return 500 on service error', async () => {
    vi.mocked(getLearningProfile).mockRejectedValue(new Error('Analytics error'))

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/profile'])

    expect(res._status).toBe(500)
    expect(res._body.ok).toBe(false)
  })

  it('should return 500 when service rejects without a message', async () => {
    vi.mocked(getLearningProfile).mockRejectedValue('plain failure')

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/profile'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to load learning profile' })
  })

  it('should return 401 when no token provided', async () => {
    const req = { body: {}, params: {}, query: {}, headers: {} }
    const res = mockRes()

    await exec(req, res, app.routes['GET /api/learning/profile'])

    expect(res._status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// GET /api/learning/stats
// ---------------------------------------------------------------------------

describe('GET /api/learning/stats', () => {
  it('should return learning stats', async () => {
    const stats = { totalStudyTime: 300, weeklyStudyTime: 120, totalFlashcards: 50 }
    vi.mocked(getLearningStats).mockResolvedValue(stats as any)

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/stats'])

    expect(res._body.ok).toBe(true)
    expect(res._body.stats).toEqual(stats)
  })

  it('should return 500 on service error', async () => {
    vi.mocked(getLearningStats).mockRejectedValue(new Error('Stats error'))

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/stats'])

    expect(res._status).toBe(500)
  })

  it('should return 500 when stats service rejects without a message', async () => {
    vi.mocked(getLearningStats).mockRejectedValue('plain failure')

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/stats'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to load learning stats' })
  })

  it('should return 500 when stats service rejects with undefined', async () => {
    vi.mocked(getLearningStats).mockRejectedValue(undefined)

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/stats'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to load learning stats' })
  })
})

// ---------------------------------------------------------------------------
// GET /api/learning/knowledge-map
// ---------------------------------------------------------------------------

describe('GET /api/learning/knowledge-map', () => {
  it('should return nodes and edges', async () => {
    const mapData = { nodes: [{ id: 'n1', label: 'Physics' }], edges: [] }
    vi.mocked(getKnowledgeMapData).mockResolvedValue(mapData as any)

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/knowledge-map'])

    expect(res._body.ok).toBe(true)
    expect(res._body.nodes).toBeDefined()
  })

  it('should return 500 on service error', async () => {
    vi.mocked(getKnowledgeMapData).mockRejectedValue(new Error('Map error'))

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/knowledge-map'])

    expect(res._status).toBe(500)
  })

  it('should return 500 when knowledge map service rejects without a message', async () => {
    vi.mocked(getKnowledgeMapData).mockRejectedValue('plain failure')

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/knowledge-map'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to load knowledge map' })
  })

  it('should return 500 when knowledge map service rejects with undefined', async () => {
    vi.mocked(getKnowledgeMapData).mockRejectedValue(undefined)

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/knowledge-map'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to load knowledge map' })
  })
})

// ---------------------------------------------------------------------------
// GET /api/learning/subjects
// ---------------------------------------------------------------------------

describe('GET /api/learning/subjects', () => {
  it('should return subject stats array', async () => {
    const subjects = [{ subject: 'math', flashcardCount: 10, nodeCount: 5 }]
    vi.mocked(getSubjectStats).mockResolvedValue(subjects as any)

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/subjects'])

    expect(res._body.ok).toBe(true)
    expect(res._body.subjects).toEqual(subjects)
  })

  it('should return 500 on service error', async () => {
    vi.mocked(getSubjectStats).mockRejectedValue(new Error('Subjects error'))

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/subjects'])

    expect(res._status).toBe(500)
  })

  it('should return 500 when subject stats service rejects without a message', async () => {
    vi.mocked(getSubjectStats).mockRejectedValue('plain failure')

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/subjects'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to load subject stats' })
  })

  it('should return 500 when subject stats service rejects with undefined', async () => {
    vi.mocked(getSubjectStats).mockRejectedValue(undefined)

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/subjects'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to load subject stats' })
  })
})

// ---------------------------------------------------------------------------
// GET /api/learning/activity
// ---------------------------------------------------------------------------

describe('GET /api/learning/activity', () => {
  it('should return recent activity', async () => {
    const activity = [{ type: 'quiz', timestamp: Date.now() }]
    vi.mocked(getRecentActivity).mockResolvedValue(activity as any)

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/activity'])

    expect(res._body.ok).toBe(true)
    expect(res._body.activity).toEqual(activity)
  })

  it('should use limit from query parameter', async () => {
    vi.mocked(getRecentActivity).mockResolvedValue([])

    const req = mockReq({ query: { limit: '5' } })
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/activity'])

    expect(getRecentActivity).toHaveBeenCalledWith(5)
  })

  it('should use default limit of 10 when not provided', async () => {
    vi.mocked(getRecentActivity).mockResolvedValue([])

    const req = mockReq({ query: {} })
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/activity'])

    expect(getRecentActivity).toHaveBeenCalledWith(10)
  })

  it('should use default limit when query limit is invalid NaN', async () => {
    vi.mocked(getRecentActivity).mockResolvedValue([])

    const req = mockReq({ query: { limit: 'abc' } })
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/activity'])

    expect(getRecentActivity).toHaveBeenCalledWith(10)
  })

  it('should use default limit when query limit is 0', async () => {
    vi.mocked(getRecentActivity).mockResolvedValue([])

    const req = mockReq({ query: { limit: '0' } })
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/activity'])

    expect(getRecentActivity).toHaveBeenCalledWith(10)
  })

  it('should return 500 on service error', async () => {
    vi.mocked(getRecentActivity).mockRejectedValue(new Error('Activity error'))

    const req = mockReq({ query: {} })
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/activity'])

    expect(res._status).toBe(500)
  })

  it('should return 500 when activity service rejects without a message', async () => {
    vi.mocked(getRecentActivity).mockRejectedValue('plain failure')

    const req = mockReq({ query: {} })
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/activity'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to load activity' })
  })
})

// ---------------------------------------------------------------------------
// GET /api/learning/weak-areas
// ---------------------------------------------------------------------------

describe('GET /api/learning/weak-areas', () => {
  it('should return weak areas array', async () => {
    const weakAreas = [{ subject: 'calculus', topic: 'integration', score: 30 }]
    vi.mocked(identifyWeakAreas).mockResolvedValue(weakAreas as any)

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/weak-areas'])

    expect(res._body.ok).toBe(true)
    expect(res._body.weakAreas).toEqual(weakAreas)
  })

  it('should return 500 on service error', async () => {
    vi.mocked(identifyWeakAreas).mockRejectedValue(new Error('Analysis error'))

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/weak-areas'])

    expect(res._status).toBe(500)
  })

  it('should return 500 when weak areas service rejects without a message', async () => {
    vi.mocked(identifyWeakAreas).mockRejectedValue('plain failure')

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/weak-areas'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to identify weak areas' })
  })

  it('should return 500 when weak areas service rejects with undefined', async () => {
    vi.mocked(identifyWeakAreas).mockRejectedValue(undefined)

    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/weak-areas'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to identify weak areas' })
  })
})

// ---------------------------------------------------------------------------
// GET /api/learning/trend
// ---------------------------------------------------------------------------

describe('GET /api/learning/trend', () => {
  it('should return trend data array', async () => {
    const trend = [{ date: '2025-01-01', studyTime: 45, flashcardsReviewed: 10, quizScore: 80 }]
    vi.mocked(calculateLearningTrend).mockResolvedValue(trend as any)

    const req = mockReq({ query: {} })
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/trend'])

    expect(res._body.ok).toBe(true)
    expect(res._body.trend).toEqual(trend)
  })

  it('should use days from query parameter', async () => {
    vi.mocked(calculateLearningTrend).mockResolvedValue([])

    const req = mockReq({ query: { days: '14' } })
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/trend'])

    expect(calculateLearningTrend).toHaveBeenCalledWith(14)
  })

  it('should use default of 30 days when not provided', async () => {
    vi.mocked(calculateLearningTrend).mockResolvedValue([])

    const req = mockReq({ query: {} })
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/trend'])

    expect(calculateLearningTrend).toHaveBeenCalledWith(30)
  })

  it('should use default days when query days is invalid NaN', async () => {
    vi.mocked(calculateLearningTrend).mockResolvedValue([])

    const req = mockReq({ query: { days: 'xyz' } })
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/trend'])

    expect(calculateLearningTrend).toHaveBeenCalledWith(30)
  })

  it('should use default days when query days is 0', async () => {
    vi.mocked(calculateLearningTrend).mockResolvedValue([])

    const req = mockReq({ query: { days: '0' } })
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/trend'])

    expect(calculateLearningTrend).toHaveBeenCalledWith(30)
  })

  it('should return 500 on service error', async () => {
    vi.mocked(calculateLearningTrend).mockRejectedValue(new Error('Trend error'))

    const req = mockReq({ query: {} })
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/trend'])

    expect(res._status).toBe(500)
  })

  it('should return 500 when trend service rejects without a message', async () => {
    vi.mocked(calculateLearningTrend).mockRejectedValue('plain failure')

    const req = mockReq({ query: {} })
    const res = mockRes()
    await exec(req, res, app.routes['GET /api/learning/trend'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to calculate trend' })
  })
})
