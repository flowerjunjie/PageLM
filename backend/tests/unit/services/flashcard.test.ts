import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// All vi.mock factories must contain NO references to top-level variables.
// vi.mock is hoisted before imports, so factories run before module-level
// variable initialisation.
// ─────────────────────────────────────────────────────────────────────────────
vi.mock('../../../src/utils/database/keyv', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}))

import db from '../../../src/utils/database/keyv'
import {
  sm2,
  getInitialReviewTime,
  calculateNextReviewTime,
  scheduleReview,
  getDueReviews,
  getAllReviews,
  updateReviewResult,
  getReviewStats,
  deleteReviewSchedule,
  getQualityDescription,
  getNextReviewDescription,
  type ReviewSchedule,
} from '../../../src/services/spaced-repetition'

const mockGet = vi.mocked(db.get)
const mockSet = vi.mocked(db.set)
const mockDelete = vi.mocked(db.delete)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function makeSchedule(overrides: Partial<ReviewSchedule> = {}): ReviewSchedule {
  return {
    flashcardId: 'fc-default',
    userId: 'user-default',
    nextReviewAt: Date.now() + 1200000,
    interval: 0,
    repetition: 0,
    easiness: 2.5,
    reviewHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

describe('FlashcardService (SM-2 spaced-repetition)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Pure SM-2 algorithm function
  // ─────────────────────────────────────────────────────────────────────────────
  describe('sm2 – core algorithm', () => {
    it('should return interval=1, repetition=1 for first successful recall', () => {
      const result = sm2(0, 0, 2.5, 4)

      expect(result.newInterval).toBe(1)
      expect(result.newRepetition).toBe(1)
    })

    it('should return interval=6, repetition=2 for second successful recall', () => {
      const result = sm2(1, 1, 2.5, 4)

      expect(result.newInterval).toBe(6)
      expect(result.newRepetition).toBe(2)
    })

    it('should calculate I(n) = round(I(n-1) * EF) for n >= 3', () => {
      const ef25 = 2.5
      // quality=4 keeps EF unchanged
      const result = sm2(6, 2, ef25, 4)

      expect(result.newInterval).toBe(Math.round(6 * ef25))
      expect(result.newRepetition).toBe(3)
    })

    it('should reset interval to 1 and repetition to 0 on failed recall (quality < 3)', () => {
      const result = sm2(30, 5, 2.5, 2)

      expect(result.newInterval).toBe(1)
      expect(result.newRepetition).toBe(0)
    })

    it('should decrease EF when quality is poor (quality=2)', () => {
      const result = sm2(6, 2, 2.5, 2)

      expect(result.newEasiness).toBeLessThan(2.5)
    })

    it('should increase EF when quality is excellent (quality=5)', () => {
      const result = sm2(6, 2, 2.5, 5)

      expect(result.newEasiness).toBeGreaterThan(2.5)
    })

    it('should keep EF unchanged when quality=4 (zero delta)', () => {
      const result = sm2(6, 2, 2.5, 4)

      // EF change for q=4: 0.1 - (5-4)*(0.08 + (5-4)*0.02) = 0.1 - 0.10 = 0
      expect(result.newEasiness).toBeCloseTo(2.5, 5)
    })

    it('should enforce minimum EF of 1.3', () => {
      const result = sm2(6, 2, 1.3, 0)

      expect(result.newEasiness).toBe(1.3)
    })

    it('should cap interval at 365 days', () => {
      const result = sm2(200, 10, 2.5, 5)

      expect(result.newInterval).toBeLessThanOrEqual(365)
    })

    it('should clamp quality below 0 to 0', () => {
      const resultNeg = sm2(6, 2, 2.5, -5)
      const result0 = sm2(6, 2, 2.5, 0)

      expect(resultNeg.newRepetition).toBe(result0.newRepetition)
      expect(resultNeg.newInterval).toBe(result0.newInterval)
    })

    it('should clamp quality above 5 to 5', () => {
      const resultHigh = sm2(6, 2, 2.5, 10)
      const result5 = sm2(6, 2, 2.5, 5)

      expect(resultHigh.newRepetition).toBe(result5.newRepetition)
      expect(resultHigh.newInterval).toBe(result5.newInterval)
    })

    it('should handle quality=3 as successful (boundary)', () => {
      const result = sm2(1, 1, 2.5, 3)

      expect(result.newRepetition).toBe(2)
    })

    it('should handle quality=0 (complete blackout)', () => {
      const result = sm2(10, 5, 2.5, 0)

      expect(result.newInterval).toBe(1)
      expect(result.newRepetition).toBe(0)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // getInitialReviewTime
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getInitialReviewTime', () => {
    it('should return a timestamp exactly 20 minutes from now', () => {
      const now = Date.now()
      const expected = now + 20 * 60 * 1000

      expect(getInitialReviewTime()).toBe(expected)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // calculateNextReviewTime
  // ─────────────────────────────────────────────────────────────────────────────
  describe('calculateNextReviewTime', () => {
    it('should return now + 1 day (ms) for first successful review (q=4)', () => {
      const now = Date.now()
      const result = calculateNextReviewTime(0, 0, 2.5, 4)
      const oneDayMs = 1 * 24 * 60 * 60 * 1000

      expect(result).toBe(now + oneDayMs)
    })

    it('should return now + 6 days for second successful review', () => {
      const now = Date.now()
      const result = calculateNextReviewTime(1, 1, 2.5, 4)
      const sixDaysMs = 6 * 24 * 60 * 60 * 1000

      expect(result).toBe(now + sixDaysMs)
    })

    it('should return now + 1 day after failed recall', () => {
      const now = Date.now()
      const result = calculateNextReviewTime(10, 5, 2.5, 2)
      const oneDayMs = 1 * 24 * 60 * 60 * 1000

      expect(result).toBe(now + oneDayMs)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // scheduleReview
  // ─────────────────────────────────────────────────────────────────────────────
  describe('scheduleReview', () => {
    it('should return a correctly shaped ReviewSchedule', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await scheduleReview('fc-001', 'user-001')

      expect(result).toMatchObject({
        flashcardId: 'fc-001',
        userId: 'user-001',
        interval: 0,
        repetition: 0,
        easiness: 2.5,
        reviewHistory: [],
      })
      expect(result.nextReviewAt).toBeGreaterThan(Date.now())
    })

    it('should default to userId="default" when not supplied', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await scheduleReview('fc-002')

      expect(result.userId).toBe('default')
    })

    it('should persist the schedule under key review:<id>', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      await scheduleReview('fc-003')

      expect(mockSet).toHaveBeenCalledWith(
        'review:fc-003',
        expect.objectContaining({ flashcardId: 'fc-003' })
      )
    })

    it('should add the flashcard to the user review list', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      await scheduleReview('fc-004', 'user-A')

      expect(mockSet).toHaveBeenCalledWith(
        'user-reviews:user-A',
        expect.arrayContaining(['fc-004'])
      )
    })

    it('should not duplicate the flashcard when already in the list', async () => {
      // scheduleReview calls db.set first, then db.get for user-reviews
      // Only one db.get call happens (for user-reviews)
      mockGet.mockResolvedValueOnce(['fc-005', 'fc-other'])
      mockSet.mockResolvedValue(undefined)

      await scheduleReview('fc-005', 'user-B')

      const setCall = mockSet.mock.calls.find(call => call[0] === 'user-reviews:user-B')
      // fc-005 is already in the list so no new set should be called
      expect(setCall).toBeUndefined()
    })

    it('should add to an existing list without removing other entries', async () => {
      // scheduleReview: db.set('review:id') first, then db.get('user-reviews:userId')
      // Only one db.get (for user-reviews)
      mockGet.mockResolvedValueOnce(['fc-existing'])
      mockSet.mockResolvedValue(undefined)

      await scheduleReview('fc-new', 'user-C')

      const setCall = mockSet.mock.calls.find(call => call[0] === 'user-reviews:user-C')
      expect(setCall?.[1]).toContain('fc-existing')
      expect(setCall?.[1]).toContain('fc-new')
    })

    it('should propagate database errors when db.set fails', async () => {
      // db.set is called before db.get; make it throw
      mockSet.mockRejectedValue(new Error('DB write failed'))

      await expect(scheduleReview('fc-err')).rejects.toThrow('DB write failed')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // getDueReviews
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getDueReviews', () => {
    it('should return only reviews whose nextReviewAt is in the past', async () => {
      const now = Date.now()
      mockGet
        .mockResolvedValueOnce(['fc-1', 'fc-2', 'fc-3'])
        .mockResolvedValueOnce(makeSchedule({ flashcardId: 'fc-1', nextReviewAt: now - 1000 }))
        .mockResolvedValueOnce(makeSchedule({ flashcardId: 'fc-2', nextReviewAt: now + 86400000 }))
        .mockResolvedValueOnce(makeSchedule({ flashcardId: 'fc-3', nextReviewAt: now - 5000 }))

      const result = await getDueReviews('user-1')

      expect(result.map(r => r.flashcardId)).toContain('fc-1')
      expect(result.map(r => r.flashcardId)).toContain('fc-3')
      expect(result.map(r => r.flashcardId)).not.toContain('fc-2')
    })

    it('should sort due reviews oldest-first', async () => {
      const now = Date.now()
      mockGet
        .mockResolvedValueOnce(['fc-a', 'fc-b'])
        .mockResolvedValueOnce(makeSchedule({ flashcardId: 'fc-a', nextReviewAt: now - 1000 }))
        .mockResolvedValueOnce(makeSchedule({ flashcardId: 'fc-b', nextReviewAt: now - 5000 }))

      const result = await getDueReviews('user-sort')

      expect(result[0].flashcardId).toBe('fc-b')   // oldest = most overdue
      expect(result[1].flashcardId).toBe('fc-a')
    })

    it('should return empty array when no reviews exist', async () => {
      mockGet.mockResolvedValue([])

      const result = await getDueReviews('user-empty')

      expect(result).toEqual([])
    })

    it('should use userId="default" when not supplied', async () => {
      mockGet.mockResolvedValue([])

      await getDueReviews()

      expect(mockGet).toHaveBeenCalledWith('user-reviews:default')
    })

    it('should propagate database errors', async () => {
      mockGet.mockRejectedValue(new Error('Read failed'))

      await expect(getDueReviews()).rejects.toThrow('Read failed')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // getAllReviews
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getAllReviews', () => {
    it('should return all reviews including future-scheduled ones', async () => {
      const now = Date.now()
      mockGet
        .mockResolvedValueOnce(['fc-1', 'fc-2'])
        .mockResolvedValueOnce(makeSchedule({ flashcardId: 'fc-1', nextReviewAt: now + 86400000 }))
        .mockResolvedValueOnce(makeSchedule({ flashcardId: 'fc-2', nextReviewAt: now - 1000 }))

      const result = await getAllReviews('user-1')

      expect(result).toHaveLength(2)
    })

    it('should sort all reviews by nextReviewAt ascending', async () => {
      const now = Date.now()
      mockGet
        .mockResolvedValueOnce(['fc-x', 'fc-y', 'fc-z'])
        .mockResolvedValueOnce(makeSchedule({ flashcardId: 'fc-x', nextReviewAt: now + 2000 }))
        .mockResolvedValueOnce(makeSchedule({ flashcardId: 'fc-y', nextReviewAt: now - 1000 }))
        .mockResolvedValueOnce(makeSchedule({ flashcardId: 'fc-z', nextReviewAt: now + 1000 }))

      const result = await getAllReviews('user-2')

      expect(result[0].flashcardId).toBe('fc-y')
      expect(result[1].flashcardId).toBe('fc-z')
      expect(result[2].flashcardId).toBe('fc-x')
    })

    it('should filter out null/undefined schedule entries', async () => {
      mockGet
        .mockResolvedValueOnce(['fc-1', 'fc-missing', 'fc-3'])
        .mockResolvedValueOnce(makeSchedule({ flashcardId: 'fc-1', nextReviewAt: Date.now() }))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(makeSchedule({ flashcardId: 'fc-3', nextReviewAt: Date.now() + 1 }))

      const result = await getAllReviews('user-3')

      expect(result).toHaveLength(2)
      expect(result.map(r => r.flashcardId)).not.toContain('fc-missing')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // updateReviewResult
  // ─────────────────────────────────────────────────────────────────────────────
  describe('updateReviewResult', () => {
    it('should return null for non-existent schedule', async () => {
      mockGet.mockResolvedValue(undefined)

      const result = await updateReviewResult('fc-ghost', 4)

      expect(result).toBeNull()
    })

    it('should apply SM-2 and advance repetition on successful review', async () => {
      const schedule = makeSchedule({ flashcardId: 'fc-ok', interval: 1, repetition: 1 })
      mockGet.mockResolvedValue(schedule)
      mockSet.mockResolvedValue(undefined)

      const result = await updateReviewResult('fc-ok', 4)

      expect(result?.repetition).toBe(2)
      expect(result?.interval).toBe(6)
    })

    it('should reset repetition on failed recall (quality=2)', async () => {
      const schedule = makeSchedule({ flashcardId: 'fc-fail', interval: 30, repetition: 10 })
      mockGet.mockResolvedValue(schedule)
      mockSet.mockResolvedValue(undefined)

      const result = await updateReviewResult('fc-fail', 2)

      expect(result?.repetition).toBe(0)
      expect(result?.interval).toBe(1)
    })

    it('should append to reviewHistory with correct quality and date', async () => {
      const schedule = makeSchedule({ flashcardId: 'fc-hist' })
      mockGet.mockResolvedValue(schedule)
      mockSet.mockResolvedValue(undefined)

      const now = Date.now()
      const result = await updateReviewResult('fc-hist', 5)

      expect(result?.reviewHistory).toHaveLength(1)
      expect(result?.reviewHistory[0].quality).toBe(5)
      expect(result?.reviewHistory[0].date).toBeGreaterThanOrEqual(now)
    })

    it('should clamp quality=10 down to 5 in history', async () => {
      const schedule = makeSchedule({ flashcardId: 'fc-clamp' })
      mockGet.mockResolvedValue(schedule)
      mockSet.mockResolvedValue(undefined)

      const result = await updateReviewResult('fc-clamp', 10)

      expect(result?.reviewHistory[0].quality).toBe(5)
    })

    it('should clamp quality=-3 up to 0 in history', async () => {
      const schedule = makeSchedule({ flashcardId: 'fc-neg' })
      mockGet.mockResolvedValue(schedule)
      mockSet.mockResolvedValue(undefined)

      const result = await updateReviewResult('fc-neg', -3)

      expect(result?.reviewHistory[0].quality).toBe(0)
    })

    it('should persist the updated schedule to the database', async () => {
      const schedule = makeSchedule({ flashcardId: 'fc-save', interval: 1, repetition: 1 })
      mockGet.mockResolvedValue(schedule)
      mockSet.mockResolvedValue(undefined)

      await updateReviewResult('fc-save', 4)

      expect(mockSet).toHaveBeenCalledWith(
        'review:fc-save',
        expect.objectContaining({ flashcardId: 'fc-save', repetition: 2 })
      )
    })

    it('should update the updatedAt timestamp', async () => {
      const oldTs = Date.now() - 10000
      const schedule = makeSchedule({ flashcardId: 'fc-ts', updatedAt: oldTs })
      mockGet.mockResolvedValue(schedule)
      mockSet.mockResolvedValue(undefined)

      const result = await updateReviewResult('fc-ts', 4)

      expect(result?.updatedAt).toBeGreaterThanOrEqual(Date.now())
    })

    it('should propagate database errors', async () => {
      mockGet.mockRejectedValue(new Error('Update failed'))

      await expect(updateReviewResult('fc-err', 4)).rejects.toThrow('Update failed')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // getReviewStats
  // ─────────────────────────────────────────────────────────────────────────────
  // getReviewStats calls calculateStreak internally, which makes a SECOND round
  // of db.get calls: user-reviews list + each schedule.  So for N cards the
  // mock sequence is:
  //   [user-reviews list] + [schedule × N] + [user-reviews list again] + [schedule × N again]
  describe('getReviewStats', () => {
    it('should return zero stats for a user with no cards', async () => {
      // Both rounds return [] so calculateStreak also gets []
      mockGet.mockResolvedValue([])

      const result = await getReviewStats('new-user')

      expect(result.totalCards).toBe(0)
      expect(result.dueToday).toBe(0)
      expect(result.completedToday).toBe(0)
      expect(result.averageEasiness).toBe(2.5)
    })

    it('should count total valid cards', async () => {
      const now = Date.now()
      const fc1 = makeSchedule({ flashcardId: 'fc-1', easiness: 2.5, nextReviewAt: now + 86400000 })
      const fc2 = makeSchedule({ flashcardId: 'fc-2', easiness: 2.5, nextReviewAt: now + 86400000 })
      mockGet
        // Round 1 (main loop)
        .mockResolvedValueOnce(['fc-1', 'fc-2'])
        .mockResolvedValueOnce(fc1)
        .mockResolvedValueOnce(fc2)
        // Round 2 (calculateStreak)
        .mockResolvedValueOnce(['fc-1', 'fc-2'])
        .mockResolvedValueOnce(fc1)
        .mockResolvedValueOnce(fc2)

      const result = await getReviewStats('user-cnt')

      expect(result.totalCards).toBe(2)
    })

    it('should correctly count due cards', async () => {
      const now = Date.now()
      const fc1 = makeSchedule({ flashcardId: 'fc-1', nextReviewAt: now - 1000 })
      const fc2 = makeSchedule({ flashcardId: 'fc-2', nextReviewAt: now + 86400000 })
      const fc3 = makeSchedule({ flashcardId: 'fc-3', nextReviewAt: now - 5000 })
      mockGet
        // Round 1
        .mockResolvedValueOnce(['fc-1', 'fc-2', 'fc-3'])
        .mockResolvedValueOnce(fc1)
        .mockResolvedValueOnce(fc2)
        .mockResolvedValueOnce(fc3)
        // Round 2 (calculateStreak)
        .mockResolvedValueOnce(['fc-1', 'fc-2', 'fc-3'])
        .mockResolvedValueOnce(fc1)
        .mockResolvedValueOnce(fc2)
        .mockResolvedValueOnce(fc3)

      const result = await getReviewStats('user-due')

      expect(result.dueToday).toBe(2)
    })

    it('should calculate average easiness across cards', async () => {
      const now = Date.now()
      const fc1 = makeSchedule({ flashcardId: 'fc-1', easiness: 2.0, nextReviewAt: now + 86400000 })
      const fc2 = makeSchedule({ flashcardId: 'fc-2', easiness: 3.0, nextReviewAt: now + 86400000 })
      mockGet
        .mockResolvedValueOnce(['fc-1', 'fc-2'])
        .mockResolvedValueOnce(fc1)
        .mockResolvedValueOnce(fc2)
        .mockResolvedValueOnce(['fc-1', 'fc-2'])
        .mockResolvedValueOnce(fc1)
        .mockResolvedValueOnce(fc2)

      const result = await getReviewStats('user-ef')

      expect(result.averageEasiness).toBe(2.5)
    })

    it('should count reviews completed today using reviewHistory', async () => {
      const now = Date.now()
      const todayStart = new Date().setHours(0, 0, 0, 0)
      const fc1 = makeSchedule({
        flashcardId: 'fc-1',
        nextReviewAt: now + 86400000,
        reviewHistory: [
          { date: todayStart + 3600000, quality: 4 },
          { date: todayStart + 7200000, quality: 5 },
          { date: todayStart - 86400000, quality: 3 }, // yesterday – should not count
        ],
      })
      mockGet
        .mockResolvedValueOnce(['fc-1'])
        .mockResolvedValueOnce(fc1)
        // calculateStreak round
        .mockResolvedValueOnce(['fc-1'])
        .mockResolvedValueOnce(fc1)

      const result = await getReviewStats('user-today')

      expect(result.completedToday).toBe(2)
    })

    it('should include a streak field in the result', async () => {
      mockGet.mockResolvedValue([])

      const result = await getReviewStats('streak-user')

      expect(result).toHaveProperty('streak')
      expect(typeof result.streak).toBe('number')
    })

    it('should calculate non-zero streak when reviews done today', async () => {
      const now = Date.now()
      const todayStart = new Date().setHours(0, 0, 0, 0)
      const fc1 = makeSchedule({
        flashcardId: 'fc-streak',
        nextReviewAt: now + 86400000,
        reviewHistory: [
          { date: todayStart + 1000, quality: 5 }, // today
        ],
      })
      mockGet
        .mockResolvedValueOnce(['fc-streak'])
        .mockResolvedValueOnce(fc1)
        .mockResolvedValueOnce(['fc-streak'])
        .mockResolvedValueOnce(fc1)

      const result = await getReviewStats('user-streak')

      expect(result.streak).toBeGreaterThanOrEqual(1)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // deleteReviewSchedule
  // ─────────────────────────────────────────────────────────────────────────────
  describe('deleteReviewSchedule', () => {
    it('should delete the schedule record', async () => {
      mockGet.mockResolvedValue(['fc-del', 'fc-keep'])
      mockDelete.mockResolvedValue(undefined)
      mockSet.mockResolvedValue(undefined)

      await deleteReviewSchedule('fc-del', 'user-del')

      expect(mockDelete).toHaveBeenCalledWith('review:fc-del')
    })

    it('should remove the card from the user review list', async () => {
      mockGet.mockResolvedValue(['fc-del', 'fc-keep'])
      mockDelete.mockResolvedValue(undefined)
      mockSet.mockResolvedValue(undefined)

      await deleteReviewSchedule('fc-del', 'user-rem')

      expect(mockSet).toHaveBeenCalledWith('user-reviews:user-rem', ['fc-keep'])
    })

    it('should return true on success', async () => {
      mockGet.mockResolvedValue(['fc-ok'])
      mockDelete.mockResolvedValue(undefined)
      mockSet.mockResolvedValue(undefined)

      const result = await deleteReviewSchedule('fc-ok', 'user-ok')

      expect(result).toBe(true)
    })

    it('should handle empty user list gracefully', async () => {
      mockGet.mockResolvedValue([])
      mockDelete.mockResolvedValue(undefined)
      mockSet.mockResolvedValue(undefined)

      const result = await deleteReviewSchedule('fc-none', 'user-none')

      expect(result).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // getQualityDescription
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getQualityDescription', () => {
    it('should map 0 → complete-blackout', () => {
      expect(getQualityDescription(0)).toBe('complete-blackout')
    })

    it('should map 1 → incorrect-response', () => {
      expect(getQualityDescription(1)).toBe('incorrect-response')
    })

    it('should map 2 → incorrect-easy-recall', () => {
      expect(getQualityDescription(2)).toBe('incorrect-easy-recall')
    })

    it('should map 3 → correct-difficult-recall', () => {
      expect(getQualityDescription(3)).toBe('correct-difficult-recall')
    })

    it('should map 4 → correct-hesitant-recall', () => {
      expect(getQualityDescription(4)).toBe('correct-hesitant-recall')
    })

    it('should map 5 → perfect-response', () => {
      expect(getQualityDescription(5)).toBe('perfect-response')
    })

    it('should return "unknown" for values outside 0-5', () => {
      expect(getQualityDescription(-1)).toBe('unknown')
      expect(getQualityDescription(6)).toBe('unknown')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // getNextReviewDescription
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getNextReviewDescription', () => {
    it('should return "in-20-minutes" for interval=0', () => {
      expect(getNextReviewDescription(0)).toBe('in-20-minutes')
    })

    it('should return "in-1-day" for interval=1', () => {
      expect(getNextReviewDescription(1)).toBe('in-1-day')
    })

    it('should describe short intervals as days (2-6)', () => {
      expect(getNextReviewDescription(3)).toBe('in-3-days')
      expect(getNextReviewDescription(6)).toBe('in-6-days')
    })

    it('should describe intervals 7-29 in weeks', () => {
      expect(getNextReviewDescription(7)).toBe('in-1-weeks')
      expect(getNextReviewDescription(14)).toBe('in-2-weeks')
    })

    it('should describe intervals 30-364 in months', () => {
      expect(getNextReviewDescription(30)).toBe('in-1-months')
      expect(getNextReviewDescription(60)).toBe('in-2-months')
    })

    it('should return "in-1-year" for interval >= 365', () => {
      expect(getNextReviewDescription(365)).toBe('in-1-year')
      expect(getNextReviewDescription(400)).toBe('in-1-year')
    })
  })
})
