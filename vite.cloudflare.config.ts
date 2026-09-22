import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  define: { __PUBLIC_DEPLOYMENT__: 'true' },
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname) } },
  build: { outDir: 'dist-cloudflare', emptyOutDir: true },
});
