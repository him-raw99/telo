import { SpanStatusCode, trace } from '@opentelemetry/api'

import type { Attributes, Exception, Span } from '@opentelemetry/api'

/** Name of the tracer Telo's manual spans are created on. */
const TRACER_NAME = 'telo'

/** Per-span options for {@link span} and {@link traced}. */
export type TSpanOptions = {
  /** Attributes set on the span before `fn` runs. */
  attributes?: Attributes
}

/** Whether a value is thenable, so async `fn` returns are awaited before the span ends. */
function isPromise(value: unknown): value is Promise<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

/** Record the error on the span, mark it `ERROR` with the message, and end it. */
function endWithError(otelSpan: Span, err: unknown): void {
  otelSpan.recordException(err as Exception)
  otelSpan.setStatus({
    code: SpanStatusCode.ERROR,
    message: err instanceof Error ? err.message : String(err),
  })
  otelSpan.end()
}

/**
 * Wrap a unit of work in a named span on Telo's tracer.
 *
 * Runs `fn` as the active span — so any auto-instrumented or nested `span()`
 * work started inside it parents correctly — records exceptions, sets
 * `OK`/`ERROR` status, and ends the span automatically, replacing the manual
 * `startSpan`/`try`/`catch`/`finally` boilerplate. The wrapped function's return
 * value is passed through unchanged: a synchronous value is returned as-is, and
 * a `Promise` is awaited so status and timing reflect when the work actually
 * settles. Errors are recorded and **re-thrown**, so callers see them unchanged.
 *
 * The tracer is resolved at call time from the globally-registered provider, so
 * before `init()` runs (or in code paths where Telo isn't installed) this is a
 * no-op tracer and `fn` still runs normally.
 *
 * @typeParam T - The return type of `fn`, preserved through the wrapper.
 * @param name - Span name, e.g. `'invoice.process'`.
 * @param fn - The work to run inside the span.
 * @param opts - Optional span options; `opts.attributes` are set on the span.
 * @returns Whatever `fn` returns (sync value or `Promise`), unchanged.
 *
 * @example
 * ```ts
 * const result = await span('invoice.process', () => processInvoice(id), {
 *   attributes: { 'invoice.id': id },
 * })
 * ```
 */
export function span<T>(name: string, fn: () => T, opts?: TSpanOptions): T {
  const tracer = trace.getTracer(TRACER_NAME)

  return tracer.startActiveSpan(name, { attributes: opts?.attributes }, (otelSpan): T => {
    let result: T
    try {
      result = fn()
    } catch (err) {
      endWithError(otelSpan, err)
      throw err
    }

    if (isPromise(result)) {
      return result.then(
        (value) => {
          otelSpan.setStatus({ code: SpanStatusCode.OK })
          otelSpan.end()
          return value
        },
        (err: unknown) => {
          endWithError(otelSpan, err)
          throw err
        }
      ) as T
    }

    otelSpan.setStatus({ code: SpanStatusCode.OK })
    otelSpan.end()
    return result
  })
}
