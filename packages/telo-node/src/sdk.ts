import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { resourceFromAttributes } from '@opentelemetry/resources'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base'
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'

import {
  buildLogRecordProcessors,
  buildMetricReaders,
  buildTraceExporter,
} from './config/exporters'
import { warnIfLoadedLate } from './config/load-order'
import { buildInstrumentations } from './instruments'

import type { TResolvedTeloConfig } from './validator/config.validator'

let sdk: NodeSDK | undefined
let started = false

/**
 * Best-effort read of the host app's `service.version` from its `package.json`.
 * Never throws — falls back to `'unknown'` if the file is missing or unreadable.
 */
function detectServiceVersion(): string {
  try {
    const parsed: unknown = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
    if (parsed && typeof parsed === 'object' && 'version' in parsed) {
      const version = (parsed as { version?: unknown }).version
      if (typeof version === 'string' && version.length > 0) return version
    }
  } catch {
    // best-effort; a missing or malformed package.json is not an error here.
  }
  return 'unknown'
}

/**
 * Assemble and start the OpenTelemetry `NodeSDK` from resolved config: a
 * `Resource` carrying `service.name`/`service.version`/`deployment.environment`,
 * a `ParentBased(TraceIdRatioBased)` sampler (so `sampleRate` governs roots and
 * children follow the parent), OTLP exporters for all three signals, and the
 * default instrumentations.
 *
 * Telo does not touch process signals — exit is the app's to own. Call
 * {@link shutdownTelemetry} before exiting if you want a final flush.
 *
 * Idempotent: a second call logs one warning and does nothing, so a stray extra
 * `init()` can't double-register the SDK.
 *
 * @param config - Fully-resolved Telo config.
 */
export function startTelemetry(config: TResolvedTeloConfig): void {
  if (started) {
    console.warn('Telo: init() called more than once; ignoring the repeat call.')
    return
  }
  started = true

  warnIfLoadedLate()

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: config.service,
    [ATTR_SERVICE_VERSION]: detectServiceVersion(),
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: config.env,
  })

  sdk = new NodeSDK({
    resource,
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(config.sampleRate),
    }),
    traceExporter: buildTraceExporter(config.endpoint),
    metricReaders: buildMetricReaders(config.endpoint),
    logRecordProcessors: buildLogRecordProcessors(config.endpoint),
    instrumentations: buildInstrumentations(config),
  })

  sdk.start()
}

/**
 * Flush all pending telemetry (traces, metrics, logs) and shut the SDK down,
 * **without exiting the process** — the caller owns the exit.
 *
 * This is the public `shutdown()`; call it before exiting if you want a final
 * flush. Resets module state too, so a later {@link startTelemetry} starts
 * cleanly.
 */
export async function shutdownTelemetry(): Promise<void> {
  const current = sdk
  sdk = undefined
  started = false

  if (current) await current.shutdown()
}
