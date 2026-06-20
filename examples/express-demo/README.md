# telo express demo

A small Express app instrumented with [`telo`](../../packages/telo-node), used to
prove the whole pipeline end-to-end: **app → Collector → Tempo/Loki/Prometheus →
Grafana dashboards**.

It exercises:

- **HTTP + Express** auto-instrumentation (every route is a trace).
- **Postgres** (`/users`) and **Redis** (`/cache`) auto-instrumentation.
- A **manual `span()`** around custom work (`/work`).
- A **deliberate 500** (`/error`) to drive error-rate metrics and the alert rule.
- **Logs via plain `pino`**, auto-instrumented by telo: the logger is used
  normally, and telo's pino instrumentation ships each record to Loki and injects
  the request's `trace_id` — this is what makes the trace↔log link work. The lines
  also print to stdout as usual.

The app runs on the **host** and talks to dockerized backends over `localhost`,
matching `TELO_ENDPOINT=http://localhost:4318`.

## Why TypeScript compiled to CommonJS

This example is written in TypeScript and **compiled to CommonJS** (`tsconfig.json`
sets `"module": "commonjs"`; `npm start` runs the compiled `build/` output).

That's deliberate. OpenTelemetry auto-instruments a library by patching it as it
loads, and for libraries whose entry point is `module.exports = fn` — notably
**pino** and **express** — that patch only lands when the module is `require()`d.
Under native ESM (`.mjs` / `"type": "module"`), the loader uses
`import-in-the-middle`, which **can't** patch that default-function export, so
pino logging and express route spans silently never get instrumented (database
and HTTP instrumentation still work, because they patch object/prototype members).

Compiling to CommonJS turns the `import` source into `require()` at runtime, so
`require-in-the-middle` patches everything — pino and express included. telo is
loaded first via the `-r ./build/instrument.js` preload in `npm start`, before any
instrumented library is required.

## Prerequisites

- Node 18+ (repo targets 22).
- Docker (for the backends + Postgres/Redis).
- The SDK must be built — `telo` is consumed from `dist/`:
  ```sh
  cd ../../packages/telo-node && npm install && npm run build
  ```

## Run it

```sh
# 1. Observability backends (collector, Tempo, Loki, Prometheus, Grafana)
cd ../../infra && docker compose up -d

# 2. Postgres + Redis for the demo
cd ../examples/express-demo && npm run deps:up

# 3. Install + start the app — `npm start` compiles TS → build/ then runs it,
#    preloading telo via `-r ./build/instrument.js` before Express/pg/redis/pino
npm install
npm start
# → express-demo listening on http://localhost:3001

# 4. In another shell, generate traffic (also compiles first)
npm run load
```

## End-to-end verification checklist

With the app under load, confirm each signal landed:

- [ ] **Traces in Tempo** — Grafana → Trace Explorer (or Explore → Tempo): search
      `{ resource.service.name = "express-demo" }` returns traces; `/users` traces
      show a child `pg` span, `/cache` shows a `redis` span, `/work` shows the
      manual `demo.heavy-work` span.
- [ ] **Logs in Loki** — Log Explorer shows lines for `express-demo`; an `/error`
      log has level `error`.
- [ ] **Metrics in Prometheus** — `localhost:9090` → query
      `http_server_duration_milliseconds_count` returns series labelled
      `service_name="express-demo"`.
- [ ] **All six dashboards populate** — Services Overview, Node.js Overview,
      Trace/Log Explorer, Runtime Health.
- [ ] **Trace→log link** — open a trace span → "Logs for this span" returns its
      logs (Day 6 `tracesToLogsV2`); a log line's `trace_id` links into Tempo
      (Day 6 derived field).
- [ ] **Runtime Health populates** — confirms the runtime-node metrics flow.
- [ ] **Alert fires** — sustained load keeps `/error` above 1% error rate for 5m →
      the `error rate > 1%` rule goes to Firing (Grafana → Alerting → Alert rules).

> ⚠️ The dashboard metric names were authored ahead of live data and may need
> reconciling — if a panel shows "No data", check the real metric name in
> Prometheus (`localhost:9090`) and update the dashboard JSON in
> `infra/grafana/dashboards/`. The runtime (`v8js_*` / `nodejs_*`) names are the
> most likely to need fixing.

## Cleanup

```sh
npm run deps:down                 # stop Postgres/Redis
cd ../../infra && docker compose down   # stop the backends
```
