import { span } from './span.service'

import type { TSpanOptions } from './span.service'

/**
 * Higher-order companion to {@link span}: instead of running the work now, it
 * returns a **wrapped function** whose every call is traced under `name`.
 *
 * The instrumentation lives at the definition site rather than the call site —
 * handy for free functions and handlers where a decorator can't be used. The
 * returned function preserves the original signature (arguments, `this`
 * binding, sync/async, and return type), and delegates to {@link span} so the
 * span semantics (OK/ERROR status, exception recording, timing) are identical
 * with no duplicated logic.
 *
 * @typeParam TArgs - Tuple of `fn`'s argument types, preserved on the wrapper.
 * @typeParam TReturn - `fn`'s return type, preserved on the wrapper.
 * @param name - Span name applied to every invocation, e.g. `'invoice.process'`.
 * @param fn - The function to wrap.
 * @param opts - Optional span options applied to every call's span.
 * @returns A function with the same signature as `fn`; each call opens a span.
 *
 * @example
 * ```ts
 * const processInvoice = traced('invoice.process', (id: string) => doWork(id))
 * await processInvoice('inv_123') // each call opens an 'invoice.process' span
 * ```
 */
export function traced<TArgs extends unknown[], TReturn>(
  name: string,
  fn: (...args: TArgs) => TReturn,
  opts?: TSpanOptions
): (...args: TArgs) => TReturn {
  return function (this: unknown, ...args: TArgs): TReturn {
    return span(name, () => fn.apply(this, args), opts)
  }
}
