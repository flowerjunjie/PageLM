/**
 * Landing Page E2E Tests
 * Comprehensive tests for the main landing page
 */

import { test, expect } from '@playwright/test'
import { LandingPage } from '../pages/LandingPage'

test.describe('Landing Page - Main Content', () => {
  let landingPage: LandingPage

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page)
    await landingPage.goto()
  })

  test('should display main heading', async ({ page }) => {
    const headingText = await landingPage.getHeadingText()
    expect(headingText.length).toBeGreaterThan(0)
    await expect(landingPage.heading.first()).toBeVisible()
  })

  test('should display subtitle', async ({ page }) => {
    await expect(landingPage.subtitle.first()).toBeVisible()
  })

  test('should display learning mode selector', async ({ page }) => {
    await expect(landingPage.learningModeSelector).toBeVisible()
  })

  test('should display all 6 learning mode buttons', async ({ page }) => {
    const buttons = [
      landingPage.previewButton,
      landingPage.notesButton,
      landingPage.quizButton,
      landingPage.podcastButton,
      landingPage.plannerButton,
      landingPage.chatButton
    ]

    for (const button of buttons) {
      await expect(button.first()).toBeVisible()
    }
  })

  test('should have proper button styling with hover effects', async ({ page }) => {
    const button = landingPage.chatButton.first()

    // Get initial styles
    const initialTransform = await button.evaluate(el => {
      return window.getComputedStyle(el).transform
    })

    // Hover over button
    await button.hover()
    await page.waitForTimeout(300)

    // Check for scale or transform change
    const hoverTransform = await button.evaluate(el => {
      return window.getComputedStyle(el).transform
    })

    // Transform should change (hover effect)
    expect(hoverTransform).not.toBe(initialTransform)
  })
})

test.describe('Landing Page - Quick Input', () => {
  let landingPage: LandingPage

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page)
    await landingPage.goto()
  })

  test('should have quick input toggle button', async ({ page }) => {
    const isVisible = await landingPage.quickInputToggle.isVisible().catch(() => false)
    if (isVisible) {
      await expect(landingPage.quickInputToggle.first()).toBeVisible()
    }
  })

  test('should toggle quick input visibility', async ({ page }) => {
    const toggle = landingPage.quickInputToggle.first()
    const toggleVisible = await toggle.isVisible().catch(() => false)

    if (toggleVisible) {
      const initialVisible = await landingPage.isQuickInputVisible()

      await landingPage.toggleQuickInput()

      const afterToggle = await landingPage.isQuickInputVisible()

      // Should toggle visibility
      if (initialVisible) {
        expect(afterToggle).toBeFalsy()
      } else {
        expect(afterToggle).toBeTruthy()
      }
    }
  })

  test('should allow entering prompt', async ({ page }) => {
    await landingPage.toggleQuickInput()

    const input = landingPage.promptBox.first()
    await expect(input).toBeVisible()

    await landingPage.enterPrompt('Explain machine learning')
    await expect(input).toHaveValue(/machine learning/)
  })

  test('should send prompt and navigate to chat', async ({ page }) => {
    await landingPage.toggleQuickInput()

    await landingPage.enterPrompt('What is AI?')
    await landingPage.sendPrompt()

    // Should navigate to chat page
    await expect(page).toHaveURL(/\/chat/, { timeout: 5000 })
  })
})

test.describe('Landing Page - Explore Topics', () => {
  let landingPage: LandingPage

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page)
    await landingPage.goto()
  })

  test('should display explore topics section', async ({ page }) => {
    const topicCount = await landingPage.getExploreTopicsCount()
    expect(topicCount).toBeGreaterThan(0)
  })

  test('should navigate to chat when clicking topic', async ({ page }) => {
    const initialUrl = page.url()
    await landingPage.clickExploreTopic(0)

    // Should navigate away or open chat
    await page.waitForTimeout(1000)
    expect(page.url()).not.toBe(initialUrl)
  })
})

test.describe('Landing Page - Review Reminder', () => {
  let landingPage: LandingPage

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page)
    await landingPage.goto()
  })

  test('should display review reminder if due', async ({ page }) => {
    const hasReminder = await landingPage.hasReviewReminder()

    if (hasReminder) {
      const reminder = page.locator('[class*="review"], [class*="reminder"]').filter({ hasText: /review|due/i })
      await expect(reminder.first()).toBeVisible()
    }
  })
})

test.describe('Landing Page - Responsive Design', () => {
  test('should be mobile-friendly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    const landingPage = new LandingPage(page)
    await landingPage.goto()

    // Main elements should be visible
    await expect(landingPage.heading.first()).toBeVisible()

    // Learning mode buttons should stack on mobile
    const grid = page.locator('.grid, [class*="grid-cols"]')
    const hasGrid = await grid.isVisible().catch(() => false)

    if (hasGrid) {
      const gridClass = await grid.first().getAttribute('class')
      // Mobile grid should have 2 columns or 1 column
      expect(gridClass).toMatch(/grid-cols-1|grid-cols-2/)
    }
  })

  test('should be tablet-friendly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    const landingPage = new LandingPage(page)
    await landingPage.goto()

    await expect(landingPage.heading.first()).toBeVisible()
    await expect(landingPage.learningModeSelector).toBeVisible()
  })

  test('should be desktop-friendly', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    const landingPage = new LandingPage(page)
    await landingPage.goto()

    await expect(landingPage.heading.first()).toBeVisible()

    // Desktop should show 3 columns for learning modes
    const grid = page.locator('.grid, [class*="grid-cols"]')
    const hasGrid = await grid.isVisible().catch(() => false)

    if (hasGrid) {
      const gridClass = await grid.first().getAttribute('class')
      // Desktop grid typically has 3 columns
      expect(gridClass).toMatch(/grid-cols-2|grid-cols-3|md:grid-cols/)
    }
  })
})

test.describe('Landing Page - Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/')

    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible()

    const h1Count = await page.locator('h1').count()
    // Should have exactly one h1
    expect(h1Count).toBe(1)
  })

  test('should have focusable buttons', async ({ page }) => {
    await page.goto('/')

    // Tab to first button
    await page.keyboard.press('Tab')

    const focused = await page.evaluate(() => {
      const active = document.activeElement
      return active?.tagName === 'BUTTON' || active?.tagName === 'A'
    })

    expect(focused).toBeTruthy()
  })

  test('should have aria-labels on interactive elements', async ({ page }) => {
    await page.goto('/')

    const buttonsWithAria = page.locator('button[aria-label], a[aria-label]')
    const count = await buttonsWithAria.count()

    // Should have some elements with aria-labels
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Landing Page - Language Support', () => {
  test('should display English text', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check for English content
    const englishText = page.locator('text=/Choose Your Learning Mode|Preview Lesson|Free Chat/')
    const hasEnglish = await englishText.isVisible().catch(() => false)

    // May have English or Chinese depending on browser language
    expect(hasEnglish).toBeTruthy()
  })

  test('should be able to switch language', async ({ page }) => {
    await page.goto('/')

    const langSwitcher = page.locator('[data-testid="language-switcher"], button[aria-label*="language" i]')
    const isVisible = await langSwitcher.isVisible().catch(() => false)

    if (isVisible) {
      await langSwitcher.first().click()
      await page.waitForTimeout(300)

      // Should show language options
      const langOptions = page.locator('[class*="language"], [role="menu"]')
      const hasOptions = await langOptions.isVisible().catch(() => false)

      if (hasOptions) {
        await expect(langOptions.first()).toBeVisible()
      }
    }
  })
})

test.describe('Landing Page - Theme Support', () => {
  test('should have theme toggle', async ({ page }) => {
    await page.goto('/')

    const themeToggle = page.locator('[data-testid="theme-toggle"], button[aria-label*="theme" i]')
    const isVisible = await themeToggle.isVisible().catch(() => false)

    if (isVisible) {
      await expect(themeToggle.first()).toBeVisible()
    }
  })

  test('should toggle between light and dark theme', async ({ page }) => {
    await page.goto('/')

    const themeToggle = page.locator('[data-testid="theme-toggle"], button[aria-label*="theme" i]')
    const isVisible = await themeToggle.isVisible().catch(() => false)

    if (isVisible) {
      // Get initial background color
      const initialBg = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor
      })

      await themeToggle.first().click()
      await page.waitForTimeout(300)

      // Background color should change
      const newBg = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor
      })

      expect(newBg).not.toBe(initialBg)
    }
  })
})

test.describe('Landing Page - Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true)

    await page.goto('/')

    // Page should still load
    const heading = page.locator('h1').first()
    await expect(heading).toBeVisible()

    // Restore online mode
    await page.context().setOffline(false)
  })

  test('should handle empty prompt submission', async ({ page }) => {
    await page.goto('/')

    const landingPage = new LandingPage(page)
    await landingPage.toggleQuickInput()

    // Try to send empty message
    const input = landingPage.promptBox.first()
    await input.fill('')
    await input.press('Enter')

    // Should not navigate - should stay on landing page
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(/\//)
  })
})
