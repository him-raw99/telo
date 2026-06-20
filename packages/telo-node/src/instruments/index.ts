import { httpInstrumentation } from './http'
import { expressInstrumentation } from './express'
import { dbInstrumentations } from './db'
import { kafkaInstrumentation } from './kafka'
import { amqpInstrumentation } from './amqp'
import { loggingInstrumentations } from './logging'
import { runtimeInstrumentation } from './runtime'

import type { Instrumentation } from '@opentelemetry/instrumentation'
import type { TResolvedTeloConfig } from '../validator/config.validator'

/**
 * The full set of instrumentations Telo registers, in registration order.
 *
 * Everything here is on by default. The DB and messaging instrumentations are
 * patch-on-load, so they cost nothing in apps that don't use the underlying
 * library. `fs` is deliberately absent — too noisy to be useful. There is no
 * per-instrument config: which libraries are traced is fixed policy.
 *
 * @param config - Resolved Telo config (passed through to instrumentations that
 *   read it, e.g. HTTP for `ignoreRoutes`).
 */
export function buildInstrumentations(config: TResolvedTeloConfig): Instrumentation[] {
  return [
    httpInstrumentation(config),
    expressInstrumentation(),
    ...dbInstrumentations(),
    kafkaInstrumentation(),
    amqpInstrumentation(),
    ...loggingInstrumentations(),
    runtimeInstrumentation(),
  ]
}
