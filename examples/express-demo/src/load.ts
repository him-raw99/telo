// Generates traffic across all routes so the dashboards fill with data. ~10% of
// requests hit /error on purpose to produce a non-zero error rate.
//
//   yarn load                # 30s, 10 connections (after `yarn build`)
//   DURATION=60 yarn load
import autocannon from 'autocannon'

const url = process.env.TARGET ?? 'http://localhost:3001'
const duration = Number(process.env.DURATION ?? 30)

// Without a callback, autocannon returns an event-emitter Instance at runtime,
// though its types describe the no-callback overload as a Promise — hence the cast.
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
}) as unknown as autocannon.Instance

autocannon.track(instance, { renderProgressBar: true })

instance.on('done', (result: autocannon.Result) => {
  console.log(`\ndone: ${result.requests.total} requests, ${result.non2xx} non-2xx`)
})
