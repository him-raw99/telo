/** Libraries whose instrumentation only works if `init()` runs before they load. */
const GUARDED_MODULES = [
  'express',
  'pg',
  'mysql',
  'mysql2',
  'redis',
  'mongoose',
  'kafkajs',
  'amqplib',
]

/**
 * Whether a module appears in the CommonJS require cache, matched by its
 * `node_modules/<name>/` path segment (so it catches the host app's copy
 * regardless of where resolution lands).
 */
function isCached(moduleName: string, cache: NodeJS.Dict<NodeJS.Module>): boolean {
  const needle = `/node_modules/${moduleName}/`
  return Object.keys(cache).some((key) => key.includes(needle))
}

/**
 * Warn if any instrumented library was loaded **before** `init()`.
 *
 * OTel patches libraries at load time, so a `require('express')` that runs
 * before `init()` is never instrumented. We detect that by scanning
 * `require.cache` and naming the offending modules.
 *
 * **CommonJS only.** `require.cache` is blind to ESM `import`, so under pure ESM
 * this guard can't see late-loaded modules; that gap is a known limitation of
 * the patch-on-load model rather than something this check can close.
 */
export function warnIfLoadedLate(): void {
  const cache = typeof require !== 'undefined' ? require.cache : undefined
  if (!cache) return

  const loaded = GUARDED_MODULES.filter((moduleName) => isCached(moduleName, cache))
  if (loaded.length === 0) return

  const warning = createWarningMessage(loaded)
  console.warn(warning)
}

function createWarningMessage(loaded: string[]): string {
  const subject = loaded.length === 1 ? 'it' : 'them'
  return (
    `Telo: ${loaded.join(', ')} ${loaded.length === 1 ? 'was' : 'were'} loaded before init() — ` +
    `OpenTelemetry patches libraries at load time, so ${subject} may go untraced. ` +
    `Call init() before any other require/import.`
  )
}
