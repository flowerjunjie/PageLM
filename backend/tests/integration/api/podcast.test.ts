/**
 * Podcast Routes Integration Tests
 *
 * Tests for POST /podcast and GET /podcast/download/:pid/:filename route handlers.
 * The actual podcast generation job running via WebSocket is not tested here.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const testState = vi.hoisted(() => ({
  randomValues: [] as number[],
}))

vi.mock('../../../src/services/podcast', () => ({
  makeScript: vi.fn().mockResolvedValue({ segments: [] }),
  makeAudio: vi.fn().mockResolvedValue('/tmp/podcast/audio.mp3'),
}))

vi.mock('../../../src/utils/chat/ws', () => ({
  emitToAll: vi.fn(),
}))

vi.mock('../../../src/config/env', () => ({
  config: { baseUrl: 'http://localhost:3000' },
}))

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn().mockReturnValue(false),
      readdirSync: vi.fn().mockReturnValue([]),
      statSync: vi.fn().mockReturnValue({ size: 1024 }),
      createReadStream: vi.fn().mockReturnValue({ pipe: vi.fn(), on: vi.fn() }),
    },
  }
})

import { podcastRoutes, connectionLimiter } from '../../../src/core/routes/podcast'
import { makeAudio, makeScript } from '../../../src/services/podcast'
import { emitToAll } from '../../../src/utils/chat/ws'

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
    _headers: {} as Record<string, any>,
    statusCode: 200,
    headersSent: false,
    status: vi.fn(function (code: number) { res._status = code; res.statusCode = code; return res }),
    send: vi.fn(function (body: any) { res._body = body; return res }),
    json: vi.fn(function (body: any) { res._body = body; return res }),
    setHeader: vi.fn(function (key: string, value: any) { res._headers[key] = value }),
  }
  return res
}

function mockReq(overrides: any = {}) {
  return { body: {}, params: {}, query: {}, headers: {}, ...overrides }
}

function createMockWs() {
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
    emit: (event: string, ...args: any[]) => {
      for (const handler of handlers[event] || []) {
        handler(...args)
      }
    },
  }
}

function setRandomHexSequence(sequence: string) {
  testState.randomValues = sequence.split('').map((char) => parseInt(char, 16) / 16)
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let app: ReturnType<typeof createApp>

afterEach(() => {
  vi.useRealTimers()
})

beforeEach(() => {
  vi.clearAllMocks()
  testState.randomValues = []
  vi.spyOn(Math, 'random').mockImplementation(() => testState.randomValues.shift() ?? 0)
  connectionLimiter.reset()
  app = createApp()
  podcastRoutes(app)
})

// ---------------------------------------------------------------------------
// POST /podcast
// ---------------------------------------------------------------------------

describe('POST /podcast', () => {
  it('should return 400 when topic is missing', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['POST /podcast'](req, res, next)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('topic required')
  })

  it('should return 400 when topic is empty string', async () => {
    const req = mockReq({ body: { topic: '   ' } })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['POST /podcast'](req, res, next)

    expect(res._status).toBe(400)
  })

  it('should return 202 with pid and stream path when topic is valid', async () => {
    const req = mockReq({ body: { topic: 'Introduction to calculus' } })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['POST /podcast'](req, res, next)

    expect(res._status).toBe(202)
    expect(res._body.ok).toBe(true)
    expect(res._body.pid).toBeDefined()
    expect(typeof res._body.pid).toBe('string')
  })

  it('should return a WebSocket stream path', async () => {
    const req = mockReq({ body: { topic: 'Machine learning basics' } })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['POST /podcast'](req, res, next)

    expect(res._body.stream).toContain('/ws/podcast?pid=')
  })

  it('should accept title as an alias for topic', async () => {
    const req = mockReq({ body: { title: 'Physics 101' } })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['POST /podcast'](req, res, next)

    expect(res._status).toBe(202)
    expect(res._body.ok).toBe(true)
  })

  it('should call next when an unexpected error occurs', async () => {
    const req = {
      body: new Proxy({}, { get: () => { throw new Error('unexpected error') } }),
      params: {},
    }
    const res = mockRes()
    const next = vi.fn()

    await app.routes['POST /podcast'](req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})

// ---------------------------------------------------------------------------
// GET /podcast/download/:pid/:filename
// ---------------------------------------------------------------------------

describe('GET /podcast/download/:pid/:filename', () => {
  it('should return 404 when podcast directory does not exist', async () => {
    const { default: fs } = await import('fs')
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const req = mockReq({ params: { pid: 'aaaaaaaa-0000-4000-8000-000000000000', filename: 'audio.mp3' } })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['GET /podcast/download/:pid/:filename'](req, res, next)

    expect(res._status).toBe(404)
    expect(res._body.error).toContain('File not found')
  })

  it('should return 404 when file not found in directory', async () => {
    const { default: fs } = await import('fs')
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readdirSync).mockReturnValue([] as any)

    const req = mockReq({ params: { pid: 'bbbbbbbb-1111-4000-8000-000000000001', filename: 'missing.mp3' } })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['GET /podcast/download/:pid/:filename'](req, res, next)

    expect(res._status).toBe(404)
  })

  it('should stream an existing podcast file with download headers', async () => {
    const { default: fs } = await import('fs')
    const stream = { pipe: vi.fn(), on: vi.fn() }
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readdirSync).mockReturnValue(['audio.mp3'] as any)
    vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as any)
    vi.mocked(fs.createReadStream).mockReturnValue(stream as any)

    const req = mockReq({ params: { pid: 'cccccccc-2222-4000-8000-000000000002', filename: 'audio.mp3' } })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['GET /podcast/download/:pid/:filename'](req, res, next)

    expect(res.setHeader).toHaveBeenNthCalledWith(1, 'Content-Type', 'audio/mpeg')
    expect(res.setHeader).toHaveBeenNthCalledWith(2, 'Content-Disposition', 'attachment; filename="audio.mp3"')
    expect(res.setHeader).toHaveBeenNthCalledWith(3, 'Content-Length', 1024)
    expect(vi.mocked(fs.createReadStream)).toHaveBeenCalled()
    expect(stream.pipe).toHaveBeenCalledWith(res)
  })

  it('should return 500 when download stream errors before headers are sent', async () => {
    const { default: fs } = await import('fs')
    let streamErrorHandler: ((err: Error) => void) | undefined
    const stream = {
      pipe: vi.fn(),
      on: vi.fn((event: string, handler: (err: Error) => void) => {
        if (event === 'error') {
          streamErrorHandler = handler
        }
      }),
    }
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readdirSync).mockReturnValue(['audio.mp3'] as any)
    vi.mocked(fs.statSync).mockReturnValue({ size: 256 } as any)
    vi.mocked(fs.createReadStream).mockReturnValue(stream as any)

    const req = mockReq({ params: { pid: 'dddddddd-3333-4000-8000-000000000003', filename: 'audio.mp3' } })
    const res = mockRes()
    const next = vi.fn()

    await app.routes['GET /podcast/download/:pid/:filename'](req, res, next)
    streamErrorHandler?.(new Error('stream failed'))

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ error: 'Download failed' })
  })

  it('should call next when an unexpected error occurs during download', async () => {
    const req = {
      params: new Proxy({}, { get: () => { throw new Error('unexpected error') } }),
    }
    const res = mockRes()
    const next = vi.fn()

    await app.routes['GET /podcast/download/:pid/:filename'](req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})

// ---------------------------------------------------------------------------
// WS /ws/podcast - WebSocket handler
// ---------------------------------------------------------------------------

describe('WS /ws/podcast', () => {
  it('should close WebSocket when pid is missing', () => {
    const mockWs = createMockWs()
    const mockReqWs = { url: '/ws/podcast', socket: { remoteAddress: '127.0.0.1' } }

    app.routes['WS /ws/podcast'](mockWs, mockReqWs)

    expect(mockWs.close).toHaveBeenCalledWith(1008, 'pid required')
  })

  it('should set up WebSocket connection when pid is provided', () => {
    vi.useFakeTimers()

    const mockWs = createMockWs()
    const mockReqWs = { url: '/ws/podcast?pid=podcast-ws-123', socket: { remoteAddress: '127.0.0.1' } }

    app.routes['WS /ws/podcast'](mockWs, mockReqWs)

    expect(mockWs.close).not.toHaveBeenCalled()
    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ready"')
    )
    expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function))
  })

  it('should handle close event by removing WebSocket from set', () => {
    vi.useFakeTimers()

    const mockWs = createMockWs()
    const mockReqWs = { url: '/ws/podcast?pid=close-test-podcast', socket: { remoteAddress: '127.0.0.1' } }

    app.routes['WS /ws/podcast'](mockWs, mockReqWs)

    expect(() => mockWs.emit('close')).not.toThrow()
  })

  it('should emit podcast job updates after websocket becomes ready', async () => {
    vi.useFakeTimers()
    setRandomHexSequence('1234567890abcdef1234567890abcdef')

    vi.mocked(makeScript).mockResolvedValueOnce({ segments: [{ text: 'Intro' }] } as any)
    vi.mocked(makeAudio).mockImplementationOnce(async (_script, _dir, _base, onProgress) => {
      onProgress({ type: 'progress', percent: 50 })
      return '/tmp/podcast/audio.mp3'
    })

    const { default: fs } = await import('fs')
    vi.mocked(fs.existsSync).mockImplementation((input: any) => input === '/tmp/podcast/audio.mp3')

    const postReq = mockReq({ body: { topic: 'Physics 101' } })
    const postRes = mockRes()
    const next = vi.fn()

    await app.routes['POST /podcast'](postReq, postRes, next)

    const pid = postRes._body.pid
    const mockWs = createMockWs()
    app.routes['WS /ws/podcast'](mockWs, { url: `/ws/podcast?pid=${pid}`, socket: { remoteAddress: '127.0.0.1' } })

    await vi.runAllTimersAsync()

    expect(emitToAll).toHaveBeenCalledWith(expect.any(Set), expect.objectContaining({ type: 'script' }))
    expect(emitToAll).toHaveBeenCalledWith(expect.any(Set), { type: 'progress', percent: 50 })
    expect(emitToAll).toHaveBeenCalledWith(
      expect.any(Set),
      expect.objectContaining({
        type: 'audio',
        file: `http://localhost:3000/podcast/download/${pid}/audio.mp3`,
        staticUrl: `http://localhost:3000/storage/podcasts/${pid}/audio.mp3`,
        filename: 'audio.mp3',
      })
    )
    expect(emitToAll).toHaveBeenCalledWith(expect.any(Set), { type: 'done' })
  })

  it('should emit an error when generated audio file is missing', async () => {
    vi.useFakeTimers()
    setRandomHexSequence('fedcba0987654321fedcba0987654321')

    vi.mocked(makeScript).mockResolvedValueOnce({ segments: [{ text: 'Intro' }] } as any)
    vi.mocked(makeAudio).mockResolvedValueOnce('/tmp/podcast/missing.mp3')

    const { default: fs } = await import('fs')
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const postReq = mockReq({ body: { topic: 'Missing Audio' } })
    const postRes = mockRes()
    const next = vi.fn()

    await app.routes['POST /podcast'](postReq, postRes, next)

    const pid = postRes._body.pid
    const mockWs = createMockWs()
    app.routes['WS /ws/podcast'](mockWs, { url: `/ws/podcast?pid=${pid}`, socket: { remoteAddress: '127.0.0.1' } })

    await vi.runAllTimersAsync()

    expect(emitToAll).toHaveBeenCalledWith(
      expect.any(Set),
      expect.objectContaining({
        type: 'error',
        error: expect.stringContaining('Audio file not created'),
      })
    )
  })
})
