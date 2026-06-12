# telo

Telemetry collection, made super easy — one line for any Node.js app.

`telo` wraps the OpenTelemetry Node SDK with sane defaults: call `init()`
once and your app exports traces, metrics, and logs over OTLP/HTTP, with popular
libraries (HTTP, Express, Postgres, MySQL, Redis, Mongoose, Kafka, AMQP) traced
automatically. Add manual spans with `span()` / `traced()` where you want them.

## Install

```sh
npm install telo
# or: yarn add telo / pnpm add telo
```

Requires Node.js >= 18.

## Quick start

> **Load it first.** OpenTelemetry patches libraries as they load, so `init()`
> must run **before** anything you want traced is imported/required. Put it at
> the very top of your entry file (or in a `--require`/`--import` preload).

ESM:

```ts
import { init } from 'telo'

init({ service: 'checkout-api' })

// ...the rest of your imports follow
```

CommonJS:

```js
const { init } = require('telo')

init({ service: 'checkout-api' })
```

Both the named exports and a default export are available, in both module
systems:

```js
const telo = require('telo') // telo.init / telo.span / telo.traced / telo.shutdown
import telo from 'telo'       // same shape under ESM
import { init, span, traced, shutdown } from 'telo'
```

## Configuration

Minimal — only `service` is required:

```ts
init({ service: 'checkout-api' })
```

Full:

```ts
init({
  service: 'checkout-api',
  endpoint: 'http://otel-collector:4318',
  env: 'production',
  sampleRate: 0.25,
  ignoreRoutes: ['/healthz', '/readyz'],
})
```

| Option         | Type       | Default                  | Description                                                                 |
| -------------- | ---------- | ------------------------ | --------------------------------------------------------------------------- |
| `service`      | `string`   | — (**required**)         | Service name, reported as the `service.name` resource attribute.            |
| `endpoint`     | `string`   | `http://localhost:4318`  | OTLP/HTTP base URL; the `/v1/{traces,metrics,logs}` paths are appended.     |
| `env`          | `string`   | `process.env.NODE_ENV`   | Deployment environment, reported as `deployment.environment`.               |
| `sampleRate`   | `number`   | `1.0`                    | Head sampling probability for root spans (0–1). Children follow the parent. |
| `ignoreRoutes` | `string[]` | `[]`                     | Incoming HTTP paths to skip — handy for health/readiness probes.            |

### Environment variables

Every option except `ignoreRoutes` can come from the environment, so `init()`
can run with no arguments (e.g. in containers). Precedence is
**`init()` argument → `TELO_*` env var → default**.

| Variable           | Maps to      |
| ------------------ | ------------ |
| `TELO_SERVICE`     | `service`    |
| `TELO_ENDPOINT`    | `endpoint`   |
| `TELO_ENV`         | `env`        |
| `TELO_SAMPLE_RATE` | `sampleRate` |

```js
// With TELO_SERVICE set in the environment:
require('telo').init()
```

## Manual spans

### `span(name, fn, opts?)`

Wrap a unit of work in a named span. It runs `fn`, sets `OK`/`ERROR` status,
records exceptions, ends the span, and passes the return value through unchanged
— sync or `Promise`. Errors are re-thrown after being recorded.

```ts
import { span } from 'telo'

const invoice = await span('invoice.process', () => processInvoice(id), {
  attributes: { 'invoice.id': id },
})
```

### `traced(name, fn, opts?)`

The higher-order companion to `span()`: instead of running the work now, it
returns a wrapped function whose every call is traced. Same span semantics, but
the instrumentation lives at the definition site — handy for free functions and
handlers. The wrapper keeps the original signature (arguments, `this`,
sync/async, return type).

```ts
import { traced } from 'telo'

const processInvoice = traced('invoice.process', (id: string) => doWork(id))

await processInvoice('inv_123') // each call opens an 'invoice.process' span
```

Manual spans share the SDK's tracer, so they nest correctly under the
auto-instrumented spans (e.g. an `invoice.process` span parented to the
incoming HTTP request span).

## Shutdown

Telo never installs signal handlers or calls `process.exit` — exiting is the
app's job. If you want a final flush before exit, call `shutdown()`; it flushes
traces, metrics, and logs and resolves **without** exiting.

```ts
import { shutdown } from 'telo'

process.on('SIGTERM', async () => {
  await shutdown()
  process.exit(0)
})
```

## What gets instrumented

On by default, patch-on-load (zero cost if the library isn't used): `http`/
`https`, Express, Postgres (`pg`), MySQL (`mysql`/`mysql2`), Redis, Mongoose,
Kafka (`kafkajs`), AMQP (`amqplib`), plus Node runtime metrics. `fs` is
deliberately left off — too noisy to be useful. Which libraries are traced is
fixed policy, not configuration.

## License

MIT
