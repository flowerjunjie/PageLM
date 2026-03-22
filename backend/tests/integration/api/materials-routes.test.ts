/**
 * Materials Routes Integration Tests
 *
 * Tests for POST /api/materials/generate, GET /api/materials/by-chat/:chatId,
 * GET /api/materials/:id, DELETE /api/materials/:id, GET /api/materials
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../../src/utils/database/keyv', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../src/lib/ai/learning-materials', () => ({
  generateAllMaterials: vi.fn(),
  generateFlashcards: vi.fn(),
  generateNotesSummary: vi.fn(),
  generateQuizQuestions: vi.fn(),
}))

import db from '../../../src/utils/database/keyv'
import { generateAllMaterials } from '../../../src/lib/ai/learning-materials'
import { materialsRoutes } from '../../../src/core/routes/materials'

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
    delete: (path: string, handler: Handler) => { routes[`DELETE ${path}`] = handler },
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

function mockDbGetByKey(values: Record<string, unknown>) {
  vi.mocked(db.get).mockImplementation(async (key: string) => values[key])
}

const sampleMaterials = {
  flashcards: [{ front: 'Q', back: 'A', topic: 'Test' }],
  notes: { summary: 'Summary text', keyPoints: [], topics: [] },
  quiz: { questions: [] },
}

const storedMaterial = {
  id: 'mat-1',
  chatId: 'chat-1',
  flashcards: sampleMaterials.flashcards,
  notes: sampleMaterials.notes,
  quiz: sampleMaterials.quiz,
  createdAt: Date.now(),
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let app: ReturnType<typeof createApp>

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(db.get).mockResolvedValue(undefined)
  vi.mocked(db.set).mockResolvedValue(undefined)
  vi.mocked(db.delete).mockResolvedValue(undefined)
  app = createApp()
  materialsRoutes(app)
})

// ---------------------------------------------------------------------------
// POST /api/materials/generate
// ---------------------------------------------------------------------------

describe('POST /api/materials/generate', () => {
  it('should return 400 when question is missing', async () => {
    const req = mockReq({ body: { answer: 'Some answer' } })
    const res = mockRes()

    await app.routes['POST /api/materials/generate'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('question and answer are required')
  })

  it('should return 400 when answer is missing', async () => {
    const req = mockReq({ body: { question: 'What is AI?' } })
    const res = mockRes()

    await app.routes['POST /api/materials/generate'](req, res)

    expect(res._status).toBe(400)
    expect(res._body).toEqual({ ok: false, error: 'question and answer are required' })
    expect(generateAllMaterials).not.toHaveBeenCalled()
    expect(db.set).not.toHaveBeenCalled()
  })

  it('should return 400 when body is missing', async () => {
    const req = mockReq({ body: undefined })
    const res = mockRes()

    await app.routes['POST /api/materials/generate'](req, res)

    expect(res._status).toBe(400)
    expect(res._body).toEqual({ ok: false, error: 'question and answer are required' })
    expect(generateAllMaterials).not.toHaveBeenCalled()
    expect(db.set).not.toHaveBeenCalled()
  })

  it('should generate materials when question and answer provided', async () => {
    vi.mocked(generateAllMaterials).mockResolvedValue(sampleMaterials as any)
    vi.mocked(db.get).mockResolvedValue([]) // empty index

    const req = mockReq({ body: { question: 'What is AI?', answer: 'AI is artificial intelligence' } })
    const res = mockRes()

    await app.routes['POST /api/materials/generate'](req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.materials).toBeDefined()
    expect(generateAllMaterials).toHaveBeenCalledWith('What is AI?', 'AI is artificial intelligence')
  })

  it('should save materials when chatId is provided', async () => {
    vi.mocked(generateAllMaterials).mockResolvedValue(sampleMaterials as any)
    vi.mocked(db.get).mockResolvedValue([])

    const req = mockReq({ body: { question: 'What is ML?', answer: 'ML is machine learning', chatId: 'chat-42' } })
    const res = mockRes()

    await app.routes['POST /api/materials/generate'](req, res)

    expect(db.set).toHaveBeenCalled()
    expect(res._body.storedId).toBeDefined()
  })

  it('should save materials when indexes do not exist yet', async () => {
    vi.mocked(generateAllMaterials).mockResolvedValue(sampleMaterials as any)
    vi.mocked(db.get).mockResolvedValue(undefined)

    const req = mockReq({ body: { question: 'What is DL?', answer: 'Deep learning', chatId: 'chat-99' } })
    const res = mockRes()

    await app.routes['POST /api/materials/generate'](req, res)

    expect(res._body.ok).toBe(true)
    expect(db.set).toHaveBeenCalledWith(
      'materials:chat:chat-99',
      expect.arrayContaining([expect.any(String)])
    )
    expect(db.set).toHaveBeenCalledWith(
      'materials:index',
      expect.arrayContaining([expect.any(String)])
    )
  })

  it('should not save materials when chatId is not provided', async () => {
    vi.mocked(generateAllMaterials).mockResolvedValue(sampleMaterials as any)

    const req = mockReq({ body: { question: 'What is AI?', answer: 'Artificial intelligence' } })
    const res = mockRes()

    await app.routes['POST /api/materials/generate'](req, res)

    expect(res._body.storedId).toBeUndefined()
  })

  it('should return 500 when saving generated materials fails', async () => {
    vi.mocked(generateAllMaterials).mockResolvedValue(sampleMaterials as any)
    vi.mocked(db.set).mockRejectedValueOnce(new Error('Persist error'))

    const req = mockReq({ body: { question: 'What is AI?', answer: 'Artificial intelligence', chatId: 'chat-1' } })
    const res = mockRes()

    await app.routes['POST /api/materials/generate'](req, res)

    expect(generateAllMaterials).toHaveBeenCalledWith('What is AI?', 'Artificial intelligence')
    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Persist error' })
  })

  it('should return fallback generate error when rejection has no message', async () => {
    vi.mocked(generateAllMaterials).mockRejectedValue({})

    const req = mockReq({ body: { question: 'Q', answer: 'A' } })
    const res = mockRes()

    await app.routes['POST /api/materials/generate'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to generate materials' })
  })

  it('should return 500 on service error', async () => {
    vi.mocked(generateAllMaterials).mockRejectedValue(new Error('LLM error'))

    const req = mockReq({ body: { question: 'Q', answer: 'A' } })
    const res = mockRes()

    await app.routes['POST /api/materials/generate'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'LLM error' })
    expect(db.set).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// GET /api/materials/by-chat/:chatId
// ---------------------------------------------------------------------------

describe('GET /api/materials/by-chat/:chatId', () => {
  it('should return 400 when chatId is missing', async () => {
    const req = mockReq({ params: {} })
    const res = mockRes()

    await app.routes['GET /api/materials/by-chat/:chatId'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('chatId is required')
  })

  it('should return empty array when no materials for chat', async () => {
    vi.mocked(db.get).mockResolvedValue([])

    const req = mockReq({ params: { chatId: 'chat-1' } })
    const res = mockRes()

    await app.routes['GET /api/materials/by-chat/:chatId'](req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.materials).toEqual([])
    expect(res._body.chatId).toBe('chat-1')
    expect(res._body.count).toBe(0)
  })

  it('should return empty array when chat materials index is missing', async () => {
    vi.mocked(db.get).mockResolvedValue(undefined)

    const req = mockReq({ params: { chatId: 'chat-1' } })
    const res = mockRes()

    await app.routes['GET /api/materials/by-chat/:chatId'](req, res)

    expect(res._body).toEqual({ ok: true, chatId: 'chat-1', materials: [], count: 0 })
  })

  it('should return materials for specified chat', async () => {
    mockDbGetByKey({
      'materials:chat:chat-1': ['mat-1'],
      'material:mat-1': storedMaterial,
    })

    const req = mockReq({ params: { chatId: 'chat-1' } })
    const res = mockRes()

    await app.routes['GET /api/materials/by-chat/:chatId'](req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.materials).toHaveLength(1)
    expect(res._body.count).toBe(1)
  })

  it('should skip missing materials and sort chat materials by createdAt descending', async () => {
    const olderMaterial = { ...storedMaterial, id: 'mat-old', createdAt: 100 }
    const newerMaterial = { ...storedMaterial, id: 'mat-new', createdAt: 300 }

    mockDbGetByKey({
      'materials:chat:chat-1': ['mat-old', 'mat-missing', 'mat-new'],
      'material:mat-old': olderMaterial,
      'material:mat-new': newerMaterial,
    })

    const req = mockReq({ params: { chatId: 'chat-1' } })
    const res = mockRes()

    await app.routes['GET /api/materials/by-chat/:chatId'](req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.materials.map((material: any) => material.id)).toEqual(['mat-new', 'mat-old'])
    expect(res._body.count).toBe(2)
  })

  it('should return 500 on service error', async () => {
    vi.mocked(db.get).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ params: { chatId: 'chat-1' } })
    const res = mockRes()

    await app.routes['GET /api/materials/by-chat/:chatId'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'DB error' })
  })

  it('should return fallback retrieve error when chat lookup rejection has no message', async () => {
    vi.mocked(db.get).mockRejectedValue({})

    const req = mockReq({ params: { chatId: 'chat-1' } })
    const res = mockRes()

    await app.routes['GET /api/materials/by-chat/:chatId'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to retrieve materials' })
  })
})

// ---------------------------------------------------------------------------
// GET /api/materials/:id
// ---------------------------------------------------------------------------

describe('GET /api/materials/:id', () => {
  it('should return 400 when id is missing', async () => {
    const req = mockReq({ params: {} })
    const res = mockRes()

    await app.routes['GET /api/materials/:id'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('id is required')
  })

  it('should return 404 when material not found', async () => {
    vi.mocked(db.get).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    await app.routes['GET /api/materials/:id'](req, res)

    expect(res._status).toBe(404)
    expect(res._body.error).toContain('Material not found')
  })

  it('should return material when found', async () => {
    vi.mocked(db.get).mockResolvedValue(storedMaterial)

    const req = mockReq({ params: { id: 'mat-1' } })
    const res = mockRes()

    await app.routes['GET /api/materials/:id'](req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.material.id).toBe('mat-1')
  })

  it('should return 500 on database error', async () => {
    vi.mocked(db.get).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ params: { id: 'mat-1' } })
    const res = mockRes()

    await app.routes['GET /api/materials/:id'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'DB error' })
  })

  it('should return fallback retrieve-by-id error when rejection has no message', async () => {
    vi.mocked(db.get).mockRejectedValue({})

    const req = mockReq({ params: { id: 'mat-1' } })
    const res = mockRes()

    await app.routes['GET /api/materials/:id'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to retrieve material' })
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/materials/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/materials/:id', () => {
  it('should return 400 when id is missing', async () => {
    const req = mockReq({ params: {} })
    const res = mockRes()

    await app.routes['DELETE /api/materials/:id'](req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('id is required')
  })

  it('should return 404 when material not found', async () => {
    vi.mocked(db.get).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    await app.routes['DELETE /api/materials/:id'](req, res)

    expect(res._status).toBe(404)
    expect(res._body.error).toContain('Material not found')
  })

  it('should delete material and return ok', async () => {
    vi.mocked(db.get)
      .mockResolvedValueOnce(storedMaterial) // getMaterialById
      .mockResolvedValueOnce(['mat-1'])       // chatMaterials
      .mockResolvedValueOnce(['mat-1'])       // globalIndex

    const req = mockReq({ params: { id: 'mat-1' } })
    const res = mockRes()

    await app.routes['DELETE /api/materials/:id'](req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.message).toContain('deleted')
    expect(db.delete).toHaveBeenCalled()
  })

  it('should remove deleted material from chat and global indexes', async () => {
    mockDbGetByKey({
      'material:mat-1': storedMaterial,
      'materials:chat:chat-1': ['mat-1', 'mat-2'],
      'materials:index': ['mat-3', 'mat-1', 'mat-2'],
    })

    const req = mockReq({ params: { id: 'mat-1' } })
    const res = mockRes()

    await app.routes['DELETE /api/materials/:id'](req, res)

    expect(res._body.ok).toBe(true)
    expect(db.set).toHaveBeenCalledWith('materials:chat:chat-1', ['mat-2'])
    expect(db.set).toHaveBeenCalledWith('materials:index', ['mat-3', 'mat-2'])
    expect(db.delete).toHaveBeenCalledWith('material:mat-1')
  })

  it('should delete material when indexes are missing', async () => {
    mockDbGetByKey({
      'material:mat-1': storedMaterial,
    })

    const req = mockReq({ params: { id: 'mat-1' } })
    const res = mockRes()

    await app.routes['DELETE /api/materials/:id'](req, res)

    expect(res._body.ok).toBe(true)
    expect(db.set).toHaveBeenCalledWith('materials:chat:chat-1', [])
    expect(db.set).toHaveBeenCalledWith('materials:index', [])
    expect(db.delete).toHaveBeenCalledWith('material:mat-1')
  })

  it('should return 500 on database error', async () => {
    vi.mocked(db.get).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ params: { id: 'mat-1' } })
    const res = mockRes()

    await app.routes['DELETE /api/materials/:id'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'DB error' })
  })

  it('should return fallback delete error when rejection has no message', async () => {
    vi.mocked(db.get).mockRejectedValue({})

    const req = mockReq({ params: { id: 'mat-1' } })
    const res = mockRes()

    await app.routes['DELETE /api/materials/:id'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to delete material' })
  })
})

// ---------------------------------------------------------------------------
// GET /api/materials (paginated list)
// ---------------------------------------------------------------------------

describe('GET /api/materials', () => {
  it('should return empty list when no materials', async () => {
    vi.mocked(db.get).mockResolvedValue([])

    const req = mockReq({ query: {} })
    const res = mockRes()

    await app.routes['GET /api/materials'](req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.materials).toEqual([])
    expect(res._body.pagination.total).toBe(0)
  })

  it('should return empty list when global index is missing', async () => {
    vi.mocked(db.get).mockResolvedValue(undefined)

    const req = mockReq({ query: {} })
    const res = mockRes()

    await app.routes['GET /api/materials'](req, res)

    expect(res._body).toEqual({
      ok: true,
      materials: [],
      pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
    })
  })

  it('should return materials with pagination info', async () => {
    vi.mocked(db.get)
      .mockResolvedValueOnce(['mat-1', 'mat-2'])  // globalIndex
      .mockResolvedValueOnce(storedMaterial)       // materialById mat-1
      .mockResolvedValueOnce({ ...storedMaterial, id: 'mat-2' }) // materialById mat-2

    const req = mockReq({ query: {} })
    const res = mockRes()

    await app.routes['GET /api/materials'](req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.materials).toHaveLength(2)
    expect(res._body.pagination.total).toBe(2)
    expect(res._body.pagination.hasMore).toBe(false)
  })

  it('should skip missing materials while keeping pagination total from the index', async () => {
    mockDbGetByKey({
      'materials:index': ['mat-1', 'mat-ghost', 'mat-2'],
      'material:mat-1': storedMaterial,
      'material:mat-2': { ...storedMaterial, id: 'mat-2' },
    })

    const req = mockReq({ query: {} })
    const res = mockRes()

    await app.routes['GET /api/materials'](req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.materials.map((material: any) => material.id)).toEqual(['mat-1', 'mat-2'])
    expect(res._body.pagination.total).toBe(3)
  })

  it('should respect limit query parameter', async () => {
    vi.mocked(db.get)
      .mockResolvedValueOnce(['mat-1', 'mat-2', 'mat-3']) // globalIndex with 3 items
      .mockResolvedValueOnce(storedMaterial)               // only mat-1 fetched (limit=1)

    const req = mockReq({ query: { limit: '1' } })
    const res = mockRes()

    await app.routes['GET /api/materials'](req, res)

    expect(res._body.pagination.limit).toBe(1)
    expect(res._body.pagination.hasMore).toBe(true)
  })

  it('should respect offset query parameter', async () => {
    vi.mocked(db.get)
      .mockResolvedValueOnce(['mat-1', 'mat-2']) // globalIndex
      .mockResolvedValueOnce(storedMaterial)      // mat-2 (offset=1)

    const req = mockReq({ query: { offset: '1' } })
    const res = mockRes()

    await app.routes['GET /api/materials'](req, res)

    expect(res._body.pagination.offset).toBe(1)
  })

  it('should fall back to default pagination values for invalid limit and offset', async () => {
    vi.mocked(db.get).mockResolvedValue([])

    const req = mockReq({ query: { limit: 'abc', offset: 'xyz' } })
    const res = mockRes()

    await app.routes['GET /api/materials'](req, res)

    expect(res._body.pagination.limit).toBe(50)
    expect(res._body.pagination.offset).toBe(0)
  })

  it('should cap limit at 100', async () => {
    vi.mocked(db.get).mockResolvedValue([])

    const req = mockReq({ query: { limit: '999' } })
    const res = mockRes()

    await app.routes['GET /api/materials'](req, res)

    expect(res._body.pagination.limit).toBe(100)
  })

  it('should return 500 on database error', async () => {
    vi.mocked(db.get).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ query: {} })
    const res = mockRes()

    await app.routes['GET /api/materials'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'DB error' })
  })

  it('should return fallback list error when rejection has no message', async () => {
    vi.mocked(db.get).mockRejectedValue({})

    const req = mockReq({ query: {} })
    const res = mockRes()

    await app.routes['GET /api/materials'](req, res)

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'Failed to list materials' })
  })
})
