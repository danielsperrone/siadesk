import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: { app: 'index.html', motionOwl: 'motion-owl.html', motionOwlArquiteturas: 'motion-owl-arquiteturas.html' },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
