/**
 * ExamLab Routes Integration Tests
 *
 * Tests for GET /exams, POST /exam, POST /exams, and WS /ws/exams route handlers,
 * including queued async background processing.
 */

import crypto from 'crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../../src/services/examlab/generate', () => ({
  handleExam: vi.fn().mockResolvedValue({ questions: [] }),
}))

vi.mock('../../../src/services/examlab/loader', () => ({
  loadAllExams: vi.fn().mockReturnValue([]),
}))

vi.mock('../../../src/utils/chat/ws', () => ({
  emitToAll: vi.fn(),
  emitLarge: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/utils/quiz/promise', () => ({
  withTimeout: vi.fn().mockResolvedValue({ questions: [] }),
}))

import { examRoutes, connectionLimiter } from '../../../src/core/routes/examlab'
import { loadAllExams } from '../../../src/services/examlab/loader'
import { handleExam } from '../../../src/services/examlab/generate'
import { emitToAll, emitLarge } from '../../../src/utils/chat/ws'
import { withTimeout } from '../../../src/utils/quiz/promise'

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

function getEmittedMessages() {
  return vi.mocked(emitToAll).mock.calls.map(([, message]) => message)
}

function getWsMessages(ws: { send: { mock: { calls: Array<[string]> } } }) {
  return ws.send.mock.calls.map(([message]) => JSON.parse(message))
}

const sampleExam = {
  id: 'exam-1',
  name: 'Physics Exam',
  sections: [
    {
      id: 'section-1',
      title: 'Mechanics',
      durationSec: 1800,
      gen: { type: 'mcq', count: 10 },
    },
  ],
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let app: ReturnType<typeof createApp>

beforeEach(() => {
  vi.clearAllMocks()
  queuedImmediates = []
  setImmediateSpy = vi.spyOn(global, 'setImmediate').mockImplementation(((callback: (...args: any[]) => unknown) => {
    queuedImmediates.push(() => callback())
    return 0 as any
  }) as typeof setImmediate)
  connectionLimiter.reset()
  app = createApp()
  examRoutes(app)
})

afterEach(() => {
  vi.useRealTimers()
  setImmediateSpy?.mockRestore()
})

// ---------------------------------------------------------------------------
// GET /exams
// ---------------------------------------------------------------------------

describe('GET /exams', () => {
  it('should return empty list when no exams', async () => {
    vi.mocked(loadAllExams).mockReturnValue([])

    const req = mockReq()
    const res = mockRes()

    app.routes['GET /exams'](req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.exams).toEqual([])
  })

  it('should filter out exams that fail okSpec validation', async () => {
    const invalidSectionExam = {
      id: 'invalid-section',
      name: 'Broken Exam',
      sections: [{ id: 'section-x', title: 'Broken', durationSec: 300, gen: {} }],
    }

    vi.mocked(loadAllExams).mockReturnValue([
      sampleExam,
      invalidSectionExam as any,
      { id: '2' } as any,
    ])

    const req = mockReq()
    const res = mockRes()

    app.routes['GET /exams'](req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.exams).toEqual([
      {
        id: 'exam-1',
        name: 'Physics Exam',
        sections: [
          {
            id: 'section-1',
            title: 'Mechanics',
            durationSec: 1800,
            gen: { type: 'mcq', count: 10 },
          },
        ],
      },
    ])
  })

  it('should normalize section counts from task lists when explicit count is missing', async () => {
    vi.mocked(loadAllExams).mockReturnValue([
      {
        id: 'exam-2',
        name: 'Chemistry Exam',
        sections: [
          {
            id: 'section-2',
            title: 'Atoms',
            durationSec: 1200,
            gen: { type: 'structured', tasks: ['a', 'b', 'c'] },
            privateField: 'ignored',
          },
        ],
        privateField: 'ignored',
      } as any,
    ])

    const req = mockReq()
    const res = mockRes()

    app.routes['GET /exams'](req, res)

    expect(res._body).toEqual({
      ok: true,
      exams: [
        {
          id: 'exam-2',
          name: 'Chemistry Exam',
          sections: [
            {
              id: 'section-2',
              title: 'Atoms',
              durationSec: 1200,
              gen: { type: 'structured', count: 3 },
            },
          ],
        },
      ],
    })
  })

  it('should return 500 when loadAllExams throws', async () => {
    vi.mocked(loadAllExams).mockImplementation(() => { throw new Error('File read error') })

    const req = mockReq()
    const res = mockRes()

    app.routes['GET /exams'](req, res)

    expect(res._status).toBe(500)
    expect(res._body.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// POST /exam (single exam generation)
// ---------------------------------------------------------------------------

describe('POST /exam', () => {
  it('should return 400 when examId is missing', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()

    await app.routes['POST /exam'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.ok).toBe(false)
    expect(res._body.error).toContain('examId required')
  })

  it('should return 400 when examId is empty string', async () => {
    const req = mockReq({ body: { examId: '   ' } })
    const res = mockRes()

    await app.routes['POST /exam'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('examId required')
  })

  it('should return 202 with runId when examId is valid', async () => {
    const req = mockReq({ body: { examId: 'exam-1' } })
    const res = mockRes()

    await app.routes['POST /exam'](req, res)

    expect(res._status).toBe(202)
    expect(res._body.ok).toBe(true)
    expect(res._body.runId).toBeDefined()
    expect(typeof res._body.runId).toBe('string')
  })

  it('should return 500 when run id generation throws', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      throw new Error('uuid failed')
    })

    try {
      const req = mockReq({ body: { examId: 'exam-1' } })
      const res = mockRes()

      await app.routes['POST /exam'](req, res)

      expect(res._status).toBe(500)
      expect(res._body).toEqual({ ok: false, error: 'uuid failed' })
    } finally {
      uuidSpy.mockRestore()
    }
  })

  it('should return 500 with "internal" when run id throws without message', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      throw null
    })

    try {
      const req = mockReq({ body: { examId: 'exam-1' } })
      const res = mockRes()

      await app.routes['POST /exam'](req, res)

      expect(res._status).toBe(500)
      expect(res._body).toEqual({ ok: false, error: 'internal' })
    } finally {
      uuidSpy.mockRestore()
    }
  })

  it('should emit generating, exam payload, and done for successful single exam generation', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('single-run-123')
    const payload = { questions: [{ id: 'q1' }] }
    vi.mocked(handleExam).mockResolvedValueOnce(payload as any)
    vi.mocked(withTimeout).mockImplementationOnce(async (promise: Promise<any>) => await promise)

    const req = mockReq({ body: { examId: 'exam-1' } })
    const res = mockRes()

    await app.routes['POST /exam'](req, res)

    const mockWs = createMockWs()
    app.routes['WS /ws/exams'](mockWs, { url: '/ws/exams?runId=single-run-123', socket: { remoteAddress: '127.0.0.1' } })

    await runQueuedImmediates()

    expect(res._status).toBe(202)
    expect(res._body.runId).toBe('single-run-123')
    expect(res._body.stream).toBe('/ws/exams?runId=single-run-123')
    expect(vi.mocked(handleExam)).toHaveBeenCalledWith('exam-1')
    expect(vi.mocked(withTimeout)).toHaveBeenCalledWith(expect.any(Promise), 180000, 'handleExam')
    expect(getEmittedMessages()).toEqual([
      { type: 'phase', value: 'generating', examId: 'exam-1' },
      { type: 'done' },
    ])
    expect(vi.mocked(emitLarge)).toHaveBeenCalledWith(
      expect.any(Set),
      'exam',
      { examId: 'exam-1', payload },
      expect.objectContaining({ id: 'single-run-123' })
    )

    uuidSpy.mockRestore()
  })

  it('should emit an error and stop before done when single exam generation fails', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('single-error-123')
    vi.mocked(handleExam).mockRejectedValueOnce(new Error('generation failed'))
    vi.mocked(withTimeout).mockImplementationOnce(async (promise: Promise<any>) => await promise)

    const req = mockReq({ body: { examId: 'exam-1' } })
    const res = mockRes()

    await app.routes['POST /exam'](req, res)

    const mockWs = createMockWs()
    app.routes['WS /ws/exams'](mockWs, { url: '/ws/exams?runId=single-error-123', socket: { remoteAddress: '127.0.0.1' } })

    await runQueuedImmediates()

    expect(res._status).toBe(202)
    expect(res._body.runId).toBe('single-error-123')
    expect(getEmittedMessages()).toEqual([
      { type: 'phase', value: 'generating', examId: 'exam-1' },
      { type: 'error', examId: 'exam-1', error: 'generation failed' },
    ])
    expect(vi.mocked(emitLarge)).not.toHaveBeenCalled()

    uuidSpy.mockRestore()
  })

  it('should fallback to "failed" when error has no message property', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('single-no-msg-123')
    vi.mocked(handleExam).mockRejectedValueOnce('raw string error')
    vi.mocked(withTimeout).mockImplementationOnce(async (promise: Promise<any>) => await promise)

    const req = mockReq({ body: { examId: 'exam-1' } })
    const res = mockRes()

    await app.routes['POST /exam'](req, res)

    const mockWs = createMockWs()
    app.routes['WS /ws/exams'](mockWs, { url: '/ws/exams?runId=single-no-msg-123', socket: { remoteAddress: '127.0.0.1' } })

    await runQueuedImmediates()

    expect(res._status).toBe(202)
    expect(getEmittedMessages()).toContainEqual({ type: 'error', examId: 'exam-1', error: 'failed' })

    uuidSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// POST /exams (batch exam generation)
// ---------------------------------------------------------------------------

describe('POST /exams', () => {
  it('should return 202 with runId for batch generation', async () => {
    const req = mockReq()
    const res = mockRes()

    await app.routes['POST /exams'](req, res)

    expect(res._status).toBe(202)
    expect(res._body.ok).toBe(true)
    expect(res._body.runId).toBeDefined()
  })

  it('should return 500 when run id generation throws', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      throw new Error('uuid failed')
    })

    try {
      const req = mockReq()
      const res = mockRes()

      await app.routes['POST /exams'](req, res)

      expect(res._status).toBe(500)
      expect(res._body).toEqual({ ok: false, error: 'uuid failed' })
    } finally {
      uuidSpy.mockRestore()
    }
  })

  it('should return 500 with "internal" when run id throws without message', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      throw undefined
    })

    try {
      const req = mockReq()
      const res = mockRes()

      await app.routes['POST /exams'](req, res)

      expect(res._status).toBe(500)
      expect(res._body).toEqual({ ok: false, error: 'internal' })
    } finally {
      uuidSpy.mockRestore()
    }
  })

  it('should emit an error when no exams are found for batch generation', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('batch-empty-123')
    vi.mocked(loadAllExams).mockReturnValueOnce([])

    const req = mockReq()
    const res = mockRes()

    await app.routes['POST /exams'](req, res)

    const mockWs = createMockWs()
    app.routes['WS /ws/exams'](mockWs, { url: '/ws/exams?runId=batch-empty-123', socket: { remoteAddress: '127.0.0.1' } })

    await runQueuedImmediates()

    expect(res._status).toBe(202)
    expect(res._body.runId).toBe('batch-empty-123')
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(expect.any(Set), { type: 'error', error: 'no exams found' })
    expect(vi.mocked(handleExam)).not.toHaveBeenCalled()
    expect(vi.mocked(emitLarge)).not.toHaveBeenCalled()

    uuidSpy.mockRestore()
  })

  it('should emit phases, exam payloads, and done for successful batch generation', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('batch-success-123')
    const secondExam = {
      id: 'exam-2',
      name: 'Chemistry Exam',
      sections: [{ id: 'section-2', title: 'Atoms', durationSec: 1200, gen: { type: 'mcq', count: 5 } }],
    }
    vi.mocked(loadAllExams).mockReturnValueOnce([sampleExam, secondExam] as any)
    vi.mocked(handleExam)
      .mockResolvedValueOnce({ questions: [{ id: 'q1' }] } as any)
      .mockResolvedValueOnce({ questions: [{ id: 'q2' }] } as any)
    vi.mocked(withTimeout).mockImplementation(async (promise: Promise<any>) => await promise)

    const req = mockReq()
    const res = mockRes()

    await app.routes['POST /exams'](req, res)

    const mockWs = createMockWs()
    app.routes['WS /ws/exams'](mockWs, { url: '/ws/exams?runId=batch-success-123', socket: { remoteAddress: '127.0.0.1' } })

    await runQueuedImmediates()

    expect(res._status).toBe(202)
    expect(res._body.runId).toBe('batch-success-123')
    const msgs = getEmittedMessages()
    expect(msgs).toContainEqual({ type: 'phase', value: 'generating_all', count: 2 })
    expect(msgs).toContainEqual({ type: 'phase', value: 'generating', examId: 'exam-1' })
    expect(msgs).toContainEqual({ type: 'phase', value: 'generating', examId: 'exam-2' })
    expect(msgs).toContainEqual({ type: 'done' })
    expect(vi.mocked(withTimeout)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(emitLarge)).toHaveBeenCalledTimes(2)

    uuidSpy.mockRestore()
  })

  it('should emit per-exam errors and still finish batch generation', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('batch-partial-123')
    const secondExam = {
      id: 'exam-2',
      name: 'Chemistry Exam',
      sections: [{ id: 'section-2', title: 'Atoms', durationSec: 1200, gen: { type: 'mcq', count: 5 } }],
    }
    vi.mocked(loadAllExams).mockReturnValueOnce([sampleExam, secondExam] as any)
    vi.mocked(handleExam)
      .mockResolvedValueOnce({ questions: [{ id: 'q1' }] } as any)
      .mockRejectedValueOnce(new Error('boom'))
    vi.mocked(withTimeout).mockImplementation(async (promise: Promise<any>) => await promise)

    const req = mockReq()
    const res = mockRes()

    await app.routes['POST /exams'](req, res)

    const mockWs = createMockWs()
    app.routes['WS /ws/exams'](mockWs, { url: '/ws/exams?runId=batch-partial-123', socket: { remoteAddress: '127.0.0.1' } })

    await runQueuedImmediates()

    expect(res._status).toBe(202)
    expect(res._body.runId).toBe('batch-partial-123')
    expect(vi.mocked(emitLarge)).toHaveBeenCalledTimes(1)
    const msgs = getEmittedMessages()
    expect(msgs).toContainEqual({ type: 'error', examId: 'exam-2', error: 'boom' })
    expect(msgs).toContainEqual({ type: 'done' })

    uuidSpy.mockRestore()
  })

  it('should emit outer batch error when loadAllExams throws in queued job', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('batch-outer-err-123')
    vi.mocked(loadAllExams).mockImplementationOnce(() => { throw new Error('load failed') })

    const req = mockReq()
    const res = mockRes()

    await app.routes['POST /exams'](req, res)

    const mockWs = createMockWs()
    app.routes['WS /ws/exams'](mockWs, { url: '/ws/exams?runId=batch-outer-err-123', socket: { remoteAddress: '127.0.0.1' } })

    await runQueuedImmediates()

    expect(res._status).toBe(202)
    expect(res._body.runId).toBe('batch-outer-err-123')
    expect(getEmittedMessages()).toContainEqual({ type: 'error', error: 'load failed' })
    expect(vi.mocked(handleExam)).not.toHaveBeenCalled()
    expect(vi.mocked(emitLarge)).not.toHaveBeenCalled()

    uuidSpy.mockRestore()
  })

  it('should fallback to "failed" when batch per-exam error has no message', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('batch-no-msg-123')
    vi.mocked(loadAllExams).mockReturnValueOnce([sampleExam] as any)
    vi.mocked(handleExam).mockRejectedValueOnce(null)
    vi.mocked(withTimeout).mockImplementation(async (promise: Promise<any>) => await promise)

    const req = mockReq()
    const res = mockRes()

    await app.routes['POST /exams'](req, res)

    const mockWs = createMockWs()
    app.routes['WS /ws/exams'](mockWs, { url: '/ws/exams?runId=batch-no-msg-123', socket: { remoteAddress: '127.0.0.1' } })

    await runQueuedImmediates()

    expect(res._status).toBe(202)
    expect(getEmittedMessages()).toContainEqual({ type: 'error', examId: 'exam-1', error: 'failed' })

    uuidSpy.mockRestore()
  })

  it('should fallback to "failed" when batch outer error has no message', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('batch-outer-no-msg-123')
    vi.mocked(loadAllExams).mockImplementationOnce(() => { throw null })

    const req = mockReq()
    const res = mockRes()

    await app.routes['POST /exams'](req, res)

    const mockWs = createMockWs()
    app.routes['WS /ws/exams'](mockWs, { url: '/ws/exams?runId=batch-outer-no-msg-123', socket: { remoteAddress: '127.0.0.1' } })

    await runQueuedImmediates()

    expect(res._status).toBe(202)
    expect(getEmittedMessages()).toContainEqual({ type: 'error', error: 'failed' })

    uuidSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// WS /ws/exams - WebSocket handler
// ---------------------------------------------------------------------------

describe('WS /ws/exams', () => {
  it('should close WebSocket when runId is missing', () => {
    const mockWs: any = {
      close: vi.fn(),
      on: vi.fn(),
      addEventListener: vi.fn(),
      send: vi.fn(),
    }
    const mockReqWs = { url: '/ws/exams', socket: { remoteAddress: '127.0.0.1' } }

    app.routes['WS /ws/exams'](mockWs, mockReqWs)

    expect(mockWs.close).toHaveBeenCalledWith(1008, 'runId required')
  })

  it('should set up WebSocket connection when runId is provided', () => {
    vi.useFakeTimers()

    const mockWs: any = {
      close: vi.fn(),
      on: vi.fn(),
      addEventListener: vi.fn(),
      send: vi.fn(),
    }
    const mockReqWs = { url: '/ws/exams?runId=run-id-123', socket: { remoteAddress: '127.0.0.1' } }

    app.routes['WS /ws/exams'](mockWs, mockReqWs)

    expect(mockWs.close).not.toHaveBeenCalled()
    const [msg] = mockWs.send.mock.calls[0]
    expect(JSON.parse(msg)).toEqual(expect.objectContaining({ type: 'ready', runId: 'run-id-123' }))
    expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function))
    expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function))

    vi.useRealTimers()
  })

  it('should handle close event by removing WebSocket and clearing interval', () => {
    vi.useFakeTimers()

    const mockWs: any = { close: vi.fn(), on: vi.fn(), addEventListener: vi.fn(), send: vi.fn() }
    const mockReqWs = { url: '/ws/exams?runId=close-test-run', socket: { remoteAddress: '127.0.0.1' } }

    app.routes['WS /ws/exams'](mockWs, mockReqWs)

    const closeHandlers = mockWs.on.mock.calls
      .filter((call: any[]) => call[0] === 'close')
      .map((call: any[]) => call[1])

    // Call all close handlers (ws removal + interval clear)
    closeHandlers.forEach((handler: Function) => {
      expect(() => handler()).not.toThrow()
    })

    vi.useRealTimers()
  })

  it('should ping WebSocket via interval when readyState is 1', () => {
    vi.useFakeTimers()

    const sendFn = vi.fn()
    const mockWs: any = {
      close: vi.fn(),
      on: vi.fn(),
      addEventListener: vi.fn(),
      send: sendFn,
      readyState: 1, // OPEN
    }
    const mockReqWs = { url: '/ws/exams?runId=ping-interval-run', socket: { remoteAddress: '127.0.0.1' } }

    app.routes['WS /ws/exams'](mockWs, mockReqWs)

    // Clear initial ready message
    sendFn.mockClear()

    // Advance 15 seconds to trigger the ping interval
    vi.advanceTimersByTime(15000)

    const [msg] = sendFn.mock.calls[0]
    expect(JSON.parse(msg)).toEqual(expect.objectContaining({ type: 'ping' }))

    vi.useRealTimers()
  })

  it('should NOT ping WebSocket when readyState is not 1', () => {
    vi.useFakeTimers()

    const sendFn = vi.fn()
    const mockWs: any = {
      close: vi.fn(),
      on: vi.fn(),
      addEventListener: vi.fn(),
      send: sendFn,
      readyState: 3, // CLOSED
    }
    const mockReqWs = { url: '/ws/exams?runId=no-ping-run', socket: { remoteAddress: '127.0.0.1' } }

    app.routes['WS /ws/exams'](mockWs, mockReqWs)

    sendFn.mockClear()

    vi.advanceTimersByTime(15000)

    const pingMsgs = sendFn.mock.calls
      .map(([msg]: [string]) => { try { return JSON.parse(msg) } catch { return null } })
      .filter((m: any) => m?.type === 'ping')
    expect(pingMsgs).toHaveLength(0)

    vi.useRealTimers()
  })
})
