import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'web_dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
}); ``