/**
 * Quiz Routes Integration Tests
 *
 * Tests for POST /quiz and WS /ws/quiz route handlers.
 */

import crypto from 'crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock all external dependencies
vi.mock('../../../src/services/quiz', () => ({
  handleQuiz: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../src/utils/chat/ws', () => ({
  emitToAll: vi.fn(),
}))

vi.mock('../../../src/utils/quiz/promise', () => ({
  withTimeout: vi.fn().mockResolvedValue([]),
}))

import { quizRoutes, connectionLimiter } from '../../../src/core/routes/quiz'
import { handleQuiz } from '../../../src/services/quiz'
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
  return { body: {}, params: {}, query: {}, ...overrides }
}

function createMockWs(overrides: Record<string, any> = {}) {
  const handlers: Record<string, Function[]> = {}
  return {
    close: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      handlers[event] ||= []
      handlers[event].push(handler)
    }),
    addEventListener: vi.fn((event: string, handler: Function) => {
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
  connectionLimiter.reset()
  app = createApp()
  quizRoutes(app)
})

// ---------------------------------------------------------------------------
// POST /quiz
// ---------------------------------------------------------------------------

describe('POST /quiz', () => {
  it('should return 400 when topic is missing', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()

    await app.routes['POST /quiz'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.ok).toBe(false)
    expect(res._body.error).toContain('topic required')
  })

  it('should return 400 when topic is empty string', async () => {
    const req = mockReq({ body: { topic: '   ' } })
    const res = mockRes()

    await app.routes['POST /quiz'](req, res)

    expect(res._status).toBe(400)
  })

  it('should return 202 with quizId when topic is valid', async () => {
    const req = mockReq({ body: { topic: 'Newton laws of motion' } })
    const res = mockRes()

    await app.routes['POST /quiz'](req, res)

    expect(res._status).toBe(202)
    expect(res._body.ok).toBe(true)
    expect(res._body.quizId).toBeDefined()
    expect(typeof res._body.quizId).toBe('string')
  })

  it('should return a stream WebSocket path', async () => {
    const req = mockReq({ body: { topic: 'Photosynthesis' } })
    const res = mockRes()

    await app.routes['POST /quiz'](req, res)

    expect(res._body.stream).toContain('/ws/quiz?quizId=')
  })

  it('should emit generating, quiz, and done events after quiz generation succeeds', async () => {
    const quizPayload = [{ question: 'What is photosynthesis?' }]
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('quiz-async-123')
    vi.mocked(handleQuiz).mockResolvedValueOnce(quizPayload as any)
    vi.mocked(withTimeout).mockImplementationOnce(async (promise: Promise<any>) => await promise)

    const req = mockReq({ body: { topic: 'Photosynthesis' } })
    const res = mockRes()

    await app.routes['POST /quiz'](req, res)

    const mockWs = createMockWs()
    app.routes['WS /ws/quiz'](mockWs, { url: '/ws/quiz?quizId=quiz-async-123', socket: { remoteAddress: '127.0.0.1' } })

    await runQueuedImmediates()

    expect(res._status).toBe(202)
    expect(res._body.quizId).toBe('quiz-async-123')
    expect(res._body.stream).toContain('quizId=quiz-async-123')
    expect(vi.mocked(handleQuiz)).toHaveBeenCalledWith('Photosynthesis')
    expect(vi.mocked(withTimeout)).toHaveBeenCalledWith(expect.any(Promise), 60000, 'handleQuiz')
    expect(vi.mocked(emitToAll)).toHaveBeenNthCalledWith(
      1,
      expect.any(Set),
      { type: 'phase', value: 'generating' }
    )
    expect(vi.mocked(emitToAll)).toHaveBeenNthCalledWith(
      2,
      expect.any(Set),
      { type: 'quiz', quiz: quizPayload }
    )
    expect(vi.mocked(emitToAll)).toHaveBeenNthCalledWith(
      3,
      expect.any(Set),
      { type: 'done' }
    )

    uuidSpy.mockRestore()
  })

  it('should emit an error event when quiz generation fails', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('quiz-error-123')
    vi.mocked(handleQuiz).mockRejectedValueOnce(new Error('quiz generation failed'))
    vi.mocked(withTimeout).mockImplementationOnce(async (promise: Promise<any>) => await promise)

    const req = mockReq({ body: { topic: 'Algebra' } })
    const res = mockRes()

    await app.routes['POST /quiz'](req, res)

    const mockWs = createMockWs()
    app.routes['WS /ws/quiz'](mockWs, { url: '/ws/quiz?quizId=quiz-error-123', socket: { remoteAddress: '127.0.0.1' } })

    await runQueuedImmediates()

    expect(res._status).toBe(202)
    expect(res._body.quizId).toBe('quiz-error-123')
    expect(vi.mocked(emitToAll)).toHaveBeenNthCalledWith(
      1,
      expect.any(Set),
      { type: 'phase', value: 'generating' }
    )
    expect(vi.mocked(emitToAll)).toHaveBeenNthCalledWith(
      2,
      expect.any(Set),
      { type: 'error', error: 'quiz generation failed' }
    )

    const emittedMessages = vi.mocked(emitToAll).mock.calls.map(([, message]) => message)
    expect(emittedMessages).not.toContainEqual({ type: 'done' })
    expect(emittedMessages).not.toContainEqual(
      expect.objectContaining({ type: 'quiz' })
    )

    uuidSpy.mockRestore()
  })

  it('should fallback to "failed" when error has no message', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('quiz-no-msg-123')
    vi.mocked(handleQuiz).mockRejectedValueOnce('raw error')
    vi.mocked(withTimeout).mockImplementationOnce(async (promise: Promise<any>) => await promise)

    const req = mockReq({ body: { topic: 'Test' } })
    const res = mockRes()

    await app.routes['POST /quiz'](req, res)

    const mockWs = createMockWs()
    app.routes['WS /ws/quiz'](mockWs, { url: '/ws/quiz?quizId=quiz-no-msg-123', socket: { remoteAddress: '127.0.0.1' } })

    await runQueuedImmediates()

    expect(res._status).toBe(202)
    const emittedMessages = vi.mocked(emitToAll).mock.calls.map(([, message]) => message)
    expect(emittedMessages).toContainEqual({ type: 'error', error: 'failed' })

    uuidSpy.mockRestore()
  })

  it('should handle non-array quiz response', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('quiz-non-array-123')
    const nonArrayResponse = { quiz: [{ question: 'Q' }] }
    vi.mocked(handleQuiz).mockResolvedValueOnce(nonArrayResponse as any)
    vi.mocked(withTimeout).mockImplementationOnce(async (promise: Promise<any>) => await promise)

    const req = mockReq({ body: { topic: 'Test' } })
    const res = mockRes()

    await app.routes['POST /quiz'](req, res)

    const mockWs = createMockWs()
    app.routes['WS /ws/quiz'](mockWs, { url: '/ws/quiz?quizId=quiz-non-array-123', socket: { remoteAddress: '127.0.0.1' } })

    await runQueuedImmediates()

    expect(res._status).toBe(202)
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(expect.any(Set), { type: 'quiz', quiz: nonArrayResponse })

    uuidSpy.mockRestore()
  })

  it('should emit quiz events even when no websocket clients are connected', async () => {
    const quizPayload = [{ question: 'What is inertia?' }]
    vi.mocked(handleQuiz).mockResolvedValueOnce(quizPayload as any)
    vi.mocked(withTimeout).mockImplementationOnce(async (promise: Promise<any>) => await promise)

    const req = mockReq({ body: { topic: 'Newton laws of motion' } })
    const res = mockRes()

    await app.routes['POST /quiz'](req, res)
    await runQueuedImmediates()

    expect(res._status).toBe(202)
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(undefined, { type: 'phase', value: 'generating' })
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(undefined, { type: 'quiz', quiz: quizPayload })
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(undefined, { type: 'done' })
  })

  it('should return 500 when an unexpected error occurs', async () => {
    const req = {
      body: new Proxy({}, {
        get: () => { throw new Error('unexpected error') }
      })
    }
    const res = mockRes()

    await app.routes['POST /quiz'](req, res)

    expect(res._status).toBe(500)
    expect(res._body.ok).toBe(false)
  })

  it('should return 500 with "internal" when error has no message', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      throw undefined
    })

    const req = mockReq({ body: { topic: 'Test' } })
    const res = mockRes()

    await app.routes['POST /quiz'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'internal' })

    uuidSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// WS /ws/quiz - WebSocket handler
// ---------------------------------------------------------------------------

describe('WS /ws/quiz', () => {
  it('should close WebSocket when quizId is missing', () => {
    const mockWs = createMockWs()
    const mockReqWs = {
      url: '/ws/quiz',
      socket: { remoteAddress: '127.0.0.1' },
    }

    app.routes['WS /ws/quiz'](mockWs, mockReqWs)

    expect(mockWs.close).toHaveBeenCalledWith(1008, 'quizId required')
  })

  it('should set up WebSocket connection when quizId is provided', () => {
    const mockWs = createMockWs()
    const mockReqWs = {
      url: '/ws/quiz?quizId=test-quiz-id',
      socket: { remoteAddress: '127.0.0.1' },
    }

    app.routes['WS /ws/quiz'](mockWs, mockReqWs)

    expect(mockWs.close).not.toHaveBeenCalled()
    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ready"')
    )
    expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function))
    expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function))
  })

  it('should add second WebSocket to existing set for same quizId', () => {
    const mockWs1 = createMockWs()
    const mockWs2 = createMockWs()
    const mockReqWs = { url: '/ws/quiz?quizId=shared-quiz-id', socket: { remoteAddress: '127.0.0.1' } }

    app.routes['WS /ws/quiz'](mockWs1, mockReqWs)
    app.routes['WS /ws/quiz'](mockWs2, mockReqWs)

    expect(mockWs1.send).toHaveBeenCalled()
    expect(mockWs2.send).toHaveBeenCalled()
  })

  it('should handle close event by removing the final WebSocket from the set', () => {
    const firstWs = createMockWs()
    const secondWs = createMockWs()
    const mockReqWs = { url: '/ws/quiz?quizId=close-test-quiz', socket: { remoteAddress: '127.0.0.1' } }

    app.routes['WS /ws/quiz'](firstWs, mockReqWs)
    app.routes['WS /ws/quiz'](secondWs, mockReqWs)

    expect(() => firstWs.emit('close')).not.toThrow()
    expect(() => secondWs.emit('close')).not.toThrow()
  })

  it('should ping WebSocket via interval when readyState is 1', () => {
    vi.useFakeTimers()

    const sendFn = vi.fn()
    const mockWs = createMockWs({ send: sendFn, readyState: 1 })
    const mockReqWs = { url: '/ws/quiz?quizId=interval-test-quiz', socket: { remoteAddress: '127.0.0.1' } }

    app.routes['WS /ws/quiz'](mockWs, mockReqWs)

    sendFn.mockClear()
    vi.advanceTimersByTime(14999)
    expect(sendFn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(sendFn).toHaveBeenCalledWith(expect.stringContaining('"type":"ping"'))
  })

  it('should NOT ping WebSocket via interval when readyState is not 1', () => {
    vi.useFakeTimers()

    const sendFn = vi.fn()
    const mockWs = createMockWs({ send: sendFn, readyState: 3 })
    const mockReqWs = { url: '/ws/quiz?quizId=closed-interval-quiz', socket: { remoteAddress: '127.0.0.1' } }

    app.routes['WS /ws/quiz'](mockWs, mockReqWs)

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
    const mockReqWs = { url: '/ws/quiz?quizId=throwing-ping-quiz', socket: { remoteAddress: '127.0.0.1' } }

    app.routes['WS /ws/quiz'](mockWs, mockReqWs)

    sendFn.mockClear()
    expect(() => vi.advanceTimersByTime(15000)).not.toThrow()
    expect(sendFn).toHaveBeenCalledTimes(1)
    expect(sendFn.mock.calls[0][0]).toContain('"type":"ping"')
  })
})
