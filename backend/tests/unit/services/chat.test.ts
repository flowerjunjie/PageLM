import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock must use inline factory with no top-level variable references
vi.mock('../../../src/utils/database/keyv', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-123'),
}))

// Import db after vi.mock declarations
import db from '../../../src/utils/database/keyv'
import { mkChat, getChat, addMsg, listChats, getMsgs, type ChatMeta, type ChatMsg } from '../../../src/utils/chat/chat'

// Typed references to mocked functions
const mockGet = vi.mocked(db.get)
const mockSet = vi.mocked(db.set)

describe('ChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // mkChat
  // ─────────────────────────────────────────────────────────────────────────────
  describe('mkChat', () => {
    it('should create a new chat with valid title', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await mkChat('Test Chat Title', 'user-1')

      expect(result).toHaveProperty('id', 'test-uuid-123')
      expect(result).toHaveProperty('userId', 'user-1')
      expect(result.title).toBe('Test Chat Title')
      expect(result).toHaveProperty('at')
      expect(typeof result.at).toBe('number')
    })

    it('should save chat metadata to database', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      await mkChat('My Chat', 'user-1')

      expect(mockSet).toHaveBeenCalledWith(
        'chat:test-uuid-123',
        expect.objectContaining({ id: 'test-uuid-123', title: 'My Chat' })
      )
    })

    it('should initialise an empty message list', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      await mkChat('My Chat', 'user-1')

      expect(mockSet).toHaveBeenCalledWith('msgs:test-uuid-123', [])
    })

    it('should truncate title to 60 characters', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const longTitle = 'A'.repeat(100)
      const result = await mkChat(longTitle)

      expect(result.title).toBe(longTitle.slice(0, 60))
      expect(result.title).toHaveLength(60)
    })

    it('should keep a title that is exactly 60 characters unchanged', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const title60 = 'B'.repeat(60)
      const result = await mkChat(title60)

      expect(result.title).toBe(title60)
    })

    it('should prepend the new chat id to the existing index', async () => {
      mockGet.mockResolvedValue(['existing-1', 'existing-2'])
      mockSet.mockResolvedValue(undefined)

      await mkChat('New Chat', 'user-1')

      expect(mockSet).toHaveBeenCalledWith(
        'chat:index',
        ['test-uuid-123', 'existing-1', 'existing-2']
      )
    })

    it('should create a single-entry index when no previous chats exist', async () => {
      mockGet.mockResolvedValue(null)
      mockSet.mockResolvedValue(undefined)

      await mkChat('First Chat', 'user-1')

      expect(mockSet).toHaveBeenCalledWith('chat:index', ['test-uuid-123'])
    })

    it('should cap the index at 1000 entries', async () => {
      const largeIndex = Array.from({ length: 1000 }, (_, i) => `chat-${i}`)
      mockGet.mockResolvedValue(largeIndex)
      mockSet.mockResolvedValue(undefined)

      await mkChat('New Chat', 'user-1')

      const indexCall = mockSet.mock.calls.find(call => call[0] === 'chat:index')
      expect(indexCall?.[1]).toHaveLength(1000)
      // Newest chat should be at position 0
      expect(indexCall?.[1][0]).toBe('test-uuid-123')
    })

    it('should handle empty array index', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await mkChat('Empty Index Chat', 'user-1')

      expect(result.id).toBe('test-uuid-123')
    })

    it('should propagate database errors', async () => {
      mockGet.mockRejectedValue(new Error('Database error'))

      await expect(mkChat('Test', 'user-1')).rejects.toThrow('Database error')
    })

    it('should return a ChatMeta object with required shape', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await mkChat('Shape Test', 'user-1')

      expect(result).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        at: expect.any(Number),
      })
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // getChat
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getChat', () => {
    it('should return chat metadata when found', async () => {
      const chatMeta: ChatMeta = { id: 'chat-123', userId: 'user-1', title: 'Test', at: 9000 }
      mockGet.mockResolvedValue(chatMeta)

      const result = await getChat('chat-123', 'user-1')

      expect(result).toEqual(chatMeta)
      expect(mockGet).toHaveBeenCalledWith('chat:chat-123')
    })

    it('should return undefined when the chat does not exist', async () => {
      mockGet.mockResolvedValue(undefined)

      const result = await getChat('non-existent', 'user-1')

      expect(result).toBeUndefined()
    })

    it('should return null when the database stores null', async () => {
      mockGet.mockResolvedValue(null)

      const result = await getChat('chat-123', 'user-1')

      expect(result).toBeNull()
    })

    it('should query with the correct key prefix', async () => {
      mockGet.mockResolvedValue(undefined)

      await getChat('abc-789', 'user-1')

      expect(mockGet).toHaveBeenCalledWith('chat:abc-789')
    })

    it('should propagate database errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Connection failed'))

      await expect(getChat('chat-123', 'user-1')).rejects.toThrow('Connection failed')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // addMsg
  // ─────────────────────────────────────────────────────────────────────────────
  describe('addMsg', () => {
    it('should append a message to an existing message list', async () => {
      const existing: ChatMsg[] = [{ role: 'user', content: 'Hello', at: 1000 }]
      const chatMeta: ChatMeta = { id: 'chat-123', userId: 'user-1', title: 'Test', at: 1000 }
      mockGet
        .mockResolvedValueOnce(chatMeta)   // getChat call
        .mockResolvedValueOnce(existing)    // getMsgs call

      const newMsg: ChatMsg = { role: 'assistant', content: 'Hi there', at: 2000 }
      await addMsg('chat-123', newMsg)

      // addMsg mutates the array via push(), so we check both messages are present
      expect(mockSet).toHaveBeenCalledWith(
        'msgs:chat-123',
        expect.arrayContaining([
          expect.objectContaining({ content: 'Hello', role: 'user' }),
          expect.objectContaining({ content: 'Hi there', role: 'assistant' }),
        ])
      )
    })

    it('should create a fresh list when no messages exist yet', async () => {
      const chatMeta: ChatMeta = { id: 'chat-123', userId: 'user-1', title: 'Test', at: 1000 }
      mockGet
        .mockResolvedValueOnce(chatMeta)   // getChat call
        .mockResolvedValueOnce(undefined) // getMsgs call returns undefined

      const msg: ChatMsg = { role: 'user', content: 'Hello', at: 2000 }
      await addMsg('chat-123', msg)

      expect(mockSet).toHaveBeenCalledWith('msgs:chat-123', [msg])
    })

    it('should update the chat timestamp after adding a message', async () => {
      const chatMeta: ChatMeta = { id: 'chat-123', userId: 'user-1', title: 'Test', at: 1 }
      mockGet
        .mockResolvedValueOnce(chatMeta)   // getChat call
        .mockResolvedValueOnce([])         // getMsgs returns empty
        .mockResolvedValueOnce(chatMeta)   // second getChat call to update timestamp

      const before = Date.now()
      const msg: ChatMsg = { role: 'user', content: 'Test', at: before }
      await addMsg('chat-123', msg)

      const chatSetCall = mockSet.mock.calls.find(call => call[0] === 'chat:chat-123')
      expect(chatSetCall?.[1].at).toBeGreaterThanOrEqual(before)
    })

    it('should handle messages with complex content objects', async () => {
      const chatMeta: ChatMeta = { id: 'chat-123', userId: 'user-1', title: 'Test', at: 1000 }
      mockGet
        .mockResolvedValueOnce(chatMeta)   // getChat call
        .mockResolvedValueOnce([])         // getMsgs returns empty

      const complexContent = { text: 'Hello', attachments: ['file.pdf'] }
      const msg: ChatMsg = { role: 'user', content: complexContent, at: Date.now() }
      await addMsg('chat-123', msg)

      expect(mockSet).toHaveBeenCalledWith(
        'msgs:chat-123',
        expect.arrayContaining([expect.objectContaining({ content: complexContent })])
      )
    })

    it('should not overwrite existing messages – only append', async () => {
      const existing: ChatMsg[] = [
        { role: 'user', content: 'First', at: 1000 },
        { role: 'assistant', content: 'Second', at: 2000 },
      ]
      const chatMeta: ChatMeta = { id: 'chat-123', userId: 'user-1', title: 'T', at: 2000 }
      mockGet
        .mockResolvedValueOnce(chatMeta)   // getChat call
        .mockResolvedValueOnce(existing)    // getMsgs returns existing

      const newMsg: ChatMsg = { role: 'user', content: 'Third', at: 3000 }
      await addMsg('chat-123', newMsg)

      const setCall = mockSet.mock.calls.find(call => call[0] === 'msgs:chat-123')
      expect(setCall?.[1]).toHaveLength(3)
      expect(setCall?.[1][0].content).toBe('First')
      expect(setCall?.[1][2].content).toBe('Third')
    })

    it('should skip the chat update if chat metadata is missing', async () => {
      mockGet
        .mockResolvedValueOnce(undefined)  // getChat returns undefined (chat not found)
        // getMsgs not called since chat is falsy

      await addMsg('ghost-chat', { role: 'user', content: 'Test', at: Date.now() })

      // Set should not be called at all since chat was not found
      const msgSetCall = mockSet.mock.calls.find(call => call[0] === 'msgs:ghost-chat')
      expect(msgSetCall).toBeUndefined()
    })

    it('should propagate database errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Write failed'))

      await expect(
        addMsg('chat-123', { role: 'user', content: 'Test', at: Date.now() }, 'user-1')
      ).rejects.toThrow('Write failed')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // listChats
  // ─────────────────────────────────────────────────────────────────────────────
  describe('listChats', () => {
    it('should return chats sorted by timestamp descending', async () => {
      const chatIds = [
        { id: 'chat-1', userId: 'user-1' },
        { id: 'chat-2', userId: 'user-1' },
        { id: 'chat-3', userId: 'user-1' },
      ]
      mockGet
        .mockResolvedValueOnce(chatIds)
        .mockResolvedValueOnce({ id: 'chat-1', userId: 'user-1', title: 'A', at: 3000 })
        .mockResolvedValueOnce({ id: 'chat-2', userId: 'user-1', title: 'B', at: 1000 })
        .mockResolvedValueOnce({ id: 'chat-3', userId: 'user-1', title: 'C', at: 2000 })

      const result = await listChats('user-1')

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('chat-1')  // highest at
      expect(result[1].id).toBe('chat-3')
      expect(result[2].id).toBe('chat-2')  // lowest at
    })

    it('should limit results to the given count', async () => {
      const chatIds = Array.from({ length: 100 }, (_, i) => ({ id: `chat-${i}`, userId: 'user-1' }))
      mockGet.mockResolvedValue(chatIds) // first call returns index, subsequent return undefined
      // Stub individual chat lookups
      mockGet.mockResolvedValueOnce(chatIds)
      for (let i = 0; i < 10; i++) {
        mockGet.mockResolvedValueOnce({ id: `chat-${i}`, userId: 'user-1', title: `T${i}`, at: i })
      }

      await listChats('user-1', 10)

      // 1 index fetch + 10 chat fetches
      expect(mockGet).toHaveBeenCalledTimes(11)
    })

    it('should default to 50 chats', async () => {
      const chatIds = Array.from({ length: 60 }, (_, i) => ({ id: `chat-${i}`, userId: 'user-1' }))
      mockGet.mockResolvedValueOnce(chatIds)
      for (let i = 0; i < 50; i++) {
        mockGet.mockResolvedValueOnce({ id: `chat-${i}`, userId: 'user-1', title: `T${i}`, at: i })
      }

      await listChats('user-1')

      expect(mockGet).toHaveBeenCalledTimes(51)
    })

    it('should filter out deleted (null/undefined) chats', async () => {
      const chatIds = [
        { id: 'chat-1', userId: 'user-1' },
        { id: 'chat-2', userId: 'user-1' },
        { id: 'chat-3', userId: 'user-1' },
      ]
      mockGet
        .mockResolvedValueOnce(chatIds)
        .mockResolvedValueOnce({ id: 'chat-1', userId: 'user-1', title: 'A', at: 3000 })
        .mockResolvedValueOnce(undefined)                               // deleted
        .mockResolvedValueOnce({ id: 'chat-3', userId: 'user-1', title: 'C', at: 1000 })

      const result = await listChats('user-1')

      expect(result).toHaveLength(2)
      expect(result.map(c => c.id)).not.toContain('chat-2')
    })

    it('should return empty array for empty index', async () => {
      mockGet.mockResolvedValue([])

      const result = await listChats('user-1')

      expect(result).toEqual([])
    })

    it('should return empty array when index is null', async () => {
      mockGet.mockResolvedValue(null)

      const result = await listChats('user-1')

      expect(result).toEqual([])
    })

    it('should propagate database errors', async () => {
      mockGet.mockRejectedValue(new Error('Index corrupted'))

      await expect(listChats()).rejects.toThrow('Index corrupted')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // getMsgs
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getMsgs', () => {
    it('should return all messages for a chat', async () => {
      const chatMeta: ChatMeta = { id: 'chat-123', userId: 'user-1', title: 'T', at: 1000 }
      const messages: ChatMsg[] = [
        { role: 'user', content: 'Hello', at: 1000 },
        { role: 'assistant', content: 'Hi', at: 2000 },
      ]
      mockGet
        .mockResolvedValueOnce(chatMeta)  // getChat call
        .mockResolvedValueOnce(messages)    // getMsgs call

      const result = await getMsgs('chat-123', 'user-1')

      expect(result).toEqual(messages)
      expect(mockGet).toHaveBeenCalledWith('chat:chat-123')
      expect(mockGet).toHaveBeenCalledWith('msgs:chat-123')
    })

    it('should return empty array when no messages stored', async () => {
      const chatMeta: ChatMeta = { id: 'chat-123', userId: 'user-1', title: 'T', at: 1000 }
      mockGet
        .mockResolvedValueOnce(chatMeta)  // getChat call
        .mockResolvedValueOnce(undefined) // getMsgs call

      const result = await getMsgs('chat-123', 'user-1')

      expect(result).toEqual([])
    })

    it('should return empty array when stored value is null', async () => {
      const chatMeta: ChatMeta = { id: 'chat-123', userId: 'user-1', title: 'T', at: 1000 }
      mockGet
        .mockResolvedValueOnce(chatMeta)  // getChat call
        .mockResolvedValueOnce(null)      // getMsgs call

      const result = await getMsgs('chat-123', 'user-1')

      expect(result).toEqual([])
    })

    it('should preserve message order', async () => {
      const chatMeta: ChatMeta = { id: 'chat-123', userId: 'user-1', title: 'T', at: 1000 }
      const messages: ChatMsg[] = [
        { role: 'user', content: 'First', at: 1000 },
        { role: 'assistant', content: 'Second', at: 2000 },
        { role: 'user', content: 'Third', at: 3000 },
      ]
      mockGet
        .mockResolvedValueOnce(chatMeta)  // getChat call
        .mockResolvedValueOnce(messages)   // getMsgs call

      const result = await getMsgs('chat-123', 'user-1')

      expect(result[0].content).toBe('First')
      expect(result[1].content).toBe('Second')
      expect(result[2].content).toBe('Third')
    })

    it('should query with correct key', async () => {
      const chatMeta: ChatMeta = { id: 'my-chat-id', userId: 'user-1', title: 'T', at: 1000 }
      mockGet
        .mockResolvedValueOnce(chatMeta)  // getChat call
        .mockResolvedValueOnce([])        // getMsgs call

      await getMsgs('my-chat-id', 'user-1')

      expect(mockGet).toHaveBeenCalledWith('chat:my-chat-id')
      expect(mockGet).toHaveBeenCalledWith('msgs:my-chat-id')
    })

    it('should propagate database errors', async () => {
      mockGet.mockRejectedValue(new Error('Read failed'))

      await expect(getMsgs('chat-123', 'user-1')).rejects.toThrow('Read failed')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Type-shape assertions
  // ─────────────────────────────────────────────────────────────────────────────
  describe('ChatMeta and ChatMsg shapes', () => {
    it('mkChat returns a properly typed ChatMeta object', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await mkChat('Shape Test', 'user-1')

      expect(typeof result.id).toBe('string')
      expect(typeof result.title).toBe('string')
      expect(typeof result.at).toBe('number')
    })

    it('addMsg stores a message with correct role and at fields', async () => {
      const chatMeta: ChatMeta = { id: 'chat-123', userId: 'user-1', title: 'T', at: 1000 }
      mockGet
        .mockResolvedValueOnce(chatMeta)  // getChat returns chat
        .mockResolvedValueOnce([])        // getMsgs returns empty array

      const msg: ChatMsg = { role: 'user', content: 'Test', at: Date.now() }
      await addMsg('chat-123', msg)

      const setCall = mockSet.mock.calls.find(call => call[0] === 'msgs:chat-123')
      const stored = setCall?.[1][0]
      expect(stored).toMatchObject({
        role: expect.stringMatching(/^(user|assistant)$/),
        content: expect.anything(),
        at: expect.any(Number),
      })
    })
  })
})
