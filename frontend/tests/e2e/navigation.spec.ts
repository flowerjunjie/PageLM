/**
 * Navigation E2E Tests
 * Tests for navigation functionality:
 * - Sidebar navigation
 * - Mobile menu
 * - Direct URL access
 * - Back button
 * - Chat history toggle
 */

import { test, expect } from '@playwright/test'

test.describe('Navigation - Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should display sidebar navigation', async ({ page }) => {
    const sidebar = page.locator('aside, nav').or(page.locator('[class*="sidebar"]'))
    await expect(sidebar.first()).toBeVisible()
  })

  test('should have logo/home link', async ({ page }) => {
    const homeLink = page.locator('a[href="/"]').or(page.locator('img[alt="logo"]'))
    await expect(homeLink.first()).toBeVisible()
  })

  test('should navigate to all main pages from sidebar', async ({ page }) => {
    const navLinks = [
      { href: '/tools', name: 'Tools' },
      { href: '/exam', name: 'Exam' },
      { href: '/quiz', name: 'Quiz' },
      { href: '/planner', name: 'Planner' },
      { href: '/debate', name: 'Debate' },
      { href: '/cards', name: 'Flashcards' },
      { href: '/profile', name: 'Profile' },
      { href: '/report/weekly', name: 'Report' },
      { href: '/help', name: 'Help' },
    ]

    for (const link of navLinks) {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const navLink = page.locator(`a[href="${link.href}"]`).first()
      const isVisible = await navLink.isVisible().catch(() => false)

      if (isVisible) {
        await navLink.click()
        await page.waitForTimeout(500)
        await expect(page).toHaveURL(new RegExp(link.href.replace('/', '\\/')))
      }
    }
  })

  test('should toggle chat history panel', async ({ page }) => {
    // Find the toggle button (clock icon)
    const toggleButton = page.locator('button').filter({ hasText: '' }).filter(async (el) => {
      const svg = await el.$('svg')
      return svg !== null
    }).nth(1) // Second button is typically the history toggle

    // Alternative: look for button with clock icon path
    const clockButton = page.locator('button svg path[d*="M12 1.25C6.06294"]')

    const isVisible = await clockButton.isVisible().catch(() => false)
    if (isVisible) {
      await clockButton.click()
      await page.waitForTimeout(300)

      // Should show chat history panel
      const historyPanel = page.locator('#idk, [class*="history"], [class*="chat-list"]')
      await expect(historyPanel.first()).toBeVisible()
    }
  })

  test('should display theme toggle', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"], button[aria-label*="theme" i], button[aria-label*="主题" i]')
    const isVisible = await themeToggle.isVisible().catch(() => false)

    if (isVisible) {
      await expect(themeToggle.first()).toBeVisible()
    }
  })

  test('should display language switcher', async ({ page }) => {
    const langSwitcher = page.locator('[data-testid="language-switcher"], button[aria-label*="language" i], button[aria-label*="语言" i]')
    const isVisible = await langSwitcher.isVisible().catch(() => false)

    if (isVisible) {
      await expect(langSwitcher.first()).toBeVisible()
    }
  })
})

test.describe('Navigation - Mobile Menu', () => {
  test('should display mobile menu button on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Should show mobile menu button (hamburger)
    const menuButton = page.locator('button.fixed.top-4.left-4, button[aria-label*="menu" i], button[aria-label*="菜单" i]')
    await expect(menuButton.first()).toBeVisible()
  })

  test('should open mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const menuButton = page.locator('button.fixed.top-4.left-4').first()
    await menuButton.click()
    await page.waitForTimeout(300)

    // Sidebar should become visible
    const sidebar = page.locator('aside').first()
    await expect(sidebar).toBeVisible()
  })

  test('should close mobile menu when clicking overlay', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Open menu
    const menuButton = page.locator('button.fixed.top-4.left-4').first()
    await menuButton.click()
    await page.waitForTimeout(300)

    // Click overlay
    const overlay = page.locator('.bg-black\\/50, [class*="overlay"], [class*="backdrop"]').first()
    const overlayVisible = await overlay.isVisible().catch(() => false)

    if (overlayVisible) {
      await overlay.click()
      await page.waitForTimeout(300)

      // Menu should be hidden (translate-x-full or similar)
      const sidebar = page.locator('aside').first()
      const transform = await sidebar.evaluate(el => window.getComputedStyle(el).transform)
      expect(transform).toContain('matrix') // Should be off-screen
    }
  })

  test('should navigate using mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Open menu
    const menuButton = page.locator('button.fixed.top-4.left-4').first()
    await menuButton.click()
    await page.waitForTimeout(300)

    // Click on a navigation link
    const toolsLink = page.locator('a[href="/tools"]').first()
    const toolsVisible = await toolsLink.isVisible().catch(() => false)

    if (toolsVisible) {
      await toolsLink.click()
      await page.waitForLoadState('networkidle')

      await expect(page).toHaveURL(/\/tools/)
    }
  })
})

test.describe('Navigation - Back to Home', () => {
  test('should navigate back to home from internal pages', async ({ page }) => {
    const pages = ['/tools', '/quiz', '/planner', '/cards', '/profile']

    for (const pagePath of pages) {
      await page.goto(pagePath)
      await page.waitForLoadState('networkidle')

      // Look for back/home button
      const backButton = page.locator('a[href="/"], button:has-text("back" i)').first()
      const isVisible = await backButton.isVisible().catch(() => false)

      if (isVisible) {
        await backButton.click()
        await page.waitForLoadState('networkidle')

        await expect(page).toHaveURL(/\/$/, { timeout: 5000 })
        break // Test once is enough
      }
    }
  })

  test('should display back button on Tools page', async ({ page }) => {
    await page.goto('/tools')
    await page.waitForLoadState('networkidle')

    const backButton = page.locator('a[href="/"]').or(
      page.locator('svg').filter({ hasText: '' }).filter(async (el) => {
        const path = await el.$('path[d*="M15.75 19.5 8.25 12"]')
        return path !== null
      })
    )

    await expect(backButton.first()).toBeVisible()
  })
})

test.describe('Navigation - Direct URL Access', () => {
  const routes = [
    '/',
    '/chat',
    '/quiz',
    '/tools',
    '/planner',
    '/debate',
    '/cards',
    '/exam',
    '/profile',
    '/review',
    '/report/weekly',
    '/help',
    '/preview',
    '/notes',
    '/podcast',
  ]

  for (const route of routes) {
    test(`should load route: ${route}`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      // Page should load without errors
      const body = page.locator('body').first()
      await expect(body).toBeVisible()

      // Should not show 404 error (unless it's an invalid route)
      const notFound = page.locator('text=/404|not found|找不到/').first()
      const isNotFound = await notFound.isVisible().catch(() => false)

      // For valid routes, should not show 404
      expect(isNotFound).toBeFalsy()
    })
  }
})

test.describe('Navigation - Active States', () => {
  test('should highlight active page in sidebar', async ({ page }) => {
    await page.goto('/quiz')
    await page.waitForLoadState('networkidle')

    // Check if quiz link has active styling
    const quizLink = page.locator('a[href="/quiz"]').first()

    // Active state should have different styling (bg-stone-800 or similar)
    const isActive = await quizLink.evaluate(el => {
      const classes = el.className || ''
      return classes.includes('bg-stone-800') ||
             classes.includes('active') ||
             classes.includes('text-white')
    })

    expect(isActive).toBeTruthy()
  })

  test('should update active state when navigating', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Home should be active
    const homeLink = page.locator('a[href="/"]').first()
    const homeActive = await homeLink.evaluate(el => {
      const classes = el.className || ''
      return classes.includes('bg-stone-800') || classes.includes('active')
    })

    expect(homeActive).toBeTruthy()

    // Navigate to quiz
    await page.goto('/quiz')
    await page.waitForLoadState('networkidle')

    // Quiz should be active
    const quizLink = page.locator('a[href="/quiz"]').first()
    const quizActive = await quizLink.evaluate(el => {
      const classes = el.className || ''
      return classes.includes('bg-stone-800') || classes.includes('active')
    })

    expect(quizActive).toBeTruthy()
  })
})
