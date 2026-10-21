import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/cloud', timeout: 60000, workers: 1,
  outputDir: 'test-results/cloud',
  use: { channel: 'msedge', headless: true, baseURL: 'http://127.0.0.1:5193', viewport: { width: 1440, height: 1000 } },
  webServer: { command: 'npx vite --host 127.0.0.1 --port 5193 --strictPort', url: 'http://127.0.0.1:5193', reuseExistingServer: false },
})
