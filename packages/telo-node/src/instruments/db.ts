import { PgInstrumentation } from '@opentelemetry/instrumentation-pg'
import { MySQLInstrumentation } from '@opentelemetry/instrumentation-mysql'
import { MySQL2Instrumentation } from '@opentelemetry/instrumentation-mysql2'
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis'
import { MongooseInstrumentation } from '@opentelemetry/instrumentation-mongoose'
import { DnsInstrumentation } from '@opentelemetry/instrumentation-dns'

import type { Instrumentation } from '@opentelemetry/instrumentation'

/**
 * Data-layer instrumentations: PostgreSQL (`pg`), MySQL (both the `mysql` and
 * `mysql2` drivers), Redis (`@opentelemetry/instrumentation-redis`, which
 * covers `redis`), Mongoose, and DNS lookups.
 *
 * Each is patch-on-load — it emits spans only if the host app actually loads
 * the corresponding library, so listing every driver here costs nothing in an
 * app that uses only one.
 */
export function dbInstrumentations(): Instrumentation[] {
  return [
    new PgInstrumentation(),
    new MySQLInstrumentation(),
    new MySQL2Instrumentation(),
    new RedisInstrumentation(),
    new MongooseInstrumentation(),
    new DnsInstrumentation(),
  ]
}
