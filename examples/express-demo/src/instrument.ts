// Preloaded via `node -r ./build/instrument.js build/server.js` so telo boots
// before Express / pg / redis / pino are required — OpenTelemetry patches those
// libraries as they load, so init() must run first.
//
// This file is TypeScript compiled to CommonJS (see tsconfig + README): at
// runtime the `import` below is a `require()`, which is what lets OpenTelemetry's
// require-in-the-middle hook patch pino and express. Config comes from TELO_* env
// vars; endpoint defaults to http://localhost:4318 (the dockerized collector).
import { init } from 'telo'

init({
  service: process.env.TELO_SERVICE ?? 'express-demo',
  env: process.env.TELO_ENV ?? 'demo',
})
