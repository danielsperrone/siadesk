import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/etiquetas', timeout:60000, workers:1,
  outputDir:'test-results/etiquetas',
  use:{channel:'msedge',headless:true,baseURL:'http://127.0.0.1:5191'},
  webServer:{command:'npx vite modules/etiquetas --host 127.0.0.1 --port 5191 --strictPort',url:'http://127.0.0.1:5191',reuseExistingServer:false},
});
