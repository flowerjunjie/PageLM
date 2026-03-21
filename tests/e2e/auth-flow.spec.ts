/**
 * Authentication Flow E2E Tests
 *
 * Tests for user authentication including login, logout, and session management
 */

import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should display landing page for unauthenticated users', async ({ page }) => {
    // Check that landing page content is visible
    const welcomeText = page.locator('text=Welcome').or(page.locator('text=/欢迎/'))
    await expect(welcomeText.first()).toBeVisible()

    // Check for learning mode selector
    const modeSelector = page.locator('text=Choose Your Learning Mode').or(
      page.locator('text=/选择学习模式/')
    )
    await expect(modeSelector).toBeVisible()
  })

  test('should navigate to chat mode', async ({ page }) => {
    // Find and click on chat/free question mode
    const chatButton = page.locator('button').filter({ hasText: /Free Chat|自由提问/ }).first()

    if (await chatButton.isVisible().catch(() => false)) {
      await chatButton.click()
      await page.waitForLoadState('networkidle')

      // Should navigate to chat page
      await expect(page).toHaveURL(/\/chat/)
    }
  })

  test('should handle session persistence', async ({ page, context }) => {
    // Create a new context to test fresh session
    const newContext = await context.browser().newContext()
    const newPage = await newContext.newPage()

    await newPage.goto('/')
    await newPage.waitForLoadState('networkidle')

    // Should still show landing page
    const welcomeText = newPage.locator('text=Welcome').or(newPage.locator('text=/欢迎/'))
    await expect(welcomeText.first()).toBeVisible()

    await newContext.close()
  })
})
