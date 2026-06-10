import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'

import type { Instrumentation } from '@opentelemetry/instrumentation'
import type { TResolvedTeloConfig } from '../validator/config.validator'

/**
 * Node `http`/`https` instrumentation — the root server/client spans every
 * other span hangs off.
 *
 * `config.ignoreRoutes` is wired here via `ignoreIncomingRequestHook`: a request
 * whose path (query string stripped) exactly matches a listed route starts no
 * server span at all, so health/readiness probes don't flood traces.
 *
 * @param config - Resolved Telo config; only `ignoreRoutes` is read.
 */
export function httpInstrumentation(config: TResolvedTeloConfig): Instrumentation {
  const ignored = new Set(config.ignoreRoutes)
  return new HttpInstrumentation({
    ignoreIncomingRequestHook: (request) => {
      const path = (request.url ?? '').split('?')[0] ?? ''
      return ignored.has(path)
    },
  })
}
