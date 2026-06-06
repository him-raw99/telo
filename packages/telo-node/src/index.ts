import type { TTeloConfig } from "./types/config"

/**
 * Initialize Telo. Must be called before any other require/import,
 * because OpenTelemetry patches libraries at load time.
 */
export function init(config: TTeloConfig): void {
  // no-op (Day 2+)
  void config
}

/**
 * Wrap custom work in a span. Records exceptions, sets ERROR status,
 * and ends the span automatically. Currently a passthrough.
 */
export function span<T>(name: string, fn: () => T): T {
  // no-op passthrough (Day 4)
  void name
  return fn()
}

// Default export so `import telo from '@telo/node'` and
// `require('@telo/node').init(...)` both work.
export default { init, span }
