import { defineConfig } from 'tsup'

// Dual CJS + ESM build so @telo/node is consumable from
// require(), import, and TS projects alike. `dts: true` generates
// dist/index.d.ts straight from the TypeScript source.
export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['cjs', 'esm'],
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.mjs' }
  },
  target: 'node18',
  platform: 'node',
  clean: true,
  sourcemap: true,
  dts: true,
})
