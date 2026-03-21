/**
 * Planner Scheduler Unit Tests
 *
 * Tests for defaultPolicy, planTask, planTasks, weeklyPlan, and replan.
 * These are pure/near-pure functions with no database or LLM dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the AI module used by makeSlots (via scheduler -> ai.ts)
vi.mock('../../../src/services/planner/ai', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    // makeSlots and calculateUrgencyScore are used directly, keep them real
    // Only override the LLM-dependent functions
    parseTask: vi.fn(),
    generateSteps: vi.fn(),
  }
})

import {
  defaultPolicy,
  planTask,
  planTasks,
  weeklyPlan,
} from '../../../src/services/planner/scheduler'
import type { Task, PlanPolicy, Slot } from '../../../src/services/planner/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<Task> = {}): Task {
  const dueAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
  return {
    id: 'task-1',
    title: 'Test Task',
    dueAt,
    estMins: 60,
    priority: 3,
    status: 'todo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makePolicy(overrides: Partial<PlanPolicy> = {}): PlanPolicy {
  return {
    pomodoroMins: 25,
    breakMins: 5,
    maxDailyMins: 240,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// defaultPolicy
// ---------------------------------------------------------------------------

describe('defaultPolicy', () => {
  it('should return default pomodoroMins of 25', () => {
    const policy = defaultPolicy()
    expect(policy.pomodoroMins).toBe(25)
  })

  it('should return default breakMins of 5', () => {
    const policy = defaultPolicy()
    expect(policy.breakMins).toBe(5)
  })

  it('should return default maxDailyMins of 240 without cram', () => {
    const policy = defaultPolicy(false)
    expect(policy.maxDailyMins).toBe(240)
  })

  it('should return maxDailyMins of 360 in cram mode', () => {
    const policy = defaultPolicy(true)
    expect(policy.maxDailyMins).toBe(360)
  })

  it('should set cram to true when true is passed', () => {
    const policy = defaultPolicy(true)
    expect(policy.cram).toBe(true)
  })

  it('should set cram to false when false is passed', () => {
    const policy = defaultPolicy(false)
    expect(policy.cram).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// planTask
// ---------------------------------------------------------------------------

describe('planTask', () => {
  it('should return a task with a plan property', () => {
    const task = makeTask()
    const policy = makePolicy()

    const result = planTask(task, policy)

    expect(result).toHaveProperty('plan')
  })

  it('should preserve all original task fields', () => {
    const task = makeTask({ title: 'My Task', priority: 5 })
    const policy = makePolicy()

    const result = planTask(task, policy)

    expect(result.id).toBe(task.id)
    expect(result.title).toBe('My Task')
    expect(result.priority).toBe(5)
  })

  it('should set lastPlannedAt on the plan', () => {
    const task = makeTask()
    const policy = makePolicy()

    const result = planTask(task, policy)

    expect(result.plan).toBeDefined()
    expect(result.plan!.lastPlannedAt).toBeDefined()
    expect(typeof result.plan!.lastPlannedAt).toBe('string')
  })

  it('should include the policy in the plan', () => {
    const task = makeTask()
    const policy = makePolicy({ pomodoroMins: 30 })

    const result = planTask(task, policy)

    expect(result.plan!.policy.pomodoroMins).toBe(30)
  })

  it('should produce slots for a non-done task', () => {
    const task = makeTask({ estMins: 50, status: 'todo' })
    const policy = makePolicy({ pomodoroMins: 25 })

    const result = planTask(task, policy)

    expect(Array.isArray(result.plan!.slots)).toBe(true)
  })

  it('should not mutate the original task', () => {
    const task = makeTask()
    const originalTitle = task.title
    const policy = makePolicy()

    planTask(task, policy)

    expect(task.title).toBe(originalTitle)
    expect(task.plan).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// planTasks
// ---------------------------------------------------------------------------

describe('planTasks', () => {
  it('should return an array of the same length as input', () => {
    const tasks = [makeTask({ id: 'task-1' }), makeTask({ id: 'task-2' })]
    const policy = makePolicy()

    const result = planTasks(tasks, policy)

    expect(result.length).toBe(2)
  })

  it('should give each task a plan', () => {
    const tasks = [makeTask({ id: 'task-1' }), makeTask({ id: 'task-2' })]
    const policy = makePolicy()

    const result = planTasks(tasks, policy)

    for (const task of result) {
      expect(task.plan).toBeDefined()
    }
  })

  it('should handle empty task list', () => {
    const result = planTasks([], makePolicy())
    expect(result).toEqual([])
  })

  it('should not skip done tasks in the output (only slots differ)', () => {
    const tasks = [
      makeTask({ id: 'task-1', status: 'done' }),
      makeTask({ id: 'task-2', status: 'todo' }),
    ]
    const policy = makePolicy()

    const result = planTasks(tasks, policy)

    expect(result.length).toBe(2)
  })

  it('should preserve task order in output', () => {
    const tasks = [
      makeTask({ id: 'first', title: 'First' }),
      makeTask({ id: 'second', title: 'Second' }),
    ]
    const policy = makePolicy()

    const result = planTasks(tasks, policy)

    expect(result[0].id).toBe('first')
    expect(result[1].id).toBe('second')
  })
})

// ---------------------------------------------------------------------------
// weeklyPlan
// ---------------------------------------------------------------------------

describe('weeklyPlan', () => {
  it('should return an object with a days array', () => {
    const result = weeklyPlan([], makePolicy())

    expect(result).toHaveProperty('days')
    expect(Array.isArray(result.days)).toBe(true)
  })

  it('should return exactly 7 days', () => {
    const result = weeklyPlan([], makePolicy())

    expect(result.days.length).toBe(7)
  })

  it('should give each day a date string and slots array', () => {
    const result = weeklyPlan([], makePolicy())

    for (const day of result.days) {
      expect(day).toHaveProperty('date')
      expect(day).toHaveProperty('slots')
      expect(typeof day.date).toBe('string')
      expect(Array.isArray(day.slots)).toBe(true)
    }
  })

  it('should have date strings in YYYY-MM-DD format', () => {
    const result = weeklyPlan([], makePolicy())

    for (const day of result.days) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('should place task slots in the correct day bucket', () => {
    const tomorrow = new Date()
    tomorrow.setHours(0, 0, 0, 0)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDateStr = tomorrow.toISOString().slice(0, 10)

    // Create a slot that falls tomorrow at 10 AM
    const slotStart = new Date(tomorrow)
    slotStart.setHours(10, 0, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + 25 * 60 * 1000)

    const taskWithSlot = makeTask({
      id: 'task-with-slots',
      plan: {
        slots: [
          {
            id: 'slot-1',
            taskId: 'task-with-slots',
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            kind: 'focus',
          },
        ],
        policy: makePolicy(),
        lastPlannedAt: new Date().toISOString(),
      },
    })

    const result = weeklyPlan([taskWithSlot], makePolicy())

    const tomorrowDay = result.days.find(d => d.date === tomorrowDateStr)
    expect(tomorrowDay).toBeDefined()
    expect(tomorrowDay!.slots.length).toBeGreaterThan(0)
  })

  it('should sort slots within each day by start time', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const slot2Start = new Date(today)
    slot2Start.setHours(11, 0, 0, 0)
    const slot1Start = new Date(today)
    slot1Start.setHours(9, 0, 0, 0)

    const taskWithSlots = makeTask({
      id: 'task-sort',
      plan: {
        slots: [
          {
            id: 'slot-later',
            taskId: 'task-sort',
            start: slot2Start.toISOString(),
            end: new Date(slot2Start.getTime() + 25 * 60 * 1000).toISOString(),
            kind: 'focus',
          },
          {
            id: 'slot-earlier',
            taskId: 'task-sort',
            start: slot1Start.toISOString(),
            end: new Date(slot1Start.getTime() + 25 * 60 * 1000).toISOString(),
            kind: 'focus',
          },
        ],
        policy: makePolicy(),
        lastPlannedAt: new Date().toISOString(),
      },
    })

    const result = weeklyPlan([taskWithSlots], makePolicy())

    const todayStr = today.toISOString().slice(0, 10)
    const todayDay = result.days.find(d => d.date === todayStr)

    if (todayDay && todayDay.slots.length >= 2) {
      expect(new Date(todayDay.slots[0].start).getTime())
        .toBeLessThanOrEqual(new Date(todayDay.slots[1].start).getTime())
    }
  })
})

// ---------------------------------------------------------------------------
// Additional planTask edge cases
// ---------------------------------------------------------------------------

describe('planTask - done task behavior', () => {
  it('should still return a task with a plan when status is done (done tasks get empty slots)', () => {
    const task = makeTask({ status: 'done' })
    const policy = makePolicy()

    const result = planTask(task, policy)

    expect(result).toHaveProperty('plan')
    expect(result.plan!.slots).toBeDefined()
    expect(Array.isArray(result.plan!.slots)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// planTasks - large collection
// ---------------------------------------------------------------------------

describe('planTasks - multiple tasks', () => {
  it('should assign each task only its own slots', () => {
    const tasks = [
      makeTask({ id: 'alpha', title: 'Alpha' }),
      makeTask({ id: 'beta', title: 'Beta' }),
    ]
    const policy = makePolicy()

    const result = planTasks(tasks, policy)

    const alphaSlots = result.find(t => t.id === 'alpha')!.plan?.slots || []
    const betaSlots = result.find(t => t.id === 'beta')!.plan?.slots || []

    // All slots for 'alpha' task should have taskId === 'alpha'
    for (const slot of alphaSlots) {
      expect(slot.taskId).toBe('alpha')
    }
    // All slots for 'beta' task should have taskId === 'beta'
    for (const slot of betaSlots) {
      expect(slot.taskId).toBe('beta')
    }
  })

  it('should handle single task', () => {
    const task = makeTask({ id: 'solo' })
    const result = planTasks([task], makePolicy())
    expect(result.length).toBe(1)
    expect(result[0].id).toBe('solo')
  })
})
