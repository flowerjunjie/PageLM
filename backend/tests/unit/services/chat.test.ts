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

      const result = await mkChat('Test Chat Title')

      expect(result).toHaveProperty('id', 'test-uuid-123')
      expect(result.title).toBe('Test Chat Title')
      expect(result).toHaveProperty('at')
      expect(typeof result.at).toBe('number')
    })

    it('should save chat metadata to database', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      await mkChat('My Chat')

      expect(mockSet).toHaveBeenCalledWith(
        'chat:test-uuid-123',
        expect.objectContaining({ id: 'test-uuid-123', title: 'My Chat' })
      )
    })

    it('should initialise an empty message list', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      await mkChat('My Chat')

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

      await mkChat('New Chat')

      expect(mockSet).toHaveBeenCalledWith(
        'chat:index',
        ['test-uuid-123', 'existing-1', 'existing-2']
      )
    })

    it('should create a single-entry index when no previous chats exist', async () => {
      mockGet.mockResolvedValue(null)
      mockSet.mockResolvedValue(undefined)

      await mkChat('First Chat')

      expect(mockSet).toHaveBeenCalledWith('chat:index', ['test-uuid-123'])
    })

    it('should cap the index at 1000 entries', async () => {
      const largeIndex = Array.from({ length: 1000 }, (_, i) => `chat-${i}`)
      mockGet.mockResolvedValue(largeIndex)
      mockSet.mockResolvedValue(undefined)

      await mkChat('New Chat')

      const indexCall = mockSet.mock.calls.find(call => call[0] === 'chat:index')
      expect(indexCall?.[1]).toHaveLength(1000)
      // Newest chat should be at position 0
      expect(indexCall?.[1][0]).toBe('test-uuid-123')
    })

    it('should handle empty array index', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await mkChat('Empty Index Chat')

      expect(result.id).toBe('test-uuid-123')
    })

    it('should propagate database errors', async () => {
      mockGet.mockRejectedValue(new Error('Database error'))

      await expect(mkChat('Test')).rejects.toThrow('Database error')
    })

    it('should return a ChatMeta object with required shape', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await mkChat('Shape Test')

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
      const chatMeta: ChatMeta = { id: 'chat-123', title: 'Test', at: 9000 }
      mockGet.mockResolvedValue(chatMeta)

      const result = await getChat('chat-123')

      expect(result).toEqual(chatMeta)
      expect(mockGet).toHaveBeenCalledWith('chat:chat-123')
    })

    it('should return undefined when the chat does not exist', async () => {
      mockGet.mockResolvedValue(undefined)

      const result = await getChat('non-existent')

      expect(result).toBeUndefined()
    })

    it('should return null when the database stores null', async () => {
      mockGet.mockResolvedValue(null)

      const result = await getChat('chat-123')

      expect(result).toBeNull()
    })

    it('should query with the correct key prefix', async () => {
      mockGet.mockResolvedValue(undefined)

      await getChat('abc-789')

      expect(mockGet).toHaveBeenCalledWith('chat:abc-789')
    })

    it('should propagate database errors', async () => {
      mockGet.mockRejectedValue(new Error('Connection failed'))

      await expect(getChat('chat-123')).rejects.toThrow('Connection failed')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // addMsg
  // ─────────────────────────────────────────────────────────────────────────────
  describe('addMsg', () => {
    it('should append a message to an existing message list', async () => {
      const existing: ChatMsg[] = [{ role: 'user', content: 'Hello', at: 1000 }]
      const chatMeta: ChatMeta = { id: 'chat-123', title: 'Test', at: 1000 }
      mockGet
        .mockResolvedValueOnce(existing)   // msgs fetch
        .mockResolvedValueOnce(chatMeta)   // chat meta fetch

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
      const chatMeta: ChatMeta = { id: 'chat-123', title: 'Test', at: 1000 }
      mockGet
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(chatMeta)

      const msg: ChatMsg = { role: 'user', content: 'Hello', at: 2000 }
      await addMsg('chat-123', msg)

      expect(mockSet).toHaveBeenCalledWith('msgs:chat-123', [msg])
    })

    it('should update the chat timestamp after adding a message', async () => {
      const chatMeta: ChatMeta = { id: 'chat-123', title: 'Test', at: 1 }
      mockGet
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(chatMeta)

      const before = Date.now()
      const msg: ChatMsg = { role: 'user', content: 'Test', at: before }
      await addMsg('chat-123', msg)

      const chatSetCall = mockSet.mock.calls.find(call => call[0] === 'chat:chat-123')
      expect(chatSetCall?.[1].at).toBeGreaterThanOrEqual(before)
    })

    it('should handle messages with complex content objects', async () => {
      const chatMeta: ChatMeta = { id: 'chat-123', title: 'Test', at: 1000 }
      mockGet
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(chatMeta)

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
      const chatMeta: ChatMeta = { id: 'chat-123', title: 'T', at: 2000 }
      mockGet
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(chatMeta)

      const newMsg: ChatMsg = { role: 'user', content: 'Third', at: 3000 }
      await addMsg('chat-123', newMsg)

      const setCall = mockSet.mock.calls.find(call => call[0] === 'msgs:chat-123')
      expect(setCall?.[1]).toHaveLength(3)
      expect(setCall?.[1][0].content).toBe('First')
      expect(setCall?.[1][2].content).toBe('Third')
    })

    it('should skip the chat update if chat metadata is missing', async () => {
      mockGet
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(undefined)  // no meta

      await addMsg('ghost-chat', { role: 'user', content: 'Test', at: Date.now() })

      // Set should only be called once (for msgs), not twice (chat would be second)
      const chatSetCall = mockSet.mock.calls.find(call => call[0] === 'chat:ghost-chat')
      expect(chatSetCall).toBeUndefined()
    })

    it('should propagate database errors', async () => {
      mockGet.mockRejectedValue(new Error('Write failed'))

      await expect(
        addMsg('chat-123', { role: 'user', content: 'Test', at: Date.now() })
      ).rejects.toThrow('Write failed')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // listChats
  // ─────────────────────────────────────────────────────────────────────────────
  describe('listChats', () => {
    it('should return chats sorted by timestamp descending', async () => {
      const chatIds = ['chat-1', 'chat-2', 'chat-3']
      mockGet
        .mockResolvedValueOnce(chatIds)
        .mockResolvedValueOnce({ id: 'chat-1', title: 'A', at: 3000 })
        .mockResolvedValueOnce({ id: 'chat-2', title: 'B', at: 1000 })
        .mockResolvedValueOnce({ id: 'chat-3', title: 'C', at: 2000 })

      const result = await listChats()

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('chat-1')  // highest at
      expect(result[1].id).toBe('chat-3')
      expect(result[2].id).toBe('chat-2')  // lowest at
    })

    it('should limit results to the given count', async () => {
      const chatIds = Array.from({ length: 100 }, (_, i) => `chat-${i}`)
      mockGet.mockResolvedValue(chatIds) // first call returns index, subsequent return undefined
      // Stub individual chat lookups
      mockGet.mockResolvedValueOnce(chatIds)
      for (let i = 0; i < 10; i++) {
        mockGet.mockResolvedValueOnce({ id: `chat-${i}`, title: `T${i}`, at: i })
      }

      await listChats(10)

      // 1 index fetch + 10 chat fetches
      expect(mockGet).toHaveBeenCalledTimes(11)
    })

    it('should default to 50 chats', async () => {
      const chatIds = Array.from({ length: 60 }, (_, i) => `chat-${i}`)
      mockGet.mockResolvedValueOnce(chatIds)
      for (let i = 0; i < 50; i++) {
        mockGet.mockResolvedValueOnce({ id: `chat-${i}`, title: `T${i}`, at: i })
      }

      await listChats()

      expect(mockGet).toHaveBeenCalledTimes(51)
    })

    it('should filter out deleted (null/undefined) chats', async () => {
      const chatIds = ['chat-1', 'chat-2', 'chat-3']
      mockGet
        .mockResolvedValueOnce(chatIds)
        .mockResolvedValueOnce({ id: 'chat-1', title: 'A', at: 3000 })
        .mockResolvedValueOnce(undefined)                               // deleted
        .mockResolvedValueOnce({ id: 'chat-3', title: 'C', at: 1000 })

      const result = await listChats()

      expect(result).toHaveLength(2)
      expect(result.map(c => c.id)).not.toContain('chat-2')
    })

    it('should return empty array for empty index', async () => {
      mockGet.mockResolvedValue([])

      const result = await listChats()

      expect(result).toEqual([])
    })

    it('should return empty array when index is null', async () => {
      mockGet.mockResolvedValue(null)

      const result = await listChats()

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
      const messages: ChatMsg[] = [
        { role: 'user', content: 'Hello', at: 1000 },
        { role: 'assistant', content: 'Hi', at: 2000 },
      ]
      mockGet.mockResolvedValue(messages)

      const result = await getMsgs('chat-123')

      expect(result).toEqual(messages)
      expect(mockGet).toHaveBeenCalledWith('msgs:chat-123')
    })

    it('should return empty array when no messages stored', async () => {
      mockGet.mockResolvedValue(undefined)

      const result = await getMsgs('chat-123')

      expect(result).toEqual([])
    })

    it('should return empty array when stored value is null', async () => {
      mockGet.mockResolvedValue(null)

      const result = await getMsgs('chat-123')

      expect(result).toEqual([])
    })

    it('should preserve message order', async () => {
      const messages: ChatMsg[] = [
        { role: 'user', content: 'First', at: 1000 },
        { role: 'assistant', content: 'Second', at: 2000 },
        { role: 'user', content: 'Third', at: 3000 },
      ]
      mockGet.mockResolvedValue(messages)

      const result = await getMsgs('chat-123')

      expect(result[0].content).toBe('First')
      expect(result[1].content).toBe('Second')
      expect(result[2].content).toBe('Third')
    })

    it('should query with correct key', async () => {
      mockGet.mockResolvedValue([])

      await getMsgs('my-chat-id')

      expect(mockGet).toHaveBeenCalledWith('msgs:my-chat-id')
    })

    it('should propagate database errors', async () => {
      mockGet.mockRejectedValue(new Error('Read failed'))

      await expect(getMsgs('chat-123')).rejects.toThrow('Read failed')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Type-shape assertions
  // ─────────────────────────────────────────────────────────────────────────────
  describe('ChatMeta and ChatMsg shapes', () => {
    it('mkChat returns a properly typed ChatMeta object', async () => {
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue(undefined)

      const result = await mkChat('Shape Test')

      expect(typeof result.id).toBe('string')
      expect(typeof result.title).toBe('string')
      expect(typeof result.at).toBe('number')
    })

    it('addMsg stores a message with correct role and at fields', async () => {
      const chatMeta: ChatMeta = { id: 'chat-123', title: 'T', at: 1000 }
      mockGet
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(chatMeta)

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
