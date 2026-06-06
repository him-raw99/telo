export type TTeloConfig={
  /** Service name (required). */
  service: string
  /** OTLP HTTP endpoint. Default: http://localhost:4318 */
  endpoint?: string
  /** Deployment environment. Default: process.env.NODE_ENV */
  env?: string
  /** Trace sample rate, 0..1. Default: 1.0 */
  sampleRate?: number
  /** Routes to skip instrumenting. Default: [] */
  ignoreRoutes?: string[]
  /** Opt-in instrumentations (off by default). */
  instruments?: {
    kafka?: boolean
    rabbitmq?: boolean
  }
}