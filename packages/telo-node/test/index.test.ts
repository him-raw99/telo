import { describe, it, expect } from 'vitest'
import telo, { init, span, traced, type TTeloConfig } from '../src/index'

describe('@telo/node scaffold', () => {
  it('exposes init, span and traced as named exports', () => {
    expect(init).toBeTypeOf('function')
    expect(span).toBeTypeOf('function')
    expect(traced).toBeTypeOf('function')
  })

  it('exposes init, span and traced on the default export', () => {
    expect(telo).toBeTypeOf('object')
    expect(telo.init).toBeTypeOf('function')
    expect(telo.span).toBeTypeOf('function')
    expect(telo.traced).toBeTypeOf('function')
  })

  it('init validates a valid config without throwing', () => {
    const config: TTeloConfig = { service: 'test' }
    expect(() => init(config)).not.toThrow()
  })

  it('init throws when required `service` is missing', () => {
    // Cast through unknown: this is exactly the bad input the validator guards.
    expect(() => init({} as unknown as TTeloConfig)).toThrow()
  })

  it('init throws when `sampleRate` is out of range', () => {
    expect(() => init({ service: 'test', sampleRate: 2 })).toThrow()
  })

  it('span passes through the wrapped function result, preserving type', () => {
    const result: number = span('work', () => 42)
    expect(result).toBe(42)
  })

  describe('traced()', () => {
    it('returns a same-signature wrapper that runs each call', () => {
      const add = traced('math.add', (a: number, b: number) => a + b)
      expect(add).toBeTypeOf('function')
      expect(add(2, 3)).toBe(5)
    })

    it('preserves `this` binding and arguments', () => {
      const counter = {
        total: 10,
        addToTotal: traced('counter.add', function (this: { total: number }, n: number) {
          return this.total + n
        }),
      }
      expect(counter.addToTotal(5)).toBe(15)
    })

    it('re-throws errors raised inside the wrapped function', () => {
      const boom = traced('boom', () => {
        throw new Error('kaboom')
      })
      expect(() => boom()).toThrow('kaboom')
    })
  })
})
