/**
 * Landing Page Object Model
 *
 * Page Object Model for the main landing page with learning mode selector
 */

import { Page, Locator, expect } from '@playwright/test'

export class LandingPage {
  readonly page: Page
  readonly heading: Locator
  readonly subtitle: Locator
  readonly learningModeSelector: Locator
  readonly quickInputToggle: Locator
  readonly quickInputArea: Locator
  readonly promptBox: Locator
  readonly promptRail: Locator
  readonly exploreTopics: Locator

  // Learning mode buttons
  readonly previewButton: Locator
  readonly notesButton: Locator
  readonly quizButton: Locator
  readonly podcastButton: Locator
  readonly plannerButton: Locator
  readonly chatButton: Locator

  constructor(page: Page) {
    this.page = page

    // Main content
    this.heading = page.locator('h1').filter({ hasText: /灵犀|Lingxi|Learning/i })
    this.subtitle = page.locator('p').filter({ hasText: /AI|learning|学习/i })
    this.learningModeSelector = page.locator('text=/Choose Your Learning Mode|选择学习模式/')

    // Quick input
    this.quickInputToggle = page.locator('button:has-text("Quick Input"), button:has-text("quick input")').or(
      page.locator('button').filter({ hasText: /show|hide/i })
    )
    this.quickInputArea = page.locator('[class*="quick-input"], [class*="collapsible"]')
    this.promptBox = page.locator('textarea, input[type="text"]').first()
    this.promptRail = page.locator('[class*="prompt-rail"], [class*="suggestions"]')

    // Explore topics
    this.exploreTopics = page.locator('[class*="explore"], [class*="topics"]')

    // Learning mode buttons (using emoji icons as fallback)
    this.previewButton = page.locator('button:has-text("Preview Lesson"), button:has-text("新课预习")').or(
      page.locator('button').filter({ hasText: /📖/ })
    )
    this.notesButton = page.locator('button:has-text("Class Notes"), button:has-text("课堂笔记")').or(
      page.locator('button').filter({ hasText: /📝/ })
    )
    this.quizButton = page.locator('button:has-text("Quiz Practice"), button:has-text("课后测验")').or(
      page.locator('button').filter({ hasText: /🎯/ })
    )
    this.podcastButton = page.locator('button:has-text("Knowledge Podcast"), button:has-text("知识播客")').or(
      page.locator('button').filter({ hasText: /📻/ })
    )
    this.plannerButton = page.locator('button:has-text("Homework Planner"), button:has-text("作业规划")').or(
      page.locator('button').filter({ hasText: /📅/ })
    )
    this.chatButton = page.locator('button:has-text("Free Chat"), button:has-text("自由提问")').or(
      page.locator('button').filter({ hasText: /💬/ })
    )
  }

  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  async getHeadingText(): Promise<string> {
    return await this.heading.first().textContent() || ''
  }

  async toggleQuickInput() {
    const isVisible = await this.quickInputToggle.isVisible().catch(() => false)
    if (isVisible) {
      await this.quickInputToggle.first().click()
      await this.page.waitForTimeout(300)
    }
  }

  async isQuickInputVisible(): Promise<boolean> {
    return await this.quickInputArea.isVisible().catch(() => false)
  }

  async enterPrompt(text: string) {
    const input = this.promptBox.first()
    await input.fill(text)
  }

  async sendPrompt() {
    const input = this.promptBox.first()
    await input.press('Enter')
    await this.page.waitForTimeout(1000)
  }

  async clickLearningMode(mode: 'preview' | 'notes' | 'quiz' | 'podcast' | 'planner' | 'chat') {
    const button = this[`${mode}Button`]
    await button.first().click()
    await this.page.waitForLoadState('networkidle')
  }

  async getExploreTopicsCount(): Promise<number> {
    const topics = this.page.locator('[class*="topic-card"], [class*="explore"] > [class*="card"]')
    return await topics.count()
  }

  async clickExploreTopic(index: number) {
    const topics = this.page.locator('[class*="topic-card"], [class*="explore"] > [class*="card"]')
    await topics.nth(index).click()
    await this.page.waitForLoadState('networkidle')
  }

  async hasReviewReminder(): Promise<boolean> {
    const reminder = this.page.locator('[class*="review"], [class*="reminder"]').filter({ hasText: /review|due|复习|到期/i })
    return await reminder.isVisible().catch(() => false)
  }

  async takeScreenshot(path: string) {
    await this.page.screenshot({ path, fullPage: true })
  }
}
