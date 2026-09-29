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
    clickToEdit: fileURLToPath(new URL('./examples/click-to-edit/index.html', import.meta.url)),
    clickToLoad: fileURLToPath(new URL('./examples/click-to-load/index.html', import.meta.url)),
    infiniteScroll: fileURLToPath(new URL('./examples/infinite-scroll/index.html', import.meta.url)),
    inlineValidation: fileURLToPath(new URL('./examples/inline-validation/index.html', import.meta.url)),
    bulkUpdate: fileURLToPath(new URL('./examples/bulk-update/index.html', import.meta.url)),
    progressBar: fileURLToPath(new URL('./examples/progress-bar/index.html', import.meta.url)),
    lazyTabs: fileURLToPath(new URL('./examples/lazy-tabs/index.html', import.meta.url)),
    deleteRow: fileURLToPath(new URL('./examples/delete-row/index.html', import.meta.url)),
    dependentSelects: fileURLToPath(new URL('./examples/dependent-selects/index.html', import.meta.url)),
    fileUpload: fileURLToPath(new URL('./examples/file-upload/index.html', import.meta.url)),
    modalDetails: fileURLToPath(new URL('./examples/modal-details/index.html', import.meta.url)),
    sortableList: fileURLToPath(new URL('./examples/sortable-list/index.html', import.meta.url)),
    crossTabUpdates: fileURLToPath(new URL('./examples/cross-tab-updates/index.html', import.meta.url)),
    multiStepForm: fileURLToPath(new URL('./examples/multi-step-form/index.html', import.meta.url)),
    liveActivityFeed: fileURLToPath(new URL('./examples/live-activity-feed/index.html', import.meta.url)),
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
