import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino'
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston'

import type { Instrumentation } from '@opentelemetry/instrumentation'

/**
 * Log-bridge instrumentations for the two most common Node loggers, `pino` and
 * `winston`.
 *
 * On by default, both behaviors enabled per logger: each forwards every log
 * record to the OpenTelemetry Logs SDK (so app logs flow out through Telo's OTLP
 * logs exporter alongside traces/metrics) and injects the active span's
 * `trace_id`/`span_id` into the record. The logger keeps writing to its normal
 * destination, so stdout output is unchanged.
 *
 * Patch-on-load, so each costs nothing until the app loads that logger.
 * **Important:** like all OpenTelemetry auto-instrumentation, these patch the
 * logger as it is `require()`d, so they only take effect when the app runs as
 * CommonJS (including TypeScript compiled to CommonJS). Under native ESM,
 * `import-in-the-middle` cannot patch a `module.exports = fn` default export
 * (which is how both pino and express are shaped), so the bridge does not fire —
 * see the express-demo README.
 */
export function loggingInstrumentations(): Instrumentation[] {
  return [new PinoInstrumentation(), new WinstonInstrumentation()]
}
