# Telo

**Telemetry collection, made super easy — for Node.js.**

Setting up OpenTelemetry today means ~100 lines of SDK boilerplate, deep knowledge of OTel internals, and then separately wiring up 5+ containers with no dashboards. So most developers skip observability entirely — or pay for expensive SaaS.

Telo collapses all of that into **one line of code** and **one `docker-compose up`**.

---

## What it is

Two independent pieces that work great together:

| Piece | What it is | Drop-in cost |
|---|---|---|
| **`@telo/node`** | npm package for any Node.js / Express app | 1 line |
| **`telo/infra`** | `docker-compose` LGTM backend, dashboards pre-wired | 1 command |

Each stands alone. The SDK speaks **OTLP**, so it also works with Grafana Cloud, Datadog, or any OTLP-compatible backend. The infra stack accepts telemetry from **any language**, not just Node.

---

## Quick start

**App side (~30 seconds):**

```bash
npm install @telo/node
```

```js
// must be the FIRST line, before any other require
require('@telo/node').init({ service: 'my-app' })

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
Node.js app (@telo/node)
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
require('@telo/node').init({ service: 'payments-service' })

// Full config
require('@telo/node').init({
  service: 'payments-service',         // required
  endpoint: 'http://localhost:4318',   // default
  env: 'production',                   // default: process.env.NODE_ENV
  sampleRate: 0.1,                     // default: 1.0
  ignoreRoutes: ['/health', '/ready'], // default: []
  instruments: { kafka: true, rabbitmq: true }, // both default: false
})

// Manual span wrapper for custom work — records exceptions,
// sets ERROR status, and ends the span automatically
const { span } = require('@telo/node')
const result = await span('invoice.process', () => processInvoice(id))
```

Every config key also has an env var (`TELO_SERVICE`, `TELO_ENDPOINT`, `TELO_ENV`, `TELO_SAMPLE_RATE`) so it works in Docker/K8s with zero code changes.

**Written in TypeScript — CommonJS or ESM.** `@telo/node` is written in TypeScript and ships both builds with bundled type declarations — `require('@telo/node')` and `import { init, span } from '@telo/node'` (or a default `import telo from '@telo/node'`) all work, fully typed. The must-load-first rule below applies either way.

**Auto-instrumented:** HTTP, Express, pg, redis, mongoose, dns.
**Opt-in:** kafkajs, amqplib.
**Off by default:** fs (too noisy).

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
