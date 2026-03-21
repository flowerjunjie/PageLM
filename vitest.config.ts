/**
 * Root Vitest Configuration
 * Aggregates test configurations for both backend and frontend
 */

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [path.resolve(__dirname, 'backend/tests/helpers/setup.ts')],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'backend/src/**/*.ts',
      ],
      exclude: [
        'node_modules/',
        '**/tests/**',
        '**/dist/**',
        '**/*.config.{ts,js}',
        '**/*.spec.ts',
        '**/types/**',
        '**/locales/**',
        '**/i18n/**',
      ],
      // Thresholds enforced per-workspace:
      // backend: see backend/vitest.config.ts
      // frontend: see frontend/vitest.config.ts
    },
    include: [
      'backend/tests/unit/**/*.test.ts',
      'backend/tests/integration/**/*.test.ts',
    ],
    exclude: [
      'node_modules/',
      '**/dist/**',
      'frontend/tests/e2e/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './backend/src'),
    },
  },
})
