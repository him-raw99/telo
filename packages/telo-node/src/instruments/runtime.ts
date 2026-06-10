import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node'

import type { Instrumentation } from '@opentelemetry/instrumentation'

/**
 * Node.js runtime metrics — heap usage, GC pause, event-loop lag/utilization,
 * and active handles/requests.
 *
 * Always on (it has no target library to wait for): it's the source of the
 * process-health metrics that downstream dashboards chart.
 */
export function runtimeInstrumentation(): Instrumentation {
  return new RuntimeNodeInstrumentation()
}
