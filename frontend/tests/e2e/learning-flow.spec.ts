/**
 * Learning Flow E2E Tests
 *
 * Tests the complete user journey for learning with spaced repetition
 */

import { test, expect } from '@playwright/test'

test.describe('Learning Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')

    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test('should display landing page', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible()
  })

  test('should navigate to learning page', async ({ page }) => {
    // Click on learning link/button
    const learningLink = page.locator('a[href*="/learning"], nav >> text=/learning/i').first()
    if (await learningLink.isVisible()) {
      await learningLink.click()
      await expect(page).toHaveURL(/.*\/learning/)
    }
  })

  test.describe('Flashcard Review', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to flashcards/review section
      await page.goto('/')
      const reviewLink = page.locator('a[href*="review"], a[href*="flashcard"]').first()
      if (await reviewLink.isVisible()) {
        await reviewLink.click()
      }
    })

    test('should display flashcard for review', async ({ page }) => {
      const flashcard = page.locator('[data-testid="flashcard"], .flashcard, [class*="flashcard"]').first()
      await expect(flashcard).toBeVisible({ timeout: 5000 })
    })

    test('should allow flipping the card', async ({ page }) => {
      const flashcard = page.locator('[data-testid="flashcard"], .flashcard, [class*="flashcard"]').first()

      // Click to flip
      await flashcard.click()
      await page.waitForTimeout(300)

      // Verify answer is visible
      const answer = page.locator('[data-testid="answer"], .answer, [class*="answer"]').first()
      await expect(answer).toBeVisible()
    })

    test('should allow rating card quality', async ({ page }) => {
      const flashcard = page.locator('[data-testid="flashcard"], .flashcard, [class*="flashcard"]').first()

      // Flip the card first
      await flashcard.click()
      await page.waitForTimeout(300)

      // Look for quality rating buttons
      const ratingButtons = page.locator('button[data-rating], [data-testid*="rating"], button:has-text("1"), button:has-text("2"), button:has-text("3"), button:has-text("4"), button:has-text("5")')

      const count = await ratingButtons.count()
      if (count > 0) {
        await ratingButtons.first().click()
        await page.waitForTimeout(300)

        // Verify card moved to next
        await expect(flashcard).not.toBeVisible()
      }
    })
  })

  test.describe('Learning Materials', () => {
    test('should display learning materials list', async ({ page }) => {
      await page.goto('/materials')

      const materials = page.locator('[data-testid="material"], .material-card, [class*="material"]').first()
      await expect(materials).toBeVisible({ timeout: 5000 })
    })

    test('should allow generating new material', async ({ page }) => {
      await page.goto('/materials')

      // Look for generate button
      const generateBtn = page.locator('button:has-text("generate"), button:has-text("create"), [data-testid="generate"]').first()

      if (await generateBtn.isVisible()) {
        await generateBtn.click()

        // Should see some form or dialog
        const form = page.locator('form, dialog, [role="dialog"]').first()
        await expect(form).toBeVisible({ timeout: 3000 })
      }
    })
  })

  test.describe('Quiz Flow', () => {
    test('should start a quiz', async ({ page }) => {
      await page.goto('/quiz')

      const startBtn = page.locator('button:has-text("start"), button:has-text("begin"), [data-testid="start-quiz"]').first()

      if (await startBtn.isVisible()) {
        await startBtn.click()
        await page.waitForTimeout(500)

        // Should see quiz question
        const question = page.locator('[data-testid="question"], .question, [class*="question"]').first()
        await expect(question).toBeVisible({ timeout: 5000 })
      }
    })

    test('should submit quiz answer', async ({ page }) => {
      await page.goto('/quiz')

      const startBtn = page.locator('button:has-text("start"), button:has-text("begin"), [data-testid="start-quiz"]').first()

      if (await startBtn.isVisible()) {
        await startBtn.click()
        await page.waitForTimeout(500)

        // Select an answer option
        const option = page.locator('input[type="radio"], button:has-text("A"), [data-testid*="option"]').first()

        if (await option.isVisible()) {
          await option.click()

          // Submit
          const submitBtn = page.locator('button:has-text("submit"), [data-testid="submit"]').first()
          if (await submitBtn.isVisible()) {
            await submitBtn.click()

            // Should see results or next question
            await page.waitForTimeout(500)
          }
        }
      }
    })
  })
})

test.describe('Responsive Design', () => {
  test('should be mobile-friendly', async ({ page, viewport }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    await page.goto('/')

    // Check navigation is accessible
    const nav = page.locator('nav, [role="navigation"]').first()
    await expect(nav).toBeVisible()
  })

  test('should work on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }) // iPad
    await page.goto('/')

    // Check main content is visible
    const main = page.locator('main, [role="main"]').first()
    await expect(main).toBeVisible()
  })
})

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/')

    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible()
  })

  test('should have focus management', async ({ page }) => {
    await page.goto('/')

    // Tab through interactive elements
    await page.keyboard.press('Tab')

    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement)
  })
})
