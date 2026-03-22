/**
 * Report Routes Integration Tests
 *
 * Tests for GET /api/reports/weekly, POST /api/reports/share,
 * GET /api/reports/share/:token, GET /api/reports/available-weeks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock reports service
vi.mock('../../../src/services/reports', () => ({
  generateWeeklyReport: vi.fn(),
  createShareToken: vi.fn(),
  getWeeklyReportByToken: vi.fn(),
  cleanupExpiredTokens: vi.fn(),
}))

import {
  generateWeeklyReport,
  createShareToken,
  getWeeklyReportByToken,
  cleanupExpiredTokens,
} from '../../../src/services/reports'
import { reportRoutes } from '../../../src/core/routes/reports'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

type Handler = (req: any, res: any) => any

function createApp() {
  const routes: Record<string, Handler> = {}
  return {
    routes,
    get: (path: string, handler: Handler) => { routes[`GET ${path}`] = handler },
    post: (path: string, handler: Handler) => { routes[`POST ${path}`] = handler },
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
  return { body: {}, params: {}, query: {}, user: undefined, ...overrides }
}

// ---------------------------------------------------------------------------
// Mock weekly report data
// ---------------------------------------------------------------------------

const mockReport = {
  week: '2025-W03',
  startDate: '2025-01-13',
  endDate: '2025-01-19',
  summary: { totalStudyTime: 180, studyDays: 4, flashcardsCreated: 10, quizzesCompleted: 3, averageAccuracy: 75, newTopics: 2, notesCreated: 1 },
  dailyStats: [],
  subjectDistribution: [],
  weakAreas: [],
  suggestions: [],
  comparison: { studyTimeChange: 10, accuracyChange: 5 },
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let app: ReturnType<typeof createApp>

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(cleanupExpiredTokens).mockResolvedValue(undefined)
  app = createApp()
  reportRoutes(app)
})

// ---------------------------------------------------------------------------
// GET /api/reports/weekly
// ---------------------------------------------------------------------------

describe('GET /api/reports/weekly', () => {
  it('should return weekly report with ok: true', async () => {
    vi.mocked(generateWeeklyReport).mockResolvedValue(mockReport as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    await app.routes['GET /api/reports/weekly'](req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.report).toBeDefined()
    expect(generateWeeklyReport).toHaveBeenCalledWith('default-user', undefined)
  })

  it('should pass week query parameter to service', async () => {
    vi.mocked(generateWeeklyReport).mockResolvedValue(mockReport as any)

    const req = mockReq({ query: { week: '2025-W10' } })
    const res = mockRes()

    await app.routes['GET /api/reports/weekly'](req, res)

    expect(generateWeeklyReport).toHaveBeenCalledWith('default-user', '2025-W10')
  })

  it('should use req.user.id when authenticated', async () => {
    vi.mocked(generateWeeklyReport).mockResolvedValue(mockReport as any)

    const req = mockReq({ query: {}, user: { id: 'user-auth-123' } })
    const res = mockRes()

    await app.routes['GET /api/reports/weekly'](req, res)

    expect(generateWeeklyReport).toHaveBeenCalledWith('user-auth-123', undefined)
  })

  it('should return 500 on service error', async () => {
    vi.mocked(generateWeeklyReport).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ query: {} })
    const res = mockRes()

    await app.routes['GET /api/reports/weekly'](req, res)

    expect(res._status).toBe(500)
    expect(res._body.ok).toBe(false)
  })

  it('should use fallback error when weekly report error has no message', async () => {
    vi.mocked(generateWeeklyReport).mockRejectedValue(null)

    const req = mockReq({ query: {} })
    const res = mockRes()

    await app.routes['GET /api/reports/weekly'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to generate weekly report' })
  })
})

// ---------------------------------------------------------------------------
// POST /api/reports/share
// ---------------------------------------------------------------------------

describe('POST /api/reports/share', () => {
  it('should return 400 when week is missing', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()

    await app.routes['POST /api/reports/share'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.ok).toBe(false)
  })

  it('should return 400 for invalid week format', async () => {
    const req = mockReq({ body: { week: '2025-03-01' } }) // wrong format
    const res = mockRes()

    await app.routes['POST /api/reports/share'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('Invalid week format')
  })

  it('should return 400 for week without W prefix', async () => {
    const req = mockReq({ body: { week: '2025-11' } })
    const res = mockRes()

    await app.routes['POST /api/reports/share'](req, res)

    expect(res._status).toBe(400)
  })

  it('should create share token and return shareUrl', async () => {
    vi.mocked(createShareToken).mockResolvedValue('test-share-token-abc')

    const req = mockReq({ body: { week: '2025-W03' } })
    const res = mockRes()

    await app.routes['POST /api/reports/share'](req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.token).toBe('test-share-token-abc')
    expect(res._body.shareUrl).toContain('test-share-token-abc')
    expect(res._body.expiresIn).toBe('7 days')
  })

  it('should call cleanupExpiredTokens before creating token', async () => {
    vi.mocked(createShareToken).mockResolvedValue('token')

    await app.routes['POST /api/reports/share'](
      mockReq({ body: { week: '2025-W03' } }),
      mockRes()
    )

    expect(cleanupExpiredTokens).toHaveBeenCalled()
  })

  it('should use authenticated user id when creating share token', async () => {
    vi.mocked(createShareToken).mockResolvedValue('auth-token')

    const req = mockReq({ body: { week: '2025-W03' }, user: { id: 'user-auth-123' } })
    const res = mockRes()

    await app.routes['POST /api/reports/share'](req, res)

    expect(createShareToken).toHaveBeenCalledWith('user-auth-123', '2025-W03')
  })

  it('should use FRONTEND_URL when constructing share url', async () => {
    const oldFrontendUrl = process.env.FRONTEND_URL
    process.env.FRONTEND_URL = 'https://frontend.example.com'
    vi.mocked(createShareToken).mockResolvedValue('env-token')

    try {
      const req = mockReq({ body: { week: '2025-W03' } })
      const res = mockRes()

      await app.routes['POST /api/reports/share'](req, res)

      expect(res._body.shareUrl).toBe('https://frontend.example.com/report/share/env-token')
    } finally {
      process.env.FRONTEND_URL = oldFrontendUrl
    }
  })

  it('should return 500 on service error', async () => {
    vi.mocked(createShareToken).mockRejectedValue(new Error('Token creation failed'))

    const req = mockReq({ body: { week: '2025-W03' } })
    const res = mockRes()

    await app.routes['POST /api/reports/share'](req, res)

    expect(res._status).toBe(500)
    expect(res._body.ok).toBe(false)
  })

  it('should use fallback error when share creation error has no message', async () => {
    vi.mocked(createShareToken).mockRejectedValue(undefined)

    const req = mockReq({ body: { week: '2025-W03' } })
    const res = mockRes()

    await app.routes['POST /api/reports/share'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to create share link' })
  })
})

// ---------------------------------------------------------------------------
// GET /api/reports/share/:token
// ---------------------------------------------------------------------------

describe('GET /api/reports/share/:token', () => {
  it('should return 400 when token is empty', async () => {
    const req = mockReq({ params: { token: '' } })
    const res = mockRes()

    await app.routes['GET /api/reports/share/:token'](req, res)

    expect(res._status).toBe(400)
  })

  it('should return 404 when token is invalid or expired', async () => {
    vi.mocked(getWeeklyReportByToken).mockResolvedValue(null)

    const req = mockReq({ params: { token: 'invalid-token' } })
    const res = mockRes()

    await app.routes['GET /api/reports/share/:token'](req, res)

    expect(res._status).toBe(404)
    expect(res._body.ok).toBe(false)
  })

  it('should return shared report for valid token', async () => {
    vi.mocked(getWeeklyReportByToken).mockResolvedValue(mockReport as any)

    const req = mockReq({ params: { token: 'valid-token-123' } })
    const res = mockRes()

    await app.routes['GET /api/reports/share/:token'](req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.report.week).toBe('2025-W03')
    expect(res._body.report.summary).toBeDefined()
    expect(res._body.report.dailyStats).toBeDefined()
  })

  it('should return 500 on service error', async () => {
    vi.mocked(getWeeklyReportByToken).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ params: { token: 'some-token' } })
    const res = mockRes()

    await app.routes['GET /api/reports/share/:token'](req, res)

    expect(res._status).toBe(500)
  })

  it('should use fallback error when shared report error has no message', async () => {
    vi.mocked(getWeeklyReportByToken).mockRejectedValue(null)

    const req = mockReq({ params: { token: 'some-token' } })
    const res = mockRes()

    await app.routes['GET /api/reports/share/:token'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to retrieve shared report' })
  })
})

// ---------------------------------------------------------------------------
// GET /api/reports/available-weeks
// ---------------------------------------------------------------------------

describe('GET /api/reports/available-weeks', () => {
  it('should return array of 4 week strings', async () => {
    const req = mockReq({ query: {} })
    const res = mockRes()

    await app.routes['GET /api/reports/available-weeks'](req, res)

    expect(res._body.ok).toBe(true)
    expect(Array.isArray(res._body.weeks)).toBe(true)
    expect(res._body.weeks.length).toBe(4)
  })

  it('should return week strings in YYYY-WXX format', async () => {
    const req = mockReq({ query: {} })
    const res = mockRes()

    await app.routes['GET /api/reports/available-weeks'](req, res)

    for (const week of res._body.weeks) {
      expect(week).toMatch(/^\d{4}-W\d{2}$/)
    }
  })

  it('should return 500 when available weeks generation throws', async () => {
    const getFullYearSpy = vi.spyOn(Date.prototype, 'getFullYear').mockImplementation(() => {
      throw new Error('date failure')
    })

    try {
      const req = mockReq({ query: {} })
      const res = mockRes()

      await app.routes['GET /api/reports/available-weeks'](req, res)

      expect(res._status).toBe(500)
      expect(res._body).toEqual({ ok: false, error: 'date failure' })
    } finally {
      getFullYearSpy.mockRestore()
    }
  })

  it('should use fallback error when available weeks generation throws without a message', async () => {
    const getFullYearSpy = vi.spyOn(Date.prototype, 'getFullYear').mockImplementation(() => {
      throw undefined
    })

    try {
      const req = mockReq({ query: {} })
      const res = mockRes()

      await app.routes['GET /api/reports/available-weeks'](req, res)

      expect(res._status).toBe(500)
      expect(res._body).toEqual({ ok: false, error: 'Failed to retrieve available weeks' })
    } finally {
      getFullYearSpy.mockRestore()
    }
  })
})
