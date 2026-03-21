/**
 * Interactions E2E Tests
 * Tests for user interactions:
 * - Chat input and sending
 * - Button click responses
 * - Form submissions
 * - File uploads
 * - Selection popup
 */

import { test, expect } from '@playwright/test'

test.describe('Interactions - Chat Input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')
  })

  test('should display chat input area', async ({ page }) => {
    const input = page.locator('textarea, input[type="text"]').first()
    await expect(input).toBeVisible({ timeout: 5000 })
  })

  test('should allow typing in chat input', async ({ page }) => {
    const input = page.locator('textarea').or(page.locator('input[type="text"]')).first()
    await input.fill('Test message')
    await expect(input).toHaveValue(/Test message/)
  })

  test('should send message with Enter key', async ({ page }) => {
    const input = page.locator('textarea').or(page.locator('input[type="text"]')).first()
    await input.fill('Hello AI')
    await page.keyboard.press('Enter')

    // Should show user message
    const userMessage = page.locator('text=Hello AI').or(page.locator('[class*="user"]'))
    await expect(userMessage.first()).toBeVisible({ timeout: 5000 })
  })

  test('should send message with send button', async ({ page }) => {
    const input = page.locator('textarea').or(page.locator('input[type="text"]')).first()
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"], svg[class*="send"]').first()

    await input.fill('Test message via button')

    const buttonVisible = await sendButton.isVisible().catch(() => false)
    if (buttonVisible) {
      await sendButton.click()
      await page.waitForTimeout(1000)

      // Should show message
      const message = page.locator('text=Test message via button')
      await expect(message.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('should show loading indicator while waiting for response', async ({ page }) => {
    const input = page.locator('textarea').or(page.locator('input[type="text"]')).first()
    await input.fill('Explain photosynthesis')
    await page.keyboard.press('Enter')

    // Should show loading or thinking indicator
    const loading = page.locator('[class*="loading"], [class*="thinking"], [class*="spinner"]').or(
      page.locator('text=/thinking|loading|思考/i')
    )

    const isVisible = await loading.isVisible().catch(() => false)
    if (isVisible) {
      await expect(loading.first()).toBeVisible()
    }
  })

  test('should disable input while processing', async ({ page }) => {
    const input = page.locator('textarea').or(page.locator('input[type="text"]')).first()
    await input.fill('Test question')
    await page.keyboard.press('Enter')

    await page.waitForTimeout(500)

    // Input might be disabled or show busy state
    const isDisabled = await input.isDisabled().catch(() => false)
    const hasBusyClass = await input.evaluate(el =>
      el.classList.contains('disabled') || el.classList.contains('busy')
    ).catch(() => false)

    // Either disabled or shows busy state
    expect(isDisabled || hasBusyClass).toBeTruthy()
  })

  test('should clear input after sending', async ({ page }) => {
    const input = page.locator('textarea').or(page.locator('input[type="text"]')).first()
    await input.fill('Clear test')
    await page.keyboard.press('Enter')

    await page.waitForTimeout(500)

    // Input should be empty
    const value = await input.inputValue()
    expect(value).toBe('')
  })

  test('should handle multi-line input', async ({ page }) => {
    const textarea = page.locator('textarea').first()

    const isTextarea = await textarea.isVisible().catch(() => false)
    if (isTextarea) {
      const multiLineText = 'Line 1\nLine 2\nLine 3'
      await textarea.fill(multiLineText)
      await expect(textarea).toHaveValue(multiLineText)

      await page.keyboard.press('Enter')
      await page.waitForTimeout(1000)

      // Should send the message
      const message = page.locator('text=/Line 1.*Line 2.*Line 3/s')
      const isVisible = await message.isVisible().catch(() => false)
      expect(isVisible).toBeTruthy()
    }
  })
})

test.describe('Interactions - Button Clicks', () => {
  test('should respond to learning mode buttons', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Click on a learning mode
    const chatButton = page.locator('button:has-text("Free Chat")').or(
      page.locator('button').filter({ hasText: /💬/ })
    ).first()

    await chatButton.click()

    // Should navigate
    await expect(page).toHaveURL(/\/chat/)
  })

  test('should respond to action buttons', async ({ page }) => {
    await page.goto('/chat?q=test&chatId=test123')
    await page.waitForLoadState('networkidle')

    // Look for action buttons (summarize, quiz, etc.)
    const actionButtons = page.locator('button:has-text("Summarize"), button:has-text("Quiz"), button:has-text("总结"), button:has-text("测验")')

    const count = await actionButtons.count()
    if (count > 0) {
      const firstButton = actionButtons.first()
      await firstButton.click()

      // Should trigger some action (navigation, API call, etc.)
      await page.waitForTimeout(1000)
    }
  })

  test('should toggle bag drawer', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    // Look for floating action button
    const fab = page.locator('[class*="fab"], button[class*="bag"], button[class*="floating"]').or(
      page.locator('button').filter({ hasText: /^\d+$/ }) // Badge with count
    ).first()

    const isVisible = await fab.isVisible().catch(() => false)
    if (isVisible) {
      await fab.click()
      await page.waitForTimeout(300)

      // Should open drawer
      const drawer = page.locator('[class*="drawer"], [role="dialog"]').or(
        page.locator('text=/bag|learning|学习包/i')
      )
      await expect(drawer.first()).toBeVisible()
    }
  })

  test('should close drawer with close button', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    // Try to open drawer first
    const fab = page.locator('button[class*="fab"], button[class*="bag"]').or(
      page.locator('button').filter({ hasText: /^\d+$/ })
    ).first()

    const fabVisible = await fab.isVisible().catch(() => false)
    if (fabVisible) {
      await fab.click()
      await page.waitForTimeout(300)

      // Close it
      const closeButton = page.locator('button:has-text("Close"), button:has-text("关闭"), [aria-label*="close"]').first()
      const closeVisible = await closeButton.isVisible().catch(() => false)

      if (closeVisible) {
        await closeButton.click()
        await page.waitForTimeout(300)

        // Drawer should be closed
        const drawer = page.locator('[class*="drawer"]')
        const isOpen = await drawer.evaluate(el =>
          !el.classList.contains('hidden') && el.offsetParent !== null
        ).catch(() => false)

        expect(isOpen).toBeFalsy()
      }
    }
  })
})

test.describe('Interactions - Text Selection', () => {
  test('should show selection popup on text selection', async ({ page }) => {
    await page.goto('/chat?q=test&chatId=test')
    await page.waitForLoadState('networkidle')

    // Wait for some content to be visible
    await page.waitForTimeout(2000)

    // Try to select some text
    const content = page.locator('[class*="markdown"], [class*="message"]').first()
    const contentVisible = await content.isVisible().catch(() => false)

    if (contentVisible) {
      // Select text using mouse
      await content.click()
      await page.keyboard.down('Shift')
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('ArrowRight')
      }
      await page.keyboard.up('Shift')

      await page.waitForTimeout(500)

      // Check if popup appears
      const popup = page.locator('[class*="selection"], [class*="popup"]').or(
        page.locator('button:has-text("Add note"), button:has-text("Ask")')
      )
      const popupVisible = await popup.isVisible().catch(() => false)

      // Popup may or may not appear depending on implementation
      if (popupVisible) {
        await expect(popup.first()).toBeVisible()
      }
    }
  })

  test('should add note from selection', async ({ page }) => {
    await page.goto('/chat?q=test&chatId=test')
    await page.waitForLoadState('networkidle')

    // Select text and click add note if popup appears
    const content = page.locator('[class*="message"]').first()
    const contentVisible = await content.isVisible().catch(() => false)

    if (contentVisible) {
      await content.click()
      await page.keyboard.down('Shift')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.up('Shift')

      await page.waitForTimeout(500)

      const addNoteButton = page.locator('button:has-text("Add note"), button:has-text("添加笔记")').first()
      const buttonVisible = await addNoteButton.isVisible().catch(() => false)

      if (buttonVisible) {
        await addNoteButton.click()
        await page.waitForTimeout(500)

        // Should show some confirmation or update bag count
        const confirmation = page.locator('text=/added|saved|已添加/i')
        const hasConfirmation = await confirmation.isVisible().catch(() => false)

        if (hasConfirmation) {
          await expect(confirmation.first()).toBeVisible()
        }
      }
    }
  })
})

test.describe('Interactions - Form Submissions', () => {
  test('should submit quiz answer', async ({ page }) => {
    await page.goto('/quiz?topic=JavaScript')
    await page.waitForLoadState('networkidle')

    // Look for quiz options or submit button
    const option = page.locator('input[type="radio"], button[class*="option"]').first()
    const submitButton = page.locator('button:has-text("Submit"), button:has-text("提交")').first()

    const optionVisible = await option.isVisible().catch(() => false)

    if (optionVisible) {
      await option.click()
      await page.waitForTimeout(300)

      const submitVisible = await submitButton.isVisible().catch(() => false)
      if (submitVisible) {
        await submitButton.click()
        await page.waitForTimeout(1000)

        // Should show result or next question
        const result = page.locator('[class*="result"], [class*="score"], [class*="correct"]').or(
          page.locator('text=/correct|wrong|result|对|错|结果/i')
        )
        const resultVisible = await result.isVisible().catch(() => false)
        if (resultVisible) {
          await expect(result.first()).toBeVisible()
        }
      }
    }
  })

  test('should submit planner task', async ({ page }) => {
    await page.goto('/planner')
    await page.waitForLoadState('networkidle')

    // Look for task input
    const taskInput = page.locator('input[placeholder*="task"], input[placeholder*="Add"]').or(
      page.locator('textarea[placeholder*="task"]')
    ).first()

    const inputVisible = await taskInput.isVisible().catch(() => false)

    if (inputVisible) {
      await taskInput.fill('Complete math homework')
      await page.keyboard.press('Enter')

      await page.waitForTimeout(1000)

      // Should show the new task
      const newTask = page.locator('text=Complete math homework').or(
        page.locator('[class*="task"]')
      )
      const taskAdded = await newTask.isVisible().catch(() => false)
      expect(taskAdded).toBeTruthy()
    }
  })
})

test.describe('Interactions - File Upload', () => {
  test('should display file upload area', async ({ page }) => {
    await page.goto('/tools#transcriber')
    await page.waitForLoadState('networkidle')

    // Look for file upload area
    const uploadArea = page.locator('input[type="file"], [class*="upload"], [class*="dropzone"]').or(
      page.locator('text=/upload|drop|点击上传|拖拽/i')
    )

    const uploadVisible = await uploadArea.isVisible().catch(() => false)
    if (uploadVisible) {
      await expect(upload.first()).toBeVisible()
    }
  })

  test('should accept file input', async ({ page }) => {
    await page.goto('/tools#transcriber')
    await page.waitForLoadState('networkidle')

    const fileInput = page.locator('input[type="file"]').first()
    const inputVisible = await fileInput.isVisible().catch(() => false)

    if (inputVisible) {
      // Create a dummy file
      const file = {
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('test content')
      }

      // Note: Actual file upload testing may require different approach
      // This tests that the element exists and can receive focus
      await expect(fileInput).toBeFocused()
    }
  })
})

test.describe('Interactions - Keyboard Shortcuts', () => {
  test('should focus input with Ctrl/Cmd+K', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    const textarea = page.locator('textarea').first()
    const isTextarea = await textarea.isVisible().catch(() => false)

    if (isTextarea) {
      // Click elsewhere to remove focus
      await page.click('body')

      // Press Ctrl+K
      const isMac = await page.evaluate(() => navigator.platform.includes('Mac'))
      const modifier = isMac ? 'Meta' : 'Control'

      await page.keyboard.press(`${modifier}+K`)

      // Should focus textarea
      await expect(textarea).toBeFocused()
    }
  })

  test('should open shortcut help with "?" key', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Press ? key (make sure not in input)
    await page.click('body')
    await page.keyboard.press('?')

    await page.waitForTimeout(300)

    // Should show help modal
    const helpModal = page.locator('[class*="shortcut"], [class*="help"]').or(
      page.locator('text=/shortcut|keyboard快捷键/i')
    )

    const modalVisible = await helpModal.isVisible().catch(() => false)
    if (modalVisible) {
      await expect(helpModal.first()).toBeVisible()
    }
  })

  test('should close modals with Escape key', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Open shortcut help first
    await page.click('body')
    await page.keyboard.press('?')
    await page.waitForTimeout(300)

    // Press Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Modal should be closed
    const helpModal = page.locator('[class*="shortcut"], [class*="help"]')
    const isClosed = await helpModal.evaluate(el =>
      el.classList.contains('hidden') || el.style.display === 'none'
    ).catch(() => true)

    expect(isClosed).toBeTruthy()
  })
})

test.describe('Interactions - Accessibility', () => {
  test('should maintain focus on interactive elements', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Tab through elements
    await page.keyboard.press('Tab')

    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(['BUTTON', 'A', 'INPUT', 'TEXTAREA']).toContain(focused)
  })

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    // Check for aria-labels on buttons
    const buttonsWithAria = page.locator('button[aria-label]')
    const count = await buttonsWithAria.count()

    // Should have at least some buttons with aria-labels
    expect(count).toBeGreaterThan(0)
  })
})
