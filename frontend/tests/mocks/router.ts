/**
 * React Router Mock for Frontend Tests
 * Provides mock implementations for react-router-dom
 */

import { vi } from 'vitest'
import React from 'react'

/**
 * Mock navigate function
 */
export const mockNavigate = vi.fn()

/**
 * Mock location object
 */
export const mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default',
}

/**
 * Mock URL params
 */
export const mockParams: Record<string, string> = {}

/**
 * Mock search params
 */
export const mockSearchParams = new URLSearchParams()

/**
 * Mock useNavigate hook
 */
export function useNavigate() {
  return mockNavigate
}

/**
 * Mock useLocation hook
 */
export function useLocation() {
  return mockLocation
}

/**
 * Mock useParams hook
 */
export function useParams() {
  return mockParams
}

/**
 * Mock useSearchParams hook
 */
export function useSearchParams() {
  return [mockSearchParams, mockNavigate] as const
}

/**
 * Mock Link component
 */
export const MockLink = React.forwardRef<
  HTMLAnchorElement,
  { to: string; children?: React.ReactNode; className?: string }
>(({ to, children, className, ...props }, ref) => {
  return React.createElement(
    'a',
    { ref, href: to, className, ...props },
    children
  )
})
MockLink.displayName = 'MockLink'

/**
 * Mock NavLink component
 */
export const MockNavLink = React.forwardRef<
  HTMLAnchorElement,
  { to: string; children?: React.ReactNode; className?: string | ((props: { isActive: boolean }) => string) }
>(({ to, children, className, ...props }, ref) => {
  const finalClassName = typeof className === 'function'
    ? className({ isActive: mockLocation.pathname === to })
    : className

  return React.createElement(
    'a',
    { ref, href: to, className: finalClassName, ...props },
    children
  )
})
MockNavLink.displayName = 'MockNavLink'

/**
 * Mock Outlet component
 */
export function MockOutlet() {
  return React.createElement('div', { 'data-testid': 'outlet' }, 'Outlet Content')
}

/**
 * Mock Routes and Route components
 */
export function MockRoutes({ children }: { children: React.ReactNode }) {
  return React.createElement('div', { 'data-testid': 'routes' }, children)
}

export function MockRoute({ element }: { element?: React.ReactNode }) {
  return React.createElement('div', { 'data-testid': 'route' }, element)
}

/**
 * Mock BrowserRouter
 */
export function MockBrowserRouter({ children }: { children: React.ReactNode }) {
  return React.createElement('div', { 'data-testid': 'browser-router' }, children)
}

/**
 * Setup router mock for tests
 */
export function setupMockRouter(options: {
  pathname?: string
  params?: Record<string, string>
  search?: string
} = {}) {
  if (options.pathname) {
    mockLocation.pathname = options.pathname
  }
  if (options.params) {
    Object.assign(mockParams, options.params)
  }
  if (options.search) {
    mockLocation.search = options.search
    // Parse search params
    const params = new URLSearchParams(options.search)
    mockSearchParams.forEach((_, key) => mockSearchParams.delete(key))
    params.forEach((value, key) => mockSearchParams.append(key, value))
  }

  vi.mock('react-router-dom', () => ({
    useNavigate,
    useLocation,
    useParams,
    useSearchParams,
    Link: MockLink,
    NavLink: MockNavLink,
    Outlet: MockOutlet,
    Routes: MockRoutes,
    Route: MockRoute,
    BrowserRouter: MockBrowserRouter,
    Navigate: ({ to }: { to: string }) => React.createElement('div', { 'data-testid': 'navigate', 'data-to': to }),
    useHref: (to: string) => to,
    useInRouterContext: () => true,
    useLinkClickHandler: () => vi.fn(),
    useMatch: () => null,
    useResolvedPath: (to: string) => ({ pathname: to, search: '', hash: '' }),
  }))
}

/**
 * Reset router mocks
 */
export function resetMockRouter() {
  mockNavigate.mockClear()
  mockLocation.pathname = '/'
  mockLocation.search = ''
  mockLocation.state = null
  Object.keys(mockParams).forEach(key => delete mockParams[key])
  mockSearchParams.forEach((_, key) => mockSearchParams.delete(key))
}

export default {
  mockNavigate,
  mockLocation,
  mockParams,
  mockSearchParams,
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
  MockLink,
  MockNavLink,
  MockOutlet,
  MockRoutes,
  MockRoute,
  MockBrowserRouter,
  setupMockRouter,
  resetMockRouter,
}
