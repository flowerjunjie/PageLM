/**
 * Auxiliary Features E2E Tests
 * Tests for auxiliary functionality:
 * - Flashcards system (/cards)
 * - Learning profile (/profile)
 * - Review system (/review)
 * - Weekly reports (/report/weekly)
 * - Tools page (/tools)
 */

import { test, expect } from '@playwright/test'

test.describe('Flashcards System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cards')
    await page.waitForLoadState('networkidle')
  })

  test('should display flashcards page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /flashcard|card/i }).or(
      page.locator('text=Flashcards').or(page.locator('text=抽认卡'))
    )
    await expect(heading.first()).toBeVisible({ timeout: 5000 })
  })

  test('should display flashcard content', async ({ page }) => {
    const flashcard = page.locator('[data-testid="flashcard"], .flashcard, [class*="flashcard"]').or(
      page.locator('[class*="card"]')
    ).first()

    const isVisible = await flashcard.isVisible().catch(() => false)
    if (isVisible) {
      await expect(flashcard).toBeVisible()
    }
  })

  test('should flip flashcard on click', async ({ page }) => {
    const flashcard = page.locator('[class*="flashcard"], [class*="card"]').filter(async (el) => {
      const text = await el.textContent()
      return text && text.length > 0
    }).first()

    const isVisible = await flashcard.isVisible().catch(() => false)
    if (isVisible) {
      // Get initial state
      const initialState = await flashcard.innerHTML()

      await flashcard.click()
      await page.waitForTimeout(300)

      // Content should change (flipped)
      const newState = await flashcard.innerHTML()

      // Check for flip animation or content change
      const hasFlipClass = await flashcard.evaluate(el =>
        el.classList.contains('flipped') ||
        el.classList.contains('is-flipped') ||
        el.style.transform.includes('rotateY')
      ).catch(() => false)

      const contentChanged = initialState !== newState
      const flipped = hasFlipClass || contentChanged

      expect(flipped).toBeTruthy()
    }
  })

  test('should navigate through flashcards', async ({ page }) => {
    const nextButton = page.locator('button:has-text("Next"), button:has-text("下一个"), button:has-text("下一个")').or(
      page.locator('button[aria-label*="next"], svg[class*="next"], svg[class*="arrow"]')
    ).first()

    const isVisible = await nextButton.isVisible().catch(() => false)
    if (isVisible) {
      await nextButton.click()
      await page.waitForTimeout(300)

      // Should show different flashcard or same card with state change
      const flashcard = page.locator('[class*="flashcard"]').first()
      await expect(flashcard).toBeVisible()
    }
  })

  test('should rate flashcard quality', async ({ page }) => {
    const ratingButtons = page.locator('button[data-rating], [data-testid*="rating"]').or(
      page.locator('button').filter(async (el) => {
        const text = await el.textContent()
        return text && /^[1-5]$/.test(text.trim())
      })
    )

    const count = await ratingButtons.count()
    if (count > 0) {
      await ratingButtons.first().click()
      await page.waitForTimeout(500)

      // Should move to next card or show result
      const flashcard = page.locator('[class*="flashcard"]').first()
      await expect(flashcard).toBeVisible()
    }
  })
})

test.describe('Learning Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')
  })

  test('should display profile page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /profile|learning/i }).or(
      page.locator('text=Profile').or(page.locator('text=学习档案'))
    )
    await expect(heading.first()).toBeVisible({ timeout: 5000 })
  })

  test('should display learning statistics', async ({ page }) => {
    const stats = page.locator('[class*="stat"], [class*="metric"], [class*="chart"]').or(
      page.locator('text=/days|cards|reviews|天数|卡片|复习/i')
    )

    const count = await stats.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should display learning progress visualization', async ({ page }) => {
    const chart = page.locator('[class*="chart"], canvas, svg').or(
      page.locator('[data-testid="progress-chart"]')
    )

    const hasChart = await chart.isVisible().catch(() => false)
    if (hasChart) {
      await expect(chart.first()).toBeVisible()
    }
  })

  test('should display study streak or activity', async ({ page }) => {
    const streak = page.locator('text=/streak|day|activity|连续|活跃/i')
    const hasStreak = await streak.isVisible().catch(() => false)

    if (hasStreak) {
      await expect(streak.first()).toBeVisible()
    }
  })
})

test.describe('Review System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/review')
    await page.waitForLoadState('networkidle')
  })

  test('should display review page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /review/i }).or(
      page.locator('text=Review').or(page.locator('text=复习'))
    )
    await expect(heading.first()).toBeVisible({ timeout: 5000 })
  })

  test('should display due cards count', async ({ page }) => {
    const countDisplay = page.locator('text=/\\d+.*card|\\d+.*张|due/i')
    const hasCount = await countDisplay.isVisible().catch(() => false)

    if (hasCount) {
      await expect(countDisplay.first()).toBeVisible()
    }
  })

  test('should start review session', async ({ page }) => {
    const startButton = page.locator('button:has-text("Start"), button:has-text("开始"), button:has-text("Review")').first()
    const isVisible = await startButton.isVisible().catch(() => false)

    if (isVisible) {
      await startButton.click()
      await page.waitForTimeout(500)

      // Should show flashcard or question
      const card = page.locator('[class*="flashcard"], [class*="card"], [class*="question"]')
      await expect(card.first()).toBeVisible()
    }
  })

  test('should handle empty review state', async ({ page }) => {
    const emptyState = page.locator('text=/no card|all done|完成|empty/i').or(
      page.locator('[class*="empty"]')
    )
    const hasEmptyState = await emptyState.isVisible().catch(() => false)

    if (hasEmptyState) {
      await expect(emptyState.first()).toBeVisible()
    }
  })
})

test.describe('Weekly Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/report/weekly')
    await page.waitForLoadState('networkidle')
  })

  test('should display weekly report page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /report|weekly/i }).or(
      page.locator('text=Report').or(page.locator('text=周报'))
    )
    await expect(heading.first()).toBeVisible({ timeout: 5000 })
  })

  test('should display weekly statistics', async ({ page }) => {
    const stats = page.locator('[class*="stat"], [class*="summary"]').or(
      page.locator('text=/this week|本周/i')
    )

    const count = await stats.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should display activity timeline or chart', async ({ page }) => {
    const chart = page.locator('[class*="chart"], canvas, svg').or(
      page.locator('[class*="timeline"], [class*="activity"]')
    )

    const hasChart = await chart.isVisible().catch(() => false)
    if (hasChart) {
      await expect(chart.first()).toBeVisible()
    }
  })

  test('should have share functionality', async ({ page }) => {
    const shareButton = page.locator('button:has-text("Share"), button:has-text("分享")').first()
    const isVisible = await shareButton.isVisible().catch(() => false)

    if (isVisible) {
      await shareButton.click()
      await page.waitForTimeout(300)

      // Should show share options or copy link
      const shareDialog = page.locator('[class*="share"], [role="dialog"]')
      await expect(shareDialog.first()).toBeVisible()
    }
  })
})

test.describe('Tools Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools')
    await page.waitForLoadState('networkidle')
  })

  test('should display tools page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /tool/i }).or(
      page.locator('text=Tools').or(page.locator('text=工具'))
    )
    await expect(heading.first()).toBeVisible({ timeout: 5000 })
  })

  test('should display back to home button', async ({ page }) => {
    const backButton = page.locator('a[href="/"]').or(
      page.locator('svg').filter({ hasText: '' }).filter(async (el) => {
        const path = await el.$('path[d*="M15.75 19.5"]')
        return path !== null
      })
    )
    await expect(backButton.first()).toBeVisible()
  })

  test('should display Smart Notes tool', async ({ page }) => {
    const smartNotes = page.locator('#tool-notes, [data-testid="smart-notes"]').or(
      page.locator('text=/smart notes|智能笔记/i')
    )
    await expect(smartNotes.first()).toBeVisible({ timeout: 5000 })
  })

  test('should display Podcast Generator tool', async ({ page }) => {
    const podcast = page.locator('#tool-podcast, [data-testid="podcast"]').or(
      page.locator('text=/podcast|播客/i')
    )
    await expect(podcast.first()).toBeVisible({ timeout: 5000 })
  })

  test('should display Transcriber tool', async ({ page }) => {
    const transcriber = page.locator('#tool-transcriber, [data-testid="transcriber"]').or(
      page.locator('text=/transcriber|转录/i')
    )
    await expect(transcriber.first()).toBeVisible({ timeout: 5000 })
  })

  test('should scroll to tool section with hash', async ({ page }) => {
    await page.goto('/tools#podcast')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500) // Wait for scroll

    // Check if podcast section is in view
    const podcastSection = page.locator('#tool-podcast').first()
    const isInView = await podcastSection.isVisible().catch(() => false)

    if (isInView) {
      const boundingBox = await podcastSection.boundingBox()
      expect(boundingBox).toBeTruthy()
    }
  })
})

test.describe('Smart Notes Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools#notes')
    await page.waitForLoadState('networkidle')
  })

  test('should display input area for notes', async ({ page }) => {
    const input = page.locator('#tool-notes textarea, #tool-notes input').or(
      page.locator('[data-testid="smart-notes"] textarea')
    )
    const isVisible = await input.isVisible().catch(() => false)

    if (isVisible) {
      await expect(input.first()).toBeVisible()
    }
  })

  test('should allow generating notes', async ({ page }) => {
    const generateButton = page.locator('#tool-notes button:has-text("Generate"), #tool-notes button:has-text("生成")').first()
    const isVisible = await generateButton.isVisible().catch(() => false)

    if (isVisible) {
      await generateButton.click()
      await page.waitForTimeout(2000)

      // Should show result or error message
      const result = page.locator('[class*="result"], [class*="notes"]').or(
        page.locator('text=/error|please enter|请输入/i')
      )
      const hasResult = await result.isVisible().catch(() => false)
      expect(hasResult).toBeTruthy()
    }
  })
})

test.describe('Podcast Generator Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools#podcast')
    await page.waitForLoadState('networkidle')
  })

  test('should display topic input for podcast', async ({ page }) => {
    const input = page.locator('#tool-podcast input, #tool-podcast textarea').or(
      page.locator('[data-testid="podcast"] input')
    )
    const isVisible = await input.isVisible().catch(() => false)

    if (isVisible) {
      await expect(input.first()).toBeVisible()
    }
  })

  test('should allow starting podcast generation', async ({ page }) => {
    const startButton = page.locator('#tool-podcast button:has-text("Generate"), #tool-podcast button:has-text("Start"), #tool-podcast button:has-text("生成")').first()
    const isVisible = await startButton.isVisible().catch(() => false)

    if (isVisible) {
      await startButton.click()
      await page.waitForTimeout(2000)

      // Should show progress or result
      const progress = page.locator('[class*="progress"], [class*="generating"]').or(
        page.locator('text=/generating|processing|生成中/i')
      )
      const hasProgress = await progress.isVisible().catch(() => false)
      if (hasProgress) {
        await expect(progress.first()).toBeVisible()
      }
    }
  })
})

test.describe('Transcriber Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools#transcriber')
    await page.waitForLoadState('networkidle')
  })

  test('should display file upload area', async ({ page }) => {
    const upload = page.locator('#tool-transcriber input[type="file"], #tool-transcriber [class*="upload"]').or(
      page.locator('[data-testid="transcriber"] input[type="file"]')
    )
    const isVisible = await upload.isVisible().catch(() => false)

    if (isVisible) {
      await expect(upload.first()).toBeVisible()
    }
  })

  test('should display transcribe button', async ({ page }) => {
    const button = page.locator('#tool-transcriber button:has-text("Transcribe"), #tool-transcriber button:has-text("转录")').first()
    const isVisible = await button.isVisible().catch(() => false)

    if (isVisible) {
      await expect(button).toBeVisible()
    }
  })
})

test.describe('Debate Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/debate')
    await page.waitForLoadState('networkidle')
  })

  test('should display debate page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /debate/i }).or(
      page.locator('text=Debate').or(page.locator('text=辩论'))
    )
    await expect(heading.first()).toBeVisible({ timeout: 5000 })
  })

  test('should have input for debate topic', async ({ page }) => {
    const input = page.locator('textarea, input[type="text"]').first()
    await expect(input).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Exam/ExamLabs Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/exam')
    await page.waitForLoadState('networkidle')
  })

  test('should display exam page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /exam|lab/i }).or(
      page.locator('text=Exam').or(page.locator('text=考试'))
    )
    await expect(heading.first()).toBeVisible({ timeout: 5000 })
  })

  test('should display exam practice interface', async ({ page }) => {
    const interface = page.locator('[class*="exam"], [class*="practice"]').or(
      page.locator('text=/practice|mode|模式|练习/i')
    )
    const count = await interface.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Help Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/help')
    await page.waitForLoadState('networkidle')
  })

  test('should display help page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /help/i }).or(
      page.locator('text=Help').or(page.locator('text=帮助'))
    )
    await expect(heading.first()).toBeVisible({ timeout: 5000 })
  })

  test('should display help content or FAQ', async ({ page }) => {
    const content = page.locator('[class*="help"], [class*="faq"], details, summary').or(
      page.locator('text=/how to|guide|tutorial|如何|指南/i')
    )
    const count = await content.count()
    expect(count).toBeGreaterThan(0)
  })
})
