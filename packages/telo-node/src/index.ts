import { init } from './services/init.service'
import { span } from './services/span.service'
import { traced } from './services/traced.service'
import { shutdownTelemetry as shutdown } from './sdk'

// Named exports: tree-shakeable and ergonomic for ESM/TS consumers.
export { init, span, traced, shutdown }
export type { TSpanOptions } from './services/span.service'
export type { TTeloConfig, TResolvedTeloConfig } from './validator/config.validator'

// Default export so `import telo from 'telo'` and
// `require('telo').init(...)` both work.
export default { init, span, traced, shutdown }
