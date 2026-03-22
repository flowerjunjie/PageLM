/**
 * PlannerService Unit Tests
 *
 * Tests for the PlannerService class methods.
 * All store, AI, and scheduler dependencies are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks (must be before imports)
// ---------------------------------------------------------------------------

vi.mock('../../../src/services/planner/store', () => ({
  createTask: vi.fn(),
  getTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  listTasks: vi.fn(),
  saveTaskFile: vi.fn(),
  getTaskFiles: vi.fn(),
  deleteTaskFile: vi.fn(),
}))

vi.mock('../../../src/services/planner/ai', () => ({
  parseTask: vi.fn(),
  generateSteps: vi.fn().mockResolvedValue(['Step 1', 'Step 2']),
  makeSlots: vi.fn(),
  replan: vi.fn().mockReturnValue([]),
  calculateUrgencyScore: vi.fn().mockReturnValue(5),
}))

vi.mock('../../../src/services/planner/scheduler', () => ({
  planTask: vi.fn(),
  planTasks: vi.fn().mockReturnValue([]),
  weeklyPlan: vi.fn().mockReturnValue({ slots: [] }),
  defaultPolicy: vi.fn().mockReturnValue({
    pomodoroMins: 25,
    breakMins: 5,
    longBreakMins: 15,
    slotsPerDay: 8,
    workDays: [1, 2, 3, 4, 5],
    startHour: 9,
    endHour: 21,
    preferredSlotSize: 25,
    bufferDays: 1,
  }),
}))

vi.mock('../../../src/lib/ai/ask', () => ({
  handleAsk: vi.fn().mockResolvedValue({ answer: 'AI generated response' }),
}))

vi.mock('crypto', () => ({
  default: { randomUUID: vi.fn(() => 'test-uuid') },
  randomUUID: vi.fn(() => 'test-uuid'),
}))

import {
  createTask,
  getTask,
  updateTask,
  deleteTask,
  listTasks,
  saveTaskFile,
  deleteTaskFile,
} from '../../../src/services/planner/store'
import { parseTask, generateSteps, replan } from '../../../src/services/planner/ai'
import { planTask, planTasks, weeklyPlan } from '../../../src/services/planner/scheduler'
import { PlannerService } from '../../../src/services/planner/service'
import type { Task } from '../../../src/services/planner/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    estMins: 60,
    priority: 3,
    status: 'todo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let service: PlannerService

beforeEach(() => {
  vi.clearAllMocks()
  service = new PlannerService()
})

// ---------------------------------------------------------------------------
// createTaskFromRequest
// ---------------------------------------------------------------------------

describe('PlannerService.createTaskFromRequest', () => {
  it('should create task from plain data (no text)', async () => {
    const task = makeTask()
    vi.mocked(generateSteps).mockResolvedValue(['Step 1'])
    vi.mocked(createTask).mockResolvedValue(task)

    const result = await service.createTaskFromRequest({
      title: 'Test Task',
      dueAt: task.dueAt,
      estMins: 60,
      priority: 3,
    })

    expect(result).toBeDefined()
    expect(createTask).toHaveBeenCalled()
    expect(generateSteps).toHaveBeenCalled()
  })

  it('should use parseTask when text is provided', async () => {
    const parsedData = { title: 'Parsed Task', dueAt: new Date().toISOString(), estMins: 30, priority: 3 as const }
    vi.mocked(parseTask).mockResolvedValue(parsedData as any)
    vi.mocked(generateSteps).mockResolvedValue(['Step 1'])
    vi.mocked(createTask).mockResolvedValue(makeTask())

    await service.createTaskFromRequest({ text: 'Do math homework by Friday' })

    expect(parseTask).toHaveBeenCalledWith('Do math homework by Friday')
  })

  it('should override parsed fields with explicit fields', async () => {
    vi.mocked(parseTask).mockResolvedValue({ title: 'Parsed Title', dueAt: new Date().toISOString(), estMins: 30, priority: 2 as const } as any)
    vi.mocked(generateSteps).mockResolvedValue([])
    vi.mocked(createTask).mockResolvedValue(makeTask({ title: 'Override Title' }))

    await service.createTaskFromRequest({ text: 'Do something', title: 'Override Title' })

    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Override Title' })
    )
  })

  it('should use "Untitled Task" when no title provided', async () => {
    vi.mocked(generateSteps).mockResolvedValue([])
    vi.mocked(createTask).mockResolvedValue(makeTask({ title: 'Untitled Task' }))

    await service.createTaskFromRequest({})

    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Untitled Task' })
    )
  })
})

// ---------------------------------------------------------------------------
// getTask
// ---------------------------------------------------------------------------

describe('PlannerService.getTask', () => {
  it('should return task by id', async () => {
    vi.mocked(getTask).mockResolvedValue(makeTask())

    const result = await service.getTask('task-1')

    expect(result).toBeDefined()
    expect(getTask).toHaveBeenCalledWith('task-1')
  })

  it('should return null when task not found', async () => {
    vi.mocked(getTask).mockResolvedValue(null)

    const result = await service.getTask('nonexistent')

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// updateTask
// ---------------------------------------------------------------------------

describe('PlannerService.updateTask', () => {
  it('should return null when task not found', async () => {
    vi.mocked(getTask).mockResolvedValue(null)

    const result = await service.updateTask('nonexistent', { title: 'New Title' })

    expect(result).toBeNull()
  })

  it('should regenerate steps when title changes', async () => {
    vi.mocked(getTask).mockResolvedValue(makeTask())
    vi.mocked(generateSteps).mockResolvedValue(['New Step 1', 'New Step 2'])
    vi.mocked(updateTask).mockResolvedValue(makeTask({ title: 'New Title' }))

    await service.updateTask('task-1', { title: 'New Title' })

    expect(generateSteps).toHaveBeenCalled()
  })

  it('should not regenerate steps when only status changes', async () => {
    vi.mocked(getTask).mockResolvedValue(makeTask())
    vi.mocked(updateTask).mockResolvedValue(makeTask({ status: 'done' }))

    await service.updateTask('task-1', { status: 'done' })

    expect(generateSteps).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// deleteTask
// ---------------------------------------------------------------------------

describe('PlannerService.deleteTask', () => {
  it('should delete task and return true', async () => {
    vi.mocked(deleteTask).mockResolvedValue(true)

    const result = await service.deleteTask('task-1')

    expect(result).toBe(true)
    expect(deleteTask).toHaveBeenCalledWith('task-1')
  })

  it('should return false when task not found', async () => {
    vi.mocked(deleteTask).mockResolvedValue(false)

    const result = await service.deleteTask('nonexistent')

    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// listTasks
// ---------------------------------------------------------------------------

describe('PlannerService.listTasks', () => {
  it('should return all tasks', async () => {
    vi.mocked(listTasks).mockResolvedValue([makeTask(), makeTask({ id: 'task-2' })])

    const result = await service.listTasks()

    expect(result).toHaveLength(2)
    expect(listTasks).toHaveBeenCalledWith(undefined)
  })

  it('should pass filter to store', async () => {
    vi.mocked(listTasks).mockResolvedValue([])

    await service.listTasks({ status: 'done', course: 'math' })

    expect(listTasks).toHaveBeenCalledWith({ status: 'done', course: 'math' })
  })
})

// ---------------------------------------------------------------------------
// planSingleTask
// ---------------------------------------------------------------------------

describe('PlannerService.planSingleTask', () => {
  it('should return null when task not found', async () => {
    vi.mocked(getTask).mockResolvedValue(null)

    const result = await service.planSingleTask('nonexistent')

    expect(result).toBeNull()
  })

  it('should plan task and update it in store', async () => {
    const task = makeTask()
    const plannedTask = { ...task, plan: { slots: [{ id: 's1', start: new Date().toISOString(), end: new Date().toISOString(), taskId: 'task-1', done: false }] } }
    vi.mocked(getTask).mockResolvedValue(task)
    vi.mocked(planTask).mockReturnValue(plannedTask as any)
    vi.mocked(updateTask).mockResolvedValue(plannedTask as any)

    const result = await service.planSingleTask('task-1')

    expect(planTask).toHaveBeenCalledWith(task, expect.any(Object))
    expect(updateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({ plan: plannedTask.plan }))
    expect(result).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// generateWeeklyPlan
// ---------------------------------------------------------------------------

describe('PlannerService.generateWeeklyPlan', () => {
  it('should return tasks and plan', async () => {
    const tasks = [makeTask(), makeTask({ id: 'task-2' })]
    vi.mocked(listTasks).mockResolvedValue(tasks)
    vi.mocked(planTasks).mockReturnValue(tasks as any)
    vi.mocked(weeklyPlan).mockReturnValue({ slots: [] } as any)
    vi.mocked(updateTask).mockResolvedValue(tasks[0])

    const result = await service.generateWeeklyPlan()

    expect(result).toHaveProperty('tasks')
    expect(result).toHaveProperty('plan')
    expect(listTasks).toHaveBeenCalledWith({ status: 'todo' })
  })
})

// ---------------------------------------------------------------------------
// getTodaySessions
// ---------------------------------------------------------------------------

describe('PlannerService.getTodaySessions', () => {
  it('should return empty when no tasks', async () => {
    vi.mocked(listTasks).mockResolvedValue([])

    const result = await service.getTodaySessions()

    expect(result).toEqual([])
  })

  it('should return tasks with today slots', async () => {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(now.getHours() - 1, 0, 0, 0) // 1 hour ago
    const todayEnd = new Date(todayStart.getTime() + 30 * 60 * 1000) // 30 mins later

    const taskWithTodaySlots = makeTask({
      plan: {
        slots: [
          { id: 's1', start: todayStart.toISOString(), end: todayEnd.toISOString(), taskId: 'task-1', done: false }
        ],
        policy: {} as any
      }
    })

    vi.mocked(listTasks).mockResolvedValue([taskWithTodaySlots])

    const result = await service.getTodaySessions()

    expect(result).toHaveLength(1)
    expect(result[0].task.id).toBe('task-1')
    expect(result[0].slots).toHaveLength(1)
  })

  it('should not include tasks without plan slots', async () => {
    const taskNoSlots = makeTask({ plan: undefined })
    vi.mocked(listTasks).mockResolvedValue([taskNoSlots])

    const result = await service.getTodaySessions()

    expect(result).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// getUpcomingDeadlines
// ---------------------------------------------------------------------------

describe('PlannerService.getUpcomingDeadlines', () => {
  it('should categorize tasks by urgency', async () => {
    const urgentTask = makeTask({ id: 't1', dueAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() }) // 12h
    const atRiskTask = makeTask({ id: 't2', dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() }) // 48h
    const upcomingTask = makeTask({ id: 't3', dueAt: new Date(Date.now() + 120 * 60 * 60 * 1000).toISOString() }) // 5 days
    vi.mocked(listTasks).mockResolvedValue([urgentTask, atRiskTask, upcomingTask])

    const result = await service.getUpcomingDeadlines()

    expect(result.urgent.some(t => t.id === 't1')).toBe(true)
    expect(result.atRisk.some(t => t.id === 't2')).toBe(true)
    expect(result.upcoming.some(t => t.id === 't3')).toBe(true)
  })

  it('should return empty categories when no tasks', async () => {
    vi.mocked(listTasks).mockResolvedValue([])

    const result = await service.getUpcomingDeadlines()

    expect(result.urgent).toHaveLength(0)
    expect(result.atRisk).toHaveLength(0)
    expect(result.upcoming).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// getUserStats
// ---------------------------------------------------------------------------

describe('PlannerService.getUserStats', () => {
  it('should return stats with no tasks', async () => {
    vi.mocked(listTasks).mockResolvedValue([])

    const result = await service.getUserStats()

    expect(result.totalTasks).toBe(0)
    expect(result.completedTasks).toBe(0)
    expect(result.onTimeRatio).toBe(0)
  })

  it('should calculate completion ratio', async () => {
    const completed = makeTask({ id: 't1', status: 'done', updatedAt: new Date(Date.now() - 1000).toISOString() })
    const pending = makeTask({ id: 't2', status: 'todo' })
    vi.mocked(listTasks).mockResolvedValue([completed, pending])

    const result = await service.getUserStats()

    expect(result.totalTasks).toBe(2)
    expect(result.completedTasks).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// updateSlot
// ---------------------------------------------------------------------------

describe('PlannerService.updateSlot', () => {
  it('should return null when task not found', async () => {
    vi.mocked(getTask).mockResolvedValue(null)

    const result = await service.updateSlot('nonexistent', 'slot-1', { done: true })

    expect(result).toBeNull()
  })

  it('should return null when task has no plan', async () => {
    vi.mocked(getTask).mockResolvedValue(makeTask({ plan: undefined }))

    const result = await service.updateSlot('task-1', 'slot-1', { done: true })

    expect(result).toBeNull()
  })

  it('should return null when slot not found', async () => {
    vi.mocked(getTask).mockResolvedValue(makeTask({
      plan: {
        slots: [{ id: 'different-slot', start: new Date().toISOString(), end: new Date().toISOString(), taskId: 'task-1', done: false }],
        policy: {} as any
      }
    }))

    const result = await service.updateSlot('task-1', 'nonexistent-slot', { done: true })

    expect(result).toBeNull()
  })

  it('should mark slot as done', async () => {
    const slot = { id: 'slot-1', start: new Date().toISOString(), end: new Date().toISOString(), taskId: 'task-1', done: false }
    const task = makeTask({ plan: { slots: [slot], policy: {} as any } })
    vi.mocked(getTask).mockResolvedValue(task)
    vi.mocked(updateTask).mockResolvedValue({ ...task, plan: { ...task.plan!, slots: [{ ...slot, done: true }] } })

    const result = await service.updateSlot('task-1', 'slot-1', { done: true })

    expect(updateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({
      plan: expect.objectContaining({
        slots: expect.arrayContaining([expect.objectContaining({ done: true })])
      })
    }))
  })
})

// ---------------------------------------------------------------------------
// removeFileFromTask
// ---------------------------------------------------------------------------

describe('PlannerService.removeFileFromTask', () => {
  it('should return false when task not found', async () => {
    vi.mocked(getTask).mockResolvedValue(null)

    const result = await service.removeFileFromTask('nonexistent', 'file-1')

    expect(result).toBe(false)
  })

  it('should delete file and return true', async () => {
    vi.mocked(getTask).mockResolvedValue(makeTask())
    vi.mocked(deleteTaskFile).mockResolvedValue(undefined)

    const result = await service.removeFileFromTask('task-1', 'file-1')

    expect(result).toBe(true)
    expect(deleteTaskFile).toHaveBeenCalledWith('file-1')
  })
})

// ---------------------------------------------------------------------------
// generateMaterials
// ---------------------------------------------------------------------------

describe('PlannerService.generateMaterials', () => {
  it('should throw when task not found', async () => {
    vi.mocked(getTask).mockResolvedValue(null)

    await expect(service.generateMaterials('nonexistent', { type: 'summary' })).rejects.toThrow('Task not found')
  })

  it('should generate summary material', async () => {
    const { handleAsk } = await import('../../../src/lib/ai/ask')
    vi.mocked(getTask).mockResolvedValue(makeTask())
    vi.mocked(handleAsk).mockResolvedValue({ answer: 'Generated summary' } as any)

    const result = await service.generateMaterials('task-1', { type: 'summary' })

    expect(result).toBe('Generated summary')
    expect(handleAsk).toHaveBeenCalled()
  })

  it('should generate flashcards material', async () => {
    const { handleAsk } = await import('../../../src/lib/ai/ask')
    vi.mocked(getTask).mockResolvedValue(makeTask())
    vi.mocked(handleAsk).mockResolvedValue({
      answer: JSON.stringify([{ front: 'Q', back: 'A' }])
    } as any)

    const result = await service.generateMaterials('task-1', { type: 'flashcards' })

    expect(Array.isArray(result)).toBe(true)
    expect(result[0].front).toBe('Q')
  })

  it('should return default flashcard when JSON parse fails', async () => {
    const { handleAsk } = await import('../../../src/lib/ai/ask')
    vi.mocked(getTask).mockResolvedValue(makeTask())
    vi.mocked(handleAsk).mockResolvedValue({ answer: 'invalid json' } as any)

    const result = await service.generateMaterials('task-1', { type: 'flashcards' })

    expect(Array.isArray(result)).toBe(true)
    expect(result[0].front).toContain('Key concept')
  })

  it('should generate quiz material', async () => {
    const { handleAsk } = await import('../../../src/lib/ai/ask')
    vi.mocked(getTask).mockResolvedValue(makeTask())
    vi.mocked(handleAsk).mockResolvedValue({ answer: 'Generated quiz content' } as any)

    const result = await service.generateMaterials('task-1', { type: 'quiz' })

    expect(result).toBe('Generated quiz content')
  })

  it('should throw on invalid material type', async () => {
    vi.mocked(getTask).mockResolvedValue(makeTask())

    await expect(service.generateMaterials('task-1', { type: 'invalid' as any })).rejects.toThrow('Invalid material type')
  })
})
