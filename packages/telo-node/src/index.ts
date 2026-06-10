import { init } from './services/init.service'
import { span } from './services/span.service'
import { traced } from './services/traced.service'

// Named exports: tree-shakeable and ergonomic for ESM/TS consumers.
export { init, span, traced }
export type { TTeloConfig, TResolvedTeloConfig } from './validator/config.validator'

// Default export so `import telo from '@telo/node'` and
// `require('@telo/node').init(...)` both work.
export default { init, span, traced }
