/**
 * Chat Flow E2E Tests
 *
 * Tests for chat functionality including message sending and receiving
 */

import { test, expect } from '@playwright/test'

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')
  })

  test('should display chat interface', async ({ page }) => {
    // Check for chat input
    const input = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').or(
      page.locator('input[placeholder*="提问"], textarea[placeholder*="提问"]')
    )

    // Chat input should be visible
    await expect(input.first()).toBeVisible()

    // Check for send button
    const sendButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /Send|发送/ })
    ).first()
    await expect(sendButton).toBeVisible()
  })

  test('should send a message', async ({ page }) => {
    // Find input and send button
    const input = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').or(
      page.locator('input[placeholder*="提问"], textarea[placeholder*="提问"]')
    ).first()

    const sendButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /Send|发送/ })
    ).first()

    // Type and send message
    await input.fill('Hello, this is a test message')
    await sendButton.click()

    // Wait for message to appear
    await page.waitForTimeout(500)

    // Check that message appears in chat
    const userMessage = page.locator('text=Hello, this is a test message')
    await expect(userMessage).toBeVisible()
  })

  test('should handle empty messages', async ({ page }) => {
    const sendButton = page.locator('button[type="submit"]').first()

    // Try to send empty message
    await sendButton.click()

    // Should not add empty message
    const emptyMessages = page.locator('[data-testid="message"]').filter({ hasText: '' })
    expect(await emptyMessages.count()).toBe(0)
  })

  test('should display loading state while waiting for response', async ({ page }) => {
    const input = page.locator('input, textarea').first()
    const sendButton = page.locator('button[type="submit"]').first()

    await input.fill('Test message')
    await sendButton.click()

    // Check for loading indicator
    const loadingIndicator = page.locator('[data-testid="loading"]').or(
      page.locator('.loading, .spinner')
    )

    // Loading might appear briefly
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 5000 })
  })

  test('should handle long messages', async ({ page }) => {
    const input = page.locator('input, textarea').first()
    const sendButton = page.locator('button[type="submit"]').first()

    const longMessage = 'A'.repeat(1000)
    await input.fill(longMessage)
    await sendButton.click()

    // Message should be sent
    await page.waitForTimeout(500)
    const messages = page.locator('[data-testid="message"], .message')
    expect(await messages.count()).toBeGreaterThan(0)
  })
})
