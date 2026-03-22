/**
 * Smart Notes Routes Integration Tests
 *
 * Tests for POST /smartnotes route handler (synchronous validation paths).
 */

import crypto from 'crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/services/smartnotes', () => ({
  handleSmartNotes: vi.fn().mockResolvedValue({ file: '/tmp/note.md' }),
}))

vi.mock('../../../src/utils/chat/ws', () => ({
  emitToAll: vi.fn(),
}))

vi.mock('../../../src/utils/quiz/promise', () => ({
  withTimeout: vi.fn().mockResolvedValue({ file: '/tmp/note.md' }),
}))

vi.mock('../../../src/config/env', () => ({
  config: { baseUrl: 'http://localhost:3000' },
}))

import { smartnotesRoutes } from '../../../src/core/routes/notes'
import { handleSmartNotes } from '../../../src/services/smartnotes'
import { emitToAll } from '../../../src/utils/chat/ws'
import { withTimeout } from '../../../src/utils/quiz/promise'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

type Handler = (req: any, res: any) => any

function createApp() {
  const routes: Record<string, Handler> = {}
  return {
    routes,
    post: (path: string, handler: Handler) => { routes[`POST ${path}`] = handler },
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
  }
  return res
}

function mockReq(overrides: any = {}) {
  return { body: {}, ...overrides }
}

function createMockWs(overrides: Record<string, any> = {}) {
  const handlers: Record<string, Function[]> = {}
  return {
    close: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      handlers[event] ||= []
      handlers[event].push(handler)
    }),
    send: vi.fn(),
    readyState: 1,
    emit: (event: string, ...args: any[]) => {
      for (const handler of handlers[event] || []) {
        handler(...args)
      }
    },
    ...overrides,
  }
}

let queuedImmediates: Array<() => unknown> = []
let setImmediateSpy: any

async function runQueuedImmediates() {
  while (queuedImmediates.length > 0) {
    const callback = queuedImmediates.shift()
    await callback?.()
    await Promise.resolve()
    await Promise.resolve()
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let app: ReturnType<typeof createApp>

afterEach(() => {
  vi.useRealTimers()
  setImmediateSpy?.mockRestore()
})

beforeEach(() => {
  vi.clearAllMocks()
  queuedImmediates = []
  setImmediateSpy = vi.spyOn(global, 'setImmediate').mockImplementation(((callback: (...args: any[]) => unknown) => {
    queuedImmediates.push(() => callback())
    return 0 as any
  }) as typeof setImmediate)
  app = createApp()
  smartnotesRoutes(app)
})

// ---------------------------------------------------------------------------
// POST /smartnotes
// ---------------------------------------------------------------------------

describe('POST /smartnotes', () => {
  it('should return 400 when no topic, notes, or filePath provided', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()

    await app.routes['POST /smartnotes'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.ok).toBe(false)
    expect(res._body.error).toContain('Provide topic')
  })

  it('should return 202 with noteId when topic is provided', async () => {
    const req = mockReq({ body: { topic: 'Quantum mechanics' } })
    const res = mockRes()

    await app.routes['POST /smartnotes'](req, res)

    expect(res._status).toBe(202)
    expect(res._body.ok).toBe(true)
    expect(res._body.noteId).toBeDefined()
    expect(typeof res._body.noteId).toBe('string')
  })

  it('should return 202 when only notes is provided', async () => {
    const req = mockReq({ body: { notes: 'Some study notes here' } })
    const res = mockRes()

    await app.routes['POST /smartnotes'](req, res)

    expect(res._status).toBe(202)
    expect(res._body.ok).toBe(true)
  })

  it('should return 202 when only filePath is provided', async () => {
    const req = mockReq({ body: { filePath: '/uploads/study.pdf' } })
    const res = mockRes()

    await app.routes['POST /smartnotes'](req, res)

    expect(res._status).toBe(202)
    expect(res._body.ok).toBe(true)
  })

  it('should return a WebSocket stream path', async () => {
    const req = mockReq({ body: { topic: 'Linear algebra' } })
    const res = mockRes()

    await app.routes['POST /smartnotes'](req, res)

    expect(res._body.stream).toContain('/ws/smartnotes?noteId=')
  })

  it('should emit generating, file, and done events after smart notes job succeeds', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('note-async-123')
    vi.mocked(handleSmartNotes).mockResolvedValueOnce({ file: '/tmp/generated/my-note.md' } as any)
    vi.mocked(withTimeout).mockImplementationOnce(async (promise: Promise<any>) => await promise)

    const req = mockReq({ body: { topic: 'Linear algebra' } })
    const res = mockRes()

    await app.routes['POST /smartnotes'](req, res)

    const mockWs = createMockWs()
    app.routes['WS /ws/smartnotes'](mockWs, { url: '/ws/smartnotes?noteId=note-async-123' })

    await runQueuedImmediates()

    expect(res._status).toBe(202)
    expect(res._body.noteId).toBe('note-async-123')
    expect(res._body.stream).toContain('noteId=note-async-123')
    expect(vi.mocked(handleSmartNotes)).toHaveBeenCalledWith({
      topic: 'Linear algebra',
      notes: undefined,
      filePath: undefined,
    })
    expect(vi.mocked(withTimeout)).toHaveBeenCalledWith(expect.any(Promise), 120000, 'handleSmartNotes')
    expect(vi.mocked(emitToAll)).toHaveBeenNthCalledWith(
      1,
      expect.any(Set),
      { type: 'phase', value: 'generating' }
    )
    expect(vi.mocked(emitToAll)).toHaveBeenNthCalledWith(
      2,
      expect.any(Set),
      { type: 'file', file: 'http://localhost:3000/storage/smartnotes/my-note.md' }
    )
    expect(vi.mocked(emitToAll)).toHaveBeenNthCalledWith(
      3,
      expect.any(Set),
      { type: 'done' }
    )

    uuidSpy.mockRestore()
  })

  it('should emit an error event when smart notes generation fails', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('note-error-123')
    vi.mocked(handleSmartNotes).mockRejectedValueOnce(new Error('generation failed'))
    vi.mocked(withTimeout).mockImplementationOnce(async (promise: Promise<any>) => await promise)

    const req = mockReq({ body: { notes: 'Some study notes here' } })
    const res = mockRes()

    await app.routes['POST /smartnotes'](req, res)

    const mockWs = createMockWs()
    app.routes['WS /ws/smartnotes'](mockWs, { url: '/ws/smartnotes?noteId=note-error-123' })

    await runQueuedImmediates()

    expect(res._status).toBe(202)
    expect(res._body.noteId).toBe('note-error-123')
    expect(vi.mocked(emitToAll)).toHaveBeenNthCalledWith(
      1,
      expect.any(Set),
      { type: 'phase', value: 'generating' }
    )
    expect(vi.mocked(emitToAll)).toHaveBeenNthCalledWith(
      2,
      expect.any(Set),
      { type: 'error', error: 'generation failed' }
    )

    const emittedMessages = vi.mocked(emitToAll).mock.calls.map(([, message]) => message)
    expect(emittedMessages).not.toContainEqual({ type: 'done' })
    expect(emittedMessages).not.toContainEqual(
      expect.objectContaining({ type: 'file' })
    )

    uuidSpy.mockRestore()
  })

  it('should fallback to "failed" when error has no message', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('note-no-msg-123')
    vi.mocked(handleSmartNotes).mockRejectedValueOnce('raw error')
    vi.mocked(withTimeout).mockImplementationOnce(async (promise: Promise<any>) => await promise)

    const req = mockReq({ body: { topic: 'Test' } })
    const res = mockRes()

    await app.routes['POST /smartnotes'](req, res)

    const mockWs = createMockWs()
    app.routes['WS /ws/smartnotes'](mockWs, { url: '/ws/smartnotes?noteId=note-no-msg-123' })

    await runQueuedImmediates()

    expect(res._status).toBe(202)
    const emittedMessages = vi.mocked(emitToAll).mock.calls.map(([, message]) => message)
    expect(emittedMessages).toContainEqual({ type: 'error', error: 'failed' })

    uuidSpy.mockRestore()
  })

  it('should return 500 when noteId generation throws', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      throw new Error('uuid failed')
    })

    const req = mockReq({ body: { topic: 'Linear algebra' } })
    const res = mockRes()

    await app.routes['POST /smartnotes'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'uuid failed' })
    expect(vi.mocked(handleSmartNotes)).not.toHaveBeenCalled()

    uuidSpy.mockRestore()
  })

  it('should return 500 with "internal" when error has no message', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      throw null
    })

    const req = mockReq({ body: { topic: 'Linear algebra' } })
    const res = mockRes()

    await app.routes['POST /smartnotes'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'internal' })

    uuidSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// WS /ws/smartnotes - WebSocket handler
// ---------------------------------------------------------------------------

describe('WS /ws/smartnotes', () => {
  it('should close WebSocket when noteId is missing', () => {
    const mockWs = createMockWs()
    const mockReqWs = { url: '/ws/smartnotes' }

    app.routes['WS /ws/smartnotes'](mockWs, mockReqWs)

    expect(mockWs.close).toHaveBeenCalledWith(1008, 'noteId required')
  })

  it('should set up WebSocket connection when noteId is provided', () => {
    const mockWs = createMockWs()
    const mockReqWs = { url: '/ws/smartnotes?noteId=note-123' }

    app.routes['WS /ws/smartnotes'](mockWs, mockReqWs)

    expect(mockWs.close).not.toHaveBeenCalled()
    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ready"')
    )
    expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function))
    expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function))
  })

  it('should handle close event by removing the final WebSocket from the set', () => {
    const firstWs = createMockWs()
    const secondWs = createMockWs()
    const mockReqWs = { url: '/ws/smartnotes?noteId=close-test-note' }

    app.routes['WS /ws/smartnotes'](firstWs, mockReqWs)
    app.routes['WS /ws/smartnotes'](secondWs, mockReqWs)

    expect(() => firstWs.emit('close')).not.toThrow()
    expect(() => secondWs.emit('close')).not.toThrow()
  })

  it('should ping WebSocket via interval when readyState is 1', () => {
    vi.useFakeTimers()

    const sendFn = vi.fn()
    const mockWs = createMockWs({ send: sendFn, readyState: 1 })
    const mockReqWs = { url: '/ws/smartnotes?noteId=interval-ping-note' }

    app.routes['WS /ws/smartnotes'](mockWs, mockReqWs)

    sendFn.mockClear()
    vi.advanceTimersByTime(14999)
    expect(sendFn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(sendFn).toHaveBeenCalledWith(expect.stringContaining('"type":"ping"'))
  })

  it('should NOT ping WebSocket when readyState is not 1', () => {
    vi.useFakeTimers()

    const sendFn = vi.fn()
    const mockWs = createMockWs({ send: sendFn, readyState: 3 })
    const mockReqWs = { url: '/ws/smartnotes?noteId=closed-interval-note' }

    app.routes['WS /ws/smartnotes'](mockWs, mockReqWs)

    sendFn.mockClear()
    vi.advanceTimersByTime(15000)

    const pingCalls = sendFn.mock.calls.filter((call: any[]) => call[0]?.includes('ping'))
    expect(pingCalls.length).toBe(0)
  })

  it('should swallow ping send errors from the interval callback', () => {
    vi.useFakeTimers()

    const sendFn = vi.fn()
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new Error('socket write failed')
      })

    const mockWs = createMockWs({ send: sendFn, readyState: 1 })
    const mockReqWs = { url: '/ws/smartnotes?noteId=throwing-ping-note' }

    app.routes['WS /ws/smartnotes'](mockWs, mockReqWs)

    sendFn.mockClear()
    expect(() => vi.advanceTimersByTime(15000)).not.toThrow()
    expect(sendFn).toHaveBeenCalledTimes(1)
    expect(sendFn.mock.calls[0][0]).toContain('"type":"ping"')
  })
})
