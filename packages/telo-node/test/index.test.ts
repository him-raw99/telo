import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import telo, { init, span, traced, type TTeloConfig } from '../src/index'
import { shutdownTelemetry } from '../src/sdk'

const TELO_KEYS = ['TELO_SERVICE', 'TELO_ENDPOINT', 'TELO_ENV', 'TELO_SAMPLE_RATE'] as const

describe('@telo/node', () => {
  let saved: Record<string, string | undefined>

  beforeEach(() => {
    saved = {}
    for (const key of TELO_KEYS) {
      saved[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(async () => {
    // Tear down any SDK a test started, so module state and signal handlers
    // don't leak across tests.
    await shutdownTelemetry()
    vi.restoreAllMocks()
    for (const key of TELO_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  })

  describe('exports', () => {
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
  })

  describe('init()', () => {
    it('boots with a valid config without throwing', () => {
      expect(() => init({ service: 'test' })).not.toThrow()
    })

    it('boots argless when TELO_SERVICE is set', () => {
      process.env.TELO_SERVICE = 'from-env'
      expect(() => init()).not.toThrow()
    })

    it('throws when required `service` is missing', () => {
      // Cast through unknown: this is exactly the bad input the validator guards.
      expect(() => init({} as unknown as TTeloConfig)).toThrow()
    })

    it('throws when `sampleRate` is out of range', () => {
      expect(() => init({ service: 'test', sampleRate: 2 })).toThrow()
    })

    it('warns and no-ops on a second call', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      init({ service: 'test' })
      init({ service: 'test' })
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('more than once'))
    })
  })

  describe('span()', () => {
    it('passes through the wrapped function result, preserving type', () => {
      const result: number = span('work', () => 42)
      expect(result).toBe(42)
    })
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
