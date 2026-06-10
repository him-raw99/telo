import { KafkaJsInstrumentation } from '@opentelemetry/instrumentation-kafkajs'

import type { Instrumentation } from '@opentelemetry/instrumentation'

/**
 * Kafka (`kafkajs`) instrumentation.
 *
 * Registered unconditionally — there is no enable flag. Because OTel
 * instrumentations patch on load, this stays completely inert until the app
 * actually loads `kafkajs`, then traces producers/consumers automatically.
 */
export function kafkaInstrumentation(): Instrumentation {
  return new KafkaJsInstrumentation()
}
