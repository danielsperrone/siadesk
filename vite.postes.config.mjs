import { defineConfig, mergeConfig } from 'vite'
import base from './vite.config.ts'

// Scan the app entry only: archived copies and generated HTML are not test entries.
export default mergeConfig(base, defineConfig({
  cacheDir: 'node_modules/.vite-postes',
  optimizeDeps: { entries: ['index.html'] },
}))
