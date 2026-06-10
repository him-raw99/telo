import {
  teloConfigSchema,
  type TTeloConfig,
  type TResolvedTeloConfig,
} from '../validator/config.validator'

/**
 * Read the `TELO_*` environment overrides into a partial config.
 *
 * Only keys that are actually present are returned, so they slot in *under*
 * explicit `init()` arguments and *over* the schema defaults. `sampleRate` is
 * coerced to a number here; an unparseable value becomes `NaN` and is rejected
 * by the schema with the normal range error.
 */
function fromEnv(): Partial<TTeloConfig> {
  const env = process.env
  const out: Partial<TTeloConfig> = {}

  if (env.TELO_SERVICE) out.service = env.TELO_SERVICE
  if (env.TELO_ENDPOINT) out.endpoint = env.TELO_ENDPOINT
  if (env.TELO_ENV) out.env = env.TELO_ENV
  if (env.TELO_SAMPLE_RATE !== undefined && env.TELO_SAMPLE_RATE !== '') {
    out.sampleRate = Number(env.TELO_SAMPLE_RATE)
  }

  return out
}

/** Drop keys whose value is `undefined` so they don't shadow env/default values. */
function definedOnly(config: TTeloConfig): Partial<TTeloConfig> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined) out[key] = value
  }
  return out as Partial<TTeloConfig>
}

/**
 * Resolve and validate config with precedence **`init()` arg → `TELO_*` env →
 * default**, then return the fully-normalized config.
 *
 * Because env vars fill in for absent keys, `init()` works with no arguments at
 * all as long as `TELO_SERVICE` is set (handy in Docker/K8s). A missing
 * `service` from every source surfaces as the schema's actionable error.
 *
 * @param config - Caller-supplied config, or `undefined` for env-only setup.
 * @throws {import('zod').ZodError} If the merged config is invalid.
 */
export function resolveConfig(config?: TTeloConfig): TResolvedTeloConfig {
  const merged = { ...fromEnv(), ...(config ? definedOnly(config) : {}) }
  return teloConfigSchema.parse(merged)
}
