/**
 * SM-2 Algorithm Implementation (Frontend)
 *
 * This is a pure TypeScript implementation of the SuperMemo 2 algorithm
 * for client-side spaced repetition calculations.
 *
 * Based on: SuperMemo 2 algorithm by Piotr Wozniak
 * Reference: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

// SM-2 Algorithm Constants
const MIN_EASINESS = 1.3
const DEFAULT_EASINESS = 2.5

/**
 * SM-2 Algorithm Calculation Result
 */
export interface SM2Result {
  newInterval: number
  newRepetition: number
  newEasiness: number
}

/**
 * SM-2 Algorithm Core Function
 *
 * Calculates the next review interval, repetition count, and easiness factor
 * based on the user's quality rating.
 *
 * @param interval - Current interval in days
 * @param repetition - Number of successful repetitions so far
 * @param easiness - Current easiness factor (typically 1.3 to 2.5+)
 * @param quality - Quality of recall response (0-5)
 *   0 = Complete blackout
 *   1 = Incorrect response
 *   2 = Incorrect but easy to recall
 *   3 = Correct but difficult
 *   4 = Correct with hesitation
 *   5 = Perfect response
 *
 * @returns New interval, repetition, and easiness values
 *
 * @example
 * ```ts
 * const result = sm2(0, 0, 2.5, 5)
 * // { newInterval: 1, newRepetition: 1, newEasiness: 2.6 }
 * ```
 */
export function sm2(
  interval: number,
  repetition: number,
  easiness: number,
  quality: number
): SM2Result {
  // Clamp quality to valid range
  const q = Math.max(0, Math.min(5, quality))

  // Update easiness factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  let newEasiness = easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  newEasiness = Math.max(MIN_EASINESS, newEasiness)

  let newInterval: number
  let newRepetition: number

  if (q < 3) {
    // Failed recall - reset repetition and use short interval
    newRepetition = 0
    newInterval = 1 // Review tomorrow
  } else {
    // Successful recall
    newRepetition = repetition + 1

    if (newRepetition === 1) {
      newInterval = 1 // 1 day
    } else if (newRepetition === 2) {
      newInterval = 6 // 6 days
    } else {
      // I(n) = I(n-1) * EF
      newInterval = Math.round(interval * newEasiness)
    }
  }

  // Cap maximum interval at 365 days (1 year)
  newInterval = Math.min(newInterval, 365)

  return { newInterval, newRepetition, newEasiness }
}

/**
 * Calculate the next review timestamp
 *
 * @param interval - Current interval in days
 * @param repetition - Number of successful repetitions
 * @param easiness - Current easiness factor
 * @param quality - Quality rating (0-5)
 * @returns Unix timestamp of next review
 */
export function calculateNextReviewTime(
  interval: number,
  repetition: number,
  easiness: number,
  quality: number
): number {
  const { newInterval } = sm2(interval, repetition, easiness, quality)

  // Convert days to milliseconds
  const intervalMs = newInterval * 24 * 60 * 60 * 1000

  return Date.now() + intervalMs
}

/**
 * Get human-readable quality rating description
 *
 * @param quality - Quality rating (0-5)
 * @returns Description key
 */
export function getQualityDescription(quality: number): string {
  const descriptions: Record<number, string> = {
    0: 'complete-blackout',
    1: 'incorrect-response',
    2: 'incorrect-easy-recall',
    3: 'correct-difficult-recall',
    4: 'correct-hesitant-recall',
    5: 'perfect-response',
  }
  return descriptions[quality] || 'unknown'
}

/**
 * Get human-readable interval description
 *
 * @param interval - Interval in days
 * @returns Description key (e.g., 'in-3-days', 'in-2-weeks')
 */
export function getNextReviewDescription(interval: number): string {
  if (interval === 0) return 'in-20-minutes'
  if (interval === 1) return 'in-1-day'
  if (interval < 7) return `in-${interval}-days`
  if (interval < 30) return `in-${Math.round(interval / 7)}-weeks`
  if (interval < 365) return `in-${Math.round(interval / 30)}-months`
  return 'in-1-year'
}

/**
 * Calculate initial review time (20 minutes from now)
 *
 * @returns Unix timestamp
 */
export function getInitialReviewTime(): number {
  return Date.now() + 20 * 60 * 1000
}

/**
 * SM-2 Calculator Class
 *
 * Stateful calculator for tracking card review progress
 */
export class SM2Calculator {
  private interval: number
  private repetition: number
  private easiness: number

  constructor(
    interval: number = 0,
    repetition: number = 0,
    easiness: number = DEFAULT_EASINESS
  ) {
    this.interval = interval
    this.repetition = repetition
    this.easiness = easiness
  }

  /**
   * Process a review with the given quality
   */
  review(quality: number): SM2Result {
    const result = sm2(this.interval, this.repetition, this.easiness, quality)

    this.interval = result.newInterval
    this.repetition = result.newRepetition
    this.easiness = result.newEasiness

    return result
  }

  /**
   * Get current state
   */
  getState(): { interval: number; repetition: number; easiness: number } {
    return {
      interval: this.interval,
      repetition: this.repetition,
      easiness: this.easiness,
    }
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.interval = 0
    this.repetition = 0
    this.easiness = DEFAULT_EASINESS
  }

  /**
   * Get next review timestamp
   */
  getNextReviewTime(quality: number): number {
    return calculateNextReviewTime(this.interval, this.repetition, this.easiness, quality)
  }

  /**
   * Get human-readable next review description
   */
  getNextReviewDescription(quality: number): string {
    const { newInterval } = sm2(this.interval, this.repetition, this.easiness, quality)
    return getNextReviewDescription(newInterval)
  }
}
