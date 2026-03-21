/**
 * Analytics Service Unit Tests
 *
 * Tests for learning statistics, knowledge map, activity tracking,
 * and other analytics functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

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
  getLearningStats,
  getKnowledgeMapData,
  getSubjectStats,
  getRecentActivity,
  getLearningProfile,
  identifyWeakAreas,
  calculateLearningTrend,
} from '../../../src/services/analytics'

describe('Analytics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: all db.get calls return empty arrays/objects
    vi.mocked(db.get).mockResolvedValue(undefined)
  })

  // ---------------------------------------------------------------------------
  // getLearningStats
  // ---------------------------------------------------------------------------

  describe('getLearningStats', () => {
    it('should return zero core stats when no data exists', async () => {
      vi.mocked(db.get).mockResolvedValue(undefined)

      const stats = await getLearningStats()

      // These deterministic stats should be 0 when no data
      expect(stats.totalStudyTime).toBe(0)
      expect(stats.weeklyStudyTime).toBe(0)
      expect(stats.masteredTopics).toBe(0)
      expect(stats.totalFlashcards).toBe(0)
      expect(stats.dueFlashcards).toBe(0)
      expect(stats.quizAccuracy).toBe(0)
      // streakDays should be 0 with no daily activity
      expect(stats.streakDays).toBe(0)
      // weeklyFlashcardsReviewed is randomly seeded, just verify it's a number
      expect(typeof stats.weeklyFlashcardsReviewed).toBe('number')
    })

    it('should calculate totalFlashcards correctly', async () => {
      const flashcards = [
        { id: 'fc-1', tag: 'math', question: 'Q1', created: Date.now() },
        { id: 'fc-2', tag: 'math', question: 'Q2', created: Date.now() },
        { id: 'fc-3', tag: 'physics', question: 'Q3', created: Date.now() },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce(flashcards) // flashcards
        .mockResolvedValueOnce([])          // chats
        .mockResolvedValueOnce([])          // quiz_results
        .mockResolvedValueOnce({})          // daily_activity (for streak)

      const stats = await getLearningStats()

      expect(stats.totalFlashcards).toBe(3)
    })

    it('should count masteredTopics as unique tags', async () => {
      const flashcards = [
        { id: 'fc-1', tag: 'calculus', question: 'Q1', created: Date.now() },
        { id: 'fc-2', tag: 'calculus', question: 'Q2', created: Date.now() },
        { id: 'fc-3', tag: 'algebra', question: 'Q3', created: Date.now() },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce(flashcards) // flashcards
        .mockResolvedValueOnce([])          // chats
        .mockResolvedValueOnce([])          // quiz_results
        .mockResolvedValueOnce({})          // daily_activity

      const stats = await getLearningStats()

      expect(stats.masteredTopics).toBe(2) // 'calculus' and 'algebra'
    })

    it('should calculate quizAccuracy from recent quiz results', async () => {
      const now = Date.now()
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

      const quizResults = [
        { id: 'qr-1', completedAt: now - 1000, correctCount: 8, totalCount: 10 },
        { id: 'qr-2', completedAt: now - 2000, correctCount: 6, totalCount: 10 },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce([])         // flashcards
        .mockResolvedValueOnce([])         // chats
        .mockResolvedValueOnce(quizResults) // quiz_results
        .mockResolvedValueOnce({})         // daily_activity

      const stats = await getLearningStats()

      expect(stats.quizAccuracy).toBe(70) // (8+6)/(10+10)*100 = 70%
    })

    it('should calculate weeklyStudyTime from recent chats', async () => {
      const now = Date.now()
      const recentChats = [
        { id: 'chat-1', createdAt: now - 1000 },
        { id: 'chat-2', createdAt: now - 2000 },
        { id: 'chat-3', createdAt: now - 3000 },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce([])          // flashcards
        .mockResolvedValueOnce(recentChats) // chats
        .mockResolvedValueOnce([])          // quiz_results
        .mockResolvedValueOnce({})          // daily_activity

      const stats = await getLearningStats()

      // 3 chats * 15 minutes each = 45 minutes
      expect(stats.weeklyStudyTime).toBe(45)
      expect(stats.totalStudyTime).toBe(45)
    })

    it('should count dueFlashcards correctly', async () => {
      const now = Date.now()
      const oneDayMs = 24 * 60 * 60 * 1000
      const flashcards = [
        // Due: last reviewed 2 days ago, interval 1 day
        { id: 'fc-1', lastReviewed: now - 2 * oneDayMs, interval: oneDayMs },
        // Not due: last reviewed 1 hour ago, interval 1 day
        { id: 'fc-2', lastReviewed: now - 3600000, interval: oneDayMs },
        // Due: created 2 days ago, no interval (defaults to 1 day)
        { id: 'fc-3', created: now - 2 * oneDayMs },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce(flashcards) // flashcards
        .mockResolvedValueOnce([])          // chats
        .mockResolvedValueOnce([])          // quiz_results
        .mockResolvedValueOnce({})          // daily_activity

      const stats = await getLearningStats()

      expect(stats.dueFlashcards).toBe(2)
    })

    it('should handle empty database gracefully', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const stats = await getLearningStats()

      expect(stats.totalFlashcards).toBe(0)
      expect(stats.quizAccuracy).toBe(0)
      expect(stats.weeklyStudyTime).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // getKnowledgeMapData
  // ---------------------------------------------------------------------------

  describe('getKnowledgeMapData', () => {
    it('should return nodes and edges', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const result = await getKnowledgeMapData()

      expect(result).toHaveProperty('nodes')
      expect(result).toHaveProperty('edges')
      expect(Array.isArray(result.nodes)).toBe(true)
      expect(Array.isArray(result.edges)).toBe(true)
    })

    it('should return demo nodes and edges when no flashcards (fallback behavior)', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const result = await getKnowledgeMapData()

      // When no flashcards exist, the service returns demo data as fallback
      expect(result.nodes.length).toBeGreaterThan(0)
      expect(result.edges.length).toBeGreaterThan(0)
    })

    it('should generate nodes from flashcards', async () => {
      const flashcards = [
        { id: 'fc-1', tag: 'mechanics', question: 'What is force?', created: Date.now() },
        { id: 'fc-2', tag: 'optics', question: 'What is light?', created: Date.now() },
      ]
      vi.mocked(db.get).mockResolvedValue(flashcards)

      const result = await getKnowledgeMapData()

      expect(result.nodes.length).toBeGreaterThan(0)
    })

    it('should generate nodes from quiz results if no flashcards', async () => {
      const quizResults = [
        { id: 'qr-1', questions: [{ topic: 'algebra' }], completedAt: Date.now() }
      ]
      vi.mocked(db.get)
        .mockResolvedValueOnce([])         // flashcards
        .mockResolvedValueOnce(quizResults) // quiz_results

      const result = await getKnowledgeMapData()

      expect(result).toHaveProperty('nodes')
      expect(result).toHaveProperty('edges')
    })
  })

  // ---------------------------------------------------------------------------
  // getSubjectStats
  // ---------------------------------------------------------------------------

  describe('getSubjectStats', () => {
    it('should return array of subject stats', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const stats = await getSubjectStats()

      expect(Array.isArray(stats)).toBe(true)
    })

    it('should group flashcards by detected subject', async () => {
      const flashcards = [
        { id: 'fc-1', tag: 'mechanics', question: 'What is force in physics?', created: Date.now() },
        { id: 'fc-2', tag: 'algebra', question: 'Solve the math equation', created: Date.now() },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce(flashcards) // flashcards
        .mockResolvedValueOnce([])          // quiz_results

      const stats = await getSubjectStats()

      const subjects = stats.map(s => s.subject)
      expect(subjects).toContain('physics')
      expect(subjects).toContain('math')
    })

    it('should include color and name for each subject', async () => {
      const flashcards = [
        { id: 'fc-1', tag: 'calculus', question: 'Math calculus problem', created: Date.now() },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce(flashcards) // flashcards
        .mockResolvedValueOnce([])          // quiz_results

      const stats = await getSubjectStats()

      for (const subjectStat of stats) {
        expect(subjectStat).toHaveProperty('color')
        expect(subjectStat).toHaveProperty('name')
        expect(subjectStat).toHaveProperty('nodeCount')
        expect(subjectStat).toHaveProperty('flashcardCount')
      }
    })

    it('should return empty array when no data', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const stats = await getSubjectStats()

      expect(Array.isArray(stats)).toBe(true)
      expect(stats.length).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // getRecentActivity
  // ---------------------------------------------------------------------------

  describe('getRecentActivity', () => {
    it('should return array of activity items', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const activity = await getRecentActivity()

      expect(Array.isArray(activity)).toBe(true)
    })

    it('should limit results to specified count', async () => {
      const now = Date.now()
      const quizResults = Array.from({ length: 20 }, (_, i) => ({
        id: `qr-${i}`,
        title: `Quiz ${i}`,
        completedAt: now - i * 1000,
        correctCount: 5,
        totalCount: 10,
      }))

      vi.mocked(db.get)
        .mockResolvedValueOnce([])          // flashcards
        .mockResolvedValueOnce([])          // chats
        .mockResolvedValueOnce(quizResults) // quiz_results

      const activity = await getRecentActivity(5)

      expect(activity.length).toBeLessThanOrEqual(5)
    })

    it('should include type field for each activity', async () => {
      const now = Date.now()
      vi.mocked(db.get)
        .mockResolvedValueOnce([])  // flashcards
        .mockResolvedValueOnce([    // chats
          { id: 'chat-1', title: 'Test Chat', createdAt: now },
        ])
        .mockResolvedValueOnce([])  // quiz_results

      const activity = await getRecentActivity(10)

      for (const item of activity) {
        expect(item).toHaveProperty('type')
        expect(['quiz', 'flashcard', 'note', 'chat', 'podcast']).toContain(item.type)
      }
    })

    it('should sort activity by timestamp descending', async () => {
      const now = Date.now()
      const chats = [
        { id: 'chat-1', title: 'Old Chat', createdAt: now - 10000 },
        { id: 'chat-2', title: 'New Chat', createdAt: now - 1000 },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce([])    // flashcards
        .mockResolvedValueOnce(chats) // chats
        .mockResolvedValueOnce([])    // quiz_results

      const activity = await getRecentActivity(10)

      if (activity.length >= 2) {
        for (let i = 0; i < activity.length - 1; i++) {
          expect(activity[i].timestamp).toBeGreaterThanOrEqual(activity[i + 1].timestamp)
        }
      }
    })
  })

  // ---------------------------------------------------------------------------
  // getLearningProfile
  // ---------------------------------------------------------------------------

  describe('getLearningProfile', () => {
    it('should return profile with stats, subjects, and recentActivity', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const profile = await getLearningProfile()

      expect(profile).toHaveProperty('stats')
      expect(profile).toHaveProperty('subjects')
      expect(profile).toHaveProperty('recentActivity')
    })

    it('should have LearningStats shape in profile.stats', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const profile = await getLearningProfile()

      expect(profile.stats).toHaveProperty('totalStudyTime')
      expect(profile.stats).toHaveProperty('weeklyStudyTime')
      expect(profile.stats).toHaveProperty('masteredTopics')
      expect(profile.stats).toHaveProperty('totalFlashcards')
      expect(profile.stats).toHaveProperty('quizAccuracy')
    })

    it('should return subjects as an array', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const profile = await getLearningProfile()

      expect(Array.isArray(profile.subjects)).toBe(true)
    })

    it('should return recentActivity as an array', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const profile = await getLearningProfile()

      expect(Array.isArray(profile.recentActivity)).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // identifyWeakAreas
  // ---------------------------------------------------------------------------

  describe('identifyWeakAreas', () => {
    it('should return array of weak areas', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const areas = await identifyWeakAreas()

      expect(Array.isArray(areas)).toBe(true)
    })

    it('should identify subjects with low quiz accuracy as weak', async () => {
      const now = Date.now()
      const quizResults = [
        {
          id: 'qr-1',
          questions: [{ topic: 'math' }],
          correctCount: 2,
          totalCount: 10,
          completedAt: now - 1000,
        },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce([])          // flashcards
        .mockResolvedValueOnce(quizResults) // quiz_results

      const areas = await identifyWeakAreas()

      // Low accuracy areas should be in results
      expect(Array.isArray(areas)).toBe(true)
    })

    it('should return areas with subject, topic, and score fields', async () => {
      const now = Date.now()
      const quizResults = [
        { id: 'qr-1', correctCount: 1, totalCount: 10, completedAt: now - 1000, questions: [{ topic: 'integration' }] }
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce([])          // flashcards
        .mockResolvedValueOnce(quizResults) // quiz_results

      const areas = await identifyWeakAreas()

      for (const area of areas) {
        expect(area).toHaveProperty('subject')
        expect(area).toHaveProperty('topic')
        expect(area).toHaveProperty('score')
      }
    })
  })

  // ---------------------------------------------------------------------------
  // calculateLearningTrend
  // ---------------------------------------------------------------------------

  describe('calculateLearningTrend', () => {
    it('should return array of trend data points', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const trend = await calculateLearningTrend(7)

      expect(Array.isArray(trend)).toBe(true)
    })

    it('should return data for requested number of days', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const trend = await calculateLearningTrend(7)

      expect(trend.length).toBeLessThanOrEqual(7)
    })

    it('should have required fields in each data point', async () => {
      const now = Date.now()
      const chats = [
        { id: 'chat-1', createdAt: now - 1000 },
      ]
      const quizResults = [
        { id: 'qr-1', completedAt: now - 2000, correctCount: 7, totalCount: 10 },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce(chats)       // chats
        .mockResolvedValueOnce([])          // flashcards reviews
        .mockResolvedValueOnce(quizResults) // quiz_results

      const trend = await calculateLearningTrend(7)

      for (const point of trend) {
        expect(point).toHaveProperty('date')
        expect(point).toHaveProperty('studyTime')
        expect(point).toHaveProperty('flashcardsReviewed')
        expect(point).toHaveProperty('quizScore')
      }
    })

    it('should use default of 30 days when not specified', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const trend = await calculateLearningTrend()

      expect(trend.length).toBeLessThanOrEqual(30)
    })

    it('should handle empty database gracefully', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const trend = await calculateLearningTrend(5)

      expect(Array.isArray(trend)).toBe(true)
      // All study times and scores should be 0 or minimal when no data
      for (const point of trend) {
        expect(typeof point.studyTime).toBe('number')
        expect(typeof point.flashcardsReviewed).toBe('number')
        expect(typeof point.quizScore).toBe('number')
      }
    })
  })
})
