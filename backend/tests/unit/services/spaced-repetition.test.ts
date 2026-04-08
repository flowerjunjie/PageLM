/**
 * Spaced Repetition Service Unit Tests
 *
 * Comprehensive test suite for SM-2 algorithm implementation
 * Based on SuperMemo 2 algorithm specifications
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
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
} from '../../../src/services/spaced-repetition'

// Mock the database
vi.mock('../../../src/utils/database/keyv', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}))

import db from '../../../src/utils/database/keyv'

describe('SM-2 Algorithm', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('sm2 function core', () => {
    describe('quality rating clamping', () => {
      it('should clamp negative quality to 0', () => {
        const result = sm2(1, 0, 2.5, -5)
        // Quality -5 should be treated as 0
        expect(result.newEasiness).toBeLessThan(2.5)
        expect(result.newRepetition).toBe(0)
      })

      it('should clamp quality > 5 to 5', () => {
        const result = sm2(1, 0, 2.5, 10)
        // Quality 10 should be treated as 5
        expect(result.newEasiness).toBeGreaterThan(2.5)
        expect(result.newRepetition).toBe(1)
      })

      it('should accept valid quality values 0-5', () => {
        for (let q = 0; q <= 5; q++) {
          expect(() => sm2(1, 0, 2.5, q)).not.toThrow()
        }
      })
    })

    describe('easiness factor (EF) calculation', () => {
      it('should increase EF by 0.1 for quality=5', () => {
        const result = sm2(1, 0, 2.5, 5)
        // EF' = 2.5 + (0.1 - 0 * ...) = 2.5 + 0.1 = 2.6
        expect(result.newEasiness).toBeCloseTo(2.6, 5)
      })

      it('should not change EF for quality=4 (approximate)', () => {
        const result = sm2(1, 0, 2.5, 4)
        // EF' = 2.5 + (0.1 - 1 * (0.08 + 1 * 0.02)) = 2.5 + (0.1 - 0.1) = 2.5
        expect(result.newEasiness).toBeCloseTo(2.5, 5)
      })

      it('should decrease EF for quality=3', () => {
        const result = sm2(1, 0, 2.5, 3)
        // EF' = 2.5 + (0.1 - 2 * (0.08 + 2 * 0.02)) = 2.5 + (0.1 - 0.24) = 2.36
        expect(result.newEasiness).toBeCloseTo(2.36, 5)
      })

      it('should significantly decrease EF for quality=0', () => {
        const result = sm2(1, 0, 2.5, 0)
        // EF' = 2.5 + (0.1 - 5 * (0.08 + 5 * 0.02)) = 2.5 + (0.1 - 0.8) = 1.7
        expect(result.newEasiness).toBeCloseTo(1.7, 1)
      })

      it('should enforce minimum EF of 1.3', () => {
        const result = sm2(1, 0, 1.3, 0)
        expect(result.newEasiness).toBeGreaterThanOrEqual(1.3)
      })

      it('should handle edge case: EF at minimum with worst quality', () => {
        const result = sm2(10, 5, 1.3, 0)
        expect(result.newEasiness).toBe(1.3)
      })
    })

    describe('interval calculation for successful recall (quality >= 3)', () => {
      it('should set I(1) = 1 day for first successful repetition', () => {
        const result = sm2(0, 0, 2.5, 5)
        expect(result.newInterval).toBe(1)
        expect(result.newRepetition).toBe(1)
      })

      it('should set I(2) = 6 days for second successful repetition', () => {
        const result = sm2(1, 1, 2.5, 5)
        expect(result.newInterval).toBe(6)
        expect(result.newRepetition).toBe(2)
      })

      it('should calculate I(n) = I(n-1) * EF for n >= 3', () => {
        const result = sm2(6, 2, 2.5, 5)
        // After quality 5, EF becomes 2.6
        // I(3) = 6 * 2.6 = 15.6, rounded to 16
        expect(result.newInterval).toBe(16)
        expect(result.newRepetition).toBe(3)
      })

      it('should cap interval at 365 days', () => {
        const result = sm2(300, 10, 2.8, 5)
        expect(result.newInterval).toBeLessThanOrEqual(365)
      })

      it('should increment repetition count on success', () => {
        const result1 = sm2(1, 0, 2.5, 3)
        expect(result1.newRepetition).toBe(1)

        const result2 = sm2(6, 1, 2.5, 4)
        expect(result2.newRepetition).toBe(2)
      })
    })

    describe('interval calculation for failed recall (quality < 3)', () => {
      it('should reset repetition to 0 on failure', () => {
        const result = sm2(10, 5, 2.5, 2)
        expect(result.newRepetition).toBe(0)
      })

      it('should set interval to 1 day after failure', () => {
        const result = sm2(10, 5, 2.5, 1)
        expect(result.newInterval).toBe(1)
      })

      it('should handle quality 0 (complete blackout)', () => {
        const result = sm2(10, 5, 2.5, 0)
        expect(result.newInterval).toBe(1)
        expect(result.newRepetition).toBe(0)
      })

      it('should handle quality 2 (incorrect but easy recall)', () => {
        const result = sm2(10, 5, 2.5, 2)
        expect(result.newInterval).toBe(1)
        expect(result.newRepetition).toBe(0)
      })
    })

    describe('edge cases', () => {
      it('should handle zero initial state', () => {
        const result = sm2(0, 0, 2.5, 5)
        expect(result.newInterval).toBe(1)
        expect(result.newRepetition).toBe(1)
      })

      it('should handle decimal easiness values', () => {
        const result = sm2(6, 2, 2.36, 4)
        expect(result.newInterval).toBeGreaterThan(0)
      })

      it('should handle maximum interval calculation', () => {
        const result = sm2(364, 50, 3.0, 5)
        expect(result.newInterval).toBeLessThanOrEqual(365)
      })
    })
  })

  describe('getInitialReviewTime', () => {
    it('should return timestamp 20 minutes in the future', () => {
      const now = Date.now()
      const result = getInitialReviewTime()
      const expected = now + 20 * 60 * 1000

      // Allow 1 second tolerance for test execution
      expect(result).toBeGreaterThanOrEqual(expected - 1000)
      expect(result).toBeLessThanOrEqual(expected + 1000)
    })
  })

  describe('calculateNextReviewTime', () => {
    it('should calculate correct timestamp for 1 day interval', () => {
      const now = Date.now()
      const result = calculateNextReviewTime(0, 0, 2.5, 5)
      const dayInMs = 24 * 60 * 60 * 1000

      expect(result).toBeGreaterThanOrEqual(now + dayInMs - 1000)
      expect(result).toBeLessThanOrEqual(now + dayInMs + 1000)
    })

    it('should calculate correct timestamp for 6 day interval', () => {
      const now = Date.now()
      const result = calculateNextReviewTime(1, 1, 2.5, 5)
      const sixDaysInMs = 6 * 24 * 60 * 60 * 1000

      expect(result).toBeGreaterThanOrEqual(now + sixDaysInMs - 1000)
      expect(result).toBeLessThanOrEqual(now + sixDaysInMs + 1000)
    })
  })

  describe('scheduleReview', () => {
    it('should create new review schedule with default user', async () => {
      const flashcardId = 'fc-test-123'

      const result = await scheduleReview(flashcardId)

      expect(result).toMatchObject({
        flashcardId,
        userId: 'default',
        interval: 0,
        repetition: 0,
        easiness: 2.5,
      })
      expect(result.nextReviewAt).toBeGreaterThan(Date.now())
      expect(result.reviewHistory).toEqual([])
    })

    it('should create review schedule with custom user', async () => {
      const flashcardId = 'fc-test-456'
      const userId = 'user-789'

      const result = await scheduleReview(flashcardId, userId)

      expect(result.userId).toBe(userId)
    })

    it('should save schedule to database', async () => {
      const flashcardId = 'fc-test-789'

      await scheduleReview(flashcardId)

      expect(db.set).toHaveBeenCalledWith(
        `review:${flashcardId}`,
        expect.objectContaining({
          flashcardId,
          userId: 'default',
        })
      )
    })

    it('should add flashcard to user review list', async () => {
      const flashcardId = 'fc-test-abc'
      const userId = 'user-xyz'

      vi.mocked(db.get).mockResolvedValueOnce([])

      await scheduleReview(flashcardId, userId)

      expect(db.set).toHaveBeenCalledWith(
        `user-reviews:${userId}`,
        expect.arrayContaining([flashcardId])
      )
    })

    it('should not duplicate flashcard in user list', async () => {
      const flashcardId = 'fc-test-dup'
      const userId = 'user-dup'

      // Already contains flashcardId in the list
      vi.mocked(db.get).mockResolvedValueOnce([flashcardId, 'other-fc'])

      await scheduleReview(flashcardId, userId)

      // When flashcard already exists in list, db.set should NOT be called for user-reviews
      const userReviewsSetCall = vi.mocked(db.set).mock.calls.find(
        call => call[0] === `user-reviews:${userId}`
      )
      expect(userReviewsSetCall).toBeUndefined()
    })
  })

  describe('getDueReviews', () => {
    it('should return empty array when user has no reviews', async () => {
      vi.mocked(db.get).mockResolvedValueOnce([])

      const result = await getDueReviews('user-empty')

      expect(result).toEqual([])
    })

    it('should return only reviews that are due', async () => {
      const now = Date.now()
      const userId = 'user-due'
      const flashcardIds = ['fc-1', 'fc-2', 'fc-3']

      // First call: user-reviews list; subsequent calls: individual schedule lookups
      vi.mocked(db.get)
        .mockResolvedValueOnce(flashcardIds) // user-reviews list
        .mockResolvedValueOnce({ flashcardId: 'fc-1', nextReviewAt: now - 1000 }) // Due
        .mockResolvedValueOnce({ flashcardId: 'fc-2', nextReviewAt: now + 86400000 }) // Not due
        .mockResolvedValueOnce({ flashcardId: 'fc-3', nextReviewAt: now - 5000 }) // Due

      const result = await getDueReviews(userId)

      expect(result).toHaveLength(2)
      expect(result.map(r => r.flashcardId)).toContain('fc-1')
      expect(result.map(r => r.flashcardId)).toContain('fc-3')
      expect(result.map(r => r.flashcardId)).not.toContain('fc-2')
    })

    it('should sort results by nextReviewAt (oldest first)', async () => {
      const now = Date.now()
      const userId = 'user-sort'
      const flashcardIds = ['fc-a', 'fc-b', 'fc-c']

      vi.mocked(db.get)
        .mockResolvedValueOnce(flashcardIds)
        .mockResolvedValueOnce({ flashcardId: 'fc-a', nextReviewAt: now - 5000 })
        .mockResolvedValueOnce({ flashcardId: 'fc-b', nextReviewAt: now - 10000 })
        .mockResolvedValueOnce({ flashcardId: 'fc-c', nextReviewAt: now - 1000 })

      const result = await getDueReviews(userId)

      expect(result[0].flashcardId).toBe('fc-b') // Oldest (most overdue)
      expect(result[1].flashcardId).toBe('fc-a')
      expect(result[2].flashcardId).toBe('fc-c') // Newest
    })
  })

  describe('getAllReviews', () => {
    it('should return all reviews for user including future ones', async () => {
      const now = Date.now()
      const userId = 'user-all'
      const flashcardIds = ['fc-1', 'fc-2']

      vi.mocked(db.get)
        .mockResolvedValueOnce(flashcardIds)
        .mockResolvedValueOnce({ flashcardId: 'fc-1', nextReviewAt: now - 1000 }) // Due
        .mockResolvedValueOnce({ flashcardId: 'fc-2', nextReviewAt: now + 86400000 }) // Future

      const result = await getAllReviews(userId)

      expect(result).toHaveLength(2)
    })

    it('should sort all reviews by nextReviewAt', async () => {
      const now = Date.now()
      const userId = 'user-sort-all'
      const flashcardIds = ['fc-1', 'fc-2']

      vi.mocked(db.get)
        .mockResolvedValueOnce(flashcardIds)
        .mockResolvedValueOnce({ flashcardId: 'fc-1', nextReviewAt: now + 86400000 })
        .mockResolvedValueOnce({ flashcardId: 'fc-2', nextReviewAt: now - 1000 })

      const result = await getAllReviews(userId)

      expect(result[0].flashcardId).toBe('fc-2')
      expect(result[1].flashcardId).toBe('fc-1')
    })
  })

  describe('updateReviewResult', () => {
    it('should return null for non-existent schedule', async () => {
      vi.mocked(db.get).mockResolvedValueOnce(undefined)

      const result = await updateReviewResult('fc-nonexistent', 4)

      expect(result).toBeNull()
    })

    it('should update schedule after successful review', async () => {
      const flashcardId = 'fc-update'
      const existingSchedule = {
        flashcardId,
        userId: 'default',
        interval: 1,
        repetition: 1,
        easiness: 2.5,
        nextReviewAt: Date.now(),
        reviewHistory: [],
      }

      vi.mocked(db.get).mockResolvedValueOnce(existingSchedule)

      const result = await updateReviewResult(flashcardId, 5)

      expect(result).not.toBeNull()
      expect(result!.repetition).toBe(2)
      expect(result!.interval).toBe(6)
      expect(result!.reviewHistory).toHaveLength(1)
      expect(result!.reviewHistory[0].quality).toBe(5)
    })

    it('should reset repetition on failed review', async () => {
      const flashcardId = 'fc-fail'
      const existingSchedule = {
        flashcardId,
        userId: 'default',
        interval: 30,
        repetition: 10,
        easiness: 2.5,
        nextReviewAt: Date.now(),
        reviewHistory: [],
      }

      vi.mocked(db.get).mockResolvedValueOnce(existingSchedule)

      const result = await updateReviewResult(flashcardId, 1)

      expect(result!.repetition).toBe(0)
      expect(result!.interval).toBe(1)
    })

    it('should clamp quality to valid range', async () => {
      const flashcardId = 'fc-clamp'
      const existingSchedule = {
        flashcardId,
        userId: 'default',
        interval: 1,
        repetition: 0,
        easiness: 2.5,
        nextReviewAt: Date.now(),
        reviewHistory: [],
      }

      vi.mocked(db.get).mockResolvedValueOnce(existingSchedule)

      const result = await updateReviewResult(flashcardId, 10)

      expect(result!.reviewHistory[0].quality).toBe(5)
    })

    it('should save updated schedule to database', async () => {
      const flashcardId = 'fc-save'
      const existingSchedule = {
        flashcardId,
        userId: 'default',
        interval: 1,
        repetition: 1,
        easiness: 2.5,
        nextReviewAt: Date.now(),
        reviewHistory: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      vi.mocked(db.get).mockResolvedValueOnce(existingSchedule)

      await updateReviewResult(flashcardId, 4)

      expect(db.set).toHaveBeenCalledWith(
        `review:${flashcardId}`,
        expect.objectContaining({
          flashcardId,
          repetition: 2,
        })
      )
    })
  })

  describe('getReviewStats', () => {
    it('should return zero stats for new user', async () => {
      // getReviewStats calls db.get for user-reviews, then calculateStreak calls db.get again
      vi.mocked(db.get)
        .mockResolvedValueOnce([]) // getReviewStats: user-reviews list
        .mockResolvedValueOnce([]) // calculateStreak: user-reviews list

      const result = await getReviewStats('new-user')

      expect(result).toEqual({
        totalCards: 0,
        dueToday: 0,
        completedToday: 0,
        streak: 0,
        averageEasiness: 2.5,
      })
    })

    it('should count total cards correctly', async () => {
      const userId = 'user-count'
      const flashcardIds = ['fc-1', 'fc-2', 'fc-3']

      // Mock for getReviewStats (first round) + calculateStreak (second round)
      vi.mocked(db.get)
        // First call in getReviewStats
        .mockResolvedValueOnce(flashcardIds)
        // Schedule lookups in getReviewStats
        .mockResolvedValueOnce({ flashcardId: 'fc-1', easiness: 2.5, nextReviewAt: Date.now() + 86400000, reviewHistory: [] })
        .mockResolvedValueOnce({ flashcardId: 'fc-2', easiness: 2.3, nextReviewAt: Date.now() + 86400000, reviewHistory: [] })
        .mockResolvedValueOnce({ flashcardId: 'fc-3', easiness: 2.7, nextReviewAt: Date.now() + 86400000, reviewHistory: [] })
        // Second call in calculateStreak
        .mockResolvedValueOnce(flashcardIds)
        // Schedule lookups in calculateStreak
        .mockResolvedValueOnce({ flashcardId: 'fc-1', easiness: 2.5, nextReviewAt: Date.now() + 86400000, reviewHistory: [] })
        .mockResolvedValueOnce({ flashcardId: 'fc-2', easiness: 2.3, nextReviewAt: Date.now() + 86400000, reviewHistory: [] })
        .mockResolvedValueOnce({ flashcardId: 'fc-3', easiness: 2.7, nextReviewAt: Date.now() + 86400000, reviewHistory: [] })

      const result = await getReviewStats(userId)

      expect(result.totalCards).toBe(3)
    })

    it('should calculate average easiness correctly', async () => {
      const userId = 'user-easiness'
      const flashcardIds = ['fc-1', 'fc-2']

      // Mock for getReviewStats (first round) + calculateStreak (second round)
      vi.mocked(db.get)
        // First call in getReviewStats
        .mockResolvedValueOnce(flashcardIds)
        // Schedule lookups in getReviewStats
        .mockResolvedValueOnce({ flashcardId: 'fc-1', easiness: 2.0, nextReviewAt: Date.now() + 86400000, reviewHistory: [] })
        .mockResolvedValueOnce({ flashcardId: 'fc-2', easiness: 3.0, nextReviewAt: Date.now() + 86400000, reviewHistory: [] })
        // Second call in calculateStreak
        .mockResolvedValueOnce(flashcardIds)
        // Schedule lookups in calculateStreak
        .mockResolvedValueOnce({ flashcardId: 'fc-1', easiness: 2.0, nextReviewAt: Date.now() + 86400000, reviewHistory: [] })
        .mockResolvedValueOnce({ flashcardId: 'fc-2', easiness: 3.0, nextReviewAt: Date.now() + 86400000, reviewHistory: [] })

      const result = await getReviewStats(userId)

      expect(result.averageEasiness).toBe(2.5)
    })

    it('should count due cards correctly', async () => {
      const now = Date.now()
      const userId = 'user-due-count'
      const flashcardIds = ['fc-1', 'fc-2', 'fc-3']

      const schedules = [
        { flashcardId: 'fc-1', easiness: 2.5, nextReviewAt: now - 1000, reviewHistory: [] },
        { flashcardId: 'fc-2', easiness: 2.5, nextReviewAt: now + 86400000, reviewHistory: [] },
        { flashcardId: 'fc-3', easiness: 2.5, nextReviewAt: now - 5000, reviewHistory: [] },
      ]

      vi.mocked(db.get)
        // getReviewStats phase
        .mockResolvedValueOnce(flashcardIds)
        .mockResolvedValueOnce(schedules[0])
        .mockResolvedValueOnce(schedules[1])
        .mockResolvedValueOnce(schedules[2])
        // calculateStreak phase
        .mockResolvedValueOnce(flashcardIds)
        .mockResolvedValueOnce(schedules[0])
        .mockResolvedValueOnce(schedules[1])
        .mockResolvedValueOnce(schedules[2])

      const result = await getReviewStats(userId)

      expect(result.dueToday).toBe(2)
    })

    it('should count completed reviews today', async () => {
      const now = Date.now()
      const todayStart = new Date().setHours(0, 0, 0, 0)
      const userId = 'user-completed'
      const flashcardIds = ['fc-1']

      const schedule = {
        flashcardId: 'fc-1',
        easiness: 2.5,
        nextReviewAt: now + 86400000,
        reviewHistory: [
          { date: todayStart + 3600000, quality: 4 },
          { date: todayStart + 7200000, quality: 5 },
          { date: now - 86400000, quality: 3 }, // Yesterday
        ],
      }

      vi.mocked(db.get)
        // getReviewStats phase
        .mockResolvedValueOnce(flashcardIds)
        .mockResolvedValueOnce(schedule)
        // calculateStreak phase
        .mockResolvedValueOnce(flashcardIds)
        .mockResolvedValueOnce(schedule)

      const result = await getReviewStats(userId)

      expect(result.completedToday).toBe(2)
    })
  })

  describe('deleteReviewSchedule', () => {
    it('should delete schedule from database', async () => {
      const flashcardId = 'fc-delete'
      const userId = 'user-delete'

      vi.mocked(db.get).mockResolvedValueOnce([flashcardId])

      await deleteReviewSchedule(flashcardId, userId)

      expect(db.delete).toHaveBeenCalledWith(`review:${flashcardId}`)
    })

    it('should remove flashcard from user list', async () => {
      const flashcardId = 'fc-remove'
      const userId = 'user-remove'

      vi.mocked(db.get).mockResolvedValueOnce([flashcardId, 'fc-other'])

      await deleteReviewSchedule(flashcardId, userId)

      expect(db.set).toHaveBeenCalledWith(
        `user-reviews:${userId}`,
        ['fc-other']
      )
    })

    it('should return true on success', async () => {
      const flashcardId = 'fc-success'
      const userId = 'user-success'

      vi.mocked(db.get).mockResolvedValueOnce([flashcardId])

      const result = await deleteReviewSchedule(flashcardId, userId)

      expect(result).toBe(true)
    })
  })

  describe('getQualityDescription', () => {
    it('should return correct descriptions for all quality levels', () => {
      expect(getQualityDescription(0)).toBe('complete-blackout')
      expect(getQualityDescription(1)).toBe('incorrect-response')
      expect(getQualityDescription(2)).toBe('incorrect-easy-recall')
      expect(getQualityDescription(3)).toBe('correct-difficult-recall')
      expect(getQualityDescription(4)).toBe('correct-hesitant-recall')
      expect(getQualityDescription(5)).toBe('perfect-response')
    })

    it('should return unknown for invalid quality', () => {
      expect(getQualityDescription(-1)).toBe('unknown')
      expect(getQualityDescription(6)).toBe('unknown')
      expect(getQualityDescription(NaN)).toBe('unknown')
    })
  })

  describe('getNextReviewDescription', () => {
    it('should describe 0 interval as in-20-minutes', () => {
      expect(getNextReviewDescription(0)).toBe('in-20-minutes')
    })

    it('should describe 1 day interval as in-1-day', () => {
      expect(getNextReviewDescription(1)).toBe('in-1-day')
    })

    it('should describe days less than 7', () => {
      expect(getNextReviewDescription(3)).toBe('in-3-days')
      expect(getNextReviewDescription(6)).toBe('in-6-days')
    })

    it('should describe weeks (7-30 days)', () => {
      expect(getNextReviewDescription(7)).toBe('in-1-weeks')
      expect(getNextReviewDescription(14)).toBe('in-2-weeks')
      expect(getNextReviewDescription(21)).toBe('in-3-weeks')
    })

    it('should describe months (30-365 days)', () => {
      expect(getNextReviewDescription(30)).toBe('in-1-months')
      expect(getNextReviewDescription(60)).toBe('in-2-months')
      expect(getNextReviewDescription(180)).toBe('in-6-months')
    })

    it('should describe max interval as in-1-year', () => {
      expect(getNextReviewDescription(365)).toBe('in-1-year')
      expect(getNextReviewDescription(400)).toBe('in-1-year')
    })
  })
})
