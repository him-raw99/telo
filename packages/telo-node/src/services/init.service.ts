import { teloConfigSchema, type TTeloConfig } from '../validator/config.validator';

/**
 * Initialize Telo.
 *
 * Must be called **before** any other `require`/`import`, because OpenTelemetry
 * patches libraries at load time. The config is validated and normalized via
 * {@link teloConfigSchema} (defaults applied, `service` required) before any SDK
 * wiring runs.
 *
 * @param config - Telo configuration. See {@link TTeloConfig}.
 * @throws {import('zod').ZodError} If the configuration is invalid.
 *
 * @example
 * ```ts
 * import { init } from '@telo/node'
 * init({ service: 'checkout-api' })
 * ```
 */
export function init(config: TTeloConfig): void {
  const resolved = teloConfigSchema.parse(config);

  // SDK wiring (Resource, NodeSDK, exporters, lifecycle) is not implemented yet.
  void resolved
}
