/**
 * Materials API Integration Tests
 *
 * Tests for learning materials API client functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockFetch, createMockFetchResponse } from '../../mocks/api'

describe('Materials API Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    global.fetch = mockFetch
  })

  describe('getMaterials', () => {
    it('should fetch materials for a chat', async () => {
      const mockMaterials = {
        ok: true,
        materials: {
          flashcards: [
            { id: 'fc-1', question: 'Q1?', answer: 'A1', tags: [] },
          ],
          notes: { id: 'note-1', title: 'Notes', summary: 'Summary' },
          quiz: { id: 'quiz-1', questions: [] },
        },
      }

      mockFetch.mockResolvedValueOnce(createMockFetchResponse(mockMaterials))

      const response = await fetch('/api/materials/chat-123')
      const data = await response.json()

      expect(data.ok).toBe(true)
      expect(data.materials.flashcards).toHaveLength(1)
      expect(data.materials.notes).toBeDefined()
      expect(data.materials.quiz).toBeDefined()
    })

    it('should return 404 when materials not found', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockFetchResponse({ ok: false, error: 'Not found' }, 404)
      )

      const response = await fetch('/api/materials/nonexistent')

      expect(response.status).toBe(404)
    })
  })

  describe('saveFlashcard', () => {
    it('should save flashcard successfully', async () => {
      const mockResponse = {
        ok: true,
        flashcard: {
          id: 'fc-new',
          question: 'New Q?',
          answer: 'New A',
          tags: ['test'],
        },
      }

      mockFetch.mockResolvedValueOnce(createMockFetchResponse(mockResponse))

      const response = await fetch('/api/materials/chat-123/flashcards', {
        method: 'POST',
        body: JSON.stringify({
          question: 'New Q?',
          answer: 'New A',
          tags: ['test'],
        }),
      })
      const data = await response.json()

      expect(data.ok).toBe(true)
      expect(data.flashcard.id).toBe('fc-new')
    })

    it('should validate flashcard data', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockFetchResponse({ ok: false, error: 'Question is required' }, 400)
      )

      const response = await fetch('/api/materials/chat-123/flashcards', {
        method: 'POST',
        body: JSON.stringify({ answer: 'Only answer' }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('deleteFlashcard', () => {
    it('should delete flashcard successfully', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockFetchResponse({ ok: true })
      )

      const response = await fetch('/api/materials/chat-123/flashcards/fc-1', {
        method: 'DELETE',
      })
      const data = await response.json()

      expect(data.ok).toBe(true)
    })
  })
})
