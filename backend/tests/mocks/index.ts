/**
 * Backend Test Mocks Index
 * Centralized exports for all mock implementations
 */

// Database mocks
export {
  mockDb,
  resetMockDatabase,
  getMockStore,
  createMockFlashcard,
  createMockReviewSchedule,
  createMockChat,
  createMockMessage,
  createMockMaterials,
  createMockTask,
  createMockAnalytics,
  seedMockDatabase,
  setupMockDatabase,
} from './database'

// LLM mocks
export {
  mockLLM,
  mockEmbeddings,
  mockMakeModels,
  createMockLLMResponse,
  createMockJSONResponse,
  createMockStreamResponse,
  createMockAskResponse,
  createMockLearningMaterials,
  createMockQuizResponse,
  createMockPodcastScript,
  createMockDebateResponse,
  createMockSmartNotes,
  createMockLLMError,
  createTimeoutLLM,
  createRateLimitLLM,
  createAuthErrorLLM,
} from './llm'

// File system mocks
export {
  mockFs,
  mockFsPromises,
  mockPath,
  resetMockFileSystem,
  addMockFile,
  addMockDirectory,
  createMockReadStream,
  createMockWriteStream,
  createMockFileUpload,
  createMockMultipartData,
} from './file-system'

// WebSocket mocks
export {
  mockWebSocket,
  mockWebSocketServer,
  createMockWebSocketClient,
  createMockWebSocketMessage,
} from './websocket'

// HTTP/Express mocks
export {
  mockRequest,
  mockResponse,
  mockNextFunction,
  createMockExpressApp,
} from './http'
