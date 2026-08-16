import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist', emptyOutDir: true, sourcemap: true,
    rollupOptions: {
      input: {
        game: fileURLToPath(new URL('./index.html', import.meta.url)),
        tooling: fileURLToPath(new URL('./tooling.html', import.meta.url)),
      },
    },
  },
  server: { host: '127.0.0.1', strictPort: true, port: 5173, watch: { ignored: ['**/src-tauri/**'] } },
  preview: { host: '127.0.0.1' },
});
