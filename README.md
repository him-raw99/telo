# Telo

**Telemetry collection, made super easy — for Node.js.**

Setting up OpenTelemetry today means ~100 lines of SDK boilerplate, deep knowledge of OTel internals, and then separately wiring up 5+ containers with no dashboards. So most developers skip observability entirely — or pay for expensive SaaS.

Telo collapses all of that into **one line of code** and **one `docker-compose up`**.

---

## What it is

Two independent pieces that work great together:

| Piece | What it is | Drop-in cost |
|---|---|---|
| **`telo`** | npm package for any Node.js / Express app | 1 line |
| **`telo/infra`** | `docker-compose` LGTM backend, dashboards pre-wired | 1 command |

Each stands alone. The SDK speaks **OTLP**, so it also works with Grafana Cloud, Datadog, or any OTLP-compatible backend. The infra stack accepts telemetry from **any language**, not just Node.

---

## Quick start

**App side (~30 seconds):**

```bash
npm install telo
```

```js
// must be the FIRST line, before any other require
require('telo').init({ service: 'my-app' })

const express = require('express')
// ...rest of your app unchanged
```

**Infra side (~1 minute):**

```bash
cd telo/infra
docker-compose up -d
# → http://localhost:3000  (admin / admin)
# 6 dashboards ready, all datasources connected
```

---

## How it works

```
Node.js app (telo)
   │  OTLP HTTP: /v1/traces, /v1/metrics (every 10s), /v1/logs
   ▼
OTel Collector  :4318
   ├──→ Tempo       :3200   traces
   ├──→ Loki        :3100   logs
   └──→ Prometheus  :9090   metrics  (Collector exposes /metrics → Prometheus scrapes)
                    │
                    └──→ Grafana :3000   unified UI
```

---

## The SDK API

```js
// Minimal — all most apps need
require('telo').init({ service: 'payments-service' })

// Full config
require('telo').init({
  service: 'payments-service',         // required
  endpoint: 'http://localhost:4318',   // default
  env: 'production',                   // default: process.env.NODE_ENV
  sampleRate: 0.1,                     // default: 1.0
  ignoreRoutes: ['/health', '/ready'], // default: []
})

// Manual span wrapper for custom work — records exceptions,
// sets ERROR status, and ends the span automatically
const { span } = require('telo')
const result = await span('invoice.process', () => processInvoice(id))
```

### Flushing before exit

Telemetry is buffered and flushed in batches, so the last few seconds can be lost if the process exits without flushing. Telo never touches process signals — if you want a final flush, `await shutdown()` before you exit:

```js
const { shutdown } = require('telo')

process.on('SIGTERM', async () => {
  // …your own cleanup…
  await shutdown() // flush pending telemetry
  process.exit(0)
})
```

Every config key also has an env var (`TELO_SERVICE`, `TELO_ENDPOINT`, `TELO_ENV`, `TELO_SAMPLE_RATE`) so it works in Docker/K8s with zero code changes.

**Written in TypeScript — CommonJS or ESM.** `telo` is written in TypeScript and ships both builds with bundled type declarations — `require('telo')` and `import { init, span } from 'telo'` (or a default `import telo from 'telo'`) all work, fully typed. The must-load-first rule below applies either way.

**Traced automatically — zero config, no flags:** HTTP, Express, pg, mysql/mysql2, redis, mongoose, dns — *and* kafkajs (Kafka) and amqplib (RabbitMQ). Messaging libraries are picked up dynamically: the instrumentation is always registered but stays silent until your app actually loads the library, so you get Kafka/RabbitMQ traces the moment you use them and pay nothing if you don't.
**Runtime metrics, always on:** heap, GC pause, event-loop lag, active handles (feeds the Runtime Health dashboard).
**Deliberately off:** `fs` — too noisy to be useful.

> ⚠️ **Must load first.** `init()` has to run before any other `require`/`import` — OTel patches libraries at load time. Telo warns at startup if it detects Express/pg/etc. were loaded first (load-order auto-detection is CommonJS-only today — see Roadmap).

---

## What you get out of the box

Six Grafana dashboards, each with **Service** and **Environment** dropdowns (built for multi-service setups):

| Dashboard | Shows |
|---|---|
| **Services Overview** | All services side-by-side: req/min, error rate, p99 |
| **Node.js Overview** | Per-service request/error rate, p99/p95/p50, slowest routes |
| **Trace Explorer** | Search traces by service/route/status/duration → waterfall → jump to logs |
| **Log Explorer** | Logs by service/level/trace ID, linked from traces |
| **Runtime Health** | Heap, GC pause, event-loop lag, active handles |
| **Alerts** | p99 > 500ms (5min), error rate > 1% (5min), per service |

**Trace ↔ log correlation** works automatically — a Grafana `derivedField` extracts `traceId` from log lines and links straight to Tempo.

---

## Scope

**Node-only, self-hosted, by design.** Not goals:

- Other-language SDKs (Python, Go, …)
- A custom UI — Grafana *is* the UI
- A managed / SaaS offering
- File-tailing log collection — logs ship via OTLP from the SDK

## Roadmap

- Tail-based sampling in the Collector (always sample errors, % of success)
- K8s / Helm chart for the infra stack
- Grafana alerts → Slack / PagerDuty
- ESM **load-order** — the package already ships a dual CJS/ESM build (`import` and `require` both work); what remains is guaranteeing the must-load-first rule under ESM/top-level await (research needed)
