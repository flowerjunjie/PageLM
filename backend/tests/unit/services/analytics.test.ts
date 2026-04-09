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

    it('should count streakDays when dailyActivity has consecutive days', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-22T12:00:00.000Z'))

      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const dailyActivity: Record<string, boolean> = {
        [today]: true,
        [yesterday]: true,
        [twoDaysAgo]: true,
      }

      vi.mocked(db.get)
        .mockResolvedValueOnce([])           // flashcards
        .mockResolvedValueOnce([])           // chats
        .mockResolvedValueOnce([])           // quiz_results
        .mockResolvedValueOnce(dailyActivity) // daily_activity

      try {
        const stats = await getLearningStats()

        expect(stats.streakDays).toBe(2)
      } finally {
        vi.useRealTimers()
      }
    })

    it('should count yesterday activity even when today has no streak entry', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-22T12:00:00.000Z'))

      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const dailyActivity: Record<string, boolean> = {
        [yesterday]: true,
      }

      vi.mocked(db.get)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(dailyActivity)

      try {
        const stats = await getLearningStats()

        expect(stats.streakDays).toBe(1)
      } finally {
        vi.useRealTimers()
      }
    })

    it('should calculate quizAccuracyTrend when previous week has data', async () => {
      const now = Date.now()
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000
      // Previous week: 2 weeks ago to 1 week ago
      const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000

      const quizResults = [
        // This week: 90% accuracy
        { id: 'qr-current', completedAt: now - 1000, correctCount: 9, totalCount: 10 },
        // Previous week: 70% accuracy
        { id: 'qr-prev', completedAt: oneWeekAgo - 1000, correctCount: 7, totalCount: 10 },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce([])          // flashcards
        .mockResolvedValueOnce([])          // chats
        .mockResolvedValueOnce(quizResults) // quiz_results
        .mockResolvedValueOnce({})          // daily_activity

      const stats = await getLearningStats()

      // quizAccuracyTrend should be current week accuracy minus previous week accuracy
      expect(stats.quizAccuracyTrend).toBe(20)
    })

    it('should count weeklyFlashcardsReviewed only for timestamps strictly after oneWeekAgo', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-22T12:00:00.000Z'))

      const now = Date.now()
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000
      const oneWeekAgo = now - oneWeekMs
      const flashcards = [
        { id: 'fc-reviewed-after', lastReviewed: oneWeekAgo + 1, created: now - 1000 },
        { id: 'fc-reviewed-at-boundary', lastReviewed: oneWeekAgo, created: now - 2000 },
        { id: 'fc-reviewed-before', lastReviewed: oneWeekAgo - 1, created: now - 3000 },
        { id: 'fc-without-review', created: now - 4000 },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce(flashcards) // flashcards
        .mockResolvedValueOnce([])         // chats
        .mockResolvedValueOnce([])         // quiz_results
        .mockResolvedValueOnce({})         // daily_activity

      try {
        const stats = await getLearningStats()

        expect(stats.totalFlashcards).toBe(4)
        expect(stats.weeklyFlashcardsReviewed).toBe(1)
      } finally {
        vi.useRealTimers()
      }
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

    it('should generate deduplicated nodes and same-subject edges from flashcards', async () => {
      const flashcards = [
        { id: 'fc-1', tag: 'mechanics', question: 'Physics basics', created: Date.now(), reviewCount: 2 },
        { id: 'fc-2', tag: 'mechanics', question: 'Physics duplicate', created: Date.now(), reviewCount: 4 },
        { id: 'fc-3', tag: 'optics', question: 'Light chapter', created: Date.now(), reviewCount: 3 },
        { id: 'fc-4', tag: 'organic', question: 'Chemistry chapter', created: Date.now(), reviewCount: 5 },
      ]
      vi.mocked(db.get).mockResolvedValue(flashcards)

      const result = await getKnowledgeMapData()

      expect(result.nodes.map(node => `${node.subject}:${node.name}`).sort()).toEqual([
        'chemistry:organic',
        'physics:mechanics',
        'physics:optics',
      ])
      expect(result.edges).toEqual([
        expect.objectContaining({
          source: expect.any(String),
          target: expect.any(String),
          strength: expect.any(Number),
        }),
      ])
    })

    it('should use fallback node values when flashcard fields are missing', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-22T12:00:00.000Z'))

      const flashcards = [
        { id: 'fc-fallback-node', question: 'Unmapped question without tag' },
      ]

      vi.mocked(db.get).mockResolvedValue(flashcards)

      try {
        const result = await getKnowledgeMapData()
        const [node] = result.nodes

        expect(node).toEqual(expect.objectContaining({
          name: 'General',
          subject: 'other',
          learnedAt: Date.now(),
          reviewCount: 1,
          size: 25,
        }))
      } finally {
        vi.useRealTimers()
      }
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

    it('should detect subject from quiz topic when explicit subject is missing', async () => {
      const quizResults = [
        { id: 'qr-detect', topic: 'thermodynamics basics', correctCount: 7, totalCount: 10 },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce([])          // flashcards
        .mockResolvedValueOnce(quizResults) // quiz_results

      const stats = await getSubjectStats()
      const physicsStats = stats.find(s => s.subject === 'physics')

      expect(physicsStats).toBeDefined()
      expect(physicsStats).toEqual(expect.objectContaining({
        subject: 'physics',
        flashcardCount: 0,
        quizAccuracy: 70,
      }))
    })

    it('should filter quizzes by explicit subject field (not just text detection)', async () => {
      const quizResults = [
        { id: 'qr-1', subject: 'physics', correctCount: 8, totalCount: 10, topic: 'chapter 1' },
        { id: 'qr-2', subject: 'math', correctCount: 5, totalCount: 10, topic: 'worksheet a' },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce([])          // flashcards
        .mockResolvedValueOnce(quizResults) // quiz_results

      const stats = await getSubjectStats()

      const physicsStats = stats.find(s => s.subject === 'physics')
      const mathStats = stats.find(s => s.subject === 'math')

      expect(physicsStats).toBeDefined()
      expect(mathStats).toBeDefined()
      expect(physicsStats?.quizAccuracy).toBe(80)
      expect(mathStats?.quizAccuracy).toBe(50)
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

    it('should include quiz subject from explicit subject field', async () => {
      const now = Date.now()
      const quizResults = [
        { id: 'qr-1', subject: 'physics', topic: 'quiz 1', completedAt: now - 100 },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce([])          // flashcards
        .mockResolvedValueOnce([])          // chats
        .mockResolvedValueOnce(quizResults) // quiz_results

      const activity = await getRecentActivity(10)
      const quizActivity = activity.find(a => a.type === 'quiz')

      expect(quizActivity).toBeDefined()
      expect(quizActivity).toEqual(expect.objectContaining({
        id: 'quiz-qr-1',
        type: 'quiz',
        title: 'quiz 1',
        subject: 'physics',
        timestamp: now - 100,
      }))
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

    it('should include flashcard activity items', async () => {
      const now = Date.now()
      const flashcards = [
        { id: 'fc-1', tag: 'physics', question: 'What is force?', created: now - 1000 },
        { id: 'fc-2', tag: 'math', question: 'Solve x', created: now - 500 },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce(flashcards) // flashcards
        .mockResolvedValueOnce([])          // chats
        .mockResolvedValueOnce([])          // quiz_results

      const activity = await getRecentActivity(10)

      const flashcardActivities = activity.filter(a => a.type === 'flashcard')
      expect(flashcardActivities).toHaveLength(2)
      expect(flashcardActivities).toContainEqual(expect.objectContaining({
        id: 'fc-fc-2',
        type: 'flashcard',
        title: 'math',
        subject: 'math',
        timestamp: now - 500,
      }))
    })

    it('should use fallback titles, timestamps, and detected subjects in recent activity', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-22T12:00:00.000Z'))

      const flashcards = [
        { id: 'fc-fallback', question: 'cell membrane basics' },
      ]
      const chats = [
        { id: 'chat-fallback' },
      ]
      const quizResults = [
        { id: 'quiz-fallback', topic: 'ancient empires' },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce(flashcards)
        .mockResolvedValueOnce(chats)
        .mockResolvedValueOnce(quizResults)

      try {
        const activity = await getRecentActivity(10)

        expect(activity).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: 'fc-fc-fallback',
            type: 'flashcard',
            title: 'Flashcard',
            subject: 'biology',
            timestamp: Date.now(),
          }),
          expect.objectContaining({
            id: 'chat-chat-fallback',
            type: 'chat',
            title: 'Chat Session',
            timestamp: Date.now(),
          }),
          expect.objectContaining({
            id: 'quiz-quiz-fallback',
            type: 'quiz',
            title: 'ancient empires',
            subject: 'history',
            timestamp: Date.now(),
          }),
        ]))
      } finally {
        vi.useRealTimers()
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

    it('should identify low-accuracy quizzes using top-level topic detection', async () => {
      const now = Date.now()
      const quizResults = [
        {
          id: 'qr-1',
          topic: 'math basics',
          correctCount: 2,
          totalCount: 10,
          completedAt: now - 1000,
        },
      ]

      vi.mocked(db.get).mockResolvedValueOnce(quizResults)

      const areas = await identifyWeakAreas()

      expect(areas).toEqual([
        { subject: 'math', topic: 'math basics', score: 20 },
      ])
    })

    it('should return areas with subject, topic, and score fields', async () => {
      const now = Date.now()
      const quizResults = [
        { id: 'qr-1', topic: 'integration practice', correctCount: 1, totalCount: 10, completedAt: now - 1000 }
      ]

      vi.mocked(db.get).mockResolvedValueOnce(quizResults)

      const areas = await identifyWeakAreas()

      expect(areas).toEqual([
        { subject: 'other', topic: 'integration practice', score: 10 },
      ])
    })

    it('should fall back to other subject and Unknown topic for weak quizzes without metadata', async () => {
      const quizResults = [
        { id: 'qr-missing-meta', correctCount: 1, totalCount: 10 },
      ]

      vi.mocked(db.get).mockResolvedValue(quizResults)

      const areas = await identifyWeakAreas()

      expect(areas).toEqual([
        { subject: 'other', topic: 'Unknown', score: 10 },
      ])
    })

    it('should sort weak areas by score, exclude non-weak quizzes, and limit results to five', async () => {
      const quizResults = [
        { id: 'qr-strong', subject: 'math', topic: 'solid algebra', correctCount: 7, totalCount: 10 },
        { id: 'qr-1', subject: 'physics', topic: 'topic 1', correctCount: 1, totalCount: 10 },
        { id: 'qr-2', subject: 'chemistry', topic: 'topic 2', correctCount: 2, totalCount: 10 },
        { id: 'qr-3', subject: 'biology', topic: 'topic 3', correctCount: 3, totalCount: 10 },
        { id: 'qr-4', subject: 'history', topic: 'topic 4', correctCount: 4, totalCount: 10 },
        { id: 'qr-5', subject: 'english', topic: 'topic 5', correctCount: 5, totalCount: 10 },
        { id: 'qr-6', subject: 'other', topic: 'topic 6', correctCount: 0, totalCount: 10 },
      ]

      vi.mocked(db.get).mockResolvedValue(quizResults)

      const areas = await identifyWeakAreas()

      expect(areas).toHaveLength(5)
      expect(areas.map(area => area.score)).toEqual([0, 10, 20, 30, 40])
      expect(areas.some(area => area.topic === 'solid algebra')).toBe(false)
      expect(areas.some(area => area.topic === 'topic 5')).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // calculateLearningTrend
  // ---------------------------------------------------------------------------

  describe('calculateLearningTrend', () => {
    it('should return array of trend data points', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const trend = await calculateLearningTrend('test-user', 7)

      expect(Array.isArray(trend)).toBe(true)
    })

    it('should return data for requested number of days', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const trend = await calculateLearningTrend('test-user', 7)

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

      const trend = await calculateLearningTrend('test-user', 7)

      for (const point of trend) {
        expect(point).toHaveProperty('date')
        expect(point).toHaveProperty('studyTime')
        expect(point).toHaveProperty('flashcardsReviewed')
        expect(point).toHaveProperty('quizScore')
      }
    })

    it('should use default of 30 days when not specified', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const trend = await calculateLearningTrend('test-user')

      expect(trend.length).toBeLessThanOrEqual(30)
    })

    it('should handle empty database gracefully', async () => {
      vi.mocked(db.get).mockResolvedValue([])

      const trend = await calculateLearningTrend('test-user', 5)

      expect(Array.isArray(trend)).toBe(true)
      // All study times and scores should be 0 or minimal when no data
      for (const point of trend) {
        expect(typeof point.studyTime).toBe('number')
        expect(typeof point.flashcardsReviewed).toBe('number')
        expect(typeof point.quizScore).toBe('number')
      }
    })

    it('should count only records within the requested day bucket boundaries', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-22T12:00:00.000Z'))

      const dayStart = new Date(2026, 2, 22, 0, 0, 0, 0).getTime()
      const dayEnd = new Date(2026, 2, 23, 0, 0, 0, 0).getTime()
      const expectedDate = new Date(dayStart).toISOString().split('T')[0]
      const chats = [
        { id: 'chat-at-start', createdAt: dayStart },
        { id: 'chat-at-end', createdAt: dayEnd },
      ]
      const flashcards = [
        { id: 'fc-before-end', lastReviewed: dayEnd - 1 },
        { id: 'fc-at-end', lastReviewed: dayEnd },
      ]
      const quizResults = [
        { id: 'quiz-inside', completedAt: dayStart + 60_000, correctCount: 3, totalCount: 4 },
        { id: 'quiz-at-end', completedAt: dayEnd, correctCount: 1, totalCount: 2 },
      ]

      vi.mocked(db.get)
        .mockResolvedValueOnce(chats)
        .mockResolvedValueOnce(flashcards)
        .mockResolvedValueOnce(quizResults)

      try {
        const trend = await calculateLearningTrend('test-user', 1)

        expect(trend).toEqual([
          {
            date: expectedDate,
            studyTime: 15,
            flashcardsReviewed: 1,
            quizScore: 75,
          },
        ])
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
