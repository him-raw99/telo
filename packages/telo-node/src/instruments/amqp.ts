import { AmqplibInstrumentation } from '@opentelemetry/instrumentation-amqplib'

import type { Instrumentation } from '@opentelemetry/instrumentation'

/**
 * RabbitMQ (`amqplib`) instrumentation.
 *
 * Registered unconditionally — there is no enable flag. Because OTel
 * instrumentations patch on load, this stays completely inert until the app
 * actually loads `amqplib`, then traces publishes/consumes automatically.
 */
export function amqpInstrumentation(): Instrumentation {
  return new AmqplibInstrumentation()
}
