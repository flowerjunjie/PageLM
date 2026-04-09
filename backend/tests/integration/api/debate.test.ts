/**
 * Debate Routes Integration Tests
 *
 * Tests for POST /debate/start, POST /debate/:id/argue, GET /debate/:id,
 * GET /debates, DELETE /debate/:id, POST /debate/:id/surrender,
 * POST /debate/:id/analyze route handlers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../../src/services/debate', () => ({
  createDebateSession: vi.fn(),
  getDebateSession: vi.fn(),
  streamDebateResponse: vi.fn(),
  streamDebateAnalysis: vi.fn(),
  listDebateSessions: vi.fn(),
  deleteDebateSession: vi.fn(),
  surrenderDebate: vi.fn(),
  analyzeDebate: vi.fn(),
}))

vi.mock('../../../src/config/env', () => ({
  config: {
    jwtSecret: 'test-secret-key-for-testing-only',
  }
}))

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(() => ({ userId: 'test-user', sub: 'test-user' })),
    sign: vi.fn(() => 'test-token'),
  },
}))

import {
  createDebateSession,
  getDebateSession,
  listDebateSessions,
  deleteDebateSession,
  surrenderDebate,
} from '../../../src/services/debate'
import { debateRoutes, connectionLimiter } from '../../../src/core/routes/debate'
import { config } from '../../../src/config/env'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

type Handler = (req: any, res: any, next?: any) => any

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

function execRoute(routeHandlers: Handler[], req: any, res: any): any {
  if (routeHandlers.length === 0) return
  const [first, ...rest] = routeHandlers
  if (rest.length === 0) {
    return first(req, res)
  }
  const next = () => { execRoute(rest, req, res) }
  const result = first(req, res, next)
  // If first returns a promise (async middleware), wait for it
  if (result && typeof result.then === 'function') {
    return result.then(() => execRoute(rest, req, res))
  }
  // Sync middleware called next() to schedule rest
  return execRoute(rest, req, res)
}

function mockRes() {
  const res: any = {
    _status: 200,
    _body: undefined,
    statusCode: 200,
    status: vi.fn(function (code: number) { res._status = code; res.statusCode = code; return res }),
    json: vi.fn(function (body: any) { res._body = body; return res }),
    send: vi.fn(function (body: any) { res._body = body; return res }),
  }
  return res
}

function mockReq(overrides: any = {}) {
  const userId = overrides.userId || 'test-user'
  const token = jwt.sign({ userId }, config.jwtSecret, { algorithm: 'HS256' })
  const headers = { authorization: `Bearer ${token}`, ...overrides.headers }
  return {
    body: {},
    params: {},
    query: {},
    headers,
    user: { id: userId },
    userId,
    ...overrides,
    headers,
  }
}

const sampleSession = {
  id: 'debate-1',
  userId: 'test-user',
  topic: 'Should AI replace teachers?',
  position: 'for',
  messages: [],
  createdAt: new Date().toISOString(),
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let app: ReturnType<typeof createApp>

beforeEach(() => {
  vi.clearAllMocks()
  connectionLimiter.reset()
  app = createApp()
  debateRoutes(app)
})

// ---------------------------------------------------------------------------
// POST /debate/start
// ---------------------------------------------------------------------------

describe('POST /debate/start', () => {
  it('should return 400 when topic is missing', async () => {
    const req = mockReq({ body: { position: 'for' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/start'], req, res)

    expect(res._status).toBe(400)
    expect(res._body.ok).toBe(false)
    expect(res._body.error).toContain('Topic is required')
  })

  it('should return 400 when topic is empty string', async () => {
    const req = mockReq({ body: { topic: '   ', position: 'for' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/start'], req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('Topic is required')
  })

  it('should return 400 when position is missing', async () => {
    const req = mockReq({ body: { topic: 'AI ethics' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/start'], req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain("Position must be 'for' or 'against'")
  })

  it('should return 400 when position is invalid', async () => {
    const req = mockReq({ body: { topic: 'AI ethics', position: 'neutral' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/start'], req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain("Position must be 'for' or 'against'")
  })

  it('should create session when topic and valid position provided (for)', async () => {
    vi.mocked(createDebateSession).mockResolvedValue(sampleSession as any)

    const req = mockReq({ body: { topic: 'Should AI replace teachers?', position: 'for' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/start'], req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.debateId).toBe('debate-1')
    expect(res._body.stream).toContain('/ws/debate?debateId=debate-1')
  })

  it('should create session with position "against"', async () => {
    vi.mocked(createDebateSession).mockResolvedValue({ ...sampleSession, position: 'against' } as any)

    const req = mockReq({ body: { topic: 'AI in education', position: 'against' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/start'], req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.debateId).toBeDefined()
  })

  it('should return 500 when service throws', async () => {
    vi.mocked(createDebateSession).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ body: { topic: 'AI ethics', position: 'for' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/start'], req, res)

    expect(res._status).toBe(500)
    expect(res._body.ok).toBe(false)
  })

  it('should use fallback error when service rejects without a message', async () => {
    vi.mocked(createDebateSession).mockRejectedValue({ message: null })

    const req = mockReq({ body: { topic: 'AI ethics', position: 'for' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/start'], req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to start debate' })
  })
})

// ---------------------------------------------------------------------------
// POST /debate/:debateId/argue
// ---------------------------------------------------------------------------

describe('POST /debate/:debateId/argue', () => {
  it('should return 400 when argument is missing', async () => {
    vi.mocked(getDebateSession).mockResolvedValue(sampleSession as any)

    const req = mockReq({ params: { debateId: 'debate-1' }, body: {} })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/:debateId/argue'], req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('Argument is required')
  })

  it('should return 400 when argument is empty string', async () => {
    const req = mockReq({ params: { debateId: 'debate-1' }, body: { argument: '   ' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/:debateId/argue'], req, res)

    expect(res._status).toBe(400)
  })

  it('should return 404 when debate session not found', async () => {
    vi.mocked(getDebateSession).mockResolvedValue(null)

    const req = mockReq({ params: { debateId: 'nonexistent' }, body: { argument: 'My argument' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/:debateId/argue'], req, res)

    expect(res._status).toBe(404)
    expect(res._body.error).toContain('Debate session not found')
  })

  it('should return 202 when session found and argument valid', async () => {
    vi.mocked(getDebateSession).mockResolvedValue(sampleSession as any)

    const req = mockReq({ params: { debateId: 'debate-1' }, body: { argument: 'AI cannot empathize with students' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/:debateId/argue'], req, res)

    expect(res._status).toBe(202)
    expect(res._body.ok).toBe(true)
  })

  it('should return 500 on unexpected error', async () => {
    const req = {
      params: new Proxy({}, { get: () => { throw new Error('unexpected') } }),
      body: { argument: 'Something' },
    }
    const res = mockRes()

    await execRoute(app.routes['POST /debate/:debateId/argue'], req, res)

    expect(res._status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// GET /debate/:debateId
// ---------------------------------------------------------------------------

describe('GET /debate/:debateId', () => {
  it('should return 404 when session not found', async () => {
    vi.mocked(getDebateSession).mockResolvedValue(null)

    const req = mockReq({ params: { debateId: 'nonexistent' } })
    const res = mockRes()

    await execRoute(app.routes['GET /debate/:debateId'], req, res)

    expect(res._status).toBe(404)
    expect(res._body.error).toContain('Debate session not found')
  })

  it('should return session when found', async () => {
    vi.mocked(getDebateSession).mockResolvedValue(sampleSession as any)

    const req = mockReq({ params: { debateId: 'debate-1' } })
    const res = mockRes()

    await execRoute(app.routes['GET /debate/:debateId'], req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.session.id).toBe('debate-1')
  })

  it('should return 500 on service error', async () => {
    vi.mocked(getDebateSession).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ params: { debateId: 'debate-1' } })
    const res = mockRes()

    await execRoute(app.routes['GET /debate/:debateId'], req, res)

    expect(res._status).toBe(500)
  })

  it('should use fallback error when service rejects without a message', async () => {
    vi.mocked(getDebateSession).mockRejectedValue({})

    const req = mockReq({ params: { debateId: 'debate-1' } })
    const res = mockRes()

    await execRoute(app.routes['GET /debate/:debateId'], req, res)

    expect(res._status).toBe(500)
    expect(res._body.error).toContain('Failed to get debate')
  })
})

// ---------------------------------------------------------------------------
// GET /debates
// ---------------------------------------------------------------------------

describe('GET /debates', () => {
  it('should return empty list when no debates', async () => {
    vi.mocked(listDebateSessions).mockResolvedValue([])

    const req = mockReq()
    const res = mockRes()

    await execRoute(app.routes['GET /debates'], req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.debates).toEqual([])
  })

  it('should return list of debates with summary fields', async () => {
    const sessions = [
      { ...sampleSession, messages: [{ role: 'user', content: 'Test' }] },
    ]
    vi.mocked(listDebateSessions).mockResolvedValue(sessions as any)

    const req = mockReq()
    const res = mockRes()

    await execRoute(app.routes['GET /debates'], req, res)

    expect(res._body.debates).toHaveLength(1)
    expect(res._body.debates[0].id).toBe('debate-1')
    expect(res._body.debates[0].messageCount).toBe(1)
    expect(res._body.debates[0].topic).toBe('Should AI replace teachers?')
  })

  it('should return 500 on service error', async () => {
    vi.mocked(listDebateSessions).mockRejectedValue(new Error('fail'))

    const req = mockReq()
    const res = mockRes()

    await execRoute(app.routes['GET /debates'], req, res)

    expect(res._status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// DELETE /debate/:debateId
// ---------------------------------------------------------------------------

describe('DELETE /debate/:debateId', () => {
  it('should return 404 when session not found', async () => {
    vi.mocked(deleteDebateSession).mockResolvedValue(false)

    const req = mockReq({ params: { debateId: 'nonexistent' } })
    const res = mockRes()

    await execRoute(app.routes['DELETE /debate/:debateId'], req, res)

    expect(res._status).toBe(404)
    expect(res._body.error).toContain('Debate session not found')
  })

  it('should return ok when session deleted', async () => {
    vi.mocked(deleteDebateSession).mockResolvedValue(true)

    const req = mockReq({ params: { debateId: 'debate-1' } })
    const res = mockRes()

    await execRoute(app.routes['DELETE /debate/:debateId'], req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.message).toContain('deleted')
  })

  it('should return 500 on service error', async () => {
    vi.mocked(deleteDebateSession).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ params: { debateId: 'debate-1' } })
    const res = mockRes()

    await execRoute(app.routes['DELETE /debate/:debateId'], req, res)

    expect(res._status).toBe(500)
  })

  it('should use fallback error when delete service rejects without a message', async () => {
    vi.mocked(deleteDebateSession).mockRejectedValue({ message: undefined })

    const req = mockReq({ params: { debateId: 'debate-1' } })
    const res = mockRes()

    await execRoute(app.routes['DELETE /debate/:debateId'], req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to delete debate' })
  })
})

// ---------------------------------------------------------------------------
// POST /debate/:debateId/surrender
// ---------------------------------------------------------------------------

describe('POST /debate/:debateId/surrender', () => {
  it('should return 404 when session not found', async () => {
    vi.mocked(getDebateSession).mockResolvedValue(null)

    const req = mockReq({ params: { debateId: 'nonexistent' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/:debateId/surrender'], req, res)

    expect(res._status).toBe(404)
  })

  it('should surrender and return ok', async () => {
    vi.mocked(getDebateSession).mockResolvedValue(sampleSession as any)
    vi.mocked(surrenderDebate).mockResolvedValue(undefined)

    const req = mockReq({ params: { debateId: 'debate-1' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/:debateId/surrender'], req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.message).toContain('surrendered')
  })

  it('should return 500 on service error', async () => {
    vi.mocked(getDebateSession).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ params: { debateId: 'debate-1' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/:debateId/surrender'], req, res)

    expect(res._status).toBe(500)
  })

  it('should use fallback error when surrender service rejects without a message', async () => {
    vi.mocked(getDebateSession).mockRejectedValue({ message: '' })

    const req = mockReq({ params: { debateId: 'debate-1' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/:debateId/surrender'], req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to surrender debate' })
  })
})

// ---------------------------------------------------------------------------
// POST /debate/:debateId/analyze
// ---------------------------------------------------------------------------

describe('POST /debate/:debateId/analyze', () => {
  it('should return 404 when session not found', async () => {
    vi.mocked(getDebateSession).mockResolvedValue(null)

    const req = mockReq({ params: { debateId: 'nonexistent' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/:debateId/analyze'], req, res)

    expect(res._status).toBe(404)
  })

  it('should return 202 with stream path when session found', async () => {
    vi.mocked(getDebateSession).mockResolvedValue(sampleSession as any)

    const req = mockReq({ params: { debateId: 'debate-1' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/:debateId/analyze'], req, res)

    expect(res._status).toBe(202)
    expect(res._body.ok).toBe(true)
    expect(res._body.stream).toContain('/ws/debate/analyze?debateId=debate-1')
  })

  it('should return 500 on service error', async () => {
    vi.mocked(getDebateSession).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ params: { debateId: 'debate-1' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/:debateId/analyze'], req, res)

    expect(res._status).toBe(500)
  })

  it('should use fallback error when analyze service rejects without a message', async () => {
    vi.mocked(getDebateSession).mockRejectedValue({ message: null })

    const req = mockReq({ params: { debateId: 'debate-1' } })
    const res = mockRes()

    await execRoute(app.routes['POST /debate/:debateId/analyze'], req, res)

    expect(res._status).toBe(500)
    expect(res._body.error).toContain('Failed to analyze debate')
  })
})

// ---------------------------------------------------------------------------
// WS /ws/debate - WebSocket handler
// ---------------------------------------------------------------------------

describe('WS /ws/debate', () => {
  it('should close WebSocket when debateId is missing', () => {
    const mockWs: any = {
      close: vi.fn(),
      on: vi.fn(),
      addEventListener: vi.fn(),
      send: vi.fn(),
    }
    const mockReqWs = {
      url: '/ws/debate',
      query: { token: 'test-token' },
      socket: { remoteAddress: '127.0.0.1' }
    }

    app.routes['WS /ws/debate'][0](mockWs, mockReqWs)

    expect(mockWs.close).toHaveBeenCalledWith(1008, 'debateId required')
  })

  it('should set up WebSocket connection when debateId is provided', () => {
    const mockWs: any = {
      close: vi.fn(),
      on: vi.fn(),
      addEventListener: vi.fn(),
      send: vi.fn(),
    }
    const mockReqWs = {
      url: '/ws/debate?debateId=debate-ws-test',
      query: { debateId: 'debate-ws-test', token: 'test-token' },
      socket: { remoteAddress: '127.0.0.1' }
    }

    app.routes['WS /ws/debate'][0](mockWs, mockReqWs)

    expect(mockWs.close).not.toHaveBeenCalled()
    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ready"')
    )
    expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function))
  })

  it('should handle close event by removing WebSocket from set', () => {
    const mockWs: any = { close: vi.fn(), on: vi.fn(), addEventListener: vi.fn(), send: vi.fn() }
    const mockReqWs = {
      url: '/ws/debate?debateId=close-debate-test',
      query: { debateId: 'close-debate-test', token: 'test-token' },
      socket: { remoteAddress: '127.0.0.1' }
    }

    app.routes['WS /ws/debate'][0](mockWs, mockReqWs)

    const closeHandlers = mockWs.on.mock.calls
      .filter((call: any[]) => call[0] === 'close')
      .map((call: any[]) => call[1])

    if (closeHandlers.length > 0) {
      expect(() => closeHandlers[0]()).not.toThrow()
    }
  })
})

// ---------------------------------------------------------------------------
// WS /ws/debate/analyze - Analysis WebSocket handler
// ---------------------------------------------------------------------------

describe('WS /ws/debate/analyze', () => {
  it('should close WebSocket when debateId is missing', () => {
    const mockWs: any = {
      close: vi.fn(),
      on: vi.fn(),
      addEventListener: vi.fn(),
      send: vi.fn(),
    }
    const mockReqWs = {
      url: '/ws/debate/analyze',
      query: { token: 'test-token' },
      socket: { remoteAddress: '127.0.0.1' }
    }

    app.routes['WS /ws/debate/analyze'][0](mockWs, mockReqWs)

    expect(mockWs.close).toHaveBeenCalledWith(1008, 'debateId required')
  })

  it('should set up analysis WebSocket connection when debateId is provided', () => {
    const mockWs: any = {
      close: vi.fn(),
      on: vi.fn(),
      addEventListener: vi.fn(),
      send: vi.fn(),
    }
    const mockReqWs = {
      url: '/ws/debate/analyze?debateId=analyze-ws-test',
      query: { debateId: 'analyze-ws-test', token: 'test-token' },
      socket: { remoteAddress: '127.0.0.1' }
    }

    app.routes['WS /ws/debate/analyze'][0](mockWs, mockReqWs)

    expect(mockWs.close).not.toHaveBeenCalled()
    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ready"')
    )
    expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function))
  })
})
