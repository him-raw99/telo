import { resolveConfig } from '../config/resolve'
import { startTelemetry } from '../sdk'
import type { TTeloConfig } from '../validator/config.validator'

/**
 * Initialize Telo: validate config, then boot the OpenTelemetry SDK.
 *
 * Must be called **before** any other `require`/`import`, because OpenTelemetry
 * patches libraries at load time; Telo warns at startup if it detects an
 * instrumented library was loaded first. Config precedence is `init()` arg →
 * `TELO_*` env var → default, so this can be called with no arguments as long
 * as `TELO_SERVICE` is set.
 *
 * Idempotent: a second call warns once and is otherwise a no-op.
 *
 * @param config - Telo configuration. See {@link TTeloConfig}. Optional when the
 *   required `service` is supplied via `TELO_SERVICE`.
 * @throws {import('zod').ZodError} If the resolved configuration is invalid.
 *
 * @example
 * ```ts
 * import { init } from '@telo/node'
 * init({ service: 'checkout-api' })
 * ```
 */
export function init(config?: TTeloConfig): void {
  const resolvedConfig = resolveConfig(config)
  startTelemetry(resolvedConfig)
}
