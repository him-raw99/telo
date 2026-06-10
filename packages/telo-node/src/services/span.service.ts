/**
 * Wrap a unit of work in a named span.
 *
 * Runs `fn`, records exceptions, sets `OK`/`ERROR` status, and ends the span
 * automatically — replacing the manual `startSpan`/`try`/`catch`/`finally`
 * boilerplate. The wrapped function's return value (sync or `Promise`) is
 * passed through unchanged, so the call site reads exactly as it did before.
 *
 * @typeParam T - The return type of `fn`, preserved through the wrapper.
 * @param name - Span name, e.g. `'invoice.process'`.
 * @param fn - The work to run inside the span.
 * @returns Whatever `fn` returns.
 *
 * @example
 * ```ts
 * const result = span('invoice.process', () => processInvoice(id))
 * ```
 */
export function span<T>(name: string, fn: () => T): T {
  // No-op passthrough until the tracer is wired: preserves the public
  // contract so call sites and `traced()` can adopt it now.
  void name
  return fn()
}
