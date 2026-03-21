import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/helpers/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.{js,ts}',
        '**/types/**',
        '**/dist/**',
        '**/locales/**',
        '**/i18n/**',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    include: ['tests/unit/**/*.test.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
    exclude: ['node_modules/', 'dist/', 'tests/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
