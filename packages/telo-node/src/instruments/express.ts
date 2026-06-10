import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express'

import type { Instrumentation } from '@opentelemetry/instrumentation'

/**
 * Express instrumentation — names spans after the matched route and middleware
 * layers, nested under the HTTP server span.
 *
 * Route filtering (`ignoreRoutes`) is applied one level up, on the HTTP server
 * span (see {@link httpInstrumentation}): suppressing the server span is what
 * keeps an ignored route out of traces entirely.
 */
export function expressInstrumentation(): Instrumentation {
  return new ExpressInstrumentation()
}
