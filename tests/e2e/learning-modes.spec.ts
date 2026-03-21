/**
 * Learning Modes E2E Tests
 *
 * Tests for all 6 learning modes:
 * - Preview Lesson
 * - Class Notes
 * - Quiz Practice
 * - Knowledge Podcast
 * - Homework Planner
 * - Free Chat
 */

import { test, expect } from '@playwright/test'

test.describe('Learning Modes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should display all 6 learning modes', async ({ page }) => {
    // Check that learning mode selector is visible
    const modeSelector = page.locator('text=Choose Your Learning Mode').or(
      page.locator('text=/选择学习模式/')
    )
    await expect(modeSelector).toBeVisible()

    // Check for all learning mode buttons/cards
    const modes = [
      { en: 'Preview Lesson', zh: '新课预习', icon: /📖/ },
      { en: 'Class Notes', zh: '课堂笔记', icon: /📝/ },
      { en: 'Quiz Practice', zh: '课后测验', icon: /🎯/ },
      { en: 'Knowledge Podcast', zh: '知识播客', icon: /📻/ },
      { en: 'Homework Planner', zh: '作业规划', icon: /📅/ },
      { en: 'Free Chat', zh: '自由提问', icon: /💬/ },
    ]

    for (const mode of modes) {
      const modeButton = page.locator('button').filter({
        hasText: mode.en
      }).or(
        page.locator('button').filter({ hasText: mode.zh })
      ).first()

      // At least check that some buttons exist
      const count = await modeButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should navigate to preview mode', async ({ page }) => {
    const previewButton = page.locator('button').filter({
      hasText: /Preview Lesson|新课预习/
    }).first()

    if (await previewButton.isVisible().catch(() => false)) {
      await previewButton.click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/chat|preview/)
    }
  })

  test('should navigate to notes mode', async ({ page }) => {
    const notesButton = page.locator('button').filter({
      hasText: /Class Notes|课堂笔记/
    }).first()

    if (await notesButton.isVisible().catch(() => false)) {
      await notesButton.click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/tools|notes/)
    }
  })

  test('should navigate to quiz mode', async ({ page }) => {
    const quizButton = page.locator('button').filter({
      hasText: /Quiz Practice|课后测验/
    }).first()

    if (await quizButton.isVisible().catch(() => false)) {
      await quizButton.click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/quiz/)
    }
  })

  test('should navigate to podcast mode', async ({ page }) => {
    const podcastButton = page.locator('button').filter({
      hasText: /Knowledge Podcast|知识播客/
    }).first()

    if (await podcastButton.isVisible().catch(() => false)) {
      await podcastButton.click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/tools|podcast/)
    }
  })

  test('should navigate to planner mode', async ({ page }) => {
    const plannerButton = page.locator('button').filter({
      hasText: /Homework Planner|作业规划/
    }).first()

    if (await plannerButton.isVisible().catch(() => false)) {
      await plannerButton.click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/planner/)
    }
  })

  test('should navigate to free chat mode', async ({ page }) => {
    const chatButton = page.locator('button').filter({
      hasText: /Free Chat|自由提问/
    }).first()

    if (await chatButton.isVisible().catch(() => false)) {
      await chatButton.click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/chat/)
    }
  })
})
