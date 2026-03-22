/**
 * Chat Routes Integration Tests
 *
 * Tests for POST /chat, GET /chats, GET /chats/:id route handlers
 * from src/core/routes/chat.ts (synchronous validation paths).
 * The async WebSocket streaming background processing is not tested deeply.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../../src/lib/ai/ask', () => ({
  handleAsk: vi.fn().mockResolvedValue('AI response text'),
}))

vi.mock('../../../src/lib/parser/upload', () => ({
  parseMultipart: vi.fn(),
  handleUpload: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/utils/chat/chat', () => ({
  mkChat: vi.fn().mockResolvedValue({ id: 'chat-new', title: 'New Chat' }),
  getChat: vi.fn().mockResolvedValue(null),
  addMsg: vi.fn().mockResolvedValue(undefined),
  listChats: vi.fn().mockResolvedValue([]),
  getMsgs: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../src/utils/chat/ws', () => ({
  emitToAll: vi.fn(),
}))

import { chatRoutes } from '../../../src/core/routes/chat'
import { mkChat, getChat, listChats, getMsgs } from '../../../src/utils/chat/chat'
import { parseMultipart } from '../../../src/lib/parser/upload'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

type Handler = (req: any, res: any, next?: any) => any

function createApp() {
  const routes: Record<string, Handler> = {}
  return {
    routes,
    get: (path: string, handler: Handler) => { routes[`GET ${path}`] = handler },
    post: (path: string, handler: Handler) => { routes[`POST ${path}`] = handler },
    ws: (path: string, handler: Handler) => { routes[`WS ${path}`] = handler },
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
  return { body: {}, params: {}, query: {}, headers: {}, ...overrides }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let app: ReturnType<typeof createApp>

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(mkChat).mockResolvedValue({ id: 'chat-new', title: 'New Chat' } as any)
  vi.mocked(getChat).mockResolvedValue(null)
  vi.mocked(listChats).mockResolvedValue([])
  vi.mocked(getMsgs).mockResolvedValue([])
  app = createApp()
  chatRoutes(app)
})

// ---------------------------------------------------------------------------
// POST /chat
// ---------------------------------------------------------------------------

describe('POST /chat (routes/chat.ts)', () => {
  it('should return 400 when q is missing for JSON body', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['POST /chat'](req, res, next)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('q required')
  })

  it('should return 400 when q is empty string', async () => {
    const req = mockReq({ body: { q: '' } })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['POST /chat'](req, res, next)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('q required')
  })

  it('should return 202 with chatId when q is valid', async () => {
    vi.mocked(mkChat).mockResolvedValue({ id: 'new-chat-abc', title: 'Test' } as any)

    const req = mockReq({ body: { q: 'What is quantum mechanics?' } })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['POST /chat'](req, res, next)

    expect(res._status).toBe(202)
    expect(res._body.ok).toBe(true)
    expect(res._body.chatId).toBe('new-chat-abc')
  })

  it('should return WebSocket stream path', async () => {
    vi.mocked(mkChat).mockResolvedValue({ id: 'stream-chat', title: 'Test' } as any)

    const req = mockReq({ body: { q: 'Explain photosynthesis' } })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['POST /chat'](req, res, next)

    expect(res._body.stream).toContain('/ws/chat?chatId=stream-chat')
  })

  it('should use existing chatId when provided and found', async () => {
    vi.mocked(getChat).mockResolvedValue({ id: 'existing-chat', title: 'Existing' } as any)

    const req = mockReq({ body: { q: 'Follow-up question', chatId: 'existing-chat' } })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['POST /chat'](req, res, next)

    expect(res._body.chatId).toBe('existing-chat')
    expect(mkChat).not.toHaveBeenCalled()
  })

  it('should create new chat when chatId not found', async () => {
    vi.mocked(getChat).mockResolvedValue(null)
    vi.mocked(mkChat).mockResolvedValue({ id: 'brand-new', title: 'New Chat' } as any)

    const req = mockReq({ body: { q: 'New question', chatId: 'nonexistent-id' } })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['POST /chat'](req, res, next)

    expect(mkChat).toHaveBeenCalled()
    expect(res._body.chatId).toBe('brand-new')
  })

  it('should return 400 when q is missing in multipart form', async () => {
    vi.mocked(parseMultipart).mockResolvedValue({ q: '', files: [] } as any)

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=xxxx' } })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['POST /chat'](req, res, next)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('q required for file uploads')
  })

  it('should return 202 with chatId when multipart q is provided', async () => {
    vi.mocked(parseMultipart).mockResolvedValue({ q: 'My question', chatId: undefined, files: [] } as any)
    vi.mocked(mkChat).mockResolvedValue({ id: 'mp-chat', title: 'MP Chat' } as any)

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=xxxx' } })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['POST /chat'](req, res, next)

    expect(res._status).toBe(202)
    expect(res._body.chatId).toBe('mp-chat')
  })

  it('should call next when multipart parsing fails', async () => {
    vi.mocked(parseMultipart).mockRejectedValue(new Error('Parse failed'))

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=xxxx' } })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['POST /chat'](req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })

  it('should call next when mkChat fails synchronously', async () => {
    vi.mocked(mkChat).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ body: { q: 'Test question' } })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['POST /chat'](req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})

// ---------------------------------------------------------------------------
// GET /chats
// ---------------------------------------------------------------------------

describe('GET /chats (routes/chat.ts)', () => {
  it('should return empty list when no chats', async () => {
    vi.mocked(listChats).mockResolvedValue([])

    const req = mockReq()
    const res = mockRes()

    await app.routes['GET /chats'](req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.chats).toEqual([])
  })

  it('should return all chats', async () => {
    const chats = [
      { id: 'chat-1', title: 'Math Chat' },
      { id: 'chat-2', title: 'Physics Chat' },
    ]
    vi.mocked(listChats).mockResolvedValue(chats as any)

    const req = mockReq()
    const res = mockRes()

    await app.routes['GET /chats'](req, res)

    expect(res._body.chats).toHaveLength(2)
    expect(res._body.chats[0].id).toBe('chat-1')
  })
})

// ---------------------------------------------------------------------------
// GET /chats/:id
// ---------------------------------------------------------------------------

describe('GET /chats/:id (routes/chat.ts)', () => {
  it('should return 404 when chat not found', async () => {
    vi.mocked(getChat).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    await app.routes['GET /chats/:id'](req, res)

    expect(res._status).toBe(404)
    expect(res._body.error).toContain('not found')
  })

  it('should return chat with messages when found', async () => {
    vi.mocked(getChat).mockResolvedValue({ id: 'chat-1', title: 'Math Chat' } as any)
    vi.mocked(getMsgs).mockResolvedValue([
      { role: 'user', content: 'Hello', at: Date.now() },
      { role: 'assistant', content: 'Hi there', at: Date.now() },
    ] as any)

    const req = mockReq({ params: { id: 'chat-1' } })
    const res = mockRes()

    await app.routes['GET /chats/:id'](req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.chat.id).toBe('chat-1')
    expect(res._body.messages).toHaveLength(2)
  })

  it('should return empty messages when chat has none', async () => {
    vi.mocked(getChat).mockResolvedValue({ id: 'chat-1', title: 'Empty Chat' } as any)
    vi.mocked(getMsgs).mockResolvedValue([])

    const req = mockReq({ params: { id: 'chat-1' } })
    const res = mockRes()

    await app.routes['GET /chats/:id'](req, res)

    expect(res._body.messages).toEqual([])
  })

  it('should return 404 when chat not found', async () => {
    vi.mocked(getChat).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    await app.routes['GET /chats/:id'](req, res)

    expect(res._status).toBe(404)
    expect(res._body.error).toContain('not found')
  })
})
