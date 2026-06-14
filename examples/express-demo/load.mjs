// Generates traffic across all routes so the dashboards fill with data. ~10% of
// requests hit /error on purpose to produce a non-zero error rate.
//
//   node load.mjs            # 30s, 10 connections
//   DURATION=60 node load.mjs
import autocannon from 'autocannon'

const url = process.env.TARGET ?? 'http://localhost:3001'
const duration = Number(process.env.DURATION ?? 30)

const instance = autocannon({
  url,
  connections: Number(process.env.CONNECTIONS ?? 10),
  duration,
  requests: [
    { path: '/users' },
    { path: '/cache' },
    { path: '/work' },
    { path: '/users' },
    { path: '/cache' },
    { path: '/work' },
    { path: '/users' },
    { path: '/work' },
    { path: '/error' }, // ~1 in 9 → ~11% errors
  ],
})

autocannon.track(instance, { renderProgressBar: true })

instance.on('done', (result) => {
  console.log(`\ndone: ${result.requests.total} requests, ${result.non2xx} non-2xx`)
})
