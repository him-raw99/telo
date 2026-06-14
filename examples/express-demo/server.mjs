// Example Express server instrumented by telo (loaded via instrument.mjs).
//
// Routes exercise every signal the dashboards chart:
//   GET /            — liveness; ignored by telo's default ignoreRoutes
//   GET /users       — Postgres query (pg auto-instrumentation)
//   GET /cache       — Redis INCR (redis auto-instrumentation)
//   GET /work        — a manual span() around custom work + an OTel log
//   GET /error       — throws → 500, drives error-rate + the alert rule
//
// Logs are emitted through the OTel Logs API so each record carries the active
// span's trace_id (telo has no log auto-bridge). Emitted inside a handler, the
// record inherits the request span's context → Loki gets trace_id → the Day 6
// derived field links the log back to its trace.
import express from 'express'
import pg from 'pg'
import { createClient } from 'redis'
import { span } from 'telo'
import { logs, SeverityNumber } from '@opentelemetry/api-logs'

const logger = logs.getLogger('express-demo')

function log(severityText, severityNumber, body, attributes) {
  // Console line mirrors the OTel record so you can eyeball it locally — OTel
  // logs ship to Loki and never hit stdout on their own.
  console.log(`[${severityText}] ${body}`, attributes ?? '')
  logger.emit({ severityText, severityNumber, body, attributes })
}

const PG_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/demo'
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'
const PORT = Number(process.env.PORT ?? 3001)

// --- Postgres: pool + best-effort schema bootstrap with retry, so the app
// still boots and serves traffic while the DB is starting up. ---
const pool = new pg.Pool({ connectionString: PG_URL, max: 5 })

async function initDb(attempt = 1) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
    `)
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM users')
    if (rows[0].n === 0) {
      await pool.query("INSERT INTO users (name) VALUES ('ada'), ('linus'), ('grace')")
    }
    log('INFO', SeverityNumber.INFO, 'postgres ready')
  } catch (err) {
    if (attempt >= 10) {
      console.error('postgres init failed after retries:', err.message)
      return
    }
    await new Promise((r) => setTimeout(r, 1000))
    return initDb(attempt + 1)
  }
}

// --- Redis: connect lazily; tolerate it being down. ---
const redis = createClient({ url: REDIS_URL })
redis.on('error', (err) => console.error('redis error:', err.message))

const app = express()

app.get('/', (_req, res) => {
  res.json({ ok: true })
})

app.get('/users', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, name FROM users ORDER BY id')
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

app.get('/cache', async (_req, res, next) => {
  try {
    const hits = await redis.incr('demo:hits')
    res.json({ hits })
  } catch (err) {
    next(err)
  }
})

app.get('/work', async (_req, res, next) => {
  try {
    // Manual span around "custom work" — nests under the auto HTTP span.
    const result = await span(
      'demo.heavy-work',
      async () => {
        await new Promise((r) => setTimeout(r, 25))
        return { computed: 42 }
      },
      { attributes: { 'demo.kind': 'cpu' } },
    )
    log('INFO', SeverityNumber.INFO, 'did some heavy work', { computed: result.computed })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

app.get('/error', (_req, _res) => {
  log('ERROR', SeverityNumber.ERROR, 'about to fail on purpose')
  throw new Error('deliberate failure for the demo')
})

// Error handler → 500, so these requests land in the 5xx error-rate metric.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  log('ERROR', SeverityNumber.ERROR, 'request failed', { error: err.message })
  res.status(500).json({ error: err.message })
})

async function main() {
  redis.connect().catch(() => {}) // non-fatal if Redis is down
  await initDb()
  const server = app.listen(PORT, () => {
    console.log(`express-demo listening on http://localhost:${PORT}`)
  })

  // Graceful shutdown: flush telemetry, then close.
  const { shutdown } = await import('telo')
  const stop = async () => {
    server.close()
    await redis.quit().catch(() => {})
    await pool.end().catch(() => {})
    await shutdown()
    process.exit(0)
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}

main()
