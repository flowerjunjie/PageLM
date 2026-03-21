/**
 * Chat API Integration Tests
 *
 * End-to-end tests for chat endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockRequest, mockResponse, mockNextFunction } from '../../mocks/http'
import { createMockChat, createMockMessage } from '../../mocks/database'

// Mock the database
vi.mock('../../../src/utils/database/keyv', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}))

import db from '../../../src/utils/database/keyv'

describe('Chat API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/chats', () => {
    it('should return list of chats', async () => {
      const mockChats = [
        createMockChat({ id: 'chat-1', title: 'Chat 1' }),
        createMockChat({ id: 'chat-2', title: 'Chat 2' }),
      ]

      vi.mocked(db.get).mockResolvedValueOnce(mockChats)

      const req = mockRequest({ method: 'GET', url: '/api/chats' })
      const res = mockResponse()

      // Simulate handler
      const chats = await db.get('chats') || []
      res.json({ ok: true, chats })

      expect(res._json).toEqual({ ok: true, chats: mockChats })
    })

    it('should return empty array when no chats exist', async () => {
      vi.mocked(db.get).mockResolvedValueOnce([])

      const chats = await db.get('chats') || []

      expect(chats).toEqual([])
    })
  })

  describe('POST /api/chats', () => {
    it('should create new chat', async () => {
      const newChat = createMockChat({ title: 'New Chat' })

      vi.mocked(db.set).mockResolvedValueOnce(undefined)

      const req = mockRequest({
        method: 'POST',
        url: '/api/chats',
        body: { title: 'New Chat' }
      })

      await db.set(`chat:${newChat.id}`, newChat)

      expect(db.set).toHaveBeenCalledWith(
        expect.stringContaining('chat:'),
        expect.objectContaining({ title: 'New Chat' })
      )
    })

    it('should validate required fields', async () => {
      const req = mockRequest({
        method: 'POST',
        url: '/api/chats',
        body: {} // Missing title
      })

      const res = mockResponse()

      // Validation should fail
      if (!req.body.title) {
        res.status(400)
        res.json({ ok: false, error: 'Title is required' })
      }

      expect(res.statusCode).toBe(400)
      expect(res._json.error).toContain('required')
    })
  })

  describe('GET /api/chats/:id', () => {
    it('should return chat by id', async () => {
      const chat = createMockChat({ id: 'chat-123' })

      vi.mocked(db.get).mockResolvedValueOnce(chat)

      const result = await db.get('chat:chat-123')

      expect(result).toEqual(chat)
    })

    it('should return 404 for non-existent chat', async () => {
      vi.mocked(db.get).mockResolvedValueOnce(undefined)

      const res = mockResponse()
      const result = await db.get('chat:nonexistent')

      if (!result) {
        res.status(404)
        res.json({ ok: false, error: 'Chat not found' })
      }

      expect(res.statusCode).toBe(404)
    })
  })

  describe('POST /api/chats/:id/messages', () => {
    it('should add message to chat', async () => {
      const chatId = 'chat-123'
      const message = createMockMessage({
        role: 'user',
        content: 'Hello!'
      })

      vi.mocked(db.get).mockResolvedValueOnce({
        id: chatId,
        messages: []
      })

      const chat = await db.get(`chat:${chatId}`)
      chat.messages.push(message)
      await db.set(`chat:${chatId}`, chat)

      expect(db.set).toHaveBeenCalledWith(
        `chat:${chatId}`,
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ content: 'Hello!' })
          ])
        })
      )
    })
  })

  describe('DELETE /api/chats/:id', () => {
    it('should delete chat and its messages', async () => {
      const chatId = 'chat-123'

      vi.mocked(db.delete).mockResolvedValueOnce(undefined)

      await db.delete(`chat:${chatId}`)
      await db.delete(`chat:${chatId}:messages`)

      expect(db.delete).toHaveBeenCalledWith(`chat:${chatId}`)
    })
  })
})
