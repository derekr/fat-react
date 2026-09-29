import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const grammarRoot = new URL('./grammars/', pathToFileURL(require.resolve('microlighter')));
const grammars = ['tsx', 'typescript', 'javascript'];

export default defineConfig(({ command }) => ({
  base: process.env.BASE_PATH || (command === 'serve' ? '/' : '/redact/'),
  optimizeDeps: { exclude: ['microlighter'] },
  build: { rollupOptions: { input: {
    home: fileURLToPath(new URL('./index.html', import.meta.url)),
    examples: fileURLToPath(new URL('./examples/index.html', import.meta.url)),
    activeSearch: fileURLToPath(new URL('./examples/active-search/index.html', import.meta.url)),
  } } },
  plugins: [{
    name: 'microlighter-grammars',
    generateBundle() {
      for (const grammar of grammars) {
        this.emitFile({
          type: 'asset',
          fileName: `assets/grammars/${grammar}.js`,
          source: readFileSync(new URL(`${grammar}.js`, grammarRoot)),
        });
      }
    },
  }],
}));
