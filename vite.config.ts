import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const grammarRoot = new URL('./grammars/', pathToFileURL(require.resolve('microlighter')));
const grammars = ['tsx', 'typescript', 'javascript'];

export default defineConfig(({ command }) => ({
  base: process.env.BASE_PATH || (command === 'serve' ? '/' : '/fat-react/'),
  optimizeDeps: { exclude: ['microlighter'] },
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
