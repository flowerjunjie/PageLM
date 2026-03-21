import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/helpers/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.config.ts',
        '**/*.spec.ts',
        '**/types/**',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['node_modules/', 'dist/'],
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
