import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolveConfig } from '../src/config/resolve'

const TELO_KEYS = ['TELO_SERVICE', 'TELO_ENDPOINT', 'TELO_ENV', 'TELO_SAMPLE_RATE'] as const

describe('resolveConfig', () => {
  let saved: Record<string, string | undefined>

  beforeEach(() => {
    // Snapshot then clear TELO_* so env from the shell can't skew assertions.
    saved = {}
    for (const key of TELO_KEYS) {
      saved[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    for (const key of TELO_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  })

  it('applies defaults for everything but service', () => {
    const config = resolveConfig({ service: 'checkout' })
    expect(config.service).toBe('checkout')
    expect(config.endpoint).toBe('http://localhost:4318')
    expect(config.sampleRate).toBe(1.0)
    expect(config.ignoreRoutes).toEqual([])
    expect(typeof config.env).toBe('string')
  })

  it('throws an actionable error when service is absent from every source', () => {
    expect(() => resolveConfig()).toThrow(/service/i)
    expect(() => resolveConfig({} as never)).toThrow(/service/i)
  })

  it('reads service from TELO_SERVICE so init() can run argless', () => {
    process.env.TELO_SERVICE = 'from-env'
    expect(resolveConfig().service).toBe('from-env')
  })

  it('uses env vars over defaults', () => {
    process.env.TELO_ENDPOINT = 'http://collector:4318'
    process.env.TELO_ENV = 'staging'
    process.env.TELO_SAMPLE_RATE = '0.25'
    const config = resolveConfig({ service: 'checkout' })
    expect(config.endpoint).toBe('http://collector:4318')
    expect(config.env).toBe('staging')
    expect(config.sampleRate).toBe(0.25)
  })

  it('lets explicit init() args win over env vars', () => {
    process.env.TELO_ENDPOINT = 'http://from-env:4318'
    const config = resolveConfig({ service: 'checkout', endpoint: 'http://explicit:4318' })
    expect(config.endpoint).toBe('http://explicit:4318')
  })

  it('rejects an out-of-range TELO_SAMPLE_RATE', () => {
    process.env.TELO_SAMPLE_RATE = '5'
    expect(() => resolveConfig({ service: 'checkout' })).toThrow()
  })
})
