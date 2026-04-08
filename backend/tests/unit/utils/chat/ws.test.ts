/**
 * WebSocket Utilities Unit Tests
 *
 * Tests for emitToAll and emitLarge functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MockWebSocket } from '../../../mocks/websocket'

// Mock the ws module before importing
vi.mock('zlib', () => ({
  gzipSync: vi.fn((buffer) => Buffer.from('gzip compressed')),
  createGzip: vi.fn(),
}))

import { emitToAll, emitLarge } from '../../../../src/utils/chat/ws'

describe('WebSocket Utils', () => {
  describe('emitToAll', () => {
    it('should not throw when set is undefined', () => {
      expect(() => emitToAll(undefined, { type: 'test' })).not.toThrow()
    })

    it('should not throw when set is empty', () => {
      const emptySet = new Set()
      expect(() => emitToAll(emptySet, { type: 'test' })).not.toThrow()
    })

    it('should send message to all valid sockets', () => {
      const ws1 = new MockWebSocket('ws://localhost/chat1')
      const ws2 = new MockWebSocket('ws://localhost/chat2')
      const socketSet = new Set([ws1, ws2])

      emitToAll(socketSet, { type: 'test', data: 'hello' })

      expect(ws1.sentMessages.length).toBe(1)
      expect(ws2.sentMessages.length).toBe(1)

      const msg1 = JSON.parse(ws1.sentMessages[0])
      expect(msg1.type).toBe('test')
      expect(msg1.data).toBe('hello')
    })

    it('should skip sockets with invalid readyState', () => {
      const ws1 = new MockWebSocket('ws://localhost/chat1')
      ws1.readyState = 3 // CLOSED

      const ws2 = new MockWebSocket('ws://localhost/chat2')
      ws2.readyState = 1 // OPEN

      const socketSet = new Set([ws1, ws2])
      emitToAll(socketSet, { type: 'test' })

      // Only ws2 should receive the message
      expect(ws1.sentMessages.length).toBe(0)
      expect(ws2.sentMessages.length).toBe(1)
    })

    it('should handle string payloads', () => {
      const ws = new MockWebSocket('ws://localhost/chat')
      const socketSet = new Set([ws])

      emitToAll(socketSet, 'plain string message')

      expect(ws.sentMessages.length).toBe(1)
      expect(ws.sentMessages[0]).toBe('plain string message')
    })

    it('should handle object payloads with JSON serialization', () => {
      const ws = new MockWebSocket('ws://localhost/chat')
      const socketSet = new Set([ws])

      const payload = { type: 'answer', answer: 'Test response', timestamp: 1234567890 }
      emitToAll(socketSet, payload)

      expect(ws.sentMessages.length).toBe(1)
      const parsed = JSON.parse(ws.sentMessages[0])
      expect(parsed.type).toBe('answer')
      expect(parsed.answer).toBe('Test response')
    })

    it('should skip null/undefined sockets', () => {
      const ws = new MockWebSocket('ws://localhost/chat')
      const socketSet = new Set([null, ws, undefined])

      emitToAll(socketSet, { type: 'test' })

      expect(ws.sentMessages.length).toBe(1)
    })
  })

  describe('emitLarge', () => {
    it('should not throw when set is undefined', async () => {
      await expect(
        emitLarge(undefined as any, 'test', { data: 'test' })
      ).resolves.not.toThrow()
    })

    it('should not throw when set is empty', async () => {
      const emptySet = new Set()
      await expect(
        emitLarge(emptySet, 'test', { data: 'test' })
      ).resolves.not.toThrow()
    })

    it('should chunk large payloads', async () => {
      const ws = new MockWebSocket('ws://localhost/chat')
      const socketSet = new Set([ws])

      // Create a payload larger than default chunk size (128KB)
      const largeData = 'x'.repeat(200 * 1024)

      await emitLarge(socketSet, 'large', { data: largeData }, { chunkBytes: 50 * 1024 })

      // Should have sent multiple chunks
      expect(ws.sentMessages.length).toBeGreaterThan(1)

      // First message should be a chunk
      const firstMsg = JSON.parse(ws.sentMessages[0])
      expect(firstMsg.type).toBe('large.chunk')
      expect(firstMsg.more).toBe(true)
    })

    it('should send done message after all chunks', async () => {
      const ws = new MockWebSocket('ws://localhost/chat')
      const socketSet = new Set([ws])

      const largeData = 'x'.repeat(100 * 1024)
      await emitLarge(socketSet, 'test', { data: largeData }, { chunkBytes: 30 * 1024 })

      // Last message should be done
      const lastMsg = JSON.parse(ws.sentMessages[ws.sentMessages.length - 1])
      expect(lastMsg.type).toBe('test.done')
    })

    it('should use provided id for chunking', async () => {
      const ws = new MockWebSocket('ws://localhost/chat')
      const socketSet = new Set([ws])

      const largeData = 'x'.repeat(100 * 1024)
      const customId = 'custom-chunk-id-12345'

      await emitLarge(socketSet, 'data', { data: largeData }, { id: customId })

      const firstMsg = JSON.parse(ws.sentMessages[0])
      expect(firstMsg.id).toBe(customId)
    })

    it('should send to multiple sockets in parallel', async () => {
      const ws1 = new MockWebSocket('ws://localhost/chat1')
      const ws2 = new MockWebSocket('ws://localhost/chat2')
      const socketSet = new Set([ws1, ws2])

      const largeData = 'x'.repeat(100 * 1024)
      await emitLarge(socketSet, 'multi', { data: largeData }, { chunkBytes: 25 * 1024 })

      // Both sockets should receive same number of messages
      expect(ws1.sentMessages.length).toBe(ws2.sentMessages.length)
    })

    it('should filter out closed sockets', async () => {
      const ws1 = new MockWebSocket('ws://localhost/chat1')
      ws1.readyState = 3 // CLOSED

      const ws2 = new MockWebSocket('ws://localhost/chat2')
      const socketSet = new Set([ws1, ws2])

      const largeData = 'x'.repeat(100 * 1024)
      await emitLarge(socketSet, 'filter', { data: largeData }, { chunkBytes: 25 * 1024 })

      // Only ws2 should receive messages
      expect(ws1.sentMessages.length).toBe(0)
      expect(ws2.sentMessages.length).toBeGreaterThan(0)
    })
  })
})
