/**
 * Reports Service Unit Tests
 *
 * Tests for weekly report generation, share tokens, and report retrieval.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock crypto before imports
vi.mock('crypto', () => ({
  default: {
    randomUUID: vi.fn(() => 'test-token-uuid-123'),
    randomBytes: vi.fn(() => Buffer.from('test-random-bytes')),
  },
  randomUUID: vi.fn(() => 'test-token-uuid-123'),
  randomBytes: vi.fn(() => Buffer.from('test-random-bytes')),
}))

// Mock database before imports
vi.mock('../../../src/utils/database/keyv', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}))

import db from '../../../src/utils/database/keyv'
import {
  generateWeeklyReport,
  createShareToken,
  validateShareToken,
  cleanupExpiredTokens,
  getWeeklyReportByToken,
} from '../../../src/services/reports'

describe('Reports Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    vi.mocked(db.get).mockResolvedValue(undefined)
    vi.mocked(db.set).mockResolvedValue(undefined)
    vi.mocked(db.delete).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---------------------------------------------------------------------------
  // generateWeeklyReport
  // ---------------------------------------------------------------------------

  describe('generateWeeklyReport', () => {
    it('should return a WeeklyReport object with required fields', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const report = await generateWeeklyReport('user-1')

      expect(report).toHaveProperty('week')
      expect(report).toHaveProperty('startDate')
      expect(report).toHaveProperty('endDate')
      expect(report).toHaveProperty('summary')
      expect(report).toHaveProperty('dailyStats')
      expect(report).toHaveProperty('subjectDistribution')
      expect(report).toHaveProperty('weakAreas')
      expect(report).toHaveProperty('suggestions')
      expect(report).toHaveProperty('comparison')
    })

    it('should have correct summary fields', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const report = await generateWeeklyReport('user-1')

      expect(report.summary).toHaveProperty('totalStudyTime')
      expect(report.summary).toHaveProperty('studyDays')
      expect(report.summary).toHaveProperty('newTopics')
      expect(report.summary).toHaveProperty('flashcardsCreated')
      expect(report.summary).toHaveProperty('notesCreated')
      expect(report.summary).toHaveProperty('quizzesCompleted')
      expect(report.summary).toHaveProperty('averageAccuracy')
    })

    it('should return zero summary stats for empty database', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const report = await generateWeeklyReport('user-1')

      expect(report.summary.totalStudyTime).toBe(0)
      expect(report.summary.studyDays).toBe(0)
      expect(report.summary.flashcardsCreated).toBe(0)
      expect(report.summary.quizzesCompleted).toBe(0)
    })

    it('should have 7 daily stats entries', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const report = await generateWeeklyReport('user-1')

      expect(report.dailyStats).toHaveLength(7)
    })

    it('should accept a specific week string', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const report = await generateWeeklyReport('user-1', '2025-W03')

      expect(report.week).toBe('2025-W03')
    })

    it('should fall back to current week calculations for invalid week strings', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-18T12:00:00.000Z'))
      vi.mocked(db.get).mockResolvedValue([])

      const report = await generateWeeklyReport('user-1', 'bad-week')

      expect(report.week).toBe('bad-week')
      expect(report.startDate).toBe(new Date(2026, 2, 15, 0, 0, 0, 0).getTime())
      expect(report.endDate).toBe(new Date(2026, 2, 22, 0, 0, 0, 0).getTime())
      expect(report.dailyStats).toHaveLength(7)
    })

    it('should reduce studyTimeChange when fallback comparison flashcards exist for invalid week strings', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-18T12:00:00.000Z'))
      const comparisonWindowFlashcards = [
        { id: 'comparison-flashcard', tag: 'math', created: new Date(2026, 2, 16, 12, 0, 0, 0).getTime() },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce(comparisonWindowFlashcards)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const report = await generateWeeklyReport('user-1', 'bad-week')

      expect(report.summary.flashcardsCreated).toBe(1)
      expect(report.summary.totalStudyTime).toBe(0)
      expect(report.comparison.studyTimeChange).toBe(-100)
    })

    it('should count flashcards created this week', async () => {
      const now = Date.now()
      const flashcards = [
        { id: 'fc-1', tag: 'math', created: now - 1000 }, // This week
        { id: 'fc-2', tag: 'physics', created: now - 2000 }, // This week
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce(flashcards) // flashcards
        .mockResolvedValueOnce([])          // chats
        .mockResolvedValueOnce([])          // quiz_results
        .mockResolvedValueOnce([])          // smartnotes_results

      const report = await generateWeeklyReport('user-1')

      expect(report.summary.flashcardsCreated).toBe(2)
    })

    it('should count quizzes completed this week', async () => {
      const now = Date.now()
      const quizResults = [
        { id: 'qr-1', completedAt: now - 1000, correctCount: 8, totalCount: 10 },
        { id: 'qr-2', completedAt: now - 2000, correctCount: 6, totalCount: 10 },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce([])          // flashcards
        .mockResolvedValueOnce([])          // chats
        .mockResolvedValueOnce(quizResults) // quiz_results
        .mockResolvedValueOnce([])          // smartnotes_results

      const report = await generateWeeklyReport('user-1')

      expect(report.summary.quizzesCompleted).toBe(2)
    })

    it('should return 0 averageAccuracy when no quiz data exists', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const report = await generateWeeklyReport('user-1')

      expect(report.summary.averageAccuracy).toBe(0)
    })

    it('should include comparison object with change metrics', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const report = await generateWeeklyReport('user-1')

      expect(report.comparison).toHaveProperty('studyTimeChange')
      expect(report.comparison).toHaveProperty('accuracyChange')
      expect(typeof report.comparison.studyTimeChange).toBe('number')
      expect(typeof report.comparison.accuracyChange).toBe('number')
    })

    it('should calculate accuracy change when previous week has quiz data', async () => {
      const currentWeekQuiz = [
        { id: 'qr-current', correctCount: 8, totalCount: 10, completedAt: weekDay(2) },
        { id: 'qr-prev', correctCount: 5, totalCount: 10, completedAt: PREVIOUS_WEEK_DAY },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(currentWeekQuiz)
        .mockResolvedValueOnce([])
        .mockResolvedValue([])

      const report = await generateWeeklyReport('user-1', TEST_WEEK)

      expect(report.summary.averageAccuracy).toBe(80)
      expect(report.comparison.accuracyChange).toBe(30)
    })

    it('should include weakAreas as an array', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const report = await generateWeeklyReport('user-1')

      expect(Array.isArray(report.weakAreas)).toBe(true)
    })

    it('should include suggestions as an array', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const report = await generateWeeklyReport('user-1')

      expect(Array.isArray(report.suggestions)).toBe(true)
    })

    // ---- generateSuggestions branch coverage ----
    const DAY_MS = 24 * 60 * 60 * 1000
    const NOON_MS = 12 * 60 * 60 * 1000
    const TEST_WEEK = '2026-W12'
    const TEST_WEEK_START = new Date(2026, 2, 22, 0, 0, 0, 0).getTime()
    const PREVIOUS_WEEK_DAY = TEST_WEEK_START - DAY_MS + NOON_MS

    function weekDay(n: number): number {
      return TEST_WEEK_START + n * DAY_MS + NOON_MS
    }

    it('should suggest "Excellent quiz performance!" when accuracy > 85%', async () => {
      // 9/10 = 90% accuracy -> triggers the > 85 branch
      const midWeek = weekDay(3)
      const quizResults = [
        { id: 'qr-1', correctCount: 9, totalCount: 10, completedAt: midWeek },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce([])          // flashcards
        .mockResolvedValueOnce([])          // chats
        .mockResolvedValueOnce(quizResults) // quiz_results
        .mockResolvedValueOnce([])          // smartnotes_results
        .mockResolvedValue([])              // prev week calls

      const report = await generateWeeklyReport('user-1', TEST_WEEK)

      expect(report.suggestions.some(s => s.includes('Excellent quiz performance'))).toBe(true)
    })

    it('should include weak area topics in suggestions when quiz accuracy < 60%', async () => {
      // 2/10 = 20% accuracy -> triggers weakAreas branch
      const midWeek = weekDay(3)
      const quizResults = [
        { id: 'qr-weak', correctCount: 2, totalCount: 10, topic: 'Quantum Mechanics', completedAt: midWeek },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce([])          // flashcards
        .mockResolvedValueOnce([])          // chats
        .mockResolvedValueOnce(quizResults) // quiz_results
        .mockResolvedValueOnce([])          // smartnotes_results
        .mockResolvedValue([])              // prev week calls

      const report = await generateWeeklyReport('user-1', TEST_WEEK)

      expect(report.weakAreas).toContain('Quantum Mechanics')
      expect(report.suggestions.some(s => s.includes('Quantum Mechanics'))).toBe(true)
    })

    it('should suggest "Great study consistency!" when studyDays >= 5', async () => {
      // 5 chats on 5 different days within the week -> studyDays = 5
      // 7/10 = 70% accuracy (not < 60, not > 85 -> no accuracy suggestion)
      // 1 flashcard, 1 quiz -> no missing-flashcard or missing-quiz suggestions
      // totalStudyTime = 5 * 15 = 75 >= 60 -> no study-time suggestion
      // No weak areas -> no weakAreas suggestion
      // -> only "Great study consistency!" should be in suggestions
      const chats = [
        { id: 'c1', createdAt: weekDay(0) },
        { id: 'c2', createdAt: weekDay(1) },
        { id: 'c3', createdAt: weekDay(2) },
        { id: 'c4', createdAt: weekDay(3) },
        { id: 'c5', createdAt: weekDay(4) },
      ]
      const quizResults = [
        { id: 'qr-good', correctCount: 7, totalCount: 10, completedAt: weekDay(2) },
      ]
      const flashcards = [
        { id: 'fc-good', created: weekDay(1) },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce(flashcards)  // flashcards
        .mockResolvedValueOnce(chats)       // chats
        .mockResolvedValueOnce(quizResults) // quiz_results
        .mockResolvedValueOnce([])          // smartnotes_results
        .mockResolvedValue([])              // prev week calls

      const report = await generateWeeklyReport('user-1', TEST_WEEK)

      expect(report.suggestions.some(s => s.includes('Great study consistency'))).toBe(true)
    })

    it('should suggest "Keep up the good work!" when no conditions trigger suggestions', async () => {
      // Conditions that trigger NO suggestions:
      // studyDays = 4 (not < 3 and not >= 5)
      // totalStudyTime = 4 * 15 = 60 (not < 60)
      // averageAccuracy = 70% (not < 60, not > 85)
      // no weak areas (accuracy >= 60%)
      // flashcardsCreated = 1 (not 0)
      // quizzesCompleted = 1 (not 0)
      // -> suggestions empty -> fallback fires
      const chats = [
        { id: 'c1', createdAt: weekDay(0) },
        { id: 'c2', createdAt: weekDay(1) },
        { id: 'c3', createdAt: weekDay(2) },
        { id: 'c4', createdAt: weekDay(3) },
      ]
      const quizResults = [
        { id: 'qr-mid', correctCount: 7, totalCount: 10, completedAt: weekDay(2) },
      ]
      const flashcards = [
        { id: 'fc-ok', created: weekDay(1) },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce(flashcards)  // flashcards
        .mockResolvedValueOnce(chats)       // chats
        .mockResolvedValueOnce(quizResults) // quiz_results
        .mockResolvedValueOnce([])          // smartnotes_results
        .mockResolvedValue([])              // prev week calls

      const report = await generateWeeklyReport('user-1', TEST_WEEK)

      expect(report.suggestions).toContain('Keep up the good work! Regular practice leads to mastery')
    })

    it('should generate subject distribution', async () => {
      const now = Date.now()
      const flashcards = [
        { id: 'fc-1', tag: 'mechanics', question: 'Physics question', created: now - 1000 },
        { id: 'fc-2', tag: 'algebra', question: 'Math equation', created: now - 2000 },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce(flashcards) // flashcards
        .mockResolvedValueOnce([])          // chats
        .mockResolvedValueOnce([])          // quiz_results
        .mockResolvedValueOnce([])          // smartnotes_results

      const report = await generateWeeklyReport('user-1')

      expect(report.subjectDistribution).toHaveLength(2)
      expect(report.subjectDistribution).toEqual(
        expect.arrayContaining([
          { subject: 'Physics', percentage: 50 },
          { subject: 'Mathematics', percentage: 50 },
        ])
      )
    })

    it('should handle week 1 (getPreviousWeek returns last week of previous year)', async () => {
      // Week 1 of any year -> previous week is last week of previous year
      vi.mocked(db.get).mockResolvedValue([])

      const report = await generateWeeklyReport('user-1', '2026-W01')

      // Should not throw and should return valid report
      expect(report.week).toBe('2026-W01')
      expect(report).toHaveProperty('summary')
    })

    it('should include notes in the report when smartnotes have createdAt', async () => {
      // This covers the weekNotes filter with createdAt present (lines 155-156)
      const midWeek = weekDay(3)
      const notes = [
        { id: 'note-1', createdAt: midWeek, title: 'My Smart Note' },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce([])    // flashcards
        .mockResolvedValueOnce([])    // chats
        .mockResolvedValueOnce([])    // quiz_results
        .mockResolvedValueOnce(notes) // smartnotes_results
        .mockResolvedValue([])        // prev week calls

      const report = await generateWeeklyReport('user-1', TEST_WEEK)

      expect(report.summary.notesCreated).toBe(1)
    })

    it('should count fallback chat and note timestamps in the active dailyStats bucket', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-18T12:00:00.000Z'))
      const chats = [{ id: 'chat-fallback' }]
      const notes = [{ id: 'note-fallback', title: 'Untimed note' }]

      vi.mocked(db.get)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(chats)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(notes)

      const report = await generateWeeklyReport('user-1')
      const activeDay = report.dailyStats.find(day => day.studyTime === 15)

      expect(report.summary.totalStudyTime).toBe(15)
      expect(report.summary.studyDays).toBe(1)
      expect(report.summary.notesCreated).toBe(1)
      expect(activeDay).toEqual({ date: '2026-03-17', studyTime: 15, topics: 0 })
    })

    it('should place fallback flashcards into the active dailyStats topic bucket', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-18T12:00:00.000Z'))
      const flashcards = [{ id: 'fc-fallback', tag: 'math' }]

      vi.mocked(db.get)
        .mockResolvedValueOnce(flashcards)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const report = await generateWeeklyReport('user-1')
      const activeDay = report.dailyStats.find(day => day.topics === 1)

      expect(report.summary.flashcardsCreated).toBe(1)
      expect(activeDay).toEqual({ date: '2026-03-17', studyTime: 0, topics: 1 })
    })

    it('should use subject name fallback for unknown subjects in distribution', async () => {
      // This covers SUBJECT_NAMES[subject as Subject] || subject fallback (line 227)
      const midWeek = weekDay(3)
      const quizResults = [
        {
          id: 'qr-custom',
          correctCount: 5,
          totalCount: 10,
          completedAt: midWeek,
          subject: 'computer_science', // not in SUBJECT_NAMES keys
          topic: 'algorithms',
        },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce([])          // flashcards
        .mockResolvedValueOnce([])          // chats
        .mockResolvedValueOnce(quizResults) // quiz_results
        .mockResolvedValueOnce([])          // smartnotes_results
        .mockResolvedValue([])              // prev week calls

      const report = await generateWeeklyReport('user-1', TEST_WEEK)

      expect(report.subjectDistribution).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ subject: 'computer_science' }),
        ])
      )
    })

    it('should assign subject percentage and skip weak area when quiz totalCount is zero', async () => {
      const quizResults = [
        {
          id: 'qr-zero',
          correctCount: 0,
          totalCount: 0,
          completedAt: weekDay(2),
          subject: 'math',
          topic: 'Algebra',
        },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(quizResults)
        .mockResolvedValueOnce([])
        .mockResolvedValue([])

      const report = await generateWeeklyReport('user-1', TEST_WEEK)

      expect(report.subjectDistribution).toEqual([
        { subject: 'Mathematics', percentage: 100 },
      ])
      expect(report.weakAreas).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // createShareToken
  // ---------------------------------------------------------------------------

  describe('createShareToken', () => {
    it('should return a token string', async () => {
      const token = await createShareToken('user-1', '2025-W03')

      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('should save token list to database', async () => {
      vi.mocked(db.get).mockResolvedValueOnce([]) // existing tokens (empty)

      await createShareToken('user-1', '2025-W03')

      expect(db.set).toHaveBeenCalled()
    })

    it('should store token with userId and week in array', async () => {
      vi.mocked(db.get).mockResolvedValueOnce([]) // existing tokens (empty)

      await createShareToken('user-1', '2025-W03')

      // Tokens are stored as an array
      const setCall = vi.mocked(db.set).mock.calls[0]
      const tokenArray = setCall[1] as any[]

      expect(Array.isArray(tokenArray)).toBe(true)
      expect(tokenArray[0]).toHaveProperty('userId', 'user-1')
      expect(tokenArray[0]).toHaveProperty('week', '2025-W03')
    })

    it('should store token with expiration time', async () => {
      const before = Date.now()
      vi.mocked(db.get).mockResolvedValueOnce([])

      await createShareToken('user-1', '2025-W03')

      const setCall = vi.mocked(db.set).mock.calls[0]
      const tokenArray = setCall[1] as any[]

      expect(tokenArray[0]).toHaveProperty('expiresAt')
      expect(tokenArray[0].expiresAt).toBeGreaterThan(before)
    })

    it('should include token value in stored data', async () => {
      vi.mocked(db.get).mockResolvedValueOnce([])

      const token = await createShareToken('user-1', '2025-W03')

      const setCall = vi.mocked(db.set).mock.calls[0]
      const tokenArray = setCall[1] as any[]

      expect(tokenArray[0]).toHaveProperty('token', token)
    })
  })

  // ---------------------------------------------------------------------------
  // validateShareToken
  // ---------------------------------------------------------------------------

  describe('validateShareToken', () => {
    it('should return valid: false for non-existent token', async () => {
      vi.mocked(db.get).mockResolvedValueOnce(undefined)

      const result = await validateShareToken('non-existent-token')

      expect(result.valid).toBe(false)
    })

    it('should return valid: true for valid token in array', async () => {
      const now = Date.now()
      // Tokens are stored as an array
      const tokenArray = [
        {
          token: 'valid-token',
          userId: 'user-1',
          week: '2025-W03',
          expiresAt: now + 86400000, // 1 day from now
          createdAt: now,
        }
      ]

      vi.mocked(db.get).mockResolvedValueOnce(tokenArray)

      const result = await validateShareToken('valid-token')

      expect(result.valid).toBe(true)
      expect(result.userId).toBe('user-1')
      expect(result.week).toBe('2025-W03')
    })

    it('should return valid: false for expired token', async () => {
      const now = Date.now()
      const tokenArray = [
        {
          token: 'expired-token',
          userId: 'user-1',
          week: '2024-W01',
          expiresAt: now - 1000, // Expired 1 second ago
          createdAt: now - 86400000,
        }
      ]

      vi.mocked(db.get).mockResolvedValueOnce(tokenArray)

      const result = await validateShareToken('expired-token')

      expect(result.valid).toBe(false)
    })

    it('should return userId and week for valid token', async () => {
      const now = Date.now()
      const tokenArray = [
        {
          token: 'test-token',
          userId: 'user-123',
          week: '2025-W10',
          expiresAt: now + 3600000,
          createdAt: now,
        }
      ]

      vi.mocked(db.get).mockResolvedValueOnce(tokenArray)

      const result = await validateShareToken('test-token')

      expect(result.userId).toBe('user-123')
      expect(result.week).toBe('2025-W10')
    })
  })

  // ---------------------------------------------------------------------------
  // cleanupExpiredTokens
  // ---------------------------------------------------------------------------

  describe('cleanupExpiredTokens', () => {
    it('should not throw when no tokens exist', async () => {
      vi.mocked(db.get).mockResolvedValueOnce(undefined)

      await expect(cleanupExpiredTokens()).resolves.not.toThrow()
    })

    it('should not throw when all tokens are valid', async () => {
      const now = Date.now()
      // Tokens are stored as an array
      const tokens = [
        { token: 'token-1', userId: 'user-1', week: '2025-W01', expiresAt: now + 3600000, createdAt: now },
        { token: 'token-2', userId: 'user-2', week: '2025-W02', expiresAt: now + 7200000, createdAt: now },
      ]

      vi.mocked(db.get).mockResolvedValueOnce(tokens)

      await expect(cleanupExpiredTokens()).resolves.not.toThrow()
    })

    it('should remove expired tokens and keep valid ones', async () => {
      const now = Date.now()
      const tokens = [
        { token: 'expired-1', userId: 'user-1', week: '2024-W01', expiresAt: now - 1000, createdAt: now - 86400000 },
        { token: 'valid-1', userId: 'user-2', week: '2025-W01', expiresAt: now + 3600000, createdAt: now },
      ]

      vi.mocked(db.get).mockResolvedValueOnce(tokens)

      await cleanupExpiredTokens()

      // db.set should be called with only valid tokens
      expect(db.set).toHaveBeenCalledWith(
        'report_share_tokens',
        expect.arrayContaining([
          expect.objectContaining({ token: 'valid-1' })
        ])
      )
      // The saved array should not contain the expired token
      const savedTokens = vi.mocked(db.set).mock.calls[0][1] as any[]
      expect(savedTokens.some((t: any) => t.token === 'expired-1')).toBe(false)
    })

    it('should not save tokens when none are expired', async () => {
      const now = Date.now()
      const tokens = [
        { token: 'token-1', userId: 'user-1', week: '2025-W01', expiresAt: now + 3600000, createdAt: now },
        { token: 'token-2', userId: 'user-2', week: '2025-W02', expiresAt: now + 7200000, createdAt: now },
      ]

      vi.mocked(db.get).mockResolvedValueOnce(tokens)

      await cleanupExpiredTokens()

      expect(db.set).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // getWeeklyReportByToken
  // ---------------------------------------------------------------------------

  describe('getWeeklyReportByToken', () => {
    it('should return null for invalid token', async () => {
      vi.mocked(db.get).mockResolvedValueOnce(undefined) // token lookup

      const report = await getWeeklyReportByToken('invalid-token')

      expect(report).toBeNull()
    })

    it('should return null for expired token', async () => {
      const now = Date.now()
      const tokenArray = [
        {
          token: 'expired-token',
          userId: 'user-1',
          week: '2024-W01',
          expiresAt: now - 1000,
          createdAt: now - 86400000,
        }
      ]

      vi.mocked(db.get).mockResolvedValueOnce(tokenArray)

      const report = await getWeeklyReportByToken('expired-token')

      expect(report).toBeNull()
    })

    it('should return a WeeklyReport for valid token', async () => {
      const now = Date.now()
      const tokenArray = [
        {
          token: 'valid-token',
          userId: 'user-1',
          week: '2025-W03',
          expiresAt: now + 86400000,
          createdAt: now,
        }
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce(tokenArray) // token lookup in validateShareToken
        .mockResolvedValue([])             // all subsequent db.get calls (for report generation)

      const report = await getWeeklyReportByToken('valid-token')

      expect(report).not.toBeNull()
      expect(report).toHaveProperty('week')
      expect(report?.week).toBe('2025-W03')
    })
  })
})
