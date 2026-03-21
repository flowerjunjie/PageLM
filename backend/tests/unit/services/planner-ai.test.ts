/**
 * Planner AI Utility Tests
 *
 * Tests for calculateUrgencyScore() which is a pure mathematical function
 * with no LLM or database dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the LLM dependency to avoid network calls
vi.mock('../../../src/lib/ai/ask', () => ({
  handleAsk: vi.fn().mockResolvedValue({ answer: 'ok' }),
}))

import { calculateUrgencyScore } from '../../../src/services/planner/ai'
import type { Task } from '../../../src/services/planner/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
    estMins: 60,
    priority: 3,
    status: 'todo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// calculateUrgencyScore
// ---------------------------------------------------------------------------

describe('calculateUrgencyScore', () => {
  it('should return a positive number', () => {
    const task = makeTask()
    const score = calculateUrgencyScore(task)
    expect(score).toBeGreaterThan(0)
  })

  it('should return a higher score for tasks due sooner', () => {
    const urgentTask = makeTask({
      dueAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour
      priority: 3,
      estMins: 60,
    })
    const relaxedTask = makeTask({
      dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks
      priority: 3,
      estMins: 60,
    })

    const urgentScore = calculateUrgencyScore(urgentTask)
    const relaxedScore = calculateUrgencyScore(relaxedTask)

    expect(urgentScore).toBeGreaterThan(relaxedScore)
  })

  it('should return a higher score for higher priority tasks', () => {
    const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const highPriority = makeTask({ priority: 5, dueAt, estMins: 60 })
    const lowPriority = makeTask({ priority: 1, dueAt, estMins: 60 })

    const highScore = calculateUrgencyScore(highPriority)
    const lowScore = calculateUrgencyScore(lowPriority)

    expect(highScore).toBeGreaterThan(lowScore)
  })

  it('should return a higher score for tasks requiring more effort', () => {
    const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const longTask = makeTask({ estMins: 240, dueAt, priority: 3 })
    const shortTask = makeTask({ estMins: 15, dueAt, priority: 3 })

    const longScore = calculateUrgencyScore(longTask)
    const shortScore = calculateUrgencyScore(shortTask)

    expect(longScore).toBeGreaterThan(shortScore)
  })

  it('should handle past due tasks without throwing', () => {
    const overdueTask = makeTask({
      dueAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    })

    expect(() => calculateUrgencyScore(overdueTask)).not.toThrow()
    const score = calculateUrgencyScore(overdueTask)
    expect(typeof score).toBe('number')
    expect(isFinite(score)).toBe(true)
  })

  it('should return a finite number (no NaN or Infinity from edge cases)', () => {
    const task = makeTask({
      estMins: 0, // edge case: 0 minutes
      priority: 1,
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const score = calculateUrgencyScore(task)
    expect(isFinite(score)).toBe(true)
    expect(isNaN(score)).toBe(false)
  })

  it('should cap effort score at estMins = 240 threshold', () => {
    const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // Both 240 and 480 minutes should produce the same effort score (capped at 1.0)
    const task240 = makeTask({ estMins: 240, dueAt, priority: 3 })
    const task480 = makeTask({ estMins: 480, dueAt, priority: 3 })

    // The effort component is Math.min(1, estMins / 240)
    // For estMins >= 240 it's always 1.0, so scores should be equal
    const score240 = calculateUrgencyScore(task240)
    const score480 = calculateUrgencyScore(task480)

    expect(score240).toBeCloseTo(score480, 5)
  })
})
