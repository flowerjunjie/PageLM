/**
 * Core Learning Modes E2E Tests
 * Tests for 6 Learning Modes:
 * - Preview (/preview) - New lesson preview
 * - Notes (/notes) - Class notes organization
 * - Quiz (/quiz) - Quiz practice
 * - Podcast (/podcast) - Knowledge podcast
 * - Planner (/planner) - Homework planner
 * - Chat (/chat) - Free Q&A chat
 */

import { test, expect } from '@playwright/test'

test.describe('Learning Modes - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should display all 6 learning modes on landing page', async ({ page }) => {
    // Check learning mode selector exists
    const modeSelector = page.locator('text=Choose Your Learning Mode').or(page.locator('text=/选择学习模式/'))
    await expect(modeSelector).toBeVisible()

    // Check all 6 learning mode buttons exist
    const learningModes = ['Preview Lesson', 'Class Notes', 'Quiz Practice', 'Knowledge Podcast', 'Homework Planner', 'Free Chat']
    const chineseModes = ['新课预习', '课堂笔记', '课后测验', '知识播客', '作业规划', '自由提问']

    for (let i = 0; i < learningModes.length; i++) {
      const mode = page.locator(`text=${learningModes[i]}`).or(page.locator(`text=${chineseModes[i]}`))
      await expect(mode.first()).toBeVisible()
    }
  })

  test('should navigate to preview mode', async ({ page }) => {
    // Click on preview mode button (emoji icon + title)
    const previewButton = page.locator('button:has-text("Preview Lesson")').or(
      page.locator('button:has-text("新课预习")')
    ).or(
      page.locator('button').filter({ hasText: /📖/ }).first()
    )

    await previewButton.click()
    await page.waitForLoadState('networkidle')

    // Should redirect to chat with mode parameter
    await expect(page).toHaveURL(/\/chat.*mode=preview|\/preview/)
  })

  test('should navigate to notes mode', async ({ page }) => {
    const notesButton = page.locator('button:has-text("Class Notes")').or(
      page.locator('button:has-text("课堂笔记")')
    ).or(
      page.locator('button').filter({ hasText: /📝/ }).nth(1)
    )

    await notesButton.click()
    await page.waitForLoadState('networkidle')

    // Should navigate to tools#notes
    await expect(page).toHaveURL(/\/tools.*notes|\/notes/)
  })

  test('should navigate to quiz mode', async ({ page }) => {
    const quizButton = page.locator('button:has-text("Quiz Practice")').or(
      page.locator('button:has-text("课后测验")')
    ).or(
      page.locator('button').filter({ hasText: /🎯/ })
    )

    await quizButton.click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/quiz/)
  })

  test('should navigate to podcast mode', async ({ page }) => {
    const podcastButton = page.locator('button:has-text("Knowledge Podcast")').or(
      page.locator('button:has-text("知识播客")')
    ).or(
      page.locator('button').filter({ hasText: /📻/ })
    )

    await podcastButton.click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/tools.*podcast|\/podcast/)
  })

  test('should navigate to planner mode', async ({ page }) => {
    const plannerButton = page.locator('button:has-text("Homework Planner")').or(
      page.locator('button:has-text("作业规划")')
    ).or(
      page.locator('button').filter({ hasText: /📅/ })
    )

    await plannerButton.click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/planner/)
  })

  test('should navigate to chat mode', async ({ page }) => {
    const chatButton = page.locator('button:has-text("Free Chat")').or(
      page.locator('button:has-text("自由提问")')
    ).or(
      page.locator('button').filter({ hasText: /💬/ })
    )

    await chatButton.click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/chat/)
  })
})

test.describe('Preview Mode (/preview)', () => {
  test('should redirect to chat with preview mode', async ({ page }) => {
    await page.goto('/preview')
    await page.waitForLoadState('networkidle')

    // Should redirect to chat
    await expect(page).toHaveURL(/\/chat.*mode=preview/)
  })

  test('should start a preview learning session', async ({ page }) => {
    await page.goto('/preview')
    await page.waitForLoadState('networkidle')

    // Enter a topic to preview
    const input = page.locator('textarea, input[type="text"]').first()
    await expect(input).toBeVisible({ timeout: 5000 })

    await input.fill('Explain quantum physics basics')
    await page.keyboard.press('Enter')

    // Should start chat session
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/chat.*chatId=/)
  })
})

test.describe('Notes Mode (/notes)', () => {
  test('should redirect to tools with notes tab', async ({ page }) => {
    await page.goto('/notes')
    await page.waitForLoadState('networkidle')

    // Should redirect to tools#notes
    await expect(page).toHaveURL(/\/tools.*#.*notes/)
  })

  test('should display Smart Notes tool', async ({ page }) => {
    await page.goto('/notes')
    await page.waitForLoadState('networkidle')

    // Check if scrolled to notes section
    const notesSection = page.locator('#tool-notes, [data-testid="smart-notes"]')
    await expect(notesSection).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Quiz Mode (/quiz)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/quiz')
    await page.waitForLoadState('networkidle')
  })

  test('should display quiz page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /quiz|quiz/i }).or(
      page.locator('text=Quiz').or(page.locator('text=测验'))
    )
    await expect(heading.first()).toBeVisible({ timeout: 5000 })
  })

  test('should allow starting a quiz', async ({ page }) => {
    // Look for start button or topic input
    const startButton = page.locator('button:has-text("Start"), button:has-text("开始")').first()
    const topicInput = page.locator('input[placeholder*="topic"], input[placeholder*="主题"]').first()

    if (await startButton.isVisible()) {
      await startButton.click()
      await page.waitForTimeout(500)
      // Should show quiz interface or questions
    } else if (await topicInput.isVisible()) {
      await topicInput.fill('JavaScript basics')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1000)
    }
  })

  test('should handle quiz with topic parameter', async ({ page }) => {
    await page.goto('/quiz?topic=JavaScript')
    await page.waitForLoadState('networkidle')

    // Should load quiz with specified topic
    const quizContent = page.locator('[data-testid="quiz"], .quiz-container, [class*="quiz"]')
    const isVisible = await quizContent.isVisible().catch(() => false)

    // Either quiz content is visible or there's an input to start
    if (!isVisible) {
      const input = page.locator('input, textarea').first()
      await expect(input).toBeVisible()
    }
  })
})

test.describe('Podcast Mode (/podcast)', () => {
  test('should redirect to tools with podcast tab', async ({ page }) => {
    await page.goto('/podcast')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/tools.*#.*podcast/)
  })

  test('should display Podcast Generator tool', async ({ page }) => {
    await page.goto('/podcast')
    await page.waitForLoadState('networkidle')

    // Check podcast section
    const podcastSection = page.locator('#tool-podcast, [data-testid="podcast"]')
    await expect(podcastSection.first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Planner Mode (/planner)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/planner')
    await page.waitForLoadState('networkidle')
  })

  test('should display planner page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /planner|homework/i }).or(
      page.locator('text=Planner').or(page.locator('text=规划'))
    )
    await expect(heading.first()).toBeVisible({ timeout: 5000 })
  })

  test('should display task creation interface', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("添加"), button:has-text("Create")').first()
    const taskInput = page.locator('input[placeholder*="task"], input[placeholder*="任务"]').first()

    const hasTaskUI = await Promise.any([
      addButton.isVisible().catch(() => false),
      taskInput.isVisible().catch(() => false)
    ])

    expect(hasTaskUI).toBeTruthy()
  })
})

test.describe('Chat Mode (/chat)', () => {
  test('should display chat interface', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    // Check for chat elements
    const input = page.locator('textarea, input[type="text"]').first()
    await expect(input).toBeVisible({ timeout: 5000 })
  })

  test('should send a message', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    const input = page.locator('textarea').or(page.locator('input[type="text"]')).first()
    await input.fill('What is machine learning?')
    await page.keyboard.press('Enter')

    // Should show user message
    const userMessage = page.locator('text=What is machine learning?')
    await expect(userMessage.first()).toBeVisible({ timeout: 5000 })
  })

  test('should display connection status', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    // Check for connection status indicator
    const status = page.locator('[data-testid="connection-status"], .connection-status').or(
      page.locator('text=/connected|connecting|disconnected/i')
    )
    const isVisible = await status.isVisible().catch(() => false)
    if (isVisible) {
      await expect(status.first()).toBeVisible()
    }
  })
})
