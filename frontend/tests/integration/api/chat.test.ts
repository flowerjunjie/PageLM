/**
 * Chat API Integration Tests
 *
 * Tests for chat API client functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockFetch, createMockFetchResponse } from '../../mocks/api'

describe('Chat API Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    global.fetch = mockFetch
  })

  describe('startChat', () => {
    it('should start a new chat successfully', async () => {
      const mockResponse = {
        ok: true,
        chatId: 'chat-new-123',
        stream: 'ws://localhost/stream',
      }

      mockFetch.mockResolvedValueOnce(createMockFetchResponse(mockResponse))

      const response = await fetch('/api/chat/start', {
        method: 'POST',
        body: JSON.stringify({ mode: 'preview' }),
      })
      const data = await response.json()

      expect(data.ok).toBe(true)
      expect(data.chatId).toBe('chat-new-123')
    })

    it('should handle start chat errors', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockFetchResponse({ ok: false, error: 'Invalid mode' }, 400)
      )

      const response = await fetch('/api/chat/start', {
        method: 'POST',
        body: JSON.stringify({ mode: 'invalid' }),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
    })
  })

  describe('getChats', () => {
    it('should fetch chat list', async () => {
      const mockChats = {
        ok: true,
        chats: [
          { id: 'chat-1', title: 'Chat 1', createdAt: Date.now() },
          { id: 'chat-2', title: 'Chat 2', createdAt: Date.now() },
        ],
      }

      mockFetch.mockResolvedValueOnce(createMockFetchResponse(mockChats))

      const response = await fetch('/api/chats')
      const data = await response.json()

      expect(data.ok).toBe(true)
      expect(data.chats).toHaveLength(2)
    })

    it('should return empty array when no chats', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockFetchResponse({ ok: true, chats: [] })
      )

      const response = await fetch('/api/chats')
      const data = await response.json()

      expect(data.chats).toEqual([])
    })
  })

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const mockResponse = {
        ok: true,
        answer: 'AI response',
        flashcards: [{ q: 'Q?', a: 'A' }],
      }

      mockFetch.mockResolvedValueOnce(createMockFetchResponse(mockResponse))

      const response = await fetch('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          chatId: 'chat-123',
          message: 'Hello',
        }),
      })
      const data = await response.json()

      expect(data.ok).toBe(true)
      expect(data.answer).toBe('AI response')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        fetch('/api/chat/message', {
          method: 'POST',
          body: JSON.stringify({ message: 'Hello' }),
        })
      ).rejects.toThrow('Network error')
    })
  })

  describe('deleteChat', () => {
    it('should delete chat successfully', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockFetchResponse({ ok: true })
      )

      const response = await fetch('/api/chats/chat-123', {
        method: 'DELETE',
      })
      const data = await response.json()

      expect(data.ok).toBe(true)
    })
  })
})
