/**
 * Learning Materials API Integration Tests
 *
 * End-to-end tests for materials endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockMaterials, createMockFlashcard } from '../../mocks/database'

// Mock the database
vi.mock('../../../src/utils/database/keyv', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}))

import db from '../../../src/utils/database/keyv'

describe('Materials API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/materials/:chatId', () => {
    it('should return materials for chat', async () => {
      const chatId = 'chat-123'
      const materials = createMockMaterials({ chatId })

      vi.mocked(db.get).mockResolvedValueOnce(materials)

      const result = await db.get(`materials:${chatId}`)

      expect(result).toEqual(materials)
      expect(result.flashcards).toBeDefined()
      expect(result.notes).toBeDefined()
      expect(result.quiz).toBeDefined()
    })

    it('should return 404 when materials not found', async () => {
      vi.mocked(db.get).mockResolvedValueOnce(undefined)

      const result = await db.get('materials:nonexistent')

      expect(result).toBeUndefined()
    })
  })

  describe('POST /api/materials', () => {
    it('should create new materials', async () => {
      const materials = createMockMaterials()

      vi.mocked(db.set).mockResolvedValueOnce(undefined)

      await db.set(`materials:${materials.chatId}`, materials)

      expect(db.set).toHaveBeenCalledWith(
        `materials:${materials.chatId}`,
        expect.objectContaining({
          flashcards: expect.any(Array),
          notes: expect.any(Object),
          quiz: expect.any(Object),
        })
      )
    })

    it('should validate flashcard structure', () => {
      const flashcard = createMockFlashcard()

      expect(flashcard).toHaveProperty('id')
      expect(flashcard).toHaveProperty('question')
      expect(flashcard).toHaveProperty('answer')
      expect(flashcard).toHaveProperty('tags')
      expect(flashcard).toHaveProperty('createdAt')
    })
  })

  describe('PUT /api/materials/:id/flashcards', () => {
    it('should update flashcards', async () => {
      const chatId = 'chat-123'
      const existingMaterials = createMockMaterials({ chatId })
      const newFlashcard = createMockFlashcard({
        question: 'New question?',
        answer: 'New answer'
      })

      vi.mocked(db.get).mockResolvedValueOnce(existingMaterials)
      vi.mocked(db.set).mockResolvedValueOnce(undefined)

      const materials = await db.get(`materials:${chatId}`)
      materials.flashcards.push(newFlashcard)
      await db.set(`materials:${chatId}`, materials)

      expect(db.set).toHaveBeenCalledWith(
        `materials:${chatId}`,
        expect.objectContaining({
          flashcards: expect.arrayContaining([
            expect.objectContaining({ question: 'New question?' })
          ])
        })
      )
    })
  })

  describe('DELETE /api/materials/:id/flashcards/:flashcardId', () => {
    it('should delete specific flashcard', async () => {
      const chatId = 'chat-123'
      const flashcardId = 'fc-123'
      const materials = createMockMaterials({
        chatId,
        flashcards: [
          createMockFlashcard({ id: flashcardId }),
          createMockFlashcard({ id: 'fc-456' })
        ]
      })

      vi.mocked(db.get).mockResolvedValueOnce(materials)
      vi.mocked(db.set).mockResolvedValueOnce(undefined)

      const current = await db.get(`materials:${chatId}`)
      current.flashcards = current.flashcards.filter(
        (fc: any) => fc.id !== flashcardId
      )
      await db.set(`materials:${chatId}`, current)

      expect(db.set).toHaveBeenCalledWith(
        `materials:${chatId}`,
        expect.objectContaining({
          flashcards: expect.not.arrayContaining([
            expect.objectContaining({ id: flashcardId })
          ])
        })
      )
    })
  })
})
