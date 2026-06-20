// Example Express server instrumented by telo (telo boots first via the
// `-r ./build/instrument.js` preload in `npm start`).
//
// Routes exercise every signal the dashboards chart:
//   GET /            — liveness; ignored by telo's default ignoreRoutes
//   GET /users       — Postgres query (pg auto-instrumentation)
//   GET /cache       — Redis INCR (redis auto-instrumentation)
//   GET /work        — a manual span() around custom work + a pino log
//   GET /error       — throws → 500, drives error-rate + the alert rule
//
// Logging uses plain pino. telo's pino auto-instrumentation (active because this
// runs as CommonJS — see README) ships every record to the collector → Loki and
// injects the active span's trace_id. Emitted inside a handler, the record
// inherits the request span's context → Loki gets the trace_id → the derived
// field links the log back to its trace. pino still writes to stdout as usual.
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import pg from 'pg'
import { createClient } from 'redis'
import pino from 'pino'
import { span } from 'telo'

const logger = pino({ name: 'express-demo' })

const PG_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/demo'
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'
const PORT = Number(process.env.PORT ?? 3001)

// --- Postgres: pool + best-effort schema bootstrap with retry, so the app
// still boots and serves traffic while the DB is starting up. ---
const pool = new pg.Pool({ connectionString: PG_URL, max: 5 })

async function initDb(attempt = 1): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
    `)
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM users')
    if (rows[0].n === 0) {
      await pool.query("INSERT INTO users (name) VALUES ('ada'), ('linus'), ('grace')")
    }
    logger.info('postgres ready')
  } catch (err) {
    if (attempt >= 10) {
      logger.error({ error: (err as Error).message }, 'postgres init failed after retries')
      return
    }
    await new Promise((r) => setTimeout(r, 1000))
    return initDb(attempt + 1)
  }
}

// --- Redis: connect lazily; tolerate it being down. ---
const redis = createClient({ url: REDIS_URL })
redis.on('error', (err: Error) => logger.warn({ error: err.message }, 'redis error'))

const app = express()

app.get('/', (_req: Request, res: Response) => {
  res.json({ ok: true })
})

app.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query('SELECT id, name FROM users ORDER BY id')
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

app.get('/cache', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const hits = await redis.incr('demo:hits')
    res.json({ hits })
  } catch (err) {
    next(err)
  }
})

app.get('/work', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Manual span around "custom work" — nests under the auto HTTP span.
    const result = await span(
      'demo.heavy-work',
      async () => {
        await new Promise((r) => setTimeout(r, 25))
        return { computed: 42 }
      },
      { attributes: { 'demo.kind': 'cpu' } }
    )
    logger.info({ computed: result.computed }, 'did some heavy work')
    res.json(result)
  } catch (err) {
    next(err)
  }
})

app.get('/error', () => {
  logger.error('about to fail on purpose')
  throw new Error('deliberate failure for the demo')
})

// Error handler → 500, so these requests land in the 5xx error-rate metric.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ error: err.message }, 'request failed')
  res.status(500).json({ error: err.message })
})

async function main(): Promise<void> {
  redis.connect().catch(() => {}) // non-fatal if Redis is down
  await initDb()
  const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, `express-demo listening on http://localhost:${PORT}`)
  })

  // Graceful shutdown: flush telemetry, then close.
  const { shutdown } = await import('telo')
  const stop = async (): Promise<void> => {
    server.close()
    await redis.quit().catch(() => {})
    await pool.end().catch(() => {})
    await shutdown()
    process.exit(0)
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}

void main()
