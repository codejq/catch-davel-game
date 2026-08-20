import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const DISTRIBUTED_NOTICES = [
  'LICENSE', 'CREDITS.md', 'PRIVACY.md', 'SECURITY.md', 'SOURCE.md', 'TRADEMARKS.md',
  'THIRD_PARTY_ASSETS.md',
] as const;

function distributedNoticesPlugin(): Plugin {
  return {
    name: 'distributed-release-notices',
    generateBundle() {
      for (const filename of DISTRIBUTED_NOTICES) {
        this.emitFile({
          type: 'asset',
          fileName: `legal/${filename}`,
          source: readFileSync(fileURLToPath(new URL(`../${filename}`, import.meta.url))),
        });
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [distributedNoticesPlugin()],
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
