import db from '../utils/database/keyv'

// Review Schedule Data Model
export interface ReviewSchedule {
  flashcardId: string
  userId: string
  nextReviewAt: number
  interval: number
  repetition: number
  easiness: number
  reviewHistory: {
    date: number
    quality: number
  }[]
  createdAt: number
  updatedAt: number
}

// SM-2 Algorithm Parameters
const MIN_EASINESS = 1.3
const DEFAULT_EASINESS = 2.5
const INITIAL_INTERVALS = [0, 1, 6] // Days for first 3 repetitions

// Ebbinghaus forgetting curve intervals (in minutes)
const SHORT_TERM_INTERVALS = [
  20,     // 20 minutes
  60,     // 1 hour
  540,    // 9 hours
  1440,   // 1 day
  2880,   // 2 days
  8640,   // 6 days
  44640,  // 31 days
]

/**
 * SM-2 Algorithm Implementation
 * @param interval - Current interval in days
 * @param repetition - Number of successful repetitions
 * @param easiness - Easiness factor (1.3-2.5)
 * @param quality - Quality of response (0-5, where 0=complete blackout, 5=perfect)
 * @returns New interval, repetition count, and easiness factor
 */
export function sm2(
  interval: number,
  repetition: number,
  easiness: number,
  quality: number
): { newInterval: number; newRepetition: number; newEasiness: number } {
  // Clamp quality to valid range
  const q = Math.max(0, Math.min(5, quality))

  // Update easiness factor
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
      newInterval = 1
    } else if (newRepetition === 2) {
      newInterval = 6
    } else {
      newInterval = Math.round(interval * newEasiness)
    }
  }

  // Cap maximum interval at 365 days
  newInterval = Math.min(newInterval, 365)

  return { newInterval, newRepetition, newEasiness }
}

/**
 * Calculate initial review time based on Ebbinghaus curve
 * First review is 20 minutes after creation
 */
export function getInitialReviewTime(): number {
  return Date.now() + 20 * 60 * 1000 // 20 minutes in milliseconds
}

/**
 * Calculate next review time based on quality rating
 */
export function calculateNextReviewTime(
  currentInterval: number,
  repetition: number,
  easiness: number,
  quality: number
): number {
  const { newInterval } = sm2(currentInterval, repetition, easiness, quality)

  // Convert days to milliseconds
  const intervalMs = newInterval * 24 * 60 * 60 * 1000

  return Date.now() + intervalMs
}

/**
 * Create a new review schedule for a flashcard
 */
export async function scheduleReview(
  flashcardId: string,
  userId: string = 'default'
): Promise<ReviewSchedule> {
  const schedule: ReviewSchedule = {
    flashcardId,
    userId,
    nextReviewAt: getInitialReviewTime(),
    interval: 0,
    repetition: 0,
    easiness: DEFAULT_EASINESS,
    reviewHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  // Save to database
  await db.set(`review:${flashcardId}`, schedule)

  // Add to user's review list
  const userReviews = (await db.get(`user-reviews:${userId}`)) || []
  if (!userReviews.includes(flashcardId)) {
    userReviews.push(flashcardId)
    await db.set(`user-reviews:${userId}`, userReviews)
  }

  return schedule
}

/**
 * Get all due reviews for a user
 */
export async function getDueReviews(userId: string = 'default'): Promise<ReviewSchedule[]> {
  const userReviews: string[] = (await db.get(`user-reviews:${userId}`)) || []
  const now = Date.now()
  const dueReviews: ReviewSchedule[] = []

  for (const flashcardId of userReviews) {
    const schedule = await db.get(`review:${flashcardId}`)
    if (schedule && schedule.nextReviewAt <= now) {
      dueReviews.push(schedule)
    }
  }

  // Sort by next review time (oldest first)
  return dueReviews.sort((a, b) => a.nextReviewAt - b.nextReviewAt)
}

/**
 * Get all review schedules for a user (including future reviews)
 */
export async function getAllReviews(userId: string = 'default'): Promise<ReviewSchedule[]> {
  const userReviews: string[] = (await db.get(`user-reviews:${userId}`)) || []
  const reviews: ReviewSchedule[] = []

  for (const flashcardId of userReviews) {
    const schedule = await db.get(`review:${flashcardId}`)
    if (schedule) {
      reviews.push(schedule)
    }
  }

  return reviews.sort((a, b) => a.nextReviewAt - b.nextReviewAt)
}

/**
 * Update review result after user reviews a card
 * @param flashcardId - The flashcard ID
 * @param quality - Quality rating (0-5)
 * @returns Updated schedule
 */
export async function updateReviewResult(
  flashcardId: string,
  quality: number
): Promise<ReviewSchedule | null> {
  const schedule: ReviewSchedule | undefined = await db.get(`review:${flashcardId}`)

  if (!schedule) {
    return null
  }

  // Clamp quality to valid range
  const q = Math.max(0, Math.min(5, quality))

  // Add to review history
  schedule.reviewHistory.push({
    date: Date.now(),
    quality: q,
  })

  // Apply SM-2 algorithm
  const { newInterval, newRepetition, newEasiness } = sm2(
    schedule.interval,
    schedule.repetition,
    schedule.easiness,
    q
  )

  // Update schedule
  schedule.interval = newInterval
  schedule.repetition = newRepetition
  schedule.easiness = newEasiness
  schedule.nextReviewAt = Date.now() + newInterval * 24 * 60 * 60 * 1000
  schedule.updatedAt = Date.now()

  // Save updated schedule
  await db.set(`review:${flashcardId}`, schedule)

  return schedule
}

/**
 * Get review statistics for a user
 */
export async function getReviewStats(userId: string = 'default'): Promise<{
  totalCards: number
  dueToday: number
  completedToday: number
  streak: number
  averageEasiness: number
}> {
  const userReviews: string[] = (await db.get(`user-reviews:${userId}`)) || []
  const now = Date.now()
  const todayStart = new Date().setHours(0, 0, 0, 0)

  let dueToday = 0
  let completedToday = 0
  let totalEasiness = 0
  let validCards = 0

  for (const flashcardId of userReviews) {
    const schedule: ReviewSchedule | undefined = await db.get(`review:${flashcardId}`)
    if (!schedule) continue

    validCards++
    totalEasiness += schedule.easiness

    if (schedule.nextReviewAt <= now) {
      dueToday++
    }

    // Count reviews completed today
    const todayReviews = schedule.reviewHistory.filter(
      (h) => h.date >= todayStart
    )
    completedToday += todayReviews.length
  }

  // Calculate streak (simplified - consecutive days with reviews)
  const streak = await calculateStreak(userId)

  return {
    totalCards: validCards,
    dueToday,
    completedToday,
    streak,
    averageEasiness: validCards > 0 ? totalEasiness / validCards : DEFAULT_EASINESS,
  }
}

/**
 * Calculate review streak
 */
async function calculateStreak(userId: string): Promise<number> {
  const userReviews: string[] = (await db.get(`user-reviews:${userId}`)) || []
  const reviewDays = new Set<number>()

  for (const flashcardId of userReviews) {
    const schedule: ReviewSchedule | undefined = await db.get(`review:${flashcardId}`)
    if (!schedule) continue

    for (const history of schedule.reviewHistory) {
      const day = new Date(history.date).setHours(0, 0, 0, 0)
      reviewDays.add(day)
    }
  }

  const sortedDays = Array.from(reviewDays).sort((a, b) => b - a)

  if (sortedDays.length === 0) return 0

  // Check if reviewed today
  const today = new Date().setHours(0, 0, 0, 0)
  const yesterday = today - 24 * 60 * 60 * 1000

  if (sortedDays[0] !== today && sortedDays[0] !== yesterday) {
    return 0 // Streak broken
  }

  // Count consecutive days
  let streak = 1
  for (let i = 1; i < sortedDays.length; i++) {
    const expectedPrevDay = sortedDays[i - 1] - 24 * 60 * 60 * 1000
    if (sortedDays[i] === expectedPrevDay || sortedDays[i] === sortedDays[i - 1]) {
      if (sortedDays[i] !== sortedDays[i - 1]) {
        streak++
      }
    } else {
      break
    }
  }

  return streak
}

/**
 * Delete review schedule for a flashcard
 */
export async function deleteReviewSchedule(
  flashcardId: string,
  userId: string = 'default'
): Promise<boolean> {
  await db.delete(`review:${flashcardId}`)

  // Remove from user's review list
  const userReviews: string[] = (await db.get(`user-reviews:${userId}`)) || []
  const updated = userReviews.filter((id) => id !== flashcardId)
  await db.set(`user-reviews:${userId}`, updated)

  return true
}

/**
 * Get quality rating description
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
 * Get next review time description
 */
export function getNextReviewDescription(interval: number): string {
  if (interval === 0) return 'in-20-minutes'
  if (interval === 1) return 'in-1-day'
  if (interval < 7) return `in-${interval}-days`
  if (interval < 30) return `in-${Math.round(interval / 7)}-weeks`
  if (interval < 365) return `in-${Math.round(interval / 30)}-months`
  return 'in-1-year'
}
