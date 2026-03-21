/**
 * SM-2 Algorithm Unit Tests
 *
 * Test-Driven Development: GREEN Phase
 * These tests validate the SM-2 algorithm implementation in the frontend.
 *
 * The SM-2 algorithm is used for spaced repetition scheduling.
 * Based on: SuperMemo 2 algorithm by Piotr Wozniak
 */

import { describe, it, expect } from 'vitest'
import { sm2, calculateNextReviewTime, getQualityDescription, getNextReviewDescription, SM2Calculator } from '@/lib/algorithms/sm2'

describe('SM-2 Algorithm', () => {
  describe('sm2 function', () => {
    describe('quality rating boundaries', () => {
      it('should clamp quality to minimum 0', () => {
        const result = sm2(1, 0, 2.5, -1)
        expect(result.newEasiness).toBeLessThan(2.5)
        expect(result.newRepetition).toBe(0)
      })

      it('should clamp quality to maximum 5', () => {
        const result = sm2(1, 0, 2.5, 10)
        expect(result.newEasiness).toBeGreaterThan(2.5)
        expect(result.newRepetition).toBe(1)
      })

      it('should accept valid quality range (0-5)', () => {
        expect(() => sm2(1, 0, 2.5, 0)).not.toThrow()
        expect(() => sm2(1, 0, 2.5, 3)).not.toThrow()
        expect(() => sm2(1, 0, 2.5, 5)).not.toThrow()
      })
    })

    describe('easiness factor calculation', () => {
      it('should increase easiness for quality 5 (perfect response)', () => {
        const result = sm2(1, 0, 2.5, 5)
        expect(result.newEasiness).toBeCloseTo(2.6, 1)
      })

      it('should slightly change easiness for quality 4', () => {
        const result = sm2(1, 0, 2.5, 4)
        expect(result.newEasiness).toBeCloseTo(2.5, 1)
      })

      it('should decrease easiness for quality 3', () => {
        const result = sm2(1, 0, 2.5, 3)
        expect(result.newEasiness).toBeCloseTo(2.36, 1)
      })

      it('should significantly decrease easiness for quality 0-1', () => {
        const result0 = sm2(1, 0, 2.5, 0)
        const result1 = sm2(1, 0, 2.5, 1)
        expect(result0.newEasiness).toBeLessThan(2.0)
        expect(result1.newEasiness).toBeLessThan(2.2)
      })

      it('should never decrease easiness below 1.3', () => {
        // Start with minimum easiness and give worst response
        const result = sm2(1, 0, 1.3, 0)
        expect(result.newEasiness).toBeGreaterThanOrEqual(1.3)
      })
    })

    describe('interval calculation for successful recall (quality >= 3)', () => {
      it('should set interval to 1 day for first successful repetition', () => {
        const result = sm2(0, 0, 2.5, 5)
        expect(result.newInterval).toBe(1)
        expect(result.newRepetition).toBe(1)
      })

      it('should set interval to 6 days for second successful repetition', () => {
        const result = sm2(1, 1, 2.5, 5)
        expect(result.newInterval).toBe(6)
        expect(result.newRepetition).toBe(2)
      })

      it('should multiply interval by easiness for subsequent repetitions', () => {
        const result = sm2(6, 2, 2.5, 5)
        // After quality 5, EF becomes 2.6
        // I(3) = 6 * 2.6 = 15.6, rounded to 16
        expect(result.newInterval).toBe(Math.round(6 * 2.6))
        expect(result.newRepetition).toBe(3)
      })

      it('should cap interval at 365 days (1 year)', () => {
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

  describe('calculateNextReviewTime', () => {
    it('should calculate review time in milliseconds from now', () => {
      const now = Date.now()
      const result = calculateNextReviewTime(1, 0, 2.5, 5)
      const dayInMs = 24 * 60 * 60 * 1000

      expect(result).toBeGreaterThanOrEqual(now + dayInMs)
      expect(result).toBeLessThanOrEqual(now + dayInMs * 2)
    })

    it('should return a timestamp', () => {
      const result = calculateNextReviewTime(1, 0, 2.5, 5)
      expect(result).toBeGreaterThan(Date.now())
    })

    it('should handle failed recall (1 day interval)', () => {
      const result = calculateNextReviewTime(10, 5, 2.5, 2)
      const dayInMs = 24 * 60 * 60 * 1000
      const expectedMin = Date.now() + dayInMs
      const expectedMax = Date.now() + dayInMs * 2

      expect(result).toBeGreaterThanOrEqual(expectedMin)
      expect(result).toBeLessThanOrEqual(expectedMax)
    })
  })

  describe('getQualityDescription', () => {
    it('should return correct descriptions for each quality level', () => {
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
    })

    it('should describe months (30-365 days)', () => {
      expect(getNextReviewDescription(30)).toBe('in-1-months')
      expect(getNextReviewDescription(60)).toBe('in-2-months')
    })

    it('should describe max interval as in-1-year', () => {
      expect(getNextReviewDescription(365)).toBe('in-1-year')
      expect(getNextReviewDescription(400)).toBe('in-1-year')
    })
  })

  describe('SM2Calculator class', () => {
    it('should initialize with default values', () => {
      const calc = new SM2Calculator()
      const state = calc.getState()

      expect(state.interval).toBe(0)
      expect(state.repetition).toBe(0)
      expect(state.easiness).toBe(2.5)
    })

    it('should initialize with custom values', () => {
      const calc = new SM2Calculator(10, 5, 2.0)
      const state = calc.getState()

      expect(state.interval).toBe(10)
      expect(state.repetition).toBe(5)
      expect(state.easiness).toBe(2.0)
    })

    it('should update state after review', () => {
      const calc = new SM2Calculator()
      const result = calc.review(5)

      expect(result.newRepetition).toBe(1)
      expect(calc.getState().repetition).toBe(1)
    })

    it('should track multiple reviews', () => {
      const calc = new SM2Calculator()

      calc.review(5) // 1st
      expect(calc.getState().repetition).toBe(1)

      calc.review(5) // 2nd
      expect(calc.getState().repetition).toBe(2)

      calc.review(5) // 3rd
      expect(calc.getState().repetition).toBe(3)
    })

    it('should reset to initial state', () => {
      const calc = new SM2Calculator()
      calc.review(5)
      calc.review(5)
      calc.reset()

      const state = calc.getState()
      expect(state.interval).toBe(0)
      expect(state.repetition).toBe(0)
      expect(state.easiness).toBe(2.5)
    })

    it('should calculate next review time', () => {
      const calc = new SM2Calculator()
      const nextTime = calc.getNextReviewTime(5)

      expect(nextTime).toBeGreaterThan(Date.now())
    })

    it('should get next review description', () => {
      const calc = new SM2Calculator()
      const desc = calc.getNextReviewDescription(5)

      expect(desc).toBe('in-1-day')
    })
  })

  describe('algorithm consistency', () => {
    it('should produce consistent results for same inputs', () => {
      const input = { interval: 6, repetition: 2, easiness: 2.5, quality: 4 }
      const result1 = sm2(input.interval, input.repetition, input.easiness, input.quality)
      const result2 = sm2(input.interval, input.repetition, input.easiness, input.quality)

      expect(result1).toEqual(result2)
    })

    it('should handle series of successful reviews', () => {
      // Simulate a card being reviewed multiple times successfully
      let state = { interval: 0, repetition: 0, easiness: 2.5 }

      // First review (quality 5)
      let result = sm2(state.interval, state.repetition, state.easiness, 5)
      state = { interval: result.newInterval, repetition: result.newRepetition, easiness: result.newEasiness }
      expect(state.repetition).toBe(1)
      expect(state.interval).toBe(1)

      // Second review (quality 5)
      result = sm2(state.interval, state.repetition, state.easiness, 5)
      state = { interval: result.newInterval, repetition: result.newRepetition, easiness: result.newEasiness }
      expect(state.repetition).toBe(2)
      expect(state.interval).toBe(6)

      // Third review (quality 4)
      result = sm2(state.interval, state.repetition, state.easiness, 4)
      state = { interval: result.newInterval, repetition: result.newRepetition, easiness: result.newEasiness }
      expect(state.repetition).toBe(3)
      expect(state.interval).toBe(Math.round(6 * 2.6))
    })

    it('should handle failure after success', () => {
      // Start with a well-learned card
      let state = { interval: 30, repetition: 10, easiness: 2.7 }

      // User forgets (quality 1)
      const result = sm2(state.interval, state.repetition, state.easiness, 1)

      expect(result.newRepetition).toBe(0)
      expect(result.newInterval).toBe(1)
      expect(result.newEasiness).toBeLessThan(state.easiness)
    })
  })
})
