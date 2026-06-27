import { build } from 'esbuild';
import { resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname);

await build({
  entryPoints: [resolve(rootDir, 'src/worker.ts')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: resolve(rootDir, 'functions/api/[[path]].js'),
  external: ['node:*'],
  define: {
    'process.env': '{}',
  },
  allowOverwrite: true,
  logLevel: 'info',
  absWorkingDir: rootDir,
  resolveExtensions: ['.ts', '.js', '.json'],
});
