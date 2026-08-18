import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/.nuxt/**', '**/tests/e2e/**']
    }
  }
})
