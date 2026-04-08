/**
 * WebSocket Mock for Backend Tests
 * Provides mock implementations for WebSocket connections
 */

import { vi } from 'vitest'
import { EventEmitter } from 'events'

/**
 * Mock WebSocket client
 */
export class MockWebSocket extends EventEmitter {
  public readyState: number = 1 // OPEN
  public url: string
  public sentMessages: any[] = []
  public bufferedAmount: number = 0

  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  constructor(url: string) {
    super()
    this.url = url

    // Simulate connection opening
    setImmediate(() => {
      this.emit('open')
    })
  }

  send(data: string | Buffer | ArrayBuffer | any[], callback?: () => void): void {
    this.sentMessages.push(data)
    this.emit('message', { data: typeof data === 'string' ? data : JSON.stringify(data) })
    if (callback) callback()
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED
    this.emit('close', code, reason)
  }

  ping(): void {
    this.emit('pong')
  }

  // Test helper methods
  simulateMessage(data: any): void {
    const message = typeof data === 'string' ? data : JSON.stringify(data)
    this.emit('message', { data: message })
  }

  simulateError(error: Error): void {
    this.emit('error', error)
  }

  simulateClose(code: number = 1000, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED
    this.emit('close', code, reason)
  }
}

/**
 * Mock WebSocket server
 */
export class MockWebSocketServer extends EventEmitter {
  public clients: Set<MockWebSocket> = new Set()
  public options: any

  constructor(options?: any) {
    super()
    this.options = options
  }

  handleConnection(ws: MockWebSocket, req?: any): void {
    this.clients.add(ws)
    this.emit('connection', ws, req)

    ws.on('close', () => {
      this.clients.delete(ws)
    })
  }

  broadcast(message: any, exclude?: MockWebSocket): void {
    const data = typeof message === 'string' ? message : JSON.stringify(message)
    for (const client of this.clients) {
      if (client !== exclude && client.readyState === MockWebSocket.OPEN) {
        client.send(data)
      }
    }
  }

  close(): void {
    for (const client of this.clients) {
      client.close()
    }
    this.clients.clear()
    this.emit('close')
  }
}

/**
 * Factory for creating mock WebSocket clients
 */
export function createMockWebSocketClient(url: string = 'ws://localhost:5000'): MockWebSocket {
  return new MockWebSocket(url)
}

/**
 * Factory for creating mock WebSocket messages
 */
export function createMockWebSocketMessage(type: string, data: any = {}): any {
  return {
    type,
    ...data,
    timestamp: Date.now(),
  }
}

/**
 * Mock WebSocket module
 */
export const mockWebSocket = {
  WebSocket: MockWebSocket,
  WebSocketServer: MockWebSocketServer,
}

/**
 * Mock express-ws
 */
export const mockWebSocketServer = {
  getWss: vi.fn(() => new MockWebSocketServer()),
  applyTo: vi.fn((app: any) => {
    app.ws = vi.fn((path: string, handler: any) => {
      // Store the handler for testing
      app._wsHandlers = app._wsHandlers || {}
      app._wsHandlers[path] = handler
    })
    return app
  }),
}

export default mockWebSocket
