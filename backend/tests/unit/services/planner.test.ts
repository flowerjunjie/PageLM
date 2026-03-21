import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fixtures } from '../../helpers/setup'

// Mock database before importing modules
const mockDb = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}

vi.mock('../../../src/utils/database/keyv', () => ({
  default: mockDb,
}))

// Mock crypto - needs both default and named export for Node ESM compatibility
vi.mock('crypto', () => ({
  default: {
    randomUUID: vi.fn(() => 'test-uuid-123'),
  },
  randomUUID: vi.fn(() => 'test-uuid-123'),
}))

// Mock fs - use importOriginal to keep all functions available except statSync
const mockStatSync = vi.fn()
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    default: { ...actual, statSync: mockStatSync },
    statSync: mockStatSync,
  }
})

// Mock AI functions
const mockParseTask = vi.fn()
const mockGenerateSteps = vi.fn()
const mockMakeSlots = vi.fn()
const mockReplan = vi.fn()
const mockCalculateUrgencyScore = vi.fn()

vi.mock('../../../src/services/planner/ai', () => ({
  parseTask: mockParseTask,
  generateSteps: mockGenerateSteps,
  makeSlots: mockMakeSlots,
  replan: mockReplan,
  calculateUrgencyScore: mockCalculateUrgencyScore,
}))

// Mock scheduler
const mockPlanTask = vi.fn()
const mockPlanTasks = vi.fn()
const mockWeeklyPlan = vi.fn()
const mockDefaultPolicy = vi.fn()

vi.mock('../../../src/services/planner/scheduler', () => ({
  planTask: mockPlanTask,
  planTasks: mockPlanTasks,
  weeklyPlan: mockWeeklyPlan,
  defaultPolicy: mockDefaultPolicy,
}))

// Mock handleAsk
const mockHandleAsk = vi.fn()
vi.mock('../../../src/lib/ai/ask', () => ({
  handleAsk: mockHandleAsk,
}))

// Import after mocking
const { PlannerService, plannerService } = await import('../../../src/services/planner/service')

describe('PlannerService', () => {
  let service: typeof PlannerService.prototype

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))

    mockDefaultPolicy.mockReturnValue({ pomodoroMins: 25, breakMins: 5, maxDailyMins: 240 })
    service = new PlannerService()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('should use default policy when none provided', () => {
      // Arrange & Act
      const svc = new PlannerService()

      // Assert
      expect(mockDefaultPolicy).toHaveBeenCalled()
    })

    it('should use provided policy', () => {
      // Arrange
      const customPolicy = { pomodoroMins: 30, breakMins: 10, maxDailyMins: 300 }
      // Reset call count after beforeEach already called PlannerService()
      mockDefaultPolicy.mockClear()

      // Act
      const svc = new PlannerService(customPolicy)

      // Assert: creating with explicit policy should NOT call defaultPolicy again
      expect(mockDefaultPolicy).not.toHaveBeenCalled()
    })
  })

  describe('createTaskFromRequest', () => {
    it('should create task from text input', async () => {
      // Arrange
      const parsedTask = {
        title: 'Math Homework',
        course: 'Math',
        type: 'homework',
        dueAt: '2025-01-20T23:59:00Z',
        estMins: 120,
        priority: 3,
      }
      mockParseTask.mockResolvedValue(parsedTask)
      mockGenerateSteps.mockResolvedValue(['Step 1', 'Step 2'])
      mockDb.get.mockResolvedValue([])
      mockDb.set.mockResolvedValue(undefined)

      const request = {
        text: 'Math HW due Friday ~2h',
      }

      // Act
      const result = await service.createTaskFromRequest(request)

      // Assert
      expect(result).toHaveProperty('id', 'test-uuid-123')
      expect(result.title).toBe('Math Homework')
      expect(result.steps).toEqual(['Step 1', 'Step 2'])
      expect(mockParseTask).toHaveBeenCalledWith(request.text)
    })

    it('should create task from explicit fields', async () => {
      // Arrange
      mockGenerateSteps.mockResolvedValue(['Step 1', 'Step 2'])
      mockDb.get.mockResolvedValue([])
      mockDb.set.mockResolvedValue(undefined)

      const request = {
        title: 'Science Project',
        course: 'Science',
        type: 'project',
        notes: 'Build a volcano',
        dueAt: '2025-01-25T23:59:00Z',
        estMins: 180,
        priority: 4,
      }

      // Act
      const result = await service.createTaskFromRequest(request)

      // Assert
      expect(result.title).toBe('Science Project')
      expect(result.course).toBe('Science')
      expect(result.type).toBe('project')
      expect(result.estMins).toBe(180)
      expect(result.priority).toBe(4)
    })

    it('should use default values when fields not provided', async () => {
      // Arrange
      mockGenerateSteps.mockResolvedValue([])
      mockDb.get.mockResolvedValue([])
      mockDb.set.mockResolvedValue(undefined)

      const request = {}

      // Act
      const result = await service.createTaskFromRequest(request)

      // Assert
      expect(result.title).toBe('Untitled Task')
      expect(result.estMins).toBe(60)
      expect(result.priority).toBe(3)
      expect(result.status).toBe('todo')
    })

    it('should override parsed values with explicit fields', async () => {
      // Arrange
      const parsedTask = {
        title: 'Parsed Title',
        course: 'Parsed Course',
        priority: 2,
      }
      mockParseTask.mockResolvedValue(parsedTask)
      mockGenerateSteps.mockResolvedValue([])
      mockDb.get.mockResolvedValue([])
      mockDb.set.mockResolvedValue(undefined)

      const request = {
        text: 'Some text',
        title: 'Explicit Title',
        priority: 5,
      }

      // Act
      const result = await service.createTaskFromRequest(request)

      // Assert
      expect(result.title).toBe('Explicit Title')
      expect(result.priority).toBe(5)
      expect(result.course).toBe('Parsed Course')
    })

    it('should handle file attachments without files field', async () => {
      // Arrange - test creating a task without files (simpler variant)
      mockParseTask.mockResolvedValue({ title: 'Task without attachments' })
      mockGenerateSteps.mockResolvedValue(['Step 1'])
      mockDb.get.mockResolvedValue([])
      mockDb.set.mockResolvedValue(undefined)

      const request = {
        text: 'Task description without files',
      }

      // Act
      const result = await service.createTaskFromRequest(request)

      // Assert
      expect(result).toHaveProperty('id')
      expect(result.title).toBe('Task without attachments')
    })
  })

  describe('getTask', () => {
    it('should return task when found', async () => {
      // Arrange
      const task = {
        id: 'task-123',
        title: 'Test Task',
        status: 'todo',
        dueAt: '2025-01-20T23:59:00Z',
        estMins: 60,
        priority: 3,
        createdAt: '2025-01-15T12:00:00Z',
        updatedAt: '2025-01-15T12:00:00Z',
        files: [],
      }
      // getTask calls db.get for the task, then getTaskFiles calls db.get for FILES_LIST_KEY
      mockDb.get
        .mockResolvedValueOnce(task) // planner:task:task-123
        .mockResolvedValueOnce([])   // planner:task_files (FILES_LIST_KEY)

      // Act
      const result = await service.getTask('task-123')

      // Assert
      expect(result).toMatchObject({ id: 'task-123', title: 'Test Task' })
    })

    it('should return null when task not found', async () => {
      // Arrange
      mockDb.get.mockResolvedValueOnce(null)

      // Act
      const result = await service.getTask('non-existent')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('updateTask', () => {
    it('should update task fields', async () => {
      // Arrange
      const existingTask = {
        id: 'task-123',
        title: 'Old Title',
        type: 'homework',
        status: 'todo',
        dueAt: '2025-01-20T23:59:00Z',
        estMins: 60,
        priority: 3,
        createdAt: '2025-01-15T12:00:00Z',
        updatedAt: '2025-01-15T12:00:00Z',
        steps: ['Old Step'],
      }
      // updateTask -> getTask -> db.get(planner:task:id) + db.get(FILES_LIST_KEY)
      mockDb.get
        .mockResolvedValueOnce(existingTask) // planner:task:task-123
        .mockResolvedValueOnce([])           // planner:task_files
      mockDb.set.mockResolvedValue(undefined)
      mockGenerateSteps.mockResolvedValue(['New Step 1', 'New Step 2'])

      // Act
      const result = await service.updateTask('task-123', { title: 'New Title' })

      // Assert
      expect(result?.title).toBe('New Title')
      expect(mockDb.set).toHaveBeenCalled()
    })

    it('should regenerate steps when title changes', async () => {
      // Arrange
      const existingTask = {
        id: 'task-123',
        title: 'Old Title',
        type: 'homework',
        status: 'todo',
        dueAt: '2025-01-20T23:59:00Z',
        estMins: 60,
        priority: 3,
        createdAt: '2025-01-15T12:00:00Z',
        updatedAt: '2025-01-15T12:00:00Z',
        steps: ['Old Step'],
      }
      // updateTask -> getTask -> db.get(planner:task:id) + db.get(FILES_LIST_KEY)
      mockDb.get
        .mockResolvedValueOnce(existingTask) // planner:task:task-123
        .mockResolvedValueOnce([])           // planner:task_files
      mockDb.set.mockResolvedValue(undefined)
      mockGenerateSteps.mockResolvedValue(['New Step 1', 'New Step 2'])

      // Act
      await service.updateTask('task-123', { title: 'New Title' })

      // Assert
      expect(mockGenerateSteps).toHaveBeenCalled()
    })

    it('should return null when task not found', async () => {
      // Arrange
      mockDb.get.mockResolvedValueOnce(null)

      // Act
      const result = await service.updateTask('non-existent', { title: 'New' })

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('deleteTask', () => {
    it('should delete task and return true', async () => {
      // Arrange
      mockDb.get.mockResolvedValue([{ id: 'task-123' }])
      mockDb.set.mockResolvedValue(undefined)
      mockDb.delete.mockResolvedValue(undefined)

      // Act
      const result = await service.deleteTask('task-123')

      // Assert
      expect(result).toBe(true)
      expect(mockDb.delete).toHaveBeenCalledWith('planner:task:task-123')
    })
  })

  describe('listTasks', () => {
    it('should return all tasks without filter', async () => {
      // Arrange
      const tasks = [
        { id: 'task-1' },
        { id: 'task-2' },
      ]
      mockDb.get.mockResolvedValue(tasks)
      mockDb.get
        .mockResolvedValueOnce(tasks)
        .mockResolvedValueOnce({ id: 'task-1', status: 'todo', dueAt: '2025-01-20T23:59:00Z', files: [] })
        .mockResolvedValueOnce({ id: 'task-2', status: 'done', dueAt: '2025-01-18T23:59:00Z', files: [] })

      // Act
      const result = await service.listTasks()

      // Assert
      expect(result).toHaveLength(2)
    })

    it('should filter by status', async () => {
      // Arrange
      const tasks = [{ id: 'task-1' }, { id: 'task-2' }]
      mockDb.get.mockResolvedValue(tasks)
      mockDb.get
        .mockResolvedValueOnce(tasks)
        .mockResolvedValueOnce({ id: 'task-1', status: 'todo', dueAt: '2025-01-20T23:59:00Z', files: [] })
        .mockResolvedValueOnce({ id: 'task-2', status: 'done', dueAt: '2025-01-18T23:59:00Z', files: [] })

      // Act
      const result = await service.listTasks({ status: 'todo' })

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('task-1')
    })

    it('should filter by due date', async () => {
      // Arrange
      const tasks = [{ id: 'task-1' }, { id: 'task-2' }]
      mockDb.get.mockResolvedValue(tasks)
      mockDb.get
        .mockResolvedValueOnce(tasks)
        .mockResolvedValueOnce({ id: 'task-1', status: 'todo', dueAt: '2025-01-10T23:59:00Z', files: [] })
        .mockResolvedValueOnce({ id: 'task-2', status: 'todo', dueAt: '2025-01-25T23:59:00Z', files: [] })

      // Act
      const result = await service.listTasks({ dueBefore: '2025-01-15T00:00:00Z' })

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('task-1')
    })

    it('should filter by course', async () => {
      // Arrange
      const tasks = [{ id: 'task-1' }, { id: 'task-2' }]
      mockDb.get.mockResolvedValue(tasks)
      mockDb.get
        .mockResolvedValueOnce(tasks)
        .mockResolvedValueOnce({ id: 'task-1', status: 'todo', course: 'Math', dueAt: '2025-01-20T23:59:00Z', files: [] })
        .mockResolvedValueOnce({ id: 'task-2', status: 'todo', course: 'Science', dueAt: '2025-01-20T23:59:00Z', files: [] })

      // Act
      const result = await service.listTasks({ course: 'Math' })

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].course).toBe('Math')
    })

    it('should sort tasks by due date', async () => {
      // Arrange
      const tasks = [{ id: 'task-1' }, { id: 'task-2' }]
      mockDb.get.mockResolvedValue(tasks)
      mockDb.get
        .mockResolvedValueOnce(tasks)
        .mockResolvedValueOnce({ id: 'task-1', status: 'todo', dueAt: '2025-01-25T23:59:00Z', files: [] })
        .mockResolvedValueOnce({ id: 'task-2', status: 'todo', dueAt: '2025-01-18T23:59:00Z', files: [] })

      // Act
      const result = await service.listTasks()

      // Assert
      expect(result[0].id).toBe('task-2') // Earlier due date first
      expect(result[1].id).toBe('task-1')
    })
  })

  describe('planSingleTask', () => {
    it('should create plan for task', async () => {
      // Arrange
      const task = {
        id: 'task-123',
        title: 'Test Task',
        status: 'todo',
        dueAt: '2025-01-20T23:59:00Z',
        estMins: 60,
        priority: 3,
        createdAt: '2025-01-15T12:00:00Z',
        updatedAt: '2025-01-15T12:00:00Z',
      }
      const plannedTask = {
        ...task,
        plan: {
          slots: [{ id: 'slot-1', taskId: 'task-123', start: '2025-01-16T08:00:00Z', end: '2025-01-16T08:25:00Z', kind: 'focus' }],
          policy: { pomodoroMins: 25, breakMins: 5 },
          lastPlannedAt: '2025-01-15T12:00:00Z',
        },
      }
      // planSingleTask -> getTask (2 db.get) -> updateTask -> getTask (2 db.get)
      mockDb.get
        .mockResolvedValueOnce(task)  // getTask: planner:task:task-123
        .mockResolvedValueOnce([])    // getTask: FILES_LIST_KEY
        .mockResolvedValueOnce(plannedTask) // updateTask -> getTask: planner:task:task-123
        .mockResolvedValueOnce([])    // updateTask -> getTask: FILES_LIST_KEY
      mockPlanTask.mockReturnValue(plannedTask)
      mockDb.set.mockResolvedValue(undefined)

      // Act
      const result = await service.planSingleTask('task-123')

      // Assert
      expect(result).toHaveProperty('plan')
      expect(result?.plan?.slots).toHaveLength(1)
    })

    it('should return null when task not found', async () => {
      // Arrange
      mockDb.get.mockResolvedValueOnce(null)

      // Act
      const result = await service.planSingleTask('non-existent')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('generateWeeklyPlan', () => {
    it('should generate plan for all todo tasks', async () => {
      // Arrange
      const tasks = [
        { id: 'task-1', status: 'todo', dueAt: '2025-01-20T23:59:00Z' },
        { id: 'task-2', status: 'todo', dueAt: '2025-01-22T23:59:00Z' },
      ]
      mockDb.get.mockResolvedValue(tasks.map(t => ({ id: t.id })))
      mockDb.get
        .mockResolvedValueOnce(tasks.map(t => ({ id: t.id })))
        .mockResolvedValueOnce(tasks[0])
        .mockResolvedValueOnce(tasks[1])
      mockPlanTasks.mockReturnValue(tasks)
      mockWeeklyPlan.mockReturnValue({ days: [] })
      mockDb.set.mockResolvedValue(undefined)

      // Act
      const result = await service.generateWeeklyPlan()

      // Assert
      expect(result).toHaveProperty('tasks')
      expect(result).toHaveProperty('plan')
      expect(mockPlanTasks).toHaveBeenCalled()
    })

    it('should apply custom policy when provided', async () => {
      // Arrange
      const customPolicy = { maxDailyMins: 300 }
      mockDb.get.mockResolvedValue([])
      mockPlanTasks.mockReturnValue([])
      mockWeeklyPlan.mockReturnValue({ days: [] })

      // Act
      await service.generateWeeklyPlan({ policy: customPolicy })

      // Assert
      expect(mockPlanTasks).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ maxDailyMins: 300 })
      )
    })
  })

  describe('getTodaySessions', () => {
    it('should return sessions scheduled for today', async () => {
      // Arrange
      const today = new Date('2025-01-15T12:00:00Z')
      const tomorrow = new Date('2025-01-16T12:00:00Z')

      const tasks = [
        {
          id: 'task-1',
          status: 'todo',
          plan: {
            slots: [
              { id: 'slot-1', taskId: 'task-1', start: today.toISOString(), end: new Date(today.getTime() + 25 * 60000).toISOString(), kind: 'focus' },
            ],
          },
        },
        {
          id: 'task-2',
          status: 'todo',
          plan: {
            slots: [
              { id: 'slot-2', taskId: 'task-2', start: tomorrow.toISOString(), end: new Date(tomorrow.getTime() + 25 * 60000).toISOString(), kind: 'focus' },
            ],
          },
        },
      ]
      mockDb.get.mockResolvedValue([{ id: 'task-1' }, { id: 'task-2' }])
      mockDb.get
        .mockResolvedValueOnce([{ id: 'task-1' }, { id: 'task-2' }])
        .mockResolvedValueOnce(tasks[0])
        .mockResolvedValueOnce(tasks[1])

      // Act
      const result = await service.getTodaySessions()

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].task.id).toBe('task-1')
    })

    it('should sort sessions by start time', async () => {
      // Arrange
      const baseTime = new Date('2025-01-15T12:00:00Z')

      const tasks = [
        {
          id: 'task-1',
          status: 'todo',
          plan: {
            slots: [
              { id: 'slot-1', taskId: 'task-1', start: new Date(baseTime.getTime() + 2 * 3600000).toISOString(), end: new Date(baseTime.getTime() + 2.5 * 3600000).toISOString(), kind: 'focus' },
            ],
          },
        },
        {
          id: 'task-2',
          status: 'todo',
          plan: {
            slots: [
              { id: 'slot-2', taskId: 'task-2', start: new Date(baseTime.getTime() + 1 * 3600000).toISOString(), end: new Date(baseTime.getTime() + 1.5 * 3600000).toISOString(), kind: 'focus' },
            ],
          },
        },
      ]
      mockDb.get.mockResolvedValue([{ id: 'task-1' }, { id: 'task-2' }])
      mockDb.get
        .mockResolvedValueOnce([{ id: 'task-1' }, { id: 'task-2' }])
        .mockResolvedValueOnce(tasks[0])
        .mockResolvedValueOnce(tasks[1])

      // Act
      const result = await service.getTodaySessions()

      // Assert
      expect(result[0].task.id).toBe('task-2') // Earlier slot first
      expect(result[1].task.id).toBe('task-1')
    })
  })

  describe('getUpcomingDeadlines', () => {
    it('should categorize tasks by urgency', async () => {
      // Arrange
      const now = new Date('2025-01-15T12:00:00Z')
      const tasks = [
        { id: 'urgent', status: 'todo', dueAt: new Date(now.getTime() + 12 * 3600000).toISOString(), plan: { slots: [] } }, // < 24h
        { id: 'atrisk', status: 'todo', dueAt: new Date(now.getTime() + 48 * 3600000).toISOString(), plan: { slots: [] } }, // < 72h, no scheduled work
        { id: 'upcoming', status: 'todo', dueAt: new Date(now.getTime() + 120 * 3600000).toISOString(), plan: { slots: [] } }, // < 168h
        { id: 'normal', status: 'todo', dueAt: new Date(now.getTime() + 240 * 3600000).toISOString(), plan: { slots: [] } }, // > 168h
      ]
      mockDb.get.mockResolvedValue(tasks.map(t => ({ id: t.id })))
      mockDb.get
        .mockResolvedValueOnce(tasks.map(t => ({ id: t.id })))
        .mockResolvedValueOnce(tasks[0])
        .mockResolvedValueOnce(tasks[1])
        .mockResolvedValueOnce(tasks[2])
        .mockResolvedValueOnce(tasks[3])

      // Act
      const result = await service.getUpcomingDeadlines()

      // Assert
      expect(result.urgent).toHaveLength(1)
      expect(result.urgent[0].id).toBe('urgent')
      expect(result.atRisk).toHaveLength(1)
      expect(result.atRisk[0].id).toBe('atrisk')
      expect(result.upcoming).toHaveLength(1)
      expect(result.upcoming[0].id).toBe('upcoming')
    })
  })

  describe('getUserStats', () => {
    it('should calculate user statistics', async () => {
      // Arrange
      const tasks = [
        { id: 'task-1', status: 'done', updatedAt: '2025-01-14T12:00:00Z', dueAt: '2025-01-15T12:00:00Z', plan: { slots: [{ done: true }, { done: true }] }, metrics: { minutesSpent: 50 }, estMins: 60 },
        { id: 'task-2', status: 'done', updatedAt: '2025-01-16T12:00:00Z', dueAt: '2025-01-15T12:00:00Z', plan: { slots: [{ done: true }] }, metrics: { minutesSpent: 30 }, estMins: 30 },
        { id: 'task-3', status: 'todo', plan: { slots: [{ done: false }, { done: false }] } },
      ]
      mockDb.get.mockResolvedValue(tasks.map(t => ({ id: t.id })))
      mockDb.get
        .mockResolvedValueOnce(tasks.map(t => ({ id: t.id })))
        .mockResolvedValueOnce(tasks[0])
        .mockResolvedValueOnce(tasks[1])
        .mockResolvedValueOnce(tasks[2])

      // Act
      const result = await service.getUserStats()

      // Assert
      expect(result.totalTasks).toBe(3)
      expect(result.completedTasks).toBe(2)
      expect(result).toHaveProperty('totalPlannedMinutes')
      expect(result).toHaveProperty('completedMinutes')
      expect(result).toHaveProperty('onTimeRatio')
      expect(result).toHaveProperty('averageEstimateAccuracy')
    })
  })

  describe('Error handling', () => {
    it('should handle database errors in createTaskFromRequest', async () => {
      // Arrange
      mockParseTask.mockResolvedValue({ title: 'Test' })
      mockGenerateSteps.mockResolvedValue([])
      mockDb.get.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(service.createTaskFromRequest({ text: 'Test' })).rejects.toThrow('Database error')
    })

    it('should handle database errors in getTask', async () => {
      // Arrange
      mockDb.get.mockRejectedValue(new Error('Read failed'))

      // Act & Assert
      await expect(service.getTask('task-123')).rejects.toThrow('Read failed')
    })

    it('should handle database errors in listTasks', async () => {
      // Arrange
      mockDb.get.mockRejectedValue(new Error('List failed'))

      // Act & Assert
      await expect(service.listTasks()).rejects.toThrow('List failed')
    })
  })
})
