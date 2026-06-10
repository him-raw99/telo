import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'

import type { SpanExporter } from '@opentelemetry/sdk-trace-base'
import type { IMetricReader } from '@opentelemetry/sdk-metrics'
import type { LogRecordProcessor } from '@opentelemetry/sdk-logs'

/** How often metrics are pushed to the collector, in milliseconds. */
const METRIC_EXPORT_INTERVAL_MILLIS = 10_000

/**
 * Join an OTLP base URL with a signal path, tolerating trailing slashes on the
 * base (so `http://host:4318/` and `http://host:4318` both yield the same URL).
 */
function signalUrl(endpoint: string, path: string): string {
  return `${endpoint.replace(/\/+$/, '')}${path}`
}

/**
 * OTLP/HTTP span exporter posting to `${endpoint}/v1/traces`.
 *
 * Returned bare; the SDK wraps it in a batching span processor.
 *
 * @param endpoint - OTLP HTTP base URL (no `/v1/*` suffix).
 */
export function buildTraceExporter(endpoint: string): SpanExporter {
  return new OTLPTraceExporter({ url: signalUrl(endpoint, '/v1/traces') })
}

/**
 * Metric reader that pushes to `${endpoint}/v1/metrics` every 10 seconds.
 *
 * The reader's interval is unref'd, so it never keeps the process alive on its
 * own. It stays empty until instrumentations or runtime metrics produce data.
 *
 * @param endpoint - OTLP HTTP base URL (no `/v1/*` suffix).
 */
export function buildMetricReaders(endpoint: string): Array<IMetricReader> {
  return [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: signalUrl(endpoint, '/v1/metrics') }),
      exportIntervalMillis: METRIC_EXPORT_INTERVAL_MILLIS,
    }),
  ]
}

/**
 * Batching log-record processor exporting to `${endpoint}/v1/logs` over OTLP/HTTP.
 *
 * @param endpoint - OTLP HTTP base URL (no `/v1/*` suffix).
 */
export function buildLogRecordProcessors(endpoint: string): Array<LogRecordProcessor> {
  return [
    new BatchLogRecordProcessor(new OTLPLogExporter({ url: signalUrl(endpoint, '/v1/logs') })),
  ]
}
