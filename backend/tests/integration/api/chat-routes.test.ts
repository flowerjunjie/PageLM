/**
 * Chat Routes Integration Tests
 *
 * Tests for POST /chat, GET /chats, GET /chats/:id route handlers
 * from src/core/routes/chat.ts (synchronous validation paths).
 * The async WebSocket streaming background processing is not tested deeply.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

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

vi.mock('../../../src/config/env', () => ({
  config: {
    jwtSecret: 'test-secret-key-for-testing-only',
  }
}))

import { chatRoutes } from '../../../src/core/routes/chat'
import { mkChat, getChat, listChats, getMsgs } from '../../../src/utils/chat/chat'
import { parseMultipart } from '../../../src/lib/parser/upload'
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
    ws: (path: string, handler: Handler) => { routes[`WS ${path}`] = [handler] },
  }
}

function mockRes() {
  const res: any = {
    _status: 200,
    _body: undefined,
    statusCode: 200,
    headersSent: false,
    status: vi.fn(function (code: number) { res._status = code; res.statusCode = code; res.headersSent = true; return res }),
    send: vi.fn(function (body: any) { res._body = body; res.headersSent = true; return res }),
    json: vi.fn(function (body: any) { res._body = body; res.headersSent = true; return res }),
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

// Execute middleware chain and call final handler
async function exec(req: any, res: any, handlers: Handler[]) {
  let index = 0
  const next = () => { index++ }
  while (index < handlers.length) {
    const handler = handlers[index]
    if (handler.length > 2) {
      await new Promise<void>(resolve => {
        const nextCb = () => { resolve() }
        const result = handler(req, res, nextCb)
        if (result && typeof result.then === 'function') {
          result.then(() => { if (res.headersSent) resolve() })
        }
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
  vi.mocked(mkChat).mockResolvedValue({ id: 'chat-new', title: 'New Chat' } as any)
  vi.mocked(getChat).mockResolvedValue(null)
  app = createApp()
  chatRoutes(app)
})

// ---------------------------------------------------------------------------
// POST /chat (routes/chat.ts)
// ---------------------------------------------------------------------------

describe('POST /chat (routes/chat.ts)', () => {
  it('should return 400 when q is missing for JSON body', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()
    await exec(req, res, app.routes['POST /chat'])

    expect(res._status).toBe(400)
    expect(res._body.error).toBe('q required')
  })

  it('should return 400 when q is empty string', async () => {
    const req = mockReq({ body: { q: '' } })
    const res = mockRes()
    await exec(req, res, app.routes['POST /chat'])

    expect(res._status).toBe(400)
    expect(res._body.error).toBe('q required')
  })

  it('should return 202 with chatId when q is valid', async () => {
    const req = mockReq({ body: { q: 'Hello world' } })
    const res = mockRes()
    await exec(req, res, app.routes['POST /chat'])

    expect(res._status).toBe(202)
    expect(res._body.ok).toBe(true)
    expect(res._body.chatId).toBeDefined()
    expect(typeof res._body.chatId).toBe('string')
  })

  it('should return WebSocket stream path', async () => {
    const req = mockReq({ body: { q: 'Hello' } })
    const res = mockRes()
    await exec(req, res, app.routes['POST /chat'])

    expect(res._body.stream).toMatch(/^\/ws\/chat\?chatId=/)
  })

  it('should use existing chatId when provided and found', async () => {
    vi.mocked(getChat).mockResolvedValue({ id: 'existing-chat', title: 'Existing' })
    const req = mockReq({ body: { q: 'Hello', chatId: 'existing-chat' } })
    const res = mockRes()
    await exec(req, res, app.routes['POST /chat'])

    expect(getChat).toHaveBeenCalledWith('existing-chat', 'test-user')
    expect(res._body.chatId).toBe('existing-chat')
  })

  it('should create new chat when chatId not found', async () => {
    vi.mocked(getChat).mockResolvedValue(null)
    const req = mockReq({ body: { q: 'Hello', chatId: 'nonexistent' } })
    const res = mockRes()
    await exec(req, res, app.routes['POST /chat'])

    expect(mkChat).toHaveBeenCalledWith('Hello', 'test-user')
  })

  it('should return 400 when q is missing in multipart form', async () => {
    vi.mocked(parseMultipart).mockResolvedValue({ q: '', chatId: undefined, files: [] })
    const req = mockReq({ headers: { 'content-type': 'multipart/form-data' } })
    const res = mockRes()
    await exec(req, res, app.routes['POST /chat'])

    expect(res._status).toBe(400)
    expect(res._body.error).toBe('q required for file uploads')
  })

  it('should return 202 with chatId when multipart q is provided', async () => {
    vi.mocked(parseMultipart).mockResolvedValue({ q: 'From file', chatId: undefined, files: [] })
    const req = mockReq({ headers: { 'content-type': 'multipart/form-data' } })
    const res = mockRes()
    await exec(req, res, app.routes['POST /chat'])

    expect(res._status).toBe(202)
    expect(res._body.ok).toBe(true)
  })

  it('should call next when multipart parsing fails', async () => {
    const error = new Error('parse failed')
    vi.mocked(parseMultipart).mockRejectedValue(error)
    const req = mockReq({ headers: { 'content-type': 'multipart/form-data' } })
    const res = mockRes()
    const next = vi.fn()
    await app.routes['POST /chat'][1](req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })

  it('should call next when mkChat fails synchronously', async () => {
    const error = new Error('mkChat failed')
    vi.mocked(mkChat).mockRejectedValue(error)
    const req = mockReq({ body: { q: 'Hello' } })
    const res = mockRes()
    const next = vi.fn()
    await app.routes['POST /chat'][1](req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })

  it('should return 401 when no token provided', async () => {
    const req = { body: { q: 'Hello' }, params: {}, query: {}, headers: {} }
    const res = mockRes()
    await exec(req, res, app.routes['POST /chat'])

    expect(res._status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// GET /chats (routes/chat.ts)
// ---------------------------------------------------------------------------

describe('GET /chats (routes/chat.ts)', () => {
  it('should return empty list when no chats', async () => {
    vi.mocked(listChats).mockResolvedValue([])
    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /chats'])

    expect(res._body.ok).toBe(true)
    expect(res._body.chats).toEqual([])
  })

  it('should return all chats', async () => {
    const chats = [
      { id: 'chat-1', title: 'Chat 1' },
      { id: 'chat-2', title: 'Chat 2' },
    ]
    vi.mocked(listChats).mockResolvedValue(chats as any)
    const req = mockReq()
    const res = mockRes()
    await exec(req, res, app.routes['GET /chats'])

    expect(res._body.ok).toBe(true)
    expect(res._body.chats).toEqual(chats)
  })

  it('should return 401 when no token provided', async () => {
    const req = { body: {}, params: {}, query: {}, headers: {} }
    const res = mockRes()
    await exec(req, res, app.routes['GET /chats'])

    expect(res._status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// GET /chats/:id (routes/chat.ts)
// ---------------------------------------------------------------------------

describe('GET /chats/:id (routes/chat.ts)', () => {
  it('should return 404 when chat not found', async () => {
    vi.mocked(getChat).mockResolvedValue(null)
    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()
    await exec(req, res, app.routes['GET /chats/:id'])

    expect(res._status).toBe(404)
    expect(res._body.error).toBe('not found')
  })

  it('should return chat with messages when found', async () => {
    const chat = { id: 'chat-1', title: 'Test Chat' }
    const messages = [{ role: 'user', content: 'Hello' }]
    vi.mocked(getChat).mockResolvedValue(chat as any)
    vi.mocked(getMsgs).mockResolvedValue(messages as any)
    const req = mockReq({ params: { id: 'chat-1' } })
    const res = mockRes()
    await exec(req, res, app.routes['GET /chats/:id'])

    expect(res._body.ok).toBe(true)
    expect(res._body.chat).toEqual(chat)
    expect(res._body.messages).toEqual(messages)
  })

  it('should return empty messages when chat has none', async () => {
    const chat = { id: 'chat-1', title: 'Test Chat' }
    vi.mocked(getChat).mockResolvedValue(chat as any)
    vi.mocked(getMsgs).mockResolvedValue([])
    const req = mockReq({ params: { id: 'chat-1' } })
    const res = mockRes()
    await exec(req, res, app.routes['GET /chats/:id'])

    expect(res._body.ok).toBe(true)
    expect(res._body.messages).toEqual([])
  })

  it('should return 401 when no token provided', async () => {
    const req = { body: {}, params: { id: 'chat-1' }, query: {}, headers: {} }
    const res = mockRes()
    await exec(req, res, app.routes['GET /chats/:id'])

    expect(res._status).toBe(401)
  })
})
