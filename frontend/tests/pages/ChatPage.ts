/**
 * Chat Page Object Model
 *
 * Page Object Model for the chat interface
 */

import { Page, Locator, expect } from '@playwright/test'

export class ChatPage {
  readonly page: Page
  readonly chatInput: Locator
  readonly sendButton: Locator
  readonly messagesContainer: Locator
  readonly userMessages: Locator
  readonly assistantMessages: Locator
  readonly loadingIndicator: Locator
  readonly connectionStatus: Locator
  readonly flashCardsContainer: Locator
  readonly actionRow: Locator
  readonly composer: Locator
  readonly bagFab: Locator

  // Action buttons
  readonly summarizeButton: Locator
  readonly learnMoreButton: Locator
  readonly startQuizButton: Locator
  readonly createPodcastButton: Locator

  constructor(page: Page) {
    this.page = page

    // Main chat elements
    this.chatInput = page.locator('textarea').or(page.locator('input[type="text"]'))
    this.sendButton = page.locator('button[type="submit"], button:has-text("Send"), svg[class*="send"]')
    this.messagesContainer = page.locator('[class*="message"], [class*="chat"]')
    this.userMessages = page.locator('[class*="message"], [class*="user"]').filter({ hasText: /^((?!assistant).)*$/ })
    this.assistantMessages = page.locator('[class*="assistant"], [class*="ai"]')
    this.loadingIndicator = page.locator('[class*="loading"], [class*="thinking"], [class*="spinner"]')
    this.connectionStatus = page.locator('[data-testid="connection-status"], [class*="connection"]')

    // Side panels
    this.flashCardsContainer = page.locator('[class*="flashcard"], [class*="flash-card"]')

    // Actions
    this.actionRow = page.locator('[class*="action"], [class*="toolbar"]')
    this.composer = page.locator('[class*="composer"], [class*="input-area"]')
    this.bagFab = page.locator('[class*="fab"], button[class*="floating"]')

    // Action buttons
    this.summarizeButton = page.locator('button:has-text("Summarize"), button:has-text("总结")')
    this.learnMoreButton = page.locator('button:has-text("Learn More"), button:has-text("深入学习")')
    this.startQuizButton = page.locator('button:has-text("Quiz"), button:has-text("测验")')
    this.createPodcastButton = page.locator('button:has-text("Podcast"), button:has-text("播客")')
  }

  async goto(options?: { chatId?: string; question?: string; mode?: string }) {
    let url = '/chat'
    const params = new URLSearchParams()

    if (options?.chatId) params.set('chatId', options.chatId)
    if (options?.question) params.set('q', options.question)
    if (options?.mode) params.set('mode', options.mode)

    if (params.toString()) url += `?${params.toString()}`

    await this.page.goto(url)
    await this.page.waitForLoadState('networkidle')
  }

  async waitForConnection(): Promise<void> {
    await this.page.waitForFunction(() => {
      const status = document.querySelector('[data-testid="connection-status"], [class*="connection"]')
      if (!status) return true
      const text = status.textContent || ''
      return text.includes('Connected') || text.includes('connected') || text.includes('已连接')
    }, { timeout: 10000 })
  }

  async enterMessage(text: string) {
    const input = this.chatInput.first()
    await input.fill(text)
  }

  async sendMessage(text?: string) {
    if (text) {
      await this.enterMessage(text)
    }
    const input = this.chatInput.first()
    await input.press('Enter')
    await this.page.waitForTimeout(1000)
  }

  async waitForMessage(): Promise<void> {
    await this.page.waitForSelector('[class*="assistant"], [class*="ai"]', { timeout: 15000 })
  }

  async getMessageCount(): Promise<number> {
    return await this.messagesContainer.count()
  }

  async getLastUserMessage(): Promise<string> {
    return await this.userMessages.last().textContent() || ''
  }

  async getLastAssistantMessage(): Promise<string> {
    return await this.assistantMessages.last().textContent() || ''
  }

  async isLoading(): Promise<boolean> {
    return await this.loadingIndicator.isVisible().catch(() => false)
  }

  async waitForLoadingComplete(): Promise<void> {
    await this.page.waitForFunction(() => {
      const loading = document.querySelector('[class*="loading"], [class*="thinking"], [class*="spinner"]')
      return loading === null
    }, { timeout: 30000 })
  }

  async getConnectionStatus(): Promise<string> {
    const status = this.connectionStatus.first()
    const isVisible = await status.isVisible().catch(() => false)
    if (isVisible) {
      return await status.textContent() || ''
    }
    return ''
  }

  async clickSummarize() {
    const button = this.summarizeButton.first()
    const isVisible = await button.isVisible().catch(() => false)
    if (isVisible) {
      await button.click()
      await this.page.waitForTimeout(1000)
    }
  }

  async clickLearnMore() {
    const button = this.learnMoreButton.first()
    const isVisible = await button.isVisible().catch(() => false)
    if (isVisible) {
      await button.click()
      await this.page.waitForTimeout(1000)
    }
  }

  async clickStartQuiz() {
    const button = this.startQuizButton.first()
    const isVisible = await button.isVisible().catch(() => false)
    if (isVisible) {
      await button.click()
      await this.page.waitForLoadState('networkidle')
    }
  }

  async clickCreatePodcast() {
    const button = this.createPodcastButton.first()
    const isVisible = await button.isVisible().catch(() => false)
    if (isVisible) {
      await button.click()
      await this.page.waitForTimeout(1000)
    }
  }

  async hasFlashCards(): Promise<boolean> {
    const container = this.flashCardsContainer.first()
    return await container.isVisible().catch(() => false)
  }

  async getFlashCardCount(): Promise<number> {
    const cards = this.page.locator('[class*="flashcard-item"], [class*="card-item"]')
    return await cards.count()
  }

  async openBag() {
    const fab = this.bagFab.first()
    const isVisible = await fab.isVisible().catch(() => false)
    if (isVisible) {
      await fab.click()
      await this.page.waitForTimeout(300)
    }
  }

  async takeScreenshot(path: string) {
    await this.page.screenshot({ path, fullPage: true })
  }

  async waitForIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
    await this.page.waitForTimeout(500)
  }
}
