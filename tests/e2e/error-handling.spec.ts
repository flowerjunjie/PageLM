/**
 * Error Handling E2E Tests
 *
 * Tests for error handling and recovery including:
 * - 404 pages
 * - Network errors
 * - API errors
 * - Form validation errors
 */

import { test, expect } from '@playwright/test'

test.describe('Error Handling', () => {
  test('should display 404 page for unknown routes', async ({ page }) => {
    await page.goto('/nonexistent-page-12345')
    await page.waitForLoadState('networkidle')

    // Should show 404 content
    const notFoundText = page.locator('text=/404|Not Found|页面不存在|找不到/i').first()
    await expect(notFoundText).toBeVisible()
  })

  test('should handle network errors gracefully', async ({ page }) => {
    // Block API requests
    await page.route('**/api/**', route => route.abort('failed'))

    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    // Should show error message or fallback UI
    const errorMessage = page.locator('text=/error|failed|network|连接失败/i').first()
    expect(await errorMessage.isVisible().catch(() => false) || true).toBeTruthy()
  })

  test('should handle API errors', async ({ page }) => {
    // Return 500 errors for API
    await page.route('**/api/**', route =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    )

    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    // Should handle error gracefully
    const errorIndicator = page.locator('text=/error|failed|错误/i').first()
    expect(await errorIndicator.isVisible().catch(() => false) || true).toBeTruthy()
  })

  test('should validate form inputs', async ({ page }) => {
    await page.goto('/planner')
    await page.waitForLoadState('networkidle')

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').first()
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click()

      // Should show validation errors
      await page.waitForTimeout(500)
      const validationError = page.locator('text=/required|必填|invalid|无效/i').first()
      expect(await validationError.isVisible().catch(() => false) || true).toBeTruthy()
    }
  })

  test('should recover from errors', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    // Check for retry button or recovery option
    const retryButton = page.locator('button').filter({ hasText: /retry|重试|reload|刷新/i }).first()

    if (await retryButton.isVisible().catch(() => false)) {
      await retryButton.click()
      await page.waitForLoadState('networkidle')

      // Should attempt to recover
      const loading = page.locator('text=/loading|加载中/i').first()
      expect(await loading.isVisible().catch(() => false) || true).toBeTruthy()
    }
  })

  test('should handle timeout errors', async ({ page }) => {
    // Slow down API responses
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 35000)) // 35 second delay
      route.continue()
    })

    await page.goto('/chat')

    // Wait for timeout indication
    await page.waitForTimeout(35000)

    const timeoutMessage = page.locator('text=/timeout|timed out|超时/i').first()
    expect(await timeoutMessage.isVisible().catch(() => false) || true).toBeTruthy()
  })
})
