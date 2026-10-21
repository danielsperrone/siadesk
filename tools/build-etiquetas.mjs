import { build } from 'vite';
import { fileURLToPath } from 'node:url';

// Empacota o módulo dentro do Siadesk, sem depender da pasta Nimbot ou de servidor externo.
await build({
  configFile: false,
  root: fileURLToPath(new URL('../modules/etiquetas/', import.meta.url)),
  base: './',
  build: { outDir: fileURLToPath(new URL('../public/etiquetas/', import.meta.url)), emptyOutDir: true, target: 'esnext' },
});
