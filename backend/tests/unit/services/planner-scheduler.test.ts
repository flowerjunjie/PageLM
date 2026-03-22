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
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T12:00:00.000Z'))

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowDateStr = tomorrow.toISOString().slice(0, 10)

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
      expect(tomorrowDay!.slots.map(slot => slot.id)).toEqual(['slot-1'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('should exclude slots before the weekly window starts while keeping the start boundary inclusive', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T12:00:00.000Z'))

    try {
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      const justBeforeWindow = new Date(startOfToday.getTime() - 1)
      const windowStartEnd = new Date(startOfToday.getTime() + 25 * 60 * 1000)
      const justBeforeWindowEnd = new Date(justBeforeWindow.getTime() + 25 * 60 * 1000)

      const taskAtWindowBoundary = makeTask({
        id: 'task-window-boundary',
        plan: {
          slots: [
            {
              id: 'slot-before-window',
              taskId: 'task-window-boundary',
              start: justBeforeWindow.toISOString(),
              end: justBeforeWindowEnd.toISOString(),
              kind: 'focus',
            },
            {
              id: 'slot-window-start',
              taskId: 'task-window-boundary',
              start: startOfToday.toISOString(),
              end: windowStartEnd.toISOString(),
              kind: 'focus',
            },
          ],
          policy: makePolicy(),
          lastPlannedAt: new Date().toISOString(),
        },
      })

      const result = weeklyPlan([taskAtWindowBoundary], makePolicy())

      expect(result.days[0].slots.map(slot => slot.id)).toEqual(['slot-window-start'])
      expect(result.days.flatMap(day => day.slots.map(slot => slot.id))).not.toContain('slot-before-window')
    } finally {
      vi.useRealTimers()
    }
  })

  it('should ignore slots scheduled beyond the 7-day window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T12:00:00.000Z'))

    try {
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      const lastIncludedDay = new Date(startOfToday.getTime() + 6 * 24 * 60 * 60 * 1000)
      lastIncludedDay.setHours(9, 0, 0, 0)
      const beyondWindow = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000)
      beyondWindow.setHours(9, 0, 0, 0)

      const taskWithFutureSlots = makeTask({
        id: 'task-future-slot',
        plan: {
          slots: [
            {
              id: 'slot-last-in-range',
              taskId: 'task-future-slot',
              start: lastIncludedDay.toISOString(),
              end: new Date(lastIncludedDay.getTime() + 25 * 60 * 1000).toISOString(),
              kind: 'focus',
            },
            {
              id: 'slot-beyond-window',
              taskId: 'task-future-slot',
              start: beyondWindow.toISOString(),
              end: new Date(beyondWindow.getTime() + 25 * 60 * 1000).toISOString(),
              kind: 'focus',
            },
          ],
          policy: makePolicy(),
          lastPlannedAt: new Date().toISOString(),
        },
      })

      const result = weeklyPlan([taskWithFutureSlots], makePolicy())

      expect(result.days[6].slots.map(slot => slot.id)).toEqual(['slot-last-in-range'])
      expect(result.days.flatMap(day => day.slots.map(slot => slot.id))).not.toContain('slot-beyond-window')
    } finally {
      vi.useRealTimers()
    }
  })

  it('should leave all day buckets empty for tasks without a plan', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T12:00:00.000Z'))

    try {
      const taskWithoutPlan = makeTask({ id: 'task-no-plan' })

      const result = weeklyPlan([taskWithoutPlan], makePolicy())

      expect(result.days.map(day => day.slots.map(slot => slot.id))).toEqual([[], [], [], [], [], [], []])
    } finally {
      vi.useRealTimers()
    }
  })

  it('should sort slots within each day by start time', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T12:00:00.000Z'))

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const laterStart = new Date(today)
      laterStart.setHours(11, 0, 0, 0)
      const earlierStart = new Date(today)
      earlierStart.setHours(9, 0, 0, 0)

      const taskWithLaterSlot = makeTask({
        id: 'task-later',
        plan: {
          slots: [
            {
              id: 'slot-later',
              taskId: 'task-later',
              start: laterStart.toISOString(),
              end: new Date(laterStart.getTime() + 25 * 60 * 1000).toISOString(),
              kind: 'focus',
            },
          ],
          policy: makePolicy(),
          lastPlannedAt: new Date().toISOString(),
        },
      })

      const taskWithEarlierSlot = makeTask({
        id: 'task-earlier',
        plan: {
          slots: [
            {
              id: 'slot-earlier',
              taskId: 'task-earlier',
              start: earlierStart.toISOString(),
              end: new Date(earlierStart.getTime() + 25 * 60 * 1000).toISOString(),
              kind: 'focus',
            },
          ],
          policy: makePolicy(),
          lastPlannedAt: new Date().toISOString(),
        },
      })

      const result = weeklyPlan([taskWithLaterSlot, taskWithEarlierSlot], makePolicy())

      expect(result.days[0].slots.map(slot => slot.id)).toEqual(['slot-earlier', 'slot-later'])
    } finally {
      vi.useRealTimers()
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
