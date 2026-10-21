import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/postes', timeout: 60000, workers: 1,
  outputDir: 'test-results/postes',
  use: { channel: 'msedge', headless: true, baseURL: 'http://127.0.0.1:5192', viewport: { width: 1440, height: 1000 } },
  webServer: { command: 'node node_modules/vite/bin/vite.js --config vite.postes.config.mjs --host 127.0.0.1 --port 5192 --strictPort', url: 'http://127.0.0.1:5192', reuseExistingServer: false },
})
