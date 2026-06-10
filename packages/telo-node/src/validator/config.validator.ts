import { z } from 'zod'

/** OTLP HTTP base URL used when the caller does not provide one. */
const DEFAULT_ENDPOINT = 'http://localhost:4318'
/** Trace sample rate used when the caller does not provide one (sample everything). */
const DEFAULT_SAMPLE_RATE = 1.0

/**
 * Runtime schema for Telo configuration.
 *
 * This is the **single source of truth**: the public {@link TTeloConfig} type is
 * inferred from it (so the type can never drift from validation), and
 * {@link validateConfig} uses it to validate + normalize whatever a caller
 * passes to `init()` — including from plain JavaScript where the compiler
 * can't help.
 *
 * Defaults are applied on parse:
 * - `endpoint`     → `http://localhost:4318`
 * - `env`          → `process.env.NODE_ENV` (falls back to `'unknown'`)
 * - `sampleRate`   → `1.0`
 * - `ignoreRoutes` → `[]`
 */
export const teloConfigSchema = z.object({
  service: z
    .string({ error: 'Telo: `service` is required — name your service, e.g. "checkout-api".' })
    .min(1, 'Telo: `service` must be a non-empty string.')
    .describe('Service name, reported as the `service.name` resource attribute. Required.'),

  endpoint: z
    .url('Telo: `endpoint` must be a valid URL, e.g. "http://localhost:4318".')
    .default(DEFAULT_ENDPOINT)
    .describe('OTLP HTTP base URL; the `/v1/{traces,metrics,logs}` paths are appended.'),

  env: z
    .string()
    .default(() => process.env.NODE_ENV ?? 'unknown')
    .describe('Deployment environment, reported as the `deployment.environment` attribute.'),

  sampleRate: z
    .number()
    .min(0, 'Telo: `sampleRate` must be between 0 and 1.')
    .max(1, 'Telo: `sampleRate` must be between 0 and 1.')
    .default(DEFAULT_SAMPLE_RATE)
    .describe('Head sampling probability for root spans, 0..1. Child spans follow the parent.'),

  ignoreRoutes: z
    .array(z.string())
    .default([])
    .describe('HTTP routes to skip instrumenting (consumed by the instrumentations layer).'),
})

/**
 * Public Telo configuration shape — what a caller passes to `init()`.
 *
 * Inferred from {@link teloConfigSchema} via `z.input`, so optional fields stay
 * optional here while their defaults are filled in on validation.
 *
 * @property service      Service name (`service.name`). **Required.**
 * @property endpoint     OTLP HTTP base URL. Default `http://localhost:4318`.
 * @property env          Deployment environment. Default `process.env.NODE_ENV`.
 * @property sampleRate   Root-span sample rate, 0..1. Default `1.0`.
 * @property ignoreRoutes HTTP routes to skip instrumenting. Default `[]`.
 *
 * @example
 * ```ts
 * const config: TTeloConfig = {
 *   service: 'checkout-api',
 *   endpoint: 'http://otel-collector:4318',
 *   sampleRate: 0.25,
 * }
 * ```
 */
export type TTeloConfig = z.input<typeof teloConfigSchema>

/**
 * Fully-resolved Telo configuration — the result of {@link validateConfig},
 * with every default applied. Inferred from {@link teloConfigSchema} via
 * `z.output`, so every field is present. This is what the SDK internals consume.
 */
export type TResolvedTeloConfig = z.output<typeof teloConfigSchema>
