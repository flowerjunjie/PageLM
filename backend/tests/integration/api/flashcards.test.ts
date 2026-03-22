/**
 * Flashcard Routes Integration Tests
 *
 * Tests for POST /flashcards, GET /flashcards, DELETE /flashcards/:id
 * by calling the registered route handlers directly via a mock Express app.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all dependencies before any imports
vi.mock('../../../src/utils/database/keyv', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../src/services/spaced-repetition', () => ({
  scheduleReview: vi.fn().mockResolvedValue(undefined),
  deleteReviewSchedule: vi.fn().mockResolvedValue(undefined),
}))

import db from '../../../src/utils/database/keyv'
import { flashcardRoutes } from '../../../src/core/routes/flashcards'

// ---------------------------------------------------------------------------
// Mock Express app that captures route handlers
// ---------------------------------------------------------------------------

type RouteHandler = (req: any, res: any, next?: any) => any

interface MockApp {
  routes: Record<string, Record<string, RouteHandler>>
  get: (path: string, handler: RouteHandler) => void
  post: (path: string, handler: RouteHandler) => void
  delete: (path: string, handler: RouteHandler) => void
  ws: (path: string, handler: RouteHandler) => void
}

function createMockApp(): MockApp {
  const routes: Record<string, Record<string, RouteHandler>> = {}

  return {
    routes,
    get: (path, handler) => { routes[`GET ${path}`] = handler as any },
    post: (path, handler) => { routes[`POST ${path}`] = handler as any },
    delete: (path, handler) => { routes[`DELETE ${path}`] = handler as any },
    ws: (path, handler) => { routes[`WS ${path}`] = handler as any },
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
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let app: MockApp

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(db.get).mockResolvedValue(undefined)
  vi.mocked(db.set).mockResolvedValue(undefined)
  vi.mocked(db.delete).mockResolvedValue(undefined)

  app = createMockApp()
  flashcardRoutes(app)
})

// ---------------------------------------------------------------------------
// POST /flashcards
// ---------------------------------------------------------------------------

describe('POST /flashcards', () => {
  it('should return 400 when body is missing', async () => {
    const req = mockReq({ body: null })
    const res = mockRes()

    await (app.routes['POST /flashcards'] as any)(req, res)

    expect(res._status).toBe(400)
    expect(res._body.ok).toBe(false)
  })

  it('should return 400 when question is missing', async () => {
    const req = mockReq({ body: { answer: 'A', tag: 'math' } })
    const res = mockRes()

    await (app.routes['POST /flashcards'] as any)(req, res)

    expect(res._status).toBe(400)
  })

  it('should return 400 when answer is missing', async () => {
    const req = mockReq({ body: { question: 'Q', tag: 'math' } })
    const res = mockRes()

    await (app.routes['POST /flashcards'] as any)(req, res)

    expect(res._status).toBe(400)
  })

  it('should return 400 when tag is missing', async () => {
    const req = mockReq({ body: { question: 'Q', answer: 'A' } })
    const res = mockRes()

    await (app.routes['POST /flashcards'] as any)(req, res)

    expect(res._status).toBe(400)
  })

  it('should return 400 when question is empty string', async () => {
    const req = mockReq({ body: { question: '   ', answer: 'A', tag: 'math' } })
    const res = mockRes()

    await (app.routes['POST /flashcards'] as any)(req, res)

    expect(res._status).toBe(400)
  })

  it('should return 400 when fields are not strings', async () => {
    const req = mockReq({ body: { question: 123, answer: 'A', tag: 'math' } })
    const res = mockRes()

    await (app.routes['POST /flashcards'] as any)(req, res)

    expect(res._status).toBe(400)
  })

  it('should create flashcard and return ok: true', async () => {
    vi.mocked(db.get).mockResolvedValue([]) // existing flashcards list

    const req = mockReq({ body: { question: 'What is 2+2?', answer: '4', tag: 'math' } })
    const res = mockRes()

    await (app.routes['POST /flashcards'] as any)(req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.flashcard).toBeDefined()
    expect(res._body.flashcard.question).toBe('What is 2+2?')
    expect(res._body.flashcard.answer).toBe('4')
    expect(res._body.flashcard.tag).toBe('math')
  })

  it('should save the flashcard to the database', async () => {
    vi.mocked(db.get).mockResolvedValue([])

    const req = mockReq({ body: { question: 'Q?', answer: 'A', tag: 'physics' } })
    const res = mockRes()

    await (app.routes['POST /flashcards'] as any)(req, res)

    expect(db.set).toHaveBeenCalled()
  })

  it('should trim whitespace from question, answer, tag', async () => {
    vi.mocked(db.get).mockResolvedValue([])

    const req = mockReq({ body: { question: '  Q?  ', answer: '  A  ', tag: '  math  ' } })
    const res = mockRes()

    await (app.routes['POST /flashcards'] as any)(req, res)

    expect(res._body.flashcard.question).toBe('Q?')
    expect(res._body.flashcard.answer).toBe('A')
    expect(res._body.flashcard.tag).toBe('math')
  })

  it('should return 500 on database error', async () => {
    vi.mocked(db.get).mockRejectedValue(new Error('DB failure'))

    const req = mockReq({ body: { question: 'Q?', answer: 'A', tag: 'math' } })
    const res = mockRes()

    await (app.routes['POST /flashcards'] as any)(req, res)

    expect(res._status).toBe(500)
    expect(res._body.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// GET /flashcards
// ---------------------------------------------------------------------------

describe('GET /flashcards', () => {
  it('should return flashcards list', async () => {
    const cards = [
      { id: 'fc-1', question: 'Q1', answer: 'A1', tag: 'math' },
      { id: 'fc-2', question: 'Q2', answer: 'A2', tag: 'physics' },
    ]
    vi.mocked(db.get).mockResolvedValue(cards)

    const req = mockReq()
    const res = mockRes()

    await (app.routes['GET /flashcards'] as any)(req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.flashcards).toEqual(cards)
  })

  it('should return empty array when no flashcards exist', async () => {
    vi.mocked(db.get).mockResolvedValue(undefined)

    const req = mockReq()
    const res = mockRes()

    await (app.routes['GET /flashcards'] as any)(req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.flashcards).toEqual([])
  })

  it('should return 500 on database error', async () => {
    vi.mocked(db.get).mockRejectedValue(new Error('DB down'))

    const req = mockReq()
    const res = mockRes()

    await (app.routes['GET /flashcards'] as any)(req, res)

    expect(res._status).toBe(500)
    expect(res._body.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// DELETE /flashcards/:id
// ---------------------------------------------------------------------------

describe('DELETE /flashcards/:id', () => {
  it('should return 400 when id is missing', async () => {
    const req = mockReq({ params: { id: '' } })
    const res = mockRes()

    await (app.routes['DELETE /flashcards/:id'] as any)(req, res)

    expect(res._status).toBe(400)
  })

  it('should return 404 when flashcard does not exist', async () => {
    vi.mocked(db.get).mockResolvedValue(undefined) // flashcard not found

    const req = mockReq({ params: { id: 'nonexistent-id' } })
    const res = mockRes()

    await (app.routes['DELETE /flashcards/:id'] as any)(req, res)

    expect(res._status).toBe(404)
    expect(res._body.ok).toBe(false)
  })

  it('should delete flashcard and return ok: true', async () => {
    const card = { id: 'fc-del', question: 'Q', answer: 'A', tag: 'math' }
    vi.mocked(db.get)
      .mockResolvedValueOnce(card) // flashcard exists check
      .mockResolvedValueOnce([card]) // flashcards list

    const req = mockReq({ params: { id: 'fc-del' } })
    const res = mockRes()

    await (app.routes['DELETE /flashcards/:id'] as any)(req, res)

    expect(res._body.ok).toBe(true)
    expect(db.delete).toHaveBeenCalledWith('flashcard:fc-del')
  })

  it('should return 500 on database error', async () => {
    vi.mocked(db.get).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ params: { id: 'some-id' } })
    const res = mockRes()

    await (app.routes['DELETE /flashcards/:id'] as any)(req, res)

    expect(res._status).toBe(500)
    expect(res._body.ok).toBe(false)
  })

  it('should return 500 with fallback error when database rejects without a message', async () => {
    vi.mocked(db.get).mockRejectedValue({})

    const req = mockReq({ params: { id: 'some-id' } })
    const res = mockRes()

    await (app.routes['DELETE /flashcards/:id'] as any)(req, res)

    expect(res._status).toBe(500)
    expect(res._body.ok).toBe(false)
    expect(res._body.error).toContain('Failed to delete flashcard')
  })
})
