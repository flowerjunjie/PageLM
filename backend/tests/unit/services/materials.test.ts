import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks – declared before any imports (vi.mock is hoisted)
// ─────────────────────────────────────────────────────────────────────────────
vi.mock('../../../src/utils/database/keyv', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../src/lib/ai/learning-materials', () => ({
  generateAllMaterials: vi.fn(),
  generateFlashcards: vi.fn(),
  generateNotesSummary: vi.fn(),
  generateQuizQuestions: vi.fn(),
}))

import db from '../../../src/utils/database/keyv'
import {
  saveLearningMaterials,
  getMaterialsByChat,
  getMaterialById,
  deleteMaterials,
  type StoredMaterials,
} from '../../../src/core/routes/materials'
import type { LearningMaterials, FlashCard, NoteSummary, Quiz } from '../../../src/lib/ai/learning-materials'

const mockGet = vi.mocked(db.get)
const mockSet = vi.mocked(db.set)
const mockDelete = vi.mocked(db.delete)

// ─────────────────────────────────────────────────────────────────────────────
// Fixture builders
// ─────────────────────────────────────────────────────────────────────────────
function makeFlashcard(overrides: Partial<FlashCard> = {}): FlashCard {
  return {
    id: 'fc-fixture',
    question: 'What is 2+2?',
    answer: '4',
    tags: ['math'],
    createdAt: Date.now(),
    ...overrides,
  }
}

function makeNoteSummary(overrides: Partial<NoteSummary> = {}): NoteSummary {
  return {
    id: 'note-fixture',
    title: 'Study Notes',
    summary: 'Brief summary',
    content: 'Full content here',
    keyPoints: ['Point 1', 'Point 2'],
    examples: ['Example 1'],
    createdAt: Date.now(),
    ...overrides,
  }
}

function makeQuiz(overrides: Partial<Quiz> = {}): Quiz {
  return {
    id: 'quiz-fixture',
    questions: [],
    createdAt: Date.now(),
    ...overrides,
  }
}

function makeLearningMaterials(overrides: Partial<LearningMaterials> = {}): LearningMaterials {
  return {
    flashcards: [makeFlashcard()],
    notes: makeNoteSummary(),
    quiz: makeQuiz(),
    ...overrides,
  }
}

function makeStoredMaterials(overrides: Partial<StoredMaterials> = {}): StoredMaterials {
  return {
    id: 'mat-fixture',
    chatId: 'chat-fixture',
    flashcards: [makeFlashcard()],
    notes: makeNoteSummary(),
    quiz: makeQuiz(),
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('MaterialsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // saveLearningMaterials
  // ─────────────────────────────────────────────────────────────────────────────
  describe('saveLearningMaterials', () => {
    it('should return a StoredMaterials object with a generated id', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await saveLearningMaterials('chat-1', makeLearningMaterials())

      expect(result).toHaveProperty('id')
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)
    })

    it('should attach the provided chatId', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await saveLearningMaterials('chat-abc', makeLearningMaterials())

      expect(result.chatId).toBe('chat-abc')
    })

    it('should preserve flashcards, notes, and quiz from the input', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const materials = makeLearningMaterials()
      const result = await saveLearningMaterials('chat-2', materials)

      expect(result.flashcards).toEqual(materials.flashcards)
      expect(result.notes).toEqual(materials.notes)
      expect(result.quiz).toEqual(materials.quiz)
    })

    it('should store the optional messageId when provided', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await saveLearningMaterials('chat-3', makeLearningMaterials(), 'msg-xyz')

      expect(result.messageId).toBe('msg-xyz')
    })

    it('should leave messageId undefined when not provided', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await saveLearningMaterials('chat-4', makeLearningMaterials())

      expect(result.messageId).toBeUndefined()
    })

    it('should set a createdAt timestamp', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const before = Date.now()
      const result = await saveLearningMaterials('chat-5', makeLearningMaterials())

      expect(result.createdAt).toBeGreaterThanOrEqual(before)
    })

    it('should persist the material under key material:<id>', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await saveLearningMaterials('chat-6', makeLearningMaterials())

      const materialKey = `material:${result.id}`
      expect(mockSet).toHaveBeenCalledWith(materialKey, expect.objectContaining({ id: result.id }))
    })

    it('should append the new id to the chat materials index', async () => {
      const existingIds = ['old-mat-1']
      mockGet.mockResolvedValue(existingIds)
      mockSet.mockResolvedValue(undefined)

      await saveLearningMaterials('chat-7', makeLearningMaterials())

      expect(mockSet).toHaveBeenCalledWith(
        'materials:chat:chat-7',
        expect.arrayContaining([expect.any(String), 'old-mat-1'])
      )
    })

    it('should prepend the new id to the global index', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await saveLearningMaterials('chat-8', makeLearningMaterials())

      const globalCall = mockSet.mock.calls.find(call => call[0] === 'materials:index')
      expect(globalCall?.[1][0]).toBe(result.id)
    })

    it('should cap the global index at 10 000 entries', async () => {
      const largeIndex = Array.from({ length: 10000 }, (_, i) => `mat-${i}`)
      mockGet.mockResolvedValue(largeIndex)
      mockSet.mockResolvedValue(undefined)

      await saveLearningMaterials('chat-9', makeLearningMaterials())

      const globalCall = mockSet.mock.calls.find(call => call[0] === 'materials:index')
      expect(globalCall?.[1]).toHaveLength(10000)
    })

    it('should handle empty flashcards array', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const materials = makeLearningMaterials({ flashcards: [] })
      const result = await saveLearningMaterials('chat-10', materials)

      expect(result.flashcards).toEqual([])
    })

    it('should handle quiz with multiple questions', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const quiz = makeQuiz({
        questions: [
          { id: 'q-1', question: 'Q1?', type: 'choice', options: ['A', 'B', 'C', 'D'], correct: 0, explanation: 'E1' },
          { id: 'q-2', question: 'Q2?', type: 'short_answer', answer: 'A2', explanation: 'E2' },
        ],
      })
      const result = await saveLearningMaterials('chat-11', makeLearningMaterials({ quiz }))

      expect(result.quiz.questions).toHaveLength(2)
    })

    it('should propagate database errors', async () => {
      mockGet.mockRejectedValue(new Error('DB write failed'))

      await expect(saveLearningMaterials('chat-err', makeLearningMaterials())).rejects.toThrow('DB write failed')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // getMaterialsByChat
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getMaterialsByChat', () => {
    it('should return all materials for a chat', async () => {
      const mat1 = makeStoredMaterials({ id: 'mat-1', chatId: 'chat-A', createdAt: 1000 })
      const mat2 = makeStoredMaterials({ id: 'mat-2', chatId: 'chat-A', createdAt: 2000 })
      mockGet
        .mockResolvedValueOnce(['mat-1', 'mat-2'])
        .mockResolvedValueOnce(mat1)
        .mockResolvedValueOnce(mat2)

      const result = await getMaterialsByChat('chat-A')

      expect(result).toHaveLength(2)
    })

    it('should sort materials by createdAt descending (newest first)', async () => {
      const mat1 = makeStoredMaterials({ id: 'mat-1', createdAt: 1000 })
      const mat2 = makeStoredMaterials({ id: 'mat-2', createdAt: 3000 })
      const mat3 = makeStoredMaterials({ id: 'mat-3', createdAt: 2000 })
      mockGet
        .mockResolvedValueOnce(['mat-1', 'mat-2', 'mat-3'])
        .mockResolvedValueOnce(mat1)
        .mockResolvedValueOnce(mat2)
        .mockResolvedValueOnce(mat3)

      const result = await getMaterialsByChat('chat-B')

      expect(result[0].id).toBe('mat-2')   // newest
      expect(result[1].id).toBe('mat-3')
      expect(result[2].id).toBe('mat-1')   // oldest
    })

    it('should filter out null/undefined materials', async () => {
      const mat1 = makeStoredMaterials({ id: 'mat-1', createdAt: 1000 })
      const mat3 = makeStoredMaterials({ id: 'mat-3', createdAt: 3000 })
      mockGet
        .mockResolvedValueOnce(['mat-1', 'mat-missing', 'mat-3'])
        .mockResolvedValueOnce(mat1)
        .mockResolvedValueOnce(null)           // deleted
        .mockResolvedValueOnce(mat3)

      const result = await getMaterialsByChat('chat-C')

      expect(result).toHaveLength(2)
      expect(result.map(m => m.id)).not.toContain('mat-missing')
    })

    it('should return empty array when chat has no materials', async () => {
      mockGet.mockResolvedValue([])

      const result = await getMaterialsByChat('chat-empty')

      expect(result).toEqual([])
    })

    it('should return empty array when chat index is null', async () => {
      mockGet.mockResolvedValue(null)

      const result = await getMaterialsByChat('chat-null')

      expect(result).toEqual([])
    })

    it('should query using the correct storage key', async () => {
      mockGet.mockResolvedValue([])

      await getMaterialsByChat('chat-key-test')

      expect(mockGet).toHaveBeenCalledWith('materials:chat:chat-key-test')
    })

    it('should propagate database errors', async () => {
      mockGet.mockRejectedValue(new Error('Read failed'))

      await expect(getMaterialsByChat('chat-err')).rejects.toThrow('Read failed')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // getMaterialById
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getMaterialById', () => {
    it('should return the material when found', async () => {
      const mat = makeStoredMaterials({ id: 'mat-found' })
      mockGet.mockResolvedValue(mat)

      const result = await getMaterialById('mat-found')

      expect(result).toEqual(mat)
    })

    it('should query using key material:<id>', async () => {
      mockGet.mockResolvedValue(null)

      await getMaterialById('mat-key-check')

      expect(mockGet).toHaveBeenCalledWith('material:mat-key-check')
    })

    it('should return null when database returns undefined', async () => {
      mockGet.mockResolvedValue(undefined)

      const result = await getMaterialById('mat-gone')

      expect(result).toBeNull()
    })

    it('should return null when database returns null', async () => {
      mockGet.mockResolvedValue(null)

      const result = await getMaterialById('mat-null')

      expect(result).toBeNull()
    })

    it('should propagate database errors', async () => {
      mockGet.mockRejectedValue(new Error('Connection lost'))

      await expect(getMaterialById('mat-err')).rejects.toThrow('Connection lost')
    })

    it('should return a StoredMaterials object with all required fields', async () => {
      const mat = makeStoredMaterials({ id: 'mat-shape' })
      mockGet.mockResolvedValue(mat)

      const result = await getMaterialById('mat-shape')

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('chatId')
      expect(result).toHaveProperty('flashcards')
      expect(result).toHaveProperty('notes')
      expect(result).toHaveProperty('quiz')
      expect(result).toHaveProperty('createdAt')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // deleteMaterials
  // ─────────────────────────────────────────────────────────────────────────────
  describe('deleteMaterials', () => {
    it('should return false when material does not exist', async () => {
      mockGet.mockResolvedValue(null)

      const result = await deleteMaterials('mat-ghost')

      expect(result).toBe(false)
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('should delete the record under material:<id>', async () => {
      const mat = makeStoredMaterials({ id: 'mat-del', chatId: 'chat-del' })
      mockGet
        .mockResolvedValueOnce(mat)           // getMaterialById
        .mockResolvedValueOnce(['mat-del'])   // chat index
        .mockResolvedValueOnce(['mat-del'])   // global index
      mockSet.mockResolvedValue(undefined)
      mockDelete.mockResolvedValue(undefined)

      await deleteMaterials('mat-del')

      expect(mockDelete).toHaveBeenCalledWith('material:mat-del')
    })

    it('should remove the id from the chat materials index', async () => {
      const mat = makeStoredMaterials({ id: 'mat-rm', chatId: 'chat-rm' })
      mockGet
        .mockResolvedValueOnce(mat)
        .mockResolvedValueOnce(['mat-rm', 'mat-other'])
        .mockResolvedValueOnce(['mat-rm'])
      mockSet.mockResolvedValue(undefined)
      mockDelete.mockResolvedValue(undefined)

      await deleteMaterials('mat-rm')

      expect(mockSet).toHaveBeenCalledWith('materials:chat:chat-rm', ['mat-other'])
    })

    it('should remove the id from the global index', async () => {
      const mat = makeStoredMaterials({ id: 'mat-glob', chatId: 'chat-glob' })
      mockGet
        .mockResolvedValueOnce(mat)
        .mockResolvedValueOnce(['mat-glob'])
        .mockResolvedValueOnce(['mat-glob', 'mat-global-other'])
      mockSet.mockResolvedValue(undefined)
      mockDelete.mockResolvedValue(undefined)

      await deleteMaterials('mat-glob')

      expect(mockSet).toHaveBeenCalledWith('materials:index', ['mat-global-other'])
    })

    it('should return true on successful deletion', async () => {
      const mat = makeStoredMaterials({ id: 'mat-ok', chatId: 'chat-ok' })
      mockGet
        .mockResolvedValueOnce(mat)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
      mockSet.mockResolvedValue(undefined)
      mockDelete.mockResolvedValue(undefined)

      const result = await deleteMaterials('mat-ok')

      expect(result).toBe(true)
    })

    it('should handle empty indexes gracefully', async () => {
      const mat = makeStoredMaterials({ id: 'mat-empty-idx', chatId: 'chat-ei' })
      mockGet
        .mockResolvedValueOnce(mat)
        .mockResolvedValueOnce([])   // chat index already empty
        .mockResolvedValueOnce([])   // global index already empty
      mockSet.mockResolvedValue(undefined)
      mockDelete.mockResolvedValue(undefined)

      const result = await deleteMaterials('mat-empty-idx')

      expect(result).toBe(true)
    })

    it('should propagate database errors from getMaterialById', async () => {
      mockGet.mockRejectedValue(new Error('Delete failed'))

      await expect(deleteMaterials('mat-dberr')).rejects.toThrow('Delete failed')
    })

    it('should not touch the database when material is not found', async () => {
      mockGet.mockResolvedValue(undefined)

      await deleteMaterials('mat-noop')

      expect(mockSet).not.toHaveBeenCalled()
      expect(mockDelete).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // FlashCard, NoteSummary, Quiz type-shape assertions
  // ─────────────────────────────────────────────────────────────────────────────
  describe('stored material type shapes', () => {
    it('FlashCard should have id, question, answer, tags, createdAt', async () => {
      const fc = makeFlashcard()
      const materials = makeLearningMaterials({ flashcards: [fc] })
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await saveLearningMaterials('chat-shape', materials)

      const stored = result.flashcards[0]
      expect(stored).toHaveProperty('id')
      expect(stored).toHaveProperty('question')
      expect(stored).toHaveProperty('answer')
      expect(stored).toHaveProperty('tags')
      expect(stored).toHaveProperty('createdAt')
    })

    it('NoteSummary should have id, title, summary, content, keyPoints, examples, createdAt', async () => {
      const notes = makeNoteSummary()
      const materials = makeLearningMaterials({ notes })
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await saveLearningMaterials('chat-notes-shape', materials)

      const stored = result.notes
      expect(stored).toHaveProperty('id')
      expect(stored).toHaveProperty('title')
      expect(stored).toHaveProperty('summary')
      expect(stored).toHaveProperty('content')
      expect(stored).toHaveProperty('keyPoints')
      expect(stored).toHaveProperty('examples')
      expect(stored).toHaveProperty('createdAt')
    })

    it('Quiz should have id, questions, createdAt and each question has required fields', async () => {
      const quiz = makeQuiz({
        questions: [{
          id: 'q-shape',
          question: 'Is this a test?',
          type: 'choice',
          options: ['Yes', 'No', 'Maybe', 'Always'],
          correct: 0,
          explanation: 'Yes, it is.',
        }],
      })
      const materials = makeLearningMaterials({ quiz })
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await saveLearningMaterials('chat-quiz-shape', materials)

      const stored = result.quiz
      expect(stored).toHaveProperty('id')
      expect(stored).toHaveProperty('questions')
      expect(stored).toHaveProperty('createdAt')

      const q = stored.questions[0]
      expect(q).toHaveProperty('id')
      expect(q).toHaveProperty('question')
      expect(q).toHaveProperty('type')
      expect(q).toHaveProperty('explanation')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Storage key format assertions
  // ─────────────────────────────────────────────────────────────────────────────
  describe('storage key format', () => {
    it('material should be stored under key starting with "material:"', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      await saveLearningMaterials('chat-key', makeLearningMaterials())

      const matKey = mockSet.mock.calls.find(call => String(call[0]).startsWith('material:'))
      expect(matKey).toBeDefined()
    })

    it('chat index key should be "materials:chat:<chatId>"', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      await saveLearningMaterials('chat-xyz', makeLearningMaterials())

      expect(mockSet).toHaveBeenCalledWith('materials:chat:chat-xyz', expect.any(Array))
    })

    it('global index key should be "materials:index"', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      await saveLearningMaterials('chat-global', makeLearningMaterials())

      expect(mockSet).toHaveBeenCalledWith('materials:index', expect.any(Array))
    })
  })
})
