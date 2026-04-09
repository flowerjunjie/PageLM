/**
 * Planner Routes Integration Tests
 *
 * Tests for all planner route handlers (synchronous validation paths).
 * WebSocket and async background processing are not deeply tested here.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

// ---------------------------------------------------------------------------
// Mocks (must be before imports that use them)
// ---------------------------------------------------------------------------

vi.mock('../../../src/services/planner/service', () => ({
  plannerService: {
    createTaskFromRequest: vi.fn(),
    getTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    listTasks: vi.fn(),
    replanTask: vi.fn(),
    planSingleTask: vi.fn(),
    generateWeeklyPlan: vi.fn(),
    getTodaySessions: vi.fn(),
    getUpcomingDeadlines: vi.fn(),
    getUserStats: vi.fn(),
    generateMaterials: vi.fn(),
    updateSlot: vi.fn(),
    addFilesToTask: vi.fn(),
    removeFileFromTask: vi.fn(),
  },
}))

vi.mock('../../../src/services/planner/ingest', () => ({
  ingestText: vi.fn(),
}))

vi.mock('../../../src/utils/chat/ws', () => ({
  emitToAll: vi.fn(),
  emitLarge: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/lib/parser/upload', () => ({
  parseMultipart: vi.fn(),
}))

vi.mock('../../../src/services/homework-parser', () => ({
  parseHomework: vi.fn(),
  priorityToNumber: vi.fn(),
}))

vi.mock('../../../src/services/notifications', () => ({
  scheduleTaskReminders: vi.fn().mockResolvedValue([]),
  cancelTaskNotifications: vi.fn(),
  getUserNotifications: vi.fn().mockReturnValue([]),
  sendTaskCompletionNotification: vi.fn(),
  cancelNotification: vi.fn().mockReturnValue(true),
}))

vi.mock('../../../src/config/env', () => ({
  config: {
    jwtSecret: 'test-secret-key-for-testing-only',
  }
}))

import { plannerService } from '../../../src/services/planner/service'
import { parseMultipart } from '../../../src/lib/parser/upload'
import { emitToAll, emitLarge } from '../../../src/utils/chat/ws'
import {
  scheduleTaskReminders,
  cancelTaskNotifications,
  sendTaskCompletionNotification,
} from '../../../src/services/notifications'
import { parseHomework } from '../../../src/services/homework-parser'
import { plannerRoutes } from '../../../src/core/routes/planner'
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
    patch: (path: string, ...handlers: Handler[]) => { routes[`PATCH ${path}`] = handlers },
    delete: (path: string, ...handlers: Handler[]) => { routes[`DELETE ${path}`] = handlers },
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

const sampleTask = {
  id: 'task-1',
  title: 'Test Task',
  status: 'todo',
  dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  estMins: 60,
  priority: 3,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let app: ReturnType<typeof createApp>

beforeEach(() => {
  vi.clearAllMocks()
  app = createApp()
  plannerRoutes(app)
})

// ---------------------------------------------------------------------------
// POST /tasks
// ---------------------------------------------------------------------------

describe('POST /tasks', () => {
  it('should create task from JSON body', async () => {
    vi.mocked(plannerService.createTaskFromRequest).mockResolvedValue(sampleTask as any)

    const req = mockReq({ body: { title: 'New Task', dueAt: sampleTask.dueAt, estMins: 60, priority: 3 } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks'])

    expect(res._body.ok).toBe(true)
    expect(res._body.task).toBeDefined()
    expect(plannerService.createTaskFromRequest).toHaveBeenCalled()
  })

  it('should return 500 when service throws', async () => {
    vi.mocked(plannerService.createTaskFromRequest).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ body: { title: 'Task' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks'])

    expect(res._status).toBe(500)
    expect(res._body.ok).toBe(false)
  })

  it('should handle multipart form data', async () => {
    const { parseMultipart } = await import('../../../src/lib/parser/upload')
    vi.mocked(parseMultipart).mockResolvedValue({ q: 'task text', files: [] } as any)
    vi.mocked(plannerService.createTaskFromRequest).mockResolvedValue(sampleTask as any)

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=xxxx' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks'])

    expect(res._body.ok).toBe(true)
    expect(vi.mocked(parseMultipart)).toHaveBeenCalledWith(req)
    expect(plannerService.createTaskFromRequest).toHaveBeenCalledWith({ text: 'task text', files: [] })
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(undefined, { type: 'task.created', task: sampleTask })
  })

  it('should return fallback error when multipart parsing fails without a message', async () => {
    const { parseMultipart } = await import('../../../src/lib/parser/upload')
    vi.mocked(parseMultipart).mockRejectedValue(undefined)

    const req = mockReq({ headers: { 'content-type': 'multipart/form-data; boundary=xxxx' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'failed' })
    expect(plannerService.createTaskFromRequest).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// POST /tasks/ingest
// ---------------------------------------------------------------------------

describe('POST /tasks/ingest', () => {
  it('should return 400 when text is missing', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/ingest'])

    expect(res._status).toBe(400)
    expect(res._body.ok).toBe(false)
    expect(res._body.error).toContain('text required')
  })

  it('should return 400 when text is empty', async () => {
    const req = mockReq({ body: { text: '   ' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/ingest'])

    expect(res._status).toBe(400)
  })

  it('should create task when text is provided', async () => {
    vi.mocked(plannerService.createTaskFromRequest).mockResolvedValue(sampleTask as any)

    const req = mockReq({ body: { text: 'Math homework due Friday' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/ingest'])

    expect(res._body.ok).toBe(true)
    expect(res._body.task).toBeDefined()
    expect(plannerService.createTaskFromRequest).toHaveBeenCalledWith({ text: 'Math homework due Friday' })
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(undefined, { type: 'task.created', task: sampleTask })
  })

  it('should return 500 on service error', async () => {
    vi.mocked(plannerService.createTaskFromRequest).mockRejectedValue(new Error('fail'))

    const req = mockReq({ body: { text: 'Some homework text' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/ingest'])

    expect(res._status).toBe(500)
    expect(res._body.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// GET /tasks/:id
// ---------------------------------------------------------------------------

describe('GET /tasks/:id', () => {
  it('should return 404 for non-existent task', async () => {
    vi.mocked(plannerService.getTask).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    await exec(req, res, app.routes['GET /tasks/:id'])

    expect(res._status).toBe(404)
    expect(res._body.ok).toBe(false)
    expect(res._body.error).toContain('Task not found')
  })

  it('should return task when found', async () => {
    vi.mocked(plannerService.getTask).mockResolvedValue(sampleTask as any)

    const req = mockReq({ params: { id: 'task-1' } })
    const res = mockRes()

    await exec(req, res, app.routes['GET /tasks/:id'])

    expect(res._body.ok).toBe(true)
    expect(res._body.task.id).toBe('task-1')
  })

  it('should return 500 on service error', async () => {
    vi.mocked(plannerService.getTask).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ params: { id: 'task-1' } })
    const res = mockRes()

    await exec(req, res, app.routes['GET /tasks/:id'])

    expect(res._status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// POST /tasks/:id/replan
// ---------------------------------------------------------------------------

describe('POST /tasks/:id/replan', () => {
  it('should return 404 when task not found', async () => {
    vi.mocked(plannerService.replanTask).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/replan'])

    expect(res._status).toBe(404)
  })

  it('should return task after replanning', async () => {
    vi.mocked(plannerService.replanTask).mockResolvedValue({ ...sampleTask, plan: { slots: [] } } as any)

    const req = mockReq({ params: { id: 'task-1' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/replan'])

    expect(res._body.ok).toBe(true)
    expect(res._body.task).toBeDefined()
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(undefined, { type: 'plan.update', taskId: 'task-1', slots: [] })
  })

  it('should return fallback error when replanning fails without a message', async () => {
    vi.mocked(plannerService.replanTask).mockRejectedValue(undefined)

    const req = mockReq({ params: { id: 'task-1' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/replan'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'failed' })
    expect(vi.mocked(emitToAll)).not.toHaveBeenCalledWith(undefined, expect.objectContaining({ type: 'plan.update' }))
  })
})

// ---------------------------------------------------------------------------
// POST /tasks/:id/plan
// ---------------------------------------------------------------------------

describe('POST /tasks/:id/plan', () => {
  it('should return 404 when task not found', async () => {
    vi.mocked(plannerService.planSingleTask).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/plan'])

    expect(res._status).toBe(404)
  })

  it('should return planned task', async () => {
    const plannedTask = { ...sampleTask, steps: ['Step 1', 'Step 2'], plan: { slots: [] } }
    vi.mocked(plannerService.planSingleTask).mockResolvedValue(plannedTask as any)

    const req = mockReq({ params: { id: 'task-1' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/plan'])

    expect(res._body.ok).toBe(true)
    expect(res._body.task.steps).toBeDefined()
  })

  it('should return 500 on service error', async () => {
    vi.mocked(plannerService.planSingleTask).mockRejectedValue(new Error('planning failed'))

    const req = mockReq({ params: { id: 'task-1' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/plan'])

    expect(res._status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// POST /planner/weekly
// ---------------------------------------------------------------------------

describe('POST /planner/weekly', () => {
  it('should return weekly plan', async () => {
    const result = { plan: { slots: [] }, tasks: [] }
    vi.mocked(plannerService.generateWeeklyPlan).mockResolvedValue(result as any)

    const req = mockReq({ body: {} })
    const res = mockRes()

    await exec(req, res, app.routes['POST /planner/weekly'])

    expect(res._body.ok).toBe(true)
    expect(res._body.plan).toBeDefined()
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(undefined, { type: 'weekly.update', plan: result.plan })
  })

  it('should return 500 on error', async () => {
    vi.mocked(plannerService.generateWeeklyPlan).mockRejectedValue(new Error('fail'))

    const req = mockReq({ body: {} })
    const res = mockRes()

    await exec(req, res, app.routes['POST /planner/weekly'])

    expect(res._status).toBe(500)
    expect(res._body.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// GET /planner/today
// ---------------------------------------------------------------------------

describe('GET /planner/today', () => {
  it('should return today sessions', async () => {
    vi.mocked(plannerService.getTodaySessions).mockResolvedValue([])

    const req = mockReq()
    const res = mockRes()

    await exec(req, res, app.routes['GET /planner/today'])

    expect(res._body.ok).toBe(true)
    expect(Array.isArray(res._body.sessions)).toBe(true)
  })

  it('should return 500 on error', async () => {
    vi.mocked(plannerService.getTodaySessions).mockRejectedValue(new Error('db error'))

    const req = mockReq()
    const res = mockRes()

    await exec(req, res, app.routes['GET /planner/today'])

    expect(res._status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// GET /planner/deadlines
// ---------------------------------------------------------------------------

describe('GET /planner/deadlines', () => {
  it('should return deadlines', async () => {
    vi.mocked(plannerService.getUpcomingDeadlines).mockResolvedValue({ deadlines: [], urgent: [] } as any)

    const req = mockReq()
    const res = mockRes()

    await exec(req, res, app.routes['GET /planner/deadlines'])

    expect(res._body.ok).toBe(true)
  })

  it('should return 500 on error', async () => {
    vi.mocked(plannerService.getUpcomingDeadlines).mockRejectedValue(new Error('fail'))

    const req = mockReq()
    const res = mockRes()

    await exec(req, res, app.routes['GET /planner/deadlines'])

    expect(res._status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// GET /planner/stats
// ---------------------------------------------------------------------------

describe('GET /planner/stats', () => {
  it('should return stats', async () => {
    vi.mocked(plannerService.getUserStats).mockResolvedValue({ completedTasks: 5, totalTasks: 10 } as any)

    const req = mockReq()
    const res = mockRes()

    await exec(req, res, app.routes['GET /planner/stats'])

    expect(res._body.ok).toBe(true)
    expect(res._body.stats).toBeDefined()
  })

  it('should return fallback error when service fails without a message', async () => {
    vi.mocked(plannerService.getUserStats).mockRejectedValue(undefined)

    const req = mockReq()
    const res = mockRes()

    await exec(req, res, app.routes['GET /planner/stats'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'failed' })
  })
})

// ---------------------------------------------------------------------------
// GET /tasks (list with filters)
// ---------------------------------------------------------------------------

describe('GET /tasks', () => {
  it('should return all tasks without filters', async () => {
    vi.mocked(plannerService.listTasks).mockResolvedValue([sampleTask] as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    await exec(req, res, app.routes['GET /tasks'])

    expect(res._body.ok).toBe(true)
    expect(res._body.tasks).toHaveLength(1)
  })

  it('should pass status filter to service', async () => {
    vi.mocked(plannerService.listTasks).mockResolvedValue([])

    const req = mockReq({ query: { status: 'done' } })
    const res = mockRes()

    await exec(req, res, app.routes['GET /tasks'])

    expect(plannerService.listTasks).toHaveBeenCalledWith(expect.objectContaining({ status: 'done' }))
  })

  it('should pass dueBefore filter to service', async () => {
    vi.mocked(plannerService.listTasks).mockResolvedValue([])

    const dueBefore = new Date().toISOString()
    const req = mockReq({ query: { dueBefore } })
    const res = mockRes()

    await exec(req, res, app.routes['GET /tasks'])

    expect(plannerService.listTasks).toHaveBeenCalledWith(expect.objectContaining({ dueBefore }))
  })

  it('should pass course filter to service', async () => {
    vi.mocked(plannerService.listTasks).mockResolvedValue([])

    const req = mockReq({ query: { course: 'math' } })
    const res = mockRes()

    await exec(req, res, app.routes['GET /tasks'])

    expect(plannerService.listTasks).toHaveBeenCalledWith(expect.objectContaining({ course: 'math' }))
  })

  it('should return 500 on service error', async () => {
    vi.mocked(plannerService.listTasks).mockRejectedValue(new Error('fail'))

    const req = mockReq({ query: {} })
    const res = mockRes()

    await exec(req, res, app.routes['GET /tasks'])

    expect(res._status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// PATCH /tasks/:id
// ---------------------------------------------------------------------------

describe('PATCH /tasks/:id', () => {
  it('should return 404 when task not found', async () => {
    vi.mocked(plannerService.updateTask).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' }, body: { title: 'Updated' } })
    const res = mockRes()

    await exec(req, res, app.routes['PATCH /tasks/:id'])

    expect(res._status).toBe(404)
  })

  it('should return updated task', async () => {
    const updated = { ...sampleTask, title: 'Updated Task' }
    vi.mocked(plannerService.updateTask).mockResolvedValue(updated as any)

    const req = mockReq({ params: { id: 'task-1' }, body: { title: 'Updated Task' } })
    const res = mockRes()

    await exec(req, res, app.routes['PATCH /tasks/:id'])

    expect(res._body.ok).toBe(true)
    expect(res._body.task.title).toBe('Updated Task')
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(undefined, { type: 'task.updated', task: updated })
  })

  it('should return 500 on error', async () => {
    vi.mocked(plannerService.updateTask).mockRejectedValue(new Error('fail'))

    const req = mockReq({ params: { id: 'task-1' }, body: {} })
    const res = mockRes()

    await exec(req, res, app.routes['PATCH /tasks/:id'])

    expect(res._status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// DELETE /tasks/:id
// ---------------------------------------------------------------------------

describe('DELETE /tasks/:id', () => {
  it('should return 404 when task not found', async () => {
    vi.mocked(plannerService.deleteTask).mockResolvedValue(false)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    await exec(req, res, app.routes['DELETE /tasks/:id'])

    expect(res._status).toBe(404)
  })

  it('should return ok: true after deletion', async () => {
    vi.mocked(plannerService.deleteTask).mockResolvedValue(true)

    const req = mockReq({ params: { id: 'task-1' } })
    const res = mockRes()

    await exec(req, res, app.routes['DELETE /tasks/:id'])

    expect(res._body.ok).toBe(true)
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(undefined, { type: 'task.deleted', taskId: 'task-1' })
  })

  it('should return fallback error when deletion fails without a message', async () => {
    vi.mocked(plannerService.deleteTask).mockRejectedValue(undefined)

    const req = mockReq({ params: { id: 'task-1' } })
    const res = mockRes()

    await exec(req, res, app.routes['DELETE /tasks/:id'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'failed' })
    expect(vi.mocked(emitToAll)).not.toHaveBeenCalledWith(undefined, expect.objectContaining({ type: 'task.deleted' }))
  })
})

// ---------------------------------------------------------------------------
// POST /tasks/:id/files
// ---------------------------------------------------------------------------

describe('POST /tasks/:id/files', () => {
  it('should return 400 when content-type is not multipart', async () => {
    const req = mockReq({
      params: { id: 'task-1' },
      headers: { 'content-type': 'application/json' },
    })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/files'])

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('multipart/form-data required')
  })

  it('should return 400 when no files uploaded', async () => {
    vi.mocked(parseMultipart).mockResolvedValue({ q: '', files: [] } as any)

    const req = mockReq({
      params: { id: 'task-1' },
      headers: { 'content-type': 'multipart/form-data; boundary=xxx' },
    })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/files'])

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('no files uploaded')
  })

  it('should upload files and emit task.files.added event', async () => {
    const files = [{ id: 'file-1', name: 'a.pdf' }]
    vi.mocked(parseMultipart).mockResolvedValue({ q: '', files } as any)
    vi.mocked(plannerService.addFilesToTask).mockResolvedValue(files as any)

    const req = mockReq({
      params: { id: 'task-1' },
      headers: { 'content-type': 'multipart/form-data; boundary=xxx' },
    })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/files'])

    expect(res._body).toEqual({ ok: true, files })
    expect(plannerService.addFilesToTask).toHaveBeenCalledWith('task-1', files)
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(
      undefined,
      { type: 'task.files.added', taskId: 'task-1', files }
    )
  })

  it('should return 500 when uploading files to a task fails', async () => {
    const files = [{ id: 'file-1', name: 'a.pdf' }]
    vi.mocked(parseMultipart).mockResolvedValue({ q: '', files } as any)
    vi.mocked(plannerService.addFilesToTask).mockRejectedValue(new Error('upload failed'))

    const req = mockReq({
      params: { id: 'task-1' },
      headers: { 'content-type': 'multipart/form-data; boundary=xxx' },
    })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/files'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'upload failed' })
    expect(vi.mocked(emitToAll)).not.toHaveBeenCalledWith(
      undefined,
      { type: 'task.files.added', taskId: 'task-1', files }
    )
  })

  it('should return 500 when multipart parsing fails', async () => {
    vi.mocked(parseMultipart).mockRejectedValue(new Error('parse failed'))

    const req = mockReq({
      params: { id: 'task-1' },
      headers: { 'content-type': 'multipart/form-data; boundary=xxx' },
    })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/files'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'parse failed' })
  })
})

// ---------------------------------------------------------------------------
// DELETE /tasks/:id/files/:fileId
// ---------------------------------------------------------------------------

describe('DELETE /tasks/:id/files/:fileId', () => {
  it('should return 404 when file not found', async () => {
    vi.mocked(plannerService.removeFileFromTask).mockResolvedValue(false)

    const req = mockReq({ params: { id: 'task-1', fileId: 'nonexistent' } })
    const res = mockRes()

    await exec(req, res, app.routes['DELETE /tasks/:id/files/:fileId'])

    expect(res._status).toBe(404)
  })

  it('should return ok: true after file deletion', async () => {
    vi.mocked(plannerService.removeFileFromTask).mockResolvedValue(true)

    const req = mockReq({ params: { id: 'task-1', fileId: 'file-1' } })
    const res = mockRes()

    await exec(req, res, app.routes['DELETE /tasks/:id/files/:fileId'])

    expect(res._body.ok).toBe(true)
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(undefined, { type: 'task.file.removed', taskId: 'task-1', fileId: 'file-1' })
  })

  it('should return fallback error when file deletion fails without a message', async () => {
    vi.mocked(plannerService.removeFileFromTask).mockRejectedValue(undefined)

    const req = mockReq({ params: { id: 'task-1', fileId: 'file-1' } })
    const res = mockRes()

    await exec(req, res, app.routes['DELETE /tasks/:id/files/:fileId'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'failed' })
    expect(vi.mocked(emitToAll)).not.toHaveBeenCalledWith(undefined, expect.objectContaining({ type: 'task.file.removed' }))
  })
})

describe('POST /tasks/:id/materials', () => {
  it('should generate materials, emit payload, and mark completion', async () => {
    const materials = { summary: 'Key ideas' }
    vi.mocked(plannerService.generateMaterials).mockResolvedValue(materials as any)

    const req = mockReq({ params: { id: 'task-1' }, body: { type: 'summary' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/materials'])

    expect(vi.mocked(emitToAll)).toHaveBeenNthCalledWith(1, undefined, { type: 'phase', value: 'assist' })
    expect(vi.mocked(plannerService.generateMaterials)).toHaveBeenCalledWith('task-1', { type: 'summary' })
    expect(vi.mocked(emitLarge)).toHaveBeenCalledWith(
      undefined,
      'materials',
      { taskId: 'task-1', type: 'summary', data: materials },
      { gzip: true }
    )
    expect(vi.mocked(emitToAll)).toHaveBeenNthCalledWith(2, undefined, { type: 'done', taskId: 'task-1' })
    expect(res._body).toEqual({ ok: true, materials })
  })

  it('should default materials type to summary when not provided', async () => {
    vi.mocked(plannerService.generateMaterials).mockResolvedValue({ summary: 'Default type' } as any)

    const req = mockReq({ params: { id: 'task-1' }, body: {} })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/materials'])

    expect(vi.mocked(plannerService.generateMaterials)).toHaveBeenCalledWith('task-1', { type: 'summary' })
  })

  it('should return 500 and stop before done when large emit fails', async () => {
    vi.mocked(plannerService.generateMaterials).mockResolvedValue({ summary: 'Key ideas' } as any)
    vi.mocked(emitLarge).mockRejectedValue(new Error('emit failed'))

    const req = mockReq({ params: { id: 'task-1' }, body: { type: 'flashcards' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/materials'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'emit failed' })
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(undefined, { type: 'phase', value: 'assist' })
    expect(vi.mocked(emitToAll)).not.toHaveBeenCalledWith(undefined, { type: 'done', taskId: 'task-1' })
  })
})

// ---------------------------------------------------------------------------
// PATCH /slots/:taskId/:slotId
// ---------------------------------------------------------------------------

describe('PATCH /slots/:taskId/:slotId', () => {
  it('should return 404 when task or slot not found', async () => {
    vi.mocked(plannerService.updateSlot).mockResolvedValue(null)

    const req = mockReq({ params: { taskId: 'task-1', slotId: 'slot-x' }, body: { done: true } })
    const res = mockRes()

    await exec(req, res, app.routes['PATCH /slots/:taskId/:slotId'])

    expect(res._status).toBe(404)
  })

  it('should return updated task after slot update', async () => {
    const updatedTask = { ...sampleTask, plan: { slots: [{ id: 'slot-1', done: true }] } }
    vi.mocked(plannerService.updateSlot).mockResolvedValue(updatedTask as any)

    const req = mockReq({ params: { taskId: 'task-1', slotId: 'slot-1' }, body: { done: true } })
    const res = mockRes()

    await exec(req, res, app.routes['PATCH /slots/:taskId/:slotId'])

    expect(res._body.ok).toBe(true)
    expect(res._body.task).toBeDefined()
    expect(plannerService.updateSlot).toHaveBeenCalledWith('task-1', 'slot-1', { done: true, skip: undefined })
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(undefined, { type: 'slot.update', taskId: 'task-1', slotId: 'slot-1', done: true, skip: undefined })
  })

  it('should return fallback error when slot update fails without a message', async () => {
    vi.mocked(plannerService.updateSlot).mockRejectedValue(undefined)

    const req = mockReq({ params: { taskId: 'task-1', slotId: 'slot-1' }, body: { done: true } })
    const res = mockRes()

    await exec(req, res, app.routes['PATCH /slots/:taskId/:slotId'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'failed' })
    expect(vi.mocked(emitToAll)).not.toHaveBeenCalledWith(undefined, expect.objectContaining({ type: 'slot.update' }))
  })
})

// ---------------------------------------------------------------------------
// POST /sessions/start
// ---------------------------------------------------------------------------

describe('POST /sessions/start', () => {
  it('should return 400 when taskId is missing', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()

    await exec(req, res, app.routes['POST /sessions/start'])

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('taskId required')
  })

  it('should return session with id and startedAt', async () => {
    const req = mockReq({ body: { taskId: 'task-1' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /sessions/start'])

    expect(res._body.ok).toBe(true)
    expect(res._body.session.id).toBeDefined()
    expect(res._body.session.taskId).toBe('task-1')
    expect(res._body.session.startedAt).toBeDefined()
    expect(res._body.session.status).toBe('active')
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(undefined, {
      type: 'session.started',
      session: expect.objectContaining({
        id: res._body.session.id,
        taskId: 'task-1',
        startedAt: res._body.session.startedAt,
        status: 'active'
      })
    })
  })

  it('should include slotId when provided', async () => {
    const req = mockReq({ body: { taskId: 'task-1', slotId: 'slot-1' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /sessions/start'])

    expect(res._body.session.slotId).toBe('slot-1')
  })
})

// ---------------------------------------------------------------------------
// POST /sessions/:id/stop
// ---------------------------------------------------------------------------

describe('POST /sessions/:id/stop', () => {
  it('should return session with minutesWorked and completed', async () => {
    const req = mockReq({ params: { id: 'session-1' }, body: { minutesWorked: 45, completed: true } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /sessions/:id/stop'])

    expect(res._body.ok).toBe(true)
    expect(res._body.session.id).toBe('session-1')
    expect(res._body.session.minutesWorked).toBe(45)
    expect(res._body.session.completed).toBe(true)
    expect(res._body.session.status).toBe('completed')
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        type: 'session.ended',
        session: expect.objectContaining({
          id: 'session-1',
          minutesWorked: 45,
          completed: true,
          status: 'completed'
        })
      })
    )
  })

  it('should default minutesWorked to 0 and completed to false', async () => {
    const req = mockReq({ params: { id: 'session-2' }, body: {} })
    const res = mockRes()

    await exec(req, res, app.routes['POST /sessions/:id/stop'])

    expect(res._body.session.minutesWorked).toBe(0)
    expect(res._body.session.completed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// POST /reminders/schedule
// ---------------------------------------------------------------------------

describe('POST /reminders/schedule', () => {
  it('should return 400 when text is missing', async () => {
    const req = mockReq({ body: { scheduledFor: new Date().toISOString() } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /reminders/schedule'])

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('text and scheduledFor required')
  })

  it('should return 400 when scheduledFor is missing', async () => {
    const req = mockReq({ body: { text: 'Study reminder' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /reminders/schedule'])

    expect(res._status).toBe(400)
  })

  it('should return reminder object when both fields provided', async () => {
    const scheduledFor = new Date(Date.now() + 60000).toISOString()
    const req = mockReq({ body: { text: 'Study reminder', scheduledFor } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /reminders/schedule'])

    expect(res._body.ok).toBe(true)
    expect(res._body.reminder.id).toBeDefined()
    expect(res._body.reminder.text).toBe('Study reminder')
    expect(res._body.reminder.scheduledFor).toBe(scheduledFor)
  })

  it('should schedule a timeout and emit reminder for future reminders', async () => {
    const scheduledFor = new Date(Date.now() + 60000).toISOString()
    const timeoutCallbacks: Array<() => void> = []
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(((callback: (...args: any[]) => void) => {
      timeoutCallbacks.push(() => callback())
      return 1 as any
    }) as typeof setTimeout)

    const req = mockReq({ body: { text: 'Study reminder', scheduledFor, taskId: 'task-1' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /reminders/schedule'])

    expect(res._body.ok).toBe(true)
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1)
    expect(setTimeoutSpy.mock.calls[0][1]).toBeGreaterThan(0)

    timeoutCallbacks[0]?.()

    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(
      undefined,
      {
        type: 'reminder',
        id: res._body.reminder.id,
        text: 'Study reminder',
        taskId: 'task-1',
        scheduledFor,
      }
    )

    setTimeoutSpy.mockRestore()
  })

  it('should not schedule a timeout for past reminders', async () => {
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
    const scheduledFor = new Date(Date.now() - 60000).toISOString()
    const req = mockReq({ body: { text: 'Late reminder', scheduledFor } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /reminders/schedule'])

    expect(res._body.ok).toBe(true)
    expect(setTimeoutSpy).not.toHaveBeenCalled()
    expect(vi.mocked(emitToAll)).not.toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ type: 'reminder', text: 'Late reminder' })
    )

    setTimeoutSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// POST /reminders/test
// ---------------------------------------------------------------------------

describe('POST /reminders/test', () => {
  it('should return ok: true and emit reminder', async () => {
    const req = mockReq()
    const res = mockRes()

    await exec(req, res, app.routes['POST /reminders/test'])

    expect(res._body.ok).toBe(true)
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(undefined, expect.objectContaining({ type: 'reminder', text: 'Test reminder' }))
  })
})

// ---------------------------------------------------------------------------
// POST /planner/parse-homework
// ---------------------------------------------------------------------------

describe('POST /planner/parse-homework', () => {
  it('should return 400 when neither text nor imageText provided', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()

    await exec(req, res, app.routes['POST /planner/parse-homework'])

    expect(res._status).toBe(400)
    expect(res._body.error).toContain('text or imageText required')
  })

  it('should return 400 when content is not a string', async () => {
    const req = mockReq({ body: { text: 123 } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /planner/parse-homework'])

    expect(res._status).toBe(400)
  })

  it('should parse homework from text', async () => {
    const parsed = { tasks: [{ title: 'Math HW', priority: 'high', dueAt: null }] }
    vi.mocked(parseHomework).mockResolvedValue(parsed as any)

    const req = mockReq({ body: { text: 'Math homework due tomorrow' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /planner/parse-homework'])

    expect(res._body.ok).toBe(true)
    expect(res._body.tasks).toBeDefined()
    expect(parseHomework).toHaveBeenCalledWith('Math homework due tomorrow')
  })

  it('should use imageText when text is not provided', async () => {
    vi.mocked(parseHomework).mockResolvedValue({ tasks: [] } as any)

    const req = mockReq({ body: { imageText: 'OCR-extracted homework text' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /planner/parse-homework'])

    expect(parseHomework).toHaveBeenCalledWith('OCR-extracted homework text')
  })

  it('should return 500 on service error', async () => {
    vi.mocked(parseHomework).mockRejectedValue(new Error('LLM error'))

    const req = mockReq({ body: { text: 'Some homework' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /planner/parse-homework'])

    expect(res._status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// POST /tasks/:id/complete
// ---------------------------------------------------------------------------

describe('POST /tasks/:id/complete', () => {
  it('should return 404 when task not found', async () => {
    vi.mocked(plannerService.getTask).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' }, body: {} })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/complete'])

    expect(res._status).toBe(404)
  })

  it('should complete task, emit update, and fall back to estimated minutes when actualMinutes is missing', async () => {
    vi.mocked(plannerService.getTask).mockResolvedValue(sampleTask as any)
    const completedTask = { ...sampleTask, status: 'done' }
    vi.mocked(plannerService.updateTask).mockResolvedValue(completedTask as any)

    const req = mockReq({ params: { id: 'task-1' }, body: {} })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/complete'])

    expect(plannerService.updateTask).toHaveBeenCalledWith(
      'task-1',
      {
        status: 'done',
        actualMins: undefined,
        notes: undefined,
      }
    )
    expect(vi.mocked(cancelTaskNotifications)).toHaveBeenCalledWith('task-1')
    expect(vi.mocked(sendTaskCompletionNotification)).toHaveBeenCalledWith('default', sampleTask.title, sampleTask.estMins)
    expect(vi.mocked(emitToAll)).toHaveBeenCalledWith(
      undefined,
      { type: 'task.completed', task: completedTask }
    )
    expect(res._body).toEqual({ ok: true, task: completedTask })
  })

  it('should complete task and return updated task', async () => {
    vi.mocked(plannerService.getTask).mockResolvedValue(sampleTask as any)
    const completedTask = { ...sampleTask, status: 'done', actualMins: 50 }
    vi.mocked(plannerService.updateTask).mockResolvedValue(completedTask as any)

    const req = mockReq({ params: { id: 'task-1' }, body: { actualMinutes: 50 } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/complete'])

    expect(res._body.ok).toBe(true)
    expect(res._body.task.status).toBe('done')
    expect(vi.mocked(cancelTaskNotifications)).toHaveBeenCalledWith('task-1')
    expect(vi.mocked(sendTaskCompletionNotification)).toHaveBeenCalledWith('default', sampleTask.title, 50)
  })

  it('should include completion notes in update', async () => {
    vi.mocked(plannerService.getTask).mockResolvedValue({ ...sampleTask, notes: 'existing notes' } as any)
    vi.mocked(plannerService.updateTask).mockResolvedValue({ ...sampleTask, status: 'done' } as any)

    const req = mockReq({ params: { id: 'task-1' }, body: { notes: 'Great work done!' } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/complete'])

    expect(plannerService.updateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ notes: expect.stringContaining('Great work done!') })
    )
  })

  it('should return 500 when completing a task fails', async () => {
    vi.mocked(plannerService.getTask).mockResolvedValue(sampleTask as any)
    vi.mocked(plannerService.updateTask).mockRejectedValue(new Error('update failed'))

    const req = mockReq({ params: { id: 'task-1' }, body: { actualMinutes: 50 } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/complete'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'update failed' })
    expect(vi.mocked(cancelTaskNotifications)).not.toHaveBeenCalled()
    expect(vi.mocked(sendTaskCompletionNotification)).not.toHaveBeenCalled()
    expect(vi.mocked(emitToAll)).not.toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ type: 'task.completed' })
    )
  })

  it('should return 404 when task disappears during update', async () => {
    vi.mocked(plannerService.getTask).mockResolvedValue(sampleTask as any)
    vi.mocked(plannerService.updateTask).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'task-1' }, body: { actualMinutes: 50 } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/complete'])

    expect(res._status).toBe(404)
    expect(res._body).toEqual({ ok: false, error: 'Task not found' })
    expect(vi.mocked(cancelTaskNotifications)).not.toHaveBeenCalled()
    expect(vi.mocked(sendTaskCompletionNotification)).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// GET /planner/stats/detailed
// ---------------------------------------------------------------------------

describe('GET /planner/stats/detailed', () => {
  it('should return detailed stats with no tasks', async () => {
    vi.mocked(plannerService.listTasks).mockResolvedValue([])

    const req = mockReq()
    const res = mockRes()

    await exec(req, res, app.routes['GET /planner/stats/detailed'])

    expect(res._body.ok).toBe(true)
    expect(res._body.stats.overall.totalTasks).toBe(0)
    expect(res._body.stats.overall.completionRate).toBe(0)
  })

  it('should calculate completion rate correctly', async () => {
    const tasks = [
      { ...sampleTask, id: 't1', status: 'done', actualMins: 50, estMins: 60 },
      { ...sampleTask, id: 't2', status: 'todo', dueAt: new Date(Date.now() + 100000).toISOString() },
      { ...sampleTask, id: 't3', status: 'done', actualMins: 30, estMins: 45 },
    ]
    vi.mocked(plannerService.listTasks).mockResolvedValue(tasks as any)

    const req = mockReq()
    const res = mockRes()

    await exec(req, res, app.routes['GET /planner/stats/detailed'])

    expect(res._body.stats.overall.completedTasks).toBe(2)
    expect(res._body.stats.overall.totalTasks).toBe(3)
    expect(res._body.stats.overall.completionRate).toBe(67)
  })

  it('should count overdue tasks', async () => {
    const overdue = {
      ...sampleTask,
      id: 'overdue-1',
      status: 'todo',
      dueAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
    }
    vi.mocked(plannerService.listTasks).mockResolvedValue([overdue] as any)

    const req = mockReq()
    const res = mockRes()

    await exec(req, res, app.routes['GET /planner/stats/detailed'])

    expect(res._body.stats.overall.overdueTasks).toBe(1)
    expect(res._body.stats.procrastination.overdueCount).toBe(1)
  })

  it('should return 500 on service error', async () => {
    vi.mocked(plannerService.listTasks).mockRejectedValue(new Error('db fail'))

    const req = mockReq()
    const res = mockRes()

    await exec(req, res, app.routes['GET /planner/stats/detailed'])

    expect(res._status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// GET /notifications
// ---------------------------------------------------------------------------

describe('GET /notifications', () => {
  it('should return user notifications', async () => {
    const { getUserNotifications } = await import('../../../src/services/notifications')
    vi.mocked(getUserNotifications).mockReturnValue([{ id: 'n1', type: 'reminder', userId: 'default' }] as any)

    const req = mockReq()
    const res = mockRes()

    await exec(req, res, app.routes['GET /notifications'])

    expect(res._body.ok).toBe(true)
    expect(Array.isArray(res._body.notifications)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// POST /tasks/:id/reminders
// ---------------------------------------------------------------------------

describe('POST /tasks/:id/reminders', () => {
  it('should return 404 when task not found', async () => {
    vi.mocked(plannerService.getTask).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' }, body: {} })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/reminders'])

    expect(res._status).toBe(404)
  })

  it('should schedule reminders with explicit browser and email settings', async () => {
    vi.mocked(plannerService.getTask).mockResolvedValue(sampleTask as any)
    const notifications = [
      { id: 'notif-1', type: 'email', scheduledTime: Date.now() + 3600000 },
    ]
    vi.mocked(scheduleTaskReminders).mockResolvedValue(notifications as any)
    vi.mocked(plannerService.updateTask).mockResolvedValue(sampleTask as any)

    const req = mockReq({
      params: { id: 'task-1' },
      body: { reminderHoursBefore: [1], includeBrowser: false, includeEmail: true },
    })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/reminders'])

    expect(vi.mocked(scheduleTaskReminders)).toHaveBeenCalledWith(
      'default',
      sampleTask.id,
      sampleTask.title,
      new Date(sampleTask.dueAt).getTime(),
      {
        reminderHoursBefore: [1],
        includeBrowser: false,
        includeEmail: true,
      }
    )
    expect(vi.mocked(plannerService.updateTask)).toHaveBeenCalledWith(
      'task-1',
      {
        reminders: notifications.map((n) => ({
          type: n.type,
          time: n.scheduledTime,
        })),
      }
    )
    expect(res._body).toEqual({ ok: true, reminders: notifications })
  })

  it('should schedule reminders and return them', async () => {
    vi.mocked(plannerService.getTask).mockResolvedValue(sampleTask as any)
    vi.mocked(scheduleTaskReminders).mockResolvedValue([
      { id: 'notif-1', type: 'reminder', scheduledTime: Date.now() + 86400000 } as any,
    ])
    vi.mocked(plannerService.updateTask).mockResolvedValue(sampleTask as any)

    const req = mockReq({ params: { id: 'task-1' }, body: { reminderHoursBefore: [24] } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/reminders'])

    expect(res._body.ok).toBe(true)
    expect(Array.isArray(res._body.reminders)).toBe(true)
  })

  it('should return 500 when scheduling reminders fails', async () => {
    vi.mocked(plannerService.getTask).mockResolvedValue(sampleTask as any)
    vi.mocked(scheduleTaskReminders).mockRejectedValue(new Error('schedule failed'))

    const req = mockReq({ params: { id: 'task-1' }, body: { reminderHoursBefore: [24] } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/reminders'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'schedule failed' })
    expect(plannerService.updateTask).not.toHaveBeenCalled()
  })

  it('should return 500 when persisting scheduled reminders fails', async () => {
    vi.mocked(plannerService.getTask).mockResolvedValue(sampleTask as any)
    vi.mocked(scheduleTaskReminders).mockResolvedValue([
      { id: 'notif-1', type: 'browser', scheduledTime: Date.now() + 86400000 } as any,
    ])
    vi.mocked(plannerService.updateTask).mockRejectedValue(new Error('persist failed'))

    const req = mockReq({ params: { id: 'task-1' }, body: { reminderHoursBefore: [24] } })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/reminders'])

    expect(res._status).toBe(500)
    expect(res._body).toEqual({ ok: false, error: 'persist failed' })
  })

  it('should use default reminder settings when body is empty', async () => {
    vi.mocked(plannerService.getTask).mockResolvedValue(sampleTask as any)
    const notifications = [
      { id: 'notif-1', type: 'browser', scheduledTime: Date.now() + 86400000 },
      { id: 'notif-2', type: 'browser', scheduledTime: Date.now() + 7200000 },
    ]
    vi.mocked(scheduleTaskReminders).mockResolvedValue(notifications as any)
    vi.mocked(plannerService.updateTask).mockResolvedValue(sampleTask as any)

    const req = mockReq({ params: { id: 'task-1' }, body: {} })
    const res = mockRes()

    await exec(req, res, app.routes['POST /tasks/:id/reminders'])

    expect(vi.mocked(scheduleTaskReminders)).toHaveBeenCalledWith(
      'default',
      sampleTask.id,
      sampleTask.title,
      new Date(sampleTask.dueAt).getTime(),
      {
        reminderHoursBefore: [24, 2],
        includeBrowser: true,
        includeEmail: false,
      }
    )
    expect(vi.mocked(plannerService.updateTask)).toHaveBeenCalledWith(
      'task-1',
      {
        reminders: notifications.map((n) => ({
          type: n.type,
          time: n.scheduledTime,
        })),
      }
    )
    expect(res._body).toEqual({ ok: true, reminders: notifications })
  })
})
