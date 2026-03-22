/**
 * Companion Routes Integration Tests
 *
 * Tests for POST /api/companion/ask route handler.
 * The AI response generation is mocked; only validation and routing logic is tested.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../../src/lib/ai/ask', () => ({
  askWithContext: vi.fn().mockResolvedValue('AI companion response'),
  BASE_SYSTEM_PROMPT: 'You are a helpful AI assistant.',
}))

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn().mockReturnValue(false),
      statSync: vi.fn().mockReturnValue({ isFile: () => true, size: 1024 }),
      promises: {
        stat: vi.fn().mockResolvedValue({ isFile: () => true, size: 1024 }),
        readFile: vi.fn().mockResolvedValue('document content here'),
      },
    },
  }
})

import { companionRoutes } from '../../../src/core/routes/companion'
import { askWithContext } from '../../../src/lib/ai/ask'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

type Handler = (req: any, res: any) => any

function createApp() {
  const routes: Record<string, Handler> = {}
  return {
    routes,
    post: (path: string, handler: Handler) => { routes[`POST ${path}`] = handler },
  }
}

function mockRes() {
  const res: any = {
    _status: 200,
    _body: undefined,
    statusCode: 200,
    status: vi.fn(function (code: number) { res._status = code; res.statusCode = code; return res }),
    send: vi.fn(function (body: any) { res._body = body; return res }),
  }
  return res
}

function mockReq(overrides: any = {}) {
  return { body: {}, params: {}, query: {}, ...overrides }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let app: ReturnType<typeof createApp>

beforeEach(() => {
  vi.clearAllMocks()
  app = createApp()
  companionRoutes(app)
})

// ---------------------------------------------------------------------------
// POST /api/companion/ask
// ---------------------------------------------------------------------------

describe('POST /api/companion/ask', () => {
  it('should return 400 when question is missing', async () => {
    const req = mockReq({ body: { documentText: 'Some document text' } })
    const res = mockRes()

    await app.routes['POST /api/companion/ask'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('question required')
  })

  it('should return 400 when question is empty string', async () => {
    const req = mockReq({ body: { question: '   ', documentText: 'Some document text' } })
    const res = mockRes()

    await app.routes['POST /api/companion/ask'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('question required')
  })

  it('should return 400 when neither documentText nor filePath provided', async () => {
    const req = mockReq({ body: { question: 'What is this about?' } })
    const res = mockRes()

    await app.routes['POST /api/companion/ask'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('documentText or filePath required')
  })

  it('should return 400 when documentText is empty after trim', async () => {
    const req = mockReq({
      body: {
        question: 'What is this about?',
        documentText: '   ',
      },
    })
    const res = mockRes()

    await app.routes['POST /api/companion/ask'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('documentText or filePath required')
  })

  it('should return 200 with companion answer when documentText provided', async () => {
    vi.mocked(askWithContext).mockResolvedValue('This document is about machine learning.')

    const req = mockReq({
      body: {
        question: 'What is this document about?',
        documentText: 'Machine learning is a subset of artificial intelligence...',
      },
    })
    const res = mockRes()

    await app.routes['POST /api/companion/ask'](req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.companion).toBe('This document is about machine learning.')
  })

  it('should pass history to askWithContext when provided', async () => {
    vi.mocked(askWithContext).mockResolvedValue('Answer')

    const history = [
      { role: 'user', content: 'Previous question' },
      { role: 'assistant', content: 'Previous answer' },
    ]

    const req = mockReq({
      body: {
        question: 'Follow-up question',
        documentText: 'Some document content here',
        history,
      },
    })
    const res = mockRes()

    await app.routes['POST /api/companion/ask'](req, res)

    expect(askWithContext).toHaveBeenCalledWith(
      expect.objectContaining({ history })
    )
  })

  it('should pass topic when provided', async () => {
    vi.mocked(askWithContext).mockResolvedValue('Answer')

    const req = mockReq({
      body: {
        question: 'Explain calculus',
        documentText: 'Calculus is the study of continuous change...',
        topic: 'mathematics',
      },
    })
    const res = mockRes()

    await app.routes['POST /api/companion/ask'](req, res)

    expect(askWithContext).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'mathematics' })
    )
  })

  it('should return 404 when filePath resolves to no accessible file', async () => {
    const req = mockReq({
      body: {
        question: 'What is this about?',
        filePath: '/nonexistent/path/document.pdf',
      },
    })
    const res = mockRes()

    await app.routes['POST /api/companion/ask'](req, res)

    expect(res._status).toBe(404)
    expect(res._body.error).toContain('not found')
  })

  it('should return 200 when filePath resolves successfully', async () => {
    const fs = await import('fs')
    vi.mocked(fs.default.existsSync).mockReturnValueOnce(true)
    vi.mocked(fs.default.statSync).mockReturnValueOnce({ isFile: () => true, size: 1024 })

    const req = mockReq({
      body: {
        question: 'What is this about?',
        filePath: 'storage/document.pdf',
      },
    })
    const res = mockRes()

    await app.routes['POST /api/companion/ask'](req, res)

    expect(res._status).toBe(200)
    expect(res._body.ok).toBe(true)
  })

  it('should return 400 when document is empty after read', async () => {
    const fs = await import('fs')
    vi.mocked(fs.default.existsSync).mockReturnValueOnce(true)
    vi.mocked(fs.default.statSync).mockReturnValueOnce({ isFile: () => true, size: 1024 })
    vi.mocked(fs.default.promises.readFile).mockResolvedValueOnce('   ')

    const req = mockReq({
      body: {
        question: 'What is this about?',
        filePath: 'storage/empty.pdf',
      },
    })
    const res = mockRes()

    await app.routes['POST /api/companion/ask'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('document is empty')
  })

  it('should return 400 when document is too large', async () => {
    const fs = await import('fs')
    vi.mocked(fs.default.existsSync).mockReturnValueOnce(true)
    vi.mocked(fs.default.promises.stat).mockResolvedValueOnce({
      isFile: () => true,
      size: 2 * 1024 * 1024 // 2MB > 1.5MB limit
    })

    const req = mockReq({
      body: {
        question: 'What is this about?',
        filePath: 'storage/large.pdf',
      },
    })
    const res = mockRes()

    await app.routes['POST /api/companion/ask'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('document too large')
  })

  it('should return 400 when path is not a file', async () => {
    const fs = await import('fs')
    vi.mocked(fs.default.existsSync).mockReturnValueOnce(true)
    vi.mocked(fs.default.promises.stat).mockResolvedValueOnce({
      isFile: () => false, // directory
      size: 1024
    })

    const req = mockReq({
      body: {
        question: 'What is this about?',
        filePath: 'storage/directory',
      },
    })
    const res = mockRes()

    await app.routes['POST /api/companion/ask'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('not a file')
  })

  it('should return 500 when askWithContext throws', async () => {
    vi.mocked(askWithContext).mockRejectedValue(new Error('LLM provider error'))

    const req = mockReq({
      body: {
        question: 'What is this about?',
        documentText: 'Some document content here',
      },
    })
    const res = mockRes()

    await app.routes['POST /api/companion/ask'](req, res)

    expect(res._status).toBe(500)
    expect(res._body.error).toContain('failed to run companion request')
  })

  it('should return 500 with fallback error when askWithContext throws without a message', async () => {
    vi.mocked(askWithContext).mockRejectedValue({})

    const req = mockReq({
      body: {
        question: 'What is this about?',
        documentText: 'Some document content here',
      },
    })
    const res = mockRes()

    await app.routes['POST /api/companion/ask'](req, res)

    expect(res._status).toBe(500)
    expect(res._body.error).toContain('failed to run companion request')
  })

  it('should trim topic when provided with whitespace', async () => {
    vi.mocked(askWithContext).mockResolvedValue('Answer')

    const req = mockReq({
      body: {
        question: 'Explain calculus',
        documentText: 'Calculus is the study of continuous change...',
        topic: '  mathematics  ',
      },
    })
    const res = mockRes()

    await app.routes['POST /api/companion/ask'](req, res)

    expect(askWithContext).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'mathematics' })
    )
  })

  it('should not pass topic when it is empty after trim', async () => {
    vi.mocked(askWithContext).mockResolvedValue('Answer')

    const req = mockReq({
      body: {
        question: 'Explain calculus',
        documentText: 'Calculus is the study of continuous change...',
        topic: '   ',
      },
    })
    const res = mockRes()

    await app.routes['POST /api/companion/ask'](req, res)

    expect(askWithContext).toHaveBeenCalledWith(
      expect.objectContaining({ topic: undefined })
    )
  })
})
