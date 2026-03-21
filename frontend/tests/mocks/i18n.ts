/**
 * i18n Mock for Frontend Tests
 * Provides mock implementations for react-i18next
 */

import { vi } from 'vitest'

/**
 * Mock translation function
 */
export const mockT = vi.fn((key: string, options?: any) => {
  // Return the key as the translation for testing
  if (options?.defaultValue) {
    return options.defaultValue
  }
  // Handle nested keys by returning last part
  const parts = key.split('.')
  return parts[parts.length - 1]
})

/**
 * Mock i18n instance
 */
export const mockI18n = {
  language: 'en',
  languages: ['en', 'zh-CN'],
  changeLanguage: vi.fn(() => Promise.resolve()),
  t: mockT,
  exists: vi.fn((key: string) => true),
  loadNamespaces: vi.fn(() => Promise.resolve()),
  on: vi.fn(),
  off: vi.fn(),
}

/**
 * Mock useTranslation hook
 */
export function mockUseTranslation(ns?: string | string[]) {
  return {
    t: mockT,
    i18n: mockI18n,
    ready: true,
  }
}

/**
 * Mock Trans component
 */
export function MockTrans({
  i18nKey,
  children,
  components,
}: {
  i18nKey: string
  children?: React.ReactNode
  components?: Record<string, React.ReactNode>
}) {
  return children || i18nKey
}

/**
 * Setup i18n mock for tests
 */
export function setupMockI18n() {
  vi.mock('react-i18next', () => ({
    useTranslation: mockUseTranslation,
    Trans: MockTrans,
    I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
    initReactI18next: {
      type: '3rdParty',
      init: () => {},
    },
  }))
}

/**
 * Mock locale data
 */
export const mockLocales = {
  en: {
    common: {
      welcome: 'Welcome',
      loading: 'Loading...',
      error: 'Error',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      search: 'Search',
      submit: 'Submit',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
    },
    chat: {
      title: 'Chat',
      placeholder: 'Type a message...',
      send: 'Send',
      newChat: 'New Chat',
    },
    quiz: {
      title: 'Quiz',
      submit: 'Submit Answer',
      nextQuestion: 'Next Question',
      results: 'Results',
    },
    flashcards: {
      title: 'Flashcards',
      showAnswer: 'Show Answer',
      rateQuality: 'Rate your recall',
    },
  },
  'zh-CN': {
    common: {
      welcome: '欢迎',
      loading: '加载中...',
      error: '错误',
      save: '保存',
      cancel: '取消',
      delete: '删除',
      edit: '编辑',
      create: '创建',
      search: '搜索',
      submit: '提交',
      close: '关闭',
      back: '返回',
      next: '下一步',
      previous: '上一步',
    },
    chat: {
      title: '聊天',
      placeholder: '输入消息...',
      send: '发送',
      newChat: '新聊天',
    },
    quiz: {
      title: '测验',
      submit: '提交答案',
      nextQuestion: '下一题',
      results: '结果',
    },
    flashcards: {
      title: '闪卡',
      showAnswer: '显示答案',
      rateQuality: '评分',
    },
  },
}

export default {
  mockT,
  mockI18n,
  mockUseTranslation,
  MockTrans,
  setupMockI18n,
  mockLocales,
}
