/**
 * Frontend Test Mocks Index
 * Centralized exports for all mock implementations
 */

// API mocks
export {
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
} from './api'

// i18n mocks
export {
  mockT,
  mockI18n,
  mockUseTranslation,
  MockTrans,
  setupMockI18n,
  mockLocales,
} from './i18n'

// React Router mocks
export {
  mockNavigate,
  mockLocation,
  mockParams,
  mockSearchParams,
  MockLink,
  MockNavLink,
  MockOutlet,
  setupMockRouter,
} from './router'

// Component/Render mocks
export {
  createMockComponent,
  createMockHookResult,
  MockProvider,
} from './components'
