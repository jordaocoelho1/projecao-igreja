import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativo para o Electron carregar dist/index.html via file://
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist' },
});
