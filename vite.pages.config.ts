import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/campus-jobs-2027-hubei/',
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname) } },
  define: { __PUBLIC_DEPLOYMENT__: 'true' },
  build: { outDir: 'dist-pages', emptyOutDir: true },
});
