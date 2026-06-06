import { describe, it, expect } from 'vitest'
import telo, { init, span, type TeloConfig } from '../src/index'

describe('@telo/node scaffold', () => {
  it('exposes init and span as named exports', () => {
    expect(init).toBeTypeOf('function')
    expect(span).toBeTypeOf('function')
  })

  it('exposes init and span on the default export', () => {
    expect(telo).toBeTypeOf('object')
    expect(telo.init).toBeTypeOf('function')
    expect(telo.span).toBeTypeOf('function')
  })

  it('init is a no-op that does not throw', () => {
    const config: TeloConfig = { service: 'test' }
    expect(() => init(config)).not.toThrow()
  })

  it('span passes through the wrapped function result, preserving type', () => {
    const result: number = span('work', () => 42)
    expect(result).toBe(42)
  })
})
