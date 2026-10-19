import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@shared/config-loader': resolve(__dirname, '../../../shared/config-loader/src/index.ts'),
      '@shared/defect-framework': resolve(__dirname, '../../../shared/defect-framework/src/index.ts')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'test/**/*.test.ts',
      '../defects/**/*.test.ts'
    ],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['**/*.test.ts', 'dist/**', 'node_modules/**']
    }
  }
})
