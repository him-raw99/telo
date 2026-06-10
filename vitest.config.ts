import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    environment: 'node',
    env: {
      // Tests boot the real SDK but no collector is listening, so the final
      // shutdown flush would otherwise burn ~8s retrying against a dead
      // endpoint. A short OTLP timeout makes that doomed flush fail fast.
      OTEL_EXPORTER_OTLP_TIMEOUT: '300',
    },
  },
})
