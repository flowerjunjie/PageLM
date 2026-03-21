/**
 * API Mock for Frontend Tests
 * Provides mock implementations for API calls
 */

import { vi } from 'vitest'

/**
 * Mock API response factory
 */
export function createMockApiResponse<T>(data: T, success = true) {
  return {
    ok: success,
    data,
    error: success ? undefined : 'Error occurred',
  }
}

/**
 * Mock API error response
 */
export function createMockApiError(message: string, code?: string) {
  return {
    ok: false,
    error: message,
    code,
  }
}

/**
 * Mock fetch implementation
 */
export const mockFetch = vi.fn()

/**
 * Setup mock fetch for tests
 */
export function setupMockFetch() {
  global.fetch = mockFetch
}

/**
 * Create mock response for fetch
 */
export function createMockFetchResponse<T>(
  data: T,
  status = 200,
  headers?: Record<string, string>
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers(headers),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    blob: () => Promise.resolve(new Blob([JSON.stringify(data)])),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    clone: function() { return this },
    body: null,
    bodyUsed: false,
    redirected: false,
    type: 'basic',
    url: '',
  } as Response
}

/**
 * Mock API client
 */
export const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}

/**
 * Mock WebSocket for real-time features
 */
export class MockWebSocket {
  public static CONNECTING = 0
  public static OPEN = 1
  public static CLOSING = 2
  public static CLOSED = 3

  public readyState = MockWebSocket.CONNECTING
  public url: string
  public sentMessages: any[] = []

  public onopen: ((event: Event) => void) | null = null
  public onmessage: ((event: MessageEvent) => void) | null = null
  public onclose: ((event: CloseEvent) => void) | null = null
  public onerror: ((event: Event) => void) | null = null

  constructor(url: string) {
    this.url = url

    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 0)
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    this.sentMessages.push(data)
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close', { code, reason }))
  }

  // Test helper methods
  simulateMessage(data: any): void {
    const message = typeof data === 'string' ? data : JSON.stringify(data)
    this.onmessage?.(new MessageEvent('message', { data: message }))
  }

  simulateError(): void {
    this.onerror?.(new Event('error'))
  }

  simulateClose(code: number = 1000, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close', { code, reason }))
  }
}

/**
 * Setup global WebSocket mock
 */
export function setupMockWebSocket() {
  global.WebSocket = MockWebSocket as any
}

/**
 * Mock chat API responses
 */
export const mockChatApi = {
  startChat: vi.fn(() =>
    Promise.resolve(createMockApiResponse({
      chatId: 'chat-test-123',
      stream: 'ws://localhost/stream',
    }))
  ),

  getChats: vi.fn(() =>
    Promise.resolve(createMockApiResponse([
      { id: 'chat-1', title: 'Chat 1', createdAt: Date.now() },
      { id: 'chat-2', title: 'Chat 2', createdAt: Date.now() },
    ]))
  ),

  getChat: vi.fn((id: string) =>
    Promise.resolve(createMockApiResponse({
      id,
      title: 'Test Chat',
      messages: [],
    }))
  ),

  deleteChat: vi.fn(() =>
    Promise.resolve(createMockApiResponse({ success: true }))
  ),

  sendMessage: vi.fn(() =>
    Promise.resolve(createMockApiResponse({
      answer: 'Test response',
      flashcards: [],
    }))
  ),
}

/**
 * Mock materials API responses
 */
export const mockMaterialsApi = {
  getMaterials: vi.fn((chatId: string) =>
    Promise.resolve(createMockApiResponse({
      flashcards: [
        { id: 'fc-1', question: 'Q1?', answer: 'A1', tags: [] },
      ],
      notes: { id: 'note-1', title: 'Notes', summary: 'Summary' },
      quiz: { id: 'quiz-1', questions: [] },
    }))
  ),

  saveFlashcard: vi.fn(() =>
    Promise.resolve(createMockApiResponse({ id: 'fc-new', success: true }))
  ),

  deleteFlashcard: vi.fn(() =>
    Promise.resolve(createMockApiResponse({ success: true }))
  ),
}

/**
 * Mock quiz API responses
 */
export const mockQuizApi = {
  startQuiz: vi.fn(() =>
    Promise.resolve(createMockApiResponse({
      quizId: 'quiz-test-123',
      stream: 'ws://localhost/quiz-stream',
    }))
  ),

  submitAnswer: vi.fn(() =>
    Promise.resolve(createMockApiResponse({
      correct: true,
      explanation: 'This is the explanation',
    }))
  ),

  getQuizResults: vi.fn(() =>
    Promise.resolve(createMockApiResponse({
      score: 80,
      totalQuestions: 5,
      correctAnswers: 4,
    }))
  ),
}

/**
 * Mock planner API responses
 */
export const mockPlannerApi = {
  getTasks: vi.fn(() =>
    Promise.resolve(createMockApiResponse([
      { id: 'task-1', title: 'Task 1', status: 'pending' },
      { id: 'task-2', title: 'Task 2', status: 'completed' },
    ]))
  ),

  createTask: vi.fn((data: any) =>
    Promise.resolve(createMockApiResponse({
      id: 'task-new',
      ...data,
    }))
  ),

  updateTask: vi.fn(() =>
    Promise.resolve(createMockApiResponse({ success: true }))
  ),

  deleteTask: vi.fn(() =>
    Promise.resolve(createMockApiResponse({ success: true }))
  ),
}

/**
 * Mock review API responses
 */
export const mockReviewApi = {
  getDueReviews: vi.fn(() =>
    Promise.resolve(createMockApiResponse([
      { flashcardId: 'fc-1', nextReviewAt: Date.now() },
      { flashcardId: 'fc-2', nextReviewAt: Date.now() },
    ]))
  ),

  submitReview: vi.fn(() =>
    Promise.resolve(createMockApiResponse({
      newInterval: 6,
      newRepetition: 2,
      newEasiness: 2.6,
    }))
  ),

  getStats: vi.fn(() =>
    Promise.resolve(createMockApiResponse({
      totalCards: 10,
      dueToday: 3,
      completedToday: 5,
      streak: 7,
    }))
  ),
}

export default {
  createMockApiResponse,
  createMockApiError,
  mockFetch,
  setupMockFetch,
  createMockFetchResponse,
  mockApiClient,
  MockWebSocket,
  setupMockWebSocket,
  mockChatApi,
  mockMaterialsApi,
  mockQuizApi,
  mockPlannerApi,
  mockReviewApi,
}
