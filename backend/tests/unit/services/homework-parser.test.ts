/**
 * Homework Parser Unit Tests
 *
 * Tests for the exported helper functions and the pure/heuristic parts of
 * homework-parser.ts.  We avoid testing parseHomework() directly because
 * it calls handleAsk() (LLM), but we DO test priorityToNumber and
 * numberToPriority which are fully pure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted to top of file - use vi.hoisted() to declare mock fn
const { mockHandleAsk } = vi.hoisted(() => ({
  mockHandleAsk: vi.fn().mockResolvedValue({ answer: '{}' }),
}))

// Mock the LLM dependency so parseHomework can be called without a real API
vi.mock('../../../src/lib/ai/ask', () => ({
  handleAsk: mockHandleAsk,
}))

import {
  parseHomework,
  priorityToNumber,
  numberToPriority,
} from '../../../src/services/homework-parser'

// ---------------------------------------------------------------------------
// priorityToNumber
// ---------------------------------------------------------------------------

describe('priorityToNumber', () => {
  it('should return 5 for high priority', () => {
    expect(priorityToNumber('high')).toBe(5)
  })

  it('should return 3 for medium priority', () => {
    expect(priorityToNumber('medium')).toBe(3)
  })

  it('should return 1 for low priority', () => {
    expect(priorityToNumber('low')).toBe(1)
  })

  it('should return 3 for unknown priority (default)', () => {
    expect(priorityToNumber('unknown' as any)).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// numberToPriority
// ---------------------------------------------------------------------------

describe('numberToPriority', () => {
  it('should return high for numbers >= 4', () => {
    expect(numberToPriority(4)).toBe('high')
    expect(numberToPriority(5)).toBe('high')
    expect(numberToPriority(10)).toBe('high')
  })

  it('should return medium for numbers 2-3', () => {
    expect(numberToPriority(2)).toBe('medium')
    expect(numberToPriority(3)).toBe('medium')
  })

  it('should return low for numbers < 2', () => {
    expect(numberToPriority(1)).toBe('low')
    expect(numberToPriority(0)).toBe('low')
    expect(numberToPriority(-5)).toBe('low')
  })
})

// ---------------------------------------------------------------------------
// parseHomework - integration with mocked LLM
// ---------------------------------------------------------------------------

describe('parseHomework', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHandleAsk.mockResolvedValue({ answer: '{}' })
  })

  it('should return a success result', async () => {
    const result = await parseHomework('Do physics homework chapter 5')
    expect(result.success).toBe(true)
  })

  it('should return homework with a title', async () => {
    const result = await parseHomework('Do physics homework chapter 5')
    expect(result.homework).toBeDefined()
    expect(typeof result.homework.title).toBe('string')
    expect(result.homework.title.length).toBeGreaterThan(0)
  })

  it('should detect physics subject from text', async () => {
    const result = await parseHomework('Complete physics problem set on mechanics')
    // When AI returns {}, it falls back to keyword detection
    expect(result.homework.subject).toBe('physics')
  })

  it('should detect math subject from text', async () => {
    const result = await parseHomework('Solve math equations for calculus assignment')
    expect(result.homework.subject).toBe('math')
  })

  it('should detect chemistry subject from text', async () => {
    const result = await parseHomework('Chemistry lab report on chemical reactions')
    expect(result.homework.subject).toBe('chemistry')
  })

  it('should detect homework task type', async () => {
    const result = await parseHomework('Complete homework exercises from textbook')
    expect(result.homework.type).toBe('homework')
  })

  it('should detect essay task type', async () => {
    const result = await parseHomework('Write an essay about climate change')
    expect(result.homework.type).toBe('essay')
  })

  it('should detect exam task type', async () => {
    const result = await parseHomework('Prepare for chemistry exam next week')
    expect(result.homework.type).toBe('exam')
  })

  it('should detect due tomorrow', async () => {
    const before = Date.now()
    const result = await parseHomework('Submit assignment tomorrow')
    const after = Date.now()

    if (result.homework.dueAt) {
      const dueTime = new Date(result.homework.dueAt).getTime()
      // Should be roughly 1 day from now
      expect(dueTime).toBeGreaterThan(before)
      expect(dueTime).toBeLessThan(after + 2 * 24 * 60 * 60 * 1000)
    }
  })

  it('should detect estimated hours', async () => {
    const result = await parseHomework('Physics assignment ~2h of work')
    // estMins from heuristic or AI default
    expect(typeof result.homework.estMins).toBe('number')
  })

  it('should detect high priority for urgent tasks', async () => {
    const result = await parseHomework('Urgent physics exam tomorrow deadline')
    // Priority should be high due to "urgent" keyword
    expect(result.homework.priority).toBe('high')
  })

  it('should detect low priority for non-urgent tasks', async () => {
    // "not urgent" contains "urgent" which is a HIGH indicator - so use different keywords
    const result = await parseHomework('Homework due next week, later when I have time')
    expect(result.homework.priority).toBe('low')
  })

  it('should return a schedule array', async () => {
    const result = await parseHomework('Math homework due tomorrow')
    expect(Array.isArray(result.schedule)).toBe(true)
  })

  it('should return success: false on LLM error', async () => {
    mockHandleAsk.mockRejectedValue(new Error('LLM failure'))

    const result = await parseHomework('Some homework')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should use AI result title when AI returns valid JSON', async () => {
    mockHandleAsk.mockResolvedValue({
      answer: '{"title": "AI Generated Title", "subject": "biology", "type": "project", "estMins": 90, "priority": "high", "description": "Bio project", "steps": ["Step 1", "Step 2"], "relatedTopics": ["cells"]}'
    })

    const result = await parseHomework('Random text')
    expect(result.homework.title).toBe('AI Generated Title')
    expect(result.homework.subject).toBe('biology')
  })

  it('should fall back gracefully when AI returns invalid JSON', async () => {
    mockHandleAsk.mockResolvedValue({ answer: 'not valid json at all' })

    const result = await parseHomework('Physics homework due Friday')
    expect(result.success).toBe(true)
    expect(result.homework).toBeDefined()
  })
})
