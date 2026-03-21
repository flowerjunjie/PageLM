/**
 * Component Mocks for Frontend Tests
 * Provides utilities for mocking React components
 */

import React from 'react'
import { vi } from 'vitest'

/**
 * Create a mock component
 */
export function createMockComponent(
  name: string,
  renderFn?: (props: any) => React.ReactElement | null
): React.FC<any> {
  const MockComponent: React.FC<any> = (props) => {
    if (renderFn) {
      return renderFn(props)
    }
    return React.createElement('div', {
      'data-testid': `mock-${name.toLowerCase()}`,
      ...props
    }, props.children || name)
  }
  MockComponent.displayName = name
  return MockComponent
}

/**
 * Create a mock hook result
 */
export function createMockHookResult<T extends Record<string, any>>(
  values: T
): T {
  return {
    ...values,
    // Add common hook properties
    isLoading: values.isLoading ?? false,
    isError: values.isError ?? false,
    error: values.error ?? null,
    isSuccess: values.isSuccess ?? true,
  } as T
}

/**
 * Mock provider component wrapper
 */
export function MockProvider({
  children,
  providers = [],
}: {
  children: React.ReactNode
  providers?: Array<React.FC<{ children: React.ReactNode }>>
}): React.ReactElement {
  return providers.reduceRight(
    (acc, Provider) => React.createElement(Provider, null, acc),
    children as React.ReactElement
  )
}

/**
 * Create mock context provider
 */
export function createMockContext<T>(
  name: string,
  defaultValue: T
): [React.Context<T>, React.FC<{ value?: T; children: React.ReactNode }>] {
  const Context = React.createContext<T>(defaultValue)
  Context.displayName = name

  const Provider: React.FC<{ value?: T; children: React.ReactNode }> = ({
    value,
    children,
  }) => {
    return React.createElement(
      Context.Provider,
      { value: value ?? defaultValue },
      children
    )
  }
  Provider.displayName = `${name}Provider`

  return [Context, Provider]
}

/**
 * Common mock components
 */
export const MockComponents = {
  Button: createMockComponent('Button', ({ children, onClick, disabled, ...props }) =>
    React.createElement('button', { onClick, disabled, ...props }, children)
  ),

  Input: createMockComponent('Input', ({ value, onChange, placeholder, ...props }) =>
    React.createElement('input', { value, onChange, placeholder, ...props })
  ),

  Modal: createMockComponent('Modal', ({ children, isOpen, onClose, ...props }) =>
    isOpen ? React.createElement('div', { role: 'dialog', ...props }, children) : null
  ),

  Card: createMockComponent('Card', ({ children, ...props }) =>
    React.createElement('div', { 'data-testid': 'card', ...props }, children)
  ),

  Spinner: createMockComponent('Spinner', () =>
    React.createElement('div', { 'data-testid': 'spinner' }, 'Loading...')
  ),

  ErrorMessage: createMockComponent('ErrorMessage', ({ message }) =>
    React.createElement('div', { role: 'alert' }, message)
  ),

  Toast: createMockComponent('Toast', ({ message, type }) =>
    React.createElement('div', { 'data-testid': `toast-${type}` }, message)
  ),
}

/**
 * Mock intersection observer for lazy loading tests
 */
export function setupMockIntersectionObserver() {
  const mockIntersectionObserver = vi.fn()
  mockIntersectionObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
  })
  window.IntersectionObserver = mockIntersectionObserver
  return mockIntersectionObserver
}

/**
 * Mock resize observer for responsive tests
 */
export function setupMockResizeObserver() {
  const mockResizeObserver = vi.fn()
  mockResizeObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })
  window.ResizeObserver = mockResizeObserver
  return mockResizeObserver
}

/**
 * Mock match media for responsive tests
 */
export function setupMockMatchMedia(matches: boolean = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

export default {
  createMockComponent,
  createMockHookResult,
  MockProvider,
  createMockContext,
  MockComponents,
  setupMockIntersectionObserver,
  setupMockResizeObserver,
  setupMockMatchMedia,
}
