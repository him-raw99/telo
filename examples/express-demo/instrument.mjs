// Preloaded via `node --import ./instrument.mjs server.mjs` so telo boots before
// Express / pg / redis are imported — OpenTelemetry patches those libraries at
// load time, so init() must run first.
//
// Config comes from TELO_* env vars (see compose / README). `service` is the
// only required field; endpoint defaults to http://localhost:4318, which is the
// dockerized collector's published port.
import { init } from 'telo'

init({
  service: process.env.TELO_SERVICE ?? 'express-demo',
  env: process.env.TELO_ENV ?? 'demo',
})
