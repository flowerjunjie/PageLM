/**
 * Transcriber Routes Integration Tests
 *
 * Tests for POST /transcriber route handler, including multipart parsing,
 * mime validation, successful transcription, and error handling.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const testState = vi.hoisted(() => ({
  scenario: null as null | ((bb: MockBusboyInstance) => void),
  lastWriteStream: null as MockEmitter | null,
}))

type Handler = (...args: any[]) => void

type MockEmitter = {
  on: ReturnType<typeof vi.fn>
  destroy?: ReturnType<typeof vi.fn>
  pipe?: ReturnType<typeof vi.fn>
  emit: (event: string, ...args: any[]) => void
  handlers: Record<string, Handler[]>
}

type MockBusboyInstance = {
  on: ReturnType<typeof vi.fn>
  handlers: Record<string, Handler[]>
}

function createEmitter(options: { destroy?: boolean; pipe?: boolean } = {}): MockEmitter {
  const handlers: Record<string, Handler[]> = {}
  const emitter: MockEmitter = {
    on: vi.fn((event: string, cb: Handler) => {
      handlers[event] ||= []
      handlers[event].push(cb)
      return emitter
    }),
    emit: (event: string, ...args: any[]) => {
      for (const cb of handlers[event] || []) {
        cb(...args)
      }
    },
    handlers,
  }

  if (options.destroy) {
    emitter.destroy = vi.fn()
  }

  if (options.pipe) {
    emitter.pipe = vi.fn()
  }

  return emitter
}

function emitBusboy(bb: MockBusboyInstance, event: string, ...args: any[]) {
  for (const cb of bb.handlers[event] || []) {
    cb(...args)
  }
}

vi.mock('../../../src/services/transcriber', () => ({
  transcribeAudio: vi.fn().mockResolvedValue({
    text: 'Transcribed text',
    provider: 'openai',
    duration: 10.5,
    confidence: 0.95,
  }),
}))

vi.mock('../../../src/config/env', () => ({
  config: { transcription_provider: 'openai', baseUrl: 'http://localhost:3000' },
}))

vi.mock('busboy', () => ({
  default: vi.fn(() => {
    const handlers: Record<string, Handler[]> = {}
    const bb: MockBusboyInstance = {
      on: vi.fn((event: string, cb: Handler) => {
        handlers[event] ||= []
        handlers[event].push(cb)
        return bb
      }),
      handlers,
    }
    return bb
  }),
}))

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn().mockReturnValue(true),
      mkdirSync: vi.fn(),
      unlinkSync: vi.fn(),
      createWriteStream: vi.fn(() => {
        const stream = createEmitter({ destroy: true })
        testState.lastWriteStream = stream
        return stream
      }),
    },
  }
})

import fs from 'fs'
import path from 'path'
import { transcribeAudio } from '../../../src/services/transcriber'
import { transcriberRoutes } from '../../../src/core/routes/transcriber'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

type HandlerFn = (req: any, res: any) => any

function createApp() {
  const routes: Record<string, HandlerFn> = {}
  return {
    routes,
    post: (path: string, handler: HandlerFn) => {
      routes[`POST ${path}`] = handler
    },
  }
}

function mockRes() {
  const res: any = {
    _status: 200,
    _body: undefined,
    statusCode: 200,
    status: vi.fn(function (code: number) {
      res._status = code
      res.statusCode = code
      return res
    }),
    json: vi.fn(function (body: any) {
      res._body = body
      return res
    }),
    send: vi.fn(function (body: any) {
      res._body = body
      return res
    }),
  }
  return res
}

function mockReq(overrides: any = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    pipe: vi.fn((bb: MockBusboyInstance) => {
      testState.scenario?.(bb)
    }),
    ...overrides,
  }
}

function emitSingleFile(
  bb: MockBusboyInstance,
  info: { filename: string; mimeType: string },
  options: { provider?: string } = {}
) {
  if (options.provider) {
    emitBusboy(bb, 'field', 'provider', options.provider)
  }

  const file = createEmitter({ pipe: true })
  emitBusboy(bb, 'file', 'file', file, info)
  emitBusboy(bb, 'finish')
  testState.lastWriteStream?.emit('finish')
  return file
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let app: ReturnType<typeof createApp>

beforeEach(() => {
  vi.clearAllMocks()
  testState.scenario = null
  testState.lastWriteStream = null
  app = createApp()
  transcriberRoutes(app)
})

// ---------------------------------------------------------------------------
// POST /transcriber
// ---------------------------------------------------------------------------

describe('POST /transcriber', () => {
  it('should return 400 when content-type is not multipart', async () => {
    const req = mockReq({ headers: { 'content-type': 'application/json' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.ok).toBe(false)
    expect(res._body.error).toContain('multipart/form-data')
  })

  it('should return 400 when content-type is text/plain', async () => {
    const req = mockReq({ headers: { 'content-type': 'text/plain' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('multipart/form-data')
  })

  it('should return 400 when content-type is missing', async () => {
    const req = mockReq({ headers: {} })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.ok).toBe(false)
  })

  it('should use the default provider when provider field is omitted', async () => {
    testState.scenario = (bb) => {
      emitSingleFile(bb, { filename: 'lecture.wav', mimeType: 'audio/wav' })
    }

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=test' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(transcribeAudio).toHaveBeenCalledWith(expect.stringContaining('lecture.wav'), 'openai')
    expect(res._status).toBe(200)
  })

  it('should support video uploads for transcription', async () => {
    testState.scenario = (bb) => {
      emitSingleFile(bb, { filename: 'lecture.mp4', mimeType: 'video/mp4' })
    }

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=test' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(transcribeAudio).toHaveBeenCalledWith(expect.stringContaining('lecture.mp4'), 'openai')
    expect(res._status).toBe(200)
    expect(res._body.ok).toBe(true)
  })

  it('should fall back to audio/webm mime type when upload mime is missing', async () => {
    testState.scenario = (bb) => {
      emitSingleFile(bb, { filename: 'lecture.webm', mimeType: undefined as unknown as string })
    }

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=test' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(transcribeAudio).toHaveBeenCalledWith(expect.stringContaining('lecture.webm'), 'openai')
    expect(res._status).toBe(200)
  })

  it('should save missing filenames with the default audio name', async () => {
    testState.scenario = (bb) => {
      emitSingleFile(bb, { filename: undefined as unknown as string, mimeType: 'audio/wav' })
    }

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=test' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(transcribeAudio).toHaveBeenCalledWith(expect.stringContaining('audio'), 'openai')
    expect(res._status).toBe(200)
  })

  it('should create upload directory when it does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false)

    testState.scenario = (bb) => {
      emitBusboy(bb, 'finish')
    }

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=test' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith(
      expect.stringContaining('/storage/uploads'),
      { recursive: true }
    )
    expect(res._status).toBe(400)
    expect(res._body.error).toBe('No audio file provided')
  })

  it('should return 400 when multipart request contains no files', async () => {
    testState.scenario = (bb) => {
      emitBusboy(bb, 'finish')
    }

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=test' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(res._status).toBe(400)
    expect(res._body).toEqual({
      ok: false,
      error: 'No audio file provided',
    })
  })

  it('should write uploads inside the storage uploads directory', async () => {
    testState.scenario = (bb) => {
      emitSingleFile(bb, { filename: '../../lecture.wav', mimeType: 'audio/wav' })
    }

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=test' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    const savedPath = vi.mocked(transcribeAudio).mock.calls.at(-1)?.[0] as string
    const uploadsDir = path.resolve(process.cwd(), 'storage', 'uploads')

    expect(path.resolve(savedPath).startsWith(uploadsDir)).toBe(true)
  })

  it('should return 400 and clean up temp files when uploaded file is not audio or video', async () => {
    testState.scenario = (bb) => {
      emitSingleFile(bb, { filename: 'notes.txt', mimeType: 'text/plain' })
    }

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=test' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(res._status).toBe(400)
    expect(res._body).toEqual({
      ok: false,
      error: 'File must be an audio or video file',
    })
    expect(transcribeAudio).not.toHaveBeenCalled()
    expect(vi.mocked(fs.unlinkSync)).toHaveBeenCalledWith(expect.stringContaining('notes.txt'))
  })

  it('should transcribe a valid audio upload successfully', async () => {
    vi.mocked(transcribeAudio).mockResolvedValueOnce({
      text: 'Lecture transcript',
      provider: 'gemini',
      duration: 12.3,
      confidence: 0.99,
    })

    testState.scenario = (bb) => {
      emitSingleFile(
        bb,
        { filename: 'lecture.wav', mimeType: 'audio/wav' },
        { provider: 'gemini' }
      )
    }

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=test' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(transcribeAudio).toHaveBeenCalledWith(expect.stringContaining('lecture.wav'), 'gemini')
    expect(vi.mocked(fs.unlinkSync)).toHaveBeenCalledWith(expect.stringContaining('lecture.wav'))
    expect(res._status).toBe(200)
    expect(res._body).toEqual({
      ok: true,
      transcription: 'Lecture transcript',
      provider: 'gemini',
      duration: 12.3,
      confidence: 0.99,
    })
  })

  it('should return 413 when upload exceeds size limit', async () => {
    testState.scenario = (bb) => {
      const file = createEmitter({ pipe: true })
      emitBusboy(bb, 'file', 'file', file, { filename: 'large.mp3', mimeType: 'audio/mpeg' })
      file.emit('limit')
    }

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=test' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(testState.lastWriteStream?.destroy).toHaveBeenCalled()
    expect(res._status).toBe(413)
    expect(res._body.ok).toBe(false)
    expect(res._body.error).toContain('Maximum size is 10MB')
  })

  it('should return 500 when file stream emits an error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    testState.scenario = (bb) => {
      const file = createEmitter({ pipe: true })
      emitBusboy(bb, 'file', 'file', file, { filename: 'broken.wav', mimeType: 'audio/wav' })
      file.emit('error', new Error('file stream failed'))
    }

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=test' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({
      ok: false,
      error: 'file stream failed',
    })
    expect(errorSpy).toHaveBeenCalled()
  })

  it('should return 500 when write stream emits an error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    testState.scenario = (bb) => {
      const file = createEmitter({ pipe: true })
      emitBusboy(bb, 'file', 'file', file, { filename: 'broken.wav', mimeType: 'audio/wav' })
      testState.lastWriteStream?.emit('error', new Error('disk full'))
    }

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=test' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({
      ok: false,
      error: 'disk full',
    })
    expect(errorSpy).toHaveBeenCalled()
  })

  it('should return 500 when busboy emits a parsing error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    testState.scenario = (bb) => {
      emitBusboy(bb, 'error', new Error('multipart parse failed'))
    }

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=test' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({
      ok: false,
      error: 'multipart parse failed',
    })
    expect(errorSpy).toHaveBeenCalled()
  })

  it('should still return 200 when temp file cleanup fails after transcription', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.mocked(fs.unlinkSync).mockImplementationOnce(() => {
      throw new Error('cleanup failed')
    })

    testState.scenario = (bb) => {
      emitSingleFile(bb, { filename: 'lecture.wav', mimeType: 'audio/wav' })
    }

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=test' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(res._status).toBe(200)
    expect(res._body.ok).toBe(true)
    expect(warnSpy).toHaveBeenCalledWith('Failed to delete temp file:', expect.stringContaining('lecture.wav'))
  })

  it('should return 500 when transcription provider fails', async () => {
    vi.mocked(transcribeAudio).mockRejectedValueOnce(new Error('provider failed'))

    testState.scenario = (bb) => {
      emitSingleFile(bb, { filename: 'lecture.wav', mimeType: 'audio/wav' })
    }

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=test' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({
      ok: false,
      error: 'provider failed',
    })
    expect(vi.mocked(fs.unlinkSync)).toHaveBeenCalledWith(expect.stringContaining('lecture.wav'))
  })

  it('should return 500 with fallback error when transcription provider rejects without a message', async () => {
    vi.mocked(transcribeAudio).mockRejectedValueOnce({})

    testState.scenario = (bb) => {
      emitSingleFile(bb, { filename: 'lecture.wav', mimeType: 'audio/wav' })
    }

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=test' } })
    const res = mockRes()

    await app.routes['POST /transcriber'](req, res)

    expect(res._status).toBe(500)
    expect(res._body.ok).toBe(false)
    expect(res._body.error).toContain('Transcription failed')
  })
})
