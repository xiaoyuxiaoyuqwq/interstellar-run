import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/interstellar-run/' : '/',
  build: { outDir: 'dist' },
}));
