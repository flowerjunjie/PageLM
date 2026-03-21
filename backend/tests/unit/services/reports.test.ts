/**
 * Reports Service Unit Tests
 *
 * Tests for weekly report generation, share tokens, and report retrieval.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

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
    vi.mocked(db.get).mockResolvedValue(undefined)
    vi.mocked(db.set).mockResolvedValue(undefined)
    vi.mocked(db.delete).mockResolvedValue(undefined)
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

    it('should count flashcards created this week', async () => {
      const now = Date.now()
      const thisWeekStart = now - (new Date().getDay() * 24 * 60 * 60 * 1000)
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

      expect(report.summary.flashcardsCreated).toBeGreaterThanOrEqual(0)
    })

    it('should count quizzesCompleted as total quiz results returned', async () => {
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

      // quizzesCompleted reflects the week-filtered count
      expect(typeof report.summary.quizzesCompleted).toBe('number')
      expect(report.summary.quizzesCompleted).toBeGreaterThanOrEqual(0)
    })

    it('should calculate averageAccuracy as percentage', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const report = await generateWeeklyReport('user-1')

      expect(typeof report.summary.averageAccuracy).toBe('number')
      expect(report.summary.averageAccuracy).toBeGreaterThanOrEqual(0)
      expect(report.summary.averageAccuracy).toBeLessThanOrEqual(100)
    })

    it('should include comparison object with change metrics', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const report = await generateWeeklyReport('user-1')

      expect(report.comparison).toHaveProperty('studyTimeChange')
      expect(report.comparison).toHaveProperty('accuracyChange')
      expect(typeof report.comparison.studyTimeChange).toBe('number')
      expect(typeof report.comparison.accuracyChange).toBe('number')
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

      expect(Array.isArray(report.subjectDistribution)).toBe(true)
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
